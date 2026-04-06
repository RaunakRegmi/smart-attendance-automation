const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db/knex');
const { AppError } = require('../utils/errors');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function assertRole(role, allowed) {
  if (!allowed.includes(role)) throw new AppError('Invalid role', 400);
}

const AuthService = {
  async register({ name, email, phone, password, role, studentProfile, teacherProfile }) {
    if (!name || !email || !phone || !password || !role) throw new AppError('Missing required fields', 400);
    assertRole(role, ['TEACHER', 'STUDENT']);

    const normalizedEmail = normalizeEmail(email);
    const existing = await db('users').select('id').where({ email: normalizedEmail }).first();
    if (existing) throw new AppError('Email already in use', 400);

    const passwordHash = await bcrypt.hash(password, 12);

    return db.transaction(async (trx) => {
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
        if (!studentProfile?.batchId || !studentProfile?.parentName || !studentProfile?.parentPhone) {
          throw new AppError('studentProfile is required for STUDENT', 400);
        }

        await trx('student_profiles').insert({
          user_id: user.id,
          batch_id: String(studentProfile.batchId).trim(),
          parent_name: String(studentProfile.parentName).trim(),
          parent_phone: String(studentProfile.parentPhone).trim(),
        });
      }

      if (role === 'TEACHER') {
        if (!teacherProfile?.department) throw new AppError('teacherProfile is required for TEACHER', 400);
        await trx('teacher_profiles').insert({
          user_id: user.id,
          department: String(teacherProfile.department).trim(),
        });
      }

      return user;
    });
  },

  async login({ email, password }) {
    if (!email || !password) throw new AppError('Missing email or password', 400);
    const normalizedEmail = normalizeEmail(email);

    const user = await db('users')
      .select('id', 'email', 'password_hash', 'role', 'name')
      .where({ email: normalizedEmail })
      .first();

    if (!user) throw new AppError('Invalid credentials', 401);
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new AppError('Invalid credentials', 401);

    const token = jwt.sign(
      { role: user.role },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      },
    );

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  },
};

module.exports = { AuthService };

