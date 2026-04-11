# gsd-dfa: Spec-Driven Development with DFA State Modeling

**Spec-driven development for AI coding agents, with explicit state machine modeling for stateful systems.**

> **Originally based on** [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) by Lex Christopherson (TÂCHES), MIT License. As of v2.0.0, gsd-dfa is an independent project on its own release line. See [`docs/UPSTREAM-SYNC.md`](docs/UPSTREAM-SYNC.md) for the divergence point and sync history.

---

## What gsd-dfa Adds

The original spec-driven workflow (research → discuss → plan → execute → verify) is **task-oriented**: "do X, then Y, then Z." That works for feature buildout but leaves gaps when planning **stateful systems** — systems where behavior depends on *what state the system is in* when an event arrives.

gsd-dfa extends the workflow with **explicit state machine modeling at the planning phase**, forcing completeness: every State × Event combination must be accounted for — either with a transition or an explicit "reject/ignore with reason."

### Core Concept

Natural-language plans say "when X happens, do Y" but don't force you to answer "what happens in *every other* state when X arrives?" Those unanswered combinations become production bugs.

DFA forces completeness. Every cell in the State × Event matrix must be filled.

### Workflow Changes Over Upstream Origin

| Area | Original (task-oriented) | gsd-dfa |
|------|--------------------------|---------|
| `research-phase` | Identifies tech stack and patterns | Also identifies **DFA candidates** (stateful subsystems) |
| `discuss-phase` | Free-form decisions | Can produce state tables during discussion |
| `plan-phase` | Task-oriented decomposition | **Transition-oriented** decomposition when DFA exists |
| `execute-phase` | Task as unit of work | Transition as unit of work (T-XX = one test) |
| `verify-work` | Goal-based verification | Also checks **DFA transition coverage** |

### New Commands

| Command | Purpose |
|---------|---------|
| `/gsd-dfa-scan` | Scan codebase to identify subsystems suitable for DFA modeling |
| `/gsd-dfa-model <subsystem>` | Build DFA state table for one subsystem |
| `/gsd-dfa-verify [subsystem]` | Verify DFA completeness (dead states, unreachable states, unhandled events) |
| `/gsd-dfa-scenarios` | Cross-subsystem scenario matrix from 2+ DFAs |
| `/gsd-dfa-audit` | Compare DFA spec against actual code implementation |
| `/gsd-dfa-tests` | Generate test skeletons from DFA transition tables |
| `/gsd-dfa-btree` | Generate hierarchical behavior tree from DFA state tables |

### New Templates

| Template | Purpose |
|----------|---------|
| `get-shit-done/templates/dfa-state-table.md` | Complete state machine spec: states, events, transitions, forbidden transitions, completeness matrix |
| `get-shit-done/templates/dfa-scenario-matrix.md` | Cross-subsystem interactions: critical scenarios (SC-XX), failure cascades (FC-XX), event ordering (EO-XX) |
| `get-shit-done/templates/dfa-behavior-tree.md` | Hierarchical behavior tree synthesized from multiple DFAs |

### Methodology

`docs/DFA-METHODOLOGY.md` covers:
- When to use DFA (stateful systems) vs when to skip (CRUD, stateless)
- Extended DFA for software systems (actions + guards)
- Hierarchical states (optional, for reducing duplication)
- Integration with the spec-driven workflow at each phase
- ID notation conventions (T-XX, S-XX, F-XX, SC-XX, FC-XX, EO-XX)

---

## When to Use DFA

**Use DFA when:**
- The phase involves a subsystem with 3+ distinct states
- Behavior depends on current state (not just input)
- The phase description uses words like: lifecycle, flow, reconnection, retry, session, state machine, circuit breaker, saga

**Skip DFA when:**
- Pure CRUD operations
- Stateless transformations (data pipeline, formatting)
- UI layout / styling work
- Configuration / dependency management

---

## Workflow

```
/gsd-research-phase N     -> Identifies DFA candidates in research output
/gsd-discuss-phase N      -> Defines states/events/guards during discussion
/gsd-dfa-model N subsys   -> Creates DFA state table (per subsystem)
/gsd-dfa-verify N         -> Validates completeness before planning
/gsd-dfa-scenarios N      -> Cross-subsystem scenario matrix (if 2+ DFAs)
/gsd-plan-phase N         -> Planner reads DFA, groups transitions into tasks
/gsd-execute-phase N      -> Executor implements transition-by-transition
/gsd-verify-work N        -> Verifier checks DFA transition coverage
```

---

## Artifacts Produced

```
.planning/phases/XX-name/
  {phase_num}-DFA-{subsystem}.md      <- State table (per subsystem)
  {phase_num}-DFA-SCENARIOS.md        <- Cross-subsystem scenarios
  {phase_num}-CONTEXT.md              <- Decisions
  {phase_num}-RESEARCH.md             <- Includes DFA Candidates section
  {phase_num}-NN-PLAN.md              <- Plans reference T-XX, SC-XX, FC-XX
  {phase_num}-VERIFICATION.md         <- Includes DFA coverage report
```

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hierarchical states | Optional | Not every DFA needs sub-states; start flat, promote when duplication hurts |
| Timer events | Not a separate category | Timers are events; source column marks `internal timer` |
| Guard format | Natural language (with guideline) | Planning phase is too early for strict schema; must be specific enough for executor |
| State diagram | Optional mermaid | Useful for review; GitHub renders natively |
| Failure Cascade IDs | FC-XX | Enables PLAN.md reference and verifier coverage check |
| Event Ordering IDs | EO-XX | Same rationale as FC-XX |

---

## Installation

```bash
npx gsd-dfa@latest
```

The installer prompts you to choose a runtime (Claude Code, Codex, Gemini CLI, OpenCode, Cursor, Windsurf, Cline, and others) and an install location (global or local).

---

## Project Status

gsd-dfa is an independent project as of v2.0.0. It originated as a fork of [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) and inherited that project's spec-driven workflow as a foundation. Going forward:

- **Independent release line.** gsd-dfa version numbers have no relationship to upstream version numbers.
- **Upstream is a reference, not a dependency.** We may cherry-pick targeted fixes from upstream when relevant — see [`docs/UPSTREAM-SYNC.md`](docs/UPSTREAM-SYNC.md) — but all feature direction is decided independently.
- **DFA is the core differentiator.** All new development is centered on improving the DFA methodology, command set, and verification loop.

---

## Attribution

This project originated as a fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) by [Lex Christopherson](https://github.com/glittercowboy) / TÂCHES, used and extended under the MIT License. The original spec-driven workflow (commands, agents, planning loop, hooks system) was created by the upstream author and remains the foundation that gsd-dfa builds on.

- **Original copyright:** © 2025 Lex Christopherson, MIT License
- **DFA extensions and v2.0.0+ development:** © 2026 guanyuhoujeff, MIT License
- **Divergence point:** upstream `6c27955` (v1.35.0) — see `docs/UPSTREAM-SYNC.md`

## License

MIT License — see [LICENSE](LICENSE) for details.
