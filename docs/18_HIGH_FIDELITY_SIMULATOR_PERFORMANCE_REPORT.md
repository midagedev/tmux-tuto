# High-Fidelity Simulator Performance Report

- generatedAt: 2026-02-18T02:02:34.696Z
- runtime: node v20.10.0
- scenario: reducer/input pipeline micro-benchmark
- dataset: scroll benchmark uses 4-pane with 3000 lines in active pane

| Metric | Iterations | p95 (ms) | Target p95 (ms) | Status |
| --- | ---: | ---: | ---: | --- |
| Input reaction (prefix+focus) | 3000 | 0.004 | 80 | PASS |
| Pane split reaction | 1200 | 0.006 | 100 | PASS |
| Pane focus reaction (4-pane) | 3000 | 0.002 | 100 | PASS |
| Pane scroll reaction (4-pane/3000+ lines) | 3000 | 0.002 | 100 | PASS |

## Notes
- Input and pane reaction targets are derived from spec 12 section 13.
- Scroll target is tracked at 100ms for guardrail consistency.
- Overall: PASS
