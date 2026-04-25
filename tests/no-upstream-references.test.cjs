/**
 * Forbid upstream references in installable content.
 *
 * Per CLAUDE.md: gsd-dfa is an independent project as of v2.0.0,
 * not a sync target. We are deliberately diverged from
 * gsd-build/get-shit-done (the upstream fork point) and from
 * get-shit-done-cc (the npm package the upstream publishes as).
 *
 * Any reference to those identifiers in installable content
 * (workflows, agents, slash commands, hooks, installer, scripts)
 * means a future user will be pointed at the wrong repo or wrong
 * npm package. This is the exact bug fixed in commit eedb9d8
 * (a /gsd-update changelog link still pointing at upstream).
 *
 * Allowed exceptions:
 * - README.md: legitimate MIT attribution required by CLAUDE.md
 *   ("The MIT attribution to upstream must remain in README.md
 *   and LICENSE")
 * - LICENSE: same MIT attribution requirement
 * - CHANGELOG.md: historical release notes from before the fork
 * - docs/: not shipped to npm (not in package.json files), only
 *   visible on GitHub; UPSTREAM-SYNC.md must mention upstream by
 *   design
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['bin', 'commands', 'agents', 'hooks', 'get-shit-done', 'scripts'];
const SCAN_EXTENSIONS = new Set([
  '.md', '.js', '.cjs', '.mjs', '.ts', '.json', '.yml', '.yaml', '.sh', '.toml',
]);

const FORBIDDEN_PATTERNS = [
  { pattern: /gsd-build\/get-shit-done/g, label: 'upstream GitHub repo (gsd-build/get-shit-done)' },
  { pattern: /get-shit-done-cc/g, label: 'upstream npm package name (get-shit-done-cc)' },
];

function collectFiles(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, results);
    } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

describe('no upstream references in installable content', () => {
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    test(`no references to ${label}`, () => {
      const violations = [];

      for (const dir of SCAN_DIRS) {
        const files = collectFiles(path.join(ROOT, dir));
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            // reset regex state per line (g flag)
            pattern.lastIndex = 0;
            if (pattern.test(lines[i])) {
              const rel = path.relative(ROOT, file).replace(/\\/g, '/');
              violations.push(`  ${rel}:${i + 1}: ${lines[i].trim()}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        assert.fail(
          `Found ${violations.length} reference(s) to ${label} in installable content. ` +
            `gsd-dfa diverged from upstream at v2.0.0 — these references will misdirect users.\n\n` +
            violations.join('\n') +
            `\n\nIf this is intentional historical documentation, move it to CHANGELOG.md, README.md (attribution), or docs/UPSTREAM-SYNC.md (none of which are scanned).`
        );
      }
    });
  }
});
