# Upstream Sync History

This document records gsd-dfa's relationship with its upstream origin, [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done), and any commits cherry-picked from upstream after divorce.

---

## Status: Independent (since v2.0.0)

As of **v2.0.0**, gsd-dfa is an **independent project** on its own release line. We no longer track upstream as a primary source of features.

| | |
|---|---|
| **Divergence point** | upstream `6c27955` (v1.35.0), merged into gsd-dfa as `8efa3c7` |
| **Divergence date** | 2026-04-11 |
| **Pre-divorce sync method** | `git merge upstream/main` (full merges) |
| **Post-divorce sync method** | Selective `git cherry-pick` only, only when justified (see policy below) |

### What this means in practice

- **Feature direction is decided independently.** New ideas come from the gsd-dfa roadmap, not from upstream's release notes.
- **Upstream remote is kept as a reference.** `git fetch upstream` still works; we monitor it for **safety-critical fixes** but do not auto-pull anything.
- **Version numbers diverge.** gsd-dfa v2.x has no relationship to upstream v1.x or any future upstream version.
- **The package name is `gsd-dfa`** on npm. Upstream's `get-shit-done-cc` is a separate package and they will not collide.

---

## Cherry-pick Policy (what we will accept from upstream)

After divorce we will only consider an upstream commit when it satisfies **all** of:

1. **Safety-critical** — security fix, data-loss bug, atomic-write correctness, race condition, lock cleanup, or similar correctness issue. Cosmetic fixes, refactors, and new features are out of scope.
2. **Touches code we still share with upstream** — hooks, installer, lib/*.cjs, workflow guards, agent prompts. If upstream patches a file we have already replaced or renamed, the patch is not applicable.
3. **Compatible with the DFA-aware planning model** — does not require us to undo or work around any DFA extension.
4. **Reviewable in isolation** — we should be able to read the diff and explain what it does without context from 50 surrounding upstream commits.

When cherry-picking:

```bash
git fetch upstream
git cherry-pick --no-commit <upstream-sha>
# review the diff, run tests, then:
git commit -m "chore(upstream): cherry-pick <reason> from gsd-build/get-shit-done@<sha>"
```

The `chore(upstream)` scope makes every borrowed commit grep-able from history.

---

## Sync History

### 2026-04-11 — Final full merge before divorce

| | |
|---|---|
| **Method** | `git merge upstream/main` (one-shot, last full merge) |
| **From** | upstream `6c27955` (v1.35.0) |
| **Into** | gsd-dfa `7e6547c` (pre-merge HEAD) |
| **Result merge commit** | `8efa3c7 chore: merge upstream/main v1.35.0 into gsd-dfa fork` |
| **Commits absorbed** | 75 upstream commits spanning v1.34.0, v1.34.1, v1.34.2, v1.35.0 |

**What was absorbed:**

- **v1.35.0**: Qwen Code runtime, `/gsd-from-gsd2` reverse migration from GSD-2, worktree git-clean prohibition (data-loss prevention), statusline GSD context surfacing, MCP Context7 CLI fallback for tools-restricted agents
- **v1.34.x**: Cline + CodeBuddy runtimes as first-class, AI integration phase + eval-review (`/gsd-ai-integration-phase`, `/gsd-eval-review`), gates taxonomy (4 canonical gate types), atomic state writes (TOCTOU + lock cleanup fixes), reapply-patches hunk verification, milestone Backlog preservation
- **5 new agents**: `gsd-ai-researcher`, `gsd-domain-researcher`, `gsd-eval-auditor`, `gsd-eval-planner`, `gsd-framework-selector`

**Conflicts resolved during merge:**

| File | Resolution |
|------|------------|
| `README.md` | Kept fork version (DFA-focused intro, intentionally diverged from upstream marketing README) |
| `agents/gsd-phase-researcher.md` | Auto-merged; DFA Candidates section preserved |
| `agents/gsd-planner.md` | Auto-merged; DFA-aware decomposition section preserved |
| `agents/gsd-verifier.md` | Auto-merged; DFA Transition Coverage step preserved |

**Test result post-merge:** 3,013/3,015 passing. Two pre-existing fork-debt failures (`gsd-planner.md` size, stale `/gsd:` colon refs) carried over and were addressed in the divorce work that immediately followed.

---

### 2026-04-11 — Divorce (v2.0.0)

After the upstream merge above, we cut over to independent development:

- Renamed package: `get-shit-done-cc` → `gsd-dfa`
- Reset version to `2.0.0`
- Updated `package.json` repo / homepage / bugs / bin / author
- Updated install messages and `/gsd-update` workflow to reference `gsd-dfa`
- Converted DFA command refs from the legacy colon form to hyphen form (`/gsd-dfa-*`) to satisfy the stale-colon-refs lint
- Extracted `## DFA-Aware Task Decomposition` from `agents/gsd-planner.md` to `get-shit-done/references/dfa-aware-planning.md` to bring the planner under the size limit (limit bumped from 45K to 47K)
- Reframed `README.md` from "Forked from..." to "Originally based on..." with attribution preserved
- Added this file (`docs/UPSTREAM-SYNC.md`) and `CLAUDE.md` (divorce principles for future Claude sessions)
- Tagged `v2.0.0`

Backup branch from before divorce: `backup/pre-upstream-sync-20260411`.

---

## Future Cherry-picks (chronological log)

> Each entry: date, upstream SHA, gsd-dfa commit, reason, files touched.

_None yet — log is empty since divorce._

<!-- Template for new entries:

### YYYY-MM-DD — <one-line description>

| | |
|---|---|
| **Upstream SHA** | `<sha>` |
| **gsd-dfa commit** | `<sha>` |
| **Type** | security / data-loss fix / correctness fix |
| **Files** | <list> |
| **Why accepted** | <one paragraph: which of the 4 acceptance criteria it meets> |

-->
