/**
 * Verifier Step 5c structural tests (gsd-mini phase 5).
 *
 * Asserts that agents/gsd-verifier.md contains a Step 5c section that
 * implements the spec-completeness coverage checks per
 * docs/GSD-MINI-DESIGN.md §4.3:
 *
 *   - Activation: triggered by presence of .planning/ddd/*.md artifacts
 *   - Five sub-checks: requirements coverage, phase artifact
 *     completeness, aggregate invariants, event-storm producer/consumer
 *     coverage, PLAN.md execution-leak lint
 *   - Step ordering: 5c sits between 5b (DFA Transition Coverage) and
 *     Step 6 (Check Requirements Coverage)
 *   - Output added to VERIFICATION.md
 *
 * Companion: tests/dfa-help-coverage.test.cjs covers help discoverability;
 * this file covers verifier authoring correctness.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERIFIER_FILE = path.join(ROOT, 'agents', 'gsd-verifier.md');

describe('Verifier Step 5c — Spec Completeness Coverage (gsd-mini phase 5)', () => {
  test('verifier file exists', () => {
    assert.ok(fs.existsSync(VERIFIER_FILE), 'agents/gsd-verifier.md must exist');
  });

  test('Step 5c heading is present', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    assert.match(
      content,
      /^## Step 5c: Spec Completeness Coverage/m,
      'must contain "## Step 5c: Spec Completeness Coverage" heading'
    );
  });

  test('Step 5c sits between Step 5b and Step 6', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    const idx5b = content.indexOf('## Step 5b:');
    const idx5c = content.indexOf('## Step 5c:');
    const idx6 = content.indexOf('## Step 6:');
    assert.ok(idx5b > 0, 'Step 5b must exist (predecessor)');
    assert.ok(idx5c > 0, 'Step 5c must exist');
    assert.ok(idx6 > 0, 'Step 6 must exist (successor)');
    assert.ok(idx5b < idx5c, 'Step 5c must come after Step 5b');
    assert.ok(idx5c < idx6, 'Step 5c must come before Step 6');
  });

  test('Step 5c is gated by presence of .planning/ddd/ artifacts', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    // The activation rule: any .planning/ddd/*.md exists triggers the step
    assert.match(
      content,
      /\.planning\/ddd\/\*\.md/,
      'Step 5c activation must check for .planning/ddd/*.md presence'
    );
    assert.match(
      content,
      /Skip this step entirely/i,
      'Step 5c must explicitly state when to skip'
    );
  });

  test('Step 5c implements all five sub-checks per design doc §4.3', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    const subSteps = [
      /5c\.1.*[Rr]equirement/,
      /5c\.2.*[Pp]hase artifact/,
      /5c\.3.*[Aa]ggregate invariants/,
      /5c\.4.*[Ee]vent storm.*producer.*consumer|5c\.4.*[Ee]vent.*[Pp]roducer/,
      /5c\.5.*PLAN.*lint|5c\.5.*execution.leak/i,
    ];
    for (const re of subSteps) {
      assert.match(content, re, `Step 5c missing sub-check matching ${re}`);
    }
  });

  test('5c.1 requirements coverage references REQ-XX and design contracts', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    // Must look at REQ-XX IDs and search across phases + design contracts
    assert.match(content, /REQ-/, 'must reference REQ-XX ID convention');
    assert.match(content, /AGGREGATE-\*/, 'must search AGGREGATE-* design contracts');
    assert.match(content, /STORAGE-\*/, 'must search STORAGE-* design contracts');
    assert.match(content, /EVENT-STORM-\*/, 'must search EVENT-STORM-* design contracts');
    // Status vocabulary
    assert.match(content, /COVERED|ORPHAN/, 'must define COVERED/ORPHAN status vocabulary');
  });

  test('5c.2 phase artifact completeness checks CONTEXT/PLAN/DFA per phase', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    assert.match(content, /CONTEXT\.md/, 'must check for CONTEXT.md');
    assert.match(content, /PLAN\.md/, 'must check for PLAN.md');
    assert.match(content, /DFA-\*\.md|DFA-/, 'must check for DFA artifact');
    assert.match(content, /STUB|COMPLETE/, 'must define COMPLETE/STUB status vocabulary');
  });

  test('5c.3 aggregate invariants check is non-empty INV-XX', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    assert.match(content, /AGGREGATE-/, 'must scan AGGREGATE-* files');
    assert.match(content, /INV-/, 'must check for INV-XX entries');
    assert.match(content, /HAS-INVARIANTS|NO-INVARIANTS/, 'must define invariant-presence status');
  });

  test('5c.4 event storm checks both producer and consumer per EV-XX', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    assert.match(content, /EVENT-STORM-/, 'must scan EVENT-STORM-* files');
    assert.match(content, /EV-/, 'must check EV-XX events');
    assert.match(content, /producer/i, 'must verify each event has a producer');
    assert.match(content, /consumer/i, 'must verify each event has a consumer');
    assert.match(content, /NO-PRODUCER|NO-CONSUMER|ORPHAN/, 'must define producer/consumer gap status');
  });

  test('5c.5 lints PLAN.md for execution-leak verbs', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    // The forbidden verbs that signal spec leaking into execution
    const verbs = ['implement', 'deploy', 'ship', 'commit', 'spawn'];
    for (const v of verbs) {
      assert.ok(
        content.toLowerCase().includes(v),
        `5c.5 must include execution-leak verb: ${v}`
      );
    }
    // Must surface as warning, not blocker
    assert.match(content, /WARN/, 'execution-leak findings must be WARN, not blocker');
  });

  test('Step 5c emits a coverage report block for VERIFICATION.md', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    assert.match(content, /VERIFICATION\.md/, 'must reference output to VERIFICATION.md');
    assert.match(content, /Spec Completeness Coverage/, 'report block must use the canonical heading');
    assert.match(content, /Spec Score/, 'report must include a "Spec Score" summary line');
  });

  test('existing Step 5b structure preserved (no regression)', () => {
    const content = fs.readFileSync(VERIFIER_FILE, 'utf8');
    assert.match(content, /^## Step 5b: DFA Transition Coverage/m, 'Step 5b heading must remain unchanged');
    assert.match(content, /T-XX.*transitions.*S-XX.*self-loops.*F-XX/, 'Step 5b transition ID parsing must remain intact');
  });
});
