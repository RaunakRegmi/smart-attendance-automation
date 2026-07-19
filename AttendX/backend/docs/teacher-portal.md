# Teacher Portal & Async Messaging

Added on branch `feature/teacher-portal`. AttendX now has three roles sharing one backend:
**student** (mobile), **teacher** (web), **admin** (web).

## Concepts

- **Teacher = a `users` row with `role = 'TEACHER'`.** Admin-created (`POST /api/admin/teachers`),
  same login endpoint/JWT flow as everyone else, `mustChangePassword` set until the first
  password change.
- **`lecturers` stays loginless reference data.** A lecturer row can be *explicitly* linked to a
  teacher login via the new nullable `lecturers.userId` (admin action — never auto-matched by
  email). `subjects.lecturerId` (who teaches a subject, reference data) is a separate concept
  from `teacher_assignments` (which login-teacher is scoped to which class).
- **`teacher_assignments` is the scoping backbone**: `(teacherUserId, sectionId, subjectId)`
  unique triples, soft-deactivated on removal (re-adding reactivates). Every teacher-facing
  query filters through `teacherScopeService.getAssignedScope()` — server-side, never the UI.
- **Messaging is async only**: send → unread count rises → recipient reads/replies later.
  No websockets/presence. Unread = messages newer than the participant's `lastReadAt`.
  Tables are `message_threads` / `message_thread_participants` / `thread_messages`
  (NOT `conversations` — that name belongs to the AI chatbot's memory).
- **Notifications ride the same plumbing**: an `ADMIN_BROADCAST` thread whose first message is
  `isSystem = true`; per-recipient read tracking comes from each participant's `lastReadAt`.
  The pre-existing `notifications` table remains student-only and untouched.
- **Oversight (child-safety design)**: student↔teacher threads are never private from the
  institution. Admins get a read-only transcript view (`/api/admin/oversight/...`), cannot post
  into those threads, and every oversight view is written to `audit_logs`.
- **Attendance is READ-ONLY for teachers in v1.** Attendance originates from the Google Sheets
  sync / Excel upload; a direct DB write would be overwritten by the next sync.
  `POST /api/teacher/attendance` exists as a documented 501 stub (reserved extension point);
  the portal shows a disabled "Mark attendance (coming soon)" action.
- **Routine matching caveat**: `routines.subjectCode` is free text with no FK. When a code in an
  assigned section resolves to no subject, the row is **surfaced** (dashboard
  `unresolvedRoutines` + a server warning log) — never silently dropped.

## Permissions matrix

| Resource | Student | Teacher | Admin |
|---|---|---|---|
| Own attendance / dashboard (mobile) | ✅ | — | — |
| Teacher dashboard / classes / roster | — | ✅ assigned classes only | ❌ (admin has own console) |
| Attendance records | own only | read-only, assigned classes only | ✅ full (existing) |
| Mark/edit attendance | — | ❌ 501 stub (future scope) | via sheets/Excel (existing) |
| Reports | own (mobile) | assigned subjects/sections only | ✅ full (existing) |
| At-risk lists | — | assigned classes only | via existing reports |
| Teacher account management | — | — | ✅ (deactivate only, no hard delete) |
| Class assignments | — | read own | ✅ manage |
| Message a teacher | ✅ own subject teachers, subject context required | — | — |
| Message a student | — | ✅ own students, subject context required | ❌ |
| Admin ↔ teacher direct thread | — | ✅ | ✅ |
| Compose teacher notifications | — | — | ✅ one/group/all + read status |
| Reply to a notification | — | ❌ one-way | creator only |
| Student↔teacher thread transcripts | participant | participant | ✅ read-only, audit-logged |
| Student↔student, teacher↔teacher DMs | ❌ | ❌ | ❌ |

## New endpoints (all documented in Swagger at `/api-docs`)

- `GET /api/teacher/{dashboard,classes,attendance,reports,at-risk,notifications,profile}`,
  `PUT /api/teacher/profile`, `POST /api/teacher/attendance` (501 stub),
  `GET /api/teacher/classes/:sectionId/:subjectId/students`
- `GET /api/messages/{contacts,unread-count,threads}`, `POST /api/messages/threads`,
  `GET|POST /api/messages/threads/:id`, `POST /api/messages/threads/:id/read`
- `GET|POST /api/admin/teachers`, `PUT|DELETE /api/admin/teachers/:id`,
  `GET|POST /api/admin/teachers/:id/assignments`, `DELETE .../assignments/:assignmentId`
- `GET|POST /api/admin/notifications`, `GET /api/admin/notifications/:id/read-status`
- `GET /api/admin/oversight/threads`, `GET /api/admin/oversight/threads/:id`

Audit events written (attributed rows in `audit_logs.audit_event_type`):
`teacher.created/updated/deactivated/profile_updated`, `teacher.lecturer_linked`,
`assignment.added/removed`, `notification.sent`, `thread.created`, `message.sent`,
`thread.read`, `oversight.viewed`.

## Migrations & rollback plan

All five are additive and reversible (`npx sequelize-cli db:migrate:undo` walks back in order):

| Migration | Up | Down |
|---|---|---|
| `20260718000000-add-teacher-to-users-role` | `ALTER TYPE enum_users_role ADD VALUE 'TEACHER'` (guarded) | ⚠️ PG cannot drop enum values — documented no-op warning (same precedent as the `Late` status migration). Harmless to leave in place; no data touched. |
| `20260718000100-add-mustChangePassword-to-users` | add boolean col, default false | drops the column |
| `20260718000200-add-userId-to-lecturers` | add nullable FK + index | drops the column |
| `20260718000300-create-teacher-assignments` | new table + unique/lookup indexes | drops the table |
| `20260718000400-create-message-threads` | 3 new tables + indexes | drops the 3 tables |

Full rollback: `npx sequelize-cli db:migrate:undo` × 5. Existing tables/columns are never
altered or dropped; existing endpoints and payloads are unchanged.

## Running

```bash
# Backend (from AttendX/backend)
npm install
npm run migrate          # applies the 5 new migrations
npm run seed             # admin + demo teachers (teacher1/2@example.com / teacher@123)
npm start

# Tests (needs a reachable Postgres; uses/creates attendance_db_test, no Redis needed)
npm test

# Web (from AttendX/admin) — teacher portal lives at /teacher in the same app
npm start                # teachers log in on the same login page and are routed to /teacher

# Flutter (from AttendX/student) — Messages icon in the dashboard app bar
flutter run
```

Environment: `DISABLE_BACKGROUND_JOBS=true` skips the scheduler + BullMQ workers (used by tests/CI).

## Addendum: teacher credential delivery (email / SMS)

When an admin creates a teacher (or resends credentials), AttendX can deliver
the login URL + temporary password + a single-use set-password link via
**email and/or SMS**. This infrastructure exists ONLY for teacher credential
delivery and password reset — student notifications stay in-app.

- **Providers are env-switched and demo-first**: `MAIL_PROVIDER=demo` logs the
  email to the server console; `MAIL_PROVIDER=smtp` uses nodemailer with
  `SMTP_*` vars. `SMS_PROVIDER=demo` validates/normalizes the Nepali number
  (+977 9X…), logs the message, and returns it in the API response;
  `SMS_PROVIDER=sparrow` is a reserved stub for the future Sparrow SMS
  integration (placeholders in `.env.example`).
- **Reset tokens** (`password_reset_tokens`): single-use, `RESET_TOKEN_TTL_HOURS`
  (default 48h), stored as SHA-256 hashes — the raw token exists only in the
  delivered link (`APP_BASE_URL/reset-password?token=…`).
- **Endpoints**: `POST /api/admin/teachers` now accepts `phone`, `address`,
  `defaultPassword` (alias of `password`), `deliveryChannels: ['email','sms']`,
  with duplicate email/phone guards; `POST /api/admin/teachers/:id/resend-credentials`
  (optional `newTempPassword` — the stored hash can't be recovered, so resend
  either resets the password or sends a link-only message); public
  `POST /api/auth/reset-password` consumes the token, clears
  `mustChangePassword`, and revokes sessions via `tokenVersion`.
- **Delivery is decoupled from creation**: a failed send never rolls back the
  account; the response carries per-channel status the admin UI surfaces with
  a Resend action.
- **Email stays required** for teacher accounts — login is email-based and
  `users.email` is NOT NULL; phone is a delivery channel, not an identity.
- **First login**: the teacher portal redirects a `mustChangePassword` account
  to the profile/change-password screen once per load (steered, not trapped).
- New migrations: `20260719000000-add-phone-address-to-users` (nullable cols),
  `20260719000100-create-password-reset-tokens` (both reversible).
- Audit events: `teacher.credentials_sent`, `teacher.credentials_resent`,
  `password.reset_consumed`.

## Frontend notes

- The Angular error interceptor now treats **403 as in-app "access denied"** (401 still logs
  out) — a teacher touching a non-assigned class keeps their session.
- `adminGuard` redirects logged-in teachers to `/teacher` instead of clearing the session;
  login routes by role (ADMIN → `/dashboard`, TEACHER → `/teacher`, students still rejected).
- Teacher display names come from the linked lecturer record (fallback: email local-part).
