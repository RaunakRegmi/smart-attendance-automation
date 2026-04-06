const { db } = require('../db/knex');
const { AppError } = require('../utils/errors');

async function assertTeacherOwnsClass(user, classId) {
  const cls = await db('classes').select('id', 'teacher_id', 'batch_id', 'class_name').where({ id: classId }).first();
  if (!cls) throw new AppError('Class not found', 404);
  if (user.role === 'TEACHER' && cls.teacher_id !== user.id) throw new AppError('Forbidden', 403);
  return cls;
}

const ClassService = {
  async createClass(actor, { className, batchId, teacherId }) {
    if (!className || !batchId) throw new AppError('Missing className or batchId', 400);

    let assignedTeacherId = actor.id;
    if (actor.role === 'ADMIN') {
      if (!teacherId) throw new AppError('teacherId is required for ADMIN', 400);
      assignedTeacherId = teacherId;
    }

    const teacher = await db('users').select('id', 'role').where({ id: assignedTeacherId }).first();
    if (!teacher || teacher.role !== 'TEACHER') throw new AppError('teacherId must be a TEACHER', 400);

    const [cls] = await db('classes')
      .insert({
        class_name: String(className).trim(),
        batch_id: String(batchId).trim(),
        teacher_id: assignedTeacherId,
      })
      .returning(['id', 'class_name', 'teacher_id', 'batch_id']);

    return cls;
  },

  async listClasses(actor) {
    if (actor.role === 'ADMIN') {
      return await db('classes').select('id', 'class_name', 'teacher_id', 'batch_id').orderBy('created_at', 'desc');
    }

    if (actor.role === 'TEACHER') {
      return await db('classes')
        .select('id', 'class_name', 'teacher_id', 'batch_id')
        .where({ teacher_id: actor.id })
        .orderBy('created_at', 'desc');
    }

    // STUDENT: only enrolled classes
    return await db('classes')
      .join('enrollments', 'classes.id', 'enrollments.class_id')
      .select('classes.id', 'classes.class_name', 'classes.teacher_id', 'classes.batch_id')
      .where({ 'enrollments.student_id': actor.id })
      .orderBy('classes.created_at', 'desc');
  },

  async addSchedule(actor, classId, { dayOfWeek, startTime, endTime }) {
    if (dayOfWeek === undefined || !startTime || !endTime) throw new AppError('Missing schedule fields', 400);
    if (dayOfWeek < 0 || dayOfWeek > 6) throw new AppError('dayOfWeek must be 0..6', 400);

    await assertTeacherOwnsClass(actor, classId);

    const [row] = await db('class_schedules')
      .insert({
        class_id: classId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      })
      .returning(['id', 'class_id', 'day_of_week', 'start_time', 'end_time']);

    return row;
  },

  async enrollStudent(actor, classId, { studentIds }){
    if (!studentId) throw new AppError('studentId is required', 400);
    const cls = await assertTeacherOwnsClass(actor, classId);

    const student = await db('users').select('id', 'role').where({ id: studentId }).first();
    if (!student || student.role !== 'STUDENT') throw new AppError('studentId must be a STUDENT', 400);

    // Batch safety: match student's batch_id
    const profile = await db('student_profiles').select('batch_id').where({ user_id: studentId }).first();
    if (!profile) throw new AppError('Student profile missing', 400);
    if (profile.batch_id !== cls.batch_id) throw new AppError('Student batch does not match class batch', 400);

    await db('enrollments')
      .insert({ student_id: studentId, class_id: classId })
      .onConflict(['student_id', 'class_id'])
      .ignore();

    return { ok: true };
  },

  async enrollMultipleStudents(actor, classId, students) {
    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new AppError('students array is required and cannot be empty', 400);
    }

    const cls = await assertTeacherOwnsClass(actor, classId);

    // Fetch all student details in one query
    const studentIds = students.map(String);
    const studentsData = await db('users')
      .select('id', 'role')
      .whereIn('id', studentIds);

    // Create a map for quick lookup
    const studentsMap = {};
    studentsData.forEach(s => { studentsMap[s.id] = s; });

    // Fetch student profiles for batch validation
    const profiles = await db('student_profiles')
      .select('user_id', 'batch_id')
      .whereIn('user_id', studentIds);

    const profilesMap = {};
    profiles.forEach(p => { profilesMap[p.user_id] = p; });

    // Process each student
    const enrolled = [];
    const skipped = [];
    const errors = [];

    // Use a transaction for atomicity
    const trx = await db.transaction();

    try {
      for (const studentId of studentIds) {
        const student = studentsMap[studentId];
        const profile = profilesMap[studentId];

        // Validation checks
        if (!student) {
          errors.push(`Student ${studentId}: Not found`);
          continue;
        }
        if (student.role !== 'STUDENT') {
          errors.push(`Student ${studentId}: Not a student`);
          continue;
        }
        if (!profile) {
          errors.push(`Student ${studentId}: Profile missing`);
          continue;
        }
        if (profile.batch_id !== cls.batch_id) {
          errors.push(`Student ${studentId}: Batch mismatch`);
          continue;
        }

        // Try to insert (ignore if already exists)
        const result = await trx('enrollments')
          .insert({ student_id: studentId, class_id: classId })
          .onConflict(['student_id', 'class_id'])
          .ignore();

        if (result && result[0]) {
          enrolled.push(studentId);
        } else {
          skipped.push(studentId); // Already enrolled
        }
      }

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    return { enrolled, skipped, errors };
  },
};

module.exports = { ClassService };

