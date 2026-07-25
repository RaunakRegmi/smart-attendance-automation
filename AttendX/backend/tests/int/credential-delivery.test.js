/**
 * Teacher credential delivery (email/SMS demo providers) + password reset.
 *
 * Drives the real Express app in-process via Supertest. MAIL_PROVIDER and SMS_PROVIDER are
 * pinned to "demo" by tests/testEnv.js and asserted in tests/setupAfterEnv.js, so sends are
 * console-logged and the SMS body (with the reset link) is returned in the API response for
 * assertions — never delivered.
 */
const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const { query } = require('../helpers/db');

const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const ADMIN = { email: 'admin@example.com', password: 'admin@123' };

let adminToken;
let teacherId;
let rawResetToken;

const extractToken = (smsBody) => {
  const match = /token=([a-f0-9]{64})/.exec(smsBody || '');
  return match ? match[1] : null;
};

beforeAll(async () => {
  const res = await api().post('/api/auth/login').send(ADMIN);
  expect(res.status).toBe(200);
  adminToken = res.body.data.token;
}, 30000);

describe('teacher creation with credential delivery (demo providers)', () => {
  test('creates the account and reports per-channel delivery status', async () => {
    const res = await api()
      .post('/api/admin/teachers')
      .set(auth(adminToken))
      .send({
        name: 'Delivery Teacher',
        email: 'delivery.teacher@example.com',
        phone: '98-4123 4567',
        address: 'Kathmandu',
        defaultPassword: 'temp@123456',
        deliveryChannels: ['email', 'sms'],
      });
    expect(res.status).toBe(201);
    teacherId = res.body.data.user.id;
    expect(res.body.data.user.mustChangePassword).toBe(true);
    expect(res.body.data.user.phone).toBe('+9779841234567'); // normalized
    expect(res.body.data.user.address).toBe('Kathmandu');

    const delivery = res.body.data.delivery;
    expect(delivery.email.attempted).toBe(true);
    expect(delivery.email.ok).toBe(true);
    expect(delivery.email.provider).toBe('demo');
    expect(delivery.sms.attempted).toBe(true);
    expect(delivery.sms.ok).toBe(true);
    expect(delivery.sms.to).toBe('+9779841234567');
    expect(delivery.sms.demoMessage).toContain('Temp password: temp@123456');
    expect(delivery.sms.demoMessage).toContain('/reset-password?token=');

    rawResetToken = extractToken(delivery.sms.demoMessage);
    expect(rawResetToken).toBeTruthy();
  });

  test('creating without deliveryChannels keeps the original contract (no delivery)', async () => {
    const res = await api()
      .post('/api/admin/teachers')
      .set(auth(adminToken))
      .send({ name: 'Plain Teacher', email: 'plain.teacher@example.com', password: 'plain@123' });
    expect(res.status).toBe(201);
    expect(res.body.data.delivery).toBeNull();
  });

  test('duplicate email is rejected with a specific message', async () => {
    const res = await api()
      .post('/api/admin/teachers')
      .set(auth(adminToken))
      .send({ email: 'delivery.teacher@example.com', defaultPassword: 'x@123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email already exists/i);
  });

  test('duplicate phone is rejected with a specific message', async () => {
    const res = await api()
      .post('/api/admin/teachers')
      .set(auth(adminToken))
      .send({
        email: 'another.teacher@example.com',
        defaultPassword: 'x@123456',
        phone: '+977 9841234567', // same number, different formatting
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/phone number already exists/i);
  });

  test('invalid Nepali mobile number is rejected', async () => {
    const res = await api()
      .post('/api/admin/teachers')
      .set(auth(adminToken))
      .send({ email: 'badphone.teacher@example.com', defaultPassword: 'x@123456', phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid nepali mobile/i);
  });

  test('invalid delivery channel is rejected', async () => {
    const res = await api()
      .post('/api/admin/teachers')
      .set(auth(adminToken))
      .send({ email: 'badchan.teacher@example.com', defaultPassword: 'x@123456', deliveryChannels: ['pigeon'] });
    expect(res.status).toBe(400);
  });
});

describe('password reset via delivered token', () => {
  test('reset-password is public and consumes the token', async () => {
    const res = await api()
      .post('/api/auth/reset-password') // no Authorization header
      .send({ token: rawResetToken, newPassword: 'newpass@123', confirmPassword: 'newpass@123' });
    expect(res.status).toBe(200);

    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'delivery.teacher@example.com', password: 'newpass@123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(false);
  });

  test('a token is single-use', async () => {
    const res = await api()
      .post('/api/auth/reset-password')
      .send({ token: rawResetToken, newPassword: 'again@123', confirmPassword: 'again@123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already been used/i);
  });

  test('an unknown token is rejected', async () => {
    const res = await api()
      .post('/api/auth/reset-password')
      .send({ token: 'f'.repeat(64), newPassword: 'x@123456', confirmPassword: 'x@123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid reset link/i);
  });

  test('an expired token is rejected', async () => {
    // Plant a token with a past expiry directly in the DB.
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    await query(
      `INSERT INTO password_reset_tokens ("userId", "tokenHash", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, NOW() - INTERVAL '1 hour', NOW(), NOW())`,
      [teacherId, hash]
    );

    const res = await api()
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: 'x@123456', confirmPassword: 'x@123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });
});

describe('resend credentials', () => {
  test('resend without a new password sends a reset-link-only message', async () => {
    const res = await api()
      .post(`/api/admin/teachers/${teacherId}/resend-credentials`)
      .set(auth(adminToken))
      .send({ deliveryChannels: ['sms'] });
    expect(res.status).toBe(200);
    const { delivery } = res.body.data;
    expect(delivery.sms.ok).toBe(true);
    expect(delivery.sms.demoMessage).not.toContain('Temp password');
    expect(delivery.sms.demoMessage).toContain('/reset-password?token=');
    expect(delivery.email.attempted).toBe(false);
  });

  test('resend with a new temp password resets it and flags must-change', async () => {
    const res = await api()
      .post(`/api/admin/teachers/${teacherId}/resend-credentials`)
      .set(auth(adminToken))
      .send({ deliveryChannels: ['email', 'sms'], newTempPassword: 'fresh@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.delivery.sms.demoMessage).toContain('Temp password: fresh@123');

    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'delivery.teacher@example.com', password: 'fresh@123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);
  });

  test('resend requires at least one channel', async () => {
    const res = await api()
      .post(`/api/admin/teachers/${teacherId}/resend-credentials`)
      .set(auth(adminToken))
      .send({ deliveryChannels: [] });
    expect(res.status).toBe(400);
  });

  test('resend is admin-only', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'delivery.teacher@example.com', password: 'fresh@123' });
    const res = await api()
      .post(`/api/admin/teachers/${teacherId}/resend-credentials`)
      .set(auth(login.body.data.token))
      .send({ deliveryChannels: ['email'] });
    expect(res.status).toBe(403);
  });
});
