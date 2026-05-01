/**
 * /gsd-mini-storage command structural tests (gsd-mini phase 3.5).
 *
 * Asserts the artifacts that constitute /gsd-mini-storage:
 *   1. commands/gsd/mini-storage.md — slash command
 *   2. get-shit-done/workflows/mini-storage.md — workflow logic
 *   3. get-shit-done/templates/ddd-storage.md — storage artifact template
 *
 * Plus the manifest entry, the 11-storage-type contract, and the
 * two-phase decision-then-spec workflow contract per
 * docs/GSD-MINI-DESIGN.md §5.4.
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

const COMMAND_FILE = path.join(ROOT, 'commands', 'gsd', 'mini-storage.md');
const WORKFLOW_FILE = path.join(ROOT, 'get-shit-done', 'workflows', 'mini-storage.md');
const STORAGE_TEMPLATE = path.join(ROOT, 'get-shit-done', 'templates', 'ddd-storage.md');
const MINI_MANIFEST = path.join(ROOT, 'bin', 'profiles', 'mini.json');

// The 11 supported storage types per docs/GSD-MINI-DESIGN.md §5.4
const STORAGE_TYPES = [
  'relational',
  'document',
  'key-value',
  'wide-column',
  'graph',
  'vector',
  'time-series',
  'search',
  'object-store',
  'columnar-analytics',
  'event-log',
];

describe('/gsd-mini-storage command (gsd-mini phase 3.5)', () => {
  test('all artifact files exist', () => {
    const missing = [];
    for (const [label, p] of [
      ['command', COMMAND_FILE],
      ['workflow', WORKFLOW_FILE],
      ['storage template', STORAGE_TEMPLATE],
    ]) {
      if (!fs.existsSync(p)) missing.push(`${label}: ${path.relative(ROOT, p)}`);
    }
    if (missing.length) assert.fail(`Missing files:\n${missing.map(m => '  - ' + m).join('\n')}`);
  });

  test('command frontmatter has correct name and links to workflow + template', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8');
    assert.match(content, /^---\nname: gsd:mini-storage$/m, 'frontmatter "name: gsd:mini-storage" required');
    assert.match(content, /argument-hint:/, 'argument-hint required');
    assert.match(content, /--storage/, 'must document --storage flag for skipping decision phase');
    assert.match(content, /--with-ops/, 'must document --with-ops flag');
    assert.match(content, /workflows\/mini-storage\.md/, 'must reference workflow');
    assert.match(content, /templates\/ddd-storage\.md/, 'must reference template');
  });

  test('command supports both per-aggregate and per-context scope', () => {
    const content = fs.readFileSync(COMMAND_FILE, 'utf8');
    assert.match(content, /aggregate-name/i, 'must document aggregate-name positional');
    assert.match(content, /--context/, 'must document --context flag');
    assert.match(content, /polyglot/i, 'must explicitly support polyglot persistence (mentions "polyglot")');
  });

  test('workflow defines the two-phase decision-then-spec contract', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    const requiredSteps = [
      'validate_inputs',
      'parse_flags',
      'load_context',
      'decision_phase',
      'specification_phase',
      'capture_projections',
      'capture_compliance',
      'capture_operations',
      'write_artifact',
      'verify',
    ];
    for (const s of requiredSteps) {
      assert.match(content, new RegExp(`step name="${s}"`), `workflow missing step: ${s}`);
    }
    // Decision phase only runs when --storage NOT preset
    assert.match(content, /decision_phase.*condition.*PRESET_STORAGE/s, 'decision phase must be skippable via --storage');
    // Operations only runs when --with-ops
    assert.match(content, /capture_operations.*condition.*WITH_OPS/s, 'operations capture must be gated by --with-ops');
  });

  test('workflow surveys the seven decision dimensions', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    // The seven decision-phase prompts from the design doc
    const dimensions = [
      /[Rr]ead[ \/-]?write ratio/,
      /[Qq]uery pattern/,
      /[Cc]onsistency/,
      /[Ss]cale/,
      /[Ll]atency/,
      /[Ii]nfrastructure|infra/,
      /[Tt]eam/,
    ];
    for (const re of dimensions) {
      assert.match(content, re, `workflow missing decision dimension matching ${re}`);
    }
  });

  test('workflow lists all 11 storage types in the decision matrix', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8').toLowerCase();
    const missing = STORAGE_TYPES.filter(t => !content.includes(t));
    if (missing.length) {
      assert.fail(`workflow missing storage types: ${missing.join(', ')}`);
    }
  });

  test('workflow has TEXT_MODE fallback', () => {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    assert.match(content, /TEXT_MODE/, 'workflow must define TEXT_MODE for non-Claude runtimes');
    assert.match(content, /plain-text/, 'must reference plain-text fallback for AskUserQuestion');
  });

  test('storage template lists all 11 storage types with native schema cues', () => {
    const content = fs.readFileSync(STORAGE_TEMPLATE, 'utf8').toLowerCase();
    const missing = STORAGE_TYPES.filter(t => !content.includes(t));
    if (missing.length) {
      assert.fail(`template missing storage types: ${missing.join(', ')}`);
    }
  });

  test('storage template has all required sections', () => {
    const content = fs.readFileSync(STORAGE_TEMPLATE, 'utf8');
    const sections = [
      /Decision rationale/i,
      /Schema/,
      /Indexes.*Access patterns|Access patterns.*Indexes/i,
      /Query patterns/i,
      /Projections/i,
      /Compliance/i,
      /Operations/i,
    ];
    for (const re of sections) {
      assert.match(content, re, `template missing section matching ${re}`);
    }
    // Frontmatter fields
    assert.match(content, /storage_type:/, 'frontmatter must have storage_type');
    assert.match(content, /storage_engine:/, 'frontmatter must have storage_engine');
    assert.match(content, /consistency:/, 'frontmatter must have consistency');
    assert.match(content, /scope:.*per-aggregate.*per-context/i, 'frontmatter scope must support both per-aggregate and per-context');
    // Compliance must address the four compliance dimensions
    assert.match(content, /PII/i, 'compliance must address PII');
    assert.match(content, /[Rr]etention/, 'compliance must address retention');
    assert.match(content, /[Ee]ncryption/, 'compliance must address encryption');
    assert.match(content, /[Rr]egion/, 'compliance must address region constraints');
    // Operations must be marked as conditional
    assert.match(content, /--with-ops/, 'template must mark Operations as opt-in via --with-ops');
  });

  test('mini profile manifest includes mini-storage adjacent to other mini-* commands', () => {
    const manifest = JSON.parse(fs.readFileSync(MINI_MANIFEST, 'utf8'));
    assert.ok(
      manifest.include.commands.includes('mini-storage'),
      '/gsd-mini-storage must be listed in bin/profiles/mini.json include.commands'
    );
    const idxDomain = manifest.include.commands.indexOf('mini-domain');
    const idxAggregate = manifest.include.commands.indexOf('mini-aggregate');
    const idxStorage = manifest.include.commands.indexOf('mini-storage');
    assert.ok(idxStorage >= 0);
    assert.ok(
      Math.abs(idxStorage - idxAggregate) <= 3 && Math.abs(idxStorage - idxDomain) <= 5,
      `mini-* commands should cluster: domain@${idxDomain} aggregate@${idxAggregate} storage@${idxStorage}`
    );
  });
});
