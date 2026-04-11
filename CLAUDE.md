# gsd-dfa — Project Instructions for Claude

> This file gives Claude Code (and other AI coding agents reading this repo) the project-specific context it needs. **Read this before suggesting changes or making architectural decisions.**

## What this project is

**gsd-dfa** is a spec-driven development system for AI coding agents (Claude Code, Codex, Gemini CLI, OpenCode, Cursor, Windsurf, Cline, and others), with **explicit Deterministic Finite Automaton (DFA) state modeling** as its core differentiator.

It is published to npm as `gsd-dfa` and installs commands, agents, hooks, and templates into a target runtime's config directory.

## Project status: Independent (since v2.0.0)

This project **originated as a fork** of [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) but is now an independent project on its own release line.

**This matters when you're suggesting changes:**

- **Do not** propose `git pull upstream` or `git merge upstream/main` as a way to "stay current." We are deliberately diverged.
- **Do not** treat upstream's documentation, version numbers, or release notes as authoritative for gsd-dfa.
- **Do not** suggest renaming things to match upstream conventions (e.g., bringing back `get-shit-done-cc` references). The package is `gsd-dfa`.
- **Do** treat upstream as a passive reference for safety-critical fixes only — see `docs/UPSTREAM-SYNC.md` for the cherry-pick policy.
- **Do** prefer DFA-centric solutions when planning stateful subsystems. The point of this project is that "implement reconnect logic" is too vague — we want transition tables.

## DFA is the core differentiator — don't dilute it

The `/gsd-dfa-*` command family and the DFA-aware planning section in `agents/gsd-planner.md` are the reason this project exists. When you touch code that interacts with planning, research, or verification:

- The planner must continue to consume DFA artifacts (`{phase_num}-DFA-*.md`) when present and decompose by transition rather than by feature.
- The verifier's Step 5b (DFA Transition Coverage) must continue to flag uncovered transitions as gaps.
- The phase-researcher must continue to identify DFA candidates as part of its research output.
- New commands and agents must not silently bypass the DFA flow when DFA artifacts exist.

If you propose removing or weakening any DFA integration, justify it explicitly and ask the user before making the change.

## File organization

| Path | What lives here |
|---|---|
| `agents/` | Subagent prompt files (`gsd-planner`, `gsd-verifier`, `gsd-executor`, `gsd-phase-researcher`, etc.) |
| `commands/gsd/` | Slash command definitions, including the `dfa-*` command family |
| `get-shit-done/templates/` | Markdown templates filled in during workflow execution (state tables, scenario matrices, behavior trees, etc.) |
| `get-shit-done/references/` | Reference content extracted from agents to keep agent files small (e.g., `dfa-aware-planning.md`, `planner-gap-closure.md`) |
| `get-shit-done/workflows/` | Step-by-step workflow scripts for slash commands |
| `get-shit-done/bin/lib/` | CommonJS implementation modules (state, phase, milestone, verify, etc.) — covered by `c8` coverage gate |
| `bin/install.js` | Multi-runtime installer (Claude Code, Codex, Gemini, etc.) |
| `hooks/` | JS / shell hooks: `gsd-context-monitor`, `gsd-workflow-guard`, `gsd-validate-commit`, `gsd-statusline`, etc. |
| `tests/` | `node:test` regression suite. New features should add tests here. |
| `docs/DFA-METHODOLOGY.md` | The methodology document explaining when and how to use DFA |
| `docs/UPSTREAM-SYNC.md` | Divergence point and cherry-pick history |

## Conventions

### Commit messages

Use Conventional Commits with these scopes specifically reserved:

- `feat(dfa): ...` — new DFA feature (command, template, agent integration)
- `fix(dfa): ...` — bug fix in DFA toolchain
- `chore(upstream): cherry-pick <sha> ...` — every commit borrowed from upstream gets this scope so we can grep for them
- `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci` — standard scopes for non-DFA work

### Slash command naming

All slash commands use **hyphen format**: `/gsd-dfa-model`, `/gsd-plan-phase`, `/gsd-verify-work`. The `tests/stale-colon-refs.test.cjs` regression test enforces this — do not introduce the legacy colon-form command syntax in `.md`, `.js`, `.cjs`, `.ts`, `.yml`, `.sh`, or `.svg` files (except in conversion-test fixtures, which are explicitly whitelisted).

### Agent prompt size

`agents/gsd-planner.md` has a 47K char ceiling enforced by `tests/planner-decomposition.test.cjs`. If you add content that pushes it over, extract a section to `get-shit-done/references/` and leave a pointer behind. This is not just a style rule — it forces modular decomposition.

### Tests

- All tests use `node:test` + `node:assert/strict`. Do not introduce Vitest, Jest, or Mocha.
- Run the suite with `npm test`.
- Coverage gate is 70% on `get-shit-done/bin/lib/*.cjs` only (other files are markdown/prompts).
- New features should add a regression test alongside the implementation.

## Working with the user

The user's primary language is Mandarin Chinese (Traditional). Respond in Traditional Chinese unless they explicitly switch.

The user values:
- Concrete, decision-oriented responses (not "it depends" essays)
- Showing scope/impact before doing destructive things — confirmation required for `git push`, `npm publish`, `rm -rf`, force-push, branch deletion
- Atomic commits over giant catch-all commits
- Honest reporting of test failures (don't paper over them)

## Things that are decided and not up for re-litigation

- gsd-dfa is published as `gsd-dfa` on npm. Bin command is `gsd-dfa`.
- Author field is `guanyuhoujeff`. Repo is `github.com/guanyuhoujeff/gsd-dfa`.
- We are at v2.0.0 as of the divorce. Do not bump back to 1.x for any reason.
- The MIT attribution to upstream (Lex Christopherson / TÂCHES) **must remain** in `README.md` and `LICENSE`. This is a license obligation, not a style choice.
- Node engine minimum is `>=22.0.0`.
