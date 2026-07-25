// Read-only "tools" the chatbot agent can call to fetch live Postgres data.
// The Python agent calls these over HTTP, forwarding the caller's JWT, so the
// existing auth middleware (authenticateJWT + authorizeRoles) is the single
// authority. STUDENT callers are always forced to their own record; admin-only
// tools are guarded at the route level.

const Student = require('../models/Student');
const { getSubjectAttendanceStats, calculateAttendancePercentage } = require('./studentPortalController');
const { buildPayload } = require('./chatbotController');

function aggregate(student) {
  let present = 0, late = 0, absent = 0;
  for (const sub of student.subjects) {
    present += sub.present || 0;
    late += sub.late || 0;
    absent += sub.absent || 0;
  }
  const total = present + late + absent;
  const pct = total > 0 ? ((present + late) / total) * 100 : 0;
  return Math.round(pct * 10) / 10;
}

// getStudentAttendance — STUDENT: own; ADMIN: by email or sno.
exports.studentAttendance = async (req, res) => {
  try {
    let studentId;
    if (req.user.role === 'STUDENT') {
      const s = await Student.findOne({ where: { userId: req.user.id } });
      if (!s) return res.json({ error: 'No student profile for this account.' });
      studentId = s.id;
    } else {
      const { email, sno } = req.body || {};
      let s = null;
      if (sno) s = await Student.findByPk(Number(sno));
      else if (email) s = await Student.findOne({ where: { email: String(email).trim().toLowerCase() } });
      if (!s) return res.json({ error: 'Student not found. Provide a valid email or sno.' });
      studentId = s.id;
    }
    const subjects = await getSubjectAttendanceStats(studentId);
    const overall = await calculateAttendancePercentage(studentId);
    res.json({
      studentId,
      overallPercentage: overall.overall,
      totalClasses: overall.total,
      subjects,
      atRiskSubjects: subjects.filter((x) => x.percentage < 80).map((x) => x.code),
    });
  } catch (err) {
    res.json({ error: err.message });
  }
};

// listAtRiskStudents (ADMIN) — students below a threshold, optionally by batch.
exports.atRiskStudents = async (req, res) => {
  try {
    // Small local models routinely emit threshold:0 here, which means "below 0%",
    // returns nobody, and reads to the model as a truthful "no one is at risk" —
    // a confidently wrong answer. Treat out-of-range values as unset (80) and tell
    // the caller which threshold was actually applied.
    const rawThreshold = req.body?.threshold;
    const asNum = Number(rawThreshold);
    const valid = rawThreshold !== undefined && rawThreshold !== null
      && Number.isFinite(asNum) && asNum > 0 && asNum <= 100;
    const threshold = valid ? asNum : 80;
    const coerced = rawThreshold !== undefined && rawThreshold !== null && !valid;

    const limit = Number(req.body?.limit ?? 20);
    const batch = req.body?.batch ? String(req.body.batch).toLowerCase() : null;
    const students = await buildPayload();
    const rows = [];
    for (const s of students) {
      if (batch && String(s.batch).toLowerCase() !== batch) continue;
      const pct = aggregate(s);
      if (pct < threshold) rows.push({ name: s.name, email: s.email, batch: s.batch, percentage: pct });
    }
    rows.sort((a, b) => a.percentage - b.percentage);
    const out = { threshold, count: rows.length, students: rows.slice(0, limit) };
    if (coerced) {
      out.note = `Requested threshold ${rawThreshold} is out of range; used ${threshold}% instead. Report ${threshold}% as the threshold.`;
    }
    res.json(out);
  } catch (err) {
    res.json({ error: err.message });
  }
};

// getBatchSummary (ADMIN) — per-batch averages and at-risk counts.
exports.batchSummary = async (req, res) => {
  try {
    const wantBatch = req.body?.batch ? String(req.body.batch).toLowerCase() : null;
    const students = await buildPayload();
    const agg = new Map();
    for (const s of students) {
      const pct = aggregate(s);
      const b = agg.get(s.batch) || { batch: s.batch, sum: 0, count: 0, atRisk: 0 };
      b.sum += pct;
      b.count += 1;
      if (pct < 80) b.atRisk += 1;
      agg.set(s.batch, b);
    }
    let out = Array.from(agg.values()).map((b) => ({
      batch: b.batch,
      avgAttendance: Math.round((b.sum / b.count) * 10) / 10,
      totalStudents: b.count,
      atRisk: b.atRisk,
    }));
    if (wantBatch) out = out.filter((b) => String(b.batch).toLowerCase() === wantBatch);
    out.sort((a, b) => b.avgAttendance - a.avgAttendance);
    res.json({ batches: out });
  } catch (err) {
    res.json({ error: err.message });
  }
};

// getCoursePerformance (ADMIN) — per-course attendance averages.
exports.coursePerformance = async (req, res) => {
  try {
    const wantCode = req.body?.course_code ? String(req.body.course_code).toLowerCase() : null;
    const students = await buildPayload();
    const agg = new Map();
    for (const s of students) {
      for (const sub of s.subjects) {
        const row = agg.get(sub.code) || { code: sub.code, name: sub.name, present: 0, late: 0, absent: 0, students: 0 };
        row.present += sub.present || 0;
        row.late += sub.late || 0;
        row.absent += sub.absent || 0;
        row.students += 1;
        agg.set(sub.code, row);
      }
    }
    let out = Array.from(agg.values()).map((c) => {
      const total = c.present + c.late + c.absent;
      return {
        code: c.code,
        name: c.name,
        avgAttendance: total > 0 ? Math.round(((c.present + c.late) / total) * 1000) / 10 : 0,
        students: c.students,
      };
    });
    if (wantCode) out = out.filter((c) => String(c.code).toLowerCase() === wantCode);
    out.sort((a, b) => b.avgAttendance - a.avgAttendance);
    res.json({ courses: out });
  } catch (err) {
    res.json({ error: err.message });
  }
};
