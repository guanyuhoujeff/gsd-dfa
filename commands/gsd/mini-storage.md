---
name: gsd:mini-storage
description: Pick a storage type and write the native schema for one aggregate (or all aggregates in a bounded context). Supports 11 storage families — relational / document / key-value / wide-column / graph / vector / time-series / search / object store / columnar analytics / immutable event log. Two-phase (decision then spec); --storage skips decision. Part of the gsd-mini planning-only profile (see docs/GSD-MINI-DESIGN.md §5.4).
argument-hint: "<aggregate-name> | --context <bounded-context> [--storage <type>] [--with-ops] [--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Capture **how** an aggregate (or all aggregates in a bounded context) is persisted: which storage family, why, and what the schema looks like in that family's native language.

This step is deliberately separate from `/gsd-mini-aggregate` because storage is a **physical choice**, not a business concept. The same aggregate can pick different storages in different contexts or scales — polyglot persistence is the norm, not the exception.

Two phases:
1. **Decision** — AI walks the user through read/write ratio, query patterns, consistency needs, scale, latency budget, existing infra, team familiarity. Outputs a recommended storage type with rationale. (`--storage <type>` skips this phase.)
2. **Specification** — fill in the schema in the chosen storage's native language (SQL DDL, JSON shape, Cypher node-types, Qdrant collection spec, etc.).

**Output:** `.planning/ddd/STORAGE-{aggregate-or-context}.md`

Downstream consumers:
- `/gsd-dfa-model` reads storage choice — persistence-significant events (e.g., `record_committed`, `projection_caught_up`) become candidate DFA events
- `/gsd-dfa-scenarios` reads indexes / access patterns to identify critical-path queries that need scenario coverage
- Implementation handoff: schema is written in native language so downstream tooling (or human implementers) can run it as-is
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/mini-storage.md
@~/.claude/get-shit-done/templates/ddd-storage.md
</execution_context>

<context>
Required inputs:
- Either a positional `<aggregate-name>` matching `.planning/ddd/AGGREGATE-{name}.md`,
  or `--context <bounded-context>` matching a `## [Context Name]` heading in
  `.planning/ddd/CONTEXT-MAP.md`.

Recommended inputs:
- `.planning/ddd/AGGREGATE-{name}.md` — for boundaries and concurrency hints
- `.planning/ddd/EVENT-STORM-{context}.md` — for query pattern hints (when present)
- `.planning/ddd/CONTEXT-MAP.md` — for context resolution

Flags:
- `--storage <type>` — Skip phase 1 (decision); use the named storage type directly. Valid values: relational, document, key-value, wide-column, graph, vector, time-series, search, object-store, columnar-analytics, event-log
- `--with-ops` — Emit the optional Operations section (backup / replication / sharding). Default off to avoid early over-specification.
- `--auto` — Skip AskUserQuestion loops; AI proposes the full storage spec.
- `--text` — Plain-text mode for non-Claude runtimes.
</context>

<process>
Execute the mini-storage workflow from `@~/.claude/get-shit-done/workflows/mini-storage.md` end-to-end.

Default scope is **per-aggregate**. Pass `--context <name>` to scope per-bounded-context (one shared storage spec for all aggregates in that context).
</process>

<success_criteria>
- `.planning/ddd/STORAGE-{aggregate-or-context}.md` exists with frontmatter (aggregate or context, storage_type, storage_engine, consistency, scope, schema_version)
- Decision rationale section explains *why this storage*, *what alternatives were considered*, and *what inputs were surveyed* (read/write ratio, query patterns, scale, latency, infra, team)
- Schema section is in the chosen storage's native language (no pseudocode, no abstract field lists)
- Indexes / access patterns section is present (storage-native; absent only if storage type genuinely has no concept of indexes — e.g., raw object store)
- Query patterns section lists expected queries with frequency / latency target
- Projections section present (lightweight — only mentions read-model views in other stores; full CQRS deferred to v2)
- Compliance section present (PII fields, retention, encryption, region constraints)
- Operations section emitted only when `--with-ops` is set
- Output is consumable by `/gsd-dfa-model` and `/gsd-dfa-scenarios`
</success_criteria>
