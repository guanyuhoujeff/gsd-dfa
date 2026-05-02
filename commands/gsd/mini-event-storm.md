---
name: gsd:mini-event-storm
description: Run a structured event-storming session for one bounded context. Captures the eight standard sticky-note categories (domain events, commands, actors, aggregates, policies, external systems, read models, hot spots) and bridges them into the DFA family — domain events become DFA events, policies become scenarios, hot spots become phase assumptions. Part of the gsd-mini planning-only profile (see docs/GSD-MINI-DESIGN.md §5.3).
argument-hint: "[--context <bounded-context>] [--aggregate <name>] [--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Capture the **dynamic** picture of one bounded context: what happens, in what order, who triggers it, what reacts to it, and what's still uncertain. This is the structured equivalent of a sticky-note event-storming workshop, scoped per bounded context.

The eight sticky-note categories (Alberto Brandolini's vocabulary, structured for AI authoring):

| Color | Category | Definition |
|-------|----------|------------|
| Orange | Domain events | Past-tense facts about what happened (`OrderPlaced`, `PaymentFailed`) |
| Blue | Commands | Imperative verbs that triggered events (`PlaceOrder`, `RetryPayment`) |
| Yellow | Actors | Who issued the command (Customer, Admin, Scheduler, ExternalSystem) |
| Yellow box | Aggregates | Where the state lives (links to existing `AGGREGATE-*.md` if present) |
| Purple | Policies | When-X-then-Y rules that reactively trigger commands |
| Pink | External systems | Systems outside our boundary that emit / consume events |
| Green | Read models | Denormalized views queries hit (links to `STORAGE-*.md` projections) |
| Red | Hot spots | Disagreements, unknowns, things to resolve before moving on |

**Output:** `.planning/ddd/EVENT-STORM-{context}.md`

Downstream consumers per docs/GSD-MINI-DESIGN.md §6:
- `/gsd-dfa-model` — domain events become DFA events; commands become event triggers
- `/gsd-dfa-scenarios` — policies become cross-subsystem scenarios
- `/gsd-list-phase-assumptions` — hot spots become tracked assumptions
- `/gsd-mini-storage` — read models inform projection planning
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/mini-event-storm.md
@~/.claude/get-shit-done/templates/ddd-event-storm.md
</execution_context>

<context>
Required inputs:
- `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md`

Recommended inputs (warns if missing):
- `.planning/ddd/CONTEXT-MAP.md` — for `--context` resolution
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` — for event/command name validation
- `.planning/ddd/AGGREGATE-*.md` — to link aggregates that already exist

Flags:
- `--context <bounded-context>` — Scope to one context. If omitted and `CONTEXT-MAP.md` exists, asks which one.
- `--aggregate <name>` — Narrower scope: only capture events/commands touching one aggregate. Useful when iterating after `/gsd-mini-aggregate`.
- `--auto` — Skip AskUserQuestion loops; AI proposes the full storm from inputs.
- `--text` — Plain-text mode for non-Claude runtimes.
</context>

<process>
Execute the mini-event-storm workflow from `@~/.claude/get-shit-done/workflows/mini-event-storm.md` end-to-end.

The workflow walks each sticky-note category in event-storming-canonical order: events first (the things that happened), then commands and actors (what caused them), then aggregates and read models (where state lives), then policies (reactive logic), then external systems and hot spots (boundary unknowns).
</process>

<success_criteria>
- `.planning/ddd/EVENT-STORM-{context}.md` exists with all eight sticky-note sections
- Frontmatter records context, optional aggregate scope, status, last_updated
- Every domain event is past-tense (e.g., `OrderPlaced`, not `PlaceOrder` or `OrderPlacing`)
- Every command is imperative (e.g., `PlaceOrder`, not `place_order` or `OrderPlaced`)
- Every command has at least one actor; every actor issues at least one command
- Every aggregate referenced exists as `AGGREGATE-{name}.md` (or is flagged as a hot spot if not yet modeled)
- Every policy is in "when X then Y" form; the X is a domain event, the Y is a command
- Read models name the storage they live in (link to `STORAGE-*.md` if present)
- Hot spots have one-line descriptions and are written so `/gsd-list-phase-assumptions` can ingest them
- Output is consumable by `/gsd-dfa-model`, `/gsd-dfa-scenarios`, `/gsd-list-phase-assumptions`
</success_criteria>
