# Engineering Documentation System — Team Guide

> **TL;DR** — We use a `/docs` folder as our project's brain. Every AI coding session automatically updates it. This page explains the whole system so everyone is on the same page.

---

## Why This Exists

We use AI agents (Claude Code, Cursor, etc.) to write and modify code. The problem: AI agents have no memory between sessions, and raw Git commit history is hard to read for non-programmers.

This system solves both problems:

- **AI agents always know the current state** of the project before starting work
- **Team members can understand what changed** without reading code
- **Decisions are recorded** so we never wonder "why did we do it this way?"
- **No manual effort** — AI agents update the docs automatically after every session

---

## Folder Structure

```
/docs
│
├── overview.md          ← What is this project?
├── architecture.md      ← How is it built? (system diagram)
├── stack.md             ← What technologies do we use?
├── deployment.md        ← How do we deploy? (commands, envs)
├── changelog.md         ← Running log of every change
├── current-status.md    ← Snapshot of right now (read this first)
│
├── decisions/           ← Why we made big architecture choices
│   ├── ADR-001-...md
│   └── ADR-002-...md
│
├── features/            ← One file per major feature
│   ├── payment-system.md
│   └── user-management.md
│
└── sessions/            ← Log of every AI coding session
    ├── 2026-05-08-auth-update.md
    └── 2026-05-09-ui-refactor.md
```

---

## The Files Explained

### `current-status.md` — Start Here
**The most important file.** Before any meeting, session, or decision, read this first. It contains:
- What is working right now
- What is broken or incomplete
- What is actively being worked on
- Deployment status of each environment

It is updated automatically after every AI session.

---

### `changelog.md` — History of Changes
A chronological log of everything that has changed in the project. Written in plain English. You do not need to read code to understand it.

Example entry:
```
## [2026-05-09]
### Added
- Users can now reset their password via email
### Fixed
- Login page no longer crashes on mobile Safari
```

---

### `sessions/` — AI Session Reports
After every AI coding session, a report is created here. Each report contains:

| Section | What it tells you |
|---|---|
| **Objective** | What the session was trying to do |
| **Changes Made** | What actually got done, in plain English |
| **Files Changed** | Exact file paths that were modified |
| **Infrastructure Changes** | Docker, env variables, CI/CD changes |
| **Risks** | What might break or need attention |
| **Next Steps** | What should happen in the next session |

These are the fastest way to understand what an AI agent did.

---

### `decisions/` — Architecture Decision Records (ADRs)
When a major technical decision is made (choosing a database, adding a service, changing authentication), it gets recorded here as an ADR.

Each ADR answers:
- **What** was decided
- **Why** it was chosen
- **What alternatives** were rejected and why
- **What the consequences** are (good and bad)

This is long-term memory. When someone asks "why do we use Redis instead of Postgres for caching?" — the answer is in an ADR.

---

### `features/` — Feature Documentation
One file per major feature. Each file describes:
- What the feature does
- The user story it serves
- How it is technically implemented
- Known limitations

---

### `overview.md`, `architecture.md`, `stack.md`, `deployment.md`
These are living documents maintained throughout the project. They describe the project at a high level — what it is, how it is structured, what technologies it uses, and how to deploy it.

---

## How the AI Agent Updates Docs

Every AI agent on this project is given the following instruction (either via `CLAUDE.md` at the project root, or pasted into the system prompt):

> After every significant change, automatically update:
> - `changelog.md`
> - `current-status.md`
> - Create a session report in `sessions/`
> - Update the relevant feature doc in `features/`
> - Create an ADR in `decisions/` if an architecture decision was made

**This means no developer needs to manually write documentation.** The AI writes it.

---

## What Team Members Should Do

### Before starting any work
Read `docs/current-status.md` to know the state of the project.

### After an AI session ends
Quickly review the session report the AI created in `docs/sessions/`. Verify it accurately describes what happened. Edit it if anything is wrong or missing.

### When making a big decision
If you or an AI agent makes a decision that will affect the long-term architecture, make sure an ADR is created in `docs/decisions/`. If the AI did not create one automatically, ask it to.

### When onboarding a new team member
Point them to this file first, then `docs/overview.md`, then `docs/current-status.md`. That is enough context to understand the project without reading any code.

---

## How to Set This Up in a New Project

A setup script is included in the repository. Run it from the project root:

```bash
bash setup-docs.sh
```

This creates the entire `/docs` folder structure with pre-filled templates in one command.

---

## Quick Reference

| I want to know... | Read this file |
|---|---|
| What is this project? | `docs/overview.md` |
| What is working right now? | `docs/current-status.md` |
| What changed recently? | `docs/changelog.md` |
| What did the last AI session do? | `docs/sessions/` (latest file) |
| Why did we choose technology X? | `docs/decisions/` |
| How does feature X work? | `docs/features/` |
| How do I deploy? | `docs/deployment.md` |
| What tech stack are we on? | `docs/stack.md` |

---

## Maintaining Quality

A few rules to keep this system useful:

1. **Never delete session files** — they are a historical record
2. **Keep `current-status.md` honest** — if something is broken, say so
3. **ADRs are permanent** — if a decision changes, create a new ADR that supersedes the old one, don't edit the original
4. **Write for a non-programmer** — anyone reading these docs should understand them without knowing how to code
5. **Short and specific beats long and vague** — a three-bullet session report is better than a wall of text

---

*This documentation system was set up on {{ May 8 }}. Questions? Check `docs/overview.md` for team contacts.*