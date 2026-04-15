# gsd-dfa Documentation

Comprehensive documentation for **gsd-dfa** — a spec-driven development framework for AI coding agents with **explicit Deterministic Finite Automaton (DFA) state modeling** as its core differentiator.

Language versions: [English](README.md) · [Português (pt-BR)](pt-BR/README.md) · [日本語](ja-JP/README.md) · [简体中文](zh-CN/README.md)

## Documentation Index

| Document | Audience | Description |
|----------|----------|-------------|
| [DFA Methodology](DFA-METHODOLOGY.md) | All users | **Core differentiator.** When and how to model stateful subsystems as DFAs; the 7-command `/gsd-dfa-*` pipeline |
| [Kiosk Worked Example](examples/dfa-kiosk-worked-example.md) | All users | End-to-end DFA walkthrough on a 3-subsystem beverage kiosk — findings at each stage |
| [Architecture](ARCHITECTURE.md) | Contributors, advanced users | System architecture, agent model, data flow, and internal design |
| [Feature Reference](FEATURES.md) | All users | Complete feature and function documentation with requirements |
| [Command Reference](COMMANDS.md) | All users | Every command with syntax, flags, options, and examples |
| [Configuration Reference](CONFIGURATION.md) | All users | Full config schema, workflow toggles, model profiles, git branching |
| [CLI Tools Reference](CLI-TOOLS.md) | Contributors, agent authors | `gsd-tools.cjs` programmatic API for workflows and agents |
| [Agent Reference](AGENTS.md) | Contributors, advanced users | All 21 specialized agents — roles, tools, spawn patterns (DFA-aware agents flagged) |
| [User Guide](USER-GUIDE.md) | All users | Workflow walkthroughs, troubleshooting, and recovery |
| [Context Monitor](context-monitor.md) | All users | Context window monitoring hook architecture |
| [Discuss Mode](workflow-discuss-mode.md) | All users | Assumptions vs interview mode for discuss-phase |

## Quick Links

- **What makes gsd-dfa different:** [DFA Methodology](DFA-METHODOLOGY.md) — state-machine-driven planning for stateful subsystems
- **Getting started:** [README](../README.md) → install → `/gsd-new-project`
- **Full workflow walkthrough:** [User Guide](USER-GUIDE.md)
- **All commands at a glance:** [Command Reference](COMMANDS.md) (includes the 7 `/gsd-dfa-*` commands)
- **DFA worked example:** [Kiosk walkthrough](examples/dfa-kiosk-worked-example.md)
- **Configuring gsd-dfa:** [Configuration Reference](CONFIGURATION.md)
- **How the system works internally:** [Architecture](ARCHITECTURE.md)
- **Contributing or extending:** [CLI Tools Reference](CLI-TOOLS.md) + [Agent Reference](AGENTS.md)
