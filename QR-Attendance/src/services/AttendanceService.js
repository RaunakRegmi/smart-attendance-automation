const QRCode = require('qrcode');
const { db } = require('../db/knex');
const { AppError } = require('../utils/errors');
const { generateSecureToken } = require('../utils/crypto');

function nowUtc() {
  return new Date();
}

function minutesToMs(m) {
  return Number(m) * 60 * 1000;
}

async function assertTeacherOwnsClass(teacherId, classId) {
  const cls = await db('classes').select('id', 'teacher_id', 'class_name', 'batch_id').where({ id: classId }).first();
  if (!cls) throw new AppError('Class not found', 404);
  if (cls.teacher_id !== teacherId) throw new AppError('Forbidden', 403);
  return cls;
}

async function getScheduledStartDateTimeForNow(classId, sessionStart) {
  // Business rule: use today's schedule entry matching sessionStart day-of-week.
  // If multiple schedules exist for the day, pick the closest start_time <= sessionStart time.
  const dow = sessionStart.getUTCDay(); // aligns with 0-6
  const schedules = await db('class_schedules')
    .select('start_time', 'end_time')
    .where({ class_id: classId, day_of_week: dow })
    .orderBy('start_time', 'asc');

  if (!schedules.length) return null;

  const sessionTime = sessionStart.toISOString().slice(11, 19); // HH:MM:SS
  let chosen = schedules[0];
  for (const s of schedules) {
    if (s.start_time <= sessionTime) chosen = s;
  }

  // Combine date (UTC) + start_time into a Date
  const yyyy = sessionStart.getUTCFullYear();
  const mm = String(sessionStart.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(sessionStart.getUTCDate()).padStart(2, '0');
  const startTime = chosen.start_time.length === 5 ? `${chosen.start_time}:00` : chosen.start_time;
  return new Date(`${yyyy}-${mm}-${dd}T${startTime}Z`);
}

const AttendanceService = {
  async startSession(actor, { classId, durationMinutes }) {
    if (!classId || !durationMinutes) throw new AppError('Missing classId or durationMinutes', 400);
    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > 180) throw new AppError('durationMinutes must be 1..180', 400);

    const cls = await assertTeacherOwnsClass(actor.id, classId);

    // Safety: only one active session per class at a time.
    const existingActive = await db('attendance_sessions')
      .select('id')
      .where({ class_id: classId, is_active: true })
      .andWhere('end_time', '>', nowUtc())
      .first();
    if (existingActive) throw new AppError('An active session already exists for this class', 400);

    const startTime = nowUtc();
    const endTime = new Date(startTime.getTime() + minutesToMs(duration));
    const qrToken = generateSecureToken(32);

    const [session] = await db('attendance_sessions')
      .insert({
        class_id: cls.id,
        teacher_id: actor.id,
        qr_token: qrToken,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      })
      .returning(['id', 'class_id', 'teacher_id', 'qr_token', 'start_time', 'end_time', 'is_active']);

    // Encode ONLY token (opaque) in QR
    const qrPayload = JSON.stringify({ qrToken });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });

    return {
      session: { ...session, qr_token: undefined },
      qr: { payload: qrPayload, dataUrl: qrDataUrl },
    };
  },

  async getSession(actor, sessionId) {
    const session = await db('attendance_sessions')
      .select('id', 'class_id', 'teacher_id', 'start_time', 'end_time', 'is_active', 'created_at')
      .where({ id: sessionId })
      .first();
    if (!session) throw new AppError('Session not found', 404);
    if (actor.role === 'TEACHER' && session.teacher_id !== actor.id) throw new AppError('Forbidden', 403);
    return session;
  },

  async scanQr(actor, { qrToken }) {
    if (!qrToken) throw new AppError('qrToken is required', 400);

    // Accept either raw token or JSON payload
    let token = qrToken;
    if (String(qrToken).trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(qrToken);
        token = parsed.qrToken;
      } catch (_) {
        throw new AppError('Invalid QR payload', 400);
      }
    }
    token = String(token || '').trim();
    if (!token) throw new AppError('Invalid QR token', 400);

    const now = nowUtc();

    const session = await db('attendance_sessions')
      .select('id', 'class_id', 'teacher_id', 'qr_token', 'start_time', 'end_time', 'is_active')
      .where({ qr_token: token })
      .first();

    if (!session) throw new AppError('Session not found', 404);
    if (!session.is_active) throw new AppError('Session is not active', 400);
    if (now < session.start_time || now > session.end_time) throw new AppError('QR expired (outside session window)', 400);

    // Ensure student enrolled in class
    const enrollment = await db('enrollments')
      .select('student_id')
      .where({ student_id: actor.id, class_id: session.class_id })
      .first();
    if (!enrollment) throw new AppError('You are not enrolled in this class', 403);

    // Prevent duplicate scan
    const existing = await db('attendances')
      .select('id', 'status', 'scan_time')
      .where({ session_id: session.id, student_id: actor.id })
      .first();
    if (existing) throw new AppError('Attendance already marked for this session', 400);

    // PRESENT vs LATE based on scheduled class start (fallback: session start)
    const scheduledStart = await getScheduledStartDateTimeForNow(session.class_id, new Date(session.start_time));
    const grace = process.env.LATE_GRACE_MINUTES ? Number(process.env.LATE_GRACE_MINUTES) : 0;
    const threshold = scheduledStart ? new Date(scheduledStart.getTime() + minutesToMs(grace)) : new Date(session.start_time);
    const status = now <= threshold ? 'PRESENT' : 'LATE';

    const [attendance] = await db('attendances')
      .insert({
        session_id: session.id,
        student_id: actor.id,
        scan_time: now,
        status,
      })
      .returning(['id', 'session_id', 'student_id', 'scan_time', 'status']);

    return { attendance };
  },

  async liveAttendance(actor, sessionId) {
    const session = await db('attendance_sessions')
      .select('id', 'class_id', 'teacher_id', 'start_time', 'end_time', 'is_active')
      .where({ id: sessionId })
      .first();
    if (!session) throw new AppError('Session not found', 404);
    if (session.teacher_id !== actor.id) throw new AppError('Forbidden', 403);

    const rows = await db('attendances')
      .join('users', 'users.id', 'attendances.student_id')
      .select(
        'attendances.id',
        'attendances.student_id',
        'users.name as student_name',
        'users.email as student_email',
        'attendances.scan_time',
        'attendances.status',
      )
      .where({ 'attendances.session_id': sessionId })
      .orderBy('attendances.scan_time', 'asc');

    return { session, attendances: rows };
  },

  async createRequest(actor, { sessionId, reason }) {
    if (!sessionId || !reason) throw new AppError('Missing sessionId or reason', 400);

    const session = await db('attendance_sessions').select('id', 'class_id').where({ id: sessionId }).first();
    if (!session) throw new AppError('Session not found', 404);

    const enrollment = await db('enrollments')
      .select('student_id')
      .where({ student_id: actor.id, class_id: session.class_id })
      .first();
    if (!enrollment) throw new AppError('You are not enrolled in this class', 403);

    const [reqRow] = await db('attendance_requests')
      .insert({
        student_id: actor.id,
        session_id: sessionId,
        reason: String(reason).trim(),
        status: 'PENDING',
      })
      .onConflict(['student_id', 'session_id'])
      .merge({ reason: String(reason).trim(), status: 'PENDING', updated_at: db.fn.now() })
      .returning(['id', 'student_id', 'session_id', 'reason', 'status', 'created_at', 'updated_at']);

    return reqRow;
  },

  async resolveRequest(actor, requestId, resolution) {
    if (!['APPROVED', 'REJECTED'].includes(resolution)) throw new AppError('Invalid resolution', 400);

    const reqRow = await db('attendance_requests')
      .select('id', 'student_id', 'session_id', 'status')
      .where({ id: requestId })
      .first();
    if (!reqRow) throw new AppError('Request not found', 404);
    if (reqRow.status !== 'PENDING') throw new AppError('Request already resolved', 400);

    const session = await db('attendance_sessions')
      .select('id', 'teacher_id')
      .where({ id: reqRow.session_id })
      .first();
    if (!session) throw new AppError('Session not found', 404);
    if (session.teacher_id !== actor.id) throw new AppError('Forbidden', 403);

    return await db.transaction(async (trx) => {
      const [updatedReq] = await trx('attendance_requests')
        .where({ id: requestId })
        .update({ status: resolution, updated_at: trx.fn.now() })
        .returning(['id', 'student_id', 'session_id', 'reason', 'status', 'updated_at']);

      if (resolution === 'APPROVED') {
        // If attendance exists, mark PRESENT (correction). If missing, create as PRESENT at now.
        const existing = await trx('attendances')
          .select('id')
          .where({ session_id: reqRow.session_id, student_id: reqRow.student_id })
          .first();

        if (existing) {
          await trx('attendances')
            .where({ id: existing.id })
            .update({ status: 'PRESENT', updated_at: trx.fn.now() });
        } else {
          await trx('attendances').insert({
            session_id: reqRow.session_id,
            student_id: reqRow.student_id,
            scan_time: nowUtc(),
            status: 'PRESENT',
          });
        }
      }

      return updatedReq;
    });
  },
};

module.exports = { AttendanceService };

