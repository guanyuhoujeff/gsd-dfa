# DFA Methodology for gsd-dfa

**Version:** 0.1.0
**Author:** barai (fork extension)
**Upstream:** [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) by Lex Christopherson (TACHES), MIT License

---

## Why DFA in gsd-dfa

gsd-dfa's original workflow produces **task-oriented** plans: "do X, then Y, then Z." This works well for feature buildout but leaves gaps when planning **stateful systems** — systems where behavior depends on *what state the system is in* when an event arrives.

Examples of stateful systems where natural language planning fails:

| Domain | Hidden complexity |
|--------|-------------------|
| Trading systems | Session state x connection state x position state |
| Auth flows | Token lifecycle x session x device trust |
| CI/CD pipelines | Build state x deployment state x rollback state |
| IoT devices | Connection state x firmware state x command queue |
| Order processing | Payment state x fulfillment state x refund state |

**The core problem:** Natural language descriptions say "when X happens, do Y" but don't force you to answer "what happens in *every other* state when X arrives?" The unanswered combinations become production bugs.

**DFA forces completeness.** Every cell in the State x Event matrix must be filled — either with a transition or an explicit "reject/ignore with reason."

---

## Core Concepts

### Deterministic Finite Automaton (DFA)

A DFA is defined by a 5-tuple `(Q, Σ, δ, q₀, F)`:

| Symbol | Meaning | In gsd-dfa context |
|--------|---------|----------------|
| Q | Finite set of states | All states a subsystem can be in |
| Σ | Finite set of input symbols (events) | All events the subsystem reacts to |
| δ | Transition function: Q × Σ → Q | The transition table |
| q₀ | Initial state | System state at startup |
| F | Set of accepting/final states | Terminal states (shutdown, error-halt) |

### Extended DFA for Software Systems

Pure DFA has no side effects. Real systems need **actions** on transitions and **guards** (conditions). We extend to:

```
δ(state, event) → (next_state, action, guard?)
```

- **Guard**: Optional boolean condition that must be true for the transition to fire. If false, the event is handled by a fallback row. Guards use natural language but must be specific enough that an executor doesn't need to guess (Good: `retry_count < max_retries`; Bad: `conditions allow`).
- **Action**: What the system does during the transition (emit event, update data, call API, start/cancel timer).

### Hierarchical States (Optional)

When a group of states shares most transitions and differs only in a few, they can be modeled as **sub-states** under a common **superstate** (Harel Statecharts). This avoids duplicating identical transition rows.

```
STREAMING (superstate)
├── STREAMING.NORMAL
├── STREAMING.THROTTLED
└── STREAMING.STALE
```

- Transitions defined on the superstate **inherit to all sub-states**.
- Sub-states can define **override transitions** for specific behavior.
- Use when: a group of 3+ states shares >50% of their transitions.
- Skip when: states < 8 total, or duplication is minimal and tolerable.

Hierarchical modeling is optional. Start flat; promote to hierarchy only when duplication becomes a readability problem.

---

## Integration with gsd-dfa Workflow

DFA supports two usage modes:

### Mode 1: Phase-Bound (new feature development)

DFA modeling integrates at specific points in the existing gsd-dfa pipeline:

```
research-phase  ──→  /gsd-dfa-scan to identify STATEFUL subsystems
                     (not every phase needs DFA — CRUD doesn't)

discuss-phase   ──→  /gsd-dfa-model --phase N to define states, events, guards
                     /gsd-dfa-verify to validate completeness
                     /gsd-dfa-scenarios for cross-subsystem gaps

plan-phase      ──→  Each transition group = one plan/task
                     Planner reads DFA as specification
                     /gsd-dfa-tests to generate test skeletons

execute-phase   ──→  Implement reducer/handler per transition
                     Fill in test skeletons

verify-work     ──→  /gsd-dfa-audit to verify code matches spec
                     Check no unhandled state×event combinations
```

### Mode 2: Standalone (retroactive audit of existing code)

For systems already built without DFA, model retroactively to find gaps:

```
/gsd-dfa-scan           ──→  Find which subsystems have stateful behavior
/gsd-dfa-model {name}   ──→  Model each subsystem from existing code
/gsd-dfa-verify         ──→  Validate the model itself
/gsd-dfa-scenarios      ──→  Cross-subsystem interaction gaps
/gsd-dfa-audit          ──→  Compare model vs code → gap list
  ... fix gaps ...
```

Standalone DFAs live in `.planning/dfa/` rather than phase directories.

### When to Use DFA

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

## Modeling Process

### Step 1: Identify the Subsystem Boundary

One DFA per subsystem or lifecycle. Don't model the entire system as one DFA — it explodes combinatorially.

Good boundaries:
- Connection lifecycle (connect → stream → disconnect → reconnect)
- Order lifecycle (pending → filled → cancelled)
- Position lifecycle (flat → opening → holding → closing)
- Session lifecycle (pre-market → trading → post-market → closed)

### Step 2: Enumerate States

List all states the subsystem can be in. States must be:
- **Mutually exclusive**: The system is in exactly one state at a time
- **Collectively exhaustive**: No unlisted state is possible
- **Observable**: You can determine the current state from system data

Each state needs:
- **Name**: UPPER_SNAKE_CASE (matches code enum convention)
- **Description**: One sentence — when is the system in this state?
- **Invariants**: What must be true while in this state?

### Step 3: Enumerate Events

List all events that the subsystem must react to. Events must be:
- **Atomic**: One event = one thing happened
- **External to the DFA**: Events come from outside (user input, timer, other subsystem)
- **Named consistently**: Use the project's event naming convention

### Step 4: Fill the Transition Table

For every `(state, event)` pair, specify:
1. **Next state** (or `—` for self-loop / no transition)
2. **Action** (what happens during the transition)
3. **Guard** (optional condition)

**Critical rule: No empty cells.** Every combination must be one of:
- **Transition**: State changes, action fires
- **Self-loop**: State unchanged, action fires (e.g., logging)
- **Ignored**: Explicitly marked as ignored with reason
- **Forbidden**: Should never happen; if it does, it's a bug — log error + alert

### Step 5: Cross-Subsystem Scenarios

When multiple DFAs interact, enumerate critical state combinations. You don't need the full Cartesian product — focus on:
- States where **both subsystems are in non-steady states** (both transitioning)
- Events that **affect multiple subsystems** simultaneously
- **Failure modes**: What if subsystem A is degraded while B needs it?

---

## Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/gsd-dfa-scan` | Scan codebase for DFA candidates | Before modeling — find which subsystems need DFA |
| `/gsd-dfa-model` | Create DFA state table | When modeling a stateful subsystem |
| `/gsd-dfa-verify` | Verify DFA completeness | After modeling — check for dead states, missing cells |
| `/gsd-dfa-scenarios` | Cross-subsystem scenario matrix | After 2+ DFAs exist — find interaction gaps |
| `/gsd-dfa-audit` | Compare DFA spec vs code | After implementation — find gaps between spec and code |
| `/gsd-dfa-tests` | Generate test skeletons | After modeling — bootstrap test coverage |
| `/gsd-dfa-btree` | Generate hierarchical behavior tree | After 1+ DFAs exist — give developers a top-down view of system behavior |

### Typical Workflow

```
/gsd-dfa-scan              → identify candidates
/gsd-dfa-model trader      → model each subsystem
/gsd-dfa-verify            → validate completeness
/gsd-dfa-scenarios         → cross-subsystem gaps
/gsd-dfa-btree             → hierarchical behavior tree (L0/L1/L2)
/gsd-dfa-tests DFA-file    → generate test skeletons
  ... implement code ...
/gsd-dfa-audit             → verify code matches spec
```

---

## Artifacts Produced

| Artifact | Location (phase-bound) | Location (standalone) | Consumer |
|----------|----------------------|----------------------|----------|
| DFA State Table | `.planning/phases/XX-name/{N}-DFA-{subsystem}.md` | `.planning/dfa/DFA-{subsystem}.md` | planner, executor, verifier |
| Scenario Matrix | `.planning/phases/XX-name/{N}-DFA-SCENARIOS.md` | `.planning/dfa/DFA-cross-subsystem-scenarios.md` | planner (integration tasks), verifier |
| Audit Report | — | `.planning/dfa/DFA-AUDIT-{date}.md` | developer (fix queue) |
| Test Skeletons | `tests/.../test_dfa_{subsystem}.py` | same | executor, tdd-guide |
| Behavior Tree | `.planning/phases/XX-name/{N}-DFA-BTREE.md` | `.planning/dfa/DFA-BTREE.md` | developer (understanding), reviewer, onboarding |

---

## Relationship to Existing gsd-dfa Concepts

| gsd-dfa Concept | DFA Equivalent |
|-------------|----------------|
| Locked Decision (D-XX) | May constrain which states/events exist |
| Task in PLAN.md | One or more transitions to implement |
| Success Criteria | All transitions implemented + tested |
| Verification | Transition coverage = 100% |
| Forbidden transition | Explicit error handling requirement |
| Scenario Matrix row | Integration test case |
| Behavior Tree | Hierarchical decision view across all DFAs |

---

## Notation Conventions

### State Names
```
UPPER_SNAKE_CASE matching code enums
Examples: DISCONNECTED, STREAMING, CIRCUIT_OPEN
```

### Event Names
```
Project event convention (namespace.action for event-driven systems)
Timers are events like any other — Source column marks them as "internal timer"
Examples: connection_lost, tick_received, retry_timeout, circuit_reset
```

### Transition Table Format
```
| Current State | Event | Guard | Next State | Action |
```

### Forbidden Transition Format
```
| Current State | Event | Handling | Reason |
```

### Scenario Matrix Format
```
| # | Subsystem A State | Subsystem B State | Event | Expected Behavior |
```

### Failure Cascade Format
```
| FC-XX | Origin Failure | Affected Subsystem | Cascade Effect | Mitigation |
```

### Event Ordering Format
```
| EO-XX | Sequence A (expected) | Sequence B (race condition) | Outcome Difference | Handling |
```

### Guard Format
```
Natural language, but specific enough for an executor to implement without guessing.
Good: "retry_count < max_retries", "in trading session AND no open position"
Bad:  "conditions are met", "when appropriate"
```

---

## Worked Example: Smart Beverage Kiosk

A full end-to-end walkthrough of the pipeline (`/gsd-dfa-model` → `/gsd-dfa-btree --level 0` → fix findings → `--level 1` → `/gsd-dfa-verify` → liveness review) on a self-service beverage kiosk with 3 interacting DFAs (Session, OrderCart, VoiceInteraction), totalling 21 states / 32 events / 57 transitions.

The example is deliberately chosen so that no single subsystem is complicated, but the **interactions between subsystems** produce the exact class of bugs this methodology is designed to catch — boundary violations, umbrella events without routers, cross-subsystem state invariants, and liveness/timeout gaps.

**Full walkthrough, findings, and key lessons:** see [`docs/examples/dfa-kiosk-worked-example.md`](./examples/dfa-kiosk-worked-example.md).

---

## References

- Hopcroft, Motwani, Ullman — *Introduction to Automata Theory, Languages, and Computation*
- Harel — Statecharts: A Visual Formalism for Complex Systems (1987)
- XState documentation — Practical state machines in JavaScript/TypeScript
- Upstream ancestor: [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)
