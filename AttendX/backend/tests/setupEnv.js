/**
 * `setupFiles` entry — runs in every worker, for every project, before the test framework and
 * before any src/ module is required. This is what guarantees src/config/database.js reads the
 * pinned DB_HOST/DB_PORT rather than whatever the repo .env happens to contain.
 */
require('./testEnv').apply();

// Opt-in socket audit: `NET_AUDIT_LOG=/path/to/log.jsonl npm test` records every outbound TCP
// connection and DNS lookup made by the suite. Used to verify the "zero outbound network"
// criterion. Loading it here rather than via NODE_OPTIONS is deliberate — a --require preload
// applies to Jest's parent process too and deadlocks its worker handshake.
if (process.env.NET_AUDIT_LOG) {
  require('./helpers/netAudit');
}
