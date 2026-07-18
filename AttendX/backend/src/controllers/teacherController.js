const { Op } = require('sequelize');
const User = require('../models/User');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const scopeService = require('../services/teacherScopeService');
const messagingService = require('../services/messagingService');
const { logAuditEvent } = require('../services/auditEventService');

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const scope = await scopeService.getAssignedScope(req.user.id);

    const now = new Date();
    const today = dayNames[now.getDay()];
    const currentTime = now.toTimeString().split(' ')[0];
    const { classes, unresolvedRoutines } = await scopeService.resolveRoutinesForScope(scope, today);
    const todayClasses = classes.map((c) => {
      let status = 'UPCOMING';
      if (currentTime >= c.startTime && currentTime <= c.endTime) status = 'ONGOING';
      else if (currentTime > c.endTime) status = 'COMPLETED';
      return { ...c, status };
    });

    const studentsTaught = scope.sectionIds.length
      ? await Student.count({ where: { sectionId: { [Op.in]: scope.sectionIds } } })
      : 0;
    const atRisk = await scopeService.getAtRiskStudents(scope);
    const uniqueAtRiskStudents = new Set(atRisk.map((r) => r.student.id)).size;

    const unreadMessages = await messagingService.getUnreadCount(req.user.id);
    const notifications = await messagingService.getNotificationsForUser(req.user.id, { limit: 5 });
    const names = await messagingService.resolveDisplayNames([req.user.id]);

    res.json({
      success: true,
      data: {
        teacher: {
          id: user.id,
          email: user.email,
          name: names.get(user.id)?.name || user.email.split('@')[0],
          mustChangePassword: user.mustChangePassword,
        },
        todayClasses,
        // Routine rows in assigned sections whose free-text subjectCode matched
        // no subject — surfaced, never silently dropped.
        unresolvedRoutines,
        stats: {
          sections: scope.sectionIds.length,
          subjects: scope.subjectIds.length,
          classes: scope.assignments.length,
          studentsTaught,
          atRiskCount: uniqueAtRiskStudents,
        },
        messages: { unreadCount: unreadMessages },
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getClasses = async (req, res, next) => {
  try {
    const scope = await scopeService.getAssignedScope(req.user.id);
    const classes = [];
    for (const assignment of scope.assignments) {
      const roster = await scopeService.getRosterWithStats(assignment.sectionId, assignment.subjectId);
      const graded = roster.filter((s) => s.attendance.total > 0);
      const avg = graded.length
        ? parseFloat((graded.reduce((sum, s) => sum + s.attendance.percentage, 0) / graded.length).toFixed(1))
        : 0;
      classes.push({
        assignmentId: assignment.id,
        sectionId: assignment.sectionId,
        sectionName: assignment.Section?.name || null,
        batchName: assignment.Section?.Batch?.name || null,
        subjectId: assignment.subjectId,
        subjectCode: assignment.Subject?.subjectCode || null,
        subjectName: assignment.Subject?.subjectName || null,
        studentCount: roster.length,
        averageAttendance: avg,
        atRiskCount: roster.filter((s) => s.attendance.atRisk).length,
      });
    }
    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
};

exports.getClassRoster = async (req, res, next) => {
  try {
    const { sectionId, subjectId } = req.params;
    const scope = await scopeService.getAssignedScope(req.user.id);
    if (!scope.hasPair(sectionId, subjectId)) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this class.' });
    }
    const assignment = scope.assignments.find(
      (a) => a.sectionId === sectionId && a.subjectId === Number(subjectId)
    );
    const students = await scopeService.getRosterWithStats(sectionId, Number(subjectId));
    res.json({
      success: true,
      data: {
        section: {
          id: sectionId,
          name: assignment?.Section?.name || null,
          batchName: assignment?.Section?.Batch?.name || null,
        },
        subject: {
          id: Number(subjectId),
          subjectCode: assignment?.Subject?.subjectCode || null,
          subjectName: assignment?.Subject?.subjectName || null,
        },
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Read-only in v1: attendance originates from the Google Sheets sync / Excel
// upload pipeline. See markAttendance below for the future-scope write stub.
exports.getAttendance = async (req, res, next) => {
  try {
    const { sectionId, subjectId, date, startDate, endDate, page = 1, limit = 50 } = req.query;
    if (!sectionId || !subjectId) {
      return res.status(400).json({ success: false, message: 'sectionId and subjectId are required' });
    }
    const scope = await scopeService.getAssignedScope(req.user.id);
    if (!scope.hasPair(sectionId, subjectId)) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this class.' });
    }
    const students = await Student.findAll({ where: { sectionId }, attributes: ['id'] });
    const studentIds = students.map((s) => s.id);
    const where = { subjectId: Number(subjectId), studentId: { [Op.in]: studentIds } };
    if (date) where.date = date;
    else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [{ model: Student, attributes: ['id', 'name', 'regNum', 'univId'] }],
      order: [['date', 'DESC'], [Student, 'name', 'ASC']],
      limit: l,
      offset: (p - 1) * l,
    });
    const total = await Attendance.count({ where });
    const present = await Attendance.count({ where: { ...where, status: 'Present' } });
    const absent = await Attendance.count({ where: { ...where, status: 'Absent' } });
    const late = await Attendance.count({ where: { ...where, status: 'Late' } });
    res.json({
      success: true,
      data: {
        summary: {
          total,
          present,
          absent,
          late,
          attendancePercentage: total > 0 ? parseFloat((((present + late) / total) * 100).toFixed(2)) : 0,
        },
        records: rows.map((r) => ({
          id: r.id,
          date: r.date,
          status: r.status,
          student: { id: r.Student.id, name: r.Student.name, regNum: r.Student.regNum, univId: r.Student.univId },
        })),
        readOnly: true,
      },
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) {
    next(error);
  }
};

// FUTURE SCOPE (deliberate stub, do not remove): in-app attendance marking is
// not part of v1 — attendance stays sourced from the Sheets sync pipeline,
// which would overwrite direct DB writes on its next run. When this becomes a
// real feature it needs a decision on write-through vs. sync reconciliation.
exports.markAttendance = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      'Attendance marking from the teacher portal is not available yet. Attendance is managed through the existing sheet sync pipeline; this endpoint is a reserved extension point.',
  });
};

exports.getReports = async (req, res, next) => {
  try {
    const { subjectId, sectionId } = req.query;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }
    const scope = await scopeService.getAssignedScope(req.user.id);
    if (!scope.hasSubject(subjectId)) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this subject.' });
    }
    if (sectionId && !scope.hasPair(sectionId, subjectId)) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this class.' });
    }
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    // Only the teacher's assigned sections for this subject — same report shape
    // as the admin subject report, scoped down.
    const sectionIds = sectionId
      ? [sectionId]
      : scope.assignments
          .filter((a) => a.subjectId === Number(subjectId))
          .map((a) => a.sectionId);
    const sections = scope.assignments
      .filter((a) => sectionIds.includes(a.sectionId) && a.subjectId === Number(subjectId))
      .map((a) => ({ id: a.sectionId, name: a.Section?.name || null, batchName: a.Section?.Batch?.name || null }));

    const students = await Student.findAll({
      where: { sectionId: { [Op.in]: sectionIds } },
      attributes: ['id', 'name', 'email', 'regNum', 'univId', 'sectionId'],
      order: [['name', 'ASC']],
    });
    const studentIds = students.map((s) => s.id);
    const records = studentIds.length
      ? await Attendance.findAll({
          where: { subjectId: Number(subjectId), studentId: { [Op.in]: studentIds } },
          attributes: ['studentId', 'status', 'date'],
        })
      : [];
    const byStudent = new Map();
    for (const r of records) {
      if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, { total: 0, present: 0, absent: 0, late: 0 });
      const s = byStudent.get(r.studentId);
      s.total++;
      s[r.status.toLowerCase()]++;
    }
    const studentRows = students.map((student) => {
      const s = byStudent.get(student.id) || { total: 0, present: 0, absent: 0, late: 0 };
      const percentage = s.total > 0 ? parseFloat((((s.present + s.late) / s.total) * 100).toFixed(2)) : 0;
      return {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          regNum: student.regNum,
          univId: student.univId,
          sectionId: student.sectionId,
        },
        total: s.total,
        present: s.present,
        absent: s.absent,
        late: s.late,
        attendancePercentage: percentage,
        lowAttendance: s.total > 0 && percentage < scopeService.AT_RISK_THRESHOLD,
      };
    });
    const totalRecords = records.length;
    const presentCount = records.filter((r) => r.status === 'Present').length;
    const absentCount = records.filter((r) => r.status === 'Absent').length;
    const lateCount = records.filter((r) => r.status === 'Late').length;
    const uniqueDates = [...new Set(records.map((r) => r.date))];
    res.json({
      success: true,
      data: {
        subject: { id: subject.id, subjectCode: subject.subjectCode, subjectName: subject.subjectName },
        sections,
        summary: {
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          totalSessions: uniqueDates.length,
          attendancePercentage:
            totalRecords > 0 ? parseFloat((((presentCount + lateCount) / totalRecords) * 100).toFixed(2)) : 0,
        },
        students: studentRows,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAtRisk = async (req, res, next) => {
  try {
    const threshold = Math.min(100, Math.max(1, parseFloat(req.query.threshold) || scopeService.AT_RISK_THRESHOLD));
    const scope = await scopeService.getAssignedScope(req.user.id);
    const students = await scopeService.getAtRiskStudents(scope, threshold);
    res.json({
      success: true,
      data: {
        threshold,
        totalAtRisk: students.length,
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const notifications = await messagingService.getNotificationsForUser(req.user.id, { limit });
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const lecturer = await Lecturer.findOne({ where: { userId: user.id } });
    const scope = await scopeService.getAssignedScope(req.user.id);
    res.json({
      success: true,
      data: {
        user,
        lecturer: lecturer
          ? { id: lecturer.id, name: lecturer.name, email: lecturer.email, contact: lecturer.contact }
          : null,
        // Assignments are read-only here — set by admins.
        assignments: scope.assignments.map((a) => ({
          id: a.id,
          sectionId: a.sectionId,
          sectionName: a.Section?.name || null,
          batchName: a.Section?.Batch?.name || null,
          subjectId: a.subjectId,
          subjectCode: a.Subject?.subjectCode || null,
          subjectName: a.Subject?.subjectName || null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Limited fields: display name and contact live on the linked lecturer record.
// Email/role/assignments are admin-managed.
exports.updateProfile = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findOne({ where: { userId: req.user.id } });
    if (!lecturer) {
      return res.status(400).json({
        success: false,
        message: 'No linked lecturer record to update. Ask an admin to link your account to a lecturer profile.',
      });
    }
    const updates = {};
    if (req.body.name !== undefined) {
      if (!req.body.name || String(req.body.name).length > 100) {
        return res.status(400).json({ success: false, message: 'Name must be 1-100 characters' });
      }
      updates.name = String(req.body.name);
    }
    if (req.body.contact !== undefined) {
      if (req.body.contact && !/^[0-9+\- ]{0,30}$/.test(req.body.contact)) {
        return res.status(400).json({ success: false, message: 'Only numbers, +, - and spaces allowed in contact' });
      }
      updates.contact = req.body.contact || null;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }
    await lecturer.update(updates);
    await logAuditEvent(req, 'teacher.profile_updated', { lecturerId: lecturer.id, updates });
    res.json({ success: true, message: 'Profile updated', data: { lecturer } });
  } catch (error) {
    next(error);
  }
};
