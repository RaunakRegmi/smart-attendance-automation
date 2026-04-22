const { Op } = require('sequelize');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { parseExcelFile, exportToExcel } = require('../utils/excelHandler');
const path = require('path');
const fs = require('fs');

exports.uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const records = parseExcelFile(req.file.path);
    const result = { success: 0, failed: 0, errors: [] };

    for (const record of records) {
      try {
        const [student] = await Student.findOrCreate({
          where: { email: record.email },
          defaults: { name: record.studentName },
        });

        const [subject] = await Subject.findOrCreate({
          where: { subjectCode: record.subjectCode },
          defaults: { subjectName: record.subjectCode },
        });

        await Attendance.upsert({
          studentId: student.id,
          subjectId: subject.id,
          date: record.date,
          status: record.status,
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          studentName: record.studentName,
          error: error.message,
        });
      }
    }

    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      message: 'Excel file processed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceStats = async (req, res, next) => {
  try {
    const totalStudents = await Student.count();
    const totalRecords = await Attendance.count();
    const presentCount = await Attendance.count({
      where: { status: 'Present' },
    });
    const absentCount = await Attendance.count({
      where: { status: 'Absent' },
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalRecords,
        presentCount,
        absentCount,
        presentPercentage: (presentCount / totalRecords * 100).toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.searchByEmail = async (req, res, next) => {
  try {
    const { email, date, page = 1, limit = 10 } = req.query;

    const student = await Student.findOne({ where: { email } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const offset = (page - 1) * limit;

    // Build where clause — date is optional
    const where = { studentId: student.id };
    if (date) where.date = date;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        { model: Student },
        { model: Subject },
      ],
      limit,
      offset,
      order: [['date', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        student,
        attendance: rows,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: page,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.filterAttendance = async (req, res, next) => {
  try {
    const { subjectCode, date, status, page = 1, limit = 10 } = req.query;
    const where = {};
    let subjectId = null;

    if (subjectCode) {
      const subject = await Subject.findOne({
        where: { subjectCode },
      });
      if (subject) subjectId = subject.id;
      else {
        return res.status(404).json({
          success: false,
          message: 'Subject not found',
        });
      }
    }

    if (subjectId) where.subjectId = subjectId;
    if (date) where.date = date;
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        { model: Student },
        { model: Subject },
      ],
      limit,
      offset,
      order: [['date', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        records: rows,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: page,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectAttendance = async (req, res, next) => {
  try {
    const { subjectCode } = req.params;

    const subject = await Subject.findOne({
      where: { subjectCode },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    const totalClasses = await Attendance.count({
      where: { subjectId: subject.id },
    });

    const presentCount = await Attendance.count({
      where: { subjectId: subject.id, status: 'Present' },
    });

    const attendancePercentage = totalClasses > 0
      ? (presentCount / totalClasses * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        subjectCode,
        totalClasses,
        presentCount,
        absentCount: totalClasses - presentCount,
        attendancePercentage: parseFloat(attendancePercentage),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportToExcelFile = async (req, res, next) => {
  try {
    const { subjectCode, date } = req.query;
    const where = {};

    if (subjectCode) {
      const subject = await Subject.findOne({
        where: { subjectCode },
      });
      if (subject) where.subjectId = subject.id;
    }

    if (date) where.date = date;

    const data = await Attendance.findAll({
      where,
      include: [
        { model: Student },
        { model: Subject },
      ],
    });

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No records found to export',
      });
    }

    const outputPath = path.join(__dirname, `../../exports/attendance_${Date.now()}.xlsx`);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await exportToExcel(data, outputPath);

    res.download(outputPath, 'attendance.xlsx', () => {
      fs.unlink(outputPath, () => {});
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentAttendancePercentage = async (req, res, next) => {
  try {
    const { email } = req.params;

    const student = await Student.findOne({ where: { email } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const records = await Attendance.findAll({
      where: { studentId: student.id },
      include: [{ model: Subject }],
    });

    const subjectMap = {};

    records.forEach(record => {
      const code = record.Subject.subjectCode;
      if (!subjectMap[code]) {
        subjectMap[code] = { total: 0, present: 0 };
      }
      subjectMap[code].total++;
      if (record.status === 'Present') {
        subjectMap[code].present++;
      }
    });

    const subjectWisePercentage = Object.entries(subjectMap).map(([code, data]) => ({
      subjectCode: code,
      attendancePercentage: (data.present / data.total * 100).toFixed(2),
      presentDays: data.present,
      totalDays: data.total,
    }));

    const totalPercentage = records.length > 0
      ? (records.filter(r => r.status === 'Present').length / records.length * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        studentName: student.name,
        email: student.email,
        overallAttendancePercentage: parseFloat(totalPercentage),
        subjectWisePercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalStudents = await Student.count();
    const presentToday = await Attendance.count({
      where: {
        date: today,
        status: 'Present',
      },
    });
    const absentToday = await Attendance.count({
      where: {
        date: today,
        status: 'Absent',
      },
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        presentToday,
        absentToday,
        markedToday: presentToday + absentToday,
      },
    });
  } catch (error) {
    next(error);
  }
};