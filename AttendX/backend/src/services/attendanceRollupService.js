/**
 * Rolls QR attendance forward into the table the rest of the system reads.
 *
 * QR scans land in `attendance_sessions`, which is read only by the QR endpoints
 * themselves.  Every report, both dashboards, the at-risk queries, the weekly
 * report and the chatbot's RAG index read the separate `attendance` table.
 * Without this roll-up a scan is recorded but invisible — no percentage moves.
 *
 * Conflict rules, both of which reduce to an unconditional upsert:
 *   - Two sessions for the same subject on the same day (a Lecture and a
 *     Tutorial): `attendance` is unique on (studentId, subjectId, date), so there
 *     is exactly one slot per day and the later roll-up wins.
 *   - A day already filled by an Excel upload or a Sheets sync: QR wins, on the
 *     grounds that a live scan outranks a hand-maintained sheet.
 *
 * The upsert clears `sheetId`, because once QR has overwritten the status the row
 * is no longer derived from that sheet and shouldn't claim to be.
 *
 * Refreshing the chatbot index is handled by the `afterUpsert` hook on the
 * Attendance model (debounced), not here.
 */
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const QRSession = require('../models/QRSession');

/**
 * Copy every recorded scan for one QR session into `attendance`.
 *
 * Idempotent — re-running produces the same rows, so a failed or partial run is
 * repaired by simply calling it again (see utils/backfillQrAttendance.js).
 *
 * @param {string} qrSessionId
 * @param {{ transaction?: import('sequelize').Transaction }} [options]
 * @returns {Promise<{ qrSessionId: string, subjectId: number, date: string, written: number }>}
 */
async function rollupSession(qrSessionId, options = {}) {
  const { transaction = null } = options;

  const session = await QRSession.findByPk(qrSessionId, { transaction });
  if (!session) {
    throw Object.assign(new Error('QR session not found'), { statusCode: 404 });
  }

  const scans = await AttendanceSession.findAll({
    where: { qrSessionId },
    attributes: ['studentId', 'status'],
    transaction,
  });

  for (const scan of scans) {
    await Attendance.upsert(
      {
        studentId: scan.studentId,
        subjectId: session.subjectId,
        date: session.date,
        status: scan.status,
        sheetId: null,
      },
      { transaction }
    );
  }

  return {
    qrSessionId,
    subjectId: session.subjectId,
    date: session.date,
    written: scans.length,
  };
}

module.exports = { rollupSession };
