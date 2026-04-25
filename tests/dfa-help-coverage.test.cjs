/**
 * DFA command coverage in /gsd-help reference.
 *
 * Guards against the regression where a /gsd-dfa-* command exists in
 * commands/gsd/ but is not documented in get-shit-done/workflows/help.md.
 *
 * Rationale: DFA modeling is gsd-dfa's core differentiator (see CLAUDE.md
 * "DFA is the core differentiator — don't dilute it"). A new DFA command
 * landing without a help.md entry silently bypasses the discoverable
 * surface and is exactly the dilution that file warns against.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DFA_COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');
const HELP_FILE = path.join(ROOT, 'get-shit-done', 'workflows', 'help.md');

function listDfaCommands() {
  return fs
    .readdirSync(DFA_COMMANDS_DIR)
    .filter((name) => name.startsWith('dfa-') && name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

describe('DFA command coverage in help.md', () => {
  test('every commands/gsd/dfa-*.md is referenced in help.md', () => {
    const dfaCommands = listDfaCommands();
    assert.ok(
      dfaCommands.length >= 7,
      `Expected at least 7 DFA commands in commands/gsd/, found ${dfaCommands.length}: ${dfaCommands.join(', ')}`
    );

    const helpContent = fs.readFileSync(HELP_FILE, 'utf8');

    const missing = dfaCommands.filter((cmd) => {
      const slashName = `/gsd-${cmd}`;
      return !helpContent.includes(slashName);
    });

    if (missing.length > 0) {
      assert.fail(
        `These DFA commands exist in commands/gsd/ but are not referenced in get-shit-done/workflows/help.md:\n` +
          missing.map((cmd) => `  - /gsd-${cmd}`).join('\n') +
          '\n\nAdd them to the "State Machine Modeling (DFA)" section.'
      );
    }
  });

  test('help.md has the State Machine Modeling (DFA) section', () => {
    const helpContent = fs.readFileSync(HELP_FILE, 'utf8');
    assert.ok(
      /^### State Machine Modeling \(DFA\)$/m.test(helpContent),
      'help.md must contain a "### State Machine Modeling (DFA)" section heading'
    );
  });
});
