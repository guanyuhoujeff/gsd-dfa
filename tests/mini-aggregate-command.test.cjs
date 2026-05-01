/**
 * /gsd-mini-aggregate command structural tests (gsd-mini phase 3).
 *
 * Asserts the four artifacts that constitute the /gsd-mini-aggregate command:
 *   1. commands/gsd/mini-aggregate.md — slash command
 *   2. get-shit-done/workflows/mini-aggregate.md — workflow logic
 *   3. get-shit-done/templates/ddd-aggregate.md — aggregate artifact template
 *   4. existing dfa-state-table.md template (referenced for DFA skeleton emission)
 *
 * Plus the manifest entry and the DFA-skeleton emission contract per
 * docs/GSD-MINI-DESIGN.md §5.2 — the workflow MUST emit a draft DFA file
 * by default (with --no-dfa-skeleton opt-out) where states match the
 * aggregate's lifecycle and forbidden transitions match its invariants.
 *
 * Companion: tests/profile-mini-install.test.cjs verifies installation
 * delivery; this file verifies command authoring correctness.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const COMMAND_FILE = path.join(ROOT, 'commands', 'gsd', 'mini-aggregate.md');
const WORKFLOW_FILE = path.join(ROOT, 'get-shit-done', 'workflows', 'mini-aggregate.md');
const AGGREGATE_TEMPLATE = path.join(ROOT, 'get-shit-done', 'templates', 'ddd-aggregate.md');
const DFA_TEMPLATE = path.join(ROOT, 'get-shit-done', 'templates', 'dfa-state-table.md');
const MINI_MANIFEST = path.join(ROOT, 'bin', 'profiles', 'mini.json');

describe('/gsd-mini-aggregate command (gsd-mini phase 3)', () => {
  test('all artifact files exist', () => {
    const missing = [];
    for (const [label, p] of [
      ['command', COMMAND_FILE],
      ['workflow', WORKFLOW_FILE],
      ['aggregate template', AGGREGATE_TEMPLATE],
      ['dfa-state-table template (referenced)', DFA_TEMPLATE],
    ]) {
      if (!fs.existsSync(p)) missing.push(`${label}: ${path.relative(ROOT, p)}`);
    }
    if (missing.length) assert.fail(`Missing files:\n${missing.map(m => '  - ' + m).join('\n')}`);
  });

  test('command frontmatter has correct name and points at workflow + both templates', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8');
    assert.match(content, /^---\nname: gsd:mini-aggregate$/m, 'frontmatter "name: gsd:mini-aggregate" required');
    assert.match(content, /argument-hint:.*<aggregate-name>/, 'argument-hint must show aggregate-name positional');
    assert.match(content, /--no-dfa-skeleton/, 'argument-hint or context must mention --no-dfa-skeleton flag');
    assert.match(content, /workflows\/mini-aggregate\.md/, 'must reference workflows/mini-aggregate.md');
    assert.match(content, /templates\/ddd-aggregate\.md/, 'must reference ddd-aggregate.md template');
    assert.match(content, /templates\/dfa-state-table\.md/, 'must reference dfa-state-table.md (for skeleton emission)');
  });

  test('workflow defines all 9 required steps', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    const requiredSteps = [
      'validate_inputs',
      'parse_flags',
      'resolve_context',
      'propose_aggregate_structure',
      'capture_invariants',
      'capture_lifecycle',
      'capture_boundaries',
      'capture_concurrency',
      'write_aggregate_artifact',
      'emit_dfa_skeleton',
      'verify',
    ];
    for (const s of requiredSteps) {
      assert.match(content, new RegExp(`step name="${s}"`), `workflow missing step: ${s}`);
    }
  });

  test('workflow defines DFA-skeleton emission contract', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    // Skeleton path matches the standalone DFA path used by /gsd-dfa-model
    assert.match(content, /\.planning\/dfa\/DFA-/, 'skeleton path must be .planning/dfa/DFA-{slug}.md');
    // Default-on with opt-out
    assert.match(content, /--no-dfa-skeleton/, 'must support --no-dfa-skeleton opt-out');
    // Skeleton frontmatter signals draft status
    assert.match(content, /status:\s*draft/i, 'skeleton must carry draft status');
    // Lifecycle states map to DFA states
    assert.match(content, /states.*lifecycle|lifecycle.*states/i, 'must document lifecycle → states mapping');
    // Invariants map to forbidden transitions
    assert.match(content, /F-INV|forbidden.*invariant|invariant.*forbidden/i, 'must document invariants → forbidden transitions mapping');
    // Don't overwrite existing
    assert.match(content, /already exist|do not overwrite|drift/i, 'must address existing-DFA collision');
  });

  test('workflow has TEXT_MODE fallback', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    assert.match(content, /TEXT_MODE/, 'workflow must define TEXT_MODE for non-Claude runtimes');
    assert.match(content, /plain-text/, 'must reference plain-text fallback for AskUserQuestion');
  });

  test('aggregate template captures all six DDD aspects', () => {
    const content = fs.readFileSync(AGGREGATE_TEMPLATE, 'utf8');
    const required = [
      /Root Entity/i,
      /Member Entities/i,
      /Value Objects/i,
      /Invariants/i,
      /Lifecycle/i,
      /Boundaries/i,
      /Concurrency/i,
    ];
    for (const re of required) {
      assert.match(content, re, `aggregate template missing section matching ${re}`);
    }
    // Frontmatter fields
    assert.match(content, /aggregate:\s*\[/, 'frontmatter must have aggregate field');
    assert.match(content, /context:\s*\[/, 'frontmatter must have context field');
    assert.match(content, /identity:\s*\[/, 'frontmatter must have identity field');
    assert.match(content, /concurrency:\s*\[/, 'frontmatter must have concurrency field');
    // Cross-link to DFA
    assert.match(content, /DFA-.*\.md/, 'template must cross-link to DFA file');
    // Invariant numbering convention
    assert.match(content, /INV-0?1/, 'template must demonstrate INV-XX numbering');
  });

  test('mini profile manifest includes mini-aggregate', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST, 'utf8'));
    assert.ok(
      manifest.include.commands.includes('mini-aggregate'),
      '/gsd-mini-aggregate must be listed in bin/profiles/mini.json include.commands'
    );
  });

  test('mini-aggregate is positioned near other mini-* commands in manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST, 'utf8'));
    const idxDomain = manifest.include.commands.indexOf('mini-domain');
    const idxAggregate = manifest.include.commands.indexOf('mini-aggregate');
    assert.ok(idxDomain >= 0, 'mini-domain expected in manifest (mini-2 prerequisite)');
    assert.ok(idxAggregate >= 0, 'mini-aggregate expected in manifest');
    // Adjacent or near-adjacent — keeps the manifest readable as the family grows
    assert.ok(
      Math.abs(idxAggregate - idxDomain) <= 5,
      `mini-domain (${idxDomain}) and mini-aggregate (${idxAggregate}) should be close in manifest order`
    );
  });
});
