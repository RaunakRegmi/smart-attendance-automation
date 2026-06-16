# Session Context

## Goal
Implement Phase 1: add fixed Semester model with semesterId FKs across the full stack (backend, Angular, Flutter, chatbot).

## Constraints & Preferences
- Backward compatible — all new FKs are nullable initially, existing API behavior preserved
- Current semester detected by date (startDate/endDate), not an isCurrent flag
- Auto sync skips ended semesters; manual sync always works
- Chatbot receives ALL semesters (no knowledge loss)
- Default user view = current semester; fallback = last semester during gaps
- Routine is semester-scoped (upload replaces for section + semester only)
- Backlogs/retakes excluded from Phase 1

## Progress
### Done
- Backend: Semester model (Semester.js) with fields: id, name, order, batchId, startDate, endDate
- Backend: Migration 20260613000000-create-semesters.js
- Backend: Migration 20260613000001-add-semesterId-to-tables.js (adds semesterId to sheets, attendance, routines; currentSemesterId to students)
- Backend: Semester CRUD controller + routes (semesterController.js, semesterRoutes.js)
- Backend: Updated models — Attendance.js, Sheets.js, Routine.js, Student.js — added semesterId/currentSemesterId fields
- Backend: Updated index.js — Semester imported, Attendance imported (fixed missing import), associations added, semesterRoutes registered
- Backend: Updated sheetsService.js — linkSheet() accepts semesterId, stamps on attendance during sync, AUTO sync checks semester endDate
- Backend: Updated schedulerService.js — runScheduledSync() skips sheets whose semester has ended
- Backend: Updated sheetsController.js — linkSheet handler passes semesterId from req.body
- Backend: Updated routineController.js — uploadRoutine accepts semesterId, scopes destroy/create to section+semester, getRoutine filters by semesterId
- Backend: Updated chatbotController.js — includes Semester in attendance query, adds semester/name/order to subject entries in payload
- Backend: Updated reportsController.js — added `applySemesterFilter` helper, added `semesterId` query param to section-wise, batch-wise, date-range, low-attendance, top-performers, absent-students, leaderboard, section-comparison, trend-analytics endpoints
- Backend: Updated reportsValidator.js — added `semesterId` optional field to 9 schema validators
- Backend: Updated studentPortalController.js — added `semesterId` query param + `getEffectiveSemesterId` auto-detect for dashboard, attendance summary, attendance logs, semesters list endpoint, schedule/today routine queries
- Backend: Backfill script (src/scripts/backfillSemesters.js) — assigns existing sheets/attendance/routines/students to semesters via batch + date matching
- Angular: Semester API model added to api.models.ts, SemesterService created
- Angular: Semesters management page (features/semesters/) with CRUD list + modal (create/edit) + delete confirm
- Angular: Sheets-add component — added semester dropdown after section selector
- Angular: Routine upload form — added semester dropdown
- Angular: Reports page — added semester filter dropdown for batch/section-scoped reports, updated report.service.ts with semesterId param
- Chatbot: csv_builder.py — added `semester` column to course_performance_summary.csv, grouping by (course_code, semester)
- Chatbot: rag_indexer.py — course documents include semester context in labels

### Not Needed (Phase 1)
- Flutter: Backend auto-detects current semester via `getEffectiveSemesterId` — student app shows correct data without Flutter changes

## Key Decisions
- Semester model: id (int PK), name, order (per-batch unique), batchId (FK), startDate, endDate — date-driven current detection, no isCurrent flag
- All new FKs nullable initially — backward compatibility, zero breakage on migration
- Auto sync skips ended semesters via endDate check in both schedulerService and sheetsService (syncType === 'AUTO')
- Routine upload replaces records for section + semester only (not whole section)
- Chatbot payload includes semester context per subject (semester name + order)
- Reports controller file rewritten entirely to avoid ambiguous edit-level pattern matching
- Backend semesterId filter uses `applySemesterFilter` helper function in reportsController.js
- Backfill uses date-range matching (start_date <= d <= end_date), falls back to most recent semester that started before the date

## Next Steps
1. Create semesters via admin UI for each batch
2. Run backfill script: `node src/scripts/backfillSemesters.js`
3. Trigger chatbot reindex to pick up new CSV schema
4. Verify student portal returns correct semester-scoped data

## Relevant Files
- AttendX/backend/src/models/Semester.js
- AttendX/backend/src/migrations/20260613000000-create-semesters.js
- AttendX/backend/src/migrations/20260613000001-add-semesterId-to-tables.js
- AttendX/backend/src/controllers/semesterController.js
- AttendX/backend/src/routes/semesterRoutes.js
- AttendX/backend/src/controllers/chatbotController.js
- AttendX/backend/src/services/sheetsService.js
- AttendX/backend/src/services/schedulerService.js
- AttendX/backend/src/controllers/routineController.js
- AttendX/backend/src/controllers/reportsController.js
- AttendX/backend/src/validators/reportsValidator.js
- AttendX/backend/src/controllers/studentPortalController.js
- AttendX/backend/src/index.js
- AttendX/backend/src/scripts/backfillSemesters.js
- AttendX/backend/src/models/Attendance.js
- AttendX/backend/src/models/Sheets.js
- AttendX/backend/src/models/Routine.js
- AttendX/backend/src/models/Student.js
- AttendX/admin/src/app/core/models/api.models.ts
- AttendX/admin/src/app/core/services/semester.service.ts
- AttendX/admin/src/app/core/services/report.service.ts
- AttendX/admin/src/app/features/semesters/semesters.component.ts
- AttendX/admin/src/app/features/sheets/sheets-add/sheets-add.component.ts
- AttendX/admin/src/app/features/routines/routines-add/routines-add.component.ts
- AttendX/admin/src/app/features/reports/reports.component.ts
- Chatbot/csv_builder.py
- Chatbot/rag_indexer.py
