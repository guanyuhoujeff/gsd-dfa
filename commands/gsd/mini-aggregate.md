---
name: gsd:mini-aggregate
description: Define a DDD aggregate — root entity, member entities, value objects, invariants, lifecycle, boundaries, concurrency model. Auto-emits a DFA state-table skeleton derived from the aggregate's lifecycle so /gsd-dfa-model can refine it. Part of the gsd-mini planning-only profile (see docs/GSD-MINI-DESIGN.md §5.2).
argument-hint: "<aggregate-name> [--context <bounded-context>] [--no-dfa-skeleton] [--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Capture one DDD **aggregate** at the tactical-design level. Aggregate boundaries are where transactional consistency lives in DDD; getting them right is the difference between a maintainable model and a tangled one.

By default, this command also emits a DFA skeleton — the aggregate's lifecycle states become the DFA's states, and its invariants become forbidden transitions (F-XX). The skeleton is a starting point that `/gsd-dfa-model` consumes and refines.

Downstream consumers:
- `/gsd-mini-event-storm` reads `AGGREGATE-{name}.md` to know which events affect which aggregate
- `/gsd-mini-storage` reads aggregate boundaries and concurrency model to inform storage choice
- `/gsd-dfa-model` reads the emitted DFA skeleton and refines it (states, events, full transition table)

**Output:**
- `.planning/ddd/AGGREGATE-{name}.md` — aggregate specification
- `.planning/dfa/DFA-{name}.md` — DFA skeleton (unless `--no-dfa-skeleton`); status frontmatter is `draft (skeleton from /gsd-mini-aggregate)`
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/mini-aggregate.md
@~/.claude/get-shit-done/templates/ddd-aggregate.md
@~/.claude/get-shit-done/templates/dfa-state-table.md
</execution_context>

<context>
Required inputs:
- `<aggregate-name>` — first positional argument, e.g., `Order`, `Subscription`, `Project`. Use the domain name, not the database table name.
- `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md`

Recommended inputs (warns if missing, does not block):
- `.planning/ddd/CONTEXT-MAP.md` — used to resolve `--context`
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` — used for term-name validation

Flags:
- `--context <bounded-context>` — Which bounded context this aggregate lives in. If omitted, the workflow asks (or AI infers in `--auto`).
- `--no-dfa-skeleton` — Suppress DFA-{name}.md emission. Default is to emit, per docs/GSD-MINI-DESIGN.md §8.2.
- `--auto` — Skip AskUserQuestion loops; AI proposes the full aggregate from inputs.
- `--text` — Plain-text mode for non-Claude runtimes.
</context>

<process>
Execute the mini-aggregate workflow from `@~/.claude/get-shit-done/workflows/mini-aggregate.md` end-to-end.
</process>

<success_criteria>
- `.planning/ddd/AGGREGATE-{name}.md` exists with: root entity, members, value objects, invariants, lifecycle, boundaries, concurrency model
- Every invariant is a testable assertion (a predicate that's true or false against an aggregate state)
- Lifecycle section lists discrete states with transitions between them
- If `CONTEXT-MAP.md` exists, `--context` is one of the contexts named there (or workflow asks/proposes which one)
- If `UBIQUITOUS-LANGUAGE.md` exists, the aggregate's terms align with the glossary (warn on collision)
- Unless `--no-dfa-skeleton`: `.planning/dfa/DFA-{name}.md` exists with `status: draft` and states matching the aggregate's lifecycle
- Skeleton's forbidden-transition table contains one F-XX entry per invariant
- Output is consumable by `/gsd-mini-event-storm`, `/gsd-mini-storage`, `/gsd-dfa-model`
</success_criteria>
