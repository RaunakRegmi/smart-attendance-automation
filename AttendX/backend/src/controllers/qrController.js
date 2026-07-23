const crypto = require('crypto');
const QRCode = require('qrcode');
const QRSession = require('../models/QRSession');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const QR_EXPIRY_MINUTES = parseInt(process.env.QR_EXPIRY_MINUTES, 10) || 5;

exports.generateQR = async (req, res, next) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    await QRSession.update(
      { isActive: false },
      { where: { subjectId, date: today, isActive: true } }
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000);

    const session = await QRSession.create({
      token,
      subjectId,
      date: today,
      expiresAt,
      isActive: true,
      createdBy: req.user.id,
      scannedBy: [],
    });

    const qrPayload = JSON.stringify({ sessionId: session.id, token });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: { dark: '#1A3A5C', light: '#FFFFFF' },
    });

    res.json({
      success: true,
      message: 'QR code generated',
      data: {
        sessionId: session.id,
        qrImage: qrDataUrl,
        token,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        date: today,
        expiresAt: expiresAt.toISOString(),
        expiresInMinutes: QR_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.scanQR = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'QR token is required' });
    }

    const session = await QRSession.findOne({ where: { token, isActive: true } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid or expired QR code' });
    }

    if (new Date() > new Date(session.expiresAt)) {
      await session.update({ isActive: false });
      return res.status(410).json({ success: false, message: 'QR code has expired. Ask lecturer to generate a new one.' });
    }

    const student = await Student.findOne({ where: { userId: req.user.id } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const scannedBy = session.scannedBy || [];
    if (scannedBy.includes(student.id)) {
      return res.status(409).json({ success: false, message: 'You have already scanned this QR code' });
    }

    const today = session.date;
    const existing = await Attendance.findOne({
      where: { studentId: student.id, subjectId: session.subjectId, date: today },
    });
    if (existing) {
      await session.update({ scannedBy: [...scannedBy, student.id] });
      return res.status(409).json({ success: false, message: 'Attendance already marked for this session' });
    }

    await Attendance.create({
      studentId: student.id,
      subjectId: session.subjectId,
      date: today,
      status: 'Present',
    });

    await session.update({ scannedBy: [...scannedBy, student.id] });

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        subject: session.subjectId,
        date: today,
        status: 'Present',
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveSessions = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sessions = await QRSession.findAll({
      where: { date: today, isActive: true },
      include: [{ model: Subject, attributes: ['id', 'subjectCode', 'subjectName'] }],
      order: [['createdAt', 'DESC']],
    });

    const enriched = sessions.map((s) => {
      const isExpired = new Date() > new Date(s.expiresAt);
      return {
        id: s.id,
        subjectCode: s.Subject?.subjectCode,
        subjectName: s.Subject?.subjectName,
        date: s.date,
        expiresAt: s.expiresAt,
        isActive: s.isActive && !isExpired,
        scannedCount: (s.scannedBy || []).length,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

exports.deactivateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await QRSession.findByPk(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    await session.update({ isActive: false });
    res.json({ success: true, message: 'QR session deactivated' });
  } catch (error) {
    next(error);
  }
};
