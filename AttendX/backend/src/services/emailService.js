// Isolated email sender, env-configured and provider-swappable.
//   MAIL_PROVIDER=demo (default) — logs the email to the console, no network.
//   MAIL_PROVIDER=smtp           — nodemailer over SMTP_HOST/PORT/USER/PASS.
// Used ONLY for teacher credential delivery / password reset. Student
// notifications stay in-app and must never route through here.

const PROVIDER = () => (process.env.MAIL_PROVIDER || 'demo').toLowerCase();

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    // Lazy require + lazy init so demo mode needs neither the dependency
    // configured nor SMTP credentials present.
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

// Returns { ok, provider, error?, demo? } — never throws into the request flow.
const send = async (to, subject, html) => {
  const provider = PROVIDER();
  try {
    if (!to) {
      return { ok: false, provider, error: 'No recipient email address' };
    }
    if (provider === 'demo') {
      console.log(
        `\n[emailService:demo] ──────────────────────────────\n` +
          `To:      ${to}\n` +
          `From:    ${process.env.MAIL_FROM || 'AttendX <no-reply@attendx.local>'}\n` +
          `Subject: ${subject}\n` +
          `${html}\n` +
          `───────────────────────────────────────────────\n`
      );
      return { ok: true, provider, demo: { to, subject } };
    }
    if (provider === 'smtp') {
      await getTransporter().sendMail({
        from: process.env.MAIL_FROM || 'AttendX <no-reply@attendx.local>',
        to,
        subject,
        html,
      });
      return { ok: true, provider };
    }
    return { ok: false, provider, error: `Unknown MAIL_PROVIDER "${provider}"` };
  } catch (error) {
    console.error('[emailService] send failed:', error.message);
    return { ok: false, provider, error: error.message };
  }
};

module.exports = { send };
