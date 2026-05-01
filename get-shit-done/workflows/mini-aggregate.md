<purpose>
Capture one DDD aggregate (root + members + invariants + lifecycle + boundaries + concurrency) and emit a DFA state-table skeleton derived from its lifecycle. Output feeds /gsd-mini-event-storm, /gsd-mini-storage, and /gsd-dfa-model.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="validate_inputs">
**Check prerequisites and parse the aggregate name.**

```bash
AGGREGATE_NAME="${1:-}"
[ -z "$AGGREGATE_NAME" ] && { echo "Missing aggregate name. Usage: /gsd-mini-aggregate <name> [--context X]"; exit 1; }

PROJECT_FILE=".planning/PROJECT.md"
REQUIREMENTS_FILE=".planning/REQUIREMENTS.md"
[ -f "$PROJECT_FILE" ] || { echo "Missing $PROJECT_FILE — run /gsd-new-project first"; exit 1; }
[ -f "$REQUIREMENTS_FILE" ] || { echo "Missing $REQUIREMENTS_FILE — run /gsd-new-project first"; exit 1; }

CONTEXT_MAP=".planning/ddd/CONTEXT-MAP.md"
UBIQUITOUS_LANGUAGE=".planning/ddd/UBIQUITOUS-LANGUAGE.md"
HAS_CONTEXT_MAP=0; [ -f "$CONTEXT_MAP" ] && HAS_CONTEXT_MAP=1
HAS_UL=0; [ -f "$UBIQUITOUS_LANGUAGE" ] && HAS_UL=1

# Slug for filenames: lowercase, dashes
AGGREGATE_SLUG=$(echo "$AGGREGATE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '--' | sed 's/[^a-z0-9-]//g')

DDD_DIR=".planning/ddd"
DFA_DIR=".planning/dfa"
mkdir -p "$DDD_DIR" "$DFA_DIR"
AGGREGATE_FILE="$DDD_DIR/AGGREGATE-${AGGREGATE_NAME}.md"
DFA_SKELETON_FILE="$DFA_DIR/DFA-${AGGREGATE_SLUG}.md"
```

If `AGGREGATE_FILE` already exists, ask whether to regenerate (default: no).

If `CONTEXT_MAP` is missing, warn but continue: "Recommended to run `/gsd-mini-domain` first so aggregates know which bounded context they belong to. Continuing without context resolution."
</step>

<step name="parse_flags">
**Parse mode flags.**

```
AUTO_MODE=false
NO_DFA_SKELETON=false
TEXT_MODE=false
CONTEXT=""

[[ "$ARGUMENTS" =~ --auto ]] && AUTO_MODE=true
[[ "$ARGUMENTS" =~ --no-dfa-skeleton ]] && NO_DFA_SKELETON=true
[[ "$ARGUMENTS" =~ --text ]] && TEXT_MODE=true
# Extract --context value
CONTEXT=$(echo "$ARGUMENTS" | grep -oE '\-\-context[= ]+\S+' | sed 's/^--context[= ]*//')
```

**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call below with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.
</step>

<step name="resolve_context">
**Determine which bounded context this aggregate lives in.**

If `--context X` was provided and `CONTEXT_MAP` exists, validate `X` appears as a `## [Context Name]` heading. If not, list valid contexts and ask the user to pick one.

If `--context` was not provided:
- `--auto` mode: AI infers from REQUIREMENTS.md and CONTEXT-MAP.md by best match (purpose alignment + naming)
- Interactive: AskUserQuestion with the list of contexts from CONTEXT-MAP.md plus "Other (no context yet)"

If no `CONTEXT_MAP` exists, set `CONTEXT="(unspecified)"` and proceed; document the decision in the aggregate file's frontmatter so later runs of `/gsd-mini-domain` can backfill.
</step>

<step name="propose_aggregate_structure">
**AI proposes the aggregate skeleton; user refines.**

Based on REQUIREMENTS.md and (if available) the context's core terms in UBIQUITOUS-LANGUAGE.md, draft:

- **Root entity:** the aggregate root (the only entity outside the aggregate can hold a reference to). Name + identity strategy (UUID / natural key / composite).
- **Member entities:** entities owned by this aggregate (only the root can mutate them). Each with name + identity scope (only unique within the aggregate).
- **Value objects:** immutable types defined by their attributes (no identity), e.g., `Money`, `Address`, `OrderLineItem`.
- **External references:** other aggregates this one points at by ID only (NOT by direct reference — DDD rule).

Show the draft. In `--auto` mode, accept as-is. Otherwise loop with AskUserQuestion to refine.

**Common smells to flag:**
- "List of N children" usually means a member entity, NOT a value object (entities have lifecycles)
- Direct reference to another aggregate root → must be replaced with ID reference (warn)
- Aggregate covering >7 entities → likely too large; suggest splitting
</step>

<step name="capture_invariants">
**Enumerate the business rules that must always be true for this aggregate.**

Invariants are **testable predicates** — each one can be evaluated true/false against an aggregate snapshot.

Examples (good):
- "Order total equals the sum of line item subtotals"
- "An Order in `SHIPPED` state must have a non-null shipping address"
- "Subscription cannot be in both `TRIAL` and `PAID` simultaneously"

Anti-examples (bad — not invariants):
- "Customers should be notified when their order ships" (this is a policy / side effect, not an invariant)
- "Orders are usually paid within 7 days" (probabilistic, not always true)

Workflow: AskUserQuestion to list invariants one at a time, with the format `<predicate> | <why>`. In `--auto`, AI proposes from REQUIREMENTS.md (look for "must", "always", "never", "cannot").

Number invariants `INV-01`, `INV-02`, etc. — these IDs become forbidden-transition IDs (`F-INV-01`, etc.) in the DFA skeleton.
</step>

<step name="capture_lifecycle">
**Define the aggregate's lifecycle states and transitions.**

This section directly seeds the DFA. Capture:

1. **States:** discrete lifecycle phases the aggregate goes through (e.g., `DRAFT`, `PLACED`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`). UPPER_SNAKE_CASE. Include description and any state-specific invariants.
2. **Initial state:** the state the aggregate is born in.
3. **Terminal states:** states that don't transition out (e.g., `DELIVERED`, `CANCELLED`).
4. **Transitions:** ordered or freely-routed? List each transition as `<from> --[<trigger>]--> <to>`. The trigger name is a placeholder if events haven't been event-stormed yet.

Workflow:
- AskUserQuestion: "List the lifecycle states this aggregate goes through."
- AskUserQuestion per pair: "Can <state-A> transition to <state-B>? If yes, what triggers it?"
- AI fills in the transition graph
- In `--auto`, AI proposes from REQUIREMENTS.md verb phrases ("place an order", "cancel a subscription")
</step>

<step name="capture_boundaries">
**Capture what's inside vs outside the aggregate, and how outsiders reach in.**

- **Contained (inside the aggregate):** members and value objects from step 4
- **Referenced (outside, pointed to by ID):** other aggregates this one mentions
- **External actors:** services / users / scheduled jobs that command this aggregate (these will become Commands during event storming)

Default rule: if the question "can this be modified independently of the aggregate root?" is yes, it should be referenced, not contained.
</step>

<step name="capture_concurrency">
**How does this aggregate handle concurrent updates?**

Three common models (pick one or describe a custom):
- **Optimistic locking** — version field; last-writer-fails on conflict. Default for most CRUD aggregates.
- **Pessimistic locking** — explicit lock acquired before mutation. Use when conflicts are expensive to retry.
- **Event-sourced** — append-only log of events; current state is a fold. Use when audit trail is essential or temporal queries matter.
- **Single-writer** — one process is the canonical writer; others read-only. Common for queue-driven aggregates.

In `--auto` mode, default to optimistic. Ask explicitly otherwise.
</step>

<step name="write_aggregate_artifact">
**Compose AGGREGATE-{name}.md from collected sections using the `ddd-aggregate.md` template.**

Frontmatter:
```yaml
---
aggregate: <Name>
context: <bounded context or "(unspecified)">
identity: <uuid | natural-key | composite>
concurrency: <optimistic | pessimistic | event-sourced | single-writer>
status: draft
last_updated: <date>
---
```

Section order: Purpose → Root → Members → Value Objects → Invariants → Lifecycle → Boundaries → Concurrency → Open questions.

Cross-link to CONTEXT-MAP.md if the context is resolved.
</step>

<step name="emit_dfa_skeleton">
**Unless `--no-dfa-skeleton`, emit `.planning/dfa/DFA-{aggregate-slug}.md` derived from the lifecycle.**

The skeleton is a partially-filled `dfa-state-table.md` with:

- **Frontmatter:** `status: draft (skeleton from /gsd-mini-aggregate)`. This signals to `/gsd-dfa-model` that the file is not authoritative until refined.
- **Boundary section:** copied from aggregate's "Contained / Referenced / External actors"
- **States section:** filled from lifecycle states; invariants pulled from per-state notes
- **Events section:** **placeholder rows** with `TBD - run /gsd-mini-event-storm and /gsd-dfa-model to populate`
- **Transitions section:** one row per lifecycle transition captured in step 6, with `T-XX` IDs assigned in declaration order. Trigger column has the lifecycle trigger placeholder; downstream `/gsd-dfa-model` will replace with actual event names.
- **Forbidden transitions section:** one `F-INV-XX` row per invariant captured in step 5. Each forbidden row encodes the invariant as "from any state where INV-XX would be violated, the [trigger] event is forbidden."
- **Completeness matrix section:** sparse — TBD pending event storm.

If the DFA file already exists, do **not** overwrite. Instead:
- Compare lifecycle states vs existing DFA states; report drift
- Suggest the user run `/gsd-dfa-verify` to confirm the existing DFA is still valid given the new aggregate spec

Cross-link in both files: AGGREGATE-{name}.md → DFA-{slug}.md and vice versa.
</step>

<step name="verify">
**Run sanity checks before reporting success.**

Informational checks (don't block; report what fails):
- Every invariant is a predicate (contains a comparison or "must", not a side-effect verb)
- Every lifecycle state appears in the transitions list at least once
- Initial state has no inbound transition (other than from `[*]`)
- Terminal states have no outbound transitions
- If skeleton emitted: skeleton's state count == aggregate lifecycle state count
- If skeleton emitted: skeleton's forbidden-transition count >= invariant count

Report:
```
gsd-mini-aggregate ► DONE
  Aggregate: <Name>
  Context: <Context>
  Members: M / Value objects: V / Invariants: I
  Lifecycle states: S / Transitions: T
  Files: .planning/ddd/AGGREGATE-<Name>.md
[skeleton emitted?]
         .planning/dfa/DFA-<slug>.md (skeleton, status: draft)

  Next: /gsd-dfa-model <slug> --standalone   (refine the DFA skeleton)
        /gsd-mini-event-storm --context <ctx>  (populate events)
```
</step>

</process>

<success_criteria>
- [ ] AGGREGATE-{name}.md written with frontmatter (aggregate, context, identity, concurrency, status)
- [ ] All sections present: Root, Members, Value Objects, Invariants, Lifecycle, Boundaries, Concurrency
- [ ] Every invariant numbered (INV-XX) and stated as a testable predicate
- [ ] Lifecycle has ≥2 states, ≥1 transition, an initial state, ≥1 terminal state
- [ ] Unless --no-dfa-skeleton: DFA-{slug}.md emitted with status: draft and matching states
- [ ] DFA skeleton has one F-INV-XX forbidden-transition entry per invariant
- [ ] If existing DFA-{slug}.md present, no overwrite; drift reported instead
- [ ] Output usable by /gsd-mini-event-storm, /gsd-mini-storage, /gsd-dfa-model
</success_criteria>
