import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dir, '..', '..');
const scanRoots = [
  'README.md',
  'docs/agent-runtime.md',
  'docs/demo-script.md',
  'docs/ika-encrypt-integration-book.md',
  'frontend/src',
  'proxy/src',
  'sdk/src',
  'sdk/examples.ts',
  'sdk/run_ika_quorum.js',
  'sdk/sign_ika_approval.js',
];

const staticWitnessPatterns = [
  /\bencryptionWitness\s*:\s*\[\s*1\s*,\s*2\s*,\s*3\b/,
  /\bmaskedWitnessDevFixture\s*:\s*\[\s*1\s*,\s*2\s*,\s*3\b/,
  /Array\.from\(\s*\{\s*length:\s*32\s*\}\s*,\s*\([^)]*(?:i|index)[^)]*\)\s*=>\s*(?:i|index)\s*\+\s*1\s*\)/,
  /maskedWitnessDevFixture\s*:\s*Array\.from\(\s*\{\s*length:\s*32\s*\}/,
];

describe('static witness regression scan', () => {
  test('primary source and docs do not serialize static witness arrays', () => {
    const offenders: string[] = [];

    for (const file of scanFiles()) {
      const source = readFileSync(file, 'utf8');
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (!staticWitnessPatterns.some((pattern) => pattern.test(line))) return;
        if (isExplicitLegacyDevFixture(lines, index)) return;
        offenders.push(`${relative(repoRoot, file)}:${index + 1}: ${line.trim()}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});

function scanFiles(): string[] {
  return scanRoots.flatMap((entry) => {
    const fullPath = join(repoRoot, entry);
    const stat = statSync(fullPath);
    if (stat.isFile()) return [fullPath];
    return walk(fullPath);
  });
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return walk(fullPath);
    if (!/\.(ts|tsx|js|md)$/.test(entry)) return [];
    if (/\.(test|spec)\.(ts|tsx|js)$/.test(entry)) return [];
    return [fullPath];
  });
}

function isExplicitLegacyDevFixture(lines: string[], index: number): boolean {
  const context = lines.slice(Math.max(0, index - 12), Math.min(lines.length, index + 13)).join('\n').toLowerCase();
  return context.includes('legacy dev')
    || context.includes('dev fallback')
    || context.includes('dev fixture')
    || context.includes('masked-witness fallback');
}
