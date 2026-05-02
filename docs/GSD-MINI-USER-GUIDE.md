# gsd-mini User Guide

End-to-end tutorial for the planning-only profile of `gsd-dfa`. For why and how the profile exists, see [`docs/GSD-MINI-DESIGN.md`](./GSD-MINI-DESIGN.md). For DDD methodology, see [`docs/DDD-METHODOLOGY.md`](./DDD-METHODOLOGY.md). For the full execution-included profile, see the main [README](../README.md) and [`docs/USER-GUIDE.md`](./USER-GUIDE.md).

---

## Table of Contents

- [What gsd-mini is](#what-gsd-mini-is)
- [Who it's for](#who-its-for)
- [Installation](#installation)
- [Quick start](#quick-start)
- [The four DDD commands](#the-four-ddd-commands)
- [The DDD ↔ DFA bridge in practice](#the-ddd--dfa-bridge-in-practice)
- [Verifier Step 5c](#verifier-step-5c)
- [When to use mini vs full](#when-to-use-mini-vs-full)
- [Handoff to implementers](#handoff-to-implementers)
- [Troubleshooting](#troubleshooting)
- [Command reference](#command-reference)

---

## What gsd-mini is

A planning-only install of `gsd-dfa`. Same npm package, same prompts, but the `--profile mini` flag installs only the commands that **describe** systems, not the ones that **build** them. No `gsd-executor`, no `/gsd-execute-phase`, no autonomous code-writing agents. Output is a populated `.planning/` tree designed to be **handed off** — to humans, to other AI tools, or to your future self.

The differentiator: gsd-mini packages four DDD commands (`/gsd-mini-domain`, `/gsd-mini-aggregate`, `/gsd-mini-event-storm`, `/gsd-mini-storage`) that wire directly into the existing DFA family. Doing DDD generates DFA inputs; running DFA verifies the DDD model.

## Who it's for

- **Architects and tech leads** designing systems but delegating implementation
- **Product managers** writing specs that engineering teams will implement
- **Consultants and advisors** doing system design without code access
- **Educators** teaching system design, DFA, DDD, behavior trees
- **Pre-implementation phases** of large projects where the spec needs to land before any code is written
- **Mixed-tool teams** that use other tools (Cursor, Copilot, hand-coding) for implementation but want a strong planning layer feeding them

## Installation

```bash
# From npm (once published)
npx gsd-dfa --profile mini --claude --global

# From this repo (current path until npm release)
node bin/install.js --profile mini --claude --global
```

The `--profile mini` flag tells the installer to filter to a curated subset (60 commands + 20 agents) instead of the full 78+29. Default install (no flag) is unchanged — `--profile full` and no flag both install everything.

To install for a different runtime, swap `--claude` for `--opencode`, `--gemini`, `--cursor`, etc. The profile filter applies regardless of runtime.

## Quick start

Five commands, end to end. All run inside any project directory (greenfield or brownfield).

```bash
# 1. Initialize the planning tree
/gsd-new-project

# 2. Strategic DDD: contexts and ubiquitous language
/gsd-mini-domain

# 3. Per aggregate: tactical structure (auto-emits DFA skeleton)
/gsd-mini-aggregate Order --context Sales

# 4. Per context: event storm (eight sticky-note categories)
/gsd-mini-event-storm --context Sales

# 5. Per aggregate: storage decision and native schema
/gsd-mini-storage Order

# 6. Refine the auto-emitted DFA skeleton
/gsd-dfa-model order --standalone
/gsd-dfa-verify --standalone

# 7. Verify spec completeness
/gsd-verify-work
```

After step 7 you have a complete `.planning/` tree:

```
.planning/
├── PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md
├── ddd/
│   ├── UBIQUITOUS-LANGUAGE.md
│   ├── CONTEXT-MAP.md
│   ├── AGGREGATE-Order.md
│   ├── EVENT-STORM-Sales.md
│   └── STORAGE-Order.md
└── dfa/
    └── DFA-order.md         # refined from auto-emitted skeleton
```

## The four DDD commands

### 1. `/gsd-mini-domain` — strategic decomposition

**When to run:** First thing after `/gsd-new-project`. Sets the boundary lines for everything that follows.

**Produces:**
- `.planning/ddd/UBIQUITOUS-LANGUAGE.md` — glossary scoped per bounded context
- `.planning/ddd/CONTEXT-MAP.md` — contexts, ownership, integration patterns, Mermaid map

**Default flow** is hybrid (option (c) per [GSD-MINI-DESIGN §8.3](./GSD-MINI-DESIGN.md)): AI proposes contexts from REQUIREMENTS.md, you accept/reject/add, iterate.

**Flags:**
- `--auto` — Skip questioning; AI picks recommended defaults
- `--from-requirements` — Re-derive from REQUIREMENTS.md, ignoring any prior CONTEXT-MAP.md

### 2. `/gsd-mini-aggregate <Name>` — tactical structure

**When to run:** Once per aggregate, after the strategic map exists. Each aggregate is the unit of transactional consistency in a context.

**Produces:**
- `.planning/ddd/AGGREGATE-{Name}.md` — root, members, value objects, invariants, lifecycle, boundaries, concurrency
- `.planning/dfa/DFA-{slug}.md` — auto-emitted DFA skeleton (default-on; `--no-dfa-skeleton` opts out)

The skeleton is the killer feature: lifecycle states become DFA states, invariants become forbidden transitions (`F-INV-XX`). `/gsd-dfa-model` then refines it.

**Flags:**
- `--context <name>` — Bounded context membership (validates against CONTEXT-MAP.md)
- `--no-dfa-skeleton` — Suppress DFA emission
- `--auto`, `--text`

### 3. `/gsd-mini-event-storm` — behavior dynamics

**When to run:** Per context, after aggregates are defined. Surfaces the dynamic picture: what happens, who triggers it, what reacts.

**Produces:** `.planning/ddd/EVENT-STORM-{context}.md` covering all eight sticky-note categories:

| Color | Category | Form |
|-------|----------|------|
| 🟠 orange | Domain events | Past-tense PascalCase (`OrderPlaced`) |
| 🔵 blue | Commands | Imperative PascalCase (`PlaceOrder`) |
| 🟡 yellow | Actors | Roles / systems |
| 🟨 yellow box | Aggregates | Links to `AGGREGATE-*.md` |
| 🟣 purple | Policies | "When EV-XX then CMD-YY" |
| 🌸 pink | External systems | Boundary parties |
| 🟢 green | Read models | Links to `STORAGE-*.md` projections |
| 🔴 red | Hot spots | Tracked unknowns / disagreements |

The artifact ends with a paste-in DFA event vocabulary block ready for `/gsd-dfa-model`.

**Flags:**
- `--context <name>` — Required if multiple contexts exist
- `--aggregate <name>` — Narrows to events touching one aggregate
- `--auto`, `--text`

### 4. `/gsd-mini-storage` — persistence physics

**When to run:** Per aggregate (or per context for shared transactional storage). Makes the storage decision explicit and writes the schema in the chosen storage's native language.

**Produces:** `.planning/ddd/STORAGE-{aggregate-or-context}.md`

**Two-phase workflow:**
1. **Decision** — survey 7 dimensions (read/write ratio, query patterns, consistency, scale, latency, infra, team) → AI proposes storage type with rationale
2. **Specification** — fill schema in native language (SQL DDL / JSON shape / CQL / Cypher / Qdrant collection / Influx measurement / Elasticsearch mapping / S3 layout / ClickHouse DDL / Kafka topic)

**Eleven supported storage families:** relational, document, key-value, wide-column, graph, vector, time-series, search, object-store, columnar-analytics, event-log.

**Flags:**
- `--storage <type>` — Skip decision phase if you already know the choice
- `--context <name>` — Per-context scope instead of per-aggregate
- `--with-ops` — Emit optional Operations section (backup / replication / sharding)
- `--auto`, `--text`

## The DDD ↔ DFA bridge in practice

The four DDD commands feed directly into the DFA family. After running the four:

```bash
/gsd-dfa-model <slug> --standalone    # consumes the skeleton + event vocabulary
/gsd-dfa-verify --standalone          # confirms no dead states or unhandled events
/gsd-dfa-scenarios                    # cross-aggregate policies → scenario matrix
/gsd-dfa-btree --level 1              # top-down behavior tree
```

The bridge table (full mapping in [DDD-METHODOLOGY.md](./DDD-METHODOLOGY.md#ddd--dfa-bridge)):

| DDD | → DFA |
|-----|-------|
| Aggregate root | Subsystem with its own DFA |
| Aggregate lifecycle | States table |
| Invariants | Forbidden transitions (F-INV-XX) |
| Domain events | Events column |
| Policies | Cross-subsystem scenarios |
| Hot spots | Tracked phase assumptions |

## Verifier Step 5c

When `.planning/ddd/` artifacts exist, `/gsd-verify-work` runs an additional **Step 5c: Spec Completeness Coverage** with five sub-checks:

| # | Check | Pass | Fail status |
|---|-------|------|-------------|
| 5c.1 | Every `REQ-XX` referenced in ≥1 phase or design contract | COVERED | **ORPHAN** |
| 5c.2 | Every phase dir has CONTEXT.md or PLAN.md (stateful needs DFA) | COMPLETE | **STUB** / **MISSING-DFA** |
| 5c.3 | Every `AGGREGATE-*.md` has ≥1 `INV-XX` | HAS-INVARIANTS | **NO-INVARIANTS** |
| 5c.4 | Every `EV-XX` has both producer and consumer | COMPLETE | **NO-PRODUCER** / **NO-CONSUMER** / **ORPHAN** |
| 5c.5 | PLAN.md tasks free of execution-leak verbs (`implement`, `deploy`, `ship`, `commit`, `spawn`, ...) | clean | **WARN** (not blocker) |

The Spec Score line at the bottom of `VERIFICATION.md` summarizes coverage as a single ratio.

## When to use mini vs full

| Situation | Use |
|-----------|-----|
| Designing a system, not yet implementing it | **mini** |
| Implementation will be done by humans, in a different repo, or by a different AI tool | **mini** |
| You want planning artifacts a stakeholder can read without installing the tool | **mini** |
| Implementation will happen *here*, with this AI agent, autonomously | **full** |
| You want the executor agent to commit code in waves | **full** |
| Mixed: design here, implement separately | start with **mini**, switch to **full** later by re-running install |

You can switch profiles at any time by re-running the installer. The artifacts under `.planning/` are profile-agnostic.

## Handoff to implementers

A populated `.planning/` from gsd-mini is designed to be readable by:

1. **A human implementer** — every artifact is Markdown-first; no tool installation needed
2. **Another AI tool** — every artifact has YAML frontmatter for machine parsing
3. **The full `gsd-dfa` profile** — re-install with `--profile full` and `/gsd-execute-phase` consumes the same artifacts

Recommended handoff package:
- `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`
- `.planning/ddd/` (all four artifacts per context/aggregate)
- `.planning/dfa/` (refined state tables)
- `.planning/phases/*/PLAN.md` (one per phase)
- `VERIFICATION.md` from the most recent `/gsd-verify-work` run

This is exactly what `git diff --stat .planning/` shows after running the quick-start sequence.

## Troubleshooting

### `/gsd-mini-domain` says "missing PROJECT.md"

You haven't run `/gsd-new-project` yet. Run it first.

### `/gsd-mini-aggregate` complains "context X not found in CONTEXT-MAP.md"

Either the context name is wrong (check `CONTEXT-MAP.md` for valid names) or you skipped `/gsd-mini-domain`. The aggregate workflow can still run with `context = (unspecified)` — it just won't validate the membership and will flag a hot spot reminding you to run `/gsd-mini-domain` later.

### `/gsd-mini-aggregate` overwrote my refined DFA file

It shouldn't — the workflow checks for an existing `DFA-{slug}.md` and refuses to overwrite, reporting drift instead. If you're seeing overwrites, file a bug.

### Step 5c reports `ORPHAN` requirements

Either (a) the requirement is genuinely uncovered — write a phase or design contract that addresses it, or (b) the requirement is mentioned by content but not by ID — add the `REQ-XX` ID into the artifact body so the grep finds it.

### Step 5c reports `NO-CONSUMER` for an event

Either (a) the event is genuinely orphan — delete it or add a policy that reacts to it, or (b) you have the consumer but it's not in event-storm vocabulary — add a `POL-XX` row, an `RM-XX` row, or an `EXT-XX` row that references the event.

### Step 5c reports execution-leak verbs in PLAN.md

Rewrite the task in spec form: "specify X" / "decide Y" / "model Z" instead of "implement X" / "deploy Y" / "build Z". The point of mini profile is that PLANs are specifications, not execution scripts.

### `/gsd-execute-phase` doesn't exist

You're on `--profile mini` — execution surface is intentionally absent. Either re-install with `--profile full` to add it, or hand off the planning tree to a separate implementation tool.

### How do I add `mini-domain` to an existing full-profile install?

Re-run the installer; any profile change is non-destructive (your artifacts under `.planning/` survive, and the installer preserves any local `dev-preferences.md` etc.).

## Command reference

For complete command listings, run `/gsd-help`. The DDD-specific commands:

| Command | Produces |
|---------|----------|
| `/gsd-mini-domain [--auto] [--from-requirements] [--text]` | UBIQUITOUS-LANGUAGE.md + CONTEXT-MAP.md |
| `/gsd-mini-aggregate <Name> [--context X] [--no-dfa-skeleton] [--auto] [--text]` | AGGREGATE-{Name}.md + draft DFA-{slug}.md |
| `/gsd-mini-event-storm [--context X] [--aggregate Y] [--auto] [--text]` | EVENT-STORM-{context}.md |
| `/gsd-mini-storage <Name> \| --context X [--storage T] [--with-ops] [--auto] [--text]` | STORAGE-{Name-or-Context}.md |

For DFA family commands, see [`docs/DFA-METHODOLOGY.md`](./DFA-METHODOLOGY.md).

For the full design rationale and open questions, see [`docs/GSD-MINI-DESIGN.md`](./GSD-MINI-DESIGN.md).
