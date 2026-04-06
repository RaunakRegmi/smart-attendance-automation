const crypto = require('crypto');

function generateSecureToken(byteLength = 32) {
  // 32 bytes => 64 hex chars; safe to embed in QR as opaque token
  return crypto.randomBytes(byteLength).toString('hex');
}

module.exports = { generateSecureToken };

