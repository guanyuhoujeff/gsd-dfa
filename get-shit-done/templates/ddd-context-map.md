# Context Map Template

Template for `.planning/ddd/CONTEXT-MAP.md` — the strategic-level map of bounded contexts and how they integrate.

**Purpose:** Make the system's domain decomposition explicit. Every context has an owner, a purpose, and integration patterns to its neighbors. Downstream DDD/DFA artifacts hang off the structure defined here.

**Downstream consumers:**
- `/gsd-mini-aggregate` — `--context <name>` must match a context defined here
- `/gsd-mini-event-storm` — `--context <name>` must match a context defined here
- `/gsd-mini-storage` — may inherit consistency or region constraints from a context's integration pattern
- `/gsd-dfa-model` — uses context boundaries as the natural scope for one DFA

---

## File Template

```markdown
# Context Map

**Last updated:** [date]
**Companion:** [`UBIQUITOUS-LANGUAGE.md`](./UBIQUITOUS-LANGUAGE.md) — domain terms per context

---

## Bounded Contexts

### [Context Name 1]

- **Purpose:** [one sentence — what business capability this context owns]
- **Owner:** [team / role responsible — placeholder OK in early drafts]
- **Core terms:** [3–5 key domain terms — link to UBIQUITOUS-LANGUAGE.md entries]
- **External touchpoints:** [other contexts and external systems this context exchanges data with]
- **Notes:** [optional — e.g., regulatory constraints, scale characteristics, whether it's an existing legacy module]

### [Context Name 2]

- ...

---

## Integration Patterns

Each row describes one directional relationship between two contexts. Use the standard DDD vocabulary:

| Pattern | Meaning |
|---------|---------|
| **Anti-corruption layer (ACL)** | Downstream context translates upstream model into its own; protects from upstream churn |
| **Shared kernel** | Small shared model used by both; tightly coupled change cycle |
| **Customer-supplier** | Supplier prioritizes customer's needs; planned change cycle |
| **Open-host service (OHS)** | Supplier publishes a stable interface used by many |
| **Conformist** | Downstream accepts upstream model as-is; cannot influence it |
| **Partnership** | Both contexts succeed or fail together; ad-hoc collaboration |

### Integration table

| From | To | Pattern | Sync / Async | Notes |
|------|----|---------|--------------|-------|
| [Context 1] | [Context 2] | customer-supplier | async (event) | [e.g., "Order Placed" event triggers Billing] |
| [Context 1] | [External: Stripe] | conformist | sync (REST) | [e.g., "we accept Stripe's webhook payload as-is"] |
| ... |

---

## Map (Mermaid)

\`\`\`mermaid
graph LR
  Sales[Sales]
  Billing[Billing]
  Inventory[Inventory]
  Audit[Audit]
  ExtPayments[(External: Stripe)]
  ExtMail[(External: SendGrid)]

  Sales -->|customer-supplier event| Billing
  Sales -->|ACL| Inventory
  Billing -->|conformist| ExtPayments
  Sales -->|OHS publishes Order events| Audit
  Billing -->|conformist| ExtMail
\`\`\`

Edge labels are short — pattern name + sync mode. Detailed semantics live in the integration table above.

---

## Open boundary questions

Items where the context boundary is unclear or contested. Resolve before `/gsd-mini-aggregate` runs against them.

- [ ] [Question 1 — e.g., "Does refund logic belong to Sales or Billing?"]
- [ ] [Question 2 — e.g., "Should Notifications be its own context or live inside the producing context?"]

---

## Sources

- `.planning/PROJECT.md` — vision, target users
- `.planning/REQUIREMENTS.md` — requirement clusters by area
- `.planning/codebase/STRUCTURE.md` — existing module boundaries (brownfield)
- `.planning/codebase/ARCHITECTURE.md` — existing layers (brownfield)
```

---

## Conventions

- **Context names** are domain-language, not infrastructure-language. `Sales` not `OrderService`. `Inventory` not `InventoryDB`.
- **Number of contexts:** typical project has 3–7. More than ~10 suggests over-decomposition (or the project is genuinely huge); fewer than 3 suggests at least one context is hiding.
- **External systems** appear in the Mermaid diagram with the rounded-cylinder shape `(name)` and the `External:` prefix to make them visually distinct from internal contexts.
- **Direction matters.** `A → B (customer-supplier)` means A is the customer, B the supplier. Reversing the arrow changes the meaning.
- **Open boundary questions** are tracked in this file rather than in `/gsd-list-phase-assumptions` because they're DDD-strategic, not phase-specific.
