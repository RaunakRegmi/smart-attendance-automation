/**
 * Socket-level outbound connection audit.
 *
 * Enabled by setting NET_AUDIT_LOG; tests/setupEnv.js requires this file when it is present.
 * Every TCP connect is appended as JSONL, which lets the Phase 1 exit criterion ("nothing
 * reached :8000, :11434, or googleapis") be measured instead of assumed.
 *
 * Deliberately observe-only: it must not change what the suite does, so nothing is blocked.
 *
 * Note: do NOT also patch dns.lookup. Reassigning it drops the util.promisify.custom symbol
 * that undici and pg depend on, which deadlocks the run rather than failing it.
 */
const net = require('net');
const fs = require('fs');

const logPath = process.env.NET_AUDIT_LOG;

if (logPath) {
  const originalConnect = net.Socket.prototype.connect;

  net.Socket.prototype.connect = function (...args) {
    const opts = typeof args[0] === 'object' && args[0] !== null ? args[0] : {};
    const host = opts.host || (typeof args[1] === 'string' ? args[1] : null);
    const port = opts.port !== undefined ? opts.port : args[0];
    try {
      fs.appendFileSync(
        logPath,
        JSON.stringify({
          pid: process.pid,
          host: host || null,
          port: port !== undefined && port !== null ? String(port) : null,
        }) + '\n'
      );
    } catch (_) {
      // never let auditing break a run
    }
    return originalConnect.apply(this, args);
  };
}
