#!/bin/bash

# ============================================================
#  Engineering Change Management System — Setup Script
#  Run this from the root of your project:  bash setup-docs.sh
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

TODAY=$(date +%Y-%m-%d)
PROJECT_NAME=$(basename "$PWD")

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║   Engineering Docs Setup — $PROJECT_NAME ${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Create directory structure ─────────────────────────────
echo -e "${YELLOW}→ Creating /docs structure...${RESET}"

mkdir -p docs/decisions
mkdir -p docs/features
mkdir -p docs/sessions

# ── 2. overview.md ────────────────────────────────────────────
cat > docs/overview.md << EOF
# $PROJECT_NAME — Project Overview

> One-paragraph description of what this project does and why it exists.

## Purpose
<!-- What problem does this solve? Who are the users? -->

## Key Goals
- Goal 1
- Goal 2
- Goal 3

## Team / Ownership
| Role | Name / Contact |
|------|---------------|
| Owner | |
| Lead Dev | |

## Links
- Repo:
- Staging:
- Production:
- CI/CD:
EOF

# ── 3. architecture.md ────────────────────────────────────────
cat > docs/architecture.md << EOF
# Architecture

## High-Level Diagram
\`\`\`
(Add diagram here — ASCII, Mermaid, or link to image)
\`\`\`

## Components
| Component | Responsibility | Location |
|-----------|---------------|----------|
| Frontend  | UI layer      | /client  |
| Backend   | API/business  | /server  |
| Database  | Persistence   | Postgres |

## Data Flow
<!-- Describe how a typical request flows through the system -->

## External Services
| Service | Purpose | Notes |
|---------|---------|-------|
|         |         |       |

## Key Design Decisions
See /docs/decisions/ for ADRs.
EOF

# ── 4. stack.md ───────────────────────────────────────────────
cat > docs/stack.md << EOF
# Technology Stack

## Frontend
- Framework:
- Styling:
- State management:
- Key libraries:

## Backend
- Runtime / Language:
- Framework:
- Auth:
- Key libraries:

## Database
- Primary DB:
- Cache:
- ORM / query layer:

## Infrastructure
- Hosting:
- CI/CD:
- Containerization:
- Monitoring:

## Environment Variables
| Variable | Purpose | Required |
|----------|---------|----------|
| DATABASE_URL | DB connection | ✅ |
| JWT_SECRET | Auth signing key | ✅ |

## Local Setup
\`\`\`bash
# Clone and install
git clone <repo>
cd $PROJECT_NAME
cp .env.example .env   # fill in values
npm install            # or yarn / pnpm
npm run dev
\`\`\`
EOF

# ── 5. deployment.md ──────────────────────────────────────────
cat > docs/deployment.md << EOF
# Deployment

## Environments
| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| Development | localhost | any | No |
| Staging | | main | Yes |
| Production | | main (tagged) | Manual |

## Deploy Steps (Production)
1. Merge PR to \`main\`
2. Tag release: \`git tag v1.x.x && git push --tags\`
3. CI/CD pipeline runs
4. Monitor logs

## Rollback
\`\`\`bash
# Example rollback command
git revert <commit-hash>
git push origin main
\`\`\`

## Docker
\`\`\`bash
docker compose up -d          # start
docker compose down           # stop
docker compose logs -f        # tail logs
\`\`\`

## Health Checks
- [ ] API responds at /health
- [ ] DB connection verified
- [ ] Env variables loaded
EOF

# ── 6. changelog.md ───────────────────────────────────────────
cat > docs/changelog.md << EOF
# Changelog

All notable changes to this project are documented here.
Format: \`## [version] — YYYY-MM-DD\`

---

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---

## [0.1.0] — $TODAY

### Added
- Initial project setup
- /docs knowledge base created
EOF

# ── 7. current-status.md ──────────────────────────────────────
cat > docs/current-status.md << EOF
# Current Status
_Last updated: $TODAY_

## ✅ What Works
- (List features that are live and stable)

## 🚧 In Progress
- (List active work)

## ❌ Known Bugs / Issues
- (List known problems)

## 🏗️ Architecture Snapshot
- Backend: running on ...
- Frontend: deployed at ...
- Database: ...
- Docker: running / not running

## 📦 Active Modules
| Module | Status | Owner |
|--------|--------|-------|
|        |        |       |

## 🚀 Deployment Status
- Staging: ✅ / ❌
- Production: ✅ / ❌
- Last deploy: $TODAY

## 🔜 Next Steps
1.
2.
3.
EOF

# ── 8. First session log ──────────────────────────────────────
cat > "docs/sessions/${TODAY}-initial-setup.md" << EOF
# Session: Initial Docs Setup
Date: $TODAY

## Objective
Set up the engineering change management system for $PROJECT_NAME.

## Changes Made
- Created /docs directory structure
- Added overview, architecture, stack, deployment, changelog, current-status files
- Added decisions/, features/, sessions/ subdirectories
- Added ADR template and example feature doc

## Files Changed
- docs/ (all files — new)

## Risks
- None (documentation only)

## Next Steps
- Fill in project details in each doc
- Add first real ADR for a key architecture decision
- Configure AI agents to auto-update docs after sessions
EOF

# ── 9. ADR template + example ─────────────────────────────────
cat > docs/decisions/ADR-000-template.md << EOF
# ADR-000: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
What situation or problem prompted this decision?

## Decision
What did we decide to do?

## Consequences
### Positive
-

### Negative
-

## Alternatives Considered
| Alternative | Why rejected |
|-------------|-------------|
|             |             |
EOF

cat > docs/decisions/ADR-001-example.md << EOF
# ADR-001: Use Docker Compose for Local Development

**Date:** $TODAY
**Status:** Accepted

## Context
Team needs a consistent local dev environment that mirrors production closely.

## Decision
Use Docker Compose to orchestrate all services locally (app, database, cache).

## Consequences
### Positive
- Consistent environment across machines
- Easy onboarding (one command: \`docker compose up\`)
- Mirrors production infrastructure

### Negative
- Slightly higher resource usage on dev machines
- Docker must be installed

## Alternatives Considered
| Alternative | Why rejected |
|-------------|-------------|
| Local installs only | Inconsistent across OS/machines |
| Kubernetes locally | Too complex for dev |
EOF

# ── 10. Example feature doc ───────────────────────────────────
cat > docs/features/example-feature.md << EOF
# Feature: [Feature Name]

**Status:** Planning | In Progress | Done | Deprecated
**Owner:**
**Last updated:** $TODAY

## Summary
What does this feature do? Who uses it?

## User Story
As a [user type], I want [goal] so that [benefit].

## Technical Design
<!-- How is it implemented? Key files, APIs, data models -->

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/feature | List items |

## Database Changes
<!-- Schema changes, migrations -->

## Known Limitations
-

## Related ADRs
- ADR-001
EOF

# ── 11. AI agent instructions file ───────────────────────────
cat > docs/AI-AGENT-INSTRUCTIONS.md << EOF
# Instructions for AI Agents (Claude Code, etc.)

## After Every Significant Change

Please do ALL of the following at the end of each session:

1. **Update \`docs/changelog.md\`**
   - Add a new entry under [Unreleased] with what changed.

2. **Create a session report** at \`docs/sessions/YYYY-MM-DD-brief-title.md\`
   - Use the template below.

3. **Update \`docs/current-status.md\`**
   - Reflect new working features, bugs fixed, pending issues.

4. **Update relevant feature docs** in \`docs/features/\` if a feature was changed.

5. **Create an ADR** in \`docs/decisions/\` if a major architecture decision was made.

---

## Session Report Template

\`\`\`markdown
# Session: [Title]
Date: YYYY-MM-DD

## Objective
What was the goal of this session?

## Changes Made
- Change 1
- Change 2

## Files Changed
- path/to/file.ts
- path/to/other.ts

## Docker / Infrastructure Changes
- (if any)

## Risks
- (anything that could break)

## Next Steps
- What should happen next?
\`\`\`
EOF

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Done! Here's what was created:${RESET}"
echo ""
echo "  docs/"
echo "  ├── overview.md"
echo "  ├── architecture.md"
echo "  ├── stack.md"
echo "  ├── deployment.md"
echo "  ├── changelog.md"
echo "  ├── current-status.md"
echo "  ├── AI-AGENT-INSTRUCTIONS.md"
echo "  ├── decisions/"
echo "  │   ├── ADR-000-template.md"
echo "  │   └── ADR-001-example.md"
echo "  ├── features/"
echo "  │   └── example-feature.md"
echo "  └── sessions/"
echo "      └── ${TODAY}-initial-setup.md"
echo ""
echo -e "${CYAN}Next steps:${RESET}"
echo "  1. Fill in docs/overview.md with your project details"
echo "  2. Update docs/stack.md with your actual tech stack"
echo "  3. Copy docs/AI-AGENT-INSTRUCTIONS.md into your AI agent's system prompt"
echo "  4. Delete example files when you add real ones"
echo ""