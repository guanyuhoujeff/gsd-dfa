---
name: gsd:mini-domain
description: Capture the strategic DDD layer for a project — the ubiquitous language (per bounded context) and the bounded-context map (with integration patterns). Produces .planning/ddd/UBIQUITOUS-LANGUAGE.md and .planning/ddd/CONTEXT-MAP.md. Part of the gsd-mini planning-only profile (see docs/GSD-MINI-DESIGN.md).
argument-hint: "[--auto] [--from-requirements]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Build the strategic DDD foundation for a project: the **ubiquitous language** (domain terms scoped per bounded context — the same word can have different meanings in different contexts) and the **bounded-context map** (which contexts exist, who owns each, how they integrate).

Downstream consumers:
- `/gsd-mini-aggregate` reads CONTEXT-MAP.md to know which context an aggregate lives in
- `/gsd-mini-event-storm` scopes event storming per context
- `/gsd-mini-storage` may inherit consistency / region constraints from the context's integration pattern
- `/gsd-dfa-model` uses the ubiquitous language to name states and events

**Output:**
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` — glossary of domain terms, scoped by context
- `.planning/ddd/CONTEXT-MAP.md` — bounded contexts list + Mermaid relationship diagram + integration patterns
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/mini-domain.md
@~/.claude/get-shit-done/templates/ddd-ubiquitous-language.md
@~/.claude/get-shit-done/templates/ddd-context-map.md
</execution_context>

<context>
Inputs:
- `.planning/PROJECT.md` — vision, target users, core capabilities (required)
- `.planning/REQUIREMENTS.md` — scoped requirements (required)
- `.planning/codebase/STRUCTURE.md` — directory layout (optional, brownfield)
- `.planning/codebase/ARCHITECTURE.md` — existing layers (optional, brownfield)

Flags:
- `--auto` — Skip interactive questioning; AI proposes contexts directly from REQUIREMENTS.md and writes both files. Use for fast iteration; review and refine after.
- `--from-requirements` — Force re-derivation from REQUIREMENTS.md, ignoring any prior CONTEXT-MAP.md. Useful after major requirement changes.
</context>

<process>
Execute the mini-domain workflow from `@~/.claude/get-shit-done/workflows/mini-domain.md` end-to-end.

Default flow is hybrid (option (c) per docs/GSD-MINI-DESIGN.md §8.3): AI proposes bounded contexts from REQUIREMENTS.md, user accepts/rejects/adds, iterate until stable.
</process>

<success_criteria>
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` exists with at least one domain term per identified bounded context
- `.planning/ddd/CONTEXT-MAP.md` exists with: bounded contexts list, ownership, integration patterns (anti-corruption layer / shared kernel / customer-supplier / open-host service / conformist / partnership), Mermaid diagram
- Every term in UBIQUITOUS-LANGUAGE.md is scoped to at least one context
- Every context appears in both files (no orphans)
- If two contexts use the same term differently, the difference is captured explicitly
- Output is consumable by `/gsd-mini-aggregate`, `/gsd-mini-event-storm`, `/gsd-dfa-model`
</success_criteria>
