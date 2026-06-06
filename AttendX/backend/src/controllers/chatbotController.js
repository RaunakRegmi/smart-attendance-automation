// Admin-only endpoint that exports current Postgres attendance data
// to the chatbot service so its knowledge base reflects fresh sheet data.
//
// Flow:
//   1. Query students with their attendance + subject joins.
//   2. Reduce per-student into a {present, absent, late} per subject.
//   3. POST the JSON payload to the chatbot's /ingest endpoint.
//      Chatbot writes its analytics CSVs and rebuilds ChromaDB.

const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const User = require('../models/User');
const Notification = require('../models/Notification');

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://host.docker.internal:8000';

async function buildPayload() {
  const students = await Student.findAll({
    include: [
      { model: Batch, attributes: ['name'] },
      { model: Section, attributes: ['name', 'batchId'], include: [{ model: Batch, attributes: ['name'] }] },
      { model: User, attributes: ['email'] },
    ],
  });

  const allAttendance = await Attendance.findAll({
    include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
  });

  // Group attendance per student → per subject
  const byStudent = new Map();
  for (const att of allAttendance) {
    const stuId = att.studentId;
    if (!byStudent.has(stuId)) byStudent.set(stuId, new Map());
    const subjMap = byStudent.get(stuId);
    const subj = att.Subject;
    if (!subj) continue;
    const key = subj.subjectCode || `subj_${subj.id}`;
    if (!subjMap.has(key)) {
      subjMap.set(key, {
        code: subj.subjectCode || '',
        name: subj.subjectName || subj.subjectCode || '',
        present: 0,
        absent: 0,
        late: 0,
      });
    }
    const entry = subjMap.get(key);
    if (att.status === 'Present') entry.present += 1;
    else if (att.status === 'Absent') entry.absent += 1;
    else if (att.status === 'Late') entry.late += 1;
  }

  const payloadStudents = students.map((s, idx) => {
    const email = (s.email || s.User?.email || '').trim().toLowerCase();
    const subjMap = byStudent.get(s.id) || new Map();
    const batchName = s.Batch?.name || s.Section?.Batch?.name || 'Unassigned';
    return {
      sno: s.id || idx + 1,
      name: s.name || email || `Student ${s.id}`,
      email,
      batch: batchName,
      subjects: Array.from(subjMap.values()),
    };
  });

  // Drop students who have no attendance at all — they pollute the index.
  return payloadStudents.filter((s) => s.subjects.length > 0);
}

exports.refresh = async (req, res) => {
  try {
    const payloadStudents = await buildPayload();

    if (payloadStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No attendance data to send. Sync a sheet first.',
      });
    }

    const resp = await fetch(`${CHATBOT_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: payloadStudents }),
    }).catch((err) => {
      throw new Error(`Chatbot service unreachable at ${CHATBOT_URL}: ${err.message}`);
    });

    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || body.success === false) {
      return res.status(502).json({
        success: false,
        message: body.error || `Chatbot returned ${resp.status}`,
      });
    }

    // Generate smart notifications based on the same data. Non-fatal if it fails.
    let notificationsCreated = 0;
    try { notificationsCreated = await generateSmartNotifications(); }
    catch (e) { console.warn('Notification generation failed:', e.message); }

    res.json({
      success: true,
      message: `Knowledge base rebuilt with ${payloadStudents.length} students`,
      studentsExported: payloadStudents.length,
      notificationsCreated,
    });
  } catch (err) {
    console.error('chatbot/refresh failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.health = async (req, res) => {
  try {
    const resp = await fetch(`${CHATBOT_URL}/health`);
    const body = await resp.json();
    res.json({ success: true, chatbot: body });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
};

exports.preview = async (req, res) => {
  // Useful for debugging: shows what the backend would send without actually calling chatbot.
  try {
    const payloadStudents = await buildPayload();
    res.json({
      success: true,
      count: payloadStudents.length,
      sample: payloadStudents.slice(0, 3),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin chat proxy — keeps the chatbot port private and applies admin RBAC.
exports.adminChat = async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }
    const resp = await fetch(`${CHATBOT_URL}/chat-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() }),
    });
    if (!resp.ok) {
      return res.status(502).json({ success: false, message: `Chatbot returned ${resp.status}` });
    }
    const body = await resp.json();
    res.json({ success: true, reply: body.reply || '' });
  } catch (err) {
    console.error('adminChat failed:', err);
    res.status(503).json({ success: false, message: 'Chatbot service unreachable' });
  }
};

// Derived analytics for the admin dashboard charts.
// Reuses buildPayload then bucketizes by attendance percentage.
exports.analytics = async (req, res) => {
  try {
    const students = await buildPayload();
    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          totalStudents: 0,
          avgAttendance: 0,
          distribution: [],
          byBatch: [],
          byCourse: [],
          atRiskStudents: [],
        },
      });
    }

    const buckets = {
      Excellent: 0,    // >= 90
      Satisfactory: 0, // 80-90
      'At Risk': 0,    // 60-80
      Critical: 0,     // < 60
    };
    let sumPct = 0;
    const batchAgg = new Map(); // batch -> { sum, count, atRisk }
    const courseAgg = new Map(); // code -> { sum, count, present, total }
    const atRisk = [];

    for (const s of students) {
      let present = 0, late = 0, absent = 0;
      for (const sub of s.subjects) {
        present += sub.present || 0;
        late += sub.late || 0;
        absent += sub.absent || 0;
        const subTotal = (sub.present || 0) + (sub.late || 0) + (sub.absent || 0);
        const courseRow = courseAgg.get(sub.code) || { code: sub.code, name: sub.name, present: 0, late: 0, absent: 0, total: 0, students: 0 };
        courseRow.present += sub.present || 0;
        courseRow.late += sub.late || 0;
        courseRow.absent += sub.absent || 0;
        courseRow.total += subTotal;
        courseRow.students += 1;
        courseAgg.set(sub.code, courseRow);
      }
      const totalClasses = present + late + absent;
      const pct = totalClasses > 0 ? ((present + late) / totalClasses) * 100 : 0;
      sumPct += pct;

      if (pct >= 90) buckets.Excellent++;
      else if (pct >= 80) buckets.Satisfactory++;
      else if (pct >= 60) buckets['At Risk']++;
      else buckets.Critical++;

      const b = batchAgg.get(s.batch) || { batch: s.batch, sum: 0, count: 0, atRisk: 0 };
      b.sum += pct;
      b.count += 1;
      if (pct < 80) b.atRisk += 1;
      batchAgg.set(s.batch, b);

      if (pct < 80) {
        atRisk.push({ name: s.name, email: s.email, batch: s.batch, percentage: Math.round(pct * 10) / 10 });
      }
    }

    const distribution = Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / students.length) * 1000) / 10,
    }));

    const byBatch = Array.from(batchAgg.values()).map((b) => ({
      batch: b.batch,
      avgAttendance: Math.round((b.sum / b.count) * 10) / 10,
      totalStudents: b.count,
      atRisk: b.atRisk,
    })).sort((a, b) => b.avgAttendance - a.avgAttendance);

    const byCourse = Array.from(courseAgg.values()).map((c) => ({
      code: c.code,
      name: c.name,
      avgAttendance: c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 1000) / 10 : 0,
      students: c.students,
    })).sort((a, b) => b.avgAttendance - a.avgAttendance);

    atRisk.sort((a, b) => a.percentage - b.percentage);

    res.json({
      success: true,
      data: {
        totalStudents: students.length,
        avgAttendance: Math.round((sumPct / students.length) * 10) / 10,
        distribution,
        byBatch,
        byCourse,
        atRiskStudents: atRisk.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('analytics failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Generate smart, personalized notifications based on current student state.
// Idempotent: replaces previous system-generated notifications instead of stacking.
async function generateSmartNotifications() {
  const students = await Student.findAll({
    include: [
      { model: User, attributes: ['id', 'email'] },
      { model: Batch, attributes: ['name'] },
    ],
  });
  const attendance = await Attendance.findAll({
    include: [{ model: Subject, attributes: ['subjectCode', 'subjectName'] }],
  });

  // Build per-student per-subject stats
  const byStudent = new Map();
  for (const a of attendance) {
    const map = byStudent.get(a.studentId) || new Map();
    const code = a.Subject?.subjectCode || `subj_${a.subjectId}`;
    const entry = map.get(code) || { code, name: a.Subject?.subjectName || code, present: 0, late: 0, absent: 0 };
    if (a.status === 'Present') entry.present += 1;
    else if (a.status === 'Absent') entry.absent += 1;
    else if (a.status === 'Late') entry.late += 1;
    map.set(code, entry);
    byStudent.set(a.studentId, map);
  }

  // Wipe previous system notifications so we don't pile up identical ones
  await Notification.destroy({ where: { category: ['ATTENDANCE', 'REMINDER'] } });

  let created = 0;
  for (const s of students) {
    if (!s.User?.id) continue;
    const subjects = Array.from((byStudent.get(s.id) || new Map()).values());
    if (subjects.length === 0) continue;

    let present = 0, late = 0, absent = 0;
    for (const subj of subjects) { present += subj.present; late += subj.late; absent += subj.absent; }
    const total = present + late + absent;
    const pct = total > 0 ? ((present + late) / total) * 100 : 0;

    // 1. Critical (<60%)
    if (pct < 60 && total >= 5) {
      await Notification.create({
        title: 'Critical Attendance Alert',
        description: `Your attendance is ${pct.toFixed(1)}%, well below the 80% threshold. Please speak to your academic advisor.`,
        category: 'ATTENDANCE',
        targetUserId: s.User.id,
        isRead: false,
      });
      created++;
    }
    // 2. At-risk (60-80%)
    else if (pct < 80 && total >= 5) {
      await Notification.create({
        title: 'Attendance Below Threshold',
        description: `You're currently at ${pct.toFixed(1)}%. Attend the next few classes consistently to get back above 80%.`,
        category: 'ATTENDANCE',
        targetUserId: s.User.id,
        isRead: false,
      });
      created++;
    }
    // 3. Excellent (>=95%) — positive reinforcement
    else if (pct >= 95 && total >= 5) {
      await Notification.create({
        title: 'Excellent Attendance',
        description: `You're at ${pct.toFixed(1)}% — top of your batch. Keep it up!`,
        category: 'ATTENDANCE',
        targetUserId: s.User.id,
        isRead: false,
      });
      created++;
    }

    // 4. Subject-specific warning for the single worst subject
    const worst = subjects
      .map((sub) => {
        const t = sub.present + sub.late + sub.absent;
        return { ...sub, pct: t > 0 ? ((sub.present + sub.late) / t) * 100 : 100, totalSessions: t };
      })
      .filter((s) => s.totalSessions >= 3)
      .sort((a, b) => a.pct - b.pct)[0];
    if (worst && worst.pct < 80) {
      await Notification.create({
        title: `${worst.name || worst.code} needs attention`,
        description: `You're at ${worst.pct.toFixed(1)}% in ${worst.name || worst.code}. Don't miss the next session.`,
        category: 'ATTENDANCE',
        targetUserId: s.User.id,
        isRead: false,
      });
      created++;
    }
  }

  // 5. Broadcast — knowledge base refreshed
  await Notification.create({
    title: 'AI Knowledge Updated',
    description: 'Latest attendance data is now available in the AI Assistant.',
    category: 'REMINDER',
    targetUserId: null, // broadcast
    isRead: false,
  });
  created++;

  return created;
}

// Fire-and-forget refresh — used internally by the sheet sync worker. Doesn't fail
// the parent flow if the chatbot is down or slow.
exports.refreshInternal = async function refreshInternal() {
  try {
    const payloadStudents = await buildPayload();
    if (payloadStudents.length === 0) return { success: false, reason: 'no data' };
    const resp = await fetch(`${CHATBOT_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: payloadStudents }),
    });
    const ok = resp.ok;
    let notificationsCreated = 0;
    if (ok) {
      try { notificationsCreated = await generateSmartNotifications(); }
      catch (e) { console.warn('Notification generation failed:', e.message); }
    }
    return { success: ok, students: payloadStudents.length, notificationsCreated };
  } catch (err) {
    console.error('Auto-refresh failed:', err.message);
    return { success: false, reason: err.message };
  }
};
