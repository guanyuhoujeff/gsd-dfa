---
name: gsd:dfa-model
description: Create a DFA state table for a subsystem. Supports both phase-bound (within a GSD phase) and standalone mode (retroactive audit of existing code). Defines states, events, transitions, forbidden transitions, and completeness matrix.
argument-hint: "<subsystem-name> [--phase <N>] [--standalone]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Build a complete DFA (Deterministic Finite Automaton) state table for one subsystem or lifecycle.

**Two modes:**
- **Phase-bound** (default when `--phase N` given): DFA tied to a GSD phase, reads phase context
- **Standalone** (default when no phase, or `--standalone`): Retroactive DFA for existing code, reads source directly

**How it works:**
1. Load context (phase context OR source code analysis)
2. Identify the subsystem boundary (owns/depends/produces)
3. Enumerate all states with invariants
4. Enumerate all events with sources
5. Fill the complete transition table (transitions, self-loops, forbidden, ignored)
6. Generate completeness matrix (N x M — no empty cells)
7. Optionally generate mermaid state diagram
8. Write DFA state table

**Output:**
- Phase-bound: `.planning/phases/XX-name/{phase_num}-DFA-{subsystem}.md`
- Standalone: `.planning/dfa/DFA-{subsystem}.md`
</objective>

<execution_context>
@~/.claude/get-shit-done/templates/dfa-state-table.md
</execution_context>

<context>
Subsystem name: first argument from $ARGUMENTS
Phase number: optional `--phase N` flag
Standalone: `--standalone` flag (default when no phase specified)

**Phase-bound context** (when `--phase` given):
- `.planning/ROADMAP.md` — phase goal and success criteria
- `.planning/phases/XX-name/{phase_num}-CONTEXT.md` — locked decisions (if exists)
- `.planning/phases/XX-name/{phase_num}-RESEARCH.md` — DFA candidates section (if exists)

**Standalone context** (when no phase):
- Source code in the subsystem directory (auto-detected or specified)
- Existing state enums, reducers, service files
- CLAUDE.md / project docs for architectural context
</context>

<process>
## Step 1: Load Context

### Phase-bound mode:
```bash
SUBSYSTEM="${1}"
PHASE_NUM="${2}"  # from --phase flag
PHASE_DIR=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_NUM}" 2>/dev/null | node -e "d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).phase_dir)}catch{}})")
```
Read ROADMAP.md for phase goal. Read CONTEXT.md and RESEARCH.md if they exist.

### Standalone mode:
```bash
SUBSYSTEM="${1}"
# Auto-detect subsystem directory
find . -type d -name "${SUBSYSTEM}" | head -5
```
Read the subsystem's source files directly:
- State enums / models (e.g., `models.py`, `state.py`)
- Reducer / handler (e.g., `reducer.py`, `service.py`)
- Events (e.g., `events.py`)
- Existing tests for behavioral clues

## Step 2: Model the DFA

Follow the DFA State Table template (`dfa-state-table.md`):

1. **Define boundary** — what this subsystem owns, depends on, produces
2. **Enumerate states** — UPPER_SNAKE_CASE, with description and invariants
3. **Enumerate events** — with source (external system or `internal timer`) and payload
4. **Fill transition table** — for every (state, event) pair:
   - Transition (T-XX): state changes, action fires
   - Self-loop (S-XX): state unchanged, action fires
   - Forbidden (F-XX): should never happen, log error
   - Ignored: valid but intentionally not handled, with reason
5. **Completeness check** — N x M matrix, verify no empty cells
6. **State diagram (optional)** — mermaid stateDiagram for structural overview

**Interactive refinement:** Use AskUserQuestion to clarify:
- Ambiguous states ("Is SUBSCRIBING a distinct state or part of CONNECTING?")
- Missing events ("What happens if the system receives X during Y?")
- Guard conditions ("What determines whether retry or circuit-break?")

## Step 3: Write DFA State Table

Write to:
- **Phase-bound:** `$PHASE_DIR/{phase_num}-DFA-{subsystem}.md`
- **Standalone:** `.planning/dfa/DFA-{subsystem}.md` (create `.planning/dfa/` if it doesn't exist)

## Step 4: Return Result

Report states count, events count, transitions count, and completeness percentage.
</process>

<success_criteria>
- Subsystem boundary clearly defined (owns/depends/produces)
- All states have invariants
- All events have sources
- Every (state, event) cell is filled (transition, self-loop, forbidden, or ignored)
- Completeness matrix has no empty cells
- Transition IDs assigned (T-XX, S-XX, F-XX)
- File written to correct location in phase directory
</success_criteria>
