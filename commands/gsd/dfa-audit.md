---
name: gsd:dfa-audit
description: Compare DFA state table specs against actual code implementation. Identifies gaps where code behavior diverges from the DFA specification. Use after /gsd:dfa-model to find implementation gaps.
argument-hint: "[dfa-file-or-directory]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - AskUserQuestion
---

<objective>
Audit DFA state table specifications against actual code to find gaps — places where the implementation doesn't match the specification. Produces a prioritized gap list with fix directions.

**How it works:**
1. Load DFA state table(s)
2. For each transition, verify the code handles it
3. For each forbidden transition, verify the code rejects it
4. For each state×event cell marked "ignored", verify no silent bug
5. Check for code paths not covered by any DFA transition
6. Output gap report with severity and fix direction

**Output:** Gap report written to `.planning/dfa/DFA-AUDIT-{date}.md` (or printed if `--dry-run`).
</objective>

<context>
Argument: path to a single DFA file, a directory containing DFA files, or omitted to scan:
1. `.planning/dfa/*.md` (standalone DFAs)
2. `.planning/phases/*/??-DFA-*.md` (phase-bound DFAs)

Both locations are checked if no argument given.
</context>

<process>
## Step 1: Load DFA Files

```bash
# Find all DFA files
ls .planning/dfa/DFA-*.md .planning/phases/*/??-DFA-*.md 2>/dev/null
```

If argument provided, use that path instead.

Parse each DFA file and extract:
- **Boundary section**: `<boundary>` — owns, depends, produces
- **States**: from `<states>` section
- **Events**: from `<events>` section
- **Transitions**: T-XX entries from `<transitions>` section
- **Self-loops**: S-XX entries
- **Forbidden**: F-XX entries from `<forbidden>` section
- **Ignored**: entries from `<ignored>` section
- **Implementation notes**: file paths, state enums, reducer references

## Step 2: Map DFA to Code

For each DFA, identify the source files:
1. Read the **Subsystem** field and **Implementation Notes** for file paths
2. If not specified, infer from subsystem name (e.g., `trader` → `subsystems/trader/`)
3. Read the reducer/handler files

## Step 3: Verify Transitions

For each transition T-XX:

### 3a: Does the code handle this (state, event) combination?
- Search for the event type string in reducer/handler
- Search for the state check (match/if/switch)
- If not found → **GAP: missing transition handler**

### 3b: Does the action match?
- Read the handler code
- Compare to the DFA's Action column
- If diverged → **GAP: action mismatch** (may be intentional evolution)

### 3c: Does the emitted event match?
- Search for `publish` / `emit` / `dispatch` calls in the handler
- Compare to the DFA's Emits column
- If missing → **GAP: missing emitted event**

## Step 4: Verify Forbidden Transitions

For each forbidden transition F-XX:
- Search for explicit rejection/logging of this (state, event) combination
- If no explicit handling → **GAP: forbidden transition not guarded**

## Step 5: Check for Uncovered Code Paths

Scan reducer/handler for:
- Event types not listed in the DFA's Events table
- State values not listed in the DFA's States table
- Match/case/if branches that don't map to any T-XX or F-XX

If found → **INFO: code path not in DFA** (DFA may need update)

## Step 6: Cross-DFA Event Consistency

If multiple DFAs loaded:
- Events in Emits column of DFA-A should appear in Events table of DFA-B
- Mismatches → **WARNING: cross-DFA event inconsistency**

## Step 7: Classify Gaps

### Severity Levels:

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Missing transition that involves money, positions, or data loss |
| **HIGH** | Missing guard on forbidden transition; action mismatch affecting correctness |
| **MEDIUM** | Missing emitted event; action mismatch not affecting correctness |
| **LOW** | Cosmetic: DFA uses different naming than code; info-only gaps |

### Gap Entry Format:

```markdown
### GAP-XX: [title]
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **DFA:** [which DFA file]
- **Transition:** [T-XX / F-XX / S-XX / NEW]
- **State:** [current state]
- **Event:** [event]
- **Expected:** [what DFA says should happen]
- **Actual:** [what code does]
- **Fix direction:** [brief guidance]
- **Files involved:** [file paths]
```

## Step 8: Write Report

Write to `.planning/dfa/DFA-AUDIT-{YYYY-MM-DD}.md`:

```markdown
# DFA Audit Report — {date}

## Summary
- DFAs audited: N
- Total transitions checked: M
- Gaps found: X (C critical, H high, M medium, L low)

## Gap List (by severity)

### CRITICAL
[gaps...]

### HIGH
[gaps...]

### MEDIUM
[gaps...]

### LOW
[gaps...]

## Recommendations
1. Fix CRITICAL gaps immediately — they represent financial/data risk
2. Fix HIGH gaps before next release
3. MEDIUM/LOW at discretion

## DFA Files Audited
- [list of files with transition counts]
```
</process>

<success_criteria>
- All DFA files found and parsed
- Every transition (T-XX) verified against code
- Every forbidden transition (F-XX) checked for guards
- Gaps classified by severity with actionable fix directions
- Cross-DFA event consistency checked (if multiple DFAs)
- Report written with clear priority ordering
- File paths provided for every gap
</success_criteria>
