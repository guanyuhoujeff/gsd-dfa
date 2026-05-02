/**
 * /gsd-mini-event-storm command structural tests (gsd-mini phase 4).
 *
 * Asserts the artifacts that constitute /gsd-mini-event-storm:
 *   1. commands/gsd/mini-event-storm.md — slash command
 *   2. get-shit-done/workflows/mini-event-storm.md — workflow logic
 *   3. get-shit-done/templates/ddd-event-storm.md — artifact template
 *
 * Plus the manifest entry, the eight-sticky-note category contract per
 * docs/GSD-MINI-DESIGN.md §5.3, and the bridge to /gsd-dfa-model and
 * /gsd-list-phase-assumptions per §6.
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

const COMMAND_FILE = path.join(ROOT, 'commands', 'gsd', 'mini-event-storm.md');
const WORKFLOW_FILE = path.join(ROOT, 'get-shit-done', 'workflows', 'mini-event-storm.md');
const TEMPLATE_FILE = path.join(ROOT, 'get-shit-done', 'templates', 'ddd-event-storm.md');
const MINI_MANIFEST = path.join(ROOT, 'bin', 'profiles', 'mini.json');

// The 8 sticky-note categories per docs/GSD-MINI-DESIGN.md §5.3
const STICKY_CATEGORIES = [
  { label: 'domain events', color: 'orange' },
  { label: 'commands', color: 'blue' },
  { label: 'actors', color: 'yellow' },
  { label: 'aggregates', color: 'yellow box' },
  { label: 'policies', color: 'purple' },
  { label: 'external systems', color: 'pink' },
  { label: 'read models', color: 'green' },
  { label: 'hot spots', color: 'red' },
];

describe('/gsd-mini-event-storm command (gsd-mini phase 4)', () => {
  test('all artifact files exist', () => {
    const missing = [];
    for (const [label, p] of [
      ['command', COMMAND_FILE],
      ['workflow', WORKFLOW_FILE],
      ['template', TEMPLATE_FILE],
    ]) {
      if (!fs.existsSync(p)) missing.push(`${label}: ${path.relative(ROOT, p)}`);
    }
    if (missing.length) assert.fail(`Missing files:\n${missing.map(m => '  - ' + m).join('\n')}`);
  });

  test('command frontmatter has correct name and links to workflow + template', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8');
    assert.match(content, /^---\nname: gsd:mini-event-storm$/m, 'frontmatter "name: gsd:mini-event-storm" required');
    assert.match(content, /argument-hint:/, 'argument-hint required');
    assert.match(content, /--context/, 'must document --context flag');
    assert.match(content, /--aggregate/, 'must document --aggregate narrowing flag');
    assert.match(content, /workflows\/mini-event-storm\.md/, 'must reference workflow');
    assert.match(content, /templates\/ddd-event-storm\.md/, 'must reference template');
  });

  test('command lists all eight sticky-note categories', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8').toLowerCase();
    for (const { label } of STICKY_CATEGORIES) {
      assert.ok(
        content.includes(label),
        `command must mention sticky-note category: ${label}`
      );
    }
  });

  test('workflow defines all required steps for the eight categories + bridge', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    const requiredSteps = [
      'validate_inputs',
      'parse_flags',
      'resolve_context',
      'capture_domain_events',
      'capture_commands',
      'capture_actors',
      'capture_aggregates',
      'capture_policies',
      'capture_external_systems',
      'capture_read_models',
      'capture_hot_spots',
      'write_artifact',
      'emit_dfa_event_hint',
      'verify',
    ];
    for (const s of requiredSteps) {
      assert.match(content, new RegExp(`step name="${s}"`), `workflow missing step: ${s}`);
    }
  });

  test('workflow enforces naming conventions (events past-tense, commands imperative)', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    assert.match(content, /past-tense/i, 'workflow must enforce past-tense convention for events');
    assert.match(content, /imperative/i, 'workflow must enforce imperative convention for commands');
    assert.match(content, /PascalCase/, 'workflow must specify PascalCase naming');
  });

  test('workflow defines the DDD↔DFA bridge', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    // Per docs §6 — the bridge between event storming and DFA family
    assert.match(content, /\/gsd-dfa-model/, 'workflow must mention /gsd-dfa-model bridge');
    assert.match(content, /\/gsd-dfa-scenarios/, 'workflow must mention /gsd-dfa-scenarios bridge for policies');
    assert.match(content, /\/gsd-list-phase-assumptions/, 'workflow must mention /gsd-list-phase-assumptions bridge for hot spots');
    assert.match(content, /\/gsd-mini-storage/, 'workflow must mention /gsd-mini-storage bridge for read models');
  });

  test('workflow has TEXT_MODE fallback', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    assert.match(content, /TEXT_MODE/, 'workflow must define TEXT_MODE for non-Claude runtimes');
    assert.match(content, /plain-text/, 'must reference plain-text fallback for AskUserQuestion');
  });

  test('template has all eight sticky-note sections plus bridge artifacts', () => {
    const content = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const sections = [
      /Domain Events/i,
      /^## 2\. Commands|## Commands/m,
      /Actors/i,
      /Aggregates/i,
      /Policies/i,
      /External Systems/i,
      /Read Models/i,
      /Hot Spots/i,
      /DFA event vocabulary/i,
    ];
    for (const re of sections) {
      assert.match(content, re, `template missing section matching ${re}`);
    }
    // Frontmatter must record per-category counts
    const counters = ['events_count', 'commands_count', 'actors_count', 'aggregates_count', 'policies_count', 'externals_count', 'read_models_count', 'hot_spots_count'];
    for (const c of counters) {
      assert.match(content, new RegExp(c), `template frontmatter missing counter: ${c}`);
    }
    // Mermaid event-flow diagram
    assert.match(content, /mermaid/i, 'template must include a Mermaid event-flow example');
    // ID conventions for cross-references
    for (const id of ['EV-01', 'CMD-01', 'ACT-01', 'AGG-01', 'POL-01', 'EXT-01', 'RM-01', 'HS-01']) {
      assert.match(content, new RegExp(id), `template must demonstrate ID convention: ${id}`);
    }
  });

  test('template enforces policy form "when EV-XX then CMD-YY"', () => {
    const content = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    // Policy form is the discriminator between policies and commands
    assert.match(content, /When\s+\*?\*?EV-/i, 'template must demonstrate "when EV-XX" policy form');
    assert.match(content, /CMD-\d+/i, 'template must reference CMD-XX in policy examples');
  });

  test('mini profile manifest includes mini-event-storm clustered with other mini-* commands', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST, 'utf8'));
    assert.ok(
      manifest.include.commands.includes('mini-event-storm'),
      '/gsd-mini-event-storm must be listed in bin/profiles/mini.json include.commands'
    );
    const idxDomain = manifest.include.commands.indexOf('mini-domain');
    const idxAggregate = manifest.include.commands.indexOf('mini-aggregate');
    const idxStorage = manifest.include.commands.indexOf('mini-storage');
    const idxStorm = manifest.include.commands.indexOf('mini-event-storm');
    assert.ok(idxStorm >= 0);
    // All four mini-* DDD commands clustered within a small range
    const indices = [idxDomain, idxAggregate, idxStorage, idxStorm];
    const span = Math.max(...indices) - Math.min(...indices);
    assert.ok(
      span <= 5,
      `mini-* DDD commands should cluster: domain@${idxDomain} aggregate@${idxAggregate} storage@${idxStorage} event-storm@${idxStorm} (span ${span})`
    );
  });
});
