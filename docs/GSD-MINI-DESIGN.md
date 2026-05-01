# GSD-Mini Design Proposal

**Status:** Draft — not yet implemented
**Author:** initial proposal, 2026-05-01
**Scope:** A planning-only install profile of gsd-dfa that strips execution surface and adds first-class DDD modeling

---

## 1. Vision

**gsd-mini** is the same gsd-dfa system, installed with only the planning, modeling, and specification commands — no `/gsd-execute-phase`, no executor agent, no code-generating workflows. Output is a complete spec deliverable that humans (or other AI tools) can consume to do the actual implementation.

It exists because **planning is the half of gsd-dfa with the highest leverage and the lowest blast radius**. Many users want to design systems carefully without giving an autonomous agent commit access to their codebase.

## 2. Target users

- **Architects and tech leads** who design systems but delegate implementation
- **Product managers** writing specs that engineering teams will implement
- **Consultants and advisors** doing system design without code access
- **Educators** teaching system design, DFA, DDD, behavior trees
- **Pre-implementation phases** of large projects where the spec needs to land before any code is written
- **Mixed-tool teams** that use other tools (Cursor, Copilot, hand-coding) for implementation but want a strong planning layer feeding them

## 3. Scope

### 3.1 v1 surface — included

**Project & milestone lifecycle:**
- `/gsd-new-project` — initialize project with PROJECT.md, REQUIREMENTS.md, ROADMAP.md
- `/gsd-new-milestone`, `/gsd-complete-milestone` — milestone bookends (no `git tag` since there's no code release)
- `/gsd-map-codebase`, `/gsd-scan` — analyze existing code as input to planning (read-only)

**Phase planning:**
- `/gsd-discuss-phase` — adaptive questioning to capture vision
- `/gsd-research-phase` — domain ecosystem research
- `/gsd-list-phase-assumptions` — surface assumptions before planning
- `/gsd-plan-phase` — produce PLAN.md (specifies WHAT, not HOW-to-execute)
- `/gsd-explore` — Socratic ideation
- `/gsd-analyze-dependencies` — phase dependency analysis
- `/gsd-review` — cross-AI peer review of plans

**State machine modeling (DFA family — kept whole):**
- `/gsd-dfa-scan`, `/gsd-dfa-model`, `/gsd-dfa-verify`
- `/gsd-dfa-scenarios`, `/gsd-dfa-btree`
- `/gsd-dfa-tests` — output is **test specifications**, not actual test code
- `/gsd-dfa-audit` — only useful when there's existing code to audit; kept

**Design contracts:**
- `/gsd-ui-phase` — UI design contract (UI-SPEC.md)
- `/gsd-ai-integration-phase` — AI design contract (AI-SPEC.md)

**New DDD layer (this proposal):**
- `/gsd-mini-domain` — ubiquitous language + bounded context map
- `/gsd-mini-aggregate` — aggregate root, entities, value objects, invariants
- `/gsd-mini-event-storm` — domain events, actors, commands, policies (the event-storming canvas, structured)

**Roadmap management:**
- `/gsd-add-phase`, `/gsd-insert-phase`, `/gsd-remove-phase`
- `/gsd-add-backlog`, `/gsd-review-backlog`, `/gsd-plant-seed`
- `/gsd-plan-milestone-gaps`

**Session and state:**
- `/gsd-progress`, `/gsd-resume-work`, `/gsd-pause-work`
- `/gsd-session-report`, `/gsd-stats`, `/gsd-milestone-summary`
- `/gsd-thread`, `/gsd-note`, `/gsd-add-todo`, `/gsd-check-todos`
- `/gsd-next`, `/gsd-do` (router)
- `/gsd-help`, `/gsd-settings`, `/gsd-set-profile`, `/gsd-update`
- `/gsd-workstreams`, `/gsd-list-workspaces`, `/gsd-new-workspace`, `/gsd-remove-workspace`
- `/gsd-health`, `/gsd-intel`, `/gsd-cleanup`, `/gsd-reapply-patches`
- `/gsd-import`, `/gsd-from-gsd2`
- `/gsd-forensics`, `/gsd-profile-user`
- `/gsd-docs-update`

**Verification (planning-side only):**
- `/gsd-verify-work` — adapted to verify spec completeness, not implementation UAT
- `/gsd-audit-milestone` — kept; audits requirement coverage of artifacts
- `/gsd-audit-uat` — kept; cross-phase verification debt audit

### 3.2 v1 surface — excluded

**Execution:**
- `/gsd-execute-phase`, `/gsd-quick`, `/gsd-fast`, `/gsd-autonomous`
- `gsd-executor` agent

**Post-implementation analysis:**
- `/gsd-add-tests` (generates test code) — replaced by `/gsd-dfa-tests` which generates spec
- `/gsd-validate-phase` (Nyquist code validation)
- `/gsd-secure-phase` (security audit of code)
- `/gsd-code-review`, `/gsd-code-review-fix`
- `/gsd-eval-review` (AI implementation eval)
- `/gsd-ui-review` (audit of implementation UI)
- `/gsd-debug` (debugging implementation)
- `/gsd-undo` (revert code commits)
- `/gsd-audit-fix` (autonomous audit-to-fix)

**Shipping:**
- `/gsd-ship` (creates code PR)
- `/gsd-pr-branch` (filters .planning/ from code branch)

**Excluded agents:**
- `gsd-executor`, `gsd-code-reviewer`, `gsd-code-fixer`
- `gsd-security-auditor`, `gsd-nyquist-auditor`
- `gsd-debugger`, `gsd-doc-verifier`
- `gsd-eval-auditor`, `gsd-ui-auditor`
- `gsd-integration-checker`

### 3.3 Out of scope (deferred indefinitely)

- Code generation from spec (would re-introduce execution)
- Automated implementation hand-off to remote AI (different problem domain)
- IDE integration that lints code against spec (separate tool)

## 4. Architecture

### 4.1 Install profile mechanism

**Choice: same npm package, `--profile mini` install flag.**

Rationale: same prompts, same versioning, no fork. The installer (`bin/install.js`) reads a profile manifest that lists which skills/agents/commands to install.

```bash
npx gsd-dfa --profile mini --claude --global
```

The profile manifest lives at `bin/profiles/mini.json`:

```json
{
  "name": "mini",
  "description": "Planning-only profile — no execution",
  "include": {
    "skills": ["gsd-new-project", "gsd-discuss-phase", "gsd-plan-phase",
               "gsd-dfa-*", "gsd-ui-phase", "gsd-ai-integration-phase",
               "gsd-mini-domain", "gsd-mini-aggregate", "gsd-mini-event-storm",
               ...],
    "agents": ["gsd-planner", "gsd-phase-researcher", "gsd-roadmapper",
               "gsd-plan-checker", "gsd-verifier", "gsd-doc-writer",
               "gsd-domain-researcher", ...]
  },
  "exclude_alternative": false
}
```

Default profile remains "full" (current behavior). `--profile full` is equivalent to today's install.

### 4.2 Output is the product

gsd-mini's deliverable is a populated `.planning/` tree, designed to be **handed off** rather than executed against. Every artifact is:

- **Markdown-first** for human review
- **YAML-frontmatter for machine parsing** (downstream tooling consumption)
- **Self-contained** — no implicit references to runtime state

A gsd-mini `.planning/` should be:
1. Committable to a separate `spec/` repo
2. Readable by another AI tool (ChatGPT, Cursor, Copilot) as implementation input
3. Reviewable by a human team without needing the tool installed

### 4.3 Verifier adaptation

`gsd-verifier` agent already has Step 5b (DFA Transition Coverage). For gsd-mini, add Step 5c: **Spec Completeness Coverage** — checks that:

- Every requirement maps to a phase or design contract
- Every phase has a CONTEXT.md, PLAN.md, and where applicable a DFA artifact
- Every aggregate has invariants
- Every domain event in the event storm has a producer and consumer
- No PLAN.md task is in "execute" form (lints away action verbs that imply runtime work)

This step is **only active under `--profile mini`** so the full profile keeps current behavior.

## 5. New DDD commands (this proposal)

Three new commands, each producing one artifact, each integrating with DFA.

### 5.1 `/gsd-mini-domain <name>`

**Produces:** `.planning/ddd/UBIQUITOUS-LANGUAGE.md` + `.planning/ddd/CONTEXT-MAP.md`

**Workflow:**
1. Reads PROJECT.md and REQUIREMENTS.md
2. Asks the user to nominate bounded contexts (with research suggestions)
3. For each context: captures purpose, ownership, integration patterns (anti-corruption layer / shared kernel / customer-supplier / open-host service)
4. Produces a Mermaid context map showing relationships
5. Builds a glossary of domain terms with definitions tied to contexts (so the same word can mean different things in different contexts)

**Integration with downstream:**
- Each bounded context becomes a candidate **scope unit** for DFA modeling
- The ubiquitous language seeds vocabulary for `/gsd-dfa-model` event/state names

### 5.2 `/gsd-mini-aggregate <aggregate-name> [--context <bounded-context>]`

**Produces:** `.planning/ddd/AGGREGATE-{name}.md`

**Captures:**
- Aggregate root entity
- Member entities and value objects
- Invariants (business rules that must always hold)
- Lifecycle (creation conditions, archival conditions)
- Boundaries (what crosses the aggregate? — references vs containment)
- Concurrency model

**Integration:**
- Aggregate lifecycle directly maps to a DFA — the agent will emit a draft `DFA-{aggregate-name}.md` skeleton with states derived from the lifecycle section
- Invariants become **forbidden transitions** (F-XX) in the DFA

### 5.3 `/gsd-mini-event-storm [--context <bounded-context>]`

**Produces:** `.planning/ddd/EVENT-STORM-{context}.md`

**Captures (the standard event-storming sticky-note vocabulary, structured):**
- Domain events (orange) — past tense, things that happened
- Commands (blue) — what triggers events
- Actors (yellow) — who issues commands
- Aggregates (yellow box) — where state lives
- Policies (purple) — when X then Y
- External systems (pink)
- Read models (green) — what queries see
- Hot spots (red) — disagreements / unknowns to resolve

**Integration:**
- Domain events become DFA events (the events column of the transition table)
- Commands become event triggers / sources
- Policies map to scenarios in `/gsd-dfa-scenarios`
- Hot spots become items in `/gsd-list-phase-assumptions`

## 6. DDD ↔ DFA bridge (the killer feature)

The bridge is what makes gsd-mini more valuable than just stripping execution off gsd-dfa:

```
DDD                          DFA
──────────────────────       ─────────────────
Bounded Context        ──→   Scope of one DFA
Aggregate Root         ──→   Subsystem with its own DFA
Aggregate Lifecycle    ──→   States table (initial → terminal)
Domain Events          ──→   Events column
Commands               ──→   Event triggers (sources)
Invariants             ──→   Forbidden transitions (F-XX)
Policies               ──→   Self-loops with conditions (S-XX)
External Systems       ──→   Black-box producers in scenario matrix
Hot Spots              ──→   Unresolved cells in completeness matrix
```

This bidirectional mapping means:
- Doing DDD first gives DFA a complete event/state vocabulary
- Doing DFA first surfaces gaps in the DDD model (states with no producing event = missing command; events with no consumer = orphan event)

The verifier's Step 5c will **cross-check both directions** when DDD artifacts exist.

## 7. Phasing

Suggested implementation order (each is one GSD phase):

| Phase | Deliverable | Test |
|---|---|---|
| **mini-1** | `bin/profiles/mini.json` + installer support for `--profile` flag | Install with `--profile mini`, verify only listed skills land |
| **mini-2** | `/gsd-mini-domain` skeleton + ubiquitous language template | Run on a sample project, verify CONTEXT-MAP.md generated |
| **mini-3** | `/gsd-mini-aggregate` + DFA skeleton emission | Verify AGGREGATE-{name}.md produced and DFA skeleton has matching states |
| **mini-4** | `/gsd-mini-event-storm` + event integration | Verify domain events appear as DFA events in subsequent `/gsd-dfa-model` runs |
| **mini-5** | Verifier Step 5c (spec completeness) | Run on incomplete spec, verify gaps reported |
| **mini-6** | Documentation (DDD-METHODOLOGY.md, GSD-MINI-USER-GUIDE.md) | Manual review |
| **mini-7** | Regression tests (one per profile boundary) | Test that excluded commands are absent under `--profile mini` |

Each phase is a normal GSD phase that can be run with the existing `/gsd-plan-phase` → `/gsd-execute-phase` pipeline (because we're building gsd-mini using gsd-dfa, dogfood-style).

## 8. Open questions

1. **Does `/gsd-mini-event-storm` need a real-time collaborative mode** (e.g., multiple users adding sticky notes)? For v1: assume single-user with the AI as facilitator. Multi-user is a v3 problem.

2. **Should aggregates auto-emit DFA skeletons or require explicit invocation?** Proposed: auto-emit with `--no-dfa-skeleton` opt-out. The friction of running two commands defeats the integration story.

3. **Bounded context discovery — how interactive?** Three options:
   - (a) Pure questioning, AI suggests nothing
   - (b) AI proposes contexts from REQUIREMENTS.md, user accepts/rejects
   - (c) Hybrid: AI proposes, user adds/removes, iterate
   - Proposed: (c)

4. **What about CQRS / event sourcing patterns?** Defer to v2. v1 keeps DDD scope to the strategic-design and tactical-design basics.

5. **Profile name — `mini` vs `planning` vs `spec`?** "mini" suggests "less"; "planning" or "spec" describes intent. Maybe `--profile spec` is clearer. Decide before shipping.

6. **Handoff format** — should there be a `/gsd-mini-export` that bundles `.planning/` into a single tarball + index for handoff? Useful but not blocking v1.

## 9. Risks

- **Vocabulary drift between DDD and DFA artifacts** — mitigated by the verifier Step 5c cross-check
- **Profile divergence over time** — mitigated by profile manifest being the single source of truth for what's IN
- **DDD complexity overwhelming users new to it** — mitigated by `/gsd-mini-domain` having an opinionated default (it works without deep DDD knowledge)
- **gsd-mini becoming the more popular profile and execution surface stagnating** — feature, not bug

## 10. Non-goals

- Not a replacement for gsd-dfa; it's a different install profile
- Not aiming to be a general-purpose DDD tool; the DDD support exists to feed DFA and downstream implementation
- Not optimized for "perfect" DDD per Eric Evans; optimized for **actionable** specs that survive handoff
