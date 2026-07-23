const { Op, fn, col, literal } = require('sequelize');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Routine = require('../models/Routine');

const buildPagination = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
};

exports.getStudentDailyReport = async (req, res, next) => {
  try {
    const { studentId, date } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }
    const where = { studentId };
    if (date) where.date = date;
    const records = await Attendance.findAll({
      where,
      include: [
        { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
        { model: Student, attributes: ['id', 'name', 'email', 'regNum', 'faculty'] },
      ],
      order: [[Subject, 'subjectName', 'ASC']],
    });
    const student = records.length > 0 ? records[0].Student : await Student.findByPk(studentId, { attributes: ['id', 'name', 'email', 'regNum', 'faculty'] });
    res.json({
      success: true,
      data: {
        student,
        date,
        totalSubjects: records.length,
        present: records.filter(r => r.status === 'Present').length,
        absent: records.filter(r => r.status === 'Absent').length,
        late: records.filter(r => r.status === 'Late').length,
        attendance: records.map(r => ({
          id: r.id,
          subject: { code: r.Subject.subjectCode, name: r.Subject.subjectName },
          status: r.status,
          date: r.date,
        })),
      },
    });
  } catch (error) { next(error); }
};

exports.getStudentSubjectTimeReport = async (req, res, next) => {
  try {
    const { studentId, subjectId, date } = req.query;
    if (!studentId || !subjectId || !date) {
      return res.status(400).json({ success: false, message: 'studentId, subjectId, and date are required' });
    }
    const record = await Attendance.findOne({
      where: { studentId, subjectId, date },
      include: [
        { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
        { model: Student, attributes: ['id', 'name', 'email', 'regNum'] },
      ],
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'No attendance record found for the given criteria' });
    }
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

exports.getStudentSubjectWiseReport = async (req, res, next) => {
  try {
    const { studentId, subjectId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }
    const where = { studentId };
    if (subjectId) where.subjectId = subjectId;
    const records = await Attendance.findAll({
      where,
      include: [
        { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
        { model: Student, attributes: ['id', 'name', 'email', 'regNum'] },
      ],
      order: [[Subject, 'subjectName', 'ASC'], ['date', 'DESC']],
    });
    const subjectMap = {};
    records.forEach(r => {
      const subjId = r.subjectId;
      if (!subjectMap[subjId]) {
        subjectMap[subjId] = { subject: { id: subjId, code: r.Subject.subjectCode, name: r.Subject.subjectName }, total: 0, present: 0, absent: 0, late: 0, records: [] };
      }
      subjectMap[subjId].total++;
      subjectMap[subjId][r.status.toLowerCase()]++;
      subjectMap[subjId].records.push({ id: r.id, date: r.date, status: r.status });
    });
    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      attendancePercentage: s.total > 0 ? parseFloat(((s.present + s.late) / s.total * 100).toFixed(2)) : 0,
    }));
    const overall = {
      total: records.length,
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      late: records.filter(r => r.status === 'Late').length,
      attendancePercentage: records.length > 0 ? parseFloat((records.filter(r => r.status !== 'Absent').length / records.length * 100).toFixed(2)) : 0,
    };
    res.json({ success: true, data: { student: records.length > 0 ? records[0].Student : null, overall, subjects } });
  } catch (error) { next(error); }
};

exports.getStudentAggregateReport = async (req, res, next) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }
    const student = await Student.findByPk(studentId, {
      include: [{ model: Batch, attributes: ['id', 'name'] }, { model: Section, attributes: ['id', 'name'] }],
      attributes: ['id', 'name', 'email', 'regNum', 'univId', 'faculty'],
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const records = await Attendance.findAll({
      where: { studentId },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
      order: [['date', 'DESC']],
    });
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const overallPercentage = total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0;
    const subjectMap = {};
    records.forEach(r => {
      const subjId = r.subjectId;
      if (!subjectMap[subjId]) {
        subjectMap[subjId] = { subject: { id: subjId, code: r.Subject.subjectCode, name: r.Subject.subjectName }, total: 0, present: 0, absent: 0, late: 0 };
      }
      subjectMap[subjId].total++;
      subjectMap[subjId][r.status.toLowerCase()]++;
    });
    const subjectStats = Object.values(subjectMap).map(s => ({
      ...s,
      attendancePercentage: s.total > 0 ? parseFloat(((s.present + s.late) / s.total * 100).toFixed(2)) : 0,
      lowAttendance: s.total > 0 && ((s.present + s.late) / s.total * 100) < 80,
    }));
    const lowAttendanceSubjects = subjectStats.filter(s => s.lowAttendance);
    res.json({
      success: true,
      data: {
        student,
        overall: { total, present, absent, late, attendancePercentage: overallPercentage, lowAttendance: overallPercentage < 80 },
        subjectStats,
        lowAttendanceSubjects,
      },
    });
  } catch (error) { next(error); }
};

exports.getSectionWiseReport = async (req, res, next) => {
  try {
    const { sectionId, page = 1, limit = 50, search } = req.query;
    if (!sectionId) {
      return res.status(400).json({ success: false, message: 'sectionId is required' });
    }
    const section = await Section.findByPk(sectionId, { include: [{ model: Batch, attributes: ['id', 'name'] }] });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    const studentWhere = { sectionId };
    if (search) {
      studentWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { regNum: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: students } = await Student.findAndCountAll({
      where: studentWhere,
      attributes: ['id', 'name', 'email', 'regNum', 'faculty'],
      limit: l,
      offset,
      order: [['name', 'ASC']],
    });
    const subjects = await Subject.findAll({ attributes: ['id', 'subjectCode', 'subjectName'], order: [['subjectName', 'ASC']] });
    const studentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
    });
    const studentData = students.map(student => {
      const studentRecs = attendanceRecords.filter(r => r.studentId === student.id);
      const total = studentRecs.length;
      const present = studentRecs.filter(r => r.status === 'Present').length;
      const absent = studentRecs.filter(r => r.status === 'Absent').length;
      const late = studentRecs.filter(r => r.status === 'Late').length;
      const percentage = total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0;
      const subjectMap = {};
      subjects.forEach(subj => {
        const subjRecs = studentRecs.filter(r => r.subjectId === subj.id);
        if (subjRecs.length > 0) {
          subjectMap[subj.subjectCode] = {
            total: subjRecs.length,
            present: subjRecs.filter(r => r.status === 'Present').length,
            absent: subjRecs.filter(r => r.status === 'Absent').length,
            late: subjRecs.filter(r => r.status === 'Late').length,
            percentage: parseFloat((subjRecs.filter(r => r.status !== 'Absent').length / subjRecs.length * 100).toFixed(2)),
          };
        }
      });
      return {
        student: { id: student.id, name: student.name, email: student.email, regNum: student.regNum, faculty: student.faculty },
        overall: { total, present, absent, late, attendancePercentage: percentage, lowAttendance: percentage < 80 },
        subjectWise: subjectMap,
      };
    });
    res.json({
      success: true,
      data: { section: { id: section.id, name: section.name, batch: section.Batch }, subjects, studentData },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getBatchWiseReport = async (req, res, next) => {
  try {
    const { batchId, page = 1, limit = 50, search } = req.query;
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }
    const batch = await Batch.findByPk(batchId, { attributes: ['id', 'name'] });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    const sections = await Section.findAll({ where: { batchId }, attributes: ['id', 'name'] });
    const sectionIds = sections.map(s => s.id);
    const studentWhere = { sectionId: { [Op.in]: sectionIds } };
    if (search) {
      studentWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { regNum: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: students } = await Student.findAndCountAll({
      where: studentWhere,
      attributes: ['id', 'name', 'email', 'regNum', 'sectionId', 'faculty'],
      include: [{ model: Section, attributes: ['id', 'name'] }],
      limit: l,
      offset,
      order: [['name', 'ASC']],
    });
    const studentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
    });
    const studentData = students.map(student => {
      const recs = attendanceRecords.filter(r => r.studentId === student.id);
      const total = recs.length;
      const present = recs.filter(r => r.status === 'Present').length;
      const absent = recs.filter(r => r.status === 'Absent').length;
      const late = recs.filter(r => r.status === 'Late').length;
      const percentage = total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0;
      return {
        student: { id: student.id, name: student.name, email: student.email, regNum: student.regNum, faculty: student.faculty, section: student.Section?.name },
        overall: { total, present, absent, late, attendancePercentage: percentage, lowAttendance: percentage < 80},
      };
    });
    const sectionComparisons = sections.map(sec => {
      const secStudentIds = students.filter(s => s.sectionId === sec.id).map(s => s.id);
      const secRecs = attendanceRecords.filter(r => secStudentIds.includes(r.studentId));
      const secTotal = secRecs.length;
      const secPresent = secRecs.filter(r => r.status === 'Present').length;
      const secAbsent = secRecs.filter(r => r.status === 'Absent').length;
      const secLate = secRecs.filter(r => r.status === 'Late').length;
      return { section: sec.name, total: secTotal, present: secPresent, absent: secAbsent, late: secLate, percentage: secTotal > 0 ? parseFloat(((secPresent + secLate) / secTotal * 100).toFixed(2)) : 0, studentCount: secStudentIds.length };
    });
    res.json({
      success: true,
      data: { batch: { id: batch.id, name: batch.name }, sections: sections.map(s => ({ id: s.id, name: s.name })), studentData, sectionComparisons },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getSubjectWiseReport = async (req, res, next) => {
  try {
    const { subjectId, subjectCode, page = 1, limit = 50 } = req.query;
    if (!subjectId && !subjectCode) {
      return res.status(400).json({ success: false, message: 'subjectId or subjectCode is required' });
    }
    const where = subjectId ? { id: subjectId } : { subjectCode };
    const subject = await Subject.findOne({ where });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: attendanceRows } = await Attendance.findAndCountAll({
      where: { subjectId: subject.id },
      include: [{ model: Student, attributes: ['id', 'name', 'email', 'regNum', 'faculty', 'sectionId'], include: [{ model: Section, attributes: ['id', 'name'] }] }],
      limit: l,
      offset,
      order: [['date', 'DESC']],
    });
    const totalRecords = await Attendance.count({ where: { subjectId: subject.id } });
    const presentCount = await Attendance.count({ where: { subjectId: subject.id, status: 'Present' } });
    const absentCount = await Attendance.count({ where: { subjectId: subject.id, status: 'Absent' } });
    const lateCount = await Attendance.count({ where: { subjectId: subject.id, status: 'Late' } });
    const uniqueDates = await Attendance.findAll({ where: { subjectId: subject.id }, attributes: [[fn('DISTINCT', col('date')), 'date']], raw: true });
    res.json({
      success: true,
      data: {
        subject,
        summary: { totalRecords, presentCount, absentCount, lateCount, totalSessions: uniqueDates.length, attendancePercentage: totalRecords > 0 ? parseFloat(((presentCount + lateCount) / totalRecords * 100).toFixed(2)) : 0 },
        records: attendanceRows.map(r => ({
          id: r.id, date: r.date, status: r.status,
          student: { id: r.Student.id, name: r.Student.name, email: r.Student.email, regNum: r.Student.regNum, faculty: r.Student.faculty, section: r.Student.Section?.name },
        })),
      },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getFacultyWiseReport = async (req, res, next) => {
  try {
    const { faculty, page = 1, limit = 50 } = req.query;
    if (!faculty) {
      return res.status(400).json({ success: false, message: 'faculty is required' });
    }
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: students } = await Student.findAndCountAll({
      where: { faculty: { [Op.iLike]: `%${faculty}%` } },
      attributes: ['id', 'name', 'email', 'regNum', 'faculty'],
      limit: l,
      offset,
      order: [['name', 'ASC']],
    });
    const studentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
    });
    const studentData = students.map(student => {
      const recs = attendanceRecords.filter(r => r.studentId === student.id);
      const total = recs.length;
      const present = recs.filter(r => r.status === 'Present').length;
      const absent = recs.filter(r => r.status === 'Absent').length;
      const late = recs.filter(r => r.status === 'Late').length;
      return {
        student: { id: student.id, name: student.name, email: student.email, regNum: student.regNum, faculty: student.faculty },
        overall: { total, present, absent, late, attendancePercentage: total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0 },
      };
    });
    res.json({
      success: true,
      data: { faculty, studentData },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getDailySummaryReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];
    const totalRecords = await Attendance.count({ where: { date: reportDate } });
    const presentCount = await Attendance.count({ where: { date: reportDate, status: 'Present' } });
    const absentCount = await Attendance.count({ where: { date: reportDate, status: 'Absent' } });
    const lateCount = await Attendance.count({ where: { date: reportDate, status: 'Late' } });
    const subjectBreakdown = await Attendance.findAll({
      where: { date: reportDate },
      include: [{ model: Subject, attributes: ['subjectCode', 'subjectName'] }],
      attributes: ['subjectId', [fn('COUNT', col('Attendance.id')), 'total'], [fn('COUNT', literal("CASE WHEN status = 'Present' THEN 1 END")), 'present'], [fn('COUNT', literal("CASE WHEN status = 'Absent' THEN 1 END")), 'absent'], [fn('COUNT', literal("CASE WHEN status = 'Late' THEN 1 END")), 'late']],
      group: ['subjectId', 'Subject.id', 'Subject.subjectCode', 'Subject.subjectName'],
      raw: true,
    });
    const absentStudents = await Attendance.findAll({
      where: { date: reportDate, status: 'Absent' },
      include: [{ model: Student, attributes: ['id', 'name', 'email', 'regNum'] }, { model: Subject, attributes: ['subjectCode', 'subjectName'] }],
      attributes: ['id'],
      limit: 20,
    });
    res.json({
      success: true,
      data: {
        date: reportDate,
        summary: { totalRecords, presentCount, absentCount, lateCount, attendancePercentage: totalRecords > 0 ? parseFloat(((presentCount + lateCount) / totalRecords * 100).toFixed(2)) : 0 },
        subjectBreakdown: subjectBreakdown.map(s => ({
          subjectCode: s['Subject.subjectCode'], subjectName: s['Subject.subjectName'],
          total: parseInt(s.total, 10), present: parseInt(s.present, 10) || 0, absent: parseInt(s.absent, 10) || 0, late: parseInt(s.late, 10) || 0,
        })),
        absentStudents: absentStudents.map(r => ({ id: r.id, student: r.Student, subject: { code: r.Subject.subjectCode, name: r.Subject.subjectName } })),
      },
    });
  } catch (error) { next(error); }
};

exports.getMonthlyReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month, 10) || (new Date().getMonth() + 1);
    const y = parseInt(year, 10) || new Date().getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
    const records = await Attendance.findAll({
      where: { date: { [Op.between]: [startDate, endDate] } },
      include: [{ model: Subject, attributes: ['subjectCode', 'subjectName'] }],
    });
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const uniqueDates = [...new Set(records.map(r => r.date))].sort();
    const subjectMap = {};
    records.forEach(r => {
      const subjId = r.subjectId;
      if (!subjectMap[subjId]) {
        subjectMap[subjId] = { subject: { code: r.Subject.subjectCode, name: r.Subject.subjectName }, total: 0, present: 0, absent: 0, late: 0 };
      }
      subjectMap[subjId].total++;
      subjectMap[subjId][r.status.toLowerCase()]++;
    });
    const dailyTrend = uniqueDates.map(d => {
      const dayRecs = records.filter(r => r.date === d);
      return { date: d, total: dayRecs.length, present: dayRecs.filter(r => r.status === 'Present').length, absent: dayRecs.filter(r => r.status === 'Absent').length, late: dayRecs.filter(r => r.status === 'Late').length };
    });
    res.json({
      success: true,
      data: {
        month: m, year: y, startDate, endDate,
        summary: { total, present, absent, late, attendancePercentage: total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0, workingDays: uniqueDates.length },
        subjectBreakdown: Object.values(subjectMap),
        dailyTrend,
      },
    });
  } catch (error) { next(error); }
};

exports.getDateRangeReport = async (req, res, next) => {
  try {
    const { startDate, endDate, sectionId, batchId, page = 1, limit = 50 } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }
    const attendanceWhere = { date: { [Op.between]: [startDate, endDate] } };
    let studentIds = null;
    if (sectionId) {
      const students = await Student.findAll({ where: { sectionId }, attributes: ['id'] });
      studentIds = students.map(s => s.id);
    } else if (batchId) {
      const sections = await Section.findAll({ where: { batchId }, attributes: ['id'] });
      const sectionIds = sections.map(s => s.id);
      const students = await Student.findAll({ where: { sectionId: { [Op.in]: sectionIds } }, attributes: ['id'] });
      studentIds = students.map(s => s.id);
    }
    if (studentIds) attendanceWhere.studentId = { [Op.in]: studentIds };
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: records } = await Attendance.findAndCountAll({
      where: attendanceWhere,
      include: [
        { model: Student, attributes: ['id', 'name', 'email', 'regNum', 'faculty'] },
        { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
      ],
      limit: l,
      offset,
      order: [['date', 'DESC']],
    });
    const total = await Attendance.count({ where: attendanceWhere });
    const present = await Attendance.count({ where: { ...attendanceWhere, status: 'Present' } });
    const absent = await Attendance.count({ where: { ...attendanceWhere, status: 'Absent' } });
    const late = await Attendance.count({ where: { ...attendanceWhere, status: 'Late' } });
    res.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        summary: { total, present, absent, late, attendancePercentage: total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0 },
        records: records.map(r => ({
          id: r.id, date: r.date, status: r.status,
          student: { id: r.Student.id, name: r.Student.name, email: r.Student.email, regNum: r.Student.regNum, faculty: r.Student.faculty },
          subject: { id: r.Subject.id, code: r.Subject.subjectCode, name: r.Subject.subjectName },
        })),
      },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getLowAttendanceReport = async (req, res, next) => {
  try {
    const { threshold = 80, batchId, sectionId, page = 1, limit = 50 } = req.query;
    const minPercentage = parseFloat(threshold);
    const studentWhere = {};
    if (sectionId) studentWhere.sectionId = sectionId;
    else if (batchId) {
      const sections = await Section.findAll({ where: { batchId }, attributes: ['id'] });
      studentWhere.sectionId = { [Op.in]: sections.map(s => s.id) };
    }
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: students } = await Student.findAndCountAll({
      where: studentWhere,
      attributes: ['id', 'name', 'email', 'regNum', 'faculty'],
      include: [{ model: Section, attributes: ['id', 'name'] }],
      limit: l,
      offset,
      order: [['name', 'ASC']],
    });
    const studentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
    });
    const studentResults = students.map(student => {
      const recs = attendanceRecords.filter(r => r.studentId === student.id);
      const total = recs.length;
      const present = recs.filter(r => r.status === 'Present').length;
      const absent = recs.filter(r => r.status === 'Absent').length;
      const late = recs.filter(r => r.status === 'Late').length;
      const percentage = total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0;
      return {
        student: { id: student.id, name: student.name, email: student.email, regNum: student.regNum, faculty: student.faculty, section: student.Section?.name },
        overall: { total, present, absent, late, attendancePercentage: percentage, lowAttendance: percentage < minPercentage },
      };
    });
    const filtered = studentResults.filter(r => r.overall.lowAttendance).sort((a, b) => a.overall.attendancePercentage - b.overall.attendancePercentage);
    res.json({
      success: true,
      data: { threshold: minPercentage, students: filtered, totalLowAttendance: filtered.length, totalStudents: studentResults.length },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getTopPerformersReport = async (req, res, next) => {
  try {
    const { limit: lmt = 10, batchId, sectionId } = req.query;
    const maxStudents = Math.min(100, parseInt(lmt, 10) || 10);
    const studentWhere = {};
    if (sectionId) studentWhere.sectionId = sectionId;
    else if (batchId) {
      const sections = await Section.findAll({ where: { batchId }, attributes: ['id'] });
      studentWhere.sectionId = { [Op.in]: sections.map(s => s.id) };
    }
    const students = await Student.findAll({ where: studentWhere, attributes: ['id', 'name', 'email', 'regNum', 'faculty'], include: [{ model: Section, attributes: ['id', 'name'] }] });
    const studentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({ where: { studentId: { [Op.in]: studentIds } } });
    const results = students.map(student => {
      const recs = attendanceRecords.filter(r => r.studentId === student.id);
      const total = recs.length;
      if (total === 0) return null;
      const present = recs.filter(r => r.status === 'Present').length;
      const late = recs.filter(r => r.status === 'Late').length;
      const percentage = parseFloat(((present + late) / total * 100).toFixed(2));
      return { student: { id: student.id, name: student.name, email: student.email, regNum: student.regNum, faculty: student.faculty, section: student.Section?.name }, total, present, absent: recs.filter(r => r.status === 'Absent').length, late, attendancePercentage: percentage, rank: 0 };
    }).filter(Boolean).sort((a, b) => b.attendancePercentage - a.attendancePercentage).slice(0, maxStudents);
    results.forEach((r, i) => { r.rank = i + 1; });
    res.json({ success: true, data: { topPerformers: results, totalStudents: students.length } });
  } catch (error) { next(error); }
};

exports.getAbsentStudentsReport = async (req, res, next) => {
  try {
    const { date, subjectId, sectionId, page = 1, limit = 50 } = req.query;
    const where = { status: 'Absent' };
    if (date) where.date = date;
    if (subjectId) where.subjectId = subjectId;
    if (sectionId || subjectId) {
      const studentWhere = {};
      if (sectionId) studentWhere.sectionId = sectionId;
      const students = await Student.findAll({ where: studentWhere, attributes: ['id'] });
      where.studentId = { [Op.in]: students.map(s => s.id) };
    }
    const { page: p, limit: l, offset } = buildPagination(page, limit);
    const { count, rows: records } = await Attendance.findAndCountAll({
      where,
      include: [
        { model: Student, attributes: ['id', 'name', 'email', 'regNum', 'faculty'], include: [{ model: Section, attributes: ['id', 'name'] }] },
        { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
      ],
      limit: l,
      offset,
      order: [[Student, 'name', 'ASC']],
    });
    res.json({
      success: true,
      data: { date: date || null, subjectId: subjectId || null, records: records.map(r => ({ id: r.id, student: r.Student, subject: { id: r.Subject.id, code: r.Subject.subjectCode, name: r.Subject.subjectName } })) },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) { next(error); }
};

exports.getAttendanceLeaderboard = async (req, res, next) => {
  try {
    const { sectionId, batchId } = req.query;
    const studentWhere = {};
    if (sectionId) studentWhere.sectionId = sectionId;
    else if (batchId) {
      const sections = await Section.findAll({ where: { batchId }, attributes: ['id'] });
      studentWhere.sectionId = { [Op.in]: sections.map(s => s.id) };
    }
    const students = await Student.findAll({ where: studentWhere, attributes: ['id', 'name', 'email', 'regNum', 'faculty'], include: [{ model: Section, attributes: ['id', 'name'] }] });
    const studentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
    });
    const subjectMap = {};
    const subjects = await Subject.findAll({ attributes: ['id', 'subjectCode', 'subjectName'] });
    subjects.forEach(s => { subjectMap[s.id] = { code: s.subjectCode, name: s.subjectName }; });
    const results = students.map(student => {
      const recs = attendanceRecords.filter(r => r.studentId === student.id);
      const total = recs.length;
      if (total === 0) return null;
      const present = recs.filter(r => r.status === 'Present').length;
      const absent = recs.filter(r => r.status === 'Absent').length;
      const late = recs.filter(r => r.status === 'Late').length;
      const percentage = parseFloat(((present + late) / total * 100).toFixed(2));
      const subjectTotals = {};
      recs.forEach(r => {
        if (!subjectTotals[r.subjectId]) subjectTotals[r.subjectId] = { total: 0, present: 0 };
        subjectTotals[r.subjectId].total++;
        if (r.status !== 'Absent') subjectTotals[r.subjectId].present++;
      });
      return {
        student: { id: student.id, name: student.name, email: student.email, regNum: student.regNum, faculty: student.faculty, section: student.Section?.name },
        overall: { total, present, absent, late, attendancePercentage: percentage, lowAttendance: percentage < 80},
        subjectPerformance: Object.entries(subjectTotals).map(([subjId, data]) => ({
          subject: subjectMap[subjId] || { code: subjId, name: subjId },
          total: data.total, present: data.present, percentage: parseFloat((data.present / data.total * 100).toFixed(2)),
        })),
      };
    }).filter(Boolean).sort((a, b) => b.overall.attendancePercentage - a.overall.attendancePercentage);
    results.forEach((r, i) => { r['rank'] = i + 1; });
    const total = results.length;
    const top25 = results.filter((r, i) => i < Math.ceil(total * 0.25));
    const bottom25 = results.filter((r, i) => i >= total - Math.ceil(total * 0.25));
    res.json({
      success: true,
      data: { leaderboard: results, summary: { totalStudents: results.length, averageAttendance: results.length > 0 ? parseFloat((results.reduce((sum, r) => sum + r.overall.attendancePercentage, 0) / results.length).toFixed(2)) : 0, top25Average: top25.length > 0 ? parseFloat((top25.reduce((sum, r) => sum + r.overall.attendancePercentage, 0) / top25.length).toFixed(2)) : 0, bottom25Average: bottom25.length > 0 ? parseFloat((bottom25.reduce((sum, r) => sum + r.overall.attendancePercentage, 0) / bottom25.length).toFixed(2)) : 0 } },
    });
  } catch (error) { next(error); }
};

exports.getSectionComparisonReport = async (req, res, next) => {
  try {
    const { batchId } = req.query;
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }
    const batch = await Batch.findByPk(batchId, { attributes: ['id', 'name'] });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    const sections = await Section.findAll({ where: { batchId }, attributes: ['id', 'name'] });
    const sectionIds = sections.map(s => s.id);
    const students = await Student.findAll({ where: { sectionId: { [Op.in]: sectionIds } }, attributes: ['id', 'sectionId', 'name'] });
    const studentMap = {};
    sectionIds.forEach(id => { studentMap[id] = []; });
    students.forEach(s => { if (studentMap[s.sectionId]) studentMap[s.sectionId].push(s.id); });
    const allStudentIds = students.map(s => s.id);
    const attendanceRecords = await Attendance.findAll({ where: { studentId: { [Op.in]: allStudentIds } } });
    const sectionData = sections.map(sec => {
      const secStudentIds = studentMap[sec.id] || [];
      const recs = attendanceRecords.filter(r => secStudentIds.includes(r.studentId));
      const total = recs.length;
      const present = recs.filter(r => r.status === 'Present').length;
      const absent = recs.filter(r => r.status === 'Absent').length;
      const late = recs.filter(r => r.status === 'Late').length;
      return {
        section: { id: sec.id, name: sec.name },
        studentCount: secStudentIds.length,
        total, present, absent, late,
        attendancePercentage: total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0,
      };
    });
    res.json({ success: true, data: { batch: { id: batch.id, name: batch.name }, sections: sectionData } });
  } catch (error) { next(error); }
};

exports.getBatchComparisonReport = async (req, res, next) => {
  try {
    const batches = await Batch.findAll({ attributes: ['id', 'name'] });
    const result = [];
    for (const batch of batches) {
      const sections = await Section.findAll({ where: { batchId: batch.id }, attributes: ['id'] });
      const sectionIds = sections.map(s => s.id);
      if (sectionIds.length === 0) continue;
      const students = await Student.findAll({ where: { sectionId: { [Op.in]: sectionIds } }, attributes: ['id'] });
      if (students.length === 0) continue;
      const studentIds = students.map(s => s.id);
      const recs = await Attendance.findAll({ where: { studentId: { [Op.in]: studentIds } } });
      const total = recs.length;
      const present = recs.filter(r => r.status === 'Present').length;
      const absent = recs.filter(r => r.status === 'Absent').length;
      const late = recs.filter(r => r.status === 'Late').length;
      const uniqueDates = [...new Set(recs.map(r => r.date))];
      result.push({ batch: { id: batch.id, name: batch.name }, studentCount: students.length, total, present, absent, late, attendancePercentage: total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0, totalSessions: uniqueDates.length });
    }
    res.json({ success: true, data: { batches: result } });
  } catch (error) { next(error); }
};

exports.getTrendAnalytics = async (req, res, next) => {
  try {
    const { months = 6, batchId, sectionId } = req.query;
    const numMonths = Math.min(24, Math.max(1, parseInt(months, 10) || 6));
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);
    const startDateStr = startDate.toISOString().split('T')[0];
    const where = { date: { [Op.gte]: startDateStr } };
    if (sectionId) {
      const students = await Student.findAll({ where: { sectionId }, attributes: ['id'] });
      where.studentId = { [Op.in]: students.map(s => s.id) };
    } else if (batchId) {
      const sections = await Section.findAll({ where: { batchId }, attributes: ['id'] });
      const studentIds = await Student.findAll({ where: { sectionId: { [Op.in]: sections.map(s => s.id) } }, attributes: ['id'] });
      where.studentId = { [Op.in]: studentIds.map(s => s.id) };
    }
    const records = await Attendance.findAll({
      where,
      attributes: ['date', 'status', 'subjectId'],
      include: [{ model: Subject, attributes: ['subjectCode'] }],
    });
    const monthlyMap = {};
    records.forEach(r => {
      const key = r.date.substring(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, total: 0, present: 0, absent: 0, late: 0 };
      monthlyMap[key].total++;
      monthlyMap[key][r.status.toLowerCase()]++;
    });
    const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m, attendancePercentage: m.total > 0 ? parseFloat(((m.present + m.late) / m.total * 100).toFixed(2)) : 0,
    }));
    const subjectTotals = {};
    records.forEach(r => {
      const code = r.Subject?.subjectCode || 'Unknown';
      if (!subjectTotals[code]) subjectTotals[code] = { total: 0, present: 0, absent: 0, late: 0 };
      subjectTotals[code].total++;
      subjectTotals[code][r.status.toLowerCase()]++;
    });
    const subjectPerformance = Object.entries(subjectTotals).map(([code, data]) => ({
      subjectCode: code, ...data, attendancePercentage: data.total > 0 ? parseFloat(((data.present + data.late) / data.total * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    res.json({
      success: true,
      data: {
        period: { months: numMonths, startDate: startDateStr, endDate: new Date().toISOString().split('T')[0] },
        summary: { total, present, absent, late, attendancePercentage: total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0 },
        monthlyTrend,
        subjectPerformance,
      },
    });
  } catch (error) { next(error); }
};

const weeklyReportService = require('../services/weeklyReportService');

exports.runWeeklyReportNow = async (req, res, next) => {
  try {
    const result = await weeklyReportService.generateAllWeeklyReports();
    res.json({
      success: true,
      message: `Weekly reports generated for ${result.generated} students`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
