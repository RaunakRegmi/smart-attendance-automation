const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const QRSession = require('../models/QRSession');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRequest = require('../models/AttendanceRequest');
const Student = require('../models/Student');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Notification = require('../models/Notification');
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
      { model: Section, attributes: ['id', 'name'] },
      { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
    ],
  });
  if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  if (teacherUserId && session.createdBy !== teacherUserId) {
    throw Object.assign(new Error('Access denied. You do not own this session.'), { statusCode: 403 });
  }
  return session;
};

const buildSessionResponse = async (session, token, tokenExpiresAt) => {
  const section = session.Section || await Section.findByPk(session.sectionId);
  const subject = session.Subject || await Subject.findByPk(session.subjectId);
  const batch = section ? await Batch.findByPk(section.batchId) : null;

  const enrolledStudents = await Student.findAll({
    where: { sectionId: session.sectionId },
    attributes: ['id'],
  });
  const enrolledIds = enrolledStudents.map((s) => s.id);

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  if (enrolledIds.length > 0) {
    const scans = await AttendanceSession.findAll({
      where: { qrSessionId: session.id },
      attributes: ['status'],
    });
    for (const s of scans) {
      if (s.status === 'Present') presentCount++;
      else if (s.status === 'Late') lateCount++;
      else if (s.status === 'Absent') absentCount++;
    }
  }

  return {
    id: session.id,
    sectionId: session.sectionId,
    sectionName: section?.name ?? null,
    batchName: batch?.name ?? null,
    subjectId: session.subjectId,
    subjectCode: subject?.subjectCode ?? null,
    subjectName: subject?.subjectName ?? null,
    classType: session.classType,
    date: session.date,
    status: session.isActive ? 'Active' : 'Closed',
    token: token ?? session.sessionToken,
    tokenExpiresAt: tokenExpiresAt ?? session.expiresAt?.toISOString(),
    totalStudents: enrolledIds.length,
    presentCount,
    lateCount,
    absentCount,
    createdAt: session.createdAt,
  };
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
    const tokenExpiresAt = new Date(now.getTime() + 5000);

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
      expiresAt: tokenExpiresAt,
    });

    // Reload with associations
    session.Section = await Section.findByPk(sectionId);
    session.Subject = await Subject.findByPk(subjectId);

    // Notify enrolled students about session start
    try {
      const enrolledStudents = await Student.findAll({
        where: { sectionId },
        attributes: ['userId'],
      });
      const subject = session.Subject;
      const subjectLabel = subject ? `${subject.subjectCode} - ${subject.subjectName}` : 'Unknown Subject';
      const notifications = enrolledStudents
        .filter((s) => s.userId)
        .map((s) => ({
          targetUserId: s.userId,
          title: `Attendance Session Started`,
          description: `${classType} session for ${subjectLabel} started at ${now.toLocaleTimeString()}. Scan the QR code to mark attendance.`,
          category: 'ATTENDANCE',
        }));
      if (notifications.length > 0) {
        await Notification.bulkCreate(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to send session start notifications:', notifErr.message);
    }

    const data = await buildSessionResponse(session, token, tokenExpiresAt.toISOString());

    res.status(201).json({ success: true, message: 'QR session created', data });
  } catch (error) {
    next(error);
  }
};

exports.refreshQR = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }
    const session = await resolveSessionWithOwnership(sessionId, req.user.id);

    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot refresh a closed session' });
    }

    const now = new Date();
    const token = generateQRToken(session.id);
    const tokenExpiresAt = new Date(now.getTime() + 5000);

    await session.update({
      sessionToken: token,
      expiresAt: tokenExpiresAt,
    });

    res.json({
      success: true,
      message: 'QR token refreshed',
      data: {
        token,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
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
              description: wasScanned
                ? `${session.classType} session for ${subjectLabel} has been closed. Your attendance was recorded.`
                : `${session.classType} session for ${subjectLabel} has been closed. You did not scan the QR. You may submit a late request if needed.`,
              category: 'ATTENDANCE',
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
        id: session.id,
        isActive: false,
        startTime: session.startTime,
        endTime: now,
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

    const section = await Section.findByPk(session.sectionId);
    const batch = section ? await Batch.findByPk(section.batchId) : null;
    const subject = await Subject.findByPk(session.subjectId);

    const scans = await AttendanceSession.findAll({
      where: { qrSessionId: session.id },
      include: [{ model: Student, attributes: ['id', 'name', 'email', 'regNum', 'univId'] }],
      order: [['scannedAt', 'ASC']],
    });

    const grouped = { Present: [], Late: [], Absent: [] };
    for (const scan of scans) {
      grouped[scan.status].push({
        id: scan.id,
        studentName: scan.Student?.name ?? 'Unknown',
        regNum: scan.Student?.regNum ?? null,
        univId: scan.Student?.univId ?? null,
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
          sectionName: section?.name ?? null,
          batchName: batch?.name ?? null,
          subjectId: session.subjectId,
          subjectCode: subject?.subjectCode ?? null,
          subjectName: subject?.subjectName ?? null,
          classType: session.classType,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.isActive ? 'Active' : 'Closed',
          presentCount: grouped.Present.length,
          lateCount: grouped.Late.length,
          absentCount: grouped.Absent.length,
          createdAt: session.createdAt,
        },
        scans: [
          ...grouped.Present,
          ...grouped.Late,
          ...grouped.Absent,
        ],
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
    if (sectionId && sectionId !== 'undefined' && sectionId !== 'null') where.sectionId = sectionId;
    if (subjectId && subjectId !== 'undefined' && subjectId !== 'null') where.subjectId = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const { count, rows: sessions } = await QRSession.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email'] },
        { model: Section, attributes: ['id', 'name'] },
        { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
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

    // Resolve batch names for each unique section
    const sectionIds = [...new Set(sessions.map((s) => s.sectionId))];
    const sectionMap = new Map();
    for (const sid of sectionIds) {
      const sec = await Section.findByPk(sid, { attributes: ['id', 'name', 'batchId'] });
      if (sec) {
        const batch = sec.batchId ? await Batch.findByPk(sec.batchId, { attributes: ['id', 'name'] }) : null;
        sectionMap.set(sid, { name: sec.name, batchName: batch?.name ?? null });
      }
    }

    res.json({
      success: true,
      data: sessions.map((s) => {
        const counts = scanCounts.get(s.id) || { present: 0, late: 0, absent: 0 };
        const secInfo = sectionMap.get(s.sectionId) || { name: null, batchName: null };
        return {
          id: s.id,
          sectionId: s.sectionId,
          sectionName: secInfo.name,
          batchName: secInfo.batchName,
          subjectId: s.subjectId,
          subjectCode: s.Subject?.subjectCode ?? null,
          subjectName: s.Subject?.subjectName ?? null,
          classType: s.classType,
          date: s.date,
          status: s.isActive ? 'Active' : 'Closed',
          totalStudents: 0,
          presentCount: counts.present,
          lateCount: counts.late,
          absentCount: counts.absent,
          createdAt: s.createdAt,
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
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const sessionIds = await QRSession.findAll({
      where: { createdBy: req.user.id },
      attributes: ['id'],
    }).then((sessions) => sessions.map((s) => s.id));

    if (!sessionIds.length) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: l, totalPages: 0 } });
    }

    const { count, rows: requests } = await AttendanceRequest.findAndCountAll({
      where: { qrSessionId: { [Op.in]: sessionIds }, status: 'pending' },
      include: [
        { model: Student, attributes: ['id', 'name', 'email', 'regNum', 'univId'] },
        {
          model: QRSession,
          attributes: ['id', 'sectionId', 'subjectId', 'classType', 'date', 'startTime'],
          include: [
            { model: Section, attributes: ['id', 'name'] },
            { model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: l,
      offset: (p - 1) * l,
    });

    res.json({
      success: true,
      data: requests.map((r) => ({
        id: r.id,
        remarks: r.remarks,
        status: 'Pending',
        createdAt: r.createdAt,
        studentName: r.Student?.name ?? 'Unknown',
        regNum: r.Student?.regNum ?? null,
        sessionDate: r.QRSession?.date ?? null,
        classType: r.QRSession?.classType ?? null,
        sectionName: r.QRSession?.Section?.name ?? null,
        subjectCode: r.QRSession?.Subject?.subjectCode ?? null,
      })),
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) {
    next(error);
  }
};

exports.decideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, resolvedStatus } = req.body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'Approved' or 'Rejected'" });
    }
    if (status === 'Approved' && (!resolvedStatus || !['Present', 'Late'].includes(resolvedStatus))) {
      return res.status(400).json({ success: false, message: "resolvedStatus must be 'Present' or 'Late' for approval" });
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
    const resolvedStatusFinal = status === 'Approved' ? resolvedStatus : 'Absent';

    const existing = await AttendanceSession.findOne({
      where: { qrSessionId: request.qrSessionId, studentId: request.studentId },
    });
    if (existing) {
      await existing.update({ status: resolvedStatusFinal, source: 'late-request', scannedAt: now });
    } else {
      await AttendanceSession.create({
        qrSessionId: request.qrSessionId,
        studentId: request.studentId,
        status: resolvedStatusFinal,
        scannedAt: now,
        source: 'late-request',
      });
    }

    await request.update({
      status: status.toLowerCase(),
      decidedBy: req.user.id,
      decidedAt: now,
    });

    res.json({
      success: true,
      message: `Request ${status.toLowerCase()}`,
      data: {
        id: request.id,
        status: status,
        decidedAt: now,
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};
