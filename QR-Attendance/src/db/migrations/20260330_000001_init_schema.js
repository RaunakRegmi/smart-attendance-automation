/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('email').notNullable().unique();
    t.text('phone').notNullable();
    t.text('password_hash').notNullable();
    t.text('role').notNullable(); // ADMIN | TEACHER | STUDENT
    t.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_chk CHECK (role IN ('ADMIN','TEACHER','STUDENT'));
  `);

  await knex.schema.createTable('student_profiles', (t) => {
    t.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    t.text('batch_id').notNullable();
    t.text('parent_name').notNullable();
    t.text('parent_phone').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('teacher_profiles', (t) => {
    t.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    t.text('department').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('classes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('class_name').notNullable();
    t.uuid('teacher_id').notNullable().references('id').inTable('users');
    t.text('batch_id').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('class_schedules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.integer('day_of_week').notNullable(); // 0-6 (Sun-Sat)
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.timestamps(true, true);
    t.unique(['class_id', 'day_of_week', 'start_time', 'end_time']);
  });

  await knex.raw(`
    ALTER TABLE class_schedules
    ADD CONSTRAINT class_schedules_dow_chk CHECK (day_of_week BETWEEN 0 AND 6);
  `);

  await knex.schema.createTable('enrollments', (t) => {
    t.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.timestamps(true, true);
    t.primary(['student_id', 'class_id']);
  });

  await knex.schema.createTable('attendance_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.uuid('teacher_id').notNullable().references('id').inTable('users');
    t.text('qr_token').notNullable().unique();
    t.timestamp('start_time', { useTz: true }).notNullable();
    t.timestamp('end_time', { useTz: true }).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('attendances', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');
    t.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('scan_time', { useTz: true }).notNullable();
    t.text('status').notNullable(); // PRESENT | LATE
    t.timestamps(true, true);
    t.unique(['session_id', 'student_id']);
  });

  await knex.raw(`
    ALTER TABLE attendances
    ADD CONSTRAINT attendances_status_chk CHECK (status IN ('PRESENT','LATE'));
  `);

  await knex.schema.createTable('attendance_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');
    t.text('reason').notNullable();
    t.text('status').notNullable().defaultTo('PENDING'); // PENDING | APPROVED | REJECTED
    t.timestamps(true, true);
    t.unique(['student_id', 'session_id']);
  });

  await knex.raw(`
    ALTER TABLE attendance_requests
    ADD CONSTRAINT attendance_requests_status_chk CHECK (status IN ('PENDING','APPROVED','REJECTED'));
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('attendance_requests');
  await knex.schema.dropTableIfExists('attendances');
  await knex.schema.dropTableIfExists('attendance_sessions');
  await knex.schema.dropTableIfExists('enrollments');
  await knex.schema.dropTableIfExists('class_schedules');
  await knex.schema.dropTableIfExists('classes');
  await knex.schema.dropTableIfExists('teacher_profiles');
  await knex.schema.dropTableIfExists('student_profiles');
  await knex.schema.dropTableIfExists('users');
};

