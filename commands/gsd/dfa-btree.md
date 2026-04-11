---
name: gsd:dfa-btree
description: Generate hierarchical behavior tree from DFA state tables. Synthesizes all DFAs into a multi-level decision tree (L0 system overview, L1 capability trees, L2 full detail) with Mermaid diagrams. Use after /gsd-dfa-model to give developers a top-down view of system behavior.
argument-hint: "[--level 0|1|2] [--event <event-name>] [--dir <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Synthesize all DFA state tables into a hierarchical Behavior Tree that shows how the system makes decisions at multiple zoom levels.

**Core value:** DFAs are per-subsystem and exhaustive (every cell filled). The Behavior Tree is cross-subsystem and hierarchical — it answers "what happens when event X arrives?" from the entire system's perspective. Developers can start at L0 (architecture) and drill down to L2 (every guard and action) without reading individual DFA files.

**How it works:**
1. Load all DFA state tables
2. Build event flow graph (who produces what, who consumes what)
3. Identify entry points (external events that start decision chains)
4. For each entry point, derive a behavior tree from DFA guards and transitions
5. Generate Mermaid diagrams at requested zoom level
6. Write output file

**Output:** `.planning/dfa/DFA-BTREE.md` (or `.planning/dfa/DFA-BTREE-{event}.md` for single-event focus)
</objective>

<execution_context>
@~/.claude/get-shit-done/templates/dfa-behavior-tree.md
</execution_context>

<context>
Arguments:
- `--level N`: Zoom level (0=system overview, 1=capability trees, 2=full detail). Default: 1
- `--event name`: Generate BT for a single event only (e.g., `--event signals_updated`)
- `--dir path`: Load DFAs from specified directory
- No argument: Load from both `.planning/dfa/DFA-*.md` and `.planning/phases/*/??-DFA-*.md`

```bash
# Find all DFA files (excluding scenario files and btree files)
ls .planning/dfa/DFA-*.md .planning/phases/*/??-DFA-*.md 2>/dev/null | grep -vi -e scenario -e btree
```

Requires 1+ DFA state table. Works best with 2+ interacting DFAs.
</context>

<process>
## Step 1: Load All DFAs

For each DFA file, parse and extract:

### From `<boundary>`:
- **Owns** — what state this subsystem controls
- **Depends on** — events consumed (incoming edges)
- **Produces** — events emitted (outgoing edges)

### From `<states>`:
- State names and descriptions
- Initial state, terminal states

### From `<events>`:
- Event names, sources, payloads

### From `<transitions>`:
- All T-XX rows: (current_state, event, guard, next_state, action, emits)
- All S-XX rows: (state, event, action, emits)
- All F-XX rows: (state, event, handling, reason)

### From `<ignored>`:
- Explicitly ignored (state, event) pairs with reasons

## Step 2: Build Event Flow Graph

From all DFA boundaries:

```
For each DFA:
  For each event in "Produces":
    Find which other DFA(s) list this event in "Depends on"
    → Create edge: DFA-A --event--> DFA-B
```

Classify events by source:
- **External**: source is outside all DFAs (broker, user, timer) → these are entry points
- **Internal**: produced by one DFA, consumed by another → these are cascade events
- **Self**: produced and consumed by the same DFA → internal feedback

## Step 3: Generate L0 — System Overview

Using the event flow graph:
- Each DFA = one node (subsystem box)
- Each edge = event flow arrow with event name
- External sources as separate nodes
- Group into subgraphs: External, System

Generate `flowchart LR` Mermaid diagram.

**If `--level 0` specified, skip to Step 7 (write output).**

## Step 4: Identify Entry Points

Entry points = external events (source outside DFA set):
- User API calls (e.g., `kill_switch`, `place_order`)
- Broker callbacks (e.g., `tick_received`, `order_callback`)
- Timer events (e.g., `heartbeat_timeout`, `pending_order_timeout`)
- Bootstrap events (e.g., `connect()`, `recover()`, `start()`)

Each entry point becomes the root of one L1/L2 behavior tree.

Sort entry points by importance:
1. **Primary data flow** — the main tick→signal→order chain
2. **Lifecycle events** — connect, disconnect, session changes
3. **Error/recovery events** — circuit breaker, reconnect, kill switch
4. **Maintenance events** — daily reset, checkpoint

## Step 5: Build Behavior Trees (L1)

For each entry point event, build a tree:

### 5a: Collect all handlers
Find every DFA that has this event in its Events table. The "primary handler" is the DFA where this event triggers T-XX transitions. "Cascade handlers" are DFAs that handle events emitted by the primary handler.

### 5b: Extract system-level gates
Gates are guards that appear in ALL transitions for this event, or are checked before any state-specific logic. Gate priority order (matches typical code execution):
1. `killed` — system kill switch
2. `circuit_open` — connection circuit breaker
3. `warmup` — warm-up period guard
4. Per-strategy risk gates

Each gate → Condition node at the top of the tree.

### 5c: Build state branches
Group remaining transitions by current state → Selector node.
Each state branch → Sequence of state-specific guards + action.

### 5d: Mark cascade events
Where an action emits an event consumed by another DFA:
- L1: Add a reference note `→ triggers DFA-xxx`
- L2: Expand the cascade inline (Step 6)

### 5e: Generate Mermaid
Use `flowchart TD`:
- Condition nodes: `(("guard?"))`
- Selector nodes: `{"? decision_point"}`
- Action nodes: `["□ action_name"]`
- Reference nodes: `[/"⤷ DFA-xxx T-XX"/]`
- Rejected/ignored: `["return (reason)"]` with distinct style

**If `--level 1` specified, skip to Step 7 (write output).**

## Step 6: Expand to L2 — Full Detail

For each L1 tree:

### 6a: Expand actions
Each action node → Sequence of specific operations:
- State mutation (reducer dispatch)
- Event publishing
- Side effects (API calls, timer start/cancel)

### 6b: Expand cascades
Where L1 shows `→ triggers DFA-xxx`, inline the cascade handler's decision tree as a subtree.

### 6c: Add DFA transition references
Every leaf node includes the specific DFA transition ID: `⤷ DFA-trader-position T-01`

### 6d: Add cross-references
Where multiple DFAs interact on the same event, add notes showing which DFA's state affects which decision.

## Step 7: Generate Event Cascades (optional, all levels)

For the 3-5 most important event chains (tick→signal→order→fill is always #1):

Generate `sequenceDiagram` showing:
- Which subsystem receives the event
- Which DFA transition fires
- What events are emitted
- Which subsystem handles those emitted events
- Continue until no more cascade events

## Step 8: Build Metadata

### DFA Coverage Table
| DFA File | States | Events | Transitions | BT Nodes |
For each DFA, count elements and BT nodes generated from it.

### Event Flow Table
| Event | Produced By | Consumed By |
From the event flow graph built in Step 2.

## Step 9: Write Output

Write to `.planning/dfa/DFA-BTREE.md` (or `DFA-BTREE-{event}.md` if `--event` specified).

Include:
1. Header with generation metadata
2. L0 diagram (always included)
3. L1 trees (if level >= 1)
4. L2 trees (if level == 2)
5. Event cascade diagrams
6. Metadata tables

## Step 10: Report

Print summary:
```
## Behavior Tree Generated

File: .planning/dfa/DFA-BTREE.md
Level: L{N}

| Metric | Count |
|--------|-------|
| DFAs loaded | X |
| Entry points | Y |
| BT trees generated | Z |
| Total BT nodes | W |
| Event cascades | V |

Entry points covered:
1. signals_updated — main trading flow
2. order.updated — order fill/reject handling
3. ...
```
</process>

<success_criteria>
- All DFA files loaded and parsed
- Event flow graph correctly maps producer→consumer relationships
- L0 diagram shows all subsystems and event flows
- L1 trees correctly derive gate priority order from DFA guards
- L1 trees correctly build state branches from DFA transitions
- Every BT leaf node traces back to a specific DFA transition (T-XX, S-XX, F-XX)
- Mermaid diagrams render correctly (valid syntax)
- Gate evaluation order matches actual code execution order
- Event cascades show complete chain from trigger to terminal
- File written to correct location
</success_criteria>
