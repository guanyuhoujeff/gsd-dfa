# DDD Event Storm Template

Template for `.planning/ddd/EVENT-STORM-{context}.md` — a structured event-storming canvas for one bounded context.

**Purpose:** Event storming surfaces the dynamic behavior of a context — what happens, in what order, who triggers it, what reacts. Done well, it's the cheapest way to find missing aggregates, ambiguous policies, and unknown integrations before any code is written. This template structures Alberto Brandolini's eight-color sticky-note vocabulary so an AI can author and maintain it.

**Downstream consumers** (per docs/GSD-MINI-DESIGN.md §6):
- `/gsd-dfa-model` — domain events become DFA events
- `/gsd-dfa-scenarios` — policies become cross-subsystem scenarios
- `/gsd-list-phase-assumptions` — hot spots become tracked assumptions
- `/gsd-mini-storage` — read models inform the Projections section

---

## File Template

```markdown
---
context: [Context Name]
aggregate: [name or null — null if storm covers whole context]
events_count: [N]
commands_count: [N]
actors_count: [N]
aggregates_count: [N]
policies_count: [N]
externals_count: [N]
read_models_count: [N]
hot_spots_count: [N]
status: [draft | reviewed | locked]
last_updated: [date]
---

# Event Storm: [Context Name]

**Companion artifacts:**
- [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) — bounded contexts and integration patterns
- [`UBIQUITOUS-LANGUAGE.md`](./UBIQUITOUS-LANGUAGE.md) — domain terms scoped per context

---

## 1. Domain Events (orange)

> Past-tense, business-meaningful facts about what happened. PascalCase. Atomic.
> Anti-patterns: imperative verbs (those are commands), continuous tense (events are atomic, not in-progress), UI mechanics (`UserClickedButton` is not a domain event).

| ID | Event | Meaning | Aggregate(s) emitting | Notes |
|----|-------|---------|----------------------|-------|
| EV-01 | [OrderPlaced] | [a customer placed an order] | [Order] | |
| EV-02 | [OrderPaid]   | [payment for an order succeeded] | [Order, Payment] | cross-aggregate — see policy POL-01 |
| ... |

---

## 2. Commands (blue)

> Imperative verbs that triggered events. PascalCase. Naming rule: `<verb>` produces `<noun-verb-ed>` (e.g., `PlaceOrder` → `OrderPlaced`).

| ID | Command | Produces events | Aggregate target | Notes |
|----|---------|-----------------|------------------|-------|
| CMD-01 | [PlaceOrder] | [EV-01] | [Order] | failure path: EV-XX `OrderRejected` |
| CMD-02 | [Pay] | [EV-02 success / EV-XX failure] | [Order, Payment] | |
| ... |

---

## 3. Actors (yellow)

> Who issued the command. End users, internal roles, scheduled jobs, external systems, or other aggregates (via policy).

| ID | Actor | Type | Commands they issue |
|----|-------|------|---------------------|
| ACT-01 | [Customer] | end user | CMD-01, CMD-02 |
| ACT-02 | [Scheduler] | scheduled job | CMD-XX |
| ACT-03 | [StripeWebhook] | external | CMD-YY |
| ... |

---

## 4. Aggregates (yellow box)

> Where state lives. Each aggregate referenced here should have an `AGGREGATE-*.md`. Missing ones are hot spots.

| ID | Aggregate | Spec file | Events emitted | Commands accepted |
|----|-----------|-----------|----------------|--------------------|
| AGG-01 | [Order] | [`AGGREGATE-Order.md`](./AGGREGATE-Order.md) | EV-01, EV-02, ... | CMD-01, CMD-02, ... |
| AGG-02 | [Subscription] | **TBD: not yet modeled** — see HS-XX | | |
| ... |

---

## 5. Policies (purple)

> When-X-then-Y reactive rules. The X is a domain event, the Y is a command. Policies are how aggregates collaborate without holding direct references — they become **scenarios** in `/gsd-dfa-scenarios`.

| ID | Policy | Guard | Why |
|----|--------|-------|-----|
| POL-01 | When **EV-01 OrderPlaced** then issue **CMD-XX ReserveInventory** | (none) | placed orders must lock stock |
| POL-02 | When **EV-XX PaymentFailed** then issue **CMD-YY NotifyCustomer** | unless `RetryAttemptsRemaining` | don't spam during retry loop |
| ... |

---

## 6. External Systems (pink)

> Systems outside our boundary that emit events we consume or consume events we emit.

| ID | External system | Role | Events consumed (in) | Events emitted (out) | Integration pattern |
|----|-----------------|------|---------------------|----------------------|---------------------|
| EXT-01 | [Stripe] | payment processor | EV-XX `PaymentSucceeded` (webhook) | CMD-YY `ChargeCard` request | conformist (see CONTEXT-MAP) |
| EXT-02 | [SendGrid] | email provider | (none — fire-and-forget) | CMD-XX `SendEmail` request | conformist |
| ... |

---

## 7. Read Models (green)

> Denormalized views queries hit. Each one names the storage it lives in. Read models inform `/gsd-mini-storage`'s Projections section.

| ID | Read model | Shows | Source events | Storage |
|----|------------|-------|---------------|---------|
| RM-01 | [CustomerOrderHistory] | per-customer chronological order list | EV-01, EV-02, EV-03 | [`STORAGE-Order.md`](./STORAGE-Order.md) projections |
| RM-02 | [PaperSearchIndex] | full-text + faceted search over papers | EV-XX, EV-YY | TBD: needs `/gsd-mini-storage Paper` |
| ... |

---

## 8. Hot Spots (red)

> Disagreements, unknowns, parking-lot items. Each becomes a tracked assumption when `/gsd-list-phase-assumptions` ingests this file.

- **HS-01:** [Question — e.g., "Does refund logic belong to Sales or Billing?"] _(blocks: aggregate placement decision before /gsd-mini-aggregate Refund)_
- **HS-02:** [Question — e.g., "Aggregate `Subscription` referenced by EV-XX but not yet modeled — run `/gsd-mini-aggregate Subscription`"]
- **HS-03:** [Question — e.g., "Policy POL-XX has two candidate reactions (Y or Z) — which one fires?"]
- ...

---

## Event flow (Mermaid)

> Visualize the happy-path event chain. One swimlane per actor or aggregate. Cross-context arrows annotated with policy IDs.

\`\`\`mermaid
sequenceDiagram
  participant C as Customer (ACT-01)
  participant O as Order (AGG-01)
  participant I as Inventory (AGG-XX)
  participant S as Stripe (EXT-01)

  C->>O: CMD-01 PlaceOrder
  O-->>C: EV-01 OrderPlaced
  Note over O,I: POL-01: when OrderPlaced then ReserveInventory
  O->>I: CMD-XX ReserveInventory
  I-->>O: EV-XX InventoryReserved
  C->>O: CMD-02 Pay
  O->>S: CMD-YY ChargeCard
  S-->>O: EV-02 PaymentSucceeded
\`\`\`

---

## DFA event vocabulary (for /gsd-dfa-model)

> When you run `/gsd-dfa-model` on aggregates in this context, paste these events into the DFA's events table.

| Event | Source (actor / external / policy) | Notes |
|-------|------------------------------------|-------|
| OrderPlaced  | Customer (CMD-01: PlaceOrder)      | EV-01 |
| OrderPaid    | StripeWebhook (EXT-01)             | EV-02 |
| ... |

---

## Sources

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ddd/CONTEXT-MAP.md` (if exists)
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` (if exists)
- `.planning/ddd/AGGREGATE-*.md` (if any)
```

---

## Conventions

- **Events** are past-tense PascalCase: `OrderPlaced`, `PaymentSucceeded`, `SubscriptionRenewed`. Never `place_order` (snake_case is for code), never `OrderPlacing` (continuous tense — events are atomic).
- **Commands** are imperative PascalCase: `PlaceOrder`, `RenewSubscription`. Never use the same name for a command and an event.
- **Actors** are real-world roles or systems, not technical terms. `Customer`, not `User`. `Scheduler`, not `Cron`. `StripeWebhook`, not `external_api_call`.
- **Policies** are always in "when X then Y" form. If you can't express it that way, it's probably an action inside a command, not a policy.
- **Hot spots are valuable.** Don't fabricate answers when the inputs are ambiguous — capture the ambiguity as a hot spot. `/gsd-list-phase-assumptions` then forces the team to resolve it before locking the spec.
- **Cross-aggregate events** are a red flag for synchronous coupling. Almost always, the right fix is a policy that turns the cross-aggregate update into a reactive event flow.
- **Number everything.** EV-01, CMD-01, ACT-01, AGG-01, POL-01, EXT-01, RM-01, HS-01. The numbers are how downstream commands reference items in this storm.
