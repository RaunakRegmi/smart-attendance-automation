const { Op } = require('sequelize');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const Routine = require('../models/Routine');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Notification = require('../models/Notification');

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://host.docker.internal:8000';

const getAuthenticatedStudent = async (userId) => {
  const student = await Student.findOne({
    where: { userId },
    include: [
      { model: Batch },
      { model: Section, include: [{ model: Batch }] },
    ],
  });
  return student;
};

exports.getDashboard = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const attendancePercentage = await calculateAttendancePercentage(student.id);
    const recentLogs = await getRecentAttendanceLogs(student.id, 4);
    const todaySchedule = await getTodaySchedule(student.sectionId);
    const unreadNotifications = await Notification.count({
      where: { [Op.or]: [{ targetUserId: req.user.id }, { targetUserId: null }], isRead: false }
    });
    const subjectStats = await getSubjectAttendanceStats(student.id);
    const weeklyHeights = await getWeeklyAttendanceHeights(student.id);

    const now = new Date();
    const studentDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
    const todayDayName = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const todayClasses = todaySchedule.length;

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          studentId: student.univId || student.regNum || `STU-${student.id}`,
          department: student.faculty || 'BCS Hons Artificial Intelligence with Computer Science',
          batch: student.Batch?.name || student.Section?.Batch?.name || null,
          section: student.Section?.name || null,
          semester: student.Batch?.name || student.Section?.Batch?.name || '',
        },
        attendance: {
          overallPercentage: attendancePercentage.overall,
          subjectWise: subjectStats,
          totalSubjects: subjectStats.length,
          atRiskCount: subjectStats.filter(s => s.percentage < 80).length,
        },
        todaySchedule: {
          classes: todaySchedule,
          totalToday: todaySchedule.length,
          nextClass: todaySchedule.length > 0 ? todaySchedule[0] : null,
        },
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          subject: log.Subject?.subjectName || 'Unknown',
          code: log.Subject?.subjectCode || '',
          status: log.status,
          date: log.date,
          time: log.createdAt,
          room: log.room || '',
        })),
        notifications: {
          unreadCount: unreadNotifications,
        },
        weeklyOverview: {
          days: studentDays,
          heights: weeklyHeights,
        },
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const subjectStats = await getSubjectAttendanceStats(student.id);
    const totalAttended = subjectStats.reduce((sum, s) => sum + s.attended, 0);
    const totalClasses = subjectStats.reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = totalClasses > 0 ? parseFloat(((totalAttended / totalClasses) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        overall: {
          percentage: overallPercentage,
          attended: totalAttended,
          total: totalClasses,
          absents: subjectStats.reduce((sum, s) => sum + s.absents, 0),
          lates: subjectStats.reduce((sum, s) => sum + s.lates, 0),
        },
        subjects: subjectStats,
        atRisk: subjectStats.filter(s => s.percentage < 80).length,
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceLogs = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const { page = 1, limit = 20, subjectId, status, startDate, endDate } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const whereClause = { studentId: student.id };
    if (subjectId) whereClause.subjectId = subjectId;
    if (status) whereClause.status = status;
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      success: true,
      data: rows.map(log => ({
        id: log.id,
        subject: log.Subject?.subjectName || 'Unknown',
        code: log.Subject?.subjectCode || '',
        status: log.status,
        date: log.date,
        time: log.createdAt,
        subjectId: log.subjectId,
      })),
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSubjectAttendanceStats = async (studentId) => {
  const records = await Attendance.findAll({
    where: { studentId },
    include: [{ model: Subject }]
  });

  const subjectMap = {};
  records.forEach(rec => {
    const code = rec.Subject.subjectCode;
    if (!subjectMap[code]) {
      subjectMap[code] = { subject: rec.Subject.subjectName, code, total: 0, attended: 0, absents: 0, lates: 0 };
    }
    subjectMap[code].total++;
    if (rec.status === 'Present') subjectMap[code].attended++;
    else if (rec.status === 'Absent') subjectMap[code].absents++;
    else if (rec.status === 'Late') { subjectMap[code].lates++; subjectMap[code].attended++; }
  });

  return Object.values(subjectMap).map(s => ({
    ...s,
    percentage: s.total > 0 ? parseFloat(((s.attended / s.total) * 100).toFixed(1)) : 0,
    isOnTrack: (s.total > 0 ? ((s.attended / s.total) * 100) : 0) >= 80,
  }));
};

const calculateAttendancePercentage = async (studentId) => {
  const records = await Attendance.findAll({ where: { studentId } });
  const total = records.length;
  const present = records.filter(r => r.status === 'Present').length;
  const late = records.filter(r => r.status === 'Late').length;
  const attended = present + late;
  return {
    overall: total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 0,
    present,
    late,
    absent: total - attended,
    total,
  };
};

// Per-weekday attendance percentages for the last few weeks → used by the
// dashboard's weekly-overview chart. Returns 6 heights for Sun..Fri (0-100).
const getWeeklyAttendanceHeights = async (studentId) => {
  const records = await Attendance.findAll({ where: { studentId } });
  if (records.length === 0) return [0, 0, 0, 0, 0, 0];

  // Day name → bucket index used by the dashboard (SUN, MON, TUE, WED, THU, FRI)
  const dayIndex = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  const buckets = [{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0}];
  for (const r of records) {
    const dow = new Date(r.date).getDay();
    if (dayIndex[dow] === undefined) continue; // skip Saturday
    const idx = dayIndex[dow];
    buckets[idx].t += 1;
    if (r.status === 'Present' || r.status === 'Late') buckets[idx].p += 1;
  }
  return buckets.map((b) => b.t > 0 ? Math.round((b.p / b.t) * 100) : 0);
};

const getRecentAttendanceLogs = async (studentId, limit = 4) => {
  return Attendance.findAll({
    where: { studentId },
    include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
    limit,
  });
};

const getTodaySchedule = async (sectionId) => {
  if (!sectionId) return [];
  const daysMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[now.getDay()];
  const currentTime = now.toTimeString().split(' ')[0];

  const routines = await Routine.findAll({
    where: { sectionId, dayOfWeek },
    order: [['startTime', 'ASC']],
  });

  return routines.map(r => {
    let status = 'UPCOMING';
    if (currentTime >= r.startTime && currentTime <= r.endTime) status = 'ONGOING';
    else if (currentTime > r.endTime) status = 'COMPLETED';

    return {
      id: r.id,
      subject: r.subjectName,
      subjectCode: r.subjectCode,
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room,
      teacher: r.teacher || '',
      type: r.block || 'Lecture',
      status,
    };
  });
};

// Secure chatbot proxy: JWT identifies the student, so they can only ever ask
// about their own data. The chatbot is never exposed to the client directly.
exports.chat = async (req, res, next) => {
  try {
    const { message, session_id } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    const email = (student.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Student has no email on file' });
    }

    const payload = { message: message.trim(), email };
    if (session_id) payload.session_id = session_id;

    const resp = await fetch(`${CHATBOT_URL}/student/chat-by-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      throw new Error(`Chatbot service unreachable: ${err.message}`);
    });

    if (!resp.ok) {
      return res.status(502).json({ success: false, message: `Chatbot returned ${resp.status}` });
    }

    const body = await resp.json();
    res.json({
      success: true,
      reply: body.reply || '',
      personalized: body.personalized === true,
    });
  } catch (err) {
    console.error('student chat failed:', err);
    res.status(503).json({ success: false, message: 'Chatbot service unreachable' });
  }
};
