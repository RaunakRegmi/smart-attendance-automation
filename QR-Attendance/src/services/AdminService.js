const bcrypt = require('bcrypt');
const { db } = require('../db/knex');
const { AppError } = require('../utils/errors');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const AdminService = {
  async createUser({ name, email, phone, password, role, studentProfile, teacherProfile }) {
    if (!name || !email || !phone || !password || !role) throw new AppError('Missing required fields', 400);
    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) throw new AppError('Invalid role', 400);

    const normalizedEmail = normalizeEmail(email);
    const existing = await db('users').select('id').where({ email: normalizedEmail }).first();
    if (existing) throw new AppError('Email already in use', 400);

    if (role === 'STUDENT') {
      if (!studentProfile?.batchId || !studentProfile?.parentName || !studentProfile?.parentPhone) {
        throw new AppError('Student profile required for STUDENT', 400);
      }
    }
    if (role === 'TEACHER') {
      if (!teacherProfile?.department) throw new AppError('Teacher profile required for TEACHER', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const created = await db.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({
          name: String(name).trim(),
          email: normalizedEmail,
          phone: String(phone).trim(),
          password_hash: passwordHash,
          role,
        })
        .returning(['id', 'name', 'email', 'phone', 'role']);

      if (role === 'STUDENT') {
        await trx('student_profiles').insert({
          user_id: user.id,
          batch_id: String(studentProfile.batchId).trim(),
          parent_name: String(studentProfile.parentName).trim(),
          parent_phone: String(studentProfile.parentPhone).trim(),
        });
      }

      if (role === 'TEACHER') {
        await trx('teacher_profiles').insert({
          user_id: user.id,
          department: String(teacherProfile.department).trim(),
        });
      }

      return user;
    });

    return created;
  },

  async listUsers({ role } = {}) {
    let q = db('users').select('id', 'name', 'email', 'phone', 'role').orderBy('created_at', 'desc');
    if (role) q = q.where({ role });
    return await q;
  },
};

module.exports = { AdminService };

