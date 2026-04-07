# DFA Scenario Matrix Template

Template for `.planning/phases/XX-name/{phase_num}-DFA-SCENARIOS.md` - defines critical cross-subsystem state combinations and their expected behavior.

**Purpose:** When multiple DFAs interact, the dangerous bugs live in the *combinations* — Subsystem A in state X while Subsystem B in state Y and event Z arrives. This template forces you to enumerate and specify those combinations.

**Downstream consumers:**
- `gsd-planner` — Creates integration tasks from scenario rows. Each scenario = at least one integration test.
- `gsd-executor` — Implements integration tests per scenario. Knows the exact pre-conditions to set up.
- `gsd-verifier` — Checks every HIGH/CRITICAL scenario has a passing integration test.

---

## File Template

```markdown
# Phase [X]: [Name] - DFA Scenario Matrix

**Modeled:** [date]
**Subsystems involved:** [list of DFAs that interact in this phase]
**Status:** [draft / reviewed / locked]

<scope>
## Scope

[Which subsystem interactions this matrix covers. You don't need the full Cartesian product of all states — focus on dangerous combinations.]

**DFA references:**
- `{phase_num}-DFA-{subsystem_a}.md` — [N] states
- `{phase_num}-DFA-{subsystem_b}.md` — [M] states
- `{phase_num}-DFA-{subsystem_c}.md` (if applicable) — [P] states

**Full Cartesian product:** [N x M x ...] = [total] combinations
**Scenarios enumerated:** [count] (focused on risk)

</scope>

<selection_criteria>
## Selection Criteria

Not all combinations matter equally. Scenarios are selected by risk:

**CRITICAL (must test):**
- Both subsystems in non-steady states (both transitioning)
- Failure in one subsystem while another holds user-facing state (e.g., open position)
- Events that fan out to multiple subsystems simultaneously

**HIGH (should test):**
- One subsystem degraded while another operates normally
- Session boundary events affecting multiple subsystems
- Recovery paths after multi-subsystem failures

**MEDIUM (nice to test):**
- Unusual but possible timing coincidences
- Edge cases in event ordering

**LOW (document only):**
- Theoretically possible but practically impossible timing
- Already covered by individual DFA tests

</selection_criteria>

<scenarios>
## Scenarios

### CRITICAL

| # | [Subsystem A] | [Subsystem B] | [Subsystem C] | Trigger Event | Expected Behavior | Test Strategy |
|---|---------------|---------------|---------------|---------------|-------------------|---------------|
| SC-01 | [STATE] | [STATE] | [STATE] | [event] | [what should happen] | [how to test] |
| SC-02 | [STATE] | [STATE] | [STATE] | [event] | [what should happen] | [how to test] |

### HIGH

| # | [Subsystem A] | [Subsystem B] | [Subsystem C] | Trigger Event | Expected Behavior | Test Strategy |
|---|---------------|---------------|---------------|---------------|-------------------|---------------|
| SH-01 | [STATE] | [STATE] | [STATE] | [event] | [what should happen] | [how to test] |

### MEDIUM

| # | [Subsystem A] | [Subsystem B] | [Subsystem C] | Trigger Event | Expected Behavior | Test Strategy |
|---|---------------|---------------|---------------|---------------|-------------------|---------------|
| SM-01 | [STATE] | [STATE] | [STATE] | [event] | [what should happen] | [how to test] |

</scenarios>

<failure_cascades>
## Failure Cascades

When one subsystem fails, how does it affect others?

| # | Origin Failure | Affected Subsystem | Cascade Effect | Mitigation |
|---|----------------|--------------------|----------------|------------|
| FC-01 | [Subsystem A enters ERROR/CIRCUIT_OPEN] | [Subsystem B] | [what happens to B] | [how B should handle it] |
| FC-02 | [Subsystem B enters DEGRADED] | [Subsystem A] | [what happens to A] | [how A should handle it] |

</failure_cascades>

<event_ordering>
## Event Ordering Sensitivity

Cases where the ORDER of events matters (A then B vs B then A produces different outcomes).

| # | Sequence A (expected) | Sequence B (race condition) | Outcome Difference | Handling |
|---|----------------------|----------------------------|--------------------|----------|
| EO-01 | [event1 then event2] | [event2 then event1] | [what's different] | [which ordering to enforce, or handle both] |

</event_ordering>

<coverage>
## Coverage Summary

| Priority | Total Scenarios | With Integration Test | Gap |
|----------|----------------|-----------------------|-----|
| CRITICAL | [N] | [N] (must be 100%) | [0] |
| HIGH | [N] | [target] | [gap] |
| MEDIUM | [N] | [target] | [gap] |
| LOW | [N] | documented only | — |

**Total integration tests required:** [count]

</coverage>

---

*Phase: XX-name*
*Scenarios modeled: [date]*
```

---

## Good Example

```markdown
# Phase 7: Order State Machine + Trader Refactor - DFA Scenario Matrix

**Modeled:** 2026-03-30
**Subsystems involved:** Adapter (connection), Trader (position), Order (execution), Calendar (session)
**Status:** locked

<scope>
## Scope

Covers interactions between connection state, trading positions, order execution, and session boundaries — the four subsystems where failures have financial consequences.

**DFA references:**
- `05-DFA-connection-lifecycle.md` — 8 states
- `07-DFA-order-lifecycle.md` — 6 states
- `07-DFA-position-lifecycle.md` — 5 states
- `01-DFA-session-lifecycle.md` — 4 states

**Full Cartesian product:** 8 x 6 x 5 x 4 = 960 combinations
**Scenarios enumerated:** 18 (focused on financial risk)

</scope>

<selection_criteria>
## Selection Criteria

Financial systems demand zero tolerance for:
1. **Open position + connection loss** — must not lose track of position
2. **Pending order + session end** — must cancel or handle
3. **Order fill during reconnection** — fill event might arrive late
4. **Position close attempt during circuit break** — can't reach broker

</selection_criteria>

<scenarios>
## Scenarios

### CRITICAL

| # | Adapter | Trader | Order | Calendar | Trigger | Expected Behavior | Test Strategy |
|---|---------|--------|-------|----------|---------|-------------------|---------------|
| SC-01 | STREAMING | HAS_POSITION | — | DAY_SESSION | connection_lost | Preserve position state in memory. Start reconnect. Do NOT auto-close. Alert operator. | Mock adapter disconnect, assert position unchanged, assert reconnect started |
| SC-02 | RECONNECTING | HAS_POSITION | — | DAY_SESSION | session_ended | Queue forced close. Execute when connection restored. Log with urgency. | Freeze time to session end, assert close order queued |
| SC-03 | CIRCUIT_OPEN | HAS_POSITION | — | DAY_SESSION | — (steady state) | Alert operator immediately. Position at risk — no broker access. | Assert alert fired within 1s of circuit open + position detected |
| SC-04 | STREAMING | OPENING | PENDING | DAY_SESSION | connection_lost | Cancel pending order locally. Mark position as UNKNOWN until reconnect. | Mock disconnect during order, assert UNKNOWN state |
| SC-05 | STREAMING | HAS_POSITION | — | DAY_SESSION | session_ended (< 5min warning) | Begin graceful close. Market order if no fill in 2 minutes. | Freeze time, assert market order escalation |
| SC-06 | RECONNECTING | — | PENDING | — | connect_success | Re-query order status from broker. Reconcile local vs broker state. | Mock reconnect, inject broker state, assert reconciliation |

### HIGH

| # | Adapter | Trader | Order | Calendar | Trigger | Expected Behavior | Test Strategy |
|---|---------|--------|-------|----------|---------|-------------------|---------------|
| SH-01 | STREAMING | NO_POSITION | — | NIGHT_SESSION | signal_generated | Check night_trading_enabled setting. Reject if disabled. | Config toggle test |
| SH-02 | STREAMING | HAS_POSITION | PENDING_CLOSE | DAY_SESSION | tick_received (price gap) | Allow close order to fill at market. Log slippage. | Inject gap tick, assert fill + slippage log |
| SH-03 | STREAMING | HAS_POSITION | — | SESSION_BREAK | tick_received | Ignore tick for strategy. Keep position. Resume on next session. | Assert strategy not triggered during break |
| SH-04 | CONNECTED | — | — | PRE_MARKET | subscribe_success | Start tick processing but do NOT generate signals until session opens. | Assert ticks buffered, no signals emitted |
| SH-05 | STREAMING | CLOSING | FILLED | — | position fully closed | Update position to FLAT. Log P&L. Emit trader.position_closed. | Assert state transition + P&L calculation |
| SH-06 | RECONNECTING | HAS_POSITION | FILLED (close) | — | connect_success | Detect position was closed during disconnect (via broker query). Reconcile to FLAT. | Mock broker reporting closed position |

### MEDIUM

| # | Adapter | Trader | Order | Calendar | Trigger | Expected Behavior | Test Strategy |
|---|---------|--------|-------|----------|---------|-------------------|---------------|
| SM-01 | STREAMING | HAS_POSITION | PENDING_CLOSE | DAY_SESSION | connection_lost then reconnect within 3s | Re-check order status. If filled during gap, update position. If not, re-submit. | Timed mock with fast reconnect |
| SM-02 | STREAMING | — | — | DAY→NIGHT transition | session_changed | Unsubscribe day contracts, subscribe night contracts. No position carry-over unless configured. | Assert contract swap, assert position policy |
| SM-03 | CIRCUIT_OPEN | NO_POSITION | — | — | circuit_reset | Reset to DISCONNECTED. Auto-connect if within trading hours. | Assert auto-connect in session, no-connect outside |

</scenarios>

<failure_cascades>
## Failure Cascades

| # | Origin Failure | Affected Subsystem | Cascade Effect | Mitigation |
|---|----------------|--------------------|----------------|------------|
| FC-01 | Adapter → CIRCUIT_OPEN | Trader | Cannot close positions, cannot open new | Alert operator. Trader enters FROZEN mode — no new signals processed. |
| FC-02 | Adapter → CIRCUIT_OPEN | Order | Cannot submit/cancel orders | Order queue paused. Resume on circuit reset. TTL on queued orders. |
| FC-03 | Order → REJECTED | Trader | Position open attempt failed | Trader reverts to previous state. Log rejection reason. Cooldown before retry. |
| FC-04 | Calendar → SESSION_ENDED | Trader (HAS_POSITION) | Must close before market closes | Escalation: limit order → market order → alert if unfilled |
| FC-05 | Calendar → SESSION_ENDED | Order (PENDING) | Pending orders become invalid | Cancel all pending. Log each cancellation. |

</failure_cascades>

<event_ordering>
## Event Ordering Sensitivity

| # | Sequence A (expected) | Sequence B (race condition) | Outcome Difference | Handling |
|---|----------------------|----------------------------|--------------------|----------|
| EO-01 | connection_lost → reconnect → order_status_query | connection_lost → order_filled (delayed) → reconnect | Sequence B: fill event arrives after we thought connection was lost. Local state may not reflect fill. | On reconnect, ALWAYS query broker for ground truth. Don't trust local state alone. |
| EO-02 | signal_generated → order_placed → tick_received | signal_generated → tick_received (price moved) → order_placed (stale price) | Sequence B: order uses stale signal. Price already moved. | Validate signal freshness before order submission. Max age = 2 ticks. |
| EO-03 | session_ended → position_close_attempt | position_close_filled → session_ended | Sequence A: close might not fill in time. Sequence B: already closed, session end is no-op. | Idempotent close — if already FLAT, session_ended is safe. |

</event_ordering>

<coverage>
## Coverage Summary

| Priority | Total Scenarios | With Integration Test | Gap |
|----------|----------------|-----------------------|-----|
| CRITICAL | 6 | 6 (100%) | 0 |
| HIGH | 6 | 6 (100%) | 0 |
| MEDIUM | 3 | 2 | 1 (SM-03 low risk) |
| LOW | 3 | documented only | — |

**Total integration tests required:** 14

</coverage>

---

*Phase: 07-order-state-machine-trader-refactor*
*Scenarios modeled: 2026-03-30*
```

---

## Guidelines

<guidelines>
**This template captures CROSS-SUBSYSTEM interactions that individual DFA tests miss.**

The output should answer: "When multiple subsystems are in unusual states simultaneously, what happens?"

**Good content (actionable scenarios):**
- Specific state combination for each subsystem
- Clear trigger event
- Expected behavior precise enough to write a test assertion
- Test strategy describes how to set up the pre-conditions

**Bad content (too vague):**
- "System should handle disconnection gracefully" (which states? which subsystems?)
- "Test error scenarios" (which errors? in which combinations?)
- Scenarios without test strategy (how does the executor know what to assert?)
- Missing failure cascades (how does failure in A affect B?)

**Selection discipline:**
- You do NOT need to enumerate all N x M combinations
- Focus on combinations where **financial risk**, **data loss**, or **user-visible failures** occur
- CRITICAL scenarios: 100% integration test coverage mandatory
- HIGH scenarios: should have integration tests
- MEDIUM: nice to have
- LOW: document only, test if time permits

**Event ordering is often the hardest part:**
- Distributed/async systems don't guarantee event order
- If two events can arrive in either order, specify behavior for BOTH orderings
- "Always query ground truth on reconnect" is a common mitigation pattern

**After creation:**
- File lives in phase directory: `.planning/phases/XX-name/{phase_num}-DFA-SCENARIOS.md`
- `gsd-planner` creates integration tasks from CRITICAL and HIGH scenarios
- `gsd-executor` sets up test fixtures per scenario (mock states, inject events)
- `gsd-verifier` checks CRITICAL coverage = 100%
- Scenario IDs (SC-XX, SH-XX, SM-XX), cascade IDs (FC-XX), and ordering IDs (EO-XX) are referenced in PLAN.md tasks
</guidelines>
