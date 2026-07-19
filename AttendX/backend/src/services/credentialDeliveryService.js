const crypto = require('crypto');
const PasswordResetToken = require('../models/PasswordResetToken');
const emailService = require('./emailService');
const smsService = require('./smsService');

const APP_NAME = 'AttendX';
const RESET_TOKEN_TTL_HOURS = Number(process.env.RESET_TOKEN_TTL_HOURS || 48);

const baseUrl = () => (process.env.APP_BASE_URL || 'http://localhost:4200').replace(/\/+$/, '');
const loginUrl = () => `${baseUrl()}/login`;
const resetUrl = (rawToken) => `${baseUrl()}/reset-password?token=${rawToken}`;

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

// Issue a fresh single-use token for the user. Only the hash is stored; the
// raw token goes into the delivered link and is never logged or persisted.
const issueResetToken = async (userId) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.create({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000),
  });
  return rawToken;
};

const buildEmailHtml = ({ name, email, tempPassword, rawToken }) => {
  const passwordBlock = tempPassword
    ? `<p><strong>Login email:</strong> ${email}<br/><strong>Temporary password:</strong> ${tempPassword}</p>
       <p>Please change this password after your first login.</p>`
    : `<p><strong>Login email:</strong> ${email}</p>
       <p>Use the link below to set your password.</p>`;
  return (
    `<p>Dear ${name || 'Teacher'},</p>
     <p>Your ${APP_NAME} teacher account is ready.</p>
     ${passwordBlock}
     <p><a href="${loginUrl()}">Open the login page</a><br/>
     <a href="${resetUrl(rawToken)}">Set / reset your password</a> (link expires in ${RESET_TOKEN_TTL_HOURS} hours)</p>
     <p>— ${APP_NAME}</p>`
  );
};

const buildSms = ({ email, tempPassword, rawToken }) => {
  const pwPart = tempPassword ? ` Temp password: ${tempPassword}.` : '';
  return (
    `${APP_NAME}: Your teacher account is ready. Login: ${loginUrl()} (email: ${email}).${pwPart}` +
    ` Set password: ${resetUrl(rawToken)} (expires ${RESET_TOKEN_TTL_HOURS}h)`
  );
};

// Compose + dispatch credentials on the chosen channels.
//   user: { id, email, phone }, name: display name,
//   tempPassword: plaintext temp password to include, or null (reset-link-only),
//   channels: array subset of ['email', 'sms'].
// Account creation and delivery are decoupled: this returns per-channel
// status and never throws — a failed SMS must not roll back the account.
const deliverCredentials = async ({ user, name, tempPassword, channels }) => {
  const wanted = Array.isArray(channels) ? channels.map((c) => String(c).toLowerCase()) : [];
  const result = {
    email: { attempted: false, ok: false },
    sms: { attempted: false, ok: false },
  };
  if (!wanted.length) return { delivery: result, rawToken: null };

  const rawToken = await issueResetToken(user.id);
  const payload = { name, email: user.email, tempPassword: tempPassword || null, rawToken };

  if (wanted.includes('email')) {
    result.email.attempted = true;
    if (!user.email) {
      result.email.error = 'No email address on record';
    } else {
      const sent = await emailService.send(
        user.email,
        `Your ${APP_NAME} teacher account`,
        buildEmailHtml(payload)
      );
      result.email = { attempted: true, ...sent };
    }
  }

  if (wanted.includes('sms')) {
    result.sms.attempted = true;
    if (!user.phone) {
      result.sms.error = 'No phone number on record';
    } else {
      const sent = await smsService.send(user.phone, buildSms(payload));
      result.sms = { attempted: true, ...sent };
    }
  }

  return { delivery: result, rawToken };
};

module.exports = {
  RESET_TOKEN_TTL_HOURS,
  issueResetToken,
  hashToken,
  deliverCredentials,
};
