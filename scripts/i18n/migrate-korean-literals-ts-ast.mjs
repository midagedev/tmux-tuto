import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

const skipPatterns = ['/src/i18n/', '/src/content/', '.test.', '.spec.', '.d.ts'];

function hasKorean(text) {
  return /[가-힣]/.test(text);
}

function shouldSkip(file) {
  const normalized = file.replaceAll('\\', '/');
  return skipPatterns.some((p) => normalized.includes(p));
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (!full.endsWith('.ts') && !full.endsWith('.tsx')) continue;
    if (shouldSkip(full)) continue;
    out.push(full);
  }
  return out;
}

function isImportLikeLiteral(node) {
  const parent = node.parent;
  return ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent);
}

function isAlreadyTxWrapped(node) {
  const parent = node.parent;
  return (
    ts.isCallExpression(parent) &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === '__tx' &&
    parent.arguments[0] === node
  );
}

function txCall(literal) {
  return ts.factory.createCallExpression(ts.factory.createIdentifier('__tx'), undefined, [literal]);
}

function createConcat(left, right) {
  return ts.factory.createBinaryExpression(left, ts.SyntaxKind.PlusToken, right);
}

function buildTemplateReplacement(node) {
  const parts = [];
  const pushText = (text) => {
    if (!text) return;
    if (hasKorean(text)) {
      parts.push(txCall(ts.factory.createStringLiteral(text)));
    } else {
      parts.push(ts.factory.createStringLiteral(text));
    }
  };

  pushText(node.head.text);
  for (const span of node.templateSpans) {
    parts.push(span.expression);
    pushText(span.literal.text);
  }

  if (parts.length === 0) {
    return ts.factory.createStringLiteral('');
  }

  let expression = parts[0];
  for (let index = 1; index < parts.length; index += 1) {
    expression = createConcat(expression, parts[index]);
  }

  return expression;
}

function transformSource(sourceFile) {
  const visitor = (node) => {
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const text = node.initializer.text;
      if (hasKorean(text)) {
        const expr = ts.factory.createJsxExpression(undefined, txCall(ts.factory.createStringLiteral(text)));
        return ts.factory.updateJsxAttribute(node, node.name, expr);
      }
    }

    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile);
      if (hasKorean(text)) {
        const normalized = text.trim();
        if (normalized.length === 0) {
          return node;
        }
        return ts.factory.createJsxExpression(
          undefined,
          txCall(ts.factory.createStringLiteral(normalized)),
        );
      }
    }

    if (ts.isStringLiteral(node) && hasKorean(node.text)) {
      if (!isImportLikeLiteral(node) && !isAlreadyTxWrapped(node)) {
        return txCall(ts.factory.createStringLiteral(node.text));
      }
    }

    if (ts.isNoSubstitutionTemplateLiteral(node) && hasKorean(node.text)) {
      if (!isAlreadyTxWrapped(node)) {
        return txCall(ts.factory.createStringLiteral(node.text));
      }
    }

    if (ts.isTemplateExpression(node)) {
      const fullText = node.getText(sourceFile);
      if (hasKorean(fullText)) {
        return buildTemplateReplacement(node);
      }
    }

    return ts.visitEachChild(node, visitor, context);
  };

  let context;
  const transformer = (ctx) => {
    context = ctx;
    return (rootNode) => ts.visitNode(rootNode, visitor);
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformed = result.transformed[0];
  result.dispose();
  return transformed;
}

const files = await walk(srcRoot);
let changed = 0;

for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const transformed = transformSource(sourceFile);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const next = printer.printFile(transformed);
  if (next !== source) {
    await fs.writeFile(file, next, 'utf8');
    changed += 1;
  }
}

console.log(`[migrate-korean-literals-ts-ast] updated ${changed} files`);
