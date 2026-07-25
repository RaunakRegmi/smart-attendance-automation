/**
 * QR attendance roll-up integration tests.
 *
 * Covers the bridge from `attendance_sessions` (where QR scans land) into
 * `attendance` (which every report, dashboard and the chatbot read). Before this
 * bridge existed a scan was recorded but moved no number anywhere.
 *
 * Each test uses its own date, because `attendance` is unique on
 * (studentId, subjectId, date) and shared dates would leak between tests.
 */
const request = require('supertest');
const app = require('../../src/app');
const { query } = require('../helpers/db');

const api = () => request(app);

const ADMIN = { email: 'admin@example.com', password: 'admin@123' };
const TEACHER = { email: 'qr.teacher@example.com', password: 'qrTeacher@123', name: 'QR Teacher' };
const STUDENT = { email: 'qr.student@example.com', password: 'qrStudent@123', name: 'QR Student' };

let adminToken;
let teacherToken;
let studentToken;
let sectionId;
let subjectId;
let studentId;

const login = async (email, password) => {
  const res = await api().post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return { token: res.body.data.token, user: res.body.data.user };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** Open a session and return { id, token } — the QR token lives 5s, so scan promptly. */
const openSession = async (date, classType = 'Lecture') => {
  const res = await api()
    .post('/api/qr-sessions')
    .set(auth(teacherToken))
    .send({ sectionId, subjectId, classType, date });
  expect(res.status).toBe(201);
  return { id: res.body.data.id, token: res.body.data.token };
};

const scan = (session) =>
  api()
    .post('/api/qr-sessions/scan')
    .set(auth(studentToken))
    .send({ token: session.token, sessionId: session.id });

const closeSession = (session) =>
  api().post(`/api/qr-sessions/${session.id}/close`).set(auth(teacherToken));

/** The single `attendance` row for our student/subject on a date, or null. */
const attendanceRow = async (date) => {
  const { rows } = await query(
    'SELECT status, "sheetId" FROM attendance WHERE "studentId" = $1 AND "subjectId" = $2 AND date = $3',
    [studentId, subjectId, date]
  );
  expect(rows.length).toBeLessThanOrEqual(1); // the unique index must hold
  return rows[0] || null;
};

beforeAll(async () => {
  ({ token: adminToken } = await login(ADMIN.email, ADMIN.password));

  const batchRes = await api()
    .post('/api/batches')
    .set(auth(adminToken))
    .send({ name: 'QR Batch', abbreviation: 'QRB' });
  expect(batchRes.status).toBe(201);
  const batchId = batchRes.body.data.id;

  const sectionRes = await api()
    .post('/api/sections')
    .set(auth(adminToken))
    .send({ name: 'QR-A', batchId });
  expect(sectionRes.status).toBe(201);
  sectionId = sectionRes.body.data.id;

  const subjectRes = await api()
    .post('/api/subjects')
    .set(auth(adminToken))
    .send({ subjectCode: 'QR101', subjectName: 'Scanning 101', batchId, sectionId });
  expect(subjectRes.status).toBe(201);
  subjectId = (subjectRes.body.data.subject || subjectRes.body.data).id;

  const teacherRes = await api()
    .post('/api/admin/teachers')
    .set(auth(adminToken))
    .send(TEACHER);
  expect(teacherRes.status).toBe(201);
  const teacherId = teacherRes.body.data.user.id;

  const assignRes = await api()
    .post(`/api/admin/teachers/${teacherId}/assignments`)
    .set(auth(adminToken))
    .send({ sectionId, subjectId });
  expect(assignRes.status).toBe(201);

  const studentRes = await api()
    .post('/api/students')
    .set(auth(adminToken))
    .send({ name: STUDENT.name, email: STUDENT.email, batchId, sectionId });
  expect(studentRes.status).toBe(201);
  studentId = studentRes.body.data.id;

  const studentUserRes = await api()
    .post('/api/auth/users')
    .set(auth(adminToken))
    .send({ email: STUDENT.email, password: STUDENT.password, role: 'STUDENT' });
  await query('UPDATE students SET "userId" = $1 WHERE id = $2', [
    studentUserRes.body.data.id,
    studentId,
  ]);

  ({ token: teacherToken } = await login(TEACHER.email, TEACHER.password));
  ({ token: studentToken } = await login(STUDENT.email, STUDENT.password));
}, 60000);

describe('roll-up on session close', () => {
  test('a scan reaches `attendance` only once the session is closed', async () => {
    const date = '2026-03-02';
    const session = await openSession(date);

    const scanRes = await scan(session);
    expect(scanRes.status).toBe(201);

    // Recorded in attendance_sessions...
    const { rows: scans } = await query(
      'SELECT status FROM attendance_sessions WHERE "qrSessionId" = $1',
      [session.id]
    );
    expect(scans).toHaveLength(1);
    expect(scans[0].status).toBe('Present');

    // ...but deliberately not published yet: absences aren't known until close.
    expect(await attendanceRow(date)).toBeNull();

    const closeRes = await closeSession(session);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.rollup).toEqual({ ok: true, recordsPublished: 1 });

    expect(await attendanceRow(date)).toEqual({ status: 'Present', sheetId: null });
  });

  test('a student who never scans is published as Absent', async () => {
    const date = '2026-03-03';
    const session = await openSession(date);

    const closeRes = await closeSession(session);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.rollup.recordsPublished).toBe(1);

    expect(await attendanceRow(date)).toEqual({ status: 'Absent', sheetId: null });
  });
});

describe('conflict rules', () => {
  test('QR overwrites a day already filled by an Excel upload', async () => {
    const date = '2026-03-04';

    // Stand in for attendanceController.uploadExcel, which upserts with no sheetId.
    await query(
      `INSERT INTO attendance ("studentId", "subjectId", date, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Absent', NOW(), NOW())`,
      [studentId, subjectId, date]
    );
    expect(await attendanceRow(date)).toEqual({ status: 'Absent', sheetId: null });

    const session = await openSession(date);
    expect((await scan(session)).status).toBe(201);
    expect((await closeSession(session)).status).toBe(200);

    expect(await attendanceRow(date)).toEqual({ status: 'Present', sheetId: null });
  });

  test('with two sessions on one day, the last one closed wins', async () => {
    const date = '2026-03-05';

    // Morning lecture — student attends.
    const lecture = await openSession(date, 'Lecture');
    expect((await scan(lecture)).status).toBe(201);
    expect((await closeSession(lecture)).status).toBe(200);
    expect(await attendanceRow(date)).toEqual({ status: 'Present', sheetId: null });

    // Afternoon tutorial — student skips it. One slot per day, so this overwrites.
    const tutorial = await openSession(date, 'Tutorial');
    expect((await closeSession(tutorial)).status).toBe(200);
    expect(await attendanceRow(date)).toEqual({ status: 'Absent', sheetId: null });
  });
});

describe('reports see QR attendance', () => {
  test('the student attendance summary counts QR-recorded classes', async () => {
    const res = await api().get('/api/student/attendance/summary').set(auth(studentToken));
    expect(res.status).toBe(200);

    const payload = res.body.data;
    const subjects = payload.subjects || payload.subjectStats || payload;
    const ours = (Array.isArray(subjects) ? subjects : []).find((s) => s.code === 'QR101');

    expect(ours).toBeDefined();
    // Four dates published above: Present, Absent, Present, Absent.
    expect(ours.total).toBe(4);
    expect(ours.attended).toBe(2);
    expect(ours.percentage).toBe(50);
  });
});
