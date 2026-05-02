/**
 * --profile mini boundary invariants (gsd-mini phase 7).
 *
 * Strengthens the existing tests/profile-mini-install.test.cjs which
 * covers the install-time guarantees. This test guards the *manifest
 * itself* — the bin/profiles/mini.json file — for invariants that
 * future contributors are likely to break:
 *
 *   1. Manifest sync — every command file in commands/gsd/ is EITHER
 *      in mini.include.commands OR in mini.exclude_summary.commands_excluded.
 *      No command may be unclassified — unclassified means someone
 *      added a new command without deciding profile membership.
 *   2. Same invariant for agents.
 *   3. No duplicates between include and exclude lists (a command
 *      cannot be both included and excluded).
 *   4. All commands/gsd/mini-*.md MUST be in mini.include.commands
 *      (mini-* commands are mini-profile by name).
 *   5. All commands/gsd/dfa-*.md MUST be in mini.include.commands
 *      (DFA is the differentiator; it's planning, not execution).
 *   6. mini profile must not include obvious execution-only commands
 *      (defense in depth: even if exclude_summary is wrong, these
 *      names alone are a red flag).
 *   7. mini.include.commands count is strictly smaller than total
 *      commands in commands/gsd/ — sanity check that the profile is
 *      actually a subset.
 *
 * Companion: tests/profile-mini-install.test.cjs verifies the
 * runtime install behavior; this file verifies the manifest contract.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');
const AGENTS_DIR = path.join(ROOT, 'agents');
const MINI_MANIFEST_PATH = path.join(ROOT, 'bin', 'profiles', 'mini.json');

function listCommandSlugs() {
  return fs
    .readdirSync(COMMANDS_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

function listAgentNames() {
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((name) => name.startsWith('gsd-') && name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MINI_MANIFEST_PATH, 'utf8'));
}

// Commands that contain obvious execution semantics. If any appear in
// mini.include.commands, the profile boundary is broken — these
// commands write code, run subagents that write code, or ship code.
const EXECUTION_FORBIDDEN = [
  'execute-phase',
  'quick',
  'fast',
  'autonomous',
  'ship',
  'pr-branch',
  'add-tests',
  'validate-phase',
  'secure-phase',
  'code-review',
  'code-review-fix',
  'eval-review',
  'ui-review',
  'debug',
  'undo',
  'audit-fix',
];

const EXECUTION_FORBIDDEN_AGENTS = [
  'gsd-executor',
  'gsd-code-reviewer',
  'gsd-code-fixer',
  'gsd-security-auditor',
  'gsd-nyquist-auditor',
  'gsd-debugger',
  'gsd-eval-auditor',
  'gsd-ui-auditor',
  'gsd-integration-checker',
];

describe('--profile mini boundary invariants (gsd-mini phase 7)', () => {
  test('every command in commands/gsd/ is classified (include or exclude_summary)', () => {
    const allCommands = new Set(listCommandSlugs());
    const manifest = loadManifest();
    const included = new Set(manifest.include.commands);
    const excluded = new Set(manifest.exclude_summary.commands_excluded);

    const unclassified = [];
    for (const cmd of allCommands) {
      if (!included.has(cmd) && !excluded.has(cmd)) unclassified.push(cmd);
    }

    if (unclassified.length > 0) {
      assert.fail(
        `These commands exist in commands/gsd/ but are not classified in bin/profiles/mini.json:\n` +
          unclassified.map(c => '  - ' + c).join('\n') +
          `\n\nDecide whether each belongs in include.commands (planning-only) or ` +
          `exclude_summary.commands_excluded (execution-related). Update mini.json accordingly.`
      );
    }
  });

  test('every gsd-* agent in agents/ is classified (include or exclude_summary)', () => {
    const allAgents = new Set(listAgentNames());
    const manifest = loadManifest();
    const included = new Set(manifest.include.agents);
    const excluded = new Set(manifest.exclude_summary.agents_excluded);

    const unclassified = [];
    for (const ag of allAgents) {
      if (!included.has(ag) && !excluded.has(ag)) unclassified.push(ag);
    }

    if (unclassified.length > 0) {
      assert.fail(
        `These agents exist in agents/ but are not classified in bin/profiles/mini.json:\n` +
          unclassified.map(a => '  - ' + a).join('\n') +
          `\n\nDecide whether each belongs in include.agents (planning-only) or ` +
          `exclude_summary.agents_excluded (execution-related). Update mini.json accordingly.`
      );
    }
  });

  test('no command appears in both include and exclude_summary', () => {
    const manifest = loadManifest();
    const included = new Set(manifest.include.commands);
    const overlap = manifest.exclude_summary.commands_excluded.filter(c => included.has(c));
    if (overlap.length > 0) {
      assert.fail(
        `These commands are in BOTH include.commands and exclude_summary.commands_excluded:\n` +
          overlap.map(c => '  - ' + c).join('\n') +
          `\n\nA command must be one or the other.`
      );
    }
  });

  test('no agent appears in both include and exclude_summary', () => {
    const manifest = loadManifest();
    const included = new Set(manifest.include.agents);
    const overlap = manifest.exclude_summary.agents_excluded.filter(a => included.has(a));
    if (overlap.length > 0) {
      assert.fail(
        `These agents are in BOTH include.agents and exclude_summary.agents_excluded:\n` +
          overlap.map(a => '  - ' + a).join('\n')
      );
    }
  });

  test('every commands/gsd/mini-*.md is in mini.include.commands', () => {
    const miniCommands = listCommandSlugs().filter(s => s.startsWith('mini-'));
    const manifest = loadManifest();
    const included = new Set(manifest.include.commands);

    const missing = miniCommands.filter(c => !included.has(c));
    if (missing.length > 0) {
      assert.fail(
        `These mini-* commands exist in commands/gsd/ but are not in mini.include.commands:\n` +
          missing.map(c => '  - /gsd-' + c).join('\n') +
          `\n\nMini commands are by name part of the mini profile.`
      );
    }
    assert.ok(miniCommands.length >= 4, `Expected at least 4 mini-* commands (domain, aggregate, storage, event-storm), found ${miniCommands.length}`);
  });

  test('every commands/gsd/dfa-*.md is in mini.include.commands', () => {
    const dfaCommands = listCommandSlugs().filter(s => s.startsWith('dfa-'));
    const manifest = loadManifest();
    const included = new Set(manifest.include.commands);

    const missing = dfaCommands.filter(c => !included.has(c));
    if (missing.length > 0) {
      assert.fail(
        `These dfa-* commands exist in commands/gsd/ but are not in mini.include.commands:\n` +
          missing.map(c => '  - /gsd-' + c).join('\n') +
          `\n\nDFA modeling is gsd-dfa's core differentiator and is planning, not execution. ` +
          `It must ship under --profile mini.`
      );
    }
    assert.ok(dfaCommands.length >= 7, `Expected at least 7 dfa-* commands, found ${dfaCommands.length}`);
  });

  test('mini.include.commands does not contain any execution-forbidden command', () => {
    const manifest = loadManifest();
    const included = new Set(manifest.include.commands);

    const leaks = EXECUTION_FORBIDDEN.filter(c => included.has(c));
    if (leaks.length > 0) {
      assert.fail(
        `These execution-related commands leaked into mini.include.commands:\n` +
          leaks.map(c => '  - /gsd-' + c).join('\n') +
          `\n\nMini profile is planning-only. These commands write code, run code-writing ` +
          `subagents, or ship code. They belong in exclude_summary.commands_excluded only.`
      );
    }
  });

  test('mini.include.agents does not contain any execution-forbidden agent', () => {
    const manifest = loadManifest();
    const included = new Set(manifest.include.agents);

    const leaks = EXECUTION_FORBIDDEN_AGENTS.filter(a => included.has(a));
    if (leaks.length > 0) {
      assert.fail(
        `These execution-related agents leaked into mini.include.agents:\n` +
          leaks.map(a => '  - ' + a).join('\n') +
          `\n\nMini profile is planning-only. These agents write code or analyze ` +
          `implementation. They belong in exclude_summary.agents_excluded only.`
      );
    }
  });

  test('mini.include.commands is strictly smaller than total commands', () => {
    const totalCommands = listCommandSlugs().length;
    const manifest = loadManifest();
    const includedCount = manifest.include.commands.length;
    assert.ok(
      includedCount < totalCommands,
      `mini.include.commands (${includedCount}) must be strictly smaller than ` +
      `commands/gsd/ total (${totalCommands}). If they're equal, the profile filter is a no-op.`
    );
  });

  test('mini.include.agents is strictly smaller than total gsd-* agents', () => {
    const totalAgents = listAgentNames().length;
    const manifest = loadManifest();
    const includedCount = manifest.include.agents.length;
    assert.ok(
      includedCount < totalAgents,
      `mini.include.agents (${includedCount}) must be strictly smaller than ` +
      `gsd-* agents total (${totalAgents}). If they're equal, the profile filter is a no-op.`
    );
  });

  test('manifest schema fields are present', () => {
    const manifest = loadManifest();
    assert.equal(typeof manifest.name, 'string', 'manifest.name must be string');
    assert.equal(manifest.name, 'mini', 'manifest.name must be "mini"');
    assert.equal(typeof manifest.description, 'string', 'manifest.description must be string');
    assert.ok(manifest.description.length > 50, 'manifest.description should be a real description, not a placeholder');
    assert.ok(Number.isInteger(manifest.version) || typeof manifest.version === 'string',
      'manifest.version must be present');
    assert.ok(Array.isArray(manifest.include.commands), 'include.commands must be array');
    assert.ok(Array.isArray(manifest.include.agents), 'include.agents must be array');
    assert.ok(manifest.exclude_summary, 'exclude_summary block required for documentation');
    assert.ok(Array.isArray(manifest.exclude_summary.commands_excluded), 'exclude_summary.commands_excluded must be array');
    assert.ok(Array.isArray(manifest.exclude_summary.agents_excluded), 'exclude_summary.agents_excluded must be array');
  });

  test('include lists have no duplicates within themselves', () => {
    const manifest = loadManifest();
    const cmdDupes = manifest.include.commands.filter((c, i, a) => a.indexOf(c) !== i);
    const agDupes = manifest.include.agents.filter((a, i, arr) => arr.indexOf(a) !== i);
    if (cmdDupes.length > 0) {
      assert.fail(`mini.include.commands has duplicates: ${[...new Set(cmdDupes)].join(', ')}`);
    }
    if (agDupes.length > 0) {
      assert.fail(`mini.include.agents has duplicates: ${[...new Set(agDupes)].join(', ')}`);
    }
  });
});
