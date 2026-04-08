---
name: gsd:dfa-tests
description: Generate test skeletons from DFA transition tables. Each T-XX, F-XX, and S-XX becomes a test case with given/when/then structure. Use after /gsd:dfa-model to bootstrap test coverage.
argument-hint: "<dfa-file> [--lang python|typescript|go]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Generate test case skeletons from a DFA state table. Each transition, forbidden transition, and self-loop becomes one test function with given/when/then structure.

**How it works:**
1. Parse DFA state table
2. For each T-XX: generate test asserting state transition + action + emitted event
3. For each F-XX: generate test asserting state unchanged + error logged
4. For each S-XX: generate test asserting state unchanged + action fired
5. Write test file(s) to appropriate test directory

**Output:** Test file(s) with one test function per DFA entry.
</objective>

<context>
DFA file: first argument from $ARGUMENTS — path to a DFA state table file.
Language: `--lang` flag (default: auto-detect from project).

Supported languages: Python (pytest), TypeScript (jest/vitest), Go (testing).
</context>

<process>
## Step 1: Parse DFA File

Read the DFA file and extract:
- All T-XX transitions (Current State, Event, Guard, Next State, Action, Emits)
- All S-XX self-loops (State, Event, Action, Emits)
- All F-XX forbidden transitions (State, Event, Handling, Reason)
- Implementation notes (state enum path, reducer path)

## Step 2: Detect Language and Test Framework

If `--lang` not specified:
- Check for `pyproject.toml` / `setup.py` → Python (pytest)
- Check for `package.json` → TypeScript (detect jest/vitest from deps)
- Check for `go.mod` → Go (testing)

## Step 3: Determine Test File Location

- Read implementation notes for subsystem/module path
- Map to test directory convention:
  - Python: `tests/subsystems/{subsystem}/test_dfa_{subsystem}.py`
  - TypeScript: `__tests__/{subsystem}/dfa.test.ts`
  - Go: `{subsystem}/{subsystem}_dfa_test.go`

If test file already exists, ask user before overwriting.

## Step 4: Generate Test Skeletons

### Python Template (per transition):

```python
class TestDFA{Subsystem}Transitions:
    """DFA transition tests — generated from {dfa_file}."""

    @pytest.mark.asyncio
    async def test_T01_{current_state}_on_{event}_transitions_to_{next_state}(self):
        """T-01: {current_state} + {event} → {next_state}
        
        Action: {action}
        Emits: {emits}
        """
        # GIVEN: system in {current_state}
        # TODO: set up state

        # WHEN: {event} arrives
        # TODO: dispatch event

        # THEN: state is {next_state}
        # TODO: assert new state
        # AND: {action} executed
        # TODO: assert action
        # AND: {emits} published
        # TODO: assert emitted events
        raise NotImplementedError("Skeleton — implement this test")


class TestDFA{Subsystem}Forbidden:
    """DFA forbidden transition tests — generated from {dfa_file}."""

    @pytest.mark.asyncio
    async def test_F01_{state}_on_{event}_is_rejected(self):
        """F-01: {state} + {event} → FORBIDDEN
        
        Handling: {handling}
        Reason: {reason}
        """
        # GIVEN: system in {state}
        # TODO: set up state

        # WHEN: {event} arrives
        # TODO: dispatch event

        # THEN: state unchanged
        # TODO: assert state unchanged
        # AND: error logged
        # TODO: assert log contains error
        raise NotImplementedError("Skeleton — implement this test")


class TestDFA{Subsystem}SelfLoops:
    """DFA self-loop tests — generated from {dfa_file}."""

    @pytest.mark.asyncio
    async def test_S01_{state}_on_{event}_fires_action(self):
        """S-01: {state} + {event} → {state} (self-loop)
        
        Action: {action}
        Emits: {emits}
        """
        # GIVEN: system in {state}
        # WHEN: {event} arrives
        # THEN: state unchanged
        # AND: {action} executed
        raise NotImplementedError("Skeleton — implement this test")
```

### TypeScript Template (per transition):

```typescript
describe('DFA {Subsystem}', () => {
  describe('Transitions', () => {
    it('T-01: {current_state} + {event} → {next_state}', async () => {
      // GIVEN: system in {current_state}
      // WHEN: {event} arrives
      // THEN: state is {next_state}
      // AND: {action} executed
      // AND: {emits} published
      throw new Error('Skeleton — implement this test');
    });
  });

  describe('Forbidden', () => {
    it('F-01: {state} + {event} → REJECTED', async () => {
      // GIVEN: system in {state}
      // WHEN: {event} arrives
      // THEN: state unchanged, error logged
      throw new Error('Skeleton — implement this test');
    });
  });
});
```

### Go Template (per transition):

```go
func TestDFA_{Subsystem}_T01_{CurrentState}_On_{Event}(t *testing.T) {
    // T-01: {current_state} + {event} → {next_state}
    // GIVEN: system in {current_state}
    // WHEN: {event} arrives
    // THEN: state is {next_state}
    t.Fatal("Skeleton — implement this test")
}
```

## Step 5: Generate Coverage Summary

At the top of the test file, add a comment with coverage map:

```python
# DFA Test Coverage Map
# Source: {dfa_file}
# Generated: {date}
#
# Transitions: {N} tests (T-01 through T-{N})
# Self-loops:  {M} tests (S-01 through S-{M})
# Forbidden:   {K} tests (F-01 through F-{K})
# Total:       {N+M+K} test skeletons
#
# Status: SKELETON — all tests raise NotImplementedError
# Run `grep -c NotImplementedError {test_file}` to track progress
```

## Step 6: Write File and Report

Write the test file. Print summary:

```
## DFA Test Skeletons Generated

File: tests/subsystems/{subsystem}/test_dfa_{subsystem}.py

| Type | Count | IDs |
|------|-------|-----|
| Transitions | N | T-01 through T-{N} |
| Self-loops | M | S-01 through S-{M} |
| Forbidden | K | F-01 through F-{K} |
| **Total** | **{sum}** | |

Next steps:
1. Implement each test (replace `raise NotImplementedError`)
2. Run: `pytest {test_file} -v`
3. Track progress: `grep -c NotImplementedError {test_file}`
```
</process>

<success_criteria>
- All T-XX, S-XX, F-XX entries parsed from DFA file
- One test function generated per DFA entry
- Test names include DFA ID (T-01, F-02, etc.) for traceability
- Given/When/Then structure in each test
- Coverage summary comment at top of file
- Test file written to correct location
- Language-appropriate test framework used
</success_criteria>
