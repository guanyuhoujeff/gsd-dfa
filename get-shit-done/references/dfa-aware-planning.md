# DFA-Aware Task Decomposition

> Reference for `gsd-planner` when DFA state tables exist in the phase directory.
> See `docs/DFA-METHODOLOGY.md` for the full DFA methodology.

When DFA state tables exist in the phase directory (`{phase_num}-DFA-*.md`), **transitions** become the unit of work — not vague "implement reconnect logic" tasks.

## Loading DFA artifacts

```bash
ls "$PHASE_DIR"/*-DFA-*.md 2>/dev/null
ls "$PHASE_DIR"/*-DFA-SCENARIOS.md 2>/dev/null
```

If files are present, parse out the transition IDs:
- **T-XX** — transitions (state + event → next_state)
- **F-XX** — forbidden transitions (must reject/log)
- **S-XX** — self-loops (event handled, state unchanged)
- **SC-XX** — cross-subsystem critical scenarios
- **FC-XX** — failure cascades
- **EO-XX** — event-ordering sensitivities

## Grouping transitions into tasks

Group related transitions that share the same source or target state. Examples:

- All transitions OUT of `RECONNECTING` → one task
- All forbidden transitions for a single state → grouped with that state's transitions
- Each scenario matrix item (SC-XX, FC-XX, EO-XX) → an integration test task

Each task references the transition IDs it implements: `"Implements T-03, T-04, F-01"`.

## Task action format with DFA references

```xml
<task type="auto" tdd="true">
  <name>Task 1: Implement RECONNECTING transitions</name>
  <files>src/adapter/reducer.py, tests/test_adapter_reducer.py</files>
  <behavior>
    - T-08: RECONNECTING + retry_timeout → CONNECTING (call login)
    - T-09: RECONNECTING + max_retries_exceeded → CIRCUIT_OPEN (alert)
    - S-03: RECONNECTING + connection_lost → RECONNECTING (log)
    - F-03: RECONNECTING + tick_received → log error, drop
  </behavior>
  <action>Implement reducer cases for transitions T-08, T-09, S-03, F-03. Each transition = one test.</action>
  <verify><automated>pytest tests/test_adapter_reducer.py -x</automated></verify>
  <done>All 4 transitions pass, forbidden tick_received logs error and state unchanged.</done>
</task>
```

## Coverage matrix in plan set

When DFA exists, the decision coverage matrix MUST also map transitions to tasks:

```
T-XX | Plan | Task | Status
T-01 | 01   | 1    | Covered
T-08 | 02   | 1    | Covered
SC-01| 03   | 1    | Integration test
FC-01| 03   | 2    | Integration test
```

**Completeness rule:** If ANY transition from the DFA has no covering task → that's a gap, must be addressed before plan-checker can pass.

## Why transitions, not features

Natural-language plans like "implement reconnect logic" leave gaps: what happens to incoming ticks during reconnect? What if reconnect succeeds but the session is stale? Transition-oriented decomposition forces those questions into existence at planning time, not at incident time.

The DFA spec is the contract; the planner translates that contract into atomic, testable units of work.
