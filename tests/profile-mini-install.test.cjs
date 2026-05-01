/**
 * --profile mini install boundary test.
 *
 * Phase mini-1 of the gsd-mini design (docs/GSD-MINI-DESIGN.md): when
 * `node bin/install.js --profile mini --claude --global` runs, only the
 * commands and agents named in bin/profiles/mini.json should land at
 * the target. Anything in the manifest's exclude_summary must be absent.
 *
 * This guards against three regressions:
 *  1. Profile filter silently broken — full set installed under --profile mini
 *  2. Manifest drift — a new excluded command leaks through because the
 *     profile manifest was not updated
 *  3. Default install regression — passing no --profile still installs
 *     everything (the --profile mechanism does not change default behavior)
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INSTALL_SCRIPT = path.join(ROOT, 'bin', 'install.js');
const MINI_MANIFEST_PATH = path.join(ROOT, 'bin', 'profiles', 'mini.json');

function runInstaller(args, cwd) {
  return execFileSync(process.execPath, [INSTALL_SCRIPT, ...args], {
    cwd,
    stdio: 'pipe',
    env: { ...process.env },
  }).toString();
}

describe('--profile mini install boundary', () => {
  let tmpMini;
  let tmpFull;

  before(() => {
    tmpMini = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-test-mini-'));
    tmpFull = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-test-full-'));
    runInstaller(['--claude', '--global', '--config-dir', tmpMini, '--profile', 'mini'], ROOT);
    runInstaller(['--claude', '--global', '--config-dir', tmpFull], ROOT);
  });

  after(() => {
    try { fs.rmSync(tmpMini, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(tmpFull, { recursive: true, force: true }); } catch {}
  });

  test('mini.json manifest exists and is well-formed', () => {
    assert.ok(fs.existsSync(MINI_MANIFEST_PATH), 'bin/profiles/mini.json must exist');
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST_PATH, 'utf8'));
    assert.equal(manifest.name, 'mini');
    assert.ok(Array.isArray(manifest.include.commands), 'manifest.include.commands must be an array');
    assert.ok(Array.isArray(manifest.include.agents), 'manifest.include.agents must be an array');
    assert.ok(manifest.include.commands.length >= 50, 'mini should still include the bulk of planning commands');
  });

  test('mini install includes every command listed in the manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST_PATH, 'utf8'));
    const skillsDir = path.join(tmpMini, 'skills');
    assert.ok(fs.existsSync(skillsDir), 'mini install should produce a skills/ directory');

    const missing = [];
    for (const cmd of manifest.include.commands) {
      const skillDir = path.join(skillsDir, `gsd-${cmd}`);
      if (!fs.existsSync(skillDir)) missing.push(`gsd-${cmd}`);
    }
    if (missing.length > 0) {
      assert.fail(`mini install missing expected skills:\n${missing.map(m => '  - ' + m).join('\n')}`);
    }
  });

  test('mini install excludes every command in exclude_summary', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST_PATH, 'utf8'));
    const skillsDir = path.join(tmpMini, 'skills');

    const leaked = [];
    for (const cmd of manifest.exclude_summary.commands_excluded || []) {
      const skillDir = path.join(skillsDir, `gsd-${cmd}`);
      if (fs.existsSync(skillDir)) leaked.push(`gsd-${cmd}`);
    }
    if (leaked.length > 0) {
      assert.fail(
        `mini install leaked excluded skills (these should have been filtered out):\n` +
          leaked.map(m => '  - ' + m).join('\n')
      );
    }
  });

  test('mini install excludes every agent in exclude_summary', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST_PATH, 'utf8'));
    const agentsDir = path.join(tmpMini, 'agents');
    assert.ok(fs.existsSync(agentsDir), 'mini install should produce an agents/ directory');

    const leaked = [];
    for (const ag of manifest.exclude_summary.agents_excluded || []) {
      const agentFile = path.join(agentsDir, `${ag}.md`);
      if (fs.existsSync(agentFile)) leaked.push(ag);
    }
    if (leaked.length > 0) {
      assert.fail(
        `mini install leaked excluded agents (these should have been filtered out):\n` +
          leaked.map(m => '  - ' + m).join('\n')
      );
    }
  });

  test('default install (no --profile) installs everything the mini install excludes', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST_PATH, 'utf8'));
    const skillsDir = path.join(tmpFull, 'skills');
    const agentsDir = path.join(tmpFull, 'agents');

    const missingFromFull = [];
    for (const cmd of manifest.exclude_summary.commands_excluded || []) {
      if (!fs.existsSync(path.join(skillsDir, `gsd-${cmd}`))) missingFromFull.push(`skill gsd-${cmd}`);
    }
    for (const ag of manifest.exclude_summary.agents_excluded || []) {
      if (!fs.existsSync(path.join(agentsDir, `${ag}.md`))) missingFromFull.push(`agent ${ag}`);
    }
    if (missingFromFull.length > 0) {
      assert.fail(
        `Default install (no --profile) is missing items the mini profile excludes — ` +
          `default behavior should still install everything:\n` +
          missingFromFull.map(m => '  - ' + m).join('\n')
      );
    }
  });

  test('mini install is strictly smaller than default install', () => {
    const miniSkills = fs.readdirSync(path.join(tmpMini, 'skills'));
    const fullSkills = fs.readdirSync(path.join(tmpFull, 'skills'));
    assert.ok(
      miniSkills.length < fullSkills.length,
      `expected mini (${miniSkills.length}) < full (${fullSkills.length}) skills count`
    );
  });
});
