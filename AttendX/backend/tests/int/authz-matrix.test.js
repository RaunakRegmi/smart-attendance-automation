/**
 * Authorization matrix — every route in the app, every principal.
 *
 * Two things are being checked, and they are different:
 *
 *   1. BEHAVIOUR — anonymous callers get 401 on everything that is not on the authMiddleware
 *      allowlist, and an authenticated caller holding the wrong role gets 403. Nothing ever
 *      returns 500, because a 500 on an authorization probe means the app crashed before it
 *      decided whether you were allowed in.
 *
 *   2. INTENT — the observed behaviour matches what each route *declares* via
 *      authorizeRoles(), recovered from the live router stack by tests/helpers/routeWalker.js.
 *      A route that denies more than it declares is a tagging gap; a route that denies less is
 *      a security defect. They are reported separately.
 *
 * WHAT IS DELIBERATELY NOT PROBED, and why: a probe that expects to be *denied* never reaches
 * a controller, so it is side-effect free and every route gets one. A probe that expects to
 * *succeed* does reach the controller, so it is restricted to GET. Firing the mutating
 * guard-free routes for real would mean POSTing /api/auth/logout — which bumps tokenVersion
 * and revokes the very token the rest of the suite is using. Those routes are recorded in the
 * artifact as reachable-but-unprobed rather than silently skipped; see UNPROBED below.
 *
 * The whole matrix runs once in beforeAll and is asserted as a set, so a failure reports every
 * violating route at once instead of stopping at the first.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const { buildRouteInventory, censusByPrefix } = require('../helpers/routeWalker');

const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const ADMIN = { email: 'admin@example.com', password: 'admin@123' };
// Distinct from the accounts in teacher-portal.test.js: suites share one database and the
// users table has a unique index on email.
const MATRIX_TEACHER = { email: 'matrix.teacher@example.com', password: 'matrixT@123', role: 'TEACHER' };
const MATRIX_STUDENT = { email: 'matrix.student@example.com', password: 'matrixS@123', role: 'STUDENT' };

const ARTIFACT_DIR = path.resolve(__dirname, '../../../../qa-audit/artifacts');

const EXPECTED_TOTAL = 169;

// Asserted, not merely reported: a silently added route must fail the build, because an
// unreviewed route is exactly the thing this phase exists to catch.
const EXPECTED_CENSUS = {
  '/api/reports': 19,
  '/api/admin': 18,
  '/api/student': 12,
  '/api/auth': 10,
  '/api/teacher': 10,
  '/api/attendance': 9,
  '/api/chatbot': 9,
  '/api/qr-sessions': 9,
  '/api/sync': 8,
  '/api/messages': 7,
  '/api/faculties': 6,
  '/api/lecturers': 6,
  '/api/students': 6,
  '/api/batches': 5,
  '/api/routine': 5,
  '/api/sections': 5,
  '/api/sheets': 5,
  '/api/agent-tools': 4,
  '/api/subjects': 4,
  '/api/notifications': 3,
  '/api/schedule': 3,
  '/api/samples': 2,
  '/': 1,
  '/api-docs/swagger.json': 1,
  '/api/audit': 1,
  '/api/health': 1,
};

/**
 * Guards this repo hand-rolls instead of calling authorizeRoles(), so the __allowedRoles tag
 * cannot see them. Keeping the list explicit means a *new* untagged guard shows up as an
 * unexplained stricter-than-declared mismatch rather than blending in.
 */
const KNOWN_UNTAGGED_GUARDS = {
  // notificationRoutes.js:8-13 — a local `ensureAdmin` that duplicates authorizeRoles('ADMIN').
  'POST /api/notifications': ['ADMIN'],
};

/**
 * Routes with no role guard at all that also mutate state, so they get the anonymous probe
 * (safe — it is denied) but not the authenticated reachability probe.
 */
const UNPROBED = new Set([
  'POST /api/agent-tools/student-attendance',
  'POST /api/auth/logout',
  'PUT /api/auth/password',
  'PUT /api/auth/profile',
  'PUT /api/notifications/:id/read',
  'POST /api/auth/login',
  'POST /api/auth/reset-password',
]);

/**
 * 5xx responses that are the correct answer rather than a crash. Kept as an explicit map with
 * a reason each, so "no route 5xxs" stays a real assertion instead of being widened to
 * "no route 500s except the ones that do".
 */
const EXPECTED_5XX = {
  // tests/testEnv.js pins CHATBOT_URL to the discard port, so the dependency genuinely is
  // unavailable and reporting 503 is this endpoint doing its job.
  'GET /api/chatbot/health': 503,
};

/**
 * Routes where an *allowed* role can still be refused, because the real check is row-level:
 * you may hold the role and still not be a participant in that thread or assigned to that
 * class. The matrix probes with a nonexistent id, so a 403 here is the scoping working.
 * Asserted as an exact set — a route that quietly stops scoping drops out of it and fails.
 */
const ROW_LEVEL_SCOPED = new Set([
  'GET /api/messages/threads/:id',
  'GET /api/teacher/classes/:sectionId/:subjectId/students',
]);

const UUID = '00000000-0000-4000-8000-000000000000';
const INT = '999999999';

/**
 * Substitute path params with values that are syntactically valid for the column they will be
 * compared against but certain not to exist. Every parameterised route in this app declares a
 * role, so a denial probe short-circuits before the value is ever read — this table is
 * insurance: if a guard is ever dropped, the route fails with a legible 404 instead of a
 * 500 from Postgres rejecting `'00000000-...'::integer`, and the diagnosis stays obvious.
 * Primary-key types come from src/models (Batch/Section/Faculty/Sheets/QRSession/SyncJob and
 * AttendanceRequest are UUID; User/Student/Subject/Notification/MessageThread and the join
 * tables are INTEGER).
 */
const UUID_ID_PREFIXES = [
  '/api/batches/',
  '/api/sections/',
  '/api/faculties/',
  '/api/sheets/',
  '/api/sync/status/',
  '/api/admin/batches/',
  '/api/admin/sections/',
];

const concretePath = (routePath) =>
  routePath
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return segment;
      switch (segment) {
        case ':email':
          return 'nobody@example.invalid';
        case ':subjectCode':
          return 'NOSUCH101';
        case ':sectionId':
        case ':sessionId':
        case ':requestId':
          return UUID;
        case ':subjectId':
        case ':assignmentId':
          return INT;
        case ':id':
          return UUID_ID_PREFIXES.some((p) => routePath.startsWith(p)) ? UUID : INT;
        default:
          throw new Error(`No placeholder defined for path param ${segment} in ${routePath}`);
      }
    })
    .join('/');

const ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];

let tokens = {};
let inventory = [];
let probes = []; // { key, method, path, principal, expectation, status }

const login = async (email, password) => {
  const res = await api().post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.token;
};

/** Effective policy, accounting for the guards the tag cannot see. */
const effectiveRoles = (route) => {
  const key = `${route.method} ${route.path}`;
  return route.declaredRoles || KNOWN_UNTAGGED_GUARDS[key] || null;
};

beforeAll(async () => {
  tokens.ADMIN = await login(ADMIN.email, ADMIN.password);

  for (const account of [MATRIX_TEACHER, MATRIX_STUDENT]) {
    const res = await api().post('/api/auth/users').set(auth(tokens.ADMIN)).send(account);
    expect([201, 400]).toContain(res.status); // 400 = already present from a previous run
    tokens[account.role] = await login(account.email, account.password);
  }

  inventory = buildRouteInventory(app);

  for (const route of inventory) {
    const key = `${route.method} ${route.path}`;
    const url = concretePath(route.path);
    const send = (headers) => {
      const req = api()[route.method.toLowerCase()](url);
      return headers ? req.set(headers) : req;
    };

    // --- anonymous ---
    {
      const res = await send(null);
      probes.push({
        key,
        principal: 'anonymous',
        expectation: route.isPublic ? 'reachable' : 'unauthenticated',
        status: res.status,
      });
    }

    // --- each role ---
    const allowed = effectiveRoles(route);
    for (const role of ROLES) {
      const denied = allowed !== null && !allowed.includes(role);
      if (!denied && (UNPROBED.has(key) || route.method !== 'GET')) {
        probes.push({ key, principal: role, expectation: 'unprobed', status: null });
        continue;
      }
      const res = await send(auth(tokens[role]));
      probes.push({
        key,
        principal: role,
        expectation: denied ? 'forbidden' : 'reachable',
        status: res.status,
      });
    }
  }
}, 180000);

afterAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const byKey = {};
  for (const p of probes) {
    byKey[p.key] = byKey[p.key] || {};
    byKey[p.key][p.principal] = { expectation: p.expectation, status: p.status };
  }
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'route-inventory.json'),
    JSON.stringify(
      {
        generatedBy: 'tests/int/authz-matrix.test.js',
        total: inventory.length,
        census: censusByPrefix(inventory),
        knownUntaggedGuards: KNOWN_UNTAGGED_GUARDS,
        unprobedMutatingRoutes: [...UNPROBED],
        routes: inventory.map((r) => ({ ...r, observed: byKey[`${r.method} ${r.path}`] || null })),
      },
      null,
      2
    ) + '\n'
  );
});

describe('route inventory', () => {
  test(`the app exposes exactly ${EXPECTED_TOTAL} routes`, () => {
    expect(inventory).toHaveLength(EXPECTED_TOTAL);
  });

  test('the per-prefix census is unchanged', () => {
    expect(censusByPrefix(inventory)).toEqual(EXPECTED_CENSUS);
  });

  test('every path param has a placeholder defined', () => {
    expect(() => inventory.forEach((r) => concretePath(r.path))).not.toThrow();
  });

  test('the matrix probed every route', () => {
    const probed = new Set(probes.map((p) => p.key));
    expect(probed.size).toBe(EXPECTED_TOTAL);
  });
});

describe('authorization matrix', () => {
  test('no probe returns 5xx — an authz check must never crash', () => {
    const crashes = probes
      .filter((p) => p.status !== null && p.status >= 500)
      .filter((p) => EXPECTED_5XX[p.key] !== p.status)
      .map((p) => `${p.principal} → ${p.key} = ${p.status}`);
    expect(crashes).toEqual([]);
  });

  test('anonymous callers get 401 on every non-public route', () => {
    const leaks = probes
      .filter((p) => p.principal === 'anonymous' && p.expectation === 'unauthenticated')
      .filter((p) => p.status !== 401)
      .map((p) => `${p.key} = ${p.status}`);
    expect(leaks).toEqual([]);
  });

  test('public routes are reachable without a token', () => {
    const blocked = probes
      .filter((p) => p.principal === 'anonymous' && p.expectation === 'reachable')
      .filter((p) => p.status === 401)
      .map((p) => `${p.key} = ${p.status}`);
    expect(blocked).toEqual([]);
  });

  test('a role outside the declared set always gets 403', () => {
    const wrong = probes
      .filter((p) => p.expectation === 'forbidden' && p.status !== 403)
      .map((p) => `${p.principal} → ${p.key} = ${p.status}`);
    expect(wrong).toEqual([]);
  });

  test('a role inside the declared set is never rejected as unauthorized', () => {
    const overblocked = probes
      .filter((p) => p.expectation === 'reachable' && p.principal !== 'anonymous')
      .filter((p) => p.status === 401 || p.status === 403)
      .filter((p) => !(p.status === 403 && ROW_LEVEL_SCOPED.has(p.key)))
      .map((p) => `${p.principal} → ${p.key} = ${p.status}`);
    expect(overblocked).toEqual([]);
  });

  test('the row-level scoped routes are exactly the known set', () => {
    // The inverse of the filter above: if one of these stops 403ing a caller who has the role
    // but not the row, its scoping regressed and it silently became a data leak.
    const observed = new Set(
      probes
        .filter((p) => p.expectation === 'reachable' && p.principal !== 'anonymous')
        .filter((p) => p.status === 403)
        .map((p) => p.key)
    );
    expect([...observed].sort()).toEqual([...ROW_LEVEL_SCOPED].sort());
  });
});

describe('declared vs observed', () => {
  test('every route that denies a role declares that it does', () => {
    // Stricter-than-declared: the route 403s a principal its tag says is allowed, or 403s
    // while declaring nothing. Safe, but it means the inventory understates the real policy —
    // which is how an undocumented guard becomes an accidental outage later.
    const undeclared = probes
      .filter((p) => p.principal !== 'anonymous' && p.status === 403)
      .filter((p) => !ROW_LEVEL_SCOPED.has(p.key)) // row-level refusals are not role refusals
      .filter((p) => {
        const route = inventory.find((r) => `${r.method} ${r.path}` === p.key);
        const allowed = effectiveRoles(route);
        return allowed === null || allowed.includes(p.principal);
      })
      .map((p) => `${p.principal} → ${p.key}`);
    expect(undeclared).toEqual([]);
  });

  test('the guard-free, non-public routes are exactly the known set', () => {
    const openToAnyLogin = inventory
      .filter((r) => effectiveRoles(r) === null && !r.isPublic)
      .map((r) => `${r.method} ${r.path}`)
      .sort();
    expect(openToAnyLogin).toEqual([
      // Self-service endpoints: correctly available to any authenticated principal.
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'PUT /api/auth/password',
      'PUT /api/auth/profile',
      // The API index page. Not on the allowlist, so it 401s — see the characterisation below.
      'GET /',
      // Self-scoping tool called by the Python agent; STUDENT is pinned to their own record
      // inside the controller rather than by a guard. Verified in the scoping tests.
      'POST /api/agent-tools/student-attendance',
      // FINDING B-004: notificationRoutes.js — any authenticated principal can read every
      // notification and mark any notification read, by integer id.
      'GET /api/notifications',
      'PUT /api/notifications/:id/read',
      // FINDING B-005: scheduleRoutes.js — no guard on any of the three.
      'GET /api/schedule/full',
      'GET /api/schedule/today',
      'GET /api/schedule/week',
    ].sort());
  });
});

describe('authMiddleware allowlist', () => {
  // src/middleware/authMiddleware.js:8-16 uses startsWith for two of its five checks, so the
  // allowlist covers a prefix rather than a path. Nothing currently routes under those
  // prefixes, so this is a latent footgun, not a live bypass — these tests pin the current
  // reachability so that adding such a route fails here first. See finding B-003.
  test.each([
    ['/api/samplesXYZ'],
    ['/api/samples-secret'],
    ['/api-docsFOO'],
  ])('%s slips past authentication and falls through to a 404, not a 401', async (url) => {
    const res = await api().get(url);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(404);
  });

  test('an unmatched path that is NOT on the allowlist is rejected at 401', async () => {
    const res = await api().get('/api/definitely-not-a-route');
    expect(res.status).toBe(401);
  });

  test('a malformed bearer token is rejected, not crashed on', async () => {
    for (const header of ['Bearer', 'Bearer ', 'Bearer not.a.jwt', 'Basic abc', 'garbage']) {
      const res = await api().get('/api/batches').set({ Authorization: header });
      expect(res.status).toBe(401);
    }
  });
});

describe('crash-on-missing-input regressions', () => {
  // Both of these returned 500 before this phase, for the same reason: an absent parameter
  // reached Sequelize as `where: { <col>: undefined }`, which throws. Found by the matrix
  // sweep, which is precisely the yield the "never 5xx" assertion exists for. The login case
  // is the serious one — it is a public endpoint, so it was an unauthenticated crash.
  test.each([
    ['no body', {}],
    ['password but no email', { password: 'x' }],
    ['email but no password', { email: 'admin@example.com' }],
    ['null email', { email: null, password: 'x' }],
  ])('POST /api/auth/login with %s is a 400, not a 500', async (_label, body) => {
    const res = await api().post('/api/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('login still rejects a wrong password with 401, not 400', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'definitely-wrong' });
    expect(res.status).toBe(401);
  });

  test('GET /api/attendance/search without ?email is a 400, not a 500', async () => {
    const res = await api().get('/api/attendance/search').set(auth(tokens.ADMIN));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/attendance/search with an unknown email is still a 404', async () => {
    const res = await api()
      .get('/api/attendance/search')
      .query({ email: 'nobody@example.invalid' })
      .set(auth(tokens.ADMIN));
    expect(res.status).toBe(404);
  });
});

describe('the dual /api/admin mount', () => {
  // src/app.js mounts restoreRoutes and adminTeacherRoutes on the same prefix. Express gives
  // the first mount priority, so an overlap would silently shadow the second router. The path
  // sets are disjoint today; this test exists so that stops being true loudly.
  test('restoreRoutes and adminTeacherRoutes own disjoint paths', () => {
    const adminRoutes = inventory.filter((r) => r.path.startsWith('/api/admin/'));
    const restorePaths = adminRoutes.filter((r) => r.path.endsWith('/restore'));
    const otherPaths = adminRoutes.filter((r) => !r.path.endsWith('/restore'));

    expect(restorePaths).toHaveLength(5);
    expect(otherPaths).toHaveLength(13);

    const overlap = restorePaths
      .map((r) => `${r.method} ${r.path}`)
      .filter((k) => otherPaths.some((o) => `${o.method} ${o.path}` === k));
    expect(overlap).toEqual([]);
  });

  test('both mounts are reachable, so neither router is shadowed', async () => {
    const restore = await api()
      .post(`/api/admin/batches/${UUID}/restore`)
      .set(auth(tokens.ADMIN));
    const teachers = await api().get('/api/admin/teachers').set(auth(tokens.ADMIN));
    // 404 = reached restoreController and the batch does not exist; a shadowed router would
    // give the Express default 404 with no JSON body, so assert the shape too.
    expect(restore.status).toBe(404);
    expect(restore.body).toHaveProperty('success', false);
    expect(teachers.status).toBe(200);
  });
});

describe('/uploads is served before authentication', () => {
  // src/app.js:52 mounts express.static('/uploads') ~20 lines above app.use(authMiddleware),
  // so uploaded avatars are world-readable to anyone who can guess a filename. Characterisation
  // only (Tier C): moving the mount breaks every <img src> in both clients and needs signed
  // URLs first. Recorded so the exposure is a decision rather than an accident.
  //
  // The probe needs a file that actually exists: express.static calls next() on a miss, so a
  // request for a nonexistent upload falls through to authMiddleware and 401s. That difference
  // is the whole point — only real files are exposed, which is why a missing-file probe would
  // have quietly "passed" while proving nothing.
  const fixtureName = 'authz-matrix-probe.txt';
  const fixturePath = path.resolve(__dirname, '../../uploads', fixtureName);

  beforeAll(() => {
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, 'probe');
  });

  afterAll(() => {
    fs.rmSync(fixturePath, { force: true });
  });

  test('an existing upload is served to an anonymous caller', async () => {
    const res = await api().get(`/uploads/${fixtureName}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('probe');
  });

  test('a nonexistent upload falls through to auth and 401s', async () => {
    const res = await api().get('/uploads/nonexistent-file.png');
    expect(res.status).toBe(401);
  });
});
