const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const MessageThread = require('../models/MessageThread');
const MessageThreadParticipant = require('../models/MessageThreadParticipant');
const ThreadMessage = require('../models/ThreadMessage');
const User = require('../models/User');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const TeacherAssignment = require('../models/TeacherAssignment');

const CONTEXT_TYPES = {
  STUDENT_TEACHER_SUBJECT: 'STUDENT_TEACHER_SUBJECT',
  ADMIN_TEACHER: 'ADMIN_TEACHER',
  ADMIN_BROADCAST: 'ADMIN_BROADCAST',
};

// ── Display names ────────────────────────────────────────────────────────────
// users has no name column: teachers get theirs from an optionally linked
// lecturer record, students from their student profile, everyone else falls
// back to the email local-part.
const resolveDisplayNames = async (userIds) => {
  const ids = [...new Set(userIds)].filter((id) => id != null);
  const map = new Map();
  if (!ids.length) return map;
  const users = await User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'email', 'role'],
  });
  const lecturers = await Lecturer.findAll({
    where: { userId: { [Op.in]: ids } },
    attributes: ['userId', 'name'],
  });
  const students = await Student.findAll({
    where: { userId: { [Op.in]: ids } },
    attributes: ['userId', 'name', 'avatarUrl'],
  });
  const lecturerByUser = new Map(lecturers.map((l) => [l.userId, l]));
  const studentByUser = new Map(students.map((s) => [s.userId, s]));
  for (const user of users) {
    const lecturer = lecturerByUser.get(user.id);
    const student = studentByUser.get(user.id);
    map.set(user.id, {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: lecturer?.name || student?.name || user.email.split('@')[0],
      avatarUrl: student?.avatarUrl || null,
    });
  }
  return map;
};

// ── Unread counts (computed by query — no sockets, per §10.2) ────────────────
// unread = messages newer than my lastReadAt, not sent by me (system messages
// count too, hence IS DISTINCT FROM which keeps NULL senders).
const getUnreadCount = async (userId) => {
  const [row] = await sequelize.query(
    `SELECT COUNT(m.id)::int AS unread
     FROM message_thread_participants p
     JOIN thread_messages m ON m."threadId" = p."threadId"
     WHERE p."userId" = :userId
       AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
       AND m."senderId" IS DISTINCT FROM :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  return row ? row.unread : 0;
};

const getUnreadPerThread = async (userId, threadIds) => {
  if (!threadIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT p."threadId" AS "threadId", COUNT(m.id)::int AS unread
     FROM message_thread_participants p
     JOIN thread_messages m ON m."threadId" = p."threadId"
     WHERE p."userId" = :userId
       AND p."threadId" IN (:threadIds)
       AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
       AND m."senderId" IS DISTINCT FROM :userId
     GROUP BY p."threadId"`,
    { replacements: { userId, threadIds }, type: QueryTypes.SELECT }
  );
  return new Map(rows.map((r) => [r.threadId, r.unread]));
};

const getLastMessagePerThread = async (threadIds) => {
  if (!threadIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT DISTINCT ON ("threadId") id, "threadId", "senderId", body, "isSystem", "createdAt"
     FROM thread_messages
     WHERE "threadId" IN (:threadIds)
     ORDER BY "threadId", "createdAt" DESC, id DESC`,
    { replacements: { threadIds }, type: QueryTypes.SELECT }
  );
  return new Map(rows.map((r) => [r.threadId, r]));
};

// ── Inbox ────────────────────────────────────────────────────────────────────
const listThreadsForUser = async (userId, { contextType = null, unreadOnly = false } = {}) => {
  const myParts = await MessageThreadParticipant.findAll({ where: { userId } });
  if (!myParts.length) return [];
  const threadIds = myParts.map((p) => p.threadId);
  const where = { id: { [Op.in]: threadIds } };
  if (contextType) where.contextType = contextType;
  const threads = await MessageThread.findAll({
    where,
    include: [
      { model: MessageThreadParticipant, as: 'participants' },
      { model: Subject, as: 'contextSubject', required: false },
    ],
    order: [['updatedAt', 'DESC']],
  });
  const ids = threads.map((t) => t.id);
  const lastByThread = await getLastMessagePerThread(ids);
  const unreadByThread = await getUnreadPerThread(userId, ids);
  const allUserIds = threads.flatMap((t) => t.participants.map((p) => p.userId));
  const names = await resolveDisplayNames(allUserIds);

  const result = threads.map((t) => {
    const last = lastByThread.get(t.id) || null;
    const participants = t.participants.map((p) => ({
      userId: p.userId,
      lastReadAt: p.lastReadAt,
      ...(names.get(p.userId) || { name: `User ${p.userId}`, role: null, email: null }),
    }));
    return {
      id: t.id,
      contextType: t.contextType,
      contextId: t.contextId,
      subject: t.contextSubject
        ? { id: t.contextSubject.id, subjectCode: t.contextSubject.subjectCode, subjectName: t.contextSubject.subjectName }
        : null,
      title: t.title,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      participants,
      otherParticipants: participants.filter((p) => p.userId !== userId),
      lastMessage: last
        ? {
            id: last.id,
            body: last.body,
            senderId: last.senderId,
            senderName: last.senderId ? (names.get(last.senderId)?.name || null) : null,
            isSystem: last.isSystem,
            createdAt: last.createdAt,
          }
        : null,
      unreadCount: unreadByThread.get(t.id) || 0,
    };
  });
  return unreadOnly ? result.filter((t) => t.unreadCount > 0) : result;
};

// ── Thread access + messages ─────────────────────────────────────────────────
const getParticipant = (threadId, userId) =>
  MessageThreadParticipant.findOne({ where: { threadId, userId } });

const getThreadMessages = async (threadId, { page = 1, limit = 50 } = {}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const { count, rows } = await ThreadMessage.findAndCountAll({
    where: { threadId },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
    limit: l,
    offset: (p - 1) * l,
  });
  const names = await resolveDisplayNames(rows.map((m) => m.senderId));
  return {
    messages: rows.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      senderId: m.senderId,
      senderName: m.senderId ? (names.get(m.senderId)?.name || null) : null,
      senderRole: m.senderId ? (names.get(m.senderId)?.role || null) : null,
      body: m.body,
      isSystem: m.isSystem,
      readAt: m.readAt,
      createdAt: m.createdAt,
    })),
    pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
  };
};

const getThreadDetail = async (threadId) => {
  const thread = await MessageThread.findByPk(threadId, {
    include: [
      { model: MessageThreadParticipant, as: 'participants' },
      { model: Subject, as: 'contextSubject', required: false },
    ],
  });
  if (!thread) return null;
  const names = await resolveDisplayNames(thread.participants.map((p) => p.userId));
  return {
    id: thread.id,
    contextType: thread.contextType,
    contextId: thread.contextId,
    subject: thread.contextSubject
      ? { id: thread.contextSubject.id, subjectCode: thread.contextSubject.subjectCode, subjectName: thread.contextSubject.subjectName }
      : null,
    title: thread.title,
    createdBy: thread.createdBy,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    participants: thread.participants.map((p) => ({
      userId: p.userId,
      lastReadAt: p.lastReadAt,
      roleAtTime: p.roleAtTime,
      ...(names.get(p.userId) || { name: `User ${p.userId}`, role: null, email: null }),
    })),
  };
};

// ── Creation / append / read ─────────────────────────────────────────────────
// For two-party contexts an existing thread with the same context and the same
// two participants is reused so inboxes don't fill with duplicates.
const findExistingTwoPartyThread = async (contextType, contextId, userA, userB) => {
  const candidates = await MessageThread.findAll({
    where: { contextType, contextId: contextId ?? null },
    include: [{ model: MessageThreadParticipant, as: 'participants' }],
  });
  return (
    candidates.find((t) => {
      const ids = t.participants.map((p) => p.userId).sort((x, y) => x - y);
      const expected = [userA, userB].sort((x, y) => x - y);
      return ids.length === 2 && ids[0] === expected[0] && ids[1] === expected[1];
    }) || null
  );
};

const createThread = async ({
  contextType,
  contextId = null,
  title = null,
  createdBy,
  participants, // [{ userId, role }]
  firstMessage, // { senderId, body, isSystem }
}) => {
  return sequelize.transaction(async (transaction) => {
    const thread = await MessageThread.create(
      { contextType, contextId, title, createdBy },
      { transaction }
    );
    await MessageThreadParticipant.bulkCreate(
      participants.map((p) => ({ threadId: thread.id, userId: p.userId, roleAtTime: p.role || null })),
      { transaction }
    );
    let message = null;
    if (firstMessage && firstMessage.body) {
      message = await ThreadMessage.create(
        {
          threadId: thread.id,
          senderId: firstMessage.senderId ?? null,
          body: firstMessage.body,
          isSystem: firstMessage.isSystem === true,
        },
        { transaction }
      );
      await sequelize.query(
        `UPDATE message_threads SET "updatedAt" = :ts WHERE id = :threadId`,
        { replacements: { ts: message.createdAt, threadId: thread.id }, transaction }
      );
    }
    return { thread, message };
  });
};

const appendMessage = async ({ threadId, senderId, body, isSystem = false }) => {
  return sequelize.transaction(async (transaction) => {
    const message = await ThreadMessage.create(
      { threadId, senderId: senderId ?? null, body, isSystem },
      { transaction }
    );
    // updatedAt = last message time drives inbox sorting (raw update because
    // Sequelize manages updatedAt itself and ignores explicit values).
    await sequelize.query(
      `UPDATE message_threads SET "updatedAt" = :ts WHERE id = :threadId`,
      { replacements: { ts: message.createdAt, threadId }, transaction }
    );
    return message;
  });
};

const markThreadRead = async (threadId, userId) => {
  const participant = await getParticipant(threadId, userId);
  if (!participant) return null;
  const now = new Date();
  await participant.update({ lastReadAt: now });
  // Secondary per-message marker for 1:1 threads; lastReadAt stays primary.
  const thread = await MessageThread.findByPk(threadId);
  if (thread && thread.contextType !== CONTEXT_TYPES.ADMIN_BROADCAST) {
    await ThreadMessage.update(
      { readAt: now },
      {
        where: {
          threadId,
          readAt: null,
          [Op.or]: [{ senderId: { [Op.ne]: userId } }, { senderId: null }],
        },
      }
    );
  }
  return now;
};

// ── Eligibility (§10.3 — enforced server-side, never trust the client) ───────
// Student → teacher: only a teacher who teaches the student's section, with the
// thread tied to that shared subject.
const canStudentMessageTeacher = async (studentUserId, teacherUserId, subjectId) => {
  const student = await Student.findOne({ where: { userId: studentUserId } });
  if (!student || !student.sectionId) return { ok: false, reason: 'Student profile or section not found' };
  if (!subjectId) return { ok: false, reason: 'subjectId is required for a student-teacher thread' };
  const assignment = await TeacherAssignment.findOne({
    where: { teacherUserId, sectionId: student.sectionId, subjectId, isActive: true },
  });
  if (!assignment) return { ok: false, reason: 'This teacher does not teach you this subject' };
  return { ok: true, student, assignment };
};

// Teacher → student: only the teacher's own students, same subject tie.
const canTeacherMessageStudent = async (teacherUserId, studentUserId, subjectId) => {
  const student = await Student.findOne({ where: { userId: studentUserId } });
  if (!student || !student.sectionId) return { ok: false, reason: 'Student profile or section not found' };
  if (!subjectId) return { ok: false, reason: 'subjectId is required for a student-teacher thread' };
  const assignment = await TeacherAssignment.findOne({
    where: { teacherUserId, sectionId: student.sectionId, subjectId, isActive: true },
  });
  if (!assignment) return { ok: false, reason: 'This student is not in one of your assigned classes for this subject' };
  return { ok: true, student, assignment };
};

// Teachers a student may start a thread with, grouped with the shared subjects.
const getTeachersForStudentUser = async (studentUserId) => {
  const student = await Student.findOne({ where: { userId: studentUserId } });
  if (!student || !student.sectionId) return [];
  const assignments = await TeacherAssignment.findAll({
    where: { sectionId: student.sectionId, isActive: true },
    include: [{ model: Subject }],
  });
  const teacherIds = [...new Set(assignments.map((a) => a.teacherUserId))];
  const activeTeachers = await User.findAll({
    where: { id: { [Op.in]: teacherIds }, role: 'TEACHER', isActive: true },
    attributes: ['id'],
  });
  const activeIds = new Set(activeTeachers.map((u) => u.id));
  const names = await resolveDisplayNames([...activeIds]);
  const byTeacher = new Map();
  for (const a of assignments) {
    if (!activeIds.has(a.teacherUserId)) continue;
    if (!byTeacher.has(a.teacherUserId)) {
      const info = names.get(a.teacherUserId) || {};
      byTeacher.set(a.teacherUserId, {
        userId: a.teacherUserId,
        name: info.name || `Teacher ${a.teacherUserId}`,
        email: info.email || null,
        subjects: [],
      });
    }
    if (a.Subject) {
      byTeacher.get(a.teacherUserId).subjects.push({
        id: a.Subject.id,
        subjectCode: a.Subject.subjectCode,
        subjectName: a.Subject.subjectName,
      });
    }
  }
  return [...byTeacher.values()];
};

// Students a teacher may start a thread with (their rostered students), with
// the shared subjects for the thread context.
const getStudentsForTeacherUser = async (teacherUserId) => {
  const assignments = await TeacherAssignment.findAll({
    where: { teacherUserId, isActive: true },
    include: [{ model: Subject }, { model: Section }],
  });
  if (!assignments.length) return [];
  const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
  const students = await Student.findAll({
    where: { sectionId: { [Op.in]: sectionIds }, userId: { [Op.ne]: null } },
    attributes: ['id', 'name', 'email', 'userId', 'sectionId', 'avatarUrl'],
    order: [['name', 'ASC']],
  });
  const subjectsBySection = new Map();
  for (const a of assignments) {
    if (!subjectsBySection.has(a.sectionId)) subjectsBySection.set(a.sectionId, []);
    if (a.Subject) {
      subjectsBySection.get(a.sectionId).push({
        id: a.Subject.id,
        subjectCode: a.Subject.subjectCode,
        subjectName: a.Subject.subjectName,
      });
    }
  }
  return students.map((s) => ({
    studentId: s.id,
    userId: s.userId,
    name: s.name,
    email: s.email,
    avatarUrl: s.avatarUrl,
    sectionId: s.sectionId,
    subjects: subjectsBySection.get(s.sectionId) || [],
  }));
};

// ── Notifications (ride the same plumbing: ADMIN_BROADCAST thread whose
// messages are isSystem = true; per-recipient read via lastReadAt) ────────────
const createAdminNotification = async ({ adminUserId, title, body, recipientUserIds }) => {
  const { thread, message } = await createThread({
    contextType: CONTEXT_TYPES.ADMIN_BROADCAST,
    contextId: null,
    title,
    createdBy: adminUserId,
    participants: recipientUserIds.map((userId) => ({ userId, role: 'TEACHER' })),
    firstMessage: { senderId: adminUserId, body, isSystem: true },
  });
  return { thread, message };
};

const getNotificationReadStatus = async (threadId) => {
  const thread = await MessageThread.findByPk(threadId, {
    include: [{ model: MessageThreadParticipant, as: 'participants' }],
  });
  if (!thread) return null;
  const firstMessage = await ThreadMessage.findOne({
    where: { threadId },
    order: [['createdAt', 'ASC']],
  });
  const names = await resolveDisplayNames(thread.participants.map((p) => p.userId));
  const sentAt = firstMessage ? firstMessage.createdAt : thread.createdAt;
  const recipients = thread.participants.map((p) => ({
    userId: p.userId,
    name: names.get(p.userId)?.name || `User ${p.userId}`,
    email: names.get(p.userId)?.email || null,
    read: !!(p.lastReadAt && p.lastReadAt >= sentAt),
    readAt: p.lastReadAt && p.lastReadAt >= sentAt ? p.lastReadAt : null,
  }));
  return {
    threadId: thread.id,
    title: thread.title,
    body: firstMessage ? firstMessage.body : null,
    sentAt,
    totalRecipients: recipients.length,
    readCount: recipients.filter((r) => r.read).length,
    recipients,
  };
};

// Latest system messages (notifications) for a user's dashboard.
const getNotificationsForUser = async (userId, { limit = 10 } = {}) => {
  const rows = await sequelize.query(
    `SELECT m.id, m."threadId", m.body, m."createdAt", t.title, t."contextType",
            (p."lastReadAt" IS NOT NULL AND p."lastReadAt" >= m."createdAt") AS read
     FROM message_thread_participants p
     JOIN message_threads t ON t.id = p."threadId"
     JOIN thread_messages m ON m."threadId" = p."threadId"
     WHERE p."userId" = :userId AND m."isSystem" = true
     ORDER BY m."createdAt" DESC
     LIMIT :limit`,
    { replacements: { userId, limit }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => ({
    messageId: r.id,
    threadId: r.threadId,
    title: r.title,
    body: r.body,
    contextType: r.contextType,
    createdAt: r.createdAt,
    read: r.read === true,
  }));
};

// ── Admin oversight (read-only, §10.4) ───────────────────────────────────────
const listStudentTeacherThreads = async ({ page = 1, limit = 20, search = null } = {}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const { count, rows } = await MessageThread.findAndCountAll({
    where: { contextType: CONTEXT_TYPES.STUDENT_TEACHER_SUBJECT },
    include: [
      { model: MessageThreadParticipant, as: 'participants' },
      { model: Subject, as: 'contextSubject', required: false },
    ],
    order: [['updatedAt', 'DESC']],
    limit: l,
    offset: (p - 1) * l,
    distinct: true,
  });
  const ids = rows.map((t) => t.id);
  const lastByThread = await getLastMessagePerThread(ids);
  const names = await resolveDisplayNames(rows.flatMap((t) => t.participants.map((pp) => pp.userId)));
  let threads = rows.map((t) => ({
    id: t.id,
    contextType: t.contextType,
    subject: t.contextSubject
      ? { id: t.contextSubject.id, subjectCode: t.contextSubject.subjectCode, subjectName: t.contextSubject.subjectName }
      : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    participants: t.participants.map((pp) => ({
      userId: pp.userId,
      ...(names.get(pp.userId) || { name: `User ${pp.userId}`, role: null, email: null }),
    })),
    lastMessage: lastByThread.get(t.id)
      ? { body: lastByThread.get(t.id).body, createdAt: lastByThread.get(t.id).createdAt }
      : null,
  }));
  if (search) {
    const q = search.toLowerCase();
    threads = threads.filter((t) =>
      t.participants.some((pp) => (pp.name || '').toLowerCase().includes(q) || (pp.email || '').toLowerCase().includes(q)) ||
      (t.subject?.subjectName || '').toLowerCase().includes(q) ||
      (t.subject?.subjectCode || '').toLowerCase().includes(q)
    );
  }
  return {
    threads,
    pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
  };
};

module.exports = {
  CONTEXT_TYPES,
  resolveDisplayNames,
  getUnreadCount,
  getUnreadPerThread,
  listThreadsForUser,
  getParticipant,
  getThreadMessages,
  getThreadDetail,
  findExistingTwoPartyThread,
  createThread,
  appendMessage,
  markThreadRead,
  canStudentMessageTeacher,
  canTeacherMessageStudent,
  getTeachersForStudentUser,
  getStudentsForTeacherUser,
  createAdminNotification,
  getNotificationReadStatus,
  getNotificationsForUser,
  listStudentTeacherThreads,
};
