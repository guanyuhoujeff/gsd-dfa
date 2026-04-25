<purpose>
Display the complete gsd-dfa command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# gsd-dfa Command Reference

**gsd-dfa** (Get Shit Done + Deterministic Finite Automaton modeling) creates hierarchical project plans optimized for solo agentic development with Claude Code, with explicit state-machine modeling for stateful subsystems.

## Quick Start

1. `/gsd-new-project` - Initialize project (includes research, requirements, roadmap)
2. `/gsd-plan-phase 1` - Create detailed plan for first phase
3. `/gsd-execute-phase 1` - Execute the phase

**Building a stateful subsystem** (auth, payments, retry/circuit breaker, lifecycle, session)?
Run `/gsd-dfa-scan` to find candidates, then `/gsd-dfa-model <subsystem> --phase N` *before* `/gsd-plan-phase N` so the planner decomposes by transition instead of by feature. See **State Machine Modeling (DFA)** below.

## Staying Updated

gsd-dfa evolves fast. Update periodically:

```bash
npx gsd-dfa@latest
```

## Core Workflow

```
/gsd-new-project → /gsd-plan-phase → /gsd-execute-phase → repeat
```

For stateful subsystems, slot DFA modeling **between** discuss/research and `/gsd-plan-phase`:

```
/gsd-discuss-phase N → /gsd-dfa-model <subsystem> --phase N → /gsd-dfa-verify --phase N → /gsd-plan-phase N
```

The planner consumes `{phase_num}-DFA-*.md` artifacts and decomposes work by *transition* rather than by feature. The verifier checks DFA transition coverage during `/gsd-verify-work`.

### Project Initialization

**`/gsd-new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/gsd-new-project`

**`/gsd-map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/gsd-new-project` on existing codebases

Usage: `/gsd-map-codebase`

### Phase Planning

**`/gsd-discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel
- Optional `--batch` asks 2-5 related questions at a time instead of one-by-one

Usage: `/gsd-discuss-phase 2`
Usage: `/gsd-discuss-phase 2 --batch`
Usage: `/gsd-discuss-phase 2 --batch=3`

**`/gsd-research-phase <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates RESEARCH.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/gsd-research-phase 3`

**`/gsd-list-phase-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a phase
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/gsd-list-phase-assumptions 3`

**`/gsd-plan-phase <number>`**
Create detailed execution plan for a specific phase.

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/gsd-plan-phase 1`
Result: Creates `.planning/phases/01-foundation/01-01-PLAN.md`

**PRD Express Path:** Pass `--prd path/to/requirements.md` to skip discuss-phase entirely. Your PRD becomes locked decisions in CONTEXT.md. Useful when you already have clear acceptance criteria.

### State Machine Modeling (DFA)

The DFA family is gsd-dfa's core differentiator. Use it whenever a phase touches a stateful subsystem (auth/session, payment, retry/circuit breaker, connection lifecycle, order state, agent loops, etc.) so the planner gets a transition table instead of "implement reconnect logic".

DFAs come in two modes:
- **Phase-bound** (`--phase N`): tied to a GSD phase, written to `.planning/phases/XX-name/{phase_num}-DFA-{subsystem}.md`. Consumed by the planner and verifier.
- **Standalone**: retroactive modeling of existing code, written to `.planning/dfa/DFA-{subsystem}.md`.

**`/gsd-dfa-scan [directory]`**
Scan a codebase to identify subsystems suitable for DFA modeling.

- Detects state enums, reducers, FSM patterns, lifecycle methods, circuit breakers
- Ranks candidates by statefulness signals
- Output is informational (no file written) — use before `/gsd-dfa-model`

Usage: `/gsd-dfa-scan` or `/gsd-dfa-scan ./src`

**`/gsd-dfa-model <subsystem> [--phase N | --standalone]`**
Build a complete DFA state table for one subsystem.

- Enumerates states (with invariants), events (with sources), transitions, forbidden transitions, and ignored cells
- Produces an N×M completeness matrix — no empty cells allowed
- Optionally generates a Mermaid state diagram
- Phase-bound by default when `--phase N` given; standalone when no phase or `--standalone`

Usage: `/gsd-dfa-model auth-session --phase 5`
Usage: `/gsd-dfa-model order-state --standalone`

**`/gsd-dfa-verify [file-or-dir] [--phase N]`**
Verify DFA self-consistency before relying on it.

- Checks for dead states, unreachable states, unhandled (state,event) cells, guard exhaustiveness, terminal-state validity, event-source consistency
- Cross-DFA event consistency (events produced by one DFA match events consumed by another)
- ERROR / WARNING / INFO severity output

Usage: `/gsd-dfa-verify --phase 5`
Usage: `/gsd-dfa-verify .planning/dfa/`

**`/gsd-dfa-scenarios [--phase N] [--dir <path>]`**
Generate cross-subsystem scenario matrix when 2+ DFAs interact.

- Identifies dangerous state combinations across subsystems
- Maps failure cascades (A fails → how does B react?)
- Flags event-ordering sensitivities (A then B vs B then A)
- Output: `{phase_num}-DFA-SCENARIOS.md` (phase-bound) or `.planning/dfa/DFA-cross-subsystem-scenarios.md` (standalone)

Usage: `/gsd-dfa-scenarios --phase 5`

**`/gsd-dfa-btree [--level 0|1|2] [--event <event-name>] [--dir <path>]`**
Synthesize all DFAs into a hierarchical Behavior Tree with Mermaid diagrams.

- L0: system overview / L1: capability trees / L2: full detail with every guard and action
- Cross-subsystem view answering "what happens when event X arrives?"
- Output: `.planning/dfa/DFA-BTREE.md` (or `DFA-BTREE-{event}.md` for single-event focus)

Usage: `/gsd-dfa-btree --level 1`

**`/gsd-dfa-tests <dfa-file> [--lang python|typescript|go]`**
Generate test skeletons from a DFA transition table.

- Each `T-XX` (transition) → test asserting state change + action + emitted event
- Each `F-XX` (forbidden) → test asserting state unchanged + error logged
- Each `S-XX` (self-loop) → test asserting state unchanged + action fired
- Auto-detects language if `--lang` omitted

Usage: `/gsd-dfa-tests .planning/phases/05-auth/05-DFA-auth-session.md`

**`/gsd-dfa-audit [file-or-directory]`**
Compare DFA specs against actual code to find implementation gaps.

- For each transition, checks code handles it
- For each forbidden transition, checks code rejects it
- Flags code paths not covered by any DFA transition
- Output: `.planning/dfa/DFA-AUDIT-{date}.md` with severity and fix direction

Usage: `/gsd-dfa-audit .planning/dfa/`

### Execution

**`/gsd-execute-phase <phase-number>`**
Execute all plans in a phase, or run a specific wave.

- Groups plans by wave (from frontmatter), executes waves sequentially
- Plans within each wave run in parallel via Task tool
- Optional `--wave N` flag executes only Wave `N` and stops unless the phase is now fully complete
- Verifies phase goal after all plans complete
- Updates REQUIREMENTS.md, ROADMAP.md, STATE.md

Usage: `/gsd-execute-phase 5`
Usage: `/gsd-execute-phase 5 --wave 2`

### Smart Router

**`/gsd-do <description>`**
Route freeform text to the right gsd-dfa command automatically.

- Analyzes natural language input to find the best matching gsd-dfa command
- Acts as a dispatcher — never does the work itself
- Resolves ambiguity by asking you to pick between top matches
- Use when you know what you want but don't know which `/gsd-*` command to run

Usage: `/gsd-do fix the login button`
Usage: `/gsd-do refactor the auth system`
Usage: `/gsd-do I want to start a new milestone`

### Quick Mode

**`/gsd-quick [--full] [--validate] [--discuss] [--research]`**
Execute small, ad-hoc tasks with gsd-dfa guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns planner + executor (skips researcher, checker, verifier by default)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md tracking (not ROADMAP.md)

Flags enable additional quality steps:
- `--full` — Complete quality pipeline: discussion + research + plan-checking + verification
- `--validate` — Plan-checking (max 2 iterations) and post-execution verification only
- `--discuss` — Lightweight discussion to surface gray areas before planning
- `--research` — Focused research agent investigates approaches before planning

Granular flags are composable: `--discuss --research --validate` gives the same as `--full`.

Usage: `/gsd-quick`
Usage: `/gsd-quick --full`
Usage: `/gsd-quick --research --validate`
Result: Creates `.planning/quick/NNN-slug/PLAN.md`, `.planning/quick/NNN-slug/SUMMARY.md`

---

**`/gsd-fast [description]`**
Execute a trivial task inline — no subagents, no planning files, no overhead.

For tasks too small to justify planning: typo fixes, config changes, forgotten commits, simple additions. Runs in the current context, makes the change, commits, and logs to STATE.md.

- No PLAN.md or SUMMARY.md created
- No subagent spawned (runs inline)
- ≤ 3 file edits — redirects to `/gsd-quick` if task is non-trivial
- Atomic commit with conventional message

Usage: `/gsd-fast "fix the typo in README"`
Usage: `/gsd-fast "add .env to gitignore"`

### Roadmap Management

**`/gsd-add-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/gsd-add-phase "Add admin dashboard"`

**`/gsd-insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/gsd-insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/gsd-remove-phase <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/gsd-remove-phase 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

### Milestone Management

**`/gsd-new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown
- Optional `--reset-phase-numbers` flag restarts numbering at Phase 1 and archives old phase dirs first for safety

Mirrors `/gsd-new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/gsd-new-milestone "v2.0 Features"`
Usage: `/gsd-new-milestone --reset-phase-numbers "v2.0 Features"`

**`/gsd-complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/gsd-complete-milestone 1.0.0`

### Progress Tracking

**`/gsd-progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/gsd-progress`

### Session Management

**`/gsd-resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/gsd-resume-work`

**`/gsd-pause-work`**
Create context handoff when pausing work mid-phase.

- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/gsd-pause-work`

### Debugging

**`/gsd-debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.planning/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/gsd-debug` with no args to resume
- Archives resolved issues to `.planning/debug/resolved/`

Usage: `/gsd-debug "login button doesn't work"`
Usage: `/gsd-debug` (resume active session)

### Quick Notes

**`/gsd-note <text>`**
Zero-friction idea capture — one command, instant save, no questions.

- Saves timestamped note to `.planning/notes/` (or `~/.claude/notes/` globally)
- Three subcommands: append (default), list, promote
- Promote converts a note into a structured todo
- Works without a project (falls back to global scope)

Usage: `/gsd-note refactor the hook system`
Usage: `/gsd-note list`
Usage: `/gsd-note promote 3`
Usage: `/gsd-note --global cross-project idea`

### Todo Management

**`/gsd-add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.planning/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/gsd-add-todo` (infers from conversation)
Usage: `/gsd-add-todo Add auth token refresh`

**`/gsd-check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/gsd-check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to phase, brainstorm)
- Moves todo to done/ when work begins

Usage: `/gsd-check-todos`
Usage: `/gsd-check-todos api`

### User Acceptance Testing

**`/gsd-verify-work [phase]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from SUMMARY.md files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix plans
- Ready for re-execution if issues found

Usage: `/gsd-verify-work 3`

### Ship Work

**`/gsd-ship [phase]`**
Create a PR from completed phase work with an auto-generated body.

- Pushes branch to remote
- Creates PR with summary from SUMMARY.md, VERIFICATION.md, REQUIREMENTS.md
- Optionally requests code review
- Updates STATE.md with shipping status

Prerequisites: Phase verified, `gh` CLI installed and authenticated.

Usage: `/gsd-ship 4` or `/gsd-ship 4 --draft`

---

**`/gsd-review --phase N [--gemini] [--claude] [--codex] [--coderabbit] [--opencode] [--qwen] [--cursor] [--all]`**
Cross-AI peer review — invoke external AI CLIs to independently review phase plans.

- Detects available CLIs (gemini, claude, codex, coderabbit)
- Each CLI reviews plans independently with the same structured prompt
- CodeRabbit reviews the current git diff (not a prompt) — may take up to 5 minutes
- Produces REVIEWS.md with per-reviewer feedback and consensus summary
- Feed reviews back into planning: `/gsd-plan-phase N --reviews`

Usage: `/gsd-review --phase 3 --all`

---

**`/gsd-pr-branch [target]`**
Create a clean branch for pull requests by filtering out .planning/ commits.

- Classifies commits: code-only (include), planning-only (exclude), mixed (include sans .planning/)
- Cherry-picks code commits onto a clean branch
- Reviewers see only code changes, no gsd-dfa artifacts

Usage: `/gsd-pr-branch` or `/gsd-pr-branch main`

---

**`/gsd-plant-seed [idea]`**
Capture a forward-looking idea with trigger conditions for automatic surfacing.

- Seeds preserve WHY, WHEN to surface, and breadcrumbs to related code
- Auto-surfaces during `/gsd-new-milestone` when trigger conditions match
- Better than deferred items — triggers are checked, not forgotten

Usage: `/gsd-plant-seed "add real-time notifications when we build the events system"`

---

**`/gsd-audit-uat`**
Cross-phase audit of all outstanding UAT and verification items.
- Scans every phase for pending, skipped, blocked, and human_needed items
- Cross-references against codebase to detect stale documentation
- Produces prioritized human test plan grouped by testability
- Use before starting a new milestone to clear verification debt

Usage: `/gsd-audit-uat`

### Milestone Auditing

**`/gsd-audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/gsd-audit-milestone`

**`/gsd-plan-milestone-gaps`**
Create phases to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into phases
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure phases to ROADMAP.md
- Ready for `/gsd-plan-phase` on new phases

Usage: `/gsd-plan-milestone-gaps`

### Configuration

**`/gsd-settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget/inherit)
- Updates `.planning/config.json`

Usage: `/gsd-settings`

**`/gsd-set-profile <profile>`**
Quick switch model profile for gsd-dfa agents.

- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification
- `inherit` — Use current session model for all agents (OpenCode `/model`)

Usage: `/gsd-set-profile budget`

### Utility Commands

**`/gsd-cleanup`**
Archive accumulated phase directories from completed milestones.

- Identifies phases from completed milestones still in `.planning/phases/`
- Shows dry-run summary before moving anything
- Moves phase dirs to `.planning/milestones/v{X.Y}-phases/`
- Use after multiple milestones to reduce `.planning/phases/` clutter

Usage: `/gsd-cleanup`

**`/gsd-help`**
Show this command reference.

**`/gsd-update`**
Update gsd-dfa to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx gsd-dfa`

Usage: `/gsd-update`

**`/gsd-join-discord`**
Join the gsd-dfa Discord community.

- Get help, share what you're building, stay updated
- Connect with other gsd-dfa users

Usage: `/gsd-join-discord`

## Files & Structure

```
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── RETROSPECTIVE.md      # Living retrospective (updated per milestone)
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── milestones/
│   ├── v1.0-ROADMAP.md       # Archived roadmap snapshot
│   ├── v1.0-REQUIREMENTS.md  # Archived requirements
│   └── v1.0-phases/          # Archived phase dirs (via /gsd-cleanup or --archive-phases)
│       ├── 01-foundation/
│       └── 02-core-features/
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
├── dfa/                  # Standalone DFA artifacts (cross-phase / retroactive)
│   ├── DFA-{subsystem}.md             # State table per subsystem
│   ├── DFA-BTREE.md                   # Hierarchical behavior tree
│   ├── DFA-cross-subsystem-scenarios.md  # Cross-DFA scenario matrix
│   └── DFA-AUDIT-{YYYY-MM-DD}.md      # Spec-vs-code gap report
└── phases/
    ├── 05-auth/
    │   ├── 05-01-PLAN.md
    │   ├── 05-01-SUMMARY.md
    │   ├── 05-DFA-auth-session.md     # Phase-bound DFA state table
    │   └── 05-DFA-SCENARIOS.md        # Phase-bound cross-subsystem scenarios
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/gsd-new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/gsd-new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/gsd-plan-phase 1       # Create plans for first phase
/clear
/gsd-execute-phase 1    # Execute all plans in phase
```

**Resuming work after a break:**

```
/gsd-progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/gsd-insert-phase 5 "Critical security fix"
/gsd-plan-phase 5.1
/gsd-execute-phase 5.1
```

**Completing a milestone:**

```
/gsd-complete-milestone 1.0.0
/clear
/gsd-new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/gsd-add-todo                    # Capture from conversation context
/gsd-add-todo Fix modal z-index  # Capture with explicit description
/gsd-check-todos                 # Review and work on todos
/gsd-check-todos api             # Filter by area
```

**Debugging an issue:**

```
/gsd-debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/gsd-debug                                    # Resume from where you left off
```

**Modeling a stateful subsystem inside a phase:**

```
/gsd-discuss-phase 5                            # Capture vision
/gsd-dfa-model auth-session --phase 5           # Build state table BEFORE planning
/gsd-dfa-verify --phase 5                       # Catch dead states / unhandled events
/gsd-plan-phase 5                               # Planner decomposes by transition
/gsd-dfa-tests .planning/phases/05-*/05-DFA-auth-session.md   # Bootstrap test skeletons
/gsd-execute-phase 5
/gsd-verify-work 5                              # Verifier checks transition coverage
```

**Reverse-engineering DFAs from existing code:**

```
/gsd-dfa-scan ./src                                  # Find candidate subsystems
/gsd-dfa-model order-state --standalone              # Model one at a time
/gsd-dfa-model payment-flow --standalone
/gsd-dfa-scenarios                                   # Cross-subsystem risks
/gsd-dfa-audit .planning/dfa/                        # Find code-vs-spec gaps
/gsd-dfa-btree --level 1                             # Generate top-down decision tree
```

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/gsd-progress` to check where you're up to
</reference>
