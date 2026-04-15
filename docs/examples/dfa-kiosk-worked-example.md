# Worked Example: Smart Beverage Kiosk

> Full end-to-end walkthrough of the DFA methodology pipeline on a concrete small system. Referenced from [`docs/DFA-METHODOLOGY.md`](../DFA-METHODOLOGY.md).

This example walks through the full pipeline on a small-but-non-trivial demo: a self-service beverage kiosk with camera-based customer recognition, microphone + speaker voice interaction, a touch screen, and a backend inventory integration that can block out-of-stock orders.

It is deliberately chosen because no single subsystem is complicated, but the **interactions between subsystems** produce exactly the kind of bugs DFA methodology is designed to catch.

**Artifacts (all in `.planning/dfa/`):**

| File | Role |
|---|---|
| `DFA-Session.md` | Kiosk lifecycle: IDLE → DETECTING → GREETING → ORDERING → CONFIRMING → PAYING → THANK_YOU |
| `DFA-OrderCart.md` | Cart contents + live inventory gating (8 states incl. WARNING, BLOCKED) |
| `DFA-VoiceInteraction.md` | Mic/speaker coordination, STT/TTS pipeline, barge-in handling |
| `DFA-BTREE.md` | L0 system overview + L1 per-entry-point behavior trees |

**Totals across the three DFAs:** 21 states, 32 events, 57 transitions, 37 forbidden, 56 ignored — 151 explicit cells across a 226-cell state×event space, with 75 structurally impossible.

## Step 1 — Model each subsystem independently (`/gsd-dfa-model`)

Each DFA is written in isolation. At this stage the files look internally complete and self-consistent. Each has a `<completeness>` section with a filled matrix.

**What this step catches:** dead states, gaps inside one subsystem, guard exhaustiveness within one transition group.
**What it misses:** anything that only becomes visible when subsystems are composed.

## Step 2 — L0 system overview (`/gsd-dfa-btree --level 0`)

Wiring the three DFAs into one event flow graph immediately surfaced **3 issues invisible at Step 1**:

- **F-L0-01 — Boundary violation.** `DFA-Session.md` had TTS calls hidden in its `Action` column ("play welcome TTS") but never declared `tts_request` in its `<boundary>` **Produces** list. Reading the Session file alone made this look fine. The event-flow graph made the missing edge `Session → VoiceInteraction` obvious. *Fix:* added `tts_request` to Produces and moved the call from Action to Emits in T-02/T-03/T-04.

- **F-L0-02 — Umbrella event without a router.** `intent_recognized` was emitted by VoiceInteraction and consumed by both Session and OrderCart, but nothing specified *how* to route by intent name. A missed intent would silently drop. *Fix:* added an **Intent Dispatch Table** inside VoiceInteraction's `<boundary>` mapping 8 intent names to target DFA + concrete event, with an explicit fallback for unmapped intents.

- **F-L0-03 — Black-box external dependency.** PaymentGateway has no DFA of its own, so a 60-second gateway hang leaves Session stuck in PAYING with no timeout (F-07 forbids `idle_timeout_30s` there). *Fix deferred* for the teaching demo, but the issue is now **named, located, and rated** — which is the minimum standard for an acceptable deferral.

## Step 3 — L1 per-entry-point trees (`/gsd-dfa-btree --level 1`)

Generating a decision tree for each external entry point catches a different class of bug: **cross-subsystem state invariants that nobody wrote down.**

The flagship example was `inventory_empty`:
- OrderCart receives the verdict and needs to emit `tts_request` to warn the customer.
- L1 expansion showed the cascade reaches VoiceInteraction, which has 6 states.
- **Only 1 of the 6 target states (LISTENING) accepts `tts_request` cleanly.** The other 5 are all forbidden (F-03, F-05, F-06, F-07, F-08).
- This means OrderCart's `tts_request` emit has an implicit precondition: *"VoiceInteraction must be in LISTENING."*
- In the real flow this happens to be true by construction (inventory_empty only arrives shortly after VoiceInteraction returned to LISTENING via T-04), but **nothing in the DFA files stated this invariant.** The bug would manifest as "sometimes the customer doesn't hear the out-of-stock warning" — exactly the kind of intermittent production issue that DFA methodology exists to prevent.

The L1 trees for `face_detected`, `intent_recognized`, and `barge_in_detected` each surfaced their own smaller lessons (the Intent Dispatch router as a Selector node, the SPEAKING→INTERRUPTED→CAPTURING two-step async pattern, etc.).

## Step 4 — Verify (`/gsd-dfa-verify`)

After the L0 fixes, running verify flagged **4 residual warnings**, all of them "bookkeeping" class rather than correctness class:

1. **Implicit "impossible" assumption in DFA-Session.** Several `(state × event)` cells were marked "— impossible" but only hold under the assumption that the input layer (Touch UI / Intent Dispatch) pre-filters voice intents. Example: `ORDERING / confirmation_accepted` — a chatty customer can say "yes" in ORDERING, and the DFA says "impossible", which really means "we're trusting Intent Dispatch to filter this." **The invariant needs to be either written down or relaxed to `ignored` with a reason.** This is the same class of issue as F-L0-02 — implicit cross-subsystem filters pretending to be impossibility claims.
2. **Missing ignored-table entry in DFA-OrderCart.** `BLOCKED / customer_confirms_warning` is `ign` in the matrix but has no row in `<ignored>` explaining why.
3. **Double-counted bookkeeping row.** DFA-OrderCart's `<ignored>` table has a `SLEEPING / session_started` row that says "handled by T-01; duplicate call" — but that cell is T-01 in the matrix, not ign. It's documentation masquerading as coverage.
4. **Off-by-one label vs cell counting in DFA-Session's `<completeness>`.** T-02/T-03 share one cell but get counted as two labels, producing "41 explicit + 43 impossible = 84" instead of the strict cell count "40 + 44 = 84".

None of these blocked planning or test generation, but all of them are the kind of thing a review tool should catch before the spec goes to code.

## Step 5 — Liveness gaps the methodology did not catch

DFA excels at safety analysis ("every event that arrives is handled correctly") but is weaker at **liveness analysis** ("every event that should arrive does arrive"). Reviewing the demo after verification surfaced additional gaps the earlier steps missed:

- **BackendInventory silence.** `OrderCart.CHECKING` has transitions for `inventory_ok/low/empty` but no `inventory_timeout`. If the backend goes silent, the cart locks in CHECKING until `session_ended` clears it.
- **BackendNLU silence.** `VoiceInteraction.PROCESSING` has transitions for `stt_result/stt_error` but no `stt_timeout`. Voice subsystem locks and mic stays muted.
- **Consecutive STT errors.** T-05 fires the "sorry, I didn't catch that" TTS on every error with no retry counter. Persistent STT failure produces an endless apology loop.
- **`face_lost` during PAYING (F-06).** Handling is "log warning, ignore — do not abort mid-transaction." Result: a drink is made but no customer to take it. Needs an operational policy (staff pickup queue, retention timer, etc.) that DFA did not model.

These belong to a separate class of findings — **operator-intervention gaps** — and would become `F-L0-04` through `F-L0-07` in a production audit.

## Key lessons this example teaches

1. **"Impossible" is a dangerous label.** Every cell marked "— impossible" is really an implicit precondition on an upstream subsystem. Either document the precondition or change the cell to `ignored` with a reason. Otherwise you're shipping invariants that nobody has written down.

2. **Boundary violations hide in action columns.** If a DFA's `Action` column mentions another subsystem's event by name, that event must appear in `Produces`. L0 synthesis is the only reliable way to catch the mismatch — reading the DFA file alone will not.

3. **Cross-subsystem state invariants are invisible at Step 1 and surface at L1.** The `inventory_empty → tts_request → VoiceInteraction=LISTENING` chain is the canonical example. The DFA files looked fine in isolation; only when you draw the L1 cascade and see 5 of 6 target states rejecting the emit does the hidden contract become visible.

4. **Umbrella events need routers.** Any event produced with "payload decides which consumer" semantics (`intent_recognized`, `command_received`, `webhook_fired`) needs an explicit dispatch table. Otherwise test generators and auditors can't reason about what "this event was handled" means.

5. **Deferred findings are still findings.** F-L0-03 (PaymentGateway black box) is not fixed in this demo, but because it is named, located, and severity-rated, a production team would ship with the lockup risk as a **known ticket** rather than a **surprise**.

6. **The cleanest subsystem was the one with no cross-subsystem dependencies.** `DFA-VoiceInteraction.md` scored a perfect 49/49 matrix coverage with zero warnings — because its state and events are all in one physical boundary (mic + speaker + TTS engine). Every finding in this exercise landed on a subsystem boundary, not inside one. **Cross-subsystem interactions are where bugs live; inside-subsystem logic is usually fine.**

7. **DFA catches safety, not liveness.** The methodology reliably finds "what if event X arrives in state Y"; it does not find "what if event X should arrive but does not." Silence-timeout transitions must be modeled explicitly or left to a separate liveness review (Step 5 above).

## Pipeline at a glance

```
/gsd-dfa-model Session         ─┐
/gsd-dfa-model OrderCart       ─┼─→  3 independent DFAs (look fine in isolation)
/gsd-dfa-model VoiceInteraction─┘

/gsd-dfa-btree --level 0       ─→   3 findings (F-L0-01, F-L0-02, F-L0-03)
                                    ↓ fix F-L0-01 and F-L0-02 in source DFAs

/gsd-dfa-btree --level 1       ─→   cross-subsystem state invariant surfaced
                                    (inventory_empty → tts_request must land in LISTENING)

/gsd-dfa-verify                ─→   4 bookkeeping warnings
                                    (implicit "impossible", missing ign row, etc.)

(manual liveness review)       ─→   operator-intervention gaps
                                    (backend silence timeouts, abandoned-pickup policy)
```

Each step catches a class of issue the previous steps could not. That progression — *"find bugs earlier and at a lower cost than the next step would"* — is the value proposition of this entire methodology, concretely demonstrated on a small system.
