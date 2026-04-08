---
name: gsd:dfa-scenarios
description: Generate cross-subsystem scenario matrix from multiple DFA state tables. Identifies critical state combinations, failure cascades, and event ordering sensitivities. Run after /gsd:dfa-model when 2+ interacting DFAs exist.
argument-hint: "[--phase <N>] [--dir <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Generate a scenario matrix capturing dangerous cross-subsystem state combinations that individual DFA tests would miss.

**How it works:**
1. Load all DFA state tables (from phase or standalone directory)
2. Identify interaction points (events produced by one DFA consumed by another)
3. Enumerate critical state combinations by risk level
4. Identify failure cascades (A fails → how does it affect B?)
5. Identify event ordering sensitivities (A then B vs B then A)
6. Write scenario matrix

**Output:**
- Phase-bound: `.planning/phases/XX-name/{phase_num}-DFA-SCENARIOS.md`
- Standalone: `.planning/dfa/DFA-cross-subsystem-scenarios.md`
</objective>

<execution_context>
@~/.claude/get-shit-done/templates/dfa-scenario-matrix.md
</execution_context>

<context>
Arguments:
- `--phase N`: Load DFAs from phase directory
- `--dir path`: Load DFAs from specified directory
- No argument: Search both `.planning/dfa/DFA-*.md` and `.planning/phases/*/??-DFA-*.md`

```bash
# Find all DFA files (excluding scenario files themselves)
ls .planning/dfa/DFA-*.md .planning/phases/*/??-DFA-*.md 2>/dev/null | grep -vi scenario
```

Requires 2+ DFA state tables. If only 1 DFA exists, report: "Single DFA — scenario matrix not needed. Cross-subsystem scenarios require 2+ interacting DFAs."
</context>

<process>
## Step 1: Load All DFAs

Parse each DFA file. Extract:
- States list and their invariants
- Events list with sources
- Transitions with emitted events
- Terminal/error states

## Step 2: Map Interactions

Build interaction graph:
- DFA-A emits `event_x` → DFA-B consumes `event_x`
- These are the interaction points where cross-subsystem bugs hide

## Step 3: Select Scenarios by Risk

Follow selection criteria from template:

**CRITICAL (must test):**
- Both subsystems in non-steady states simultaneously
- Failure in one subsystem while another holds important state
- Events that fan out to multiple subsystems

**HIGH (should test):**
- One subsystem degraded while another operates normally
- Boundary events affecting multiple subsystems
- Recovery paths after multi-subsystem failures

**MEDIUM / LOW:** Enumerate but don't require tests.

**Interactive:** Use AskUserQuestion to validate critical scenarios with user. "Is this combination actually possible in your system?"

## Step 4: Identify Failure Cascades

For each DFA's error/failure states (CIRCUIT_OPEN, ERROR, etc.):
- Which other DFAs depend on this subsystem?
- What happens to them when this subsystem enters failure state?
- Assign FC-XX IDs.

## Step 5: Identify Event Ordering Sensitivity

For events that can arrive in different orders:
- Does order A→B produce different behavior than B→A?
- If yes, document both orderings and handling strategy.
- Assign EO-XX IDs.

## Step 6: Write Scenario Matrix

Write to:
- **Phase-bound:** `$PHASE_DIR/{phase_num}-DFA-SCENARIOS.md`
- **Standalone:** `.planning/dfa/DFA-cross-subsystem-scenarios.md`

Include coverage summary with test counts per priority level.

## Step 7: Return Result

Report: total scenarios by priority, failure cascades count, event orderings count, estimated integration tests required.
</process>

<success_criteria>
- All DFA interaction points identified
- CRITICAL scenarios enumerated with 100% test coverage target
- Failure cascades documented with FC-XX IDs
- Event ordering sensitivities documented with EO-XX IDs
- Each scenario has specific expected behavior and test strategy
- Coverage summary with test count
- File written to correct location in phase directory
</success_criteria>
