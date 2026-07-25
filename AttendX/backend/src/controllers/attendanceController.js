const { Op } = require('sequelize');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const { parseExcelFile, exportToExcel } = require('../utils/excelHandler');
const path = require('path');
const fs = require('fs');
const { linkSheet, syncSheet } = require('../services/sheetsService');

// ---------------------------
// Validation for legacy date headers
// ---------------------------
exports.uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const records = parseExcelFile(req.file.path);

    // Check for invalid date headers in row 7
    if (Array.isArray(records.invalidDateHeaders) && records.invalidDateHeaders.length > 0) {
      // Log and clean up before rejecting
      console.error('Invalid date headers detected:', records.invalidDateHeaders);
      fs.unlink(req.file.path, () => {});

      return res.status(400).json({
        success: false,
        message: 'Invalid date headers in sheet',
        details: records.invalidDateHeaders.map(header => `
          - Column ${header.match(/column (\d+)/)[1]}: ${header.match(/'(.*?)'/)[1]}`).join('\n')
      });
    }

    // Process valid records
    const result = { success: 0, failed: 0, errors: [] };

    for (const record of records) {
      // Skip records with missing/invalid date
      if (!record.date) {
        result.failed++;
        result.errors.push({
          studentName: record.studentName,
          error: 'Missing or unparsable date'
        });
        continue;
      }

      try {
        const [student] = await Student.findOrCreate({
          where: { email: record.email },
          defaults: { name: record.studentName }
        });

        const [subject] = await Subject.findOrCreate({
          where: { subjectCode: record.subjectCode },
          defaults: { subjectName: record.subjectCode }
        });

        await Attendance.upsert({
          studentId: student.id,
          subjectId: subject.id,
          date: record.date,
          status: record.status
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          studentName: record.studentName,
          error: error.message
        });
      }
    }

    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      message: 'Excel file processed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------
// Updated attendance statistics (valid date count)
// ---------------------------
exports.getSubjectAttendance = async (req, res, next) => {
  try {
    const { subjectCode } = req.params;

    const subject = await Subject.findOne({
      where: { subjectCode }
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Count valid sessions (distinct dates from row 7)
    const attendanceRows = await Attendance.findAll({
      where: { subjectId: subject.id }
    });
    const validSessionDates = attendanceRows.map(a => a.date);
    // Use a Set to count unique dates (ignore time component)
    const uniqueDates = new Set(validSessionDates.map(d => d && d.toISOString().split('T')[0]));
    const totalSessions = uniqueDates.size;
    // Count attendance types
    const presentCount = await Attendance.count({
      where: { subjectId: subject.id, status: 'Present' }
    });
    const lateCount = await Attendance.count({
      where: { subjectId: subject.id, status: 'Late' }
    });
    const absentCount = await Attendance.count({
      where: { subjectId: subject.id, status: 'Absent' }
    });

    res.json({
      success: true,
      data: {
        subjectCode,
        totalSessions: totalSessions, // Valid dates from row 7
        presentCount,
        lateCount,
        absentCount,
        attendancePercentage: totalSessions > 0 ? ((presentCount + lateCount) / totalSessions * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get overall attendance statistics
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const totalStudents = await Student.count();
    const totalRecords = await Attendance.count();
    const presentCount = await Attendance.count({ where: { status: 'Present' } });
    const absentCount = await Attendance.count({ where: { status: 'Absent' } });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalRecords,
        presentCount,
        absentCount,
        presentPercentage: totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(2) : '0.00',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Search attendance by student email
exports.searchByEmail = async (req, res, next) => {
  try {
    const { email, date, page = 1, limit = 10 } = req.query;
    // Omitting ?email= reached Sequelize as `where: { email: undefined }`, which throws and
    // surfaced as a 500 rather than a 400.
    if (!email) {
      return res.status(400).json({ success: false, message: 'Query parameter "email" is required' });
    }
    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const offset = (page - 1) * limit;
    const where = { studentId: student.id };
    if (date) where.date = date;
    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [{ model: Student }, { model: Subject }],
      limit,
      offset,
      order: [['date', 'DESC']],
    });
    res.json({
      success: true,
      data: {
        student,
        attendance: rows,
        pagination: { total: count, pages: Math.ceil(count / limit), currentPage: page },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Filter attendance records
exports.filterAttendance = async (req, res, next) => {
  try {
    const { subjectCode, date, status, page = 1, limit = 10 } = req.query;
    const where = {};
    let subjectId = null;
    if (subjectCode) {
      const subject = await Subject.findOne({ where: { subjectCode } });
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }
      subjectId = subject.id;
    }
    if (subjectId) where.subjectId = subjectId;
    if (date) where.date = date;
    if (status) where.status = status;
    const offset = (page - 1) * limit;
    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [{ model: Student }, { model: Subject }],
      limit,
      offset,
      order: [['date', 'DESC']],
    });
    res.json({
      success: true,
      data: { records: rows, pagination: { total: count, pages: Math.ceil(count / limit), currentPage: page } },
    });
  } catch (error) {
    next(error);
  }
};

// Export attendance to Excel
exports.exportToExcelFile = async (req, res, next) => {
  try {
    const { subjectCode, date } = req.query;
    const where = {};
    if (subjectCode) {
      const subject = await Subject.findOne({ where: { subjectCode } });
      if (subject) where.subjectId = subject.id;
    }
    if (date) where.date = date;
    const data = await Attendance.findAll({ where, include: [{ model: Student }, { model: Subject }] });
    if (data.length === 0) {
      return res.status(404).json({ success: false, message: 'No records to export' });
    }
    const outputPath = path.join(__dirname, `../../exports/attendance_${Date.now()}.xlsx`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await exportToExcel(data, outputPath);
    res.download(outputPath, 'attendance.xlsx', () => { fs.unlink(outputPath, () => {}); });
  } catch (error) {
    next(error);
  }
};

// Student attendance percentage
exports.getStudentAttendancePercentage = async (req, res, next) => {
  try {
    const { email } = req.params;
    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const records = await Attendance.findAll({ where: { studentId: student.id }, include: [{ model: Subject }] });
    const subjectMap = {};
    records.forEach(rec => {
      const code = rec.Subject.subjectCode;
      if (!subjectMap[code]) subjectMap[code] = { total: 0, present: 0 };
      subjectMap[code].total++;
      if (rec.status === 'Present') subjectMap[code].present++;
    });
    const subjectWisePercentage = Object.entries(subjectMap).map(([code, d]) => ({
      subjectCode: code,
      attendancePercentage: ((d.present / d.total) * 100).toFixed(2),
      presentDays: d.present,
      totalDays: d.total,
    }));
    const overall = records.length > 0 ? ((records.filter(r => r.status === 'Present').length / records.length) * 100).toFixed(2) : '0.00';
    res.json({
      success: true,
      data: {
        studentName: student.name,
        email: student.email,
        overallAttendancePercentage: parseFloat(overall),
        subjectWisePercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Dashboard overview for today
exports.getDashboard = async (req, res, next) => {
  try {
    const Batch = require('../models/Batch');
    const Sheets = require('../models/Sheets');
    const Routine = require('../models/Routine');
    const Section = require('../models/Section');
    const SyncJob = require('../models/SyncJob');
    const Notification = require('../models/Notification');

    const today = new Date().toISOString().split('T')[0];
    const totalStudents = await Student.count();
    const totalSubjects = await Subject.count();
    const totalBatches = await Batch.count();
    const generatedReports = await Sheets.count();
    const presentToday = await Attendance.count({ where: { date: today, status: 'Present' } });
    const absentToday = await Attendance.count({ where: { date: today, status: 'Absent' } });

    // Build a unified activity feed from multiple sources. Each entry has a
    // human-readable title and timestamp; we merge and sort by recency.
    const activity = [];

    const recentSyncJobs = await SyncJob.findAll({
      where: { status: ['SUCCESS', 'FAILED', 'SKIPPED'] },
      order: [['endTime', 'DESC']],
      limit: 5,
    });
    for (const j of recentSyncJobs) {
      activity.push({
        id: `sync-${j.id}`,
        title: j.status === 'SUCCESS'
          ? `Sheet sync completed (${j.successCount || 0} records)`
          : j.status === 'SKIPPED' ? 'Sheet sync skipped (no new data)' : 'Sheet sync failed',
        timestamp: j.endTime || j.startTime || j.createdAt,
      });
    }

    const recentRoutines = await Routine.findAll({
      attributes: ['id', 'sectionId', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 3,
      include: [{ model: Section, attributes: ['name'], include: [{ model: Batch, attributes: ['abbreviation'] }] }],
    });
    // Group consecutive uploads (same createdAt minute → same upload) by section
    const routineBySection = new Map();
    for (const r of recentRoutines) {
      const key = r.sectionId;
      if (!routineBySection.has(key)) routineBySection.set(key, r);
    }
    for (const r of routineBySection.values()) {
      const batchAbbr = r.Section?.Batch?.abbreviation || '';
      const sec = r.Section?.name || '';
      activity.push({
        id: `routine-${r.id}`,
        title: `Routine uploaded for ${batchAbbr}${batchAbbr ? '/' : ''}${sec || 'a section'}`,
        timestamp: r.createdAt,
      });
    }

    const recentSheets = await Sheets.findAll({
      attributes: ['id', 'sheetName', 'createdAt', 'lastSuccessfulSyncTime'],
      order: [['createdAt', 'DESC']],
      limit: 3,
    });
    for (const s of recentSheets) {
      // sheetName is often a long Google Sheets URL — trim to a readable label.
      let label = s.sheetName || 'untitled sheet';
      if (/^https?:\/\//.test(label)) {
        const m = label.match(/\/d\/([^/]+)/);
        label = m ? `Google Sheet ${m[1].slice(0, 8)}…` : 'Google Sheet';
      } else if (label.length > 50) {
        label = label.slice(0, 47) + '…';
      }
      activity.push({
        id: `sheet-${s.id}`,
        title: `Sheet linked: ${label}`,
        timestamp: s.createdAt,
      });
    }

    const recentBroadcasts = await Notification.findAll({
      where: { targetUserId: null },
      order: [['createdAt', 'DESC']],
      limit: 3,
    });
    for (const n of recentBroadcasts) {
      activity.push({
        id: `notif-${n.id}`,
        title: n.title,
        timestamp: n.createdAt,
      });
    }

    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentLogs = activity.slice(0, 8);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const enrollmentTrend = await Student.findAll({
      attributes: [
        [Student.sequelize.fn('DATE_TRUNC', 'month', Student.sequelize.col('createdAt')), 'month'],
        [Student.sequelize.fn('COUNT', Student.sequelize.col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: sixMonthsAgo } },
      group: [Student.sequelize.fn('DATE_TRUNC', 'month', Student.sequelize.col('createdAt'))],
      order: [[Student.sequelize.fn('DATE_TRUNC', 'month', Student.sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    const subjectsByFaculty = await Student.findAll({
      attributes: [
        [Student.sequelize.col('Faculty.name'), 'faculty'],
        [Student.sequelize.fn('COUNT', Student.sequelize.col('Student.id')), 'count'],
      ],
      include: [{ model: Faculty, attributes: [] }],
      where: { facultyId: { [Op.ne]: null } },
      group: ['Faculty.name'],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalSubjects,
        totalBatches,
        generatedReports,
        presentToday,
        absentToday,
        markedToday: presentToday + absentToday,
        recentActivity: recentLogs,
        enrollmentTrend,
        subjectsByDepartment: subjectsByFaculty.map((row) => ({
          department: row.faculty || 'Unknown',
          count: parseInt(row.count, 10),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Add and sync a Google Sheet
exports.addSheet = async (req, res, next) => {
  try {
    const { url, batchId, sectionId } = req.body;
    if (!url || !batchId || !sectionId) {
      return res.status(400).json({ success: false, message: 'URL, batch, and section are required' });
    }

    // linkSheet now handles:
    // 1. Duplicate check
    // 2. Sheet creation
    // 3. First-time immediate sync (no background job)
    const result = await linkSheet(url, batchId, sectionId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

