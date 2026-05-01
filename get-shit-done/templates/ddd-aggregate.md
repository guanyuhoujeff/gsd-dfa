# DDD Aggregate Template

Template for `.planning/ddd/AGGREGATE-{Name}.md` — captures one DDD aggregate at the tactical-design level.

**Purpose:** Aggregates are the unit of transactional consistency in DDD. Getting their boundaries right determines whether the resulting system is maintainable. This template forces explicit decisions about root, members, invariants, lifecycle, boundaries, and concurrency — the six things that, when implicit, cause the worst design debt.

**Downstream consumers:**
- `/gsd-mini-event-storm` reads aggregates to scope domain events
- `/gsd-mini-storage` reads boundaries and concurrency to inform storage choice
- `/gsd-dfa-model` reads the emitted DFA skeleton (states ← lifecycle, forbidden ← invariants) and refines it

---

## File Template

```markdown
---
aggregate: [Name]
context: [bounded context or "(unspecified)"]
identity: [uuid | natural-key | composite]
concurrency: [optimistic | pessimistic | event-sourced | single-writer]
status: [draft | reviewed | locked]
last_updated: [date]
---

# Aggregate: [Name]

**Context:** [link to `CONTEXT-MAP.md#<context>`]
**Companion DFA:** [link to `../dfa/DFA-<slug>.md` if emitted]

## Purpose

[One sentence — what business concept this aggregate represents and why it's an aggregate (i.e., what consistency boundary it owns).]

## Root Entity

- **Name:** [RootName]
- **Identity:** [how the root is uniquely identified — UUID v7? natural key? composite of (tenant, name)?]
- **Why this is the root:** [the rule is "root is the only entity outside can reference" — explain why no member fits that role]

## Member Entities

Entities owned by this aggregate. Identity is unique only within the aggregate. Outsiders cannot reference these directly.

| Entity | Identity scope | Notes |
|--------|----------------|-------|
| [Name] | within aggregate | [purpose] |
| ... |

## Value Objects

Immutable types defined by their attributes (no identity). Replace whole when modifying.

| Value Object | Attributes | Notes |
|--------------|------------|-------|
| [Name] | [field1: type, field2: type] | [purpose; e.g., Money has `amount + currency`, equal iff both fields match] |
| ... |

## Invariants

Business rules that must always hold for this aggregate. Each is a **testable predicate** — true or false against any aggregate snapshot.

| ID | Invariant | Why |
|----|-----------|-----|
| INV-01 | [predicate, e.g., "Order total equals sum of line item subtotals"] | [business reason] |
| INV-02 | [predicate] | [reason] |
| ... |

> **Note:** Each `INV-XX` becomes one `F-INV-XX` (forbidden transition) entry in the emitted DFA skeleton.

## Lifecycle

Discrete states this aggregate goes through over its lifetime. UPPER_SNAKE_CASE.

### States

| State | Description | State-specific invariants |
|-------|-------------|---------------------------|
| [INITIAL_STATE] | [the state the aggregate is born in] | [must be true while in this state] |
| [STATE_X] | ... | ... |
| [TERMINAL_STATE] | ... | ... |

**Initial state:** [INITIAL_STATE]
**Terminal states:** [TERMINAL_A, TERMINAL_B] — no outbound transitions

### Transitions

| From | Trigger (placeholder until event storm) | To | Notes |
|------|------------------------------------------|----|----|
| [STATE_A] | [trigger] | [STATE_B] | [conditions, side effects] |
| ... |

> **Note:** Triggers are placeholders. `/gsd-mini-event-storm` produces the canonical event names; `/gsd-dfa-model` then plugs them in.

## Boundaries

### Contained (inside the aggregate)

[List members and value objects from above. The aggregate root mediates ALL mutations to these.]

### Referenced (outside, pointed to by ID only)

[List other aggregates this one mentions by ID. NEVER hold a direct in-memory reference — always reference by ID.]

| Other aggregate | Why we reference it | How we reach it (read model / repository) |
|-----------------|--------------------|---------------------------------------------|
| [OtherAggregate] | [purpose] | [pattern] |
| ... |

### External actors

[Who issues commands against this aggregate? — users, services, scheduled jobs. These become Actors during event storming.]

| Actor | Commands they can issue |
|-------|-------------------------|
| [Customer] | place_order, cancel_order, ... |
| ... |

## Concurrency Model

[One of: optimistic / pessimistic / event-sourced / single-writer / custom]

**Rationale:** [why this model fits this aggregate]

**Implementation hints (informational; not binding for implementers):**
- Optimistic: version field, conflict resolution policy on retry
- Pessimistic: lock granularity (whole aggregate vs sub-tree), timeout
- Event-sourced: stream key, snapshot frequency
- Single-writer: who's the writer, how readers stay current

## Open Questions

Issues to resolve before this aggregate is `locked`. Anything ambiguous, contested, or needing stakeholder input.

- [ ] [Question 1]
- [ ] [Question 2]

## Sources

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ddd/CONTEXT-MAP.md` (if exists)
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` (if exists)
```

---

## Conventions

- **Aggregate names** are domain language, singular, capitalized: `Order` not `Orders` or `OrderEntity`. The aggregate IS the conceptual thing — pluralization happens at the repository or read-model layer.
- **States** are UPPER_SNAKE_CASE so they line up with the DFA template.
- **Identity strategy** matters. UUIDs are easy; natural keys catch invalid composites at write time; composite keys (tenant + name) avoid cross-tenant collisions. Pick once and document.
- **Aggregate size:** typically 1 root + 0–6 members + a few value objects. More than ~7 entities is a smell — consider whether some members are themselves aggregates.
- **References, not pointers.** No aggregate ever holds a direct in-memory reference to another aggregate. Use IDs and look up via repository when needed.
- **Invariants are predicates.** "Total ≥ 0" is a predicate (returns true/false). "Customer should be notified" is a side effect, NOT an invariant — that's a policy.
