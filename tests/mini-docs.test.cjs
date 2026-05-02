/**
 * gsd-mini documentation completeness tests (gsd-mini phase 6).
 *
 * Asserts that the two user-facing docs added by phase mini-6 exist
 * and remain complete:
 *
 *   1. docs/DDD-METHODOLOGY.md — methodology document explaining
 *      strategic + tactical DDD, DDD↔DFA bridge, and the four mini-*
 *      DDD commands
 *   2. docs/GSD-MINI-USER-GUIDE.md — end-to-end user guide for the
 *      planning-only profile
 *
 * Companion: tests/no-upstream-references.test.cjs guards branding.
 *
 * Uses node:test and node:assert/strict (NOT Jest).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DDD_METH = path.join(ROOT, 'docs', 'DDD-METHODOLOGY.md');
const USER_GUIDE = path.join(ROOT, 'docs', 'GSD-MINI-USER-GUIDE.md');
const DESIGN_DOC = path.join(ROOT, 'docs', 'GSD-MINI-DESIGN.md');

describe('gsd-mini documentation (phase 6)', () => {
  test('both docs exist', () => {
    assert.ok(fs.existsSync(DDD_METH), 'docs/DDD-METHODOLOGY.md must exist');
    assert.ok(fs.existsSync(USER_GUIDE), 'docs/GSD-MINI-USER-GUIDE.md must exist');
    assert.ok(fs.existsSync(DESIGN_DOC), 'docs/GSD-MINI-DESIGN.md must exist (companion)');
  });

  describe('DDD-METHODOLOGY.md', () => {
    test('covers all four mini-* DDD commands', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8');
      const commands = ['mini-domain', 'mini-aggregate', 'mini-event-storm', 'mini-storage'];
      for (const cmd of commands) {
        assert.match(content, new RegExp(`/gsd-${cmd}`), `must reference /gsd-${cmd}`);
      }
    });

    test('explains the strategic vs tactical layers', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8');
      assert.match(content, /[Ss]trategic/, 'must address strategic DDD');
      assert.match(content, /[Tt]actical/, 'must address tactical DDD');
      assert.match(content, /Ubiquitous Language/i, 'must define ubiquitous language');
      assert.match(content, /Bounded Context/i, 'must define bounded context');
      assert.match(content, /Aggregate/, 'must define aggregate');
    });

    test('lists the six DDD integration patterns', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8').toLowerCase();
      const patterns = [
        'anti-corruption layer',
        'shared kernel',
        'customer-supplier',
        'open-host service',
        'conformist',
        'partnership',
      ];
      for (const p of patterns) {
        assert.ok(content.includes(p), `must list integration pattern: ${p}`);
      }
    });

    test('lists all 11 storage families', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8').toLowerCase();
      const types = ['relational', 'document', 'key-value', 'wide-column', 'graph', 'vector',
                     'time-series', 'search', 'object-store', 'columnar-analytics', 'event-log'];
      for (const t of types) {
        assert.ok(content.includes(t), `must list storage family: ${t}`);
      }
    });

    test('documents the DDD ↔ DFA bridge table', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8');
      assert.match(content, /DDD\s*[↔↦→]\s*DFA[\s\S]{0,1000}Bounded Context.*Scope of one DFA/i,
        'must contain a DDD↔DFA bridge table starting with bounded-context-to-DFA-scope mapping');
      assert.match(content, /Aggregate Lifecycle.*States/i, 'bridge must map lifecycle to states');
      assert.match(content, /Invariants.*[Ff]orbidden/, 'bridge must map invariants to forbidden transitions');
      assert.match(content, /Domain Events.*[Ee]vents/, 'bridge must map domain events to DFA events');
    });

    test('documents the eight sticky-note categories from event storming', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8').toLowerCase();
      const categories = ['domain event', 'command', 'actor', 'aggregate', 'polic', 'external', 'read model', 'hot spot'];
      for (const c of categories) {
        assert.ok(content.includes(c), `methodology must mention sticky-note category: ${c}`);
      }
    });

    test('documents identifier conventions (INV-XX, EV-XX, CMD-XX, etc.)', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8');
      const ids = ['INV-XX', 'EV-XX', 'CMD-XX', 'POL-XX', 'HS-XX', 'F-INV-XX'];
      for (const id of ids) {
        assert.match(content, new RegExp(id), `must document identifier convention: ${id}`);
      }
    });

    test('cross-links to DFA-METHODOLOGY and GSD-MINI-DESIGN', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8');
      assert.match(content, /DFA-METHODOLOGY\.md/, 'must cross-link DFA-METHODOLOGY.md');
      assert.match(content, /GSD-MINI-DESIGN\.md/, 'must cross-link GSD-MINI-DESIGN.md');
      assert.match(content, /GSD-MINI-USER-GUIDE\.md/, 'must cross-link GSD-MINI-USER-GUIDE.md');
    });

    test('includes a worked example that runs the full chain', () => {
      const content = fs.readFileSync(DDD_METH, 'utf8');
      assert.match(content, /Worked Example/i, 'must include a "Worked Example" section');
      // The worked example should hit each of the four mini-* commands and a DFA refinement step
      const example_window = content.split(/Worked Example/i)[1] || '';
      for (const cmd of ['mini-domain', 'mini-aggregate', 'mini-event-storm', 'mini-storage']) {
        assert.ok(example_window.toLowerCase().includes(cmd),
          `worked example must demonstrate /gsd-${cmd}`);
      }
      assert.match(example_window, /\/gsd-dfa-/, 'worked example must demonstrate DFA refinement');
    });
  });

  describe('GSD-MINI-USER-GUIDE.md', () => {
    test('has a quick-start sequence', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /[Qq]uick start/, 'must have Quick start section');
      assert.match(content, /\/gsd-new-project/, 'quick-start must include /gsd-new-project');
      // All four DDD commands appear in the quick-start chain
      for (const cmd of ['mini-domain', 'mini-aggregate', 'mini-event-storm', 'mini-storage']) {
        assert.match(content, new RegExp(`/gsd-${cmd}`), `quick-start must include /gsd-${cmd}`);
      }
      assert.match(content, /\/gsd-dfa-model/, 'quick-start must chain into /gsd-dfa-model');
      assert.match(content, /\/gsd-verify-work/, 'quick-start must finish at /gsd-verify-work');
    });

    test('documents the install flag', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /--profile mini/, 'must document --profile mini install flag');
      assert.match(content, /bin\/install\.js|npx gsd-dfa/, 'must show installer invocation');
    });

    test('documents Verifier Step 5c with all 5 sub-checks', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /Step 5c/i, 'must reference Step 5c');
      // The five sub-check status vocabularies
      const statuses = ['ORPHAN', 'STUB', 'NO-INVARIANTS', 'NO-PRODUCER', 'WARN'];
      for (const s of statuses) {
        assert.match(content, new RegExp(s), `must mention Step 5c status: ${s}`);
      }
    });

    test('explains when to use mini vs full profile', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /[Ww]hen to use mini vs full|mini vs full/, 'must have a "when to use" decision section');
      assert.match(content, /implement|implementation/i, 'decision section must address implementation question');
    });

    test('documents the handoff package', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /[Hh]andoff/, 'must document handoff to implementers');
      assert.match(content, /Markdown-first|YAML frontmatter/i, 'must explain why output is portable');
    });

    test('has a troubleshooting section', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /[Tt]roubleshooting/, 'must have Troubleshooting section');
    });

    test('cross-links to DDD-METHODOLOGY and GSD-MINI-DESIGN', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /DDD-METHODOLOGY\.md/, 'must cross-link DDD-METHODOLOGY.md');
      assert.match(content, /GSD-MINI-DESIGN\.md/, 'must cross-link GSD-MINI-DESIGN.md');
    });

    test('command reference table covers all four DDD commands with flags', () => {
      const content = fs.readFileSync(USER_GUIDE, 'utf8');
      assert.match(content, /[Cc]ommand reference/, 'must have Command reference section');
      // Flags documented for each command
      assert.match(content, /--no-dfa-skeleton/, 'aggregate flags must include --no-dfa-skeleton');
      assert.match(content, /--storage/, 'storage flags must include --storage');
      assert.match(content, /--with-ops/, 'storage flags must include --with-ops');
      assert.match(content, /--from-requirements/, 'domain flags must include --from-requirements');
    });
  });

  test('design doc at GSD-MINI-DESIGN.md cross-links the new docs', () => {
    // After mini-6 the design doc should be reachable from the new docs and vice versa.
    // We don't add a new test for the design doc itself (it predates mini-6), but we
    // confirm the new docs reference it (covered in cross-link tests above).
    const ddd = fs.readFileSync(DDD_METH, 'utf8');
    const guide = fs.readFileSync(USER_GUIDE, 'utf8');
    assert.match(ddd, /GSD-MINI-DESIGN\.md/);
    assert.match(guide, /GSD-MINI-DESIGN\.md/);
  });
});
