# Full-Repository QA Audit — AttendX

## Context

Five subsystems, almost no test safety net. **Phases 1 and 2 are complete** (commits `dd4469b` 2026-07-25, `441d92e` 2026-07-26). This document is the bootstrap for **Phase 5 — the chatbot suite**, taken out of order at the user's request. Everything stated here is verified, not assumed; a new session should not need to re-explore.

| Subsystem | Size | Tests | State |
|---|---|---|---|
| `AttendX/backend` — Node 22 / Express 4 / Sequelize 6 / Postgres | **169 routes**, 24 routers, 24 models, 33 migrations | Jest+Supertest, 4 files / **77 cases, all green** | Hermetic, measurable, and fully authz-swept. Coverage **63.14% statements** |
| `AttendX/admin` — Angular 19.2 | ~16.1k LOC, 43 components, 20 services, 5 guards, 2 interceptors | 1 CLI stub spec | **Cannot type-check** — asserts `app.title` on an empty class. Effective coverage 0% |
| `AttendX/student` — Flutter 3.44 | 9.7k LOC, 31 files | 1 widget test | **Fails** — asserts LoginScreen but `home:` is a 3.2s SplashScreen |
| `Chatbot` — Python 3.13 / FastAPI | 13 routes, RAG over ChromaDB, local Ollama | **zero** | `venv/` is broken but **untracked by git** (0 tracked files) — local dead weight, safe to ignore or delete |
| `Automation` — Playwright 1.52 | 1 spec / 2 cases | — | `node_modules` absent; chromium/firefox projects match zero specs, so **no browser ever launches** |

No CI, no lint config, no pre-commit hooks anywhere in the repo.

**The goal:** make this production-ready — discover everything, test it, run the tests, fix what's safely fixable, and report. The plan front-loads work that de-risks everything else and is explicit about where "100% coverage" is a bad investment.

---

## Phase 1 — COMPLETE (commit `dd4469b`)

### What shipped

**The testability split** (behaviour-preserving, proven so):
- `src/app.js` — exports the configured app. Requiring it opens no port.
- `src/associations.js` — the association block, verbatim, behind an idempotency flag. Exports `defineAssociations()`.
- `src/bootstrap/ensureAdminUser.js` — was a floating promise racing `app.listen`; now `await`ed inside `startServer()` after `sequelize.authenticate()`.
- `src/index.js` — thin bootstrap. `if (require.main === module) startServer()`, plus the SIGTERM handler inside that guard. Exports `{ app, startServer }`.

**The safety net:** `tests/fixtures/associations.snapshot.json` was generated from the *pre-split* `src/index.js` — 24 models, 64 associations, each with `{as, foreignKey, associationType, target}`. `tests/unit/associations.test.js` asserts `src/app.js` reproduces it exactly, plus that a second `defineAssociations()` call is a no-op. Diff after the split was empty.

**The test harness**, now hermetic:
- `tests/testEnv.js` — the single source of truth. Every value *pinned*, no fallbacks. Consumed by `globalSetup` (DB create/migrate) and by `tests/setupEnv.js` (a `setupFiles` entry, so every project and worker gets it before any `src/` module loads).
- `tests/setupAfterEnv.js` — tripwires. Throws before any test runs if `MAIL_PROVIDER`/`SMS_PROVIDER`/`AUTO_REFRESH_KNOWLEDGE`/`DISABLE_BACKGROUND_JOBS`/`NODE_ENV` drifted, or if `DB_NAME` isn't the disposable `attendance_db_test`. Replaces `global.fetch` with a mock that throws. Closes the Sequelize pool in `afterAll` after a 50 ms drain.
- `tests/globalSetup.js` — drops + recreates the DB, runs `db:migrate`, seeds the admin user explicitly (the spawned server used to do it as a side effect). **No longer spawns anything.**
- `tests/globalTeardown.js` — now a no-op, deliberately. Leaves the test DB for post-mortem.
- `tests/helpers/db.js` — `withClient`/`query`, the raw-SQL escape hatch, no connection fallbacks.
- `tests/helpers/netAudit.js` — opt-in socket audit (see Verification).
- `tests/mocks/bullQueue.js`, `tests/mocks/googleapis.js` — wired via `moduleNameMapper`.

**`jest.config.js`** replaced the inline `package.json` block: `coverageProvider: 'v8'`, three projects (`unit`/`int`/`e2e`), `clearMocks`/`restoreMocks: true`, `forceExit: false` (keep it false — it hides the Redis/timer leaks), `passWithNoTests: true` (the `e2e` project is empty until Phase 8).

### Measured result

```
Test Suites: 3 passed, 3 total
Tests:       49 passed, 49 total     (46 original + 3 new association cases)
Time:        4.6s

Statements   54.02%  (8745/16187)
Branches     51.23%
Functions    26.66%
Lines        54.02%
```

Thresholds pinned in `jest.config.js` at **53 / 50 / 26 / 53** — a ratchet ~1 point under measured, so the gate passes and any regression fails the build. **Raise per phase; never lower.** (The plan's original guess of 45/32/42/45 was wrong: functions came in at 26.66%, so a 42 floor would have failed on day one.)

**Zero outbound network, measured not assumed.** `NET_AUDIT_LOG=/tmp/x.jsonl npm test` hooks `net.Socket.prototype.connect` in every worker: **24 connects, all to `127.0.0.1:5436`**. Nothing reached `:8000`, `:11434`, `:6379`, or googleapis.

### Two things were worse than discovery recorded

1. **The migration chain was broken, not merely incomplete.** `20260607000000-add-soft-delete` adds `attendance.sheetId REFERENCES "Sheets"` *and* a partial unique index on `Sheets`, so `db:migrate` on a fresh DB aborted at migration 15 of 32 — it didn't just leave tables missing. Dating the new migration `20260725` (as originally planned) reproduced the failure exactly; it had to land at **`20260606000001`**, before add-soft-delete. Verified both directions: fresh DB migrates end to end (33 migrations, 25 tables), and re-running against an already-`sync({alter:true})` DB is a no-op (Sequelize's PG `createTable` emits `CREATE TABLE IF NOT EXISTS` and guards enums with a `duplicate_object` handler), so it is safe on the existing production database.
2. **32 of the 46 tests were red for a different reason than assumed.** Not `SequelizeMeta` drift — `POST /api/subjects` has required `batchId`/`sectionId` since `20260722000000-add-section-to-subjects` (`subjectController.js:49-53`), and the fixture sent neither. The stale test DB had been masking it.

### Corrections to earlier discovery — do not re-inherit the errors

- **Route count is 169, not 166.** Verified by walking the live stack, not grep. (166 router-defined + `/api/health` + `/` + `/api-docs/swagger.json`.)
- **The dual `/api/admin` mount is not currently shadowing anything.** `restoreRoutes` (mounted first) owns `/batches|sections|subjects|lecturers|students/:id/restore` — 5 routes. `adminTeacherRoutes` (second) owns `/teachers*`, `/notifications*`, `/oversight/*` — 13 routes. **Disjoint path sets, 18 total.** It is a live footgun awaiting a path overlap, not an active bug. Downgrade the severity accordingly, and keep the regression test.
- **Dead code list changed:** `src/utils/googleSheetsIntegration.js` and `src/middleware/googleAuthMiddleware.js` were **deleted** in Phase 1 (finding A-007). Still dead, still do not test: `src/validators/attendanceValidator.js`, `src/validators/reportsValidator.js`, `authController.register` (exported, unrouted), `config/config.json` (shadowed by `.sequelizerc` → `config/config.js`), Flutter `lib/utils/mock_data.dart`, Angular `QueuePageComponent` (routed nowhere).

### Findings ledger

`qa-audit/artifacts/findings.jsonl` — **9 Tier A fixed** (A-001…A-009), **2 Tier B reported**:
- **B-001** `loggingMiddleware.js:57-58` binds `finishAudit` to **both** `'finish'` and `'close'` → every request writes two identical `audit_logs` rows. Also calls `next()` from inside a response-lifecycle handler.
- **B-002** Redis clients constructed at *import* time in both queue modules, so `DISABLE_BACKGROUND_JOBS=true` cannot prevent connections. Worked around for tests via `moduleNameMapper`; **the production defect stands** — `node -e "require('./src/services/sheetsService')"` never exits.

`qa-audit/artifacts/env-manifest.json` holds the toolchain, pinned env, module substitutions, coverage, and the network audit.

---

## THIS SESSION: Phase 2 — Authorization matrix sweep

The cheapest suite in the repo, and it produces the security section as a by-product. Ordered, each step verifiable.

### 1. Tag `authorizeRoles` so intent is machine-readable *(do this first)*

**The gotcha that shapes this phase:** walking the router stack gives you handler *names*, and `authorizeRoles(...)` returns an anonymous arrow — so the histogram over all 169 routes is `189 <anonymous>, 5 authenticateJWT, 3 multerMiddleware`, then one entry per named controller. **You cannot identify guards by handler name.** Verified.

Two lines in `src/middleware/authorizeRoles.js` fix that — name the returned function and attach the roles:

```js
const authorizeRoles = (...allowedRoles) => {
  const guard = (req, res, next) => { /* unchanged */ };
  guard.__allowedRoles = allowedRoles;   // introspection seam for the audit
  return guard;
};
```

Tier A: no behaviour change, and it turns `route-inventory.json` into *declared* authorization that the behavioural sweep can be diffed against. Without it you can only observe, never compare against intent.

### 2. Emit `route-inventory.json`

Walk `app._router.stack` at runtime (a working walker was validated in Phase 1 — recurse layers, `layer.route` for endpoints, `layer.name === 'router'` for mounts, and un-escape `layer.regexp` to recover the mount prefix). Record per route: `method`, `full path`, `mountPrefix`, `handlerNames`, `declaredRoles` (from `__allowedRoles`), and `isPublic` (matches the `authMiddleware` allowlist).

Expected census — assert the total so a silently-added route fails the build:

```
169 total   19 /api/reports · 18 /api/admin · 12 /api/student · 10 /api/auth
            10 /api/teacher · 9 /api/attendance · 9 /api/chatbot · 9 /api/qr-sessions
             8 /api/sync · 7 /api/messages · 6 /api/students · 6 /api/lecturers
             6 /api/faculties · 5 /api/batches · 5 /api/sections · 5 /api/routine
             5 /api/sheets · 4 /api/subjects · 4 /api/agent-tools · 3 /api/schedule
             3 /api/notifications · 2 /api/samples · 1 each: /api/audit, /api/health,
             /api-docs/swagger.json, /
```

### 3. The table-driven suite

Hit all 169 routes as **anonymous / STUDENT / TEACHER / ADMIN**. Assert:
- anonymous → **401**, except the public allowlist;
- wrong role → **403**;
- **never 500** for any of the four principals. A 500 on an authz probe is a crash-on-unauthenticated-input bug, which is the highest-yield thing this sweep finds.

Path params need placeholder values that are syntactically valid but nonexistent (a real UUID for `:id` on UUID-keyed tables, an integer for `users`/`subjects`). Expect 401/403 to short-circuit before the ID is ever read; where a 404 comes back instead, that route reached the controller and the guard is missing.

Then diff **observed** against **declared** (`__allowedRoles`) and fail on any mismatch.

### 4. Explicit cases beyond the matrix

- **The `authMiddleware` allowlist** (`src/middleware/authMiddleware.js:8-16`) is `req.path.startsWith('/api-docs')`, `=== '/api/auth/login'`, `=== '/api/auth/reset-password'`, `=== '/api/health'`, `startsWith('/api/samples')`. Note the two `startsWith` calls are prefix matches — assert that `/api/samplesXYZ` and `/api-docsFOO` do **not** slip through.
- **`/api/samples` allowlist removal** — Tier B, propose a diff.
- **The dual `/api/admin` mount** — a regression test asserting the 5 restore paths and the 13 teacher/notification/oversight paths remain disjoint, so a future overlap fails loudly.
- **`/uploads` is pre-auth** (`src/app.js`, `app.use('/uploads', …)` sits ~20 lines above `app.use(authMiddleware)`). Assert the current reachability as a *characterisation* test — Tier C, moving the line breaks every `<img src>` in both clients and needs signed URLs.
- **3 routers with zero `authorizeRoles`** — confirmed `notificationRoutes.js`, `sampleRoutes.js`, `scheduleRoutes.js`. Document what each exposes to a merely-authenticated STUDENT. Adding guards is Tier B.
- **`tokenVersion` revocation** (`authMiddleware.js:37`) is a natural fit here: it needs a DB round trip per request, so it also belongs in the perf census.

### 5. Ratchet the thresholds

The sweep touches every router and middleware, so statements/functions should jump substantially. Re-pin `coverageThreshold` ~1 point under the new measured numbers.

**Phase 2 exit criteria:** `route-inventory.json` exists with all 169 routes and asserted totals; the matrix suite is green; every declared-vs-observed mismatch is either fixed (Tier A) or filed with a proposed diff (Tier B); coverage thresholds raised; `npm test` still shows zero outbound connects beyond `127.0.0.1:5436`.

---

## Remaining phases

### Phase 3 — High-risk backend behaviour
In order: `teacherScopeService` row-level scoping (a miss leaks one teacher's students to another) → auth lifecycle incl. `tokenVersion` revocation → attendance write path + QR state machine → the 19 report aggregations.

QR's 5-second token: don't sleep. Sign tokens directly with `{ expiresIn: '-1s' }` for the expiry path, and **extract `QR_TOKEN_EXPIRY` to an env var** so tests can widen it. (This seam was deliberately *not* added in Phase 1 — adding the variable without the `qrSessionController` change would imply a seam that doesn't exist. Do both together here.)

**Target:** ≥90% statements on `teacherScopeService`, `authMiddleware`, `authorizeRoles`, `qrSessionController`, `attendanceController`.

### Phase 4 — Remaining backend + adapter boundaries
CRUD sweep across batches/sections/subjects/faculties/lecturers/students, then integrations tested **at the seam only** — assert we call the sheets/email/SMS/chatbot adapter with the right arguments; never assert a third party's behaviour. Per-endpoint template: 401 → 403 per wrong role → happy path (status + shape + a DB assertion) → the error branches the controller actually has.

Switch on Sequelize query logging here for the N+1 census and p50/p95.

### Phase 5 — Chatbot
Recreate the venv; add `pytest`, `pytest-asyncio`, `httpx`. `conftest.py` with a **fake Ollama** (canned completions/embeddings) and a temp ChromaDB. All 13 routes. RAG tested at the retrieval boundary — "given this query, these documents come back" — never "the answer is good."

**Acceptance:** `pytest` green with Ollama on :11434 **stopped**. If it needs Ollama, the fake isn't wired.

### Phase 6 — Angular services layer
Add `karma.conf.js` with a `ChromeHeadlessCI` launcher, point `CHROME_BIN` at the installed Chrome.app, delete the type-broken stub. Then all 20 services + 5 guards + 2 interceptors via `HttpTestingController`. **~6 component smoke tests only** (login, dashboard, attendance, reports) asserting "renders and calls the right service."

### Phase 7 — Flutter
Add `mocktail`; fix the widget test (seed `SharedPreferences.setMockInitialValues({})`, pump past the splash). Test `api_client.dart` error mapping and the 4 provider `ChangeNotifier`s — all pure Dart. One render-smoke per screen. **No screen-logic tests.**

### Phase 8 — Playwright, real browsers
Fix the config so chromium actually matches specs (`Automation/playwright.config.cjs` `testIgnore` bug), add a `webServer` block and `retries: 2`. 5–7 real journeys: admin login → create batch/section → import routine → teacher marks attendance → student views. **Cut the live-Google-Sheets dependency** from fixtures — it caused the one recorded failure.

---

## Scope: what we commit to, and what we don't

**Commit to:** 100% route reachability with authn+authz assertions (169/169) · ≥85% statements on backend `controllers/`+`services/` · 100% of Angular services/guards/interceptors · 100% of Flutter services/providers · 13/13 chatbot routes · 5–7 E2E journeys.

**Explicitly out of scope, with reasons:**
- **LLM output semantics** — `llama3.2` is non-deterministic. We test prompt construction, tool-loop control flow, and response *shape*; not whether the answer is good.
- **Live Google Sheets sync** — third-party network, and fixtures depending on public sheet URLs a stranger can delete. We test the adapter contract and the format validator against saved fixtures.
- **Cron wall-clock behaviour** — we test the job functions directly with explicit inputs.
- **43 Angular component internals and the 5 Flutter screens >750 LOC** — the Flutter screens fuse UI and logic, so testing them properly means extracting viewmodels: a refactor, not a test pass. ~50 units for near-zero defect yield.
- **The 33 migrations individually** — `db:migrate` runs on a fresh DB every suite run, so a green suite *is* the migration test.
- **Load/stress testing** — needs a production-shaped dataset that doesn't exist here.

Stated plainly: a number can be made to read 100%, and doing so costs roughly 55% more work while finding almost nothing extra.

## Fix policy

- **Tier A — fix during the audit.** Deterministic repro, ≤~20 lines, no contract change, and a test that fails before / passes after. Covers harness and config defects, undeclared deps, crash-on-malformed-input guards, missing `await`, one-line N+1 fixes, the broken Angular and Flutter tests.
- **Tier B — fix on a branch, patch attached, user merges.** Correct but behaviour-changing: HTTP status corrections, removing `/api/samples` from the allowlist, resolving the dual `/api/admin` mount, adding role guards to `scheduleRoutes`/`notificationRoutes`, anything touching attendance/QR semantics, any schema migration, and both open Tier B findings (B-001, B-002).
- **Tier C — report only.** Architectural, each needing a design decision: rate limiting on `POST /api/auth/login` and `/reset-password` (both public, both unthrottled), `/uploads` before auth (needs signed URLs), CORS lockdown (`cors()` unconfigured on Express, `allow_origins=["*"]` on FastAPI), **bearer-token redaction in `audit_logs` plus a purge of existing rows** (`loggingMiddleware.js:24-25` persists raw bearer tokens and full request headers — the audit table is a credential store; highest severity in the repo), secret rotation (`keys.json`, the root `db_backup_*.sql`), the hardcoded `admin@example.com`/`admin@123` re-seeded on every boot including production, and installing CI/lint/hooks.

Every finding recorded as: id, tier, subsystem, `file:line`, repro, severity, and either the applied diff (A), proposed diff (B), or recommendation (C).

## Reporting

No write-up at the end. Each phase appends to `qa-audit/artifacts/`: `route-inventory.json`, `coverage/*.json`, `findings.jsonl`, `perf-profile.json`, `run-log.jsonl`, `env-manifest.json`. The 15 requested report sections are then filters and concatenations over those artifacts — only the executive summary, methodology, and roadmap need prose.

## Verification

- **Per phase:** the named suite runs green, the coverage target for that phase's files is met, and thresholds are ratcheted up.
- **Network:** `NET_AUDIT_LOG=/tmp/net.jsonl npm test`, then tally the JSONL. Must show only `127.0.0.1:5436`.
- **End state:** `npm test` (backend), `pytest` (chatbot, with Ollama stopped), `ng test --watch=false --browsers=ChromeHeadless`, `flutter test`, `npx playwright test` — all green, with a merged coverage report and `findings.jsonl` complete.

---

# Appendix — bootstrap for a fresh context window

## Repo

`/Users/raunak/Documents/Projects & Apps/FINAL INNOVATION PROJECT FINAL YEI HO ARU NA KHOL/project`
Branch `main`. HEAD `dd4469b` (Phase 1). Subsystems: `AttendX/backend`, `AttendX/admin`, `AttendX/student`, `Chatbot`, `Automation`.

This plan file exists in two places, kept identical: `~/.claude/plans/serene-doodling-map.md` and the (untracked) project root copy.

## Machine state (as of 2026-07-26)

- Node 22.19.0, npm 10.9.3, Flutter 3.44.0 / Dart 3.12.0, Python 3.13.6, `psql` at `/opt/homebrew/bin/psql`, Docker 29.1.3.
- **Running containers:** `attendance_backend` :5001→5000 (healthy), `attendance_db` **Postgres 15.18 :5436→5432** (healthy), `attendance_redis` :6379 (healthy). Also native Postgres :5432, Ollama :11434, Chatbot :8000, Angular dev server :4200. macOS ControlCenter occupies :5000.
- Backend `node_modules`, `.env`, and `src/utils/keys.json` are present locally. `Automation/node_modules` is **absent**.
- The repo `.env` sets `DB_SYNC_ALTER=true` — that's why a plain `node src/index.js` logs "Database schema synced (alter mode)". Pre-existing; tests pin it to `false`.

## Backend test suite as it exists NOW (post-Phase 1)

**Layout**
```
tests/
  testEnv.js            pinned env, single source of truth  (DB descriptor + env + apply())
  setupEnv.js           setupFiles     — applies testEnv; loads netAudit if NET_AUDIT_LOG set
  setupAfterEnv.js      setupFilesAfterEnv — env tripwires, global.fetch mock, pool close
  globalSetup.js        drop+create DB, db:migrate, seed admin. Does NOT spawn.
  globalTeardown.js     no-op by design
  fixtures/associations.snapshot.json
  helpers/db.js         withClient / query — raw SQL escape hatch
  helpers/netAudit.js   opt-in TCP connect audit
  mocks/bullQueue.js    both queue modules
  mocks/googleapis.js   the sheets client
  unit/associations.test.js          3 cases
  int/teacher-portal.test.js         32 cases
  int/credential-delivery.test.js    14 cases
  e2e/                               empty until Phase 8
```

**Scripts:** `npm test` (= `jest --runInBand --coverage`), plus `test:unit` / `test:int` / `test:e2e` via `--selectProjects`.

**Conventions to follow in new suites:**
```js
const request = require('supertest');
const app = require('../../src/app');       // in-process; never an HTTP base URL
const { query } = require('../helpers/db'); // raw SQL only when the API can't express the fixture
const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });
```
Fixtures are built through the public admin API in a `beforeAll`. Seeded admin is `admin@example.com` / `admin@123`. Suites are order-dependent **within** a file.

**Pinned test env** (`tests/testEnv.js`): `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_PORT=5436`, `DB_USER=postgres`, `DB_PASSWORD=admin`, `DB_NAME=attendance_db_test`, `JWT_SECRET=test_jwt_secret`, `DB_SYNC_ALTER=false`, `DISABLE_BACKGROUND_JOBS=true`, `MAIL_PROVIDER=demo`, `SMS_PROVIDER=demo`, `AUTO_REFRESH_KNOWLEDGE=false`, `CHATBOT_URL=http://127.0.0.1:9`. Overridable only via explicit `TEST_DB_*` vars. `setupAfterEnv` throws if any drift.

## Mechanics worth not re-deriving

**`moduleNameMapper`** (in `jest.config.js`) — beats `jest.mock` because the queues are imported transitively through five modules (`sheetsController`, `studentController`, `syncRoutes`, `sheetsService`, `schedulerService`):
```js
'^.*/queues/sheetSyncQueue$'  : '<rootDir>/tests/mocks/bullQueue.js',
'^.*/queues/sheetAppendQueue$': '<rootDir>/tests/mocks/bullQueue.js',
'^googleapis$'                : '<rootDir>/tests/mocks/googleapis.js',
```

**`collectCoverageFrom`** excludes `src/migrations/**`, `src/seeders/**`, `src/utils/seedData.js`, `src/config/swagger.js`, `src/workers/**`, `src/index.js`.

**`global.fetch` is Node 22 undici — `nock` will not intercept it.** `setupAfterEnv` sets `global.fetch = jest.fn()` that throws; mock it per-test with `global.fetch.mockResolvedValue(...)`.

**Do NOT patch `dns.lookup`** in any test helper. Reassigning it drops the `util.promisify.custom` symbol that undici and pg depend on and **deadlocks the whole run** (cost two 10-minute timeouts to isolate). `netAudit.js` hooks `net.Socket.prototype.connect` only, and carries a comment saying so.

**Do NOT load a helper via `NODE_OPTIONS=--require`** — it applies to Jest's parent process and deadlocks the worker handshake. Use `setupFiles`.

**Isolation strategy for later phases is truncate-between-suites, not transaction rollback.** Rollback is blocked by `loggingMiddleware.js:50` firing an unawaited `AuditLog.create` after the response, and by raw `CREATE TABLE IF NOT EXISTS "Settings"` DDL in `schedulerService.js:27,270`. Truncate also physically removes soft-deleted rows, which matters because 7 models are `paranoid` and `restoreController.js` queries with `paranoid: false`.

**Requiring `src/services/sheetsService.js` outside Jest never exits** (B-002, Redis at import). Any ad-hoc introspection script must `process.exit(0)` when done — that's how the association dump and the route walker both work.

## Authorization facts for Phase 2

**`authMiddleware.js` (`authenticateJWT`)** — public allowlist at lines 8-16: `startsWith('/api-docs')`, `=== '/api/auth/login'`, `=== '/api/auth/reset-password'`, `=== '/api/health'`, `startsWith('/api/samples')`. Then: no `Authorization` header → 401; `jwt.verify` failure → 401; user missing or `!isActive` → 401; `user.tokenVersion !== decoded.tokenVersion` → 401 "Token has been revoked". Sets `req.user = decoded`. **One DB round trip per authenticated request** (`User.findByPk`, attributes `id, tokenVersion, isActive`).

**`authorizeRoles.js`** — `(...allowedRoles) => (req,res,next)`; no `req.user` → 401; role not in list → 403. Returns an **anonymous** arrow, hence the `__allowedRoles` tag proposed in Phase 2 step 1.

**Routers with zero `authorizeRoles`** (verified): `notificationRoutes.js`, `sampleRoutes.js`, `scheduleRoutes.js`.

**`/api/admin` dual mount** — `restoreRoutes` first: `POST /{batches,sections,subjects,lecturers,students}/:id/restore` (5). `adminTeacherRoutes` second: `GET|POST /teachers`, `POST /teachers/:id/resend-credentials`, `PUT|DELETE /teachers/:id`, `GET|POST /teachers/:id/assignments`, `DELETE /teachers/:id/assignments/:assignmentId`, `POST|GET /notifications`, `GET /notifications/:id/read-status`, `GET /oversight/threads`, `GET /oversight/threads/:id` (13). Disjoint.

## Key files

- `AttendX/backend/src/app.js` — the mount order; holds `/uploads`-before-auth and the dual `/api/admin` mount
- `AttendX/backend/src/middleware/{authMiddleware,authorizeRoles,loggingMiddleware}.js` — Phase 2's subject matter
- `AttendX/backend/src/services/teacherScopeService.js` — highest bug-cost surface in the repo (Phase 3)
- `AttendX/backend/tests/testEnv.js` — the env contract
- `AttendX/backend/tests/globalSetup.js` — owns the destructive `DROP DATABASE`
- `Chatbot/chatbot_app.py` — 13 routes, the Ollama seam to fake (Phase 5)
- `Automation/playwright.config.cjs` — the `testIgnore` bug (Phase 8)
