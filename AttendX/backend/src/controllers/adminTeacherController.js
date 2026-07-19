const { Op } = require('sequelize');
const User = require('../models/User');
const Lecturer = require('../models/Lecturer');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const TeacherAssignment = require('../models/TeacherAssignment');
const MessageThread = require('../models/MessageThread');
const messagingService = require('../services/messagingService');
const { logAuditEvent } = require('../services/auditEventService');
const credentialDeliveryService = require('../services/credentialDeliveryService');
const { normalizeNepaliMobile } = require('../services/smsService');

const VALID_CHANNELS = ['email', 'sms'];

const validateChannels = (deliveryChannels) => {
  if (deliveryChannels === undefined) return { channels: [] };
  if (!Array.isArray(deliveryChannels) || deliveryChannels.some((c) => !VALID_CHANNELS.includes(String(c).toLowerCase()))) {
    return { error: "deliveryChannels must be an array containing only 'email' and/or 'sms'" };
  }
  return { channels: deliveryChannels.map((c) => String(c).toLowerCase()) };
};

// ── Teacher accounts ─────────────────────────────────────────────────────────

exports.getTeachers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const where = { role: 'TEACHER' };
    if (search) {
      where.email = { [Op.iLike]: `%${search}%` };
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: l,
      offset: (p - 1) * l,
    });
    const ids = rows.map((u) => u.id);
    const lecturers = ids.length
      ? await Lecturer.findAll({ where: { userId: { [Op.in]: ids } } })
      : [];
    const lecturerByUser = new Map(lecturers.map((lec) => [lec.userId, lec]));
    const assignmentCounts = ids.length
      ? await TeacherAssignment.findAll({
          where: { teacherUserId: { [Op.in]: ids }, isActive: true },
          attributes: ['teacherUserId'],
        })
      : [];
    const countByUser = new Map();
    for (const a of assignmentCounts) {
      countByUser.set(a.teacherUserId, (countByUser.get(a.teacherUserId) || 0) + 1);
    }
    res.json({
      success: true,
      data: rows.map((u) => {
        const lecturer = lecturerByUser.get(u.id);
        return {
          id: u.id,
          email: u.email,
          phone: u.phone || null,
          address: u.address || null,
          isActive: u.isActive,
          mustChangePassword: u.mustChangePassword,
          createdAt: u.createdAt,
          name: lecturer?.name || u.email.split('@')[0],
          lecturer: lecturer
            ? { id: lecturer.id, name: lecturer.name, contact: lecturer.contact }
            : null,
          assignmentCount: countByUser.get(u.id) || 0,
        };
      }),
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) {
    next(error);
  }
};

// Create a teacher login. Optionally link an existing lecturer record
// (explicit admin action — never auto-matched by email), or create a fresh
// lecturer record when a display name is supplied. When deliveryChannels are
// given, the credentials (login URL, temp password, reset link) are sent via
// email and/or SMS — delivery is decoupled from creation, so a failed send
// never rolls back the account.
// NOTE: email stays required — login is email-based and users.email is NOT
// NULL, so a phone-only account could never sign in. Phone is a delivery
// channel, not an identity.
exports.createTeacher = async (req, res, next) => {
  try {
    const { email, name, lecturerId, address, deliveryChannels } = req.body;
    // The addendum spec calls this defaultPassword; the original API used
    // password. Accept both, preferring defaultPassword.
    const password = req.body.defaultPassword ?? req.body.password;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const { channels, error: channelError } = validateChannels(deliveryChannels);
    if (channelError) {
      return res.status(400).json({ success: false, message: channelError });
    }

    let phone = null;
    if (req.body.phone) {
      phone = normalizeNepaliMobile(req.body.phone);
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Invalid Nepali mobile number (expected 96/97/98XXXXXXXX, +977 optional)' });
      }
    }

    // Duplicate guards: reject clearly, never silently create a duplicate.
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }
    if (phone) {
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'A user with this phone number already exists' });
      }
    }

    let lecturer = null;
    if (lecturerId) {
      lecturer = await Lecturer.findByPk(lecturerId);
      if (!lecturer) {
        return res.status(404).json({ success: false, message: 'Lecturer record not found' });
      }
      if (lecturer.userId) {
        return res.status(409).json({ success: false, message: 'This lecturer is already linked to a login account' });
      }
    }

    const user = await User.create({
      email,
      password,
      role: 'TEACHER',
      isActive: true,
      mustChangePassword: true,
      phone,
      address: address || null,
    });

    if (lecturer) {
      await lecturer.update({ userId: user.id });
      await logAuditEvent(req, 'teacher.lecturer_linked', { teacherUserId: user.id, lecturerId: lecturer.id });
    } else if (name) {
      lecturer = await Lecturer.create({ name, email, userId: user.id });
      await logAuditEvent(req, 'teacher.lecturer_linked', {
        teacherUserId: user.id,
        lecturerId: lecturer.id,
        createdLecturer: true,
      });
    }

    await logAuditEvent(req, 'teacher.created', { teacherUserId: user.id, email, lecturerId: lecturer?.id || null });

    // Credential delivery (decoupled: the account exists regardless of what
    // happens here; per-channel status is reported back to the admin).
    let delivery = null;
    if (channels.length) {
      const sent = await credentialDeliveryService.deliverCredentials({
        user,
        name: name || lecturer?.name || email.split('@')[0],
        tempPassword: password,
        channels,
      });
      delivery = sent.delivery;
      await logAuditEvent(req, 'teacher.credentials_sent', {
        teacherUserId: user.id,
        channels,
        email: { attempted: delivery.email.attempted, ok: delivery.email.ok },
        sms: { attempted: delivery.sms.attempted, ok: delivery.sms.ok },
      });
    }

    const userResponse = user.get();
    delete userResponse.password;
    res.status(201).json({
      success: true,
      message: 'Teacher account created',
      data: {
        user: userResponse,
        lecturer: lecturer ? { id: lecturer.id, name: lecturer.name, contact: lecturer.contact } : null,
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Regenerate a reset token and re-send credentials — for a failed first send
// or a teacher who lost the message. The stored password hash cannot be
// recovered, so: with newTempPassword the password is reset (and included in
// the message, mustChangePassword set); without it the message carries the
// reset link only.
exports.resendCredentials = async (req, res, next) => {
  try {
    const user = await findTeacher(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    if (!user.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot send credentials to a deactivated teacher' });
    }
    const { channels, error: channelError } = validateChannels(req.body.deliveryChannels ?? req.body.channels);
    if (channelError) {
      return res.status(400).json({ success: false, message: channelError });
    }
    if (!channels.length) {
      return res.status(400).json({ success: false, message: 'Select at least one delivery channel (email/sms)' });
    }

    const { newTempPassword } = req.body;
    if (newTempPassword !== undefined) {
      if (!newTempPassword || newTempPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New temporary password must be at least 6 characters' });
      }
      await user.update({ password: newTempPassword, mustChangePassword: true });
    }

    const lecturer = await Lecturer.findOne({ where: { userId: user.id } });
    const { delivery } = await credentialDeliveryService.deliverCredentials({
      user,
      name: lecturer?.name || user.email.split('@')[0],
      tempPassword: newTempPassword || null,
      channels,
    });
    await logAuditEvent(req, 'teacher.credentials_resent', {
      teacherUserId: user.id,
      channels,
      passwordReset: newTempPassword !== undefined,
      email: { attempted: delivery.email.attempted, ok: delivery.email.ok },
      sms: { attempted: delivery.sms.attempted, ok: delivery.sms.ok },
    });
    res.json({ success: true, message: 'Credentials sent', data: { delivery } });
  } catch (error) {
    next(error);
  }
};

const findTeacher = async (id) => {
  const user = await User.findByPk(id);
  if (!user || user.role !== 'TEACHER') return null;
  return user;
};

exports.updateTeacher = async (req, res, next) => {
  try {
    const user = await findTeacher(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    const { email, password, isActive, lecturerId } = req.body;
    const updates = {};
    if (email !== undefined && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      updates.email = email;
    }
    if (password !== undefined) {
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      updates.password = password;
      updates.mustChangePassword = true; // admin reset → force change on next login
    }
    if (isActive !== undefined) updates.isActive = isActive;
    await user.update(updates);

    if (lecturerId !== undefined) {
      const current = await Lecturer.findOne({ where: { userId: user.id } });
      if (lecturerId === null) {
        if (current) await current.update({ userId: null });
      } else {
        const lecturer = await Lecturer.findByPk(lecturerId);
        if (!lecturer) {
          return res.status(404).json({ success: false, message: 'Lecturer record not found' });
        }
        if (lecturer.userId && lecturer.userId !== user.id) {
          return res.status(409).json({ success: false, message: 'This lecturer is already linked to another login account' });
        }
        if (current && current.id !== lecturer.id) await current.update({ userId: null });
        await lecturer.update({ userId: user.id });
        await logAuditEvent(req, 'teacher.lecturer_linked', { teacherUserId: user.id, lecturerId: lecturer.id });
      }
    }

    if (isActive === false) {
      // Kill outstanding sessions on deactivation.
      await user.increment('tokenVersion');
      await logAuditEvent(req, 'teacher.deactivated', { teacherUserId: user.id });
    } else {
      await logAuditEvent(req, 'teacher.updated', {
        teacherUserId: user.id,
        fields: Object.keys(updates).filter((k) => k !== 'password'),
        passwordReset: password !== undefined,
      });
    }

    const userResponse = user.get();
    delete userResponse.password;
    res.json({ success: true, message: 'Teacher updated', data: userResponse });
  } catch (error) {
    next(error);
  }
};

// Deactivate, never hard-delete — assignment/messaging history must survive.
exports.deactivateTeacher = async (req, res, next) => {
  try {
    const user = await findTeacher(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    await user.update({ isActive: false });
    await user.increment('tokenVersion');
    await logAuditEvent(req, 'teacher.deactivated', { teacherUserId: user.id });
    res.json({ success: true, message: 'Teacher deactivated' });
  } catch (error) {
    next(error);
  }
};

// ── Class assignments (what powers all teacher scoping) ─────────────────────

exports.getAssignments = async (req, res, next) => {
  try {
    const user = await findTeacher(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    const assignments = await TeacherAssignment.findAll({
      where: { teacherUserId: user.id, isActive: true },
      include: [{ model: Section, include: [{ model: Batch }] }, { model: Subject }],
      order: [['createdAt', 'ASC']],
    });
    res.json({
      success: true,
      data: assignments.map((a) => ({
        id: a.id,
        sectionId: a.sectionId,
        sectionName: a.Section?.name || null,
        batchName: a.Section?.Batch?.name || null,
        subjectId: a.subjectId,
        subjectCode: a.Subject?.subjectCode || null,
        subjectName: a.Subject?.subjectName || null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.addAssignment = async (req, res, next) => {
  try {
    const user = await findTeacher(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    const { sectionId, subjectId } = req.body;
    if (!sectionId || !subjectId) {
      return res.status(400).json({ success: false, message: 'sectionId and subjectId are required' });
    }
    const section = await Section.findByPk(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    // Removal soft-deactivates, so re-adding the same triple reactivates it
    // (the unique constraint covers the triple regardless of isActive).
    const [assignment, created] = await TeacherAssignment.findOrCreate({
      where: { teacherUserId: user.id, sectionId, subjectId: Number(subjectId) },
      defaults: { isActive: true, createdBy: req.user.id },
    });
    if (!created) {
      if (assignment.isActive) {
        return res.status(409).json({ success: false, message: 'This class is already assigned to the teacher' });
      }
      await assignment.update({ isActive: true, createdBy: req.user.id });
    }
    await logAuditEvent(req, 'assignment.added', {
      assignmentId: assignment.id,
      teacherUserId: user.id,
      sectionId,
      subjectId: Number(subjectId),
      reactivated: !created,
    });
    res.status(201).json({
      success: true,
      message: 'Assignment added',
      data: {
        id: assignment.id,
        sectionId,
        sectionName: section.name,
        subjectId: Number(subjectId),
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.removeAssignment = async (req, res, next) => {
  try {
    const user = await findTeacher(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    const assignment = await TeacherAssignment.findOne({
      where: { id: req.params.assignmentId, teacherUserId: user.id },
    });
    if (!assignment || !assignment.isActive) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    // Soft-deactivate so history stays intact; POST reactivates if re-added.
    await assignment.update({ isActive: false });
    await logAuditEvent(req, 'assignment.removed', {
      assignmentId: assignment.id,
      teacherUserId: user.id,
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
    });
    res.json({ success: true, message: 'Assignment removed' });
  } catch (error) {
    next(error);
  }
};

// ── Notifications to teachers (ride the messaging plumbing, §5.3) ────────────

exports.sendNotification = async (req, res, next) => {
  try {
    const { title, body, recipients } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: 'Body is required' });
    }
    let recipientUsers;
    if (recipients === 'all' || recipients === undefined) {
      recipientUsers = await User.findAll({
        where: { role: 'TEACHER', isActive: true },
        attributes: ['id'],
      });
    } else if (Array.isArray(recipients) && recipients.length > 0) {
      recipientUsers = await User.findAll({
        where: { id: { [Op.in]: recipients }, role: 'TEACHER', isActive: true },
        attributes: ['id'],
      });
      if (recipientUsers.length !== recipients.length) {
        return res.status(400).json({ success: false, message: 'One or more recipients are not active teachers' });
      }
    } else {
      return res.status(400).json({ success: false, message: "recipients must be 'all' or a non-empty array of teacher user ids" });
    }
    if (!recipientUsers.length) {
      return res.status(400).json({ success: false, message: 'No active teachers to notify' });
    }
    const { thread } = await messagingService.createAdminNotification({
      adminUserId: req.user.id,
      title: String(title).trim(),
      body: String(body).trim(),
      recipientUserIds: recipientUsers.map((u) => u.id),
    });
    await logAuditEvent(req, 'notification.sent', {
      threadId: thread.id,
      title: String(title).trim(),
      recipientScope: recipients === 'all' || recipients === undefined ? 'all' : 'selected',
      recipientCount: recipientUsers.length,
      recipientUserIds: recipientUsers.map((u) => u.id),
    });
    res.status(201).json({
      success: true,
      message: `Notification sent to ${recipientUsers.length} teacher(s)`,
      data: { threadId: thread.id, recipientCount: recipientUsers.length },
    });
  } catch (error) {
    next(error);
  }
};

exports.listNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const { count, rows } = await MessageThread.findAndCountAll({
      where: { contextType: messagingService.CONTEXT_TYPES.ADMIN_BROADCAST },
      order: [['createdAt', 'DESC']],
      limit: l,
      offset: (p - 1) * l,
    });
    const statuses = await Promise.all(rows.map((t) => messagingService.getNotificationReadStatus(t.id)));
    res.json({
      success: true,
      data: statuses.filter(Boolean).map((s) => ({
        threadId: s.threadId,
        title: s.title,
        body: s.body,
        sentAt: s.sentAt,
        totalRecipients: s.totalRecipients,
        readCount: s.readCount,
      })),
      pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationReadStatus = async (req, res, next) => {
  try {
    const status = await messagingService.getNotificationReadStatus(Number(req.params.id));
    if (!status) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

// ── Oversight (read-only view of student↔teacher threads, §10.4) ─────────────
// Deliberate design: no fully private student↔teacher channels in an education
// tool. Admins can read these threads but cannot post into them (no write
// route exists here, and the shared /api/messages routes reject non-
// participants), and every view is audit-logged.

exports.listOversightThreads = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await messagingService.listStudentTeacherThreads({ page, limit, search });
    await logAuditEvent(req, 'oversight.viewed', { view: 'list', page: page || 1, search: search || null });
    res.json({ success: true, data: result.threads, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.getOversightThread = async (req, res, next) => {
  try {
    const threadId = Number(req.params.id);
    const thread = await messagingService.getThreadDetail(threadId);
    if (!thread || thread.contextType !== messagingService.CONTEXT_TYPES.STUDENT_TEACHER_SUBJECT) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }
    const { messages, pagination } = await messagingService.getThreadMessages(threadId, req.query);
    await logAuditEvent(req, 'oversight.viewed', { view: 'thread', threadId });
    res.json({ success: true, data: { thread, messages, readOnly: true }, pagination });
  } catch (error) {
    next(error);
  }
};
