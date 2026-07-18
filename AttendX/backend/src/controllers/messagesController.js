const { Op } = require('sequelize');
const User = require('../models/User');
const MessageThread = require('../models/MessageThread');
const messagingService = require('../services/messagingService');
const { logAuditEvent } = require('../services/auditEventService');

const { CONTEXT_TYPES } = messagingService;

const MAX_BODY_LENGTH = 5000;

const validateBody = (body) => {
  if (!body || typeof body !== 'string' || !body.trim()) return 'Message body is required';
  if (body.length > MAX_BODY_LENGTH) return `Message body must be at most ${MAX_BODY_LENGTH} characters`;
  return null;
};

// Who the caller may start a thread with (drives the compose UI; the real
// enforcement happens again in createThread).
exports.getContacts = async (req, res, next) => {
  try {
    if (req.user.role === 'STUDENT') {
      const teachers = await messagingService.getTeachersForStudentUser(req.user.id);
      return res.json({ success: true, data: { teachers } });
    }
    if (req.user.role === 'TEACHER') {
      const students = await messagingService.getStudentsForTeacherUser(req.user.id);
      const admins = await User.findAll({
        where: { role: 'ADMIN', isActive: true },
        attributes: ['id', 'email'],
      });
      return res.json({
        success: true,
        data: {
          students,
          admins: admins.map((a) => ({ userId: a.id, email: a.email, name: a.email.split('@')[0] })),
        },
      });
    }
    // ADMIN
    const teachers = await User.findAll({
      where: { role: 'TEACHER', isActive: true },
      attributes: ['id', 'email'],
    });
    const names = await messagingService.resolveDisplayNames(teachers.map((t) => t.id));
    return res.json({
      success: true,
      data: {
        teachers: teachers.map((t) => ({
          userId: t.id,
          email: t.email,
          name: names.get(t.id)?.name || t.email.split('@')[0],
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.listThreads = async (req, res, next) => {
  try {
    const { contextType, unreadOnly } = req.query;
    const threads = await messagingService.listThreadsForUser(req.user.id, {
      contextType: contextType && CONTEXT_TYPES[contextType] ? contextType : null,
      unreadOnly: unreadOnly === 'true',
    });
    res.json({ success: true, data: threads });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await messagingService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
};

// Start a thread (or continue the existing one for the same context + pair).
// Eligibility per §10.3, enforced here regardless of what the UI offered:
//   STUDENT → a teacher who teaches them, thread tied to the shared subject
//   TEACHER → their own student (same subject tie), or any admin
//   ADMIN   → any active teacher
// Everything else (student↔student, teacher↔teacher, unscoped DMs) is rejected.
exports.createThread = async (req, res, next) => {
  try {
    const { recipientUserId, subjectId, body } = req.body;
    const bodyError = validateBody(body);
    if (bodyError) return res.status(400).json({ success: false, message: bodyError });
    if (!recipientUserId) {
      return res.status(400).json({ success: false, message: 'recipientUserId is required' });
    }
    const recipient = await User.findByPk(recipientUserId);
    if (!recipient || !recipient.isActive) {
      return res.status(404).json({ success: false, message: 'Recipient not found or inactive' });
    }
    const me = req.user;

    let contextType;
    let contextId = null;
    if (me.role === 'STUDENT' && recipient.role === 'TEACHER') {
      const check = await messagingService.canStudentMessageTeacher(me.id, recipient.id, subjectId);
      if (!check.ok) return res.status(403).json({ success: false, message: check.reason });
      contextType = CONTEXT_TYPES.STUDENT_TEACHER_SUBJECT;
      contextId = Number(subjectId);
    } else if (me.role === 'TEACHER' && recipient.role === 'STUDENT') {
      const check = await messagingService.canTeacherMessageStudent(me.id, recipient.id, subjectId);
      if (!check.ok) return res.status(403).json({ success: false, message: check.reason });
      contextType = CONTEXT_TYPES.STUDENT_TEACHER_SUBJECT;
      contextId = Number(subjectId);
    } else if (
      (me.role === 'ADMIN' && recipient.role === 'TEACHER') ||
      (me.role === 'TEACHER' && recipient.role === 'ADMIN')
    ) {
      contextType = CONTEXT_TYPES.ADMIN_TEACHER;
    } else {
      return res.status(403).json({
        success: false,
        message: `Messaging between ${me.role} and ${recipient.role} is not allowed`,
      });
    }

    // Reuse the existing thread for this context + pair so inboxes don't
    // accumulate duplicates.
    const existing = await messagingService.findExistingTwoPartyThread(
      contextType,
      contextId,
      me.id,
      recipient.id
    );
    if (existing) {
      const message = await messagingService.appendMessage({
        threadId: existing.id,
        senderId: me.id,
        body: body.trim(),
      });
      await logAuditEvent(req, 'message.sent', {
        threadId: existing.id,
        messageId: message.id,
        recipientUserId: recipient.id,
        contextType,
        contextId,
        reusedThread: true,
      });
      const detail = await messagingService.getThreadDetail(existing.id);
      return res.status(200).json({ success: true, message: 'Message added to existing thread', data: { thread: detail, created: false } });
    }

    const { thread } = await messagingService.createThread({
      contextType,
      contextId,
      createdBy: me.id,
      participants: [
        { userId: me.id, role: me.role },
        { userId: recipient.id, role: recipient.role },
      ],
      firstMessage: { senderId: me.id, body: body.trim() },
    });
    await logAuditEvent(req, 'thread.created', {
      threadId: thread.id,
      recipientUserId: recipient.id,
      contextType,
      contextId,
    });
    const detail = await messagingService.getThreadDetail(thread.id);
    res.status(201).json({ success: true, message: 'Thread created', data: { thread: detail, created: true } });
  } catch (error) {
    next(error);
  }
};

exports.getThread = async (req, res, next) => {
  try {
    const threadId = Number(req.params.id);
    const participant = await messagingService.getParticipant(threadId, req.user.id);
    if (!participant) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a participant in this thread.' });
    }
    const thread = await messagingService.getThreadDetail(threadId);
    const { messages, pagination } = await messagingService.getThreadMessages(threadId, req.query);
    res.json({ success: true, data: { thread, messages }, pagination });
  } catch (error) {
    next(error);
  }
};

exports.postMessage = async (req, res, next) => {
  try {
    const threadId = Number(req.params.id);
    const { body } = req.body;
    const bodyError = validateBody(body);
    if (bodyError) return res.status(400).json({ success: false, message: bodyError });
    const participant = await messagingService.getParticipant(threadId, req.user.id);
    if (!participant) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a participant in this thread.' });
    }
    const thread = await MessageThread.findByPk(threadId);
    // Broadcast notifications are one-way: recipients cannot reply.
    if (thread.contextType === CONTEXT_TYPES.ADMIN_BROADCAST && thread.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Notifications are one-way; replies are not allowed.' });
    }
    const message = await messagingService.appendMessage({
      threadId,
      senderId: req.user.id,
      body: body.trim(),
    });
    await logAuditEvent(req, 'message.sent', { threadId, messageId: message.id });
    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        threadId,
        senderId: message.senderId,
        body: message.body,
        isSystem: message.isSystem,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const threadId = Number(req.params.id);
    const readAt = await messagingService.markThreadRead(threadId, req.user.id);
    if (!readAt) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a participant in this thread.' });
    }
    await logAuditEvent(req, 'thread.read', { threadId });
    res.json({ success: true, data: { threadId, lastReadAt: readAt } });
  } catch (error) {
    next(error);
  }
};
