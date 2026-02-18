import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createInitialSimulatorState, getActiveWindow } from '../src/features/simulator/model';
import { resolveSimulatorInputAt } from '../src/features/simulator/input';
import { simulatorReducer } from '../src/features/simulator/reducer';

type BenchmarkStats = {
  min: number;
  mean: number;
  p50: number;
  p95: number;
  max: number;
};

type BenchmarkResult = {
  name: string;
  unit: 'ms';
  iterations: number;
  stats: BenchmarkStats;
  targetP95Ms: number;
  pass: boolean;
};

function round(value: number) {
  return Number(value.toFixed(3));
}

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1),
  );
  return sortedValues[index];
}

function summarizeSamples(samples: number[]): BenchmarkStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((acc, value) => acc + value, 0);

  return {
    min: round(sorted[0] ?? 0),
    mean: round(total / Math.max(1, sorted.length)),
    p50: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    max: round(sorted[sorted.length - 1] ?? 0),
  };
}

function runBenchmark(name: string, iterations: number, targetP95Ms: number, sample: (index: number) => number): BenchmarkResult {
  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    samples.push(sample(index));
  }

  const stats = summarizeSamples(samples);
  return {
    name,
    unit: 'ms',
    iterations,
    stats,
    targetP95Ms,
    pass: stats.p95 <= targetP95Ms,
  };
}

function applyInputSequence(state: ReturnType<typeof createInitialSimulatorState>, key: string, nowMs: number) {
  const actions = resolveSimulatorInputAt(state, key, nowMs);
  return actions.reduce(simulatorReducer, state);
}

function prepareScrollState() {
  let state = createInitialSimulatorState();
  state = simulatorReducer(state, { type: 'SPLIT_PANE', payload: 'vertical' });
  state = simulatorReducer(state, { type: 'SPLIT_PANE', payload: 'horizontal' });
  state = simulatorReducer(state, { type: 'SPLIT_PANE', payload: 'horizontal' });

  for (let index = 0; index < 1000; index += 1) {
    state = simulatorReducer(state, { type: 'EXECUTE_COMMAND', payload: 'cat logs/app.log' });
  }

  const activeWindow = getActiveWindow(state);
  const activePaneId = activeWindow.activePaneId;
  return { state, activePaneId, lineCount: activeWindow.panes.find((pane) => pane.id === activePaneId)?.buffer.length ?? 0 };
}

function formatResultRow(result: BenchmarkResult) {
  const status = result.pass ? 'PASS' : 'FAIL';
  return `| ${result.name} | ${result.iterations} | ${result.stats.p95} | ${result.targetP95Ms} | ${status} |`;
}

async function main() {
  let inputState = createInitialSimulatorState();
  inputState = simulatorReducer(inputState, { type: 'SPLIT_PANE', payload: 'vertical' });

  const inputResult = runBenchmark('Input reaction (prefix+focus)', 3000, 80, (index) => {
    const now = index * 10;
    const start = performance.now();
    inputState = applyInputSequence(inputState, inputState.tmux.config.prefixKey, now);
    inputState = applyInputSequence(inputState, 'l', now + 1);
    return performance.now() - start;
  });

  const splitResult = runBenchmark('Pane split reaction', 1200, 100, () => {
    let state = createInitialSimulatorState();
    const start = performance.now();
    state = simulatorReducer(state, { type: 'SPLIT_PANE', payload: 'vertical' });
    if (state.tmux.sessions.length === 0) {
      return 0;
    }
    return performance.now() - start;
  });

  let focusState = createInitialSimulatorState();
  focusState = simulatorReducer(focusState, { type: 'SPLIT_PANE', payload: 'vertical' });
  focusState = simulatorReducer(focusState, { type: 'SPLIT_PANE', payload: 'horizontal' });
  focusState = simulatorReducer(focusState, { type: 'SPLIT_PANE', payload: 'horizontal' });

  const focusResult = runBenchmark('Pane focus reaction (4-pane)', 3000, 100, (index) => {
    const start = performance.now();
    focusState = simulatorReducer(focusState, {
      type: 'FOCUS_PANE',
      payload: index % 2 === 0 ? 'left' : 'right',
    });
    return performance.now() - start;
  });

  const preparedScroll = prepareScrollState();
  let scrollState = preparedScroll.state;
  const scrollPaneId = preparedScroll.activePaneId;
  const scrollResult = runBenchmark('Pane scroll reaction (4-pane/3000+ lines)', 3000, 100, (index) => {
    const start = performance.now();
    scrollState = simulatorReducer(scrollState, {
      type: 'SCROLL_PANE',
      payload: { paneId: scrollPaneId, delta: index % 2 === 0 ? 1 : -1 },
    });
    return performance.now() - start;
  });

  const results = [inputResult, splitResult, focusResult, scrollResult];
  const allPass = results.every((result) => result.pass);
  const generatedAt = new Date().toISOString();
  const reportPath = 'docs/18_HIGH_FIDELITY_SIMULATOR_PERFORMANCE_REPORT.md';

  const report = [
    '# High-Fidelity Simulator Performance Report',
    '',
    `- generatedAt: ${generatedAt}`,
    `- runtime: node ${process.version}`,
    `- scenario: reducer/input pipeline micro-benchmark`,
    `- dataset: scroll benchmark uses 4-pane with ${preparedScroll.lineCount} lines in active pane`,
    '',
    '| Metric | Iterations | p95 (ms) | Target p95 (ms) | Status |',
    '| --- | ---: | ---: | ---: | --- |',
    ...results.map(formatResultRow),
    '',
    '## Notes',
    '- Input and pane reaction targets are derived from spec 12 section 13.',
    '- Scroll target is tracked at 100ms for guardrail consistency.',
    `- Overall: ${allPass ? 'PASS' : 'FAIL'}`,
    '',
  ].join('\n');

  await writeFile(reportPath, report, 'utf-8');

  for (const result of results) {
    const status = result.pass ? 'PASS' : 'FAIL';
    process.stdout.write(
      `${result.name}: p95=${result.stats.p95}ms (target<=${result.targetP95Ms}ms) ${status}\n`,
    );
  }
  process.stdout.write(`report: ${reportPath}\n`);

  if (!allPass) {
    process.exitCode = 1;
  }
}

void main();
