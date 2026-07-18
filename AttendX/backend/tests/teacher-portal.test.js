/**
 * Teacher portal + messaging integration tests.
 *
 * Runs against the real server (booted by tests/globalSetup.js on TEST_PORT
 * with a freshly migrated attendance_db_test). Fixtures are created through
 * the public API with the seeded admin account, exactly as production
 * clients would.
 */
const request = require('supertest');
const { Client } = require('pg');

const BASE = `http://127.0.0.1:${process.env.TEST_PORT || 5998}`;
const api = () => request(BASE);

const ADMIN = { email: 'admin@example.com', password: 'admin@123' };
const TEACHER_A = { email: 'teacher.a@example.com', password: 'teacherA@123', name: 'Teacher Aabha' };
const TEACHER_B = { email: 'teacher.b@example.com', password: 'teacherB@123', name: 'Teacher Bibek' };
const STUDENT = { email: 'student.one@example.com', password: 'student@123', name: 'Student One' };

let adminToken;
let teacherAToken;
let teacherBToken;
let studentToken;
let teacherAId;
let teacherBId;
let studentUserId;
let sectionId; // student's section — assigned to teacher A
let otherSectionId; // no students, not assigned to anyone
let subjectId; // taught by teacher A in sectionId
let otherSubjectId; // taught by nobody
let studentThreadId; // student ↔ teacher A thread
let broadcastThreadId; // admin notification thread

const login = async (email, password) => {
  const res = await api().post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return { token: res.body.data.token, user: res.body.data.user };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  ({ token: adminToken } = await login(ADMIN.email, ADMIN.password));

  // Academic fixtures via existing admin APIs.
  const batchRes = await api()
    .post('/api/batches')
    .set(auth(adminToken))
    .send({ name: 'Test Batch', abbreviation: 'TB' });
  expect(batchRes.status).toBe(201);
  const batchId = batchRes.body.data.id;

  const sectionRes = await api()
    .post('/api/sections')
    .set(auth(adminToken))
    .send({ name: 'T-A', batchId });
  expect(sectionRes.status).toBe(201);
  sectionId = sectionRes.body.data.id;

  const otherSectionRes = await api()
    .post('/api/sections')
    .set(auth(adminToken))
    .send({ name: 'T-B', batchId });
  otherSectionId = otherSectionRes.body.data.id;

  const subjectRes = await api()
    .post('/api/subjects')
    .set(auth(adminToken))
    .send({ subjectCode: 'TST101', subjectName: 'Testing Fundamentals' });
  expect(subjectRes.status).toBe(201);
  subjectId = (subjectRes.body.data.subject || subjectRes.body.data).id;

  const otherSubjectRes = await api()
    .post('/api/subjects')
    .set(auth(adminToken))
    .send({ subjectCode: 'TST202', subjectName: 'Untaught Subject' });
  otherSubjectId = (otherSubjectRes.body.data.subject || otherSubjectRes.body.data).id;

  // Teacher accounts (admin-created, temp password).
  const teacherARes = await api()
    .post('/api/admin/teachers')
    .set(auth(adminToken))
    .send(TEACHER_A);
  expect(teacherARes.status).toBe(201);
  teacherAId = teacherARes.body.data.user.id;
  expect(teacherARes.body.data.user.mustChangePassword).toBe(true);

  const teacherBRes = await api()
    .post('/api/admin/teachers')
    .set(auth(adminToken))
    .send(TEACHER_B);
  teacherBId = teacherBRes.body.data.user.id;

  // Teacher A owns (sectionId, subjectId); teacher B owns nothing.
  const assignRes = await api()
    .post(`/api/admin/teachers/${teacherAId}/assignments`)
    .set(auth(adminToken))
    .send({ sectionId, subjectId });
  expect(assignRes.status).toBe(201);

  // Student profile + login user (linked directly in the DB — production
  // links these through the sheet sync pipeline).
  const studentRes = await api()
    .post('/api/students')
    .set(auth(adminToken))
    .send({ name: STUDENT.name, email: STUDENT.email, batchId, sectionId });
  expect(studentRes.status).toBe(201);
  const studentId = studentRes.body.data.id;

  const studentUserRes = await api()
    .post('/api/auth/users')
    .set(auth(adminToken))
    .send({ email: STUDENT.email, password: STUDENT.password, role: 'STUDENT' });
  studentUserId = studentUserRes.body.data.id;

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.TEST_DB_NAME || 'attendance_db_test',
  });
  await client.connect();
  await client.query('UPDATE students SET "userId" = $1 WHERE id = $2', [studentUserId, studentId]);
  await client.end();

  ({ token: teacherAToken } = await login(TEACHER_A.email, TEACHER_A.password));
  ({ token: teacherBToken } = await login(TEACHER_B.email, TEACHER_B.password));
  ({ token: studentToken } = await login(STUDENT.email, STUDENT.password));
}, 60000);

describe('teacher role auth', () => {
  test('teacher login returns TEACHER role and mustChangePassword flag', async () => {
    const { user } = await login(TEACHER_A.email, TEACHER_A.password);
    expect(user.role).toBe('TEACHER');
    expect(user.mustChangePassword).toBe(true);
  });

  test('teacher cannot access admin endpoints', async () => {
    const res = await api().get('/api/admin/teachers').set(auth(teacherAToken));
    expect(res.status).toBe(403);
  });

  test('student cannot access teacher endpoints', async () => {
    const res = await api().get('/api/teacher/dashboard').set(auth(studentToken));
    expect(res.status).toBe(403);
  });

  test('admin cannot access teacher endpoints (role-scoped, not hierarchical)', async () => {
    const res = await api().get('/api/teacher/dashboard').set(auth(adminToken));
    expect(res.status).toBe(403);
  });
});

describe('row-level scoping (server-enforced)', () => {
  test('teacher gets 200 for an assigned class roster', async () => {
    const res = await api()
      .get(`/api/teacher/classes/${sectionId}/${subjectId}/students`)
      .set(auth(teacherAToken));
    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.students[0].name).toBe(STUDENT.name);
  });

  test('teacher gets 403 for a non-assigned class roster', async () => {
    const res = await api()
      .get(`/api/teacher/classes/${otherSectionId}/${subjectId}/students`)
      .set(auth(teacherAToken));
    expect(res.status).toBe(403);
  });

  test('teacher with no assignments gets 403 on another teacher’s class', async () => {
    const res = await api()
      .get(`/api/teacher/classes/${sectionId}/${subjectId}/students`)
      .set(auth(teacherBToken));
    expect(res.status).toBe(403);
  });

  test('attendance view is scoped (403 on non-assigned pair)', async () => {
    const ok = await api()
      .get('/api/teacher/attendance')
      .query({ sectionId, subjectId })
      .set(auth(teacherAToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.readOnly).toBe(true);

    const denied = await api()
      .get('/api/teacher/attendance')
      .query({ sectionId: otherSectionId, subjectId })
      .set(auth(teacherAToken));
    expect(denied.status).toBe(403);
  });

  test('reports are scoped to assigned subjects (403 otherwise)', async () => {
    const ok = await api()
      .get('/api/teacher/reports')
      .query({ subjectId })
      .set(auth(teacherAToken));
    expect(ok.status).toBe(200);

    const denied = await api()
      .get('/api/teacher/reports')
      .query({ subjectId: otherSubjectId })
      .set(auth(teacherAToken));
    expect(denied.status).toBe(403);
  });

  test('attendance marking is a 501 future-scope stub', async () => {
    const res = await api()
      .post('/api/teacher/attendance')
      .set(auth(teacherAToken))
      .send({ sectionId, subjectId, date: '2026-07-18', records: [] });
    expect(res.status).toBe(501);
  });

  test('teacher classes list only contains assigned pairs', async () => {
    const resA = await api().get('/api/teacher/classes').set(auth(teacherAToken));
    expect(resA.status).toBe(200);
    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0].sectionId).toBe(sectionId);

    const resB = await api().get('/api/teacher/classes').set(auth(teacherBToken));
    expect(resB.body.data).toHaveLength(0);
  });
});

describe('messaging: student ↔ teacher', () => {
  test('student contacts list only their subject teachers', async () => {
    const res = await api().get('/api/messages/contacts').set(auth(studentToken));
    expect(res.status).toBe(200);
    const teachers = res.body.data.teachers;
    expect(teachers.map((t) => t.userId)).toEqual([teacherAId]);
    expect(teachers[0].subjects.map((s) => s.id)).toContain(subjectId);
  });

  test('student cannot message a teacher who does not teach them', async () => {
    const res = await api()
      .post('/api/messages/threads')
      .set(auth(studentToken))
      .send({ recipientUserId: teacherBId, subjectId, body: 'hello?' });
    expect(res.status).toBe(403);
  });

  test('student cannot start a teacher thread without a subject context', async () => {
    const res = await api()
      .post('/api/messages/threads')
      .set(auth(studentToken))
      .send({ recipientUserId: teacherAId, body: 'no subject' });
    expect(res.status).toBe(403);
  });

  test('student can start a thread with their subject teacher', async () => {
    const res = await api()
      .post('/api/messages/threads')
      .set(auth(studentToken))
      .send({ recipientUserId: teacherAId, subjectId, body: 'I was marked absent on Monday but attended.' });
    expect(res.status).toBe(201);
    expect(res.body.data.created).toBe(true);
    studentThreadId = res.body.data.thread.id;
    expect(res.body.data.thread.contextType).toBe('STUDENT_TEACHER_SUBJECT');
  });

  test('unread count reflects the new message for the teacher', async () => {
    const res = await api().get('/api/messages/unread-count').set(auth(teacherAToken));
    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(1);
  });

  test('teacher inbox lists the thread with its unread count', async () => {
    const res = await api().get('/api/messages/threads').set(auth(teacherAToken));
    const thread = res.body.data.find((t) => t.id === studentThreadId);
    expect(thread).toBeDefined();
    expect(thread.unreadCount).toBe(1);
    expect(thread.subject.subjectCode).toBe('TST101');
  });

  test('marking read zeroes the unread count', async () => {
    const read = await api().post(`/api/messages/threads/${studentThreadId}/read`).set(auth(teacherAToken));
    expect(read.status).toBe(200);
    const count = await api().get('/api/messages/unread-count').set(auth(teacherAToken));
    expect(count.body.data.unreadCount).toBe(0);
  });

  test('teacher reply lands as unread for the student', async () => {
    const reply = await api()
      .post(`/api/messages/threads/${studentThreadId}`)
      .set(auth(teacherAToken))
      .send({ body: 'Checked — I will correct it.' });
    expect(reply.status).toBe(201);

    const count = await api().get('/api/messages/unread-count').set(auth(studentToken));
    expect(count.body.data.unreadCount).toBe(1);
  });

  test('a second student message reuses the same thread', async () => {
    const res = await api()
      .post('/api/messages/threads')
      .set(auth(studentToken))
      .send({ recipientUserId: teacherAId, subjectId, body: 'Thank you!' });
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(false);
    expect(res.body.data.thread.id).toBe(studentThreadId);
  });

  test('non-participants cannot read the thread', async () => {
    const res = await api().get(`/api/messages/threads/${studentThreadId}`).set(auth(teacherBToken));
    expect(res.status).toBe(403);
  });
});

describe('admin notifications with per-recipient read status', () => {
  test('admin sends a notification to all teachers', async () => {
    const res = await api()
      .post('/api/admin/notifications')
      .set(auth(adminToken))
      .send({ title: 'Exam duty', body: 'Roster published on the board.', recipients: 'all' });
    expect(res.status).toBe(201);
    expect(res.body.data.recipientCount).toBe(2);
    broadcastThreadId = res.body.data.threadId;
  });

  test('read status starts at zero and tracks each recipient', async () => {
    const before = await api()
      .get(`/api/admin/notifications/${broadcastThreadId}/read-status`)
      .set(auth(adminToken));
    expect(before.status).toBe(200);
    expect(before.body.data.readCount).toBe(0);
    expect(before.body.data.totalRecipients).toBe(2);

    await api().post(`/api/messages/threads/${broadcastThreadId}/read`).set(auth(teacherBToken));

    const after = await api()
      .get(`/api/admin/notifications/${broadcastThreadId}/read-status`)
      .set(auth(adminToken));
    expect(after.body.data.readCount).toBe(1);
    const teacherBStatus = after.body.data.recipients.find((r) => r.userId === teacherBId);
    expect(teacherBStatus.read).toBe(true);
    const teacherAStatus = after.body.data.recipients.find((r) => r.userId === teacherAId);
    expect(teacherAStatus.read).toBe(false);
  });

  test('notifications are one-way: recipients cannot reply', async () => {
    const res = await api()
      .post(`/api/messages/threads/${broadcastThreadId}`)
      .set(auth(teacherAToken))
      .send({ body: 'ok' });
    expect(res.status).toBe(403);
  });

  test('teacher sees the notification in their notification feed', async () => {
    const res = await api().get('/api/teacher/notifications').set(auth(teacherAToken));
    expect(res.status).toBe(200);
    const notif = res.body.data.find((n) => n.threadId === broadcastThreadId);
    expect(notif).toBeDefined();
    expect(notif.title).toBe('Exam duty');
  });
});

describe('admin oversight is read-only', () => {
  test('admin can list student↔teacher threads', async () => {
    const res = await api().get('/api/admin/oversight/threads').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.map((t) => t.id)).toContain(studentThreadId);
  });

  test('admin can read a full transcript (flagged read-only)', async () => {
    const res = await api()
      .get(`/api/admin/oversight/threads/${studentThreadId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.readOnly).toBe(true);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(3);
  });

  test('admin cannot post into a student↔teacher thread', async () => {
    const res = await api()
      .post(`/api/messages/threads/${studentThreadId}`)
      .set(auth(adminToken))
      .send({ body: 'admin note' });
    expect(res.status).toBe(403);
  });

  test('oversight has no write route', async () => {
    const res = await api()
      .post(`/api/admin/oversight/threads/${studentThreadId}`)
      .set(auth(adminToken))
      .send({ body: 'nope' });
    expect(res.status).toBe(404);
  });

  test('teachers cannot use oversight', async () => {
    const res = await api().get('/api/admin/oversight/threads').set(auth(teacherAToken));
    expect(res.status).toBe(403);
  });
});

describe('teacher dashboard & profile', () => {
  test('dashboard returns scoped stats', async () => {
    const res = await api().get('/api/teacher/dashboard').set(auth(teacherAToken));
    expect(res.status).toBe(200);
    expect(res.body.data.stats.classes).toBe(1);
    expect(res.body.data.stats.studentsTaught).toBe(1);
    expect(res.body.data.teacher.name).toBe(TEACHER_A.name);
  });

  test('changing the password clears mustChangePassword', async () => {
    const change = await api()
      .put('/api/auth/password')
      .set(auth(teacherBToken))
      .send({
        currentPassword: TEACHER_B.password,
        newPassword: 'teacherB@456',
        confirmPassword: 'teacherB@456',
      });
    expect(change.status).toBe(200);

    const { user } = await login(TEACHER_B.email, 'teacherB@456');
    expect(user.mustChangePassword).toBe(false);
  });
});
