// Weekly attendance report — generates a per-student summary of the past week's
// classes and delivers it as an in-app notification. Designed to run unattended
// every Friday at 17:00 Asia/Kathmandu (configurable) via SchedulerService.

const { Op } = require('sequelize');
const moment = require('moment-timezone');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const Notification = require('../models/Notification');

const TIMEZONE = 'Asia/Kathmandu';

function weekRange(referenceMoment) {
  // Treat the week as Monday → Sunday in the configured timezone.
  const ref = referenceMoment || moment.tz(TIMEZONE);
  const start = ref.clone().startOf('isoWeek'); // Monday 00:00
  const end = ref.clone().endOf('isoWeek');     // Sunday 23:59:59
  return { start, end };
}

function statusForPercent(pct) {
  if (pct >= 90) return 'Excellent';
  if (pct >= 75) return 'On Track';
  if (pct >= 60) return 'At Risk';
  return 'Critical';
}

function buildReportBody({ pct, attended, total, absent, late, weeklyTrend, worst }) {
  const lines = [
    `This week: ${attended}/${total} classes attended (${pct.toFixed(1)}%)`,
  ];
  if (absent > 0) lines.push(`Absent: ${absent} • Late: ${late}`);
  if (weeklyTrend !== null) {
    const arrow = weeklyTrend > 0 ? '▲' : weeklyTrend < 0 ? '▼' : '—';
    lines.push(`${arrow} ${Math.abs(weeklyTrend).toFixed(1)}% vs last week`);
  }
  if (worst && worst.pct < 75) {
    lines.push(`Watch out for ${worst.code}: ${worst.pct.toFixed(0)}% this week`);
  }
  return lines.join('\n');
}

async function generateForStudent(student, { weekStart, weekEnd, prevStart, prevEnd }) {
  const userId = student.User?.id;
  if (!userId) return null;

  const startISO = weekStart.format('YYYY-MM-DD');
  const endISO = weekEnd.format('YYYY-MM-DD');
  const records = await Attendance.findAll({
    where: { studentId: student.id, date: { [Op.between]: [startISO, endISO] } },
    include: [{ model: Subject, attributes: ['subjectCode', 'subjectName'] }],
  });

  if (records.length === 0) {
    return null; // No classes this week → no report
  }

  let present = 0, late = 0, absent = 0;
  const bySubject = new Map();
  for (const r of records) {
    if (r.status === 'Present') present++;
    else if (r.status === 'Late') late++;
    else if (r.status === 'Absent') absent++;

    const code = r.Subject?.subjectCode || `subj_${r.subjectId}`;
    const entry = bySubject.get(code) || { code, name: r.Subject?.subjectName || code, present: 0, late: 0, absent: 0 };
    if (r.status === 'Present') entry.present++;
    else if (r.status === 'Late') entry.late++;
    else if (r.status === 'Absent') entry.absent++;
    bySubject.set(code, entry);
  }
  const attended = present + late;
  const total = present + late + absent;
  const pct = total > 0 ? (attended / total) * 100 : 0;

  // Compare to previous week
  const prevRecords = await Attendance.count({
    where: { studentId: student.id, date: { [Op.between]: [prevStart.format('YYYY-MM-DD'), prevEnd.format('YYYY-MM-DD')] } },
  });
  let weeklyTrend = null;
  if (prevRecords > 0) {
    const prevAttended = await Attendance.count({
      where: { studentId: student.id, status: { [Op.in]: ['Present', 'Late'] }, date: { [Op.between]: [prevStart.format('YYYY-MM-DD'), prevEnd.format('YYYY-MM-DD')] } },
    });
    const prevPct = prevRecords > 0 ? (prevAttended / prevRecords) * 100 : 0;
    weeklyTrend = pct - prevPct;
  }

  // Worst subject this week
  const subjArr = Array.from(bySubject.values()).map((s) => {
    const t = s.present + s.late + s.absent;
    return { ...s, pct: t > 0 ? ((s.present + s.late) / t) * 100 : 100 };
  });
  const worst = subjArr.length > 0 ? subjArr.sort((a, b) => a.pct - b.pct)[0] : null;

  const title = `Weekly Report (${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')}) • ${statusForPercent(pct)}`;
  const description = buildReportBody({ pct, attended, total, absent, late, weeklyTrend, worst });

  // Idempotent: if a weekly report for this same week already exists for
  // this user, update it in place instead of stacking duplicates.
  const weekTag = `Weekly Report (${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')})`;
  const existing = await Notification.findOne({
    where: {
      targetUserId: userId,
      title: { [Op.like]: `${weekTag}%` },
    },
  });
  if (existing) {
    await existing.update({ title, description, isRead: false });
  } else {
    await Notification.create({
      title,
      description,
      category: 'ATTENDANCE',
      targetUserId: userId,
      isRead: false,
    });
  }
  return { studentId: student.id, attended, total, pct };
}

/**
 * Generate weekly reports for every student.
 * @param {Object} options
 * @param {moment.Moment} [options.reference] - reference moment (defaults to now in Asia/Kathmandu)
 * @param {boolean} [options.fallbackToLatest] - if no data in reference week, fall back to most recent week with data (default true)
 * @returns {Promise<{generated:number, weekStart:string, weekEnd:string}>}
 */
async function generateAllWeeklyReports(options = {}) {
  const fallbackToLatest = options.fallbackToLatest !== false;
  let ref = options.reference || moment.tz(TIMEZONE);
  let { start: weekStart, end: weekEnd } = weekRange(ref);

  // If the reference week has zero attendance data and fallback is allowed,
  // anchor the report to the most recent attendance date instead. Keeps the
  // demo and historical replays useful without forcing the cron's behaviour.
  if (fallbackToLatest) {
    const anyInWeek = await Attendance.count({
      where: { date: { [Op.between]: [weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD')] } },
    });
    if (anyInWeek === 0) {
      const latest = await Attendance.findOne({ order: [['date', 'DESC']] });
      if (latest?.date) {
        ref = moment.tz(latest.date, TIMEZONE);
        ({ start: weekStart, end: weekEnd } = weekRange(ref));
      }
    }
  }
  const prevStart = weekStart.clone().subtract(7, 'days');
  const prevEnd = weekEnd.clone().subtract(7, 'days');

  const students = await Student.findAll({
    include: [
      { model: User, attributes: ['id', 'email'] },
      { model: Batch, attributes: ['name'] },
      { model: Section, attributes: ['name', 'batchId'], include: [{ model: Batch, attributes: ['name'] }] },
    ],
  });

  let generated = 0;
  for (const s of students) {
    try {
      const res = await generateForStudent(s, { weekStart, weekEnd, prevStart, prevEnd });
      if (res) generated++;
    } catch (err) {
      console.error(`Weekly report failed for student ${s.id}: ${err.message}`);
    }
  }

  return {
    generated,
    weekStart: weekStart.format('YYYY-MM-DD'),
    weekEnd: weekEnd.format('YYYY-MM-DD'),
  };
}

module.exports = {
  generateAllWeeklyReports,
  generateForStudent,
  weekRange,
};
