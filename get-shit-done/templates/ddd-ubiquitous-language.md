# Ubiquitous Language Template

Template for `.planning/ddd/UBIQUITOUS-LANGUAGE.md` — a glossary of domain terms scoped per bounded context.

**Purpose:** Force every domain term to be tied to a context. The same word can mean different things in different contexts; collisions must be explicit. Downstream commands (`/gsd-mini-aggregate`, `/gsd-mini-event-storm`, `/gsd-dfa-model`) draw their state and event names from this glossary.

**Downstream consumers:**
- `/gsd-mini-aggregate` — names entities and value objects from this glossary
- `/gsd-mini-event-storm` — names domain events and commands from this glossary
- `/gsd-dfa-model` — names states and events from this glossary
- `/gsd-mini-storage` — uses term definitions to clarify schema field meanings

---

## File Template

```markdown
# Ubiquitous Language

**Last updated:** [date]
**Companion:** [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) — bounded contexts and their integration patterns

> The same word can mean different things in different contexts. This glossary
> is scoped per **bounded context** so collisions are surfaced, not hidden. If
> a term means the same thing everywhere, it appears in only one context (the
> one that owns it) — other contexts reference it via the integration map.

---

## [Context Name 1]

**Purpose:** [one-sentence purpose, mirrors CONTEXT-MAP.md]

### [Term A] (noun / verb / event / state)

- **Definition:** [precise meaning in this context]
- **Examples:**
  - [concrete example 1]
  - [concrete example 2]
- **Counter-example:** [a thing that looks like this term but is NOT]
- **Aliases (discouraged):** [informal synonyms that leak from other contexts]
- **Cross-context note:** [if Term A also exists in Context 2 with different meaning, link to that entry and explain the divergence]

### [Term B]

- ...

---

## [Context Name 2]

**Purpose:** ...

### [Term A] (same word, different meaning)

- **Definition:** [meaning specific to Context 2 — note this is NOT the same as Context 1's "Term A"]
- **Cross-context note:** See [Term A in Context Name 1] for the contrasting meaning. The two are deliberately not unified because [reason].

### [Term C]

- ...

---

## Cross-context collisions

| Term | Context 1 meaning | Context 2 meaning | Why kept separate |
|------|-------------------|-------------------|-------------------|
| [word] | ... | ... | [reason] |
| ... |

---

## Glossary maintenance

- **Add a term:** Define it under the owning context, then `git add` and commit.
- **Move a term across contexts:** Add a Cross-context note in both, document the divergence, do NOT silently rename.
- **Retire a term:** Strike-through (`~~term~~`) for one milestone, then remove. Old usage should still parse.

---

## Sources

- `.planning/PROJECT.md` — vision and target users
- `.planning/REQUIREMENTS.md` — REQ-IDs that surface each term
- `.planning/codebase/STRUCTURE.md` — existing module names that inform context boundaries (brownfield only)
```

---

## Conventions

- **Term names** appear as level-3 headings (`###`) so they're easy to grep and link
- **Context names** appear as level-2 headings (`##`) so the glossary is browsable
- **Sort** contexts in dependency order (most upstream first), then terms alphabetically within a context
- **Definitions** are short (one paragraph max). Long discussion belongs in REQUIREMENTS.md or a `/gsd-discuss-phase` artifact, not here.
- **No infrastructure vocabulary** — say `Order Placed` not `OrderCreatedEvent`. Class names and event names belong in code, not in the ubiquitous language.
