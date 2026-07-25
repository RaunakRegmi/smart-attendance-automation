/**
 * Central association graph.
 *
 * Moved verbatim out of src/index.js so that src/app.js can be required by tests without
 * booting a server. Idempotent: a second call is a no-op, so requiring both app.js and
 * index.js in one process cannot double-declare (which would silently clobber the
 * `as`-less duplicates that some models declare for themselves, e.g. Sheets.js).
 *
 * Order matters: this must run AFTER the routers/controllers have been required, because
 * a handful of models declare their own associations at module load and the declarations
 * here are meant to win.
 */
const User = require('./models/User');
const Student = require('./models/Student');
const Batch = require('./models/Batch');
const Section = require('./models/Section');
const Routine = require('./models/Routine');
const Subject = require('./models/Subject');
const Lecturer = require('./models/Lecturer');
const Faculty = require('./models/Faculty');
const Sheets = require('./models/Sheets');
const Conversation = require('./models/Conversation');
const ChatMessage = require('./models/ChatMessage');
const TeacherAssignment = require('./models/TeacherAssignment');
const MessageThread = require('./models/MessageThread');
const MessageThreadParticipant = require('./models/MessageThreadParticipant');
const ThreadMessage = require('./models/ThreadMessage');
const PasswordResetToken = require('./models/PasswordResetToken');

// Required for their side effects only: these models declare their own associations and
// must be loaded so the full graph is present after defineAssociations() returns.
require('./models/Attendance');
require('./models/AuditLog');
require('./models/Notification');
require('./models/Setting');
require('./models/QRSession');
require('./models/AttendanceSession');
require('./models/AttendanceRequest');
require('./models/SyncJob');

let defined = false;

const defineAssociations = () => {
  if (defined) return;
  defined = true;

  Batch.hasMany(Section, { foreignKey: 'batchId' });
  Section.belongsTo(Batch, { foreignKey: 'batchId' });

  Batch.hasMany(Student, { foreignKey: 'batchId' });
  Student.belongsTo(Batch, { foreignKey: 'batchId' });

  Section.hasMany(Student, { foreignKey: 'sectionId' });
  Student.belongsTo(Section, { foreignKey: 'sectionId' });

  // Link User and Student (userId on Student)
  User.hasOne(Student, { foreignKey: 'userId' });
  Student.belongsTo(User, { foreignKey: 'userId' });

  Section.hasMany(Routine, { foreignKey: 'sectionId' });
  Routine.belongsTo(Section, { foreignKey: 'sectionId' });

  // Faculty associations
  Faculty.hasMany(Student, { foreignKey: 'facultyId' });
  Student.belongsTo(Faculty, { foreignKey: 'facultyId' });

  // Subject-Lecturer associations
  Lecturer.hasMany(Subject, { foreignKey: 'lecturerId' });
  Subject.belongsTo(Lecturer, { foreignKey: 'lecturerId' });

  // Sheets associations
  Batch.hasMany(Sheets, { foreignKey: 'batchId' });
  Sheets.belongsTo(Batch, { foreignKey: 'batchId' });
  Section.hasMany(Sheets, { foreignKey: 'sectionId' });
  Sheets.belongsTo(Section, { foreignKey: 'sectionId' });

  // Chat memory associations
  User.hasMany(Conversation, { foreignKey: 'userId' });
  Conversation.belongsTo(User, { foreignKey: 'userId' });
  Conversation.hasMany(ChatMessage, { foreignKey: 'conversationId' });
  ChatMessage.belongsTo(Conversation, { foreignKey: 'conversationId' });

  // Lecturer → optional login user (role TEACHER); manual admin "promote" only
  User.hasOne(Lecturer, { foreignKey: 'userId' });
  Lecturer.belongsTo(User, { foreignKey: 'userId' });

  // Teacher assignment associations (row-level scoping backbone)
  User.hasMany(TeacherAssignment, { foreignKey: 'teacherUserId', as: 'teacherAssignments' });
  TeacherAssignment.belongsTo(User, { foreignKey: 'teacherUserId', as: 'teacher' });
  Section.hasMany(TeacherAssignment, { foreignKey: 'sectionId' });
  TeacherAssignment.belongsTo(Section, { foreignKey: 'sectionId' });
  Subject.hasMany(TeacherAssignment, { foreignKey: 'subjectId' });
  TeacherAssignment.belongsTo(Subject, { foreignKey: 'subjectId' });

  // Messaging associations (async threads; distinct from the chatbot's Conversation)
  MessageThread.hasMany(MessageThreadParticipant, { foreignKey: 'threadId', as: 'participants' });
  MessageThreadParticipant.belongsTo(MessageThread, { foreignKey: 'threadId' });
  User.hasMany(MessageThreadParticipant, { foreignKey: 'userId' });
  MessageThreadParticipant.belongsTo(User, { foreignKey: 'userId' });
  MessageThread.hasMany(ThreadMessage, { foreignKey: 'threadId', as: 'messages' });
  ThreadMessage.belongsTo(MessageThread, { foreignKey: 'threadId' });
  User.hasMany(ThreadMessage, { foreignKey: 'senderId', as: 'sentThreadMessages' });
  ThreadMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  MessageThread.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  // For STUDENT_TEACHER_SUBJECT threads, contextId points at subjects.id
  // (constraints: false — contextId is polymorphic-by-contextType, null for admin threads).
  MessageThread.belongsTo(Subject, { foreignKey: 'contextId', as: 'contextSubject', constraints: false });

  // Password reset tokens (credential delivery / forgot-password)
  User.hasMany(PasswordResetToken, { foreignKey: 'userId' });
  PasswordResetToken.belongsTo(User, { foreignKey: 'userId' });
};

module.exports = defineAssociations;
