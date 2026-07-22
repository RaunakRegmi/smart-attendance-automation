const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const QRSession = require('../models/QRSession');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRequest = require('../models/AttendanceRequest');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Subject = require('../models/Subject');
const scopeService = require('../services/teacherScopeService');

const QR_TOKEN_EXPIRY = '5s';
const LATE_THRESHOLD_MINUTES = 5;

const generateQRToken = (sessionId) => {
  return jwt.sign({ sessionId, type: 'qr-attendance' }, process.env.JWT_SECRET, { expiresIn: QR_TOKEN_EXPIRY });
};

const resolveStudentRecord = async (userId) => {
  const student = await Student.findOne({ where: { userId } });
  if (!student) throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
  return student;
};

const resolveSessionWithOwnership = async (sessionId, teacherUserId) => {
  const session = await QRSession.findByPk(sessionId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'email'] },
    ],
  });
  if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  if (teacherUserId && session.createdBy !== teacherUserId) {
    throw Object.assign(new Error('Access denied. You do not own this session.'), { statusCode: 403 });
  }
  return session;
};

exports.createSession = async (req, res, next) => {
  try {
    const { sectionId, subjectId, classType, date } = req.body;

    if (!sectionId || !subjectId || !classType || !date) {
      return res.status(400).json({ success: false, message: 'sectionId, subjectId, classType, and date are required' });
    }

    const scope = await scopeService.getAssignedScope(req.user.id);
    if (!scope.hasPair(sectionId, subjectId)) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this class.' });
    }

    const now = new Date();
    const sessionId = require('crypto').randomUUID();
    const token = generateQRToken(sessionId);

    const session = await QRSession.create({
      id: sessionId,
      createdBy: req.user.id,
      sectionId,
      subjectId,
      classType,
      date,
      startTime: now,
      sessionToken: token,
      isActive: true,
      expiresAt: new Date(now.getTime() + 5000),
    });

    // Notify enrolled students about session start
    try {
      const enrolledStudents = await Student.findAll({
        where: { sectionId },
        attributes: ['userId'],
      });
      const subject = await Subject.findByPk(subjectId, { attributes: ['subjectCode', 'subjectName'] });
      const subjectLabel = subject ? `${subject.subjectCode} - ${subject.subjectName}` : 'Unknown Subject';
      const notifications = enrolledStudents
        .filter((s) => s.userId)
        .map((s) => ({
          targetUserId: s.userId,
          title: `Attendance Session Started`,
          message: `${classType} session for ${subjectLabel} started at ${now.toLocaleTimeString()}. Scan the QR code to mark attendance.`,
          type: 'info',
        }));
      if (notifications.length > 0) {
        await Notification.bulkCreate(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to send session start notifications:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'QR session created',
      data: {
        session: {
          id: session.id,
          sectionId: session.sectionId,
          subjectId: session.subjectId,
          classType: session.classType,
          date: session.date,
          startTime: session.startTime,
          isActive: session.isActive,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
        qrToken: {
          token,
          sessionId: session.id,
          expiresIn: 5,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshQR = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await resolveSessionWithOwnership(sessionId, req.user.id);

    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot refresh a closed session' });
    }

    const now = new Date();
    const token = generateQRToken(session.id);

    await session.update({
      sessionToken: token,
      expiresAt: new Date(now.getTime() + 5000),
    });

    res.json({
      success: true,
      message: 'QR token refreshed',
      data: {
        qrToken: {
          token,
          sessionId: session.id,
          expiresIn: 5,
        },
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

exports.closeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await resolveSessionWithOwnership(sessionId, req.user.id);

    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'Session is already closed' });
    }

    const now = new Date();
    await session.update({ isActive: false, endTime: now });

    const enrolledStudents = await Student.findAll({
      where: { sectionId: session.sectionId },
      attributes: ['id', 'userId'],
    });
    const enrolledIds = enrolledStudents.map((s) => s.id);

    if (enrolledIds.length > 0) {
      const existingScans = await AttendanceSession.findAll({
        where: { qrSessionId: session.id, studentId: { [Op.in]: enrolledIds } },
        attributes: ['studentId'],
      });
      const scannedIds = new Set(existingScans.map((r) => r.studentId));
      const absentIds = enrolledIds.filter((id) => !scannedIds.has(id));

      if (absentIds.length > 0) {
        await AttendanceSession.bulkCreate(
          absentIds.map((studentId) => ({
            qrSessionId: session.id,
            studentId,
            status: 'Absent',
            scannedAt: now,
            source: 'qr',
          }))
        );
      }

      // Notify enrolled students about session end
      try {
        const subject = await Subject.findByPk(session.subjectId, { attributes: ['subjectCode', 'subjectName'] });
        const subjectLabel = subject ? `${subject.subjectCode} - ${subject.subjectName}` : 'Unknown Subject';
        const notifications = enrolledStudents
          .filter((s) => s.userId)
          .map((s) => {
            const wasScanned = scannedIds.has(s.id);
            return {
              targetUserId: s.userId,
              title: `Attendance Session Closed`,
              message: wasScanned
                ? `${session.classType} session for ${subjectLabel} has been closed. Your attendance was recorded.`
                : `${session.classType} session for ${subjectLabel} has been closed. You did not scan the QR. You may submit a late request if needed.`,
              type: wasScanned ? 'info' : 'warning',
            };
          });
        if (notifications.length > 0) {
          await Notification.bulkCreate(notifications);
        }
      } catch (notifErr) {
        console.error('Failed to send session end notifications:', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Session closed',
      data: {
        session: {
          id: session.id,
          isActive: session.isActive,
          startTime: session.startTime,
          endTime: session.endTime,
        },
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const isAdmin = req.user.role === 'ADMIN';
    const session = await resolveSessionWithOwnership(sessionId, isAdmin ? null : req.user.id);

    const scans = await AttendanceSession.findAll({
      where: { qrSessionId: session.id },
      include: [{ model: Student, attributes: ['id', 'name', 'email', 'regNum', 'univId'] }],
      order: [['scannedAt', 'ASC']],
    });

    const grouped = { Present: [], Late: [], Absent: [] };
    for (const scan of scans) {
      grouped[scan.status].push({
        id: scan.id,
        student: scan.Student
          ? { id: scan.Student.id, name: scan.Student.name, email: scan.Student.email, regNum: scan.Student.regNum, univId: scan.Student.univId }
          : null,
        status: scan.status,
        scannedAt: scan.scannedAt,
        source: scan.source,
      });
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          sectionId: session.sectionId,
          subjectId: session.subjectId,
          classType: session.classType,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          isActive: session.isActive,
          expiresAt: session.expiresAt,
          creator: session.creator ? { id: session.creator.id, email: session.creator.email } : null,
          createdAt: session.createdAt,
        },
        scans: grouped,
        summary: {
          total: scans.length,
          present: grouped.Present.length,
          late: grouped.Late.length,
          absent: grouped.Absent.length,
        },
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

exports.getSessionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sectionId, subjectId, startDate, endDate } = req.query;
    const isAdmin = req.user.role === 'ADMIN';
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = {};
    if (!isAdmin) where.createdBy = req.user.id;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const { count, rows: sessions } = await QRSession.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email'] },
      ],
      order: [['date', 'DESC'], ['startTime', 'DESC']],
      limit: l,
      offset: (p - 1) * l,
    });

    const sessionIds = sessions.map((s) => s.id);
    const scanRecords = sessionIds.length
      ? await AttendanceSession.findAll({
          where: { qrSessionId: { [Op.in]: sessionIds } },
          attributes: ['qrSessionId', 'status'],
        })
      : [];

    const scanCounts = new Map();
    for (const r of scanRecords) {
      if (!scanCounts.has(r.qrSessionId)) {
        scanCounts.set(r.qrSessionId, { present: 0, late: 0, absent: 0 });
      }
      const key = r.status.toLowerCase();
      const entry = scanCounts.get(r.qrSessionId);
      if (entry[key] !== undefined) entry[key]++;
    }

    res.json({
      success: true,
      data: sessions.map((s) => {
        const counts = scanCounts.get(s.id) || { present: 0, late: 0, absent: 0 };
        return {
          id: s.id,
          sectionId: s.sectionId,
          subjectId: s.subjectId,
          classType: s.classType,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive,
          creator: s.creator ? { id: s.creator.id, email: s.creator.email } : null,
          createdAt: s.createdAt,
          summary: counts,
        };
      }),
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) {
    next(error);
  }
};

exports.scanAttendance = async (req, res, next) => {
  try {
    const { token, sessionId } = req.body;

    if (!token || !sessionId) {
      return res.status(400).json({ success: false, message: 'token and sessionId are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired QR token' });
    }

    if (decoded.sessionId !== sessionId || decoded.type !== 'qr-attendance') {
      return res.status(400).json({ success: false, message: 'Token does not match this session' });
    }

    const session = await QRSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'This session is no longer active' });
    }

    const student = await resolveStudentRecord(req.user.id);

    if (student.sectionId !== session.sectionId) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this section' });
    }

    const existing = await AttendanceSession.findOne({
      where: { qrSessionId: session.id, studentId: student.id },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Attendance already recorded for this session' });
    }

    const now = new Date();
    const sessionStart = new Date(session.startTime);
    const diffMinutes = (now - sessionStart) / (1000 * 60);
    const status = diffMinutes <= LATE_THRESHOLD_MINUTES ? 'Present' : 'Late';

    const record = await AttendanceSession.create({
      qrSessionId: session.id,
      studentId: student.id,
      status,
      scannedAt: now,
      source: 'qr',
    });

    res.status(201).json({
      success: true,
      message: `Attendance marked as ${status}`,
      data: {
        status: record.status,
        scannedAt: record.scannedAt,
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

exports.submitLateRequest = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ success: false, message: 'remarks is required' });
    }

    const session = await QRSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.isActive) {
      return res.status(400).json({ success: false, message: 'You can only submit late requests after the session is closed' });
    }

    const student = await resolveStudentRecord(req.user.id);

    if (student.sectionId !== session.sectionId) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this section' });
    }

    const existingRequest = await AttendanceRequest.findOne({
      where: { qrSessionId: session.id, studentId: student.id, status: 'pending' },
    });
    if (existingRequest) {
      return res.status(409).json({ success: false, message: 'You already have a pending late request for this session' });
    }

    const request = await AttendanceRequest.create({
      qrSessionId: session.id,
      studentId: student.id,
      remarks: remarks.trim(),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Late request submitted',
      data: {
        id: request.id,
        qrSessionId: request.qrSessionId,
        remarks: request.remarks,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

exports.getPendingRequests = async (req, res, next) => {
  try {
    const scope = await scopeService.getAssignedScope(req.user.id);
    const sessionIds = await QRSession.findAll({
      where: { createdBy: req.user.id },
      attributes: ['id'],
    }).then((sessions) => sessions.map((s) => s.id));

    if (!sessionIds.length) {
      return res.json({ success: true, data: [] });
    }

    const requests = await AttendanceRequest.findAll({
      where: { qrSessionId: { [Op.in]: sessionIds }, status: 'pending' },
      include: [
        { model: Student, attributes: ['id', 'name', 'email', 'regNum', 'univId'] },
        { model: QRSession, attributes: ['id', 'sectionId', 'subjectId', 'classType', 'date', 'startTime'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: requests.map((r) => ({
        id: r.id,
        remarks: r.remarks,
        status: r.status,
        createdAt: r.createdAt,
        student: r.Student
          ? { id: r.Student.id, name: r.Student.name, email: r.Student.email, regNum: r.Student.regNum, univId: r.Student.univId }
          : null,
        session: r.QRSession
          ? { id: r.QRSession.id, sectionId: r.QRSession.sectionId, subjectId: r.QRSession.subjectId, classType: r.QRSession.classType, date: r.QRSession.date, startTime: r.QRSession.startTime }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.decideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { decision, classType = 'Late' } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'approved' or 'rejected'" });
    }
    if (decision === 'approved' && !['Late', 'Absent'].includes(classType)) {
      return res.status(400).json({ success: false, message: "classType must be 'Late' or 'Absent' for approval" });
    }

    const request = await AttendanceRequest.findByPk(requestId, {
      include: [{ model: QRSession, attributes: ['id', 'createdBy'] }],
    });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been decided' });
    }
    if (request.QRSession.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own the session for this request.' });
    }

    const now = new Date();
    const resolvedStatus = decision === 'approved' ? classType : 'Absent';

    const existing = await AttendanceSession.findOne({
      where: { qrSessionId: request.qrSessionId, studentId: request.studentId },
    });
    if (existing) {
      await existing.update({ status: resolvedStatus, source: 'late-request', scannedAt: now });
    } else {
      await AttendanceSession.create({
        qrSessionId: request.qrSessionId,
        studentId: request.studentId,
        status: resolvedStatus,
        scannedAt: now,
        source: 'late-request',
      });
    }

    await request.update({
      status: decision,
      decidedBy: req.user.id,
      decidedAt: now,
    });

    res.json({
      success: true,
      message: `Request ${decision}`,
      data: {
        id: request.id,
        status: request.status,
        decidedAt: request.decidedAt,
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};
