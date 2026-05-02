# DDD Methodology for gsd-mini

This document explains how Domain-Driven Design (DDD) is structured inside the `gsd-mini` planning-only profile, and how it bridges into the existing DFA family. For the planning-only install profile itself, see [`docs/GSD-MINI-DESIGN.md`](./GSD-MINI-DESIGN.md). For DFA, see [`docs/DFA-METHODOLOGY.md`](./DFA-METHODOLOGY.md).

---

## Why DDD in gsd-mini

`gsd-mini` is the spec-driven half of `gsd-dfa` — no executor, no code generation, output is meant to be handed off to humans or other AI tools. To produce specs that survive that handoff, the planning surface needs vocabulary for:

1. **Strategic decomposition** — what *bounded contexts* the system has, who owns each, and how they integrate
2. **Tactical structure** — for each context, what *aggregates* live there, with their invariants and lifecycles
3. **Behavior dynamics** — what *domain events* flow, who reacts, where state lives
4. **Persistence physics** — for each aggregate, *which storage family* fits, and what the schema looks like in that storage's native language

DDD provides this vocabulary. Eric Evans' strategic and tactical patterns plus Alberto Brandolini's event storming are battle-tested for these four concerns; gsd-mini packages them as four AI-runnable commands and ties them to the DFA modeling already in `gsd-dfa`.

The bridge to DFA matters: aggregates have lifecycles (states), invariants (forbidden transitions), and react to domain events (DFA events). DDD done well *generates* the DFA inputs.

## Core Concepts

### Strategic vs Tactical DDD

| Layer | Concern | gsd-mini commands |
|-------|---------|-------------------|
| **Strategic** | Where do context boundaries lie? Who owns each? How do they integrate? | `/gsd-mini-domain` |
| **Tactical** | Within one context, how is state structured? What are the consistency rules? | `/gsd-mini-aggregate` |
| **Behavior** | What happens, in what order, who reacts? | `/gsd-mini-event-storm` |
| **Persistence** | Where does aggregate state physically live? | `/gsd-mini-storage` |

### Ubiquitous Language (per bounded context)

A glossary where every domain term is **scoped to a bounded context**. The same word can mean different things in different contexts (a "Customer" in Sales is not the same thing as a "Customer" in Billing). The glossary forces collisions to be explicit.

Captured by `/gsd-mini-domain` in `.planning/ddd/UBIQUITOUS-LANGUAGE.md`.

### Bounded Context

A boundary inside which one model applies consistently. Across boundaries, the model translates (or doesn't, and you get bugs).

Captured by `/gsd-mini-domain` in `.planning/ddd/CONTEXT-MAP.md`. Six standard integration patterns documented:

| Pattern | When to use |
|---------|-------------|
| **Anti-corruption layer (ACL)** | Downstream protects itself from upstream churn by translating into its own model |
| **Shared kernel** | Both contexts share a small model; tightly coupled change cycle |
| **Customer-supplier** | Supplier prioritizes customer's needs; planned change cycle |
| **Open-host service (OHS)** | Supplier publishes a stable interface used by many |
| **Conformist** | Downstream accepts upstream model as-is (can't influence it) |
| **Partnership** | Both contexts succeed or fail together; ad-hoc collaboration |

### Aggregate

The unit of transactional consistency. One **root entity** + 0–6 **member entities** + value objects. The root is the *only* entity that outsiders can reference. Aggregates communicate by **ID reference** and **domain events**, never by direct in-memory pointer.

Captured by `/gsd-mini-aggregate` in `.planning/ddd/AGGREGATE-{name}.md`. Six aspects forced explicit: root, members, value objects, invariants, lifecycle, boundaries, concurrency.

**Invariants** are testable predicates (true/false against an aggregate snapshot). They become **forbidden transitions** (F-INV-XX) in the auto-emitted DFA skeleton.

### Domain Event

A **past-tense fact** about something business-meaningful that already happened: `OrderPlaced`, `PaymentSucceeded`, `SubscriptionRenewed`. Atomic, PascalCase. Never imperative (that's a command), never continuous tense (events are atomic, not in-progress).

Captured (with seven other sticky-note categories) by `/gsd-mini-event-storm` in `.planning/ddd/EVENT-STORM-{context}.md`.

### Storage Choice

The **physical** decision separate from the business concept. Same aggregate can pick different storages at different scales — polyglot persistence is normal.

Captured by `/gsd-mini-storage` in `.planning/ddd/STORAGE-{aggregate-or-context}.md`. Eleven supported storage families:

```
relational   document   key-value   wide-column   graph    vector
time-series  search     object-store columnar-analytics    event-log
```

## DDD ↔ DFA Bridge

This is the killer feature. The four DDD commands feed the DFA family; the DFA family validates the DDD model.

```
DDD                          DFA
──────────────────────       ─────────────────
Bounded Context        ──→   Scope of one DFA
Aggregate Root         ──→   Subsystem with its own DFA
Aggregate Lifecycle    ──→   States table (initial → terminal)
Invariants             ──→   Forbidden transitions (F-INV-XX)
Domain Events          ──→   Events column
Commands               ──→   Event triggers / sources
Policies               ──→   Cross-subsystem scenarios
External Systems       ──→   Black-box producers in scenario matrix
Hot Spots              ──→   Tracked phase assumptions
Storage choice         ──→   Persistence events become candidate DFA events
Indexes / access pat.  ──→   Critical-path queries → scenario coverage
Consistency model      ──→   Constrains which (state, event) cells are forbidden
Read models            ──→   /gsd-mini-storage Projections section
```

**Bidirectional checks:**
- Doing DDD first **gives DFA a complete event/state vocabulary** — `/gsd-mini-aggregate` auto-emits a DFA skeleton, `/gsd-mini-event-storm` emits a paste-in events table
- Doing DFA first **surfaces gaps in the DDD model** — states with no producing event = missing command; events with no consumer = orphan event

The verifier's **Step 5c** (see [GSD-MINI-DESIGN.md §4.3](./GSD-MINI-DESIGN.md)) cross-checks both directions when DDD artifacts exist.

## Modeling Process

### Step 1: Establish strategic structure

```
/gsd-mini-domain
```

Produces `UBIQUITOUS-LANGUAGE.md` (terms per context) and `CONTEXT-MAP.md` (contexts + integration patterns + Mermaid diagram). 3–7 contexts is typical for a project; more is suspicious, fewer probably hides one.

### Step 2: Per context, identify aggregates

For each bounded context, list the aggregates that own state within it. Then for each:

```
/gsd-mini-aggregate <Name> --context <BoundedContext>
```

Produces `AGGREGATE-{Name}.md` and (default-on) a draft `DFA-{slug}.md` skeleton. Six aspects captured: root, members, value objects, invariants (`INV-XX`), lifecycle (states + transitions), boundaries, concurrency model.

### Step 3: Run an event storm per context

```
/gsd-mini-event-storm --context <BoundedContext>
```

Produces `EVENT-STORM-{context}.md` covering all eight sticky-note categories. The workflow walks them in canonical order: events first (what happened), then commands and actors (what caused it), then aggregates and read models (where state lives), then policies (reactive logic), then external systems and hot spots (boundary unknowns).

### Step 4: Decide storage per aggregate (or per context)

```
/gsd-mini-storage <AggregateName>           # per-aggregate (polyglot-friendly)
/gsd-mini-storage --context <BoundedContext>  # per-context (shared transactional storage)
```

Two-phase workflow: first **decision** (survey 7 dimensions: read/write ratio, query patterns, consistency, scale, latency, infra, team), then **specification** (write schema in chosen storage's native language).

### Step 5: Refine DFA from inputs

```
/gsd-dfa-model <aggregate-slug> --standalone
/gsd-dfa-verify --standalone
/gsd-dfa-scenarios
/gsd-dfa-btree --level 1
```

The DFA family consumes the DDD outputs. `/gsd-dfa-model` reads the skeleton emitted by `/gsd-mini-aggregate` and the events block emitted by `/gsd-mini-event-storm`, and refines them into the full state table.

### Step 6: Verify spec completeness

```
/gsd-verify-work
```

Triggers Step 5c — every requirement covered, every aggregate has invariants, every event has producer + consumer, no PLAN.md execution-leak verbs.

## Commands Summary

| Command | Strategic / Tactical | Output | DFA bridge |
|---------|----------------------|--------|------------|
| `/gsd-mini-domain` | strategic | `UBIQUITOUS-LANGUAGE.md` + `CONTEXT-MAP.md` | bounded context = DFA scope |
| `/gsd-mini-aggregate` | tactical | `AGGREGATE-{name}.md` + draft DFA skeleton | lifecycle → states; invariants → forbidden transitions |
| `/gsd-mini-event-storm` | behavior | `EVENT-STORM-{context}.md` | domain events → DFA events; policies → scenarios |
| `/gsd-mini-storage` | persistence | `STORAGE-{aggregate-or-context}.md` | persistence events → candidate DFA events |

## Artifacts Produced

```
.planning/
├── ddd/
│   ├── UBIQUITOUS-LANGUAGE.md          # /gsd-mini-domain
│   ├── CONTEXT-MAP.md                  # /gsd-mini-domain
│   ├── AGGREGATE-{Name}.md             # /gsd-mini-aggregate (one per aggregate)
│   ├── EVENT-STORM-{Context}.md        # /gsd-mini-event-storm (one per context)
│   └── STORAGE-{Name|Context}.md       # /gsd-mini-storage (per aggregate or per context)
└── dfa/
    └── DFA-{aggregate-slug}.md         # auto-emitted skeleton; refined by /gsd-dfa-model
```

## Notation Conventions

### Context names
Domain language, singular if it represents a concept (`Sales`), plural if it represents a collection (`Notifications`). Never infrastructure: `OrderService` is a class name, not a context.

### Aggregate names
Singular, capitalized: `Order` not `Orders`. The aggregate IS the conceptual thing; pluralization happens at the repository or read-model layer.

### Event names
Past-tense PascalCase: `OrderPlaced`, `PaymentSucceeded`, `SubscriptionRenewed`. Never `place_order` (snake_case is for code), never `OrderPlacing` (continuous tense — events are atomic).

### Command names
Imperative PascalCase: `PlaceOrder`, `RenewSubscription`. Naming rule: `<Verb><Noun>` produces `<Noun><Verbed>` (e.g., `PlaceOrder` → `OrderPlaced`).

### Identifier conventions

| Prefix | Where | Meaning |
|--------|-------|---------|
| `INV-XX` | AGGREGATE-*.md | Invariant (testable predicate) |
| `EV-XX` | EVENT-STORM-*.md | Domain event |
| `CMD-XX` | EVENT-STORM-*.md | Command |
| `ACT-XX` | EVENT-STORM-*.md | Actor |
| `AGG-XX` | EVENT-STORM-*.md | Aggregate referenced (links to AGGREGATE-*.md) |
| `POL-XX` | EVENT-STORM-*.md | Policy (when X then Y) |
| `EXT-XX` | EVENT-STORM-*.md | External system |
| `RM-XX`  | EVENT-STORM-*.md | Read model |
| `HS-XX`  | EVENT-STORM-*.md | Hot spot (tracked assumption) |
| `T-XX` / `S-XX` / `F-XX` | DFA-*.md | Transition / self-loop / forbidden (see DFA-METHODOLOGY) |

### Cross-references
Use Markdown links between artifacts. `AGGREGATE-Order.md` links to `CONTEXT-MAP.md#sales` and to `DFA-order.md`. `EVENT-STORM-sales.md` links to each `AGGREGATE-*.md` it references.

## Worked Example: Order Lifecycle

A small e-commerce system with three contexts: Sales, Billing, Inventory.

### Step 1 — `/gsd-mini-domain`

```
Bounded contexts: Sales, Billing, Inventory
Sales → Billing: customer-supplier (event-driven)
Sales → Inventory: ACL (downstream protects from upstream churn)
Billing → Stripe: conformist (we accept their model)
```

Glossary scopes "Order" to Sales, "Invoice" to Billing, "Stock" to Inventory.

### Step 2 — `/gsd-mini-aggregate Order --context Sales`

```yaml
aggregate: Order
identity: uuid
concurrency: optimistic

lifecycle:
  states: [DRAFT, PLACED, PAID, SHIPPED, DELIVERED, CANCELLED]
  initial: DRAFT
  terminal: [DELIVERED, CANCELLED]

invariants:
  INV-01: total_cents == sum(items.price * items.qty)
  INV-02: status == SHIPPED implies shipping_address is not null
```

DFA skeleton auto-emitted at `.planning/dfa/DFA-order.md`:
```
states:    DRAFT, PLACED, PAID, SHIPPED, DELIVERED, CANCELLED
forbidden: F-INV-01 (total mismatch), F-INV-02 (ship without address)
```

### Step 3 — `/gsd-mini-event-storm --context Sales`

```
EV-01 OrderPlaced     ← CMD-01 PlaceOrder by ACT-01 Customer
EV-02 OrderPaid       ← CMD-02 Pay by ACT-01 Customer (via EXT-01 Stripe)
EV-03 OrderShipped    ← CMD-03 Ship by ACT-02 Scheduler
POL-01 when EV-01 then issue ReserveInventory (cross-context → Inventory)
HS-01 refund flow: Sales or Billing? (parking)
```

Paste-in DFA event vocabulary block emitted at end of artifact.

### Step 4 — `/gsd-mini-storage Order`

Decision: relational + PostgreSQL (read-heavy CRUD, strong consistency, team familiarity).

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  status order_status_t NOT NULL,
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  ...
);
CREATE INDEX idx_orders_status ON orders(status);
```

Compliance: PII = customer_email (encrypted at-rest); retention = 7 years; region = EU only.

### Step 5 — `/gsd-dfa-model order --standalone`

Refines the skeleton from step 2 with the events table from step 3. Now the full transition table is populated; `/gsd-dfa-verify` confirms no dead states or unhandled events.

### Step 6 — `/gsd-verify-work`

Step 5c report:
- 5c.1 Requirements: 8/8 COVERED
- 5c.2 Phases: complete
- 5c.3 Aggregates: Order has 2 INV — HAS-INVARIANTS ✓
- 5c.4 Events: 3 events all have producers and consumers ✓
- 5c.5 PLAN.md lint: 0 execution-leak warnings ✓

Spec ready for handoff.

## Relationship to Existing gsd-dfa Concepts

| gsd-dfa concept | DDD analog | Mediated by |
|-----------------|-----------|-------------|
| Phase | (no direct analog — phases are work units, contexts are model boundaries) | Phases can target multiple contexts; usually 1 |
| DFA subsystem | Aggregate | `/gsd-mini-aggregate` |
| DFA event | Domain event | `/gsd-mini-event-storm` |
| DFA forbidden transition | Aggregate invariant | `/gsd-mini-aggregate` skeleton emission |
| DFA scenario | Cross-context policy | `/gsd-mini-event-storm` policies → `/gsd-dfa-scenarios` |
| Verifier Step 5b | DFA transition coverage | (existing) |
| Verifier Step 5c | Spec completeness coverage | (new — this proposal) |

## References

- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software* (2003)
- Vaughn Vernon, *Implementing Domain-Driven Design* (2013)
- Alberto Brandolini, *Introducing EventStorming* (2021)
- [`docs/GSD-MINI-DESIGN.md`](./GSD-MINI-DESIGN.md) — design proposal for the planning-only profile
- [`docs/DFA-METHODOLOGY.md`](./DFA-METHODOLOGY.md) — DFA modeling methodology
- [`docs/GSD-MINI-USER-GUIDE.md`](./GSD-MINI-USER-GUIDE.md) — end-to-end tutorial for gsd-mini
