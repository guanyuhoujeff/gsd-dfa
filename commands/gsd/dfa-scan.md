---
name: gsd:dfa-scan
description: Scan codebase to identify subsystems suitable for DFA modeling. Detects state enums, reducers, FSM patterns, lifecycle methods, and circuit breakers. Use before /gsd-dfa-model to find candidates.
argument-hint: "[directory]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<objective>
Scan a codebase to identify subsystems that exhibit stateful behavior and would benefit from DFA modeling. Produces a ranked list of candidates with evidence.

**How it works:**
1. Search for state-related code patterns (enums, reducers, FSM, lifecycle)
2. Score each candidate by statefulness signals
3. Rank candidates and recommend which ones to model first
4. Output a summary table with evidence

**Output:** Printed summary — no file written (informational scan).
</objective>

<context>
Directory: first argument from $ARGUMENTS, defaults to current working directory.

Scans all source files in the directory tree (excluding tests, node_modules, __pycache__, .git).
</context>

<process>
## Step 1: Detect Statefulness Signals

Search for these patterns in the codebase. Each hit adds to a subsystem's "statefulness score":

### Signal 1: State Enums (+3 points each)
```
grep -r "class.*State.*Enum" --include="*.py"
grep -r "enum.*State" --include="*.ts" --include="*.go"
```
State enums are the strongest signal — they explicitly define discrete states.

### Signal 2: Reducer / State Machine Functions (+3 points each)
```
grep -r "def.*reducer\|def.*_reducer\|match.*state\|switch.*state" --include="*.py"
grep -r "reducer\|createSlice\|createMachine" --include="*.ts"
```

### Signal 3: Lifecycle Methods (+2 points each)
```
grep -r "async def connect\|async def disconnect\|async def start\|async def stop\|async def recover" --include="*.py"
grep -r "reconnect\|circuit.*break\|backoff\|retry" --include="*.py" --include="*.ts"
```

### Signal 4: State Transitions in Code (+2 points each)
```
grep -r "_state\s*=\|self\._connected\s*=\|_circuit_state\s*=" --include="*.py"
grep -r "setState\|transition\|next_state" --include="*.ts"
```

### Signal 5: Event-Driven Patterns (+1 point each)
```
grep -r "subscribe\|publish\|dispatch\|emit" --include="*.py" --include="*.ts"
```

## Step 2: Group by Subsystem

Cluster hits by directory / module. A "subsystem" is typically one directory under `subsystems/`, `modules/`, `services/`, or similar.

## Step 3: Score and Rank

For each subsystem:
- Sum statefulness points from all signals
- Count distinct state values found (if enum detected)
- Flag if reducer pattern found (strongest DFA signal)

### Scoring Guide:
| Score | Recommendation |
|-------|---------------|
| 8+ | **STRONG** — definitely model as DFA |
| 5-7 | **MODERATE** — likely benefits from DFA |
| 3-4 | **WEAK** — consider if behavior is complex |
| 0-2 | **SKIP** — probably stateless or too simple |

## Step 4: Report

Print summary table:

```
## DFA Scan Results

| # | Subsystem | Score | States Found | Signals | Recommendation |
|---|-----------|-------|-------------|---------|----------------|
| 1 | quote/connector | 12 | CONNECTED, RECONNECTING, CIRCUIT_OPEN | enum, reducer, lifecycle, retry | STRONG |
| 2 | trader | 10 | FLAT, OPEN, BLOCKED | enum, reducer, event-driven | STRONG |
| 3 | order | 7 | CREATED, FILLED, REJECTED | enum, lifecycle | MODERATE |

### Recommended Modeling Order:
1. [highest score first]
2. [...]

### Already Modeled:
[List any existing DFA files found in .planning/dfa/ or .planning/phases/]
```

Include file paths as evidence for each signal detected.
</process>

<success_criteria>
- All source directories scanned
- Statefulness signals detected and scored
- Subsystems ranked by score
- Clear recommendation per subsystem (STRONG/MODERATE/WEAK/SKIP)
- Evidence (file paths, line snippets) provided for each candidate
- Existing DFA files noted to avoid duplicate modeling
</success_criteria>
