/**
 * One-off (and safely repeatable) backfill of QR attendance into `attendance`.
 *
 * Every QR session closed before the roll-up existed left its scans stranded in
 * `attendance_sessions`, invisible to the reports. This republishes them.
 *
 * Sessions are processed oldest-first so the "last session wins" rule still
 * holds: where two sessions share a subject and a date, the later one is written
 * last and therefore ends up in the single available slot.
 *
 * Usage:
 *   npm run backfill:qr           # apply
 *   npm run backfill:qr -- --dry  # report what would change, write nothing
 */
require('dotenv').config();

const sequelize = require('../config/database');
require('../associations');

const QRSession = require('../models/QRSession');
const AttendanceSession = require('../models/AttendanceSession');
const { rollupSession } = require('../services/attendanceRollupService');

const DRY_RUN = process.argv.includes('--dry');

async function backfill() {
  try {
    await sequelize.authenticate();
    console.log(`Connected. ${DRY_RUN ? 'DRY RUN — nothing will be written.' : 'Applying roll-up.'}`);

    // Only closed sessions: an open one hasn't had its Absent back-fill run yet,
    // so publishing it now would record non-scanners as attending nothing.
    const sessions = await QRSession.findAll({
      where: { isActive: false },
      attributes: ['id', 'subjectId', 'date', 'startTime'],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });

    if (sessions.length === 0) {
      console.log('No closed QR sessions found. Nothing to do.');
      return;
    }
    console.log(`Found ${sessions.length} closed session(s).`);

    let published = 0;
    let skipped = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        if (DRY_RUN) {
          const count = await AttendanceSession.count({ where: { qrSessionId: session.id } });
          if (count === 0) {
            skipped++;
            continue;
          }
          console.log(`  would publish ${count} record(s) — session ${session.id} (subject ${session.subjectId}, ${session.date})`);
          published += count;
          continue;
        }

        const { written } = await rollupSession(session.id);
        if (written === 0) {
          skipped++;
          continue;
        }
        console.log(`  published ${written} record(s) — session ${session.id} (subject ${session.subjectId}, ${session.date})`);
        published += written;
      } catch (err) {
        failed++;
        console.error(`  FAILED session ${session.id}: ${err.message}`);
      }
    }

    console.log(
      `\nDone. ${published} attendance record(s) ${DRY_RUN ? 'would be ' : ''}published, ` +
      `${skipped} session(s) had no scans, ${failed} failed.`
    );
  } catch (err) {
    console.error('Backfill aborted:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

backfill();
