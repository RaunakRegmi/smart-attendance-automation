const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: false,
  }
);

// Import the User model (includes hooks for password hashing)
const User = require('../models/User');
const Lecturer = require('../models/Lecturer');
const Student = require('../models/Student');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const TeacherAssignment = require('../models/TeacherAssignment');
const MessageThread = require('../models/MessageThread');
const MessageThreadParticipant = require('../models/MessageThreadParticipant');
const ThreadMessage = require('../models/ThreadMessage');

async function seedAdmin() {
  // Check if admin already exists
  const existing = await User.findOne({ where: { email: 'admin@example.com' } });
  if (existing) {
    // If password is not hashed (plain text), hash it
    if (!existing.password.startsWith('$2')) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      existing.password = await bcrypt.hash('admin@123', salt);
      await existing.save();
      console.log('Admin password updated to hashed version');
    } else {
      console.log('Admin user already exists and password is hashed. Skipping seed.');
    }
    return existing;
  }

  // Create admin user (password will be hashed by model hook)
  const admin = await User.create({
    email: 'admin@example.com',
    password: 'admin@123',
    role: 'ADMIN',
    isActive: true,
  });

  console.log('Admin user seeded successfully');
  return admin;
}

// Demo teacher accounts + assignments + a sample thread/notification so the
// teacher portal and messaging can be demoed immediately. Idempotent, and
// each phase degrades gracefully when reference data (sections/subjects/
// students) hasn't been synced yet.
async function seedTeacherDemo(admin) {
  const demoTeachers = [
    { email: 'teacher1@example.com', name: 'Asha Sharma' },
    { email: 'teacher2@example.com', name: 'Binod Karki' },
  ];

  const teacherUsers = [];
  for (const t of demoTeachers) {
    let user = await User.findOne({ where: { email: t.email } });
    if (!user) {
      user = await User.create({
        email: t.email,
        password: 'teacher@123',
        role: 'TEACHER',
        isActive: true,
        mustChangePassword: false,
      });
      console.log(`Teacher user seeded: ${t.email} / teacher@123`);
    }
    let lecturer = await Lecturer.findOne({ where: { userId: user.id } });
    if (!lecturer) {
      lecturer = await Lecturer.findOne({ where: { email: t.email } });
      if (lecturer) await lecturer.update({ userId: user.id });
      else await Lecturer.create({ name: t.name, email: t.email, userId: user.id });
    }
    teacherUsers.push(user);
  }

  // Assignments: hook the demo teachers to whatever sections/subjects exist.
  const sections = await Section.findAll({ order: [['createdAt', 'ASC']], limit: 2 });
  const subjects = await Subject.findAll({ order: [['createdAt', 'ASC']], limit: 2 });
  if (!sections.length || !subjects.length) {
    console.log('No sections/subjects yet — skipping demo teacher assignments (run a sheet sync first).');
    return;
  }
  for (let i = 0; i < teacherUsers.length; i++) {
    const section = sections[i % sections.length];
    const subject = subjects[i % subjects.length];
    const [, created] = await TeacherAssignment.findOrCreate({
      where: { teacherUserId: teacherUsers[i].id, sectionId: section.id, subjectId: subject.id },
      defaults: { isActive: true, createdBy: admin ? admin.id : null },
    });
    if (created) {
      console.log(`Assigned ${demoTeachers[i].email} → section "${section.name}" / ${subject.subjectCode}`);
    }
  }

  // Sample student↔teacher thread (needs a student with a login in the
  // demo teacher's section).
  const firstAssignment = await TeacherAssignment.findOne({
    where: { teacherUserId: teacherUsers[0].id, isActive: true },
  });
  if (firstAssignment) {
    const student = await Student.findOne({
      where: { sectionId: firstAssignment.sectionId, userId: { [Sequelize.Op.ne]: null } },
    });
    const existingThread = await MessageThread.findOne({
      where: { contextType: 'STUDENT_TEACHER_SUBJECT', contextId: firstAssignment.subjectId },
    });
    if (student && !existingThread) {
      const thread = await MessageThread.create({
        contextType: 'STUDENT_TEACHER_SUBJECT',
        contextId: firstAssignment.subjectId,
        createdBy: student.userId,
      });
      await MessageThreadParticipant.bulkCreate([
        { threadId: thread.id, userId: student.userId, roleAtTime: 'STUDENT' },
        { threadId: thread.id, userId: teacherUsers[0].id, roleAtTime: 'TEACHER' },
      ]);
      await ThreadMessage.create({
        threadId: thread.id,
        senderId: student.userId,
        body: 'Hello! I had a question about my attendance for last week.',
      });
      await ThreadMessage.create({
        threadId: thread.id,
        senderId: teacherUsers[0].id,
        body: 'Sure — let me check the records and get back to you.',
      });
      console.log('Sample student↔teacher thread seeded');
    }
  }

  // Sample admin→teachers notification.
  const existingBroadcast = await MessageThread.findOne({ where: { contextType: 'ADMIN_BROADCAST' } });
  if (!existingBroadcast && admin) {
    const thread = await MessageThread.create({
      contextType: 'ADMIN_BROADCAST',
      title: 'Welcome to the teacher portal',
      createdBy: admin.id,
    });
    await MessageThreadParticipant.bulkCreate(
      teacherUsers.map((u) => ({ threadId: thread.id, userId: u.id, roleAtTime: 'TEACHER' }))
    );
    await ThreadMessage.create({
      threadId: thread.id,
      senderId: admin.id,
      body: 'You can now view your classes, attendance and reports here, and message your students.',
      isSystem: true,
    });
    console.log('Sample teacher notification seeded');
  }
}

async function seedData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database for seeding');

    const admin = await seedAdmin();
    await seedTeacherDemo(admin);
  } catch (err) {
    console.error('Error seeding data:', err.message);
  } finally {
    await sequelize.close();
  }
}

seedData();
