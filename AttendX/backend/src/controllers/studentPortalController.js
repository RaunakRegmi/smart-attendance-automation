const { Op } = require('sequelize');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kathmandu';
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const Routine = require('../models/Routine');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Faculty = require('../models/Faculty');

const Notification = require('../models/Notification');

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://host.docker.internal:8000';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `avatar_${Date.now()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const getAuthenticatedStudent = async (userId) => {
  const student = await Student.findOne({
    where: { userId },
    include: [
      { model: Batch },
      { model: Section, include: [{ model: Batch }] },
      { model: Faculty },
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
    const tomorrowPreview = await getTomorrowFirstClass(student.sectionId);
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
          department: student.Faculty?.name || student.faculty || 'BCS Hons Artificial Intelligence with Computer Science',
          batch: student.Batch?.name || student.Section?.Batch?.name || null,
          section: student.Section?.name || null,

          avatarUrl: student.avatarUrl || null,
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
          nextClass: todaySchedule.find(c => c.status === 'UPCOMING') || null,
          currentClass: todaySchedule.find(c => c.status === 'ONGOING') || null,
        },
        tomorrowPreview,
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

exports.getWeeklyAttendanceSummary = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const now = moment.tz(TIMEZONE);
    const startOfWeek = now.clone().startOf('week');
    const endOfWeek = now.clone().endOf('week');

    const where = { studentId: student.id, date: { [Op.gte]: startOfWeek.format('YYYY-MM-DD'), [Op.lte]: endOfWeek.format('YYYY-MM-DD') } };
    const records = await Attendance.findAll({
      where,
      include: [{ model: Subject }],
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

    const subjectStats = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? parseFloat(((s.attended / s.total) * 100).toFixed(1)) : 0,
      isOnTrack: (s.total > 0 ? ((s.attended / s.total) * 100) : 0) >= 80,
    }));

    const totalAttended = subjectStats.reduce((sum, s) => sum + s.attended, 0);
    const totalClasses = subjectStats.reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = totalClasses > 0 ? parseFloat(((totalAttended / totalClasses) * 100).toFixed(1)) : 0;

    const dailyBuckets = [{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0}];
    for (const r of records) {
      const dow = moment.tz(r.date, TIMEZONE).day();
      if (dow === 6) continue;
      dailyBuckets[dow].t += 1;
      if (r.status === 'Present' || r.status === 'Late') dailyBuckets[dow].p += 1;
    }
    const studentDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
    const dailyPercentages = dailyBuckets.map(b => b.t > 0 ? Math.round((b.p / b.t) * 100) : 0);

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
        days: studentDays,
        heights: dailyPercentages,
      },
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
  const where = { studentId };
  const records = await Attendance.findAll({
    where,
    include: [{ model: Subject }],
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
  const where = { studentId };
  const records = await Attendance.findAll({ where });
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

const getWeeklyAttendanceHeights = async (studentId) => {
  const now = moment.tz(TIMEZONE);
  const startOfWeek = now.clone().startOf('week');
  const startISO = startOfWeek.format('YYYY-MM-DD');

  const where = { studentId, date: { [Op.gte]: startISO } };
  const records = await Attendance.findAll({ where });
  if (records.length === 0) return [0, 0, 0, 0, 0, 0];

  const buckets = [{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0},{p:0,t:0}];
  for (const r of records) {
    const dow = moment.tz(r.date, TIMEZONE).day();
    if (dow === 6) continue;
    buckets[dow].t += 1;
    if (r.status === 'Present' || r.status === 'Late') buckets[dow].p += 1;
  }
  return buckets.map((b) => b.t > 0 ? Math.round((b.p / b.t) * 100) : 0);
};

const getRecentAttendanceLogs = async (studentId, limit = 4) => {
  const where = { studentId };
  return Attendance.findAll({
    where,
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

  const where = { sectionId, dayOfWeek };
  const routines = await Routine.findAll({
    where,
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

const getTomorrowFirstClass = async (sectionId) => {
  if (!sectionId) return null;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const tomorrowDay = dayNames[tomorrow.getDay()];

  const where = { sectionId, dayOfWeek: tomorrowDay };
  const routine = await Routine.findOne({
    where,
    order: [['startTime', 'ASC']],
  });

  if (!routine) return null;

  return {
    subject: routine.subjectName,
    subjectCode: routine.subjectCode,
    startTime: routine.startTime,
    endTime: routine.endTime,
    room: routine.room,
    teacher: routine.teacher || '',
    dayName: tomorrowDay,
  };
};

exports.getProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({
      where: { userId: req.user.id },
      include: [{ model: Batch }, { model: Section }, { model: Faculty }],
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    res.json({
      success: true,
      data: {
        name: student.name,
        email: student.email,
        studentId: student.univId || student.regNum || `STU-${student.id}`,
        gender: student.gender || '',
        bloodGroup: student.bloodGroup || '',
        regNum: student.regNum || '',
        univId: student.univId || '',
        admissionDate: student.admissionDate || '',
        facultyId: student.facultyId || '',
        faculty: student.Faculty?.name || student.faculty || '',
        guardianName: student.guardianName || '',
        guardianContact: student.guardianContact || '',
        batch: student.Batch?.name || '',
        section: student.Section?.name || '',
        avatarUrl: student.avatarUrl || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ where: { userId: req.user.id } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const allowed = ['gender', 'bloodGroup', 'regNum', 'univId', 'admissionDate', 'facultyId', 'guardianName', 'guardianContact'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const regNumPattern = /^[a-zA-Z0-9-]+$/;
    const univIdPattern = /^[a-zA-Z0-9\-\/]+$/;
    const contactPattern = /^[0-9+\-]+$/;

    if (updates.univId) {
      if (updates.univId.length > 30) {
        return res.status(400).json({ success: false, message: 'University ID must be at most 30 characters' });
      }
      if (!univIdPattern.test(updates.univId)) {
        return res.status(400).json({ success: false, message: 'Only letters, numbers, hyphens and slashes allowed' });
      }
    }
    if (updates.regNum) {
      if (updates.regNum.length > 15) {
        return res.status(400).json({ success: false, message: 'Registration number must be at most 15 characters' });
      }
      if (!regNumPattern.test(updates.regNum)) {
        return res.status(400).json({ success: false, message: 'Only alphanumeric characters and hyphens allowed' });
      }
    }
    if (updates.guardianName && updates.guardianName.length > 50) {
      return res.status(400).json({ success: false, message: 'Guardian name must be at most 50 characters' });
    }
    if (updates.guardianContact) {
      if (!contactPattern.test(updates.guardianContact)) {
        return res.status(400).json({ success: false, message: 'Only numbers, + and - allowed' });
      }
    }
    if (updates.gender && !['Male', 'Female', 'Others'].includes(updates.gender)) {
      return res.status(400).json({ success: false, message: 'Gender must be Male, Female, or Others' });
    }

    await student.update(updates);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const student = await Student.findOne({ where: { userId: req.user.id } });
    if (student) {
      if (student.avatarUrl) {
        const oldPath = path.join(__dirname, '../../', student.avatarUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      await student.update({ avatarUrl });
    }

    res.json({
      success: true,
      message: 'Profile photo updated',
      data: { avatarUrl: `${SERVER_URL}${avatarUrl}` },
    });
  } catch (error) {
    next(error);
  }
};

exports.photoUpload = photoUpload;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const resp = await fetch(`${CHATBOT_URL}/student/chat-by-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch((err) => {
      if (err.name === 'AbortError') throw new Error('Chatbot service timed out');
      throw new Error(`Chatbot service unreachable: ${err.message}`);
    }).finally(() => clearTimeout(timeoutId));

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return res.status(502).json({ success: false, message: body.error || `Chatbot returned ${resp.status}` });
    }

    const body = await resp.json();
    res.json({
      success: true,
      reply: body.reply || '',
      personalized: body.personalized === true,
    });
  } catch (err) {
    console.error('student chat failed:', err);
    res.status(503).json({ success: false, message: err.message || 'Chatbot service unreachable' });
  }
};
