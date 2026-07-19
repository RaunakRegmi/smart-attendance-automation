// Isolated SMS sender behind a generic send(to, message) interface.
//   SMS_PROVIDER=demo (default) — validates + normalizes the number, "sends"
//     by logging to the console and returning the message in the result (so
//     the flow is fully testable with no credentials or network).
//   SMS_PROVIDER=sparrow — reserved for the future real Sparrow SMS
//     integration (SPARROW_SMS_TOKEN / SPARROW_SMS_FROM in .env.example);
//     deliberately not implemented yet.
// Used ONLY for teacher credential delivery. Student notifications stay
// in-app and must never route through here.

const PROVIDER = () => (process.env.SMS_PROVIDER || 'demo').toLowerCase();

// Normalize a Nepali mobile number to +9779XXXXXXXXX.
// Accepts: 98XXXXXXXX / 97XXXXXXXX / 96XXXXXXXX (10 digits), with optional
// +977 / 977 / 00977 prefix, tolerating spaces and dashes.
const normalizeNepaliMobile = (raw) => {
  if (!raw) return null;
  let digits = String(raw).replace(/[\s-]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00977')) digits = digits.slice(5);
  else if (digits.startsWith('977')) digits = digits.slice(3);
  if (!/^9[678]\d{8}$/.test(digits)) return null;
  return `+977${digits}`;
};

// Returns { ok, provider, to?, error?, demoMessage? } — never throws.
const send = async (to, message) => {
  const provider = PROVIDER();
  try {
    const normalized = normalizeNepaliMobile(to);
    if (!normalized) {
      return { ok: false, provider, error: `Invalid Nepali mobile number: "${to || ''}"` };
    }
    if (provider === 'demo') {
      console.log(
        `\n[smsService:demo] ────────────────────────────────\n` +
          `To:  ${normalized}\n` +
          `Msg: ${message}\n` +
          `───────────────────────────────────────────────\n`
      );
      return { ok: true, provider, to: normalized, demoMessage: message };
    }
    if (provider === 'sparrow') {
      // FUTURE SCOPE: real Sparrow SMS integration drops in here without
      // touching any callers. Until then, fail loudly rather than pretend.
      return { ok: false, provider, to: normalized, error: 'Sparrow SMS provider not implemented yet (use SMS_PROVIDER=demo)' };
    }
    return { ok: false, provider, error: `Unknown SMS_PROVIDER "${provider}"` };
  } catch (error) {
    console.error('[smsService] send failed:', error.message);
    return { ok: false, provider, error: error.message };
  }
};

module.exports = { send, normalizeNepaliMobile };
