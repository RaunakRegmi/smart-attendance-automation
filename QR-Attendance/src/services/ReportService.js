const { db } = require('../db/knex');
const { AppError } = require('../utils/errors');

function percentage(attended, total) {
  if (!total) return 0;
  return Math.round((attended / total) * 10000) / 100; // 2dp
}

async function assertTeacherOwnsClass(actor, classId) {
  const cls = await db('classes').select('id', 'teacher_id', 'class_name').where({ id: classId }).first();
  if (!cls) throw new AppError('Class not found', 404);
  if (actor.role === 'TEACHER' && cls.teacher_id !== actor.id) throw new AppError('Forbidden', 403);
  return cls;
}

const ReportService = {
  async studentReport(actor, studentId) {
    if (actor.role !== 'STUDENT' || actor.id !== studentId) throw new AppError('Forbidden', 403);

    const classes = await db('classes')
      .join('enrollments', 'classes.id', 'enrollments.class_id')
      .select('classes.id', 'classes.class_name')
      .where({ 'enrollments.student_id': studentId });

    const results = [];
    for (const cls of classes) {
      const totalRow = await db('attendance_sessions').count('* as c').where({ class_id: cls.id }).first();
      const total = Number(totalRow?.c || 0);

      const attendedRow = await db('attendances')
        .join('attendance_sessions', 'attendance_sessions.id', 'attendances.session_id')
        .count('* as c')
        .where({ 'attendance_sessions.class_id': cls.id, 'attendances.student_id': studentId })
        .first();
      const attended = Number(attendedRow?.c || 0);

      const pct = percentage(attended, total);
      results.push({
        classId: cls.id,
        className: cls.class_name,
        attended,
        total,
        percentage: pct,
        lowAttendance: pct < 75,
      });
    }

    return { studentId, perClass: results };
  },

  async classReport(actor, classId) {
    const cls = await assertTeacherOwnsClass(actor, classId);

    const students = await db('users')
      .join('enrollments', 'users.id', 'enrollments.student_id')
      .select('users.id', 'users.name', 'users.email')
      .where({ 'enrollments.class_id': classId })
      .orderBy('users.name', 'asc');

    const totalRow = await db('attendance_sessions').count('* as c').where({ class_id: classId }).first();
    const total = Number(totalRow?.c || 0);

    const perStudent = [];
    for (const s of students) {
      const attendedRow = await db('attendances')
        .join('attendance_sessions', 'attendance_sessions.id', 'attendances.session_id')
        .count('* as c')
        .where({ 'attendance_sessions.class_id': classId, 'attendances.student_id': s.id })
        .first();
      const attended = Number(attendedRow?.c || 0);
      const pct = percentage(attended, total);
      perStudent.push({
        studentId: s.id,
        name: s.name,
        email: s.email,
        attended,
        total,
        percentage: pct,
        lowAttendance: pct < 75,
      });
    }

    return { classId: cls.id, className: cls.class_name, totalSessions: total, students: perStudent };
  },

  async monthlyReport(actor, { month, classId }) {
    if (!month || !/^\d{4}-\d{2}$/.test(String(month))) throw new AppError('month must be YYYY-MM', 400);
    const [y, m] = String(month).split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

    // Role-based scoping
    let classIds = [];
    if (actor.role === 'ADMIN') {
      if (classId) classIds = [classId];
      else {
        const all = await db('classes').select('id');
        classIds = all.map((r) => r.id);
      }
    } else if (actor.role === 'TEACHER') {
      let q = db('classes').select('id').where({ teacher_id: actor.id });
      if (classId) q = q.andWhere({ id: classId });
      const rows = await q;
      classIds = rows.map((r) => r.id);
    } else {
      // STUDENT: enrolled classes only
      let q = db('enrollments').select('class_id').where({ student_id: actor.id });
      if (classId) q = q.andWhere({ class_id: classId });
      const rows = await q;
      classIds = rows.map((r) => r.class_id);
    }

    if (!classIds.length) return { month, classes: [] };

    const sessions = await db('attendance_sessions')
      .select('id', 'class_id', 'start_time')
      .whereIn('class_id', classIds)
      .andWhere('start_time', '>=', start)
      .andWhere('start_time', '<', end)
      .orderBy('start_time', 'asc');

    const byClass = new Map();
    for (const s of sessions) {
      if (!byClass.has(s.class_id)) byClass.set(s.class_id, []);
      byClass.get(s.class_id).push(s);
    }

    const classRows = await db('classes').select('id', 'class_name').whereIn('id', classIds);
    const classNameById = new Map(classRows.map((r) => [r.id, r.class_name]));

    const output = [];
    for (const cid of classIds) {
      const sess = byClass.get(cid) || [];
      if (!sess.length) {
        output.push({ classId: cid, className: classNameById.get(cid) || '', totalSessions: 0, attendance: [] });
        continue;
      }

      if (actor.role === 'STUDENT') {
        const attendance = await db('attendances')
          .select('session_id', 'scan_time', 'status')
          .where({ student_id: actor.id })
          .whereIn('session_id', sess.map((x) => x.id));
        output.push({
          classId: cid,
          className: classNameById.get(cid) || '',
          totalSessions: sess.length,
          attendance,
        });
      } else {
        // Teacher/Admin: aggregated counts per session
        const counts = await db('attendances')
          .select('session_id')
          .count('* as presentCount')
          .whereIn('session_id', sess.map((x) => x.id))
          .groupBy('session_id');
        const countBySession = new Map(counts.map((r) => [r.session_id, Number(r.presentCount)]));
        output.push({
          classId: cid,
          className: classNameById.get(cid) || '',
          totalSessions: sess.length,
          sessions: sess.map((x) => ({
            sessionId: x.id,
            startTime: x.start_time,
            attendanceCount: countBySession.get(x.id) || 0,
          })),
        });
      }
    }

    return { month, classes: output };
  },
};

module.exports = { ReportService };

