---
name: gsd:dfa-verify
description: Verify DFA completeness and consistency. Checks for dead states, unreachable states, unhandled events, and guard exhaustiveness. Run after /gsd:dfa-model to validate before planning.
argument-hint: "<phase> [subsystem-name]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Verify that DFA state tables in a phase are complete, consistent, and free of modeling errors.

**What it checks:**
1. **No dead states** — every state is reachable from the initial state
2. **No unreachable states** — every state has at least one incoming transition
3. **No unhandled events** — every (state, event) cell is filled
4. **Guard exhaustiveness** — when guards split a transition, all cases are covered
5. **Terminal state validity** — terminal states have no outgoing transitions (or explicitly documented ones)
6. **Event source consistency** — every event has a defined source
7. **Cross-DFA event consistency** — events produced by one DFA match events consumed by another

**Output:** Verification report printed to console. Lists issues by severity (ERROR / WARNING / INFO).
</objective>

<context>
Phase number: first argument from $ARGUMENTS
Subsystem name: second argument (optional — if omitted, verify all DFAs in the phase)
</context>

<process>
## Step 1: Find DFA Files

```bash
PHASE_NUM="${1}"
SUBSYSTEM="${2:-}"
ls .planning/phases/*/"${PHASE_NUM}"-DFA-*.md 2>/dev/null
```

If subsystem specified, filter to that file only.

## Step 2: Parse Each DFA

For each DFA file, extract:
- States list (from `## States` table)
- Events list (from `## Events` table)
- Transitions (T-XX), self-loops (S-XX), forbidden (F-XX), ignored entries
- Completeness matrix

## Step 3: Run Checks

### 3a: Reachability
From initial state, follow all transitions. Any state not visited = unreachable (ERROR).

### 3b: Dead States
Any state with no outgoing transitions (except terminal states) = dead state (ERROR).

### 3c: Completeness
Count: transitions + self-loops + forbidden + ignored vs total cells (states x events).
Any cell not covered and not structurally impossible = unhandled (ERROR).

### 3d: Guard Exhaustiveness
For any (state, event) pair with multiple guarded transitions:
- Check that guards cover all cases (e.g., `< max` and `>= max`)
- If guards don't partition the space = gap (WARNING)

### 3e: Cross-DFA Consistency (if multiple DFAs)
- Events in `Emits` column of DFA-A should appear in `Events` table of DFA-B (if B consumes them)
- Mismatched event names = WARNING

## Step 4: Report

```markdown
## DFA Verification: Phase {N}

### {subsystem} ({states} states, {events} events)

**Completeness:** {covered}/{total} cells ({percentage}%)

#### ERRORS (must fix before planning)
- [ ] {description}

#### WARNINGS (should fix)
- [ ] {description}

#### INFO
- {observation}

### Overall: {PASS / FAIL}
```

If FAIL, suggest specific fixes for each ERROR.
</process>

<success_criteria>
- All DFA files in phase parsed
- Reachability check completed
- Dead state check completed
- Completeness verified
- Guard exhaustiveness checked
- Cross-DFA consistency checked (if multiple DFAs)
- Clear report with actionable fix suggestions for errors
</success_criteria>
