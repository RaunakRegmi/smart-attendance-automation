# Session Context — QR Attendance System

## Goal
Replace the Google Sheets-based attendance system with a dynamic QR-code-based attendance system where teachers create time-limited QR sessions, students scan to mark attendance, and the system handles session management, late requests, notifications, and reporting.

## Constraints & Preferences
- Teachers log in at the same `/login` page; role-based redirect sends ADMIN→`/dashboard`, TEACHER→`/teacher`, STUDENT→`/student`
- Lecturers page matches student page patterns (table, modal form, pagination)
- Multi-select dropdown supports search/filter, previews selected items as styled chips consistent with system theme (`$primary: #1A3A5C`, `$primary-light: #EDF2F7`, `$radius-sm: 8px`)
- Subject assignment uses `Subject.lecturerId` FK (one lecturer per subject, but lecturer can have many subjects)
- Existing Teacher Accounts menu (`/api/admin/teachers`) stays untouched
- Auto-created teacher accounts have `mustChangePassword: true`; default password `teacher@123`
- All new teacher account emails must be unique; reject duplicates with error message
- QR sessions: JWT-based unique token, valid 5 seconds, auto-refresh invalidating old QR
- Teachers only access their own classes/students/subjects via `TeacherAssignment` + `teacherScopeService`
- Admin has full access to all data
- Students get feedback on attendance success/failure; duplicate attendance prevented with clear response
- Students notified on session start/end with exact timestamps
- After session closes, students can request late attendance with mandatory remarks; lecturer approves (Present/Late) or rejects (Absent)
- Subject must be linked to batch>>section so enrolled students can be identified
- Session history paginated like other modules, showing creator + enrolled students
- Attendance reports same format but teacher-scoped vs admin-full
- Remove all Google Sheets sync, scheduler, sheet sync jobs for attendance
- QR code display uses `api.qrserver.com` free API to render JWT token as scannable QR image (280×280px), with raw token as monospace fallback

## Progress
### Done
- Cloned repo, cleaned up Docker, built and started all 6 services
- Fixed backend crash (`keys.example.json` → `keys.json`)
- All services confirmed healthy: Backend (5001), Admin (4200), Chatbot (8000), DB (5436), Redis (6380), Ollama (11434)
- **Backend lecturerController.js**: `createLecturer` auto-creates `User(role: TEACHER)` + assigns subjects; `updateLecturer` handles account updates, password changes, subject reassignment; `getLecturers` includes `subjects[]`, `hasAccount`, `mustChangePassword`, `accountActive`; `getAllSubjects` endpoint; `resendLecturerCredentials` endpoint with delivery channels
- **Backend lecturerRoutes.js**: Full routes with `/subjects/all`, CRUD, `/:id/resend-credentials`
- **Frontend Lecturer interface**: `mustChangePassword?`, `accountActive?`, `userId?` fields added
- **Frontend lecturer.service.ts**: `getAllSubjects()`, `resendCredentials()`, typed create/update payloads with `LecturerCreatePayload`, `ResendPayload`
- **Multi-select component**: Reusable Angular component with search, keyboard navigation, chips, click-outside-to-close (capture-phase listener to bypass modal `stopPropagation`), `position: absolute` dropdown
- **Lecturers page**: Table with Name, Email, Contact, Subjects (chip display), Account (Active/Deactivated/Temp password badges), Actions (Edit, Delete, Resend credentials)
- **Add Lecturer modal**: Personal info, Teacher Account (email, password with Generate button, Send credentials checkbox), Assigned Subjects (multi-select)
- **Edit Lecturer modal**: Same sections; password reset field (leave blank to keep current); subjects with saved vs draft state tracking (`savedSubjectIds` + `savedSubjectsMap`)
- **Resend credentials modal**: Email channel checkbox, optional new password, delivery result display
- **Delivery result modal**: Shows email sent/failed/demo status
- Bug fix: `Object.keys(userUpdates.length)` → `Object.keys(userUpdates).length` in updateLecturer
- Password reset auto-email feature was implemented then **reverted** per user request
- **Step 1: Google Sheets removal COMPLETE**: Removed Sheets model, SyncJob model, schedulerService, sheetsService, syncScheduler, googleSheetsIntegration, sheetRepository, googleAuthMiddleware, BullMQ queues (sheetSyncQueue, sheetAppendQueue), workers (sheetSyncWorker, sheetAppendWorker), sheetsController, syncController, sheetsRoutes, syncRoutes. Updated index.js, studentController, attendanceController, sectionController, batchController, restoreController, teacherController (comments), swagger.js. Removed frontend: sheets feature directory, SheetsService, syncService, SyncJobs/Scheduler components, all Sheets-related routes in app.routes.ts, Sheets-related navigation items, SheetRecord/SyncJob/QueueStatus interfaces. Replaced Sheets icons with Routine icons. Rebuilt and verified backend + admin containers.
- **Step 2: Subject-Section linking COMPLETE**: Added `batchId` (UUID) and `sectionId` (UUID) fields to Subject model with FK associations to Batch and Section. Created migration `20260722000000-add-section-to-subjects.js`.
- **Step 3: QR Session model COMPLETE**: Created `QRSession.js` model (id, createdBy, sectionId, subjectId, classType, date, startTime, endTime, sessionToken, isActive, expiresAt) and migration `20260722000001-create-qr-sessions.js`. Associations: belongsTo User(as 'creator'), Section, Subject.
- **Step 4: AttendanceSession model COMPLETE**: Created `AttendanceSession.js` model (id, qrSessionId, studentId, status, scannedAt, source) and migration `20260722000002-create-attendance-sessions.js`. Unique constraint on [qrSessionId, studentId].
- **Step 5: AttendanceRequest model COMPLETE**: Created `AttendanceRequest.js` model (id, qrSessionId, studentId, remarks, status, decidedBy, decidedAt) and migration `20260722000003-create-attendance-requests.js`.
- **Step 6: Model associations + routes registered in index.js**: Added QRSession, AttendanceSession, AttendanceRequest imports, associations (QRSession↔User/Section/Subject, AttendanceSession↔QRSession/Student, AttendanceRequest↔QRSession/Student/User), mounted qrSessionRoutes at `/api/qr-sessions`.
- **Step 7: Student scan endpoint COMPLETE**: `scanAttendance` in qrSessionController — validates JWT token (5s TTL), checks session active, checks student enrollment, prevents duplicates, determines Present/Late by 5-minute threshold.
- **Step 8: Session history COMPLETE**: `getSessionHistory` — paginated with creator info, scan count summaries (present/late/absent). Teachers scoped to own sessions; ADMIN sees all.
- **Step 9: Late attendance request flow COMPLETE**: `submitLateRequest` (student), `getPendingRequests` (teacher), `decideRequest` (teacher approve/reject). Approval creates AttendanceSession; rejection marks Absent.
- **Step 10: Notifications COMPLETE**: `createSession` sends info notifications to enrolled students. `closeSession` sends info (scanned students) or warning (absent students) notifications. Uses Notification.bulkCreate wrapped in try/catch.
- **Step 11: Teacher frontend COMPLETE**: `teacher-attendance.component.ts/html` completely rewritten with 3 tabs (Create Session, Session History, Late Requests). `qr-session.service.ts` created with all API methods. Added QRSession/AttendanceSession/AttendanceRequest interfaces to api.models.ts. Auto-refresh QR every 5 seconds. QR rendered via `api.qrserver.com` API.
- **Step 12: Student frontend COMPLETE**: Student portal added to Angular app with `studentGuard`, `/student` routes, `student-layout.component`, `student-attendance.component` (QR token input + late request form), `student-profile.component`, `student-portal-api.service.ts`. Login redirects STUDENT role to `/student`.
- **Step 14: Rebuild backend + admin containers**: Both rebuilt and running. Backend healthy, migrations ran successfully.
- **ID type fixes**: User.id (INTEGER), Subject.id (INTEGER), Student.id (INTEGER) — fixed createdBy, decidedBy, subjectId, studentId in models + migrations to use INTEGER instead of UUID.
- **Duplicate association fix**: Removed duplicate Subject↔Batch/Section and QR/Attendance associations from index.js (kept model-file definitions). Backend running cleanly.

### In Progress
- Step 13: Update attendance reports (teacher-scoped vs admin-full)

### Blocked
- (none)

## Key Decisions
- Subject assignment uses existing `Subject.lecturerId` FK rather than a join table
- Auto-created accounts always have `mustChangePassword: true`
- Multi-select built as standalone Angular component (no library) for full theme control
- Click-outside uses `document.addEventListener('click', handler, true)` (capture phase) because modal's `stopPropagation` blocks bubbling
- Dropdown uses `position: absolute` (not fixed) so it scrolls naturally with modal content
- Saved vs draft subject state: `savedSubjectsMap` stores DB state per lecturer; `cancelModal()` reverts `selectedSubjectIds` to `savedSubjectIds`
- QR sessions use JWT tokens with 5-second TTL, auto-refreshing via `setInterval` every 5s
- `TeacherAssignment` model (teacherUserId + sectionId + subjectId) is the backbone of teacher row-level scoping
- QR code display uses free `api.qrserver.com` API rather than local QR generation (no npm packages needed)
- Student portal embedded in Angular admin app (not just Flutter) so web-based QR scanning works
- `LATE_THRESHOLD_MINUTES = 5` — students scanning within 5 min of session start = Present, after = Late
- Notifications use try/catch wrapping to prevent notification failures from blocking main operations
- All associations defined in model files (not index.js) to avoid duplicate alias errors
- `scheduleRoutes.js` and `scheduleController.js` still exist (schedule/routine functionality preserved)

## Next Steps
- **Update attendance reports**: Modify reportsController to support teacher-scoped reports using TeacherAssignment + teacherScopeService. Teachers see only their sections/subjects; admins see all.
- **Final rebuild and E2E test**: Rebuild all services, test QR session creation → scan → close → late request flow end-to-end

## Critical Context
- Teacher login: `teacher1@example.com` / `teacher@123`; Admin: `admin@example.com` / `admin@123`
- `TeacherAssignment` model: `teacherUserId` (FK users), `sectionId` (FK sections), `subjectId` (FK subjects), `isActive` — backbone of teacher scoping
- `teacherScopeService` enforces row-level scoping for teacher endpoints
- `Attendance` model (legacy): `studentId`, `subjectId`, `date`, `status`, `sheetId`, unique index on `[studentId, subjectId, date]` — still exists for Excel upload path
- `Subject` model now has: `id`, `subjectCode`, `subjectName`, `lecturerId`, `batchId`, `sectionId`
- New models: `QRSession` (table: qrsessions), `AttendanceSession` (table: attendance_sessions), `AttendanceRequest` (table: attendance_requests)
- `knowledgeRefreshService` triggers on Subject/Student/Attendance CRUD hooks
- `notificationService` has `getUserNotifications`, `markAsRead`, `createNotification` static methods
- `smsService` and `emailService` available for notifications
- Angular admin app uses signals, standalone components, reactive forms
- Student portal is also a separate Flutter app at `AttendX/student/`
- Backend JWT_SECRET from env var `JWT_SECRET`
- Docker services: backend (5001), admin (4200), chatbot (8000), db (5436), redis (6380), ollama (11434)
- Migrations for QR models: `20260722000001-create-qr-sessions.js`, `20260722000002-create-attendance-sessions.js`, `20260722000003-create-attendance-requests.js`

## Relevant Files
- `AttendX/backend/src/controllers/lecturerController.js`: Fully rewritten — lecturer CRUD with auto teacher account, subject assignment, resend credentials
- `AttendX/backend/src/routes/lecturerRoutes.js`: Fully rewritten — all lecturer routes
- `AttendX/backend/src/controllers/qrSessionController.js`: NEW — 9 endpoints for QR session management, scan, late requests (534 lines)
- `AttendX/backend/src/routes/qrSessionRoutes.js`: NEW — routes for all QR session endpoints
- `AttendX/backend/src/controllers/attendanceController.js`: Cleaned — Google Sheets imports/funcs removed, dashboard updated
- `AttendX/backend/src/controllers/teacherController.js`: Comments updated to reflect QR-based attendance
- `AttendX/backend/src/controllers/studentController.js`: Cleaned — sheetAppendQueue removed
- `AttendX/backend/src/controllers/sectionController.js`: Cleaned — Sheets model reference removed
- `AttendX/backend/src/controllers/batchController.js`: Cleaned — Sheets model reference removed
- `AttendX/backend/src/controllers/restoreController.js`: Cleaned — Sheets import removed
- `AttendX/backend/src/models/QRSession.js`: NEW — QR session model
- `AttendX/backend/src/models/AttendanceSession.js`: NEW — attendance scan records
- `AttendX/backend/src/models/AttendanceRequest.js`: NEW — late attendance requests
- `AttendX/backend/src/models/Subject.js`: Updated — added batchId/sectionId fields and associations
- `AttendX/backend/src/models/Attendance.js`: Legacy model (still exists for Excel upload)
- `AttendX/backend/src/models/TeacherAssignment.js`: Teacher-section-subject mapping (reference)
- `AttendX/backend/src/models/Lecturer.js`: Has `userId` FK
- `AttendX/backend/src/models/User.js`: Bcrypt password hashing
- `AttendX/backend/src/services/teacherScopeService.js`: Row-level scoping (to reuse for reports)
- `AttendX/backend/src/services/notificationService.js`: `getUserNotifications`, `markAsRead`, `createNotification`
- `AttendX/backend/src/config/swagger.js`: Cleaned — SyncJob/QueueStatus/SchedulerStatus schemas removed
- `AttendX/backend/src/index.js`: Updated — removed all Google Sheets refs, added QR model imports/associations, mounted qrSessionRoutes
- `AttendX/backend/src/migrations/20260722000000-add-section-to-subjects.js`: NEW — adds batchId/sectionId to subjects
- `AttendX/backend/src/migrations/20260722000001-create-qr-sessions.js`: NEW (fixed INTEGER types)
- `AttendX/backend/src/migrations/20260722000002-create-attendance-sessions.js`: NEW (fixed INTEGER types)
- `AttendX/backend/src/migrations/20260722000003-create-attendance-requests.js`: NEW (fixed INTEGER types)
- `AttendX/admin/src/app/features/teacher/attendance/teacher-attendance.component.ts`: REWRITTEN — 3-tab QR attendance UI
- `AttendX/admin/src/app/features/teacher/attendance/teacher-attendance.component.html`: REWRITTEN — QR display, history, requests
- `AttendX/admin/src/app/core/services/qr-session.service.ts`: NEW — API service for QR sessions
- `AttendX/admin/src/app/core/services/student-portal-api.service.ts`: NEW — student scan/late-request API
- `AttendX/admin/src/app/core/models/api.models.ts`: Updated — added QRSession, AttendanceSession, AttendanceRequest interfaces; removed SheetRecord, SyncJob, QueueStatus
- `AttendX/admin/src/app/app.routes.ts`: Updated — added /student routes, removed sheets/jobs routes
- `AttendX/admin/src/app/layout/admin-layout/admin-layout.component.ts`: Updated — removed Sheets/Background jobs nav, added Routine icons
- `AttendX/admin/src/app/layout/admin-layout/admin-layout.component.scss`: Updated — removed sheets/sync/scheduler icons, added routine icons
- `AttendX/admin/src/app/layout/admin-layout/admin-layout.component.html`: Updated — removed /sheets route reference
- `AttendX/admin/src/app/features/auth/login/login.component.ts`: Updated — STUDENT role redirects to /student
- `AttendX/admin/src/app/layout/student-layout/student-layout.component.*`: NEW — student shell layout
- `AttendX/admin/src/app/features/student/attendance/student-attendance.component.*`: NEW — QR scan + late request UI
- `AttendX/admin/src/app/features/student/profile/student-profile.component.*`: NEW — student profile page
- `AttendX/admin/src/app/core/services/auth.service.ts`: Updated — added `isStudent` computed signal
- `AttendX/admin/src/app/core/guards/auth.guard.ts`: Updated — added `studentGuard`
- `AttendX/admin/src/app/features/students/students.component.ts`: Updated — replaced SheetsService with HttpClient for Excel upload
- `AttendX/admin/src/app/features/sections/sections.component.html`: Updated — removed "sheets" from delete message
- `AttendX/admin/src/app/features/batches/batches.component.html`: Updated — removed "sheets" from delete message
- `AttendX/admin/src/styles/_variables.scss`: Theme variables
- `docker-compose.yml`: 6 services (backend, admin, chatbot, db, redis, ollama)
