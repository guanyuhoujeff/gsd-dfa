# GSD-DFA: Spec-Driven Development with DFA State Modeling

> Forked from [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) by Lex Christopherson (TACHES), MIT License.

**GSD + Deterministic Finite Automaton (DFA) methodology for planning stateful systems.**

GSD's original workflow (research -> discuss -> plan -> execute -> verify) is task-oriented. This fork extends it with **explicit state machine modeling** at the planning phase, forcing completeness: every state x event combination must be accounted for.

---

## What's Different from Upstream

### Core Concept

When planning stateful systems (connection lifecycles, order processing, retry logic, session management), natural language descriptions say "when X happens, do Y" but don't force you to answer "what happens in *every other* state when X arrives?" The unanswered combinations become production bugs.

DFA forces completeness. Every cell in the State x Event matrix must be filled -- either with a transition or an explicit "reject/ignore with reason."

### Changes Summary

| Area | Original GSD | GSD-DFA |
|------|-------------|---------|
| research-phase | Identifies tech stack and patterns | Also identifies **DFA candidates** (stateful subsystems) |
| discuss-phase | Free-form decisions | Can produce state tables during discussion |
| plan-phase | Task-oriented decomposition | **Transition-oriented** decomposition when DFA exists |
| execute-phase | Task as unit of work | Transition as unit of work (T-XX = one test) |
| verify-work | Goal-based verification | Also checks **DFA transition coverage** |
| **New: /gsd:dfa-model** | -- | Build DFA state table for a subsystem |
| **New: /gsd:dfa-verify** | -- | Check DFA completeness (dead states, unreachable states, unhandled events) |
| **New: /gsd:dfa-scenarios** | -- | Cross-subsystem scenario matrix from 2+ DFAs |

### New Templates

| Template | Purpose |
|----------|---------|
| `get-shit-done/templates/dfa-state-table.md` | Complete state machine specification: states, events, transitions, forbidden transitions, completeness matrix |
| `get-shit-done/templates/dfa-scenario-matrix.md` | Cross-subsystem interactions: critical scenarios (SC-XX), failure cascades (FC-XX), event ordering (EO-XX) |

### New Commands

| Command | Purpose |
|---------|---------|
| `/gsd:dfa-model <phase> <subsystem>` | Create DFA for one subsystem |
| `/gsd:dfa-verify <phase> [subsystem]` | Verify DFA completeness and consistency |
| `/gsd:dfa-scenarios <phase>` | Generate scenario matrix from 2+ DFAs |

### Modified Agents

| Agent | Change |
|-------|--------|
| `gsd-phase-researcher` | Added `## DFA Candidates` output section |
| `gsd-planner` | Reads DFA artifacts, decomposes transitions into tasks, maintains transition coverage matrix |
| `gsd-verifier` | Added Step 5b: DFA Transition Coverage verification |

### Methodology Document

`docs/DFA-METHODOLOGY.md` covers:
- When to use DFA (stateful systems) vs when to skip (CRUD, stateless)
- Extended DFA for software systems (actions + guards)
- Hierarchical states (optional, for reducing duplication)
- Integration with GSD workflow at each phase
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
/gsd:research-phase N     -> Identifies DFA candidates in research output
/gsd:discuss-phase N      -> Defines states/events/guards during discussion
/gsd:dfa-model N subsys   -> Creates DFA state table (per subsystem)
/gsd:dfa-verify N         -> Validates completeness before planning
/gsd:dfa-scenarios N      -> Cross-subsystem scenario matrix (if 2+ DFAs)
/gsd:plan-phase N         -> Planner reads DFA, groups transitions into tasks
/gsd:execute-phase N      -> Executor implements transition-by-transition
/gsd:verify-work N        -> Verifier checks DFA transition coverage
```

---

## Artifacts Produced

```
.planning/phases/XX-name/
  {phase_num}-DFA-{subsystem}.md      <- State table (per subsystem)
  {phase_num}-DFA-SCENARIOS.md        <- Cross-subsystem scenarios
  {phase_num}-CONTEXT.md              <- Decisions (unchanged from upstream)
  {phase_num}-RESEARCH.md             <- Now includes DFA Candidates section
  {phase_num}-NN-PLAN.md              <- Plans reference T-XX, SC-XX, FC-XX
  {phase_num}-VERIFICATION.md         <- Now includes DFA coverage report
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

## Attribution

This project is a fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) by [Lex Christopherson](https://github.com/glittercowboy) / TACHES.

- **Upstream license:** MIT
- **Upstream version at fork:** See `CHANGELOG.md`
- **What was added:** DFA state modeling methodology, templates, commands, and agent modifications as described above
- **What was NOT changed:** Core GSD workflow, all existing commands/agents/templates remain intact

## License

MIT License -- see [LICENSE](LICENSE) for details.

Original copyright (c) 2025 Lex Christopherson.
DFA extensions copyright (c) 2026 barai.
