<purpose>
Run a structured event-storming session for one bounded context. Capture the eight sticky-note categories in event-storming-canonical order. Output feeds /gsd-dfa-model (events), /gsd-dfa-scenarios (policies), /gsd-list-phase-assumptions (hot spots), and /gsd-mini-storage (read models).
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="validate_inputs">
**Check prerequisites and resolve scope.**

```bash
PROJECT_FILE=".planning/PROJECT.md"
REQUIREMENTS_FILE=".planning/REQUIREMENTS.md"
[ -f "$PROJECT_FILE" ] || { echo "Missing $PROJECT_FILE — run /gsd-new-project first"; exit 1; }
[ -f "$REQUIREMENTS_FILE" ] || { echo "Missing $REQUIREMENTS_FILE — run /gsd-new-project first"; exit 1; }

DDD_DIR=".planning/ddd"
CONTEXT_MAP="$DDD_DIR/CONTEXT-MAP.md"
UBIQUITOUS_LANGUAGE="$DDD_DIR/UBIQUITOUS-LANGUAGE.md"
HAS_CONTEXT_MAP=0; [ -f "$CONTEXT_MAP" ] && HAS_CONTEXT_MAP=1
HAS_UL=0; [ -f "$UBIQUITOUS_LANGUAGE" ] && HAS_UL=1

mkdir -p "$DDD_DIR"
```

If neither `CONTEXT_MAP` nor `--context` is given, warn: "Recommended to run `/gsd-mini-domain` first to map bounded contexts. Continuing with context = '(unspecified)'."
</step>

<step name="parse_flags">
**Parse mode flags.**

```
AUTO_MODE=false
TEXT_MODE=false
CONTEXT=""
AGGREGATE=""

[[ "$ARGUMENTS" =~ --auto ]] && AUTO_MODE=true
[[ "$ARGUMENTS" =~ --text ]] && TEXT_MODE=true
CONTEXT=$(echo "$ARGUMENTS" | grep -oE '\-\-context[= ]+\S+' | sed 's/^--context[= ]*//')
AGGREGATE=$(echo "$ARGUMENTS" | grep -oE '\-\-aggregate[= ]+\S+' | sed 's/^--aggregate[= ]*//')
```

**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call below with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.
</step>

<step name="resolve_context">
**Determine which bounded context this storm covers.**

If `CONTEXT` is set and `CONTEXT_MAP` exists, validate the context appears as a `## [Context Name]` heading; if not, list valid contexts and ask the user to pick.

If `CONTEXT` is empty:
- `CONTEXT_MAP` exists: AskUserQuestion (or AI infers in `--auto`) which context from the list
- No `CONTEXT_MAP`: set `CONTEXT="(unspecified)"` and add a hot spot in step 11 noting that contexts haven't been mapped

```bash
CONTEXT_SLUG=$(echo "$CONTEXT" | tr '[:upper:] ' '[:lower:]-' | sed 's/[^a-z0-9-]//g')
EVENT_STORM_FILE="$DDD_DIR/EVENT-STORM-${CONTEXT}.md"
```

If `EVENT_STORM_FILE` exists, ask whether to regenerate (default: no) or to merge new findings into the existing file.
</step>

<step name="capture_domain_events">
**Capture domain events (orange stickies) — past-tense facts.**

Domain events are things that **already happened** in the business — atomic, past-tense, business-meaningful. Examples:
- `OrderPlaced`, `PaymentSucceeded`, `PaymentFailed`, `OrderShipped`, `OrderCancelled`
- `SubscriptionRenewed`, `TrialExpired`
- `DocumentUploaded`, `AbstractExtracted`

Anti-examples (these are NOT events):
- `PlaceOrder` (imperative — that's a command)
- `OrderPlacing` (continuous tense — events are atomic, not in-progress)
- `Order` (no verb — that's an aggregate or noun)
- `User clicked button` (UI mechanic, not business-meaningful)

Workflow:
- AskUserQuestion / AI proposal: list domain events that occur in this context
- For each: capture name (PascalCase past tense), one-line meaning, and which aggregate(s) it's emitted from (if known; placeholder otherwise)
- Sort chronologically along the typical happy path; later steps will use this order to detect missing commands/policies

In `--auto`, AI extracts past-tense candidates from REQUIREMENTS.md verb phrases and aggregate lifecycles in `AGGREGATE-*.md` files.

Number events `EV-01`, `EV-02`, …
</step>

<step name="capture_commands">
**Capture commands (blue stickies) — imperative verbs.**

For each domain event from step 4, identify the command that triggers it. Commands are **imperative** (`PlaceOrder` produces `OrderPlaced`).

Naming rule: command and event are usually present-imperative + past-perfect of the same verb (`PlaceOrder` → `OrderPlaced`, `RenewSubscription` → `SubscriptionRenewed`).

Workflow:
- For each event without a command, ask: "what triggered this?"
- A command can produce 0+ events (failure → no event; happy path → 1 event; complex → multiple events)
- A command can fail — capture the failure as a separate event (`OrderRejected`, `PaymentFailed`)
- Number commands `CMD-01`, `CMD-02`, …
- Link each command to the event(s) it produces

Smell: if a command produces no events, it's probably a query, not a command. Flag as hot spot.
</step>

<step name="capture_actors">
**Capture actors (yellow stickies) — who issues commands.**

For each command, identify the actor: external user, internal user role, scheduled job, external system, or another aggregate.

Common actor categories:
- End users (Customer, Subscriber, Reader)
- Internal roles (Admin, Moderator, Reviewer)
- Scheduled jobs (Scheduler, Cron, RetryWorker)
- External systems (StripeWebhook, GitHubWebhook)
- Other aggregates (cross-aggregate command emission via policy → see step 8)

Number actors `ACT-01`, `ACT-02`, …

Validate: every command has ≥1 actor; every actor issues ≥1 command.
</step>

<step name="capture_aggregates">
**Capture aggregates (yellow box stickies) — where state lives.**

For each event/command, identify which aggregate it touches.

Workflow:
- Read `AGGREGATE-*.md` files in `.planning/ddd/`. For each event, link to the matching aggregate.
- If an event touches an aggregate that hasn't been modeled (`AGGREGATE-*.md` missing), don't fabricate — record it as a hot spot in step 11 ("aggregate `X` referenced by EV-NN but not yet modeled — run `/gsd-mini-aggregate X`").
- If an event spans two aggregates, that's a strong smell — usually means one of them should emit a domain event the other reacts to via a policy. Surface this in step 8.

In `--auto`, AI matches event names to aggregate lifecycle states and infers ownership.
</step>

<step name="capture_policies">
**Capture policies (purple stickies) — when-X-then-Y rules.**

A policy is a reactive rule: **when** a domain event happens, **then** a command is issued. Policies are how aggregates collaborate without holding direct references to each other.

Form: `When <EV-XX> then issue <CMD-YY>` (with optional guard: `unless <condition>`).

Examples:
- When `OrderPlaced` then issue `ReserveInventory`
- When `PaymentFailed` then issue `NotifyCustomer` (unless `RetryAttemptsRemaining`)
- When `TrialExpired` then issue `DowngradeToFree` (unless `PaymentMethodValid`)

Workflow:
- Walk through events in chronological order; for each event, ask "what should happen next?" — that's a policy candidate
- Number policies `POL-01`, `POL-02`, …
- Cross-aggregate policies are the most important — they reveal coupling that should be event-driven, not synchronous

These policies become **scenarios** in `/gsd-dfa-scenarios` (cross-subsystem state combinations).
</step>

<step name="capture_external_systems">
**Capture external systems (pink stickies) — boundary parties.**

Systems outside our service boundary that emit events we consume or consume events we emit.

Examples:
- Payment processors (Stripe, PayPal)
- Email/SMS providers (SendGrid, Twilio)
- Identity providers (Auth0, Cognito)
- Analytics (Segment, Mixpanel)
- Webhooks from upstream platforms

For each external system, capture:
- Name and role
- Events we consume from it (link to corresponding `EV-XX`)
- Events we emit to it (or commands they issue against us — webhooks)
- Integration pattern (link back to `CONTEXT-MAP.md` integration table if present)

Number `EXT-01`, `EXT-02`, …
</step>

<step name="capture_read_models">
**Capture read models (green stickies) — denormalized views queries hit.**

For each major UI screen, report, or API query, identify what view of the data it needs. Each view that's not a direct read of a single aggregate is a read model.

Examples:
- Customer order history (denormalized join across Order + Product + Customer)
- Search index over papers (Elasticsearch projection of `Paper` aggregate)
- Daily revenue dashboard (aggregation over `OrderPaid` events)

For each read model, capture:
- Name and what it shows
- Source events that update it (which `EV-XX`)
- Storage where it lives — link to `STORAGE-*.md` if present, or note "TBD: needs `/gsd-mini-storage`"

Number `RM-01`, `RM-02`, …

Read models inform `/gsd-mini-storage`'s Projections section.
</step>

<step name="capture_hot_spots">
**Capture hot spots (red stickies) — disagreements / unknowns / parking-lot items.**

Anything in the storm that's:
- Unclear ("does refund logic belong to Sales or Billing?")
- Contested (two stakeholders disagree)
- Not yet decided ("TBD: which storage for the audit log?")
- Discovered to be missing (aggregate referenced but not yet modeled)
- Discovered policy ambiguity ("when X then Y or Z?")

Number `HS-01`, `HS-02`, …

These hot spots are written so `/gsd-list-phase-assumptions` can ingest them — each hot spot becomes a tracked assumption that must be resolved before the spec is `locked`.

If `--auto` mode and the AI surfaces ambiguity it can't resolve from inputs, capture it as a hot spot rather than guessing.
</step>

<step name="write_artifact">
**Compose EVENT-STORM-{context}.md from the eight collected sections using the `ddd-event-storm.md` template.**

Frontmatter:
```yaml
---
context: <Context Name>
aggregate: <name or null>     # null if storm covers the whole context
events_count: N
commands_count: N
actors_count: N
aggregates_count: N
policies_count: N
externals_count: N
read_models_count: N
hot_spots_count: N
status: draft
last_updated: <date>
---
```

Section order: Domain events → Commands → Actors → Aggregates → Policies → External systems → Read models → Hot spots → Mermaid event-flow diagram → Open boundary questions.

Cross-link:
- Each aggregate entry → `../ddd/AGGREGATE-<name>.md`
- Each read model entry (if storage resolved) → `../ddd/STORAGE-<name>.md`
- Each external system → `../ddd/CONTEXT-MAP.md` integration table row
- Hot spots section header notes downstream consumption by `/gsd-list-phase-assumptions`
</step>

<step name="emit_dfa_event_hint">
**Generate a downstream-consumption hint for `/gsd-dfa-model`.**

Don't write a DFA file (that's `/gsd-dfa-model`'s job). Instead, emit a code block at the end of EVENT-STORM-{context}.md showing the events column ready to paste:

```
## DFA event vocabulary (for /gsd-dfa-model)

When you run /gsd-dfa-model on aggregates in this context, paste these
events into the DFA's events table:

| Event | Source (actor / external / policy) | Notes |
|-------|------------------------------------|-------|
| OrderPlaced  | Customer (CMD-01: PlaceOrder)      | EV-01 |
| OrderPaid    | StripeWebhook (EXT-01)             | EV-02 |
| OrderShipped | Scheduler (POL-03 reaction)        | EV-03 |
| ...
```

This is the bridge per docs §6 — domain events become DFA events.
</step>

<step name="verify">
**Sanity checks before reporting success.**

Informational (don't block):
- Every event is past-tense PascalCase (heuristic: ends with `ed`, `d`, `n`, or recognized irregular)
- Every command is imperative PascalCase (heuristic: starts with verb, no past-tense suffix)
- Every command has ≥1 actor; every actor has ≥1 command
- Every event has ≥1 producing command OR is sourced from external system
- Every policy is in "when X then Y" form; X must be `EV-XX`, Y must be `CMD-YY`
- Read models referencing storage that doesn't exist yet → flag as hot spot
- Aggregates referenced but not modeled → flag as hot spot

Report:
```
gsd-mini-event-storm ► DONE
  Context: <Context>
  Events: N / Commands: M / Actors: A / Aggregates: G
  Policies: P / Externals: X / Read models: R / Hot spots: H
  File: .planning/ddd/EVENT-STORM-<Context>.md

  Bridge:
    /gsd-dfa-model <agg-slug> --standalone   (uses N events as the events table)
    /gsd-dfa-scenarios                       (uses P policies as cross-subsystem scenarios)
    /gsd-list-phase-assumptions              (ingests H hot spots as tracked assumptions)
    /gsd-mini-storage <agg> | --context <ctx>  (uses R read models for the Projections section)
```
</step>

</process>

<success_criteria>
- [ ] EVENT-STORM-{context}.md written with frontmatter (context, counts per category, status)
- [ ] All 8 sticky-note sections present: Domain events, Commands, Actors, Aggregates, Policies, External systems, Read models, Hot spots
- [ ] Naming conventions respected (events past-tense PascalCase, commands imperative PascalCase)
- [ ] Every command linked to ≥1 actor and ≥1 produced event
- [ ] Every policy in "when EV-XX then CMD-YY" form
- [ ] Aggregates cross-link to AGGREGATE-*.md when present; missing ones are hot spots
- [ ] Read models cross-link to STORAGE-*.md when present
- [ ] DFA event-vocabulary hint block at end (for /gsd-dfa-model paste-in)
- [ ] Output usable by /gsd-dfa-model, /gsd-dfa-scenarios, /gsd-list-phase-assumptions, /gsd-mini-storage
</success_criteria>
