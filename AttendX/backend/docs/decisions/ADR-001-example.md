# ADR-001: Use Docker Compose for Local Development

**Date:** 2026-05-08
**Status:** Accepted

## Context
Team needs a consistent local dev environment that mirrors production closely.

## Decision
Use Docker Compose to orchestrate all services locally (app, database, cache).

## Consequences
### Positive
- Consistent environment across machines
- Easy onboarding (one command: `docker compose up`)
- Mirrors production infrastructure

### Negative
- Slightly higher resource usage on dev machines
- Docker must be installed

## Alternatives Considered
| Alternative | Why rejected |
|-------------|-------------|
| Local installs only | Inconsistent across OS/machines |
| Kubernetes locally | Too complex for dev |
