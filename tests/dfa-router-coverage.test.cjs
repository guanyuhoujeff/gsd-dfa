/**
 * DFA command coverage in /gsd-do routing.
 *
 * Guards against the regression where a /gsd-dfa-* command exists in
 * commands/gsd/ but is not listed in get-shit-done/workflows/do.md's
 * DFA family disambiguation table.
 *
 * Without this test, /gsd-do can silently route freeform user intent
 * away from the DFA family — e.g. "model the auth state machine" can
 * fall through to /gsd-add-phase. This is exactly what motivated the
 * routing table fix in commit ca4a319.
 *
 * Companion to dfa-help-coverage.test.cjs which covers help.md.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DFA_COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');
const DO_WORKFLOW = path.join(ROOT, 'get-shit-done', 'workflows', 'do.md');

function listDfaCommands() {
  return fs
    .readdirSync(DFA_COMMANDS_DIR)
    .filter((name) => name.startsWith('dfa-') && name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

describe('DFA command coverage in /gsd-do routing', () => {
  test('every commands/gsd/dfa-*.md is referenced in do.md disambiguation table', () => {
    const dfaCommands = listDfaCommands();
    assert.ok(
      dfaCommands.length >= 7,
      `Expected at least 7 DFA commands in commands/gsd/, found ${dfaCommands.length}: ${dfaCommands.join(', ')}`
    );

    const doContent = fs.readFileSync(DO_WORKFLOW, 'utf8');

    const missing = dfaCommands.filter((cmd) => {
      const slashName = `/gsd-${cmd}`;
      return !doContent.includes(slashName);
    });

    if (missing.length > 0) {
      assert.fail(
        `These DFA commands exist in commands/gsd/ but are not referenced in get-shit-done/workflows/do.md:\n` +
          missing.map((cmd) => `  - /gsd-${cmd}`).join('\n') +
          '\n\nAdd them to the "DFA family disambiguation" sub-table in do.md.'
      );
    }
  });

  test('do.md has the DFA family routing rule and disambiguation sub-table', () => {
    const doContent = fs.readFileSync(DO_WORKFLOW, 'utf8');

    assert.ok(
      /DFA family/i.test(doContent),
      'do.md must contain a "DFA family" routing rule in the main table'
    );
    assert.ok(
      /DFA family disambiguation/i.test(doContent),
      'do.md must contain a "DFA family disambiguation" sub-table mapping intent phrases to specific /gsd-dfa-* commands'
    );
  });
});
