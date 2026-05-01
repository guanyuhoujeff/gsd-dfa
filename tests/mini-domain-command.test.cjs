/**
 * /gsd-mini-domain command structural tests (gsd-mini phase 2).
 *
 * Asserts the four artifacts that constitute the /gsd-mini-domain command:
 *   1. commands/gsd/mini-domain.md — the slash command file
 *   2. get-shit-done/workflows/mini-domain.md — the workflow logic
 *   3. get-shit-done/templates/ddd-ubiquitous-language.md — UBIQUITOUS-LANGUAGE.md template
 *   4. get-shit-done/templates/ddd-context-map.md — CONTEXT-MAP.md template
 *
 * Plus the manifest entry so /gsd-mini-domain ships with the mini profile.
 *
 * Companion: tests/profile-mini-install.test.cjs already verifies the
 * manifest-listed command lands when --profile mini installs.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const COMMAND_FILE = path.join(ROOT, 'commands', 'gsd', 'mini-domain.md');
const WORKFLOW_FILE = path.join(ROOT, 'get-shit-done', 'workflows', 'mini-domain.md');
const UL_TEMPLATE = path.join(ROOT, 'get-shit-done', 'templates', 'ddd-ubiquitous-language.md');
const CTX_TEMPLATE = path.join(ROOT, 'get-shit-done', 'templates', 'ddd-context-map.md');
const MINI_MANIFEST = path.join(ROOT, 'bin', 'profiles', 'mini.json');

describe('/gsd-mini-domain command (gsd-mini phase 2)', () => {
  test('all four artifact files exist', () => {
    const missing = [];
    for (const [label, p] of [
      ['command', COMMAND_FILE],
      ['workflow', WORKFLOW_FILE],
      ['ubiquitous-language template', UL_TEMPLATE],
      ['context-map template', CTX_TEMPLATE],
    ]) {
      if (!fs.existsSync(p)) missing.push(`${label}: ${path.relative(ROOT, p)}`);
    }
    if (missing.length) assert.fail(`Missing files:\n${missing.map(m => '  - ' + m).join('\n')}`);
  });

  test('command frontmatter has correct name and points at workflow', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8');
    assert.match(content, /^---\nname: gsd:mini-domain$/m, 'frontmatter "name: gsd:mini-domain" required');
    assert.match(content, /argument-hint:/, 'argument-hint required');
    assert.match(content, /allowed-tools:/, 'allowed-tools required');
    assert.match(
      content,
      /workflows\/mini-domain\.md/,
      'command must reference workflows/mini-domain.md in execution_context'
    );
  });

  test('command references both DDD templates', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8');
    assert.match(content, /ddd-ubiquitous-language\.md/, 'command must reference ubiquitous-language template');
    assert.match(content, /ddd-context-map\.md/, 'command must reference context-map template');
  });

  test('workflow defines the strategic DDD steps', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    // Workflow must cover: input validation, context proposal, integration patterns,
    // both artifacts (UL + context map), and final verification
    const requiredSteps = [
      /step name="validate_inputs"/,
      /step name="propose_contexts"/,
      /step name="define_integrations"/,
      /step name="build_ubiquitous_language"/,
      /step name="build_context_map"/,
      /step name="write_artifacts"/,
    ];
    for (const re of requiredSteps) {
      assert.match(content, re, `workflow missing step matching ${re}`);
    }
    // Standard DDD integration patterns must appear in the workflow
    for (const pattern of ['anti-corruption layer', 'shared kernel', 'customer-supplier', 'open-host service', 'conformist', 'partnership']) {
      assert.match(content.toLowerCase(), new RegExp(pattern.toLowerCase()), `workflow missing DDD pattern: ${pattern}`);
    }
  });

  test('ubiquitous-language template contains required scaffolding', () => {
    const content = fs.readFileSync(UL_TEMPLATE, 'utf8');
    assert.match(content, /Ubiquitous Language/, 'template must title itself as Ubiquitous Language');
    assert.match(content, /bounded context/i, 'template must mention bounded context scoping');
    assert.match(content, /Cross-context/i, 'template must address cross-context term collisions');
    assert.match(content, /CONTEXT-MAP\.md/, 'template must cross-link to CONTEXT-MAP.md');
  });

  test('context-map template contains required scaffolding', () => {
    const content = fs.readFileSync(CTX_TEMPLATE, 'utf8');
    assert.match(content, /Context Map/, 'template must title itself as Context Map');
    assert.match(content, /Integration Patterns/i, 'template must include integration patterns section');
    assert.match(content, /mermaid/i, 'template must include a Mermaid map example');
    assert.match(content, /UBIQUITOUS-LANGUAGE\.md/, 'template must cross-link to UBIQUITOUS-LANGUAGE.md');
  });

  test('mini profile manifest includes mini-domain', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST, 'utf8'));
    assert.ok(
      manifest.include.commands.includes('mini-domain'),
      '/gsd-mini-domain must be listed in bin/profiles/mini.json include.commands'
    );
  });
});
