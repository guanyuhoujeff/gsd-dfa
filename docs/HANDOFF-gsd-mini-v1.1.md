# Handoff: gsd-mini v1 → v1.1

**Date written:** 2026-05-02
**Status of v1:** ✅ shipped to `origin/main` — 21 commits, 3105/3105 tests pass
**Next session goal:** Address the remaining review findings (mediums, test gaps, v1.1 recommendations)

---

## What's done (do not redo)

### Core implementation (18 commits, `30fa660..4185144`)

| Phase | Commit | Status |
|---|---|---|
| Design proposal | `30fa660`, `a38a342` | ✅ shipped |
| mini-1: `--profile` mechanism | `9d6fc36` | ✅ shipped |
| mini-2: `/gsd-mini-domain` | `3eb82a6` | ✅ shipped |
| mini-3: `/gsd-mini-aggregate` + DFA skeleton | `590cbfb` | ✅ shipped |
| mini-3.5: `/gsd-mini-storage` (11 families) | `5111611` | ✅ shipped |
| mini-4: `/gsd-mini-event-storm` (8 sticky-notes) | `ba588a4` | ✅ shipped |
| mini-5: Verifier Step 5c | `78ad2ae` | ✅ shipped |
| mini-6: DDD methodology + user guide | `370e211` | ✅ shipped |
| mini-7: Profile-boundary regression test | `46611e8` | ✅ shipped |
| (changelog backfills interleaved) | `ab375eb`, `70262bc`, `3c726ca`, `c0474ab`, `e88216c`, `5c4edfb`, `8c023be`, `4185144` | ✅ shipped |

### Review fixes (3 commits, `551ad3f..e3eab7a`)

| Finding | Commit | What changed |
|---|---|---|
| H1: manifest drift | `551ad3f` | Design §3.1 amendment: `manager` + `join-discord` recorded in Session and state group |
| H2: filename slug inconsistency | `2211ce7` | 3 workflows use `${SLUG}` everywhere; mini-storage looks up `AGGREGATE-${SLUG}.md` (case-mismatch resolves) |
| H3: verifier 5c.4 grep broken | `e3eab7a` | Replaced with section-aware awk parser; output format unchanged |

### Authoritative artifacts

- **Design source of truth:** [`docs/GSD-MINI-DESIGN.md`](./GSD-MINI-DESIGN.md) (§3.1 IN list, §5.x command specs, §6 DDD↔DFA bridge, §8 open questions)
- **Methodology:** [`docs/DDD-METHODOLOGY.md`](./DDD-METHODOLOGY.md)
- **User guide:** [`docs/GSD-MINI-USER-GUIDE.md`](./GSD-MINI-USER-GUIDE.md)
- **Manifest:** [`bin/profiles/mini.json`](../bin/profiles/mini.json) — 61 commands + 20 agents

### Subagent review report (in earlier conversation, not committed as file)

The review found H1+H2+H3 (now fixed) plus the M1–M6 nuance items, test gaps, and v1.1 recommendations listed below. The full report lives in the handoff conversation log — re-running the review subagent on the current `main` should reproduce the medium findings.

---

## Outstanding work for v1.1

### 🟡 Medium-priority items (review M1–M6)

| ID | Where | Action |
|---|---|---|
| **M1** | `docs/GSD-MINI-DESIGN.md` §8.5 | Record explicit decision: stayed with `mini` (vs `spec` / `planning`). Reason: shipped name. |
| **M2** | `docs/GSD-MINI-DESIGN.md` §5.2:205 | Update `F-XX` → `F-INV-XX` to match implementation/methodology/verifier (which all use the more specific form) |
| **M3** | `commands/gsd/mini-aggregate.md:62` vs `get-shit-done/workflows/mini-aggregate.md:199` | Success criteria says exact 1:1 invariant↔F-INV; verify step says ≥. Pick one. Recommend exact 1:1 (matches the bridge story). |
| **M4** | All 4 `get-shit-done/workflows/mini-*.md` | Argument parsing duplicated verbatim. Extract to `get-shit-done/references/mini-arg-parsing.md` and `@~`-include from each workflow. |
| **M5** | `get-shit-done/workflows/mini-storage.md:197` | YAML frontmatter line uses `[scope_type]: <Name>` metavariable. AI may emit literal `[scope_type]:`. Replace with concrete `aggregate: <Name>` or `context: <Name>` template (one or the other). |
| **M6** | `get-shit-done/workflows/mini-event-storm.md` | Already fixed by H2 (`CONTEXT_SLUG` is now used) — verify post-fix. |

### ⚠️ Test gaps to fill

1. **`--no-dfa-skeleton` actual behavior** — only mentions are tested. Add fixture-based test asserting workflow has gating logic for `NO_DFA_SKELETON` true.
2. **`cleanupStagedDirs` cleanup** — `bin/install.js:5409`. Add test that triggers cleanup and verifies temp dirs `gsd-mini-*` are gone.
3. **`loadProfile` error paths** — unknown profile, malformed JSON, missing `include.commands`. 3 cases.
4. **`--storage <type>` skips Phase 1** — no test verifies the gate works.
5. **mini-aggregate non-overwrite of existing `DFA-{slug}.md`** — documented promise; no behavioral test.
6. **Hostile context names** — `--context "Sales Operations"` end-to-end across all 3 commands that take `--context`.

### 🆕 v1.1 features

| Feature | Why |
|---|---|
| `bin/profiles/schema.json` | `mini.json:2` references it but file does not exist — dangling `$schema` |
| `/gsd-mini-export` | Per design §8.6 — handoff is the entire point; tarball + index export is high-leverage |
| `tests/mini-cross-doc-consistency.test.cjs` | Assert 11-storage / 8-sticky / 6-integration-pattern lists match across design + methodology + user guide + manifest + templates |
| Resolve open questions §8.1, §8.3, §8.6 | Add "Decision recorded:" lines to design doc |

---

## Suggested order of attack (next session)

The medium findings split cleanly into doc-only fixes vs structural fixes. Suggest doing them in dependency order:

1. **M1 + M2 + open-question resolutions** (15 min, single doc commit) — pure design-doc edits, low risk
2. **M3** (5 min, single workflow + command commit) — pick a position on invariant↔F-INV cardinality
3. **M5** (5 min) — replace `[scope_type]` metavariable with one of two concrete templates
4. **M4** (30 min) — extract shared arg parsing reference; touches 4 workflows + new reference file + regression test
5. **Test gaps 1–6** (60–90 min total) — each is small but adds up
6. **`bin/profiles/schema.json`** (15 min) — either create real schema or remove dangling reference; regression test for file existence
7. **`tests/mini-cross-doc-consistency.test.cjs`** (30 min) — single new file; high leverage for future drift prevention
8. **`/gsd-mini-export`** (90+ min, separate phase) — full new command following the mini-* pattern; defer if pressed

Total budget if everything done: ~4–5 hours of focused work.

---

## Quick context for next session

```bash
cd /home/barai/external_disk/barai/gsd-fork
git log --oneline @{u}..HEAD     # should be clean (we're synced)
git log --oneline -25            # see all 21 gsd-mini commits + their interleaved changelogs
npm test 2>&1 | tail -10         # baseline: 3105/3105 pass
```

**Read first** in the next session:

1. This file (you're reading it)
2. `docs/GSD-MINI-DESIGN.md` §8 (open questions) and §3.1 (IN list with H1 amendment)
3. The 3 review-fix commits to understand the slug + parser changes:
   ```bash
   git show 2211ce7 -- get-shit-done/workflows/   # H2 slug fix
   git show e3eab7a -- agents/gsd-verifier.md     # H3 awk parser
   ```

**Skip re-reading** unless something needs to change:
- The four `commands/gsd/mini-*.md` slash command files — stable
- The five `get-shit-done/templates/ddd-*.md` templates — stable
- All seven new test files under `tests/mini-*` and `tests/profile-mini-*` — stable, will catch any v1.1 regression

---

## What NOT to do

- Don't touch the four mini-* commands' frontmatter — it's stable and the regression tests pin it
- Don't change the 11 storage families or 8 sticky-note categories — they're cross-doc-locked and changing one means changing 5 places
- Don't merge the four mini-* workflows into one giant workflow — they're intentionally separate per command (M4 just extracts the *parsing* helper, not the whole workflow)
- Don't rebrand `mini` to `spec` or `planning` — that decision is closed (M1 will record it)
- Don't publish to npm yet — v1.1 medium fixes should land first; publish-readiness audit is a separate milestone

---

## Where to find session context

- **Design rationale and history:** `docs/GSD-MINI-DESIGN.md` (frozen as of 2026-05-02 with H1 amendment)
- **Per-command authoring decisions:** commit messages of the seven `feat(mini)` commits — verbose by design
- **Review report:** earlier conversation log; re-run the subagent if needed:
  ```
  Agent({ subagent_type: "superpowers:code-reviewer",
          prompt: "Review docs/GSD-MINI-DESIGN.md against current implementation. Focus on M1–M6 from prior review (record found in HANDOFF-gsd-mini-v1.1.md)." })
  ```
