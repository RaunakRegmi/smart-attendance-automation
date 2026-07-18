# AttendX — Build Prompt: Teacher Portal + Async Messaging

**Paste this whole file into Claude Code (Fable) as the task.**

---

## 0. How to approach this task (read before doing anything)

You are extending an **existing, working codebase** called AttendX. Treat it with care.

- **This is additive only.** Do **not** delete, rename, drop, or refactor anything that already works. No dropping columns/tables, no changing existing API response shapes, no rewriting existing screens. New tables, new columns (nullable), new endpoints, new screens — that's the mode.
- **Investigate before you build.** Do a discovery pass first (§4) and tell me what you found + what's ambiguous **before** writing feature code.
- **When you are unsure about anything, STOP and ask me.** Do not guess on anything that could break existing behaviour, change the database destructively, or lock in a design decision. §11 lists the questions I already expect — but ask about anything else too.
- **Work on a new git branch** (e.g. `feature/teacher-portal`). Commit in small, logical steps with clear messages. Never commit straight to main/master.
- **Match the existing conventions.** Use the same folder structure, naming style, ORM patterns, auth middleware, error format, and lint rules already in the repo. Do not introduce a new framework, state-management library, or ORM. If something's missing, ask.

---

## 1. What AttendX is (context — verify against the actual repo)

AttendX is a smart attendance system. Based on the project docs the stack is roughly:

- **Mobile app (students):** Flutter (Dart)
- **Web admin console:** Angular (or a lighter HTML/CSS/JS panel — confirm which)
- **Backend:** Node.js + Express, PostgreSQL via **Sequelize ORM**
- **Background jobs:** BullMQ + Redis (e.g. Google Sheets sync worker)
- **AI service:** Python + LangChain + FAISS (the "Ask Campus AI" RAG pipeline)
- **Integrations:** Google Sheets API for attendance sync
- **Docs:** Swagger UI

Existing DB entities (verify names/fields in the repo — do not trust this list blindly):
`users` (id, email, password, **role**, isActive), `students` (id, name, email, regNum, univId, batchId, sectionId, userId), `batches`, `sections` (batchId), `subjects` (subjectCode, subjectName), `attendance` (studentId, subjectId, date, status), `routines` (sectionId, subjectId, dayOfWeek, startTime, endTime), `sheets` (batchId, sectionId), `audit_logs` (user_id, timestamp, endpoint).

> ⚠️ The admin UI appears to have a **"Lecturers"** section already. There may be an existing lecturer concept in the DB that is *not* a login user. **This matters** — see the first question in §11. Do not assume "teacher" is brand new until you've checked.

Currently there are **two roles/interfaces**: student (mobile) and admin (web). The goal is to add a **third role: teacher (web)**, plus **async messaging**.

---

## 2. The objective (verbatim spec — do not reinterpret, only expand)

> Extend AttendX from two roles to three: student (mobile), teacher (web), admin (web), sharing one Node.js/Express + PostgreSQL backend. Add `teacher` as a role in the existing `users` table. Teachers are assigned to sections/subjects by admins; all teacher data access is row-scoped to their assigned classes only.
>
> Teacher web portal: My Dashboard (today's classes, my stats, unread messages, admin notifications), My Classes (assigned sections only), Attendance (mark/edit their classes), Reports (their subjects only), At-risk students, Messages inbox, Profile.
>
> Student additions (mobile): "Message a teacher" (choose from own subject teachers, thread tied to a subject) + a message inbox with unread badges.
>
> Admin additions (web): Teacher account management + class assignment; compose notifications to one/group/all teachers with read status; direct admin↔teacher async threads; read-only oversight of student↔teacher threads.
>
> Messaging = async only (message + notification + unread state; no websockets/live chat). Schema: `conversations` (participants, context_type, context_id) + `messages` (conversation_id, sender_id, body, created_at, read_at). Notifications reuse the same plumbing as system-generated one-way messages. Log all threads for accountability.

Everything below is the detailed expansion of that spec.

---

## 3. Golden rules / guardrails

1. **No destructive migrations.** New columns must be nullable or have safe defaults. Never drop/rename existing tables or columns. Every migration must be reversible (`up` and `down`).
2. **Preserve existing endpoints and payloads.** If you must extend an existing endpoint, add optional fields — don't change or remove existing ones.
3. **Don't touch these unless explicitly required:** the RAG/AI Python service, the Google Sheets sync worker, the existing student mobile core (dashboard, routine, Ask Campus AI), and any currently passing tests.
4. **Row-level scoping is mandatory** for every teacher-facing query (details in §6.3). A teacher must never be able to read or write data for a class they aren't assigned to — enforce it on the **server**, not just the UI.
5. **No live chat / websockets.** Messaging is async: send → notify → read/reply later. Unread counts come from a query, not a socket.
6. **Log everything relevant** to `audit_logs` (or an extension of it): teacher account changes, class assignments, notifications sent, and every message thread action.
7. If a requirement conflicts with something already in the code, **stop and ask** — do not silently pick one.

---

## 4. Phase 0 — Discovery (do this first, then pause)

Before writing feature code, inspect the repo and produce a short **Findings + Questions** report for me:

1. Confirm the real stack, folder layout, and how the backend is structured (routes/controllers/services/models).
2. Confirm the auth mechanism (JWT? sessions?), where role checks happen, and the current middleware.
3. Confirm the exact `users` schema and how `role` is stored/validated (enum? string? check constraint?).
4. Find out whether a **lecturer/teacher** concept already exists in the DB or admin UI, and how it's modelled.
5. Confirm how attendance is currently written — DB directly, via Google Sheet, or both — and how the sync worker fits in.
6. Confirm the web admin's actual framework and component/styling patterns (so the teacher portal matches it).
7. Confirm the Flutter app's architecture (state management, networking layer, folder structure).
8. Confirm the migration tooling (Sequelize CLI? umzug? custom?) and the test setup/conventions.

**Then stop and give me the Findings + the §11 questions before building.** If nothing is blocking, you may state your assumptions clearly and proceed — but list them.

---

## 5. Data model changes (additive migrations only)

Add via new, reversible migrations. Match existing naming conventions (camelCase vs snake_case — follow what's already there).

### 5.1 Teacher role
- Add `teacher` as an allowed value of `users.role` (extend the enum/check — don't replace existing values). Students and admins must keep working exactly as before.
- Teachers authenticate the same way students/admins do (institutional email + password, same hashing, same token flow). Reuse existing auth — don't build a parallel login.

### 5.2 `teacher_assignments` (the backbone of scoping)
The link that decides "which classes a teacher owns."
- `id` (PK)
- `teacherUserId` → FK `users.id` (role must be teacher)
- `sectionId` → FK `sections.id`
- `subjectId` → FK `subjects.id`
- `createdAt`, `createdBy` (admin userId), optional `isActive`
- Unique constraint on (`teacherUserId`, `sectionId`, `subjectId`).
- Index on `teacherUserId` and on (`sectionId`, `subjectId`).
> If a lecturer table already exists (§11 Q1), reconcile with it instead of duplicating — ask me first.

### 5.3 Messaging tables
Implement the spec's schema properly. The spec says `conversations(participants, context_type, context_id)` — a real participant list needs a join table, so implement it as:

**`conversations`**
- `id` (PK)
- `contextType` — enum: `student_teacher_subject`, `admin_teacher`, `admin_broadcast` (add more only if we agree)
- `contextId` — nullable; references the relevant entity by contextType (e.g. subjectId for student↔teacher; null for admin↔teacher; null/broadcast group id for broadcasts). Document what it points to per type.
- `createdBy` → FK `users.id`
- `createdAt`, `updatedAt` (**updatedAt = last message time**, used for inbox sorting)

**`conversation_participants`**
- `id` (PK)
- `conversationId` → FK
- `userId` → FK
- `lastReadAt` (nullable) — **source of truth for unread counts**
- optional `roleAtTime` (student/teacher/admin snapshot)
- Unique (`conversationId`, `userId`).

**`messages`**
- `id` (PK)
- `conversationId` → FK
- `senderId` → FK `users.id`, **nullable** (null = system-generated, e.g. a notification)
- `body` (text)
- `isSystem` (boolean, default false) — true for notifications/system messages
- `createdAt`
- `readAt` (nullable) — keep for simple 1:1 read tracking, but treat `conversation_participants.lastReadAt` as the primary unread mechanism (works for broadcasts too). If you think one is redundant, ask before removing.
- Index on (`conversationId`, `createdAt`).

**Notifications reuse this plumbing** — a notification is a `conversation` (contextType `admin_broadcast` or `admin_teacher`) whose messages are `isSystem = true` / one-way. Do **not** build a separate notifications table unless discovery shows a strong reason (then ask).

### 5.4 Audit
- Extend `audit_logs` (or add rows through the existing mechanism) to capture: teacher created/edited/deactivated, assignment added/removed, notification sent (with recipient scope), conversation created, message sent, and admin oversight views. Don't break the existing audit shape — add fields as nullable if needed.

---

## 6. Backend — auth, roles, scoping, endpoints

### 6.1 Roles & auth
- Extend existing auth middleware to recognise `teacher`. Add role-guard middleware (e.g. `requireRole('teacher')`, `requireRole('admin')`) matching whatever pattern already exists.
- Teachers use the same login endpoint; the token/claims should carry the role as they do today.

### 6.2 Preserve existing behaviour
- All current student and admin endpoints must return identical responses. Add new routes under clear namespaces (e.g. `/api/teacher/...`, `/api/conversations/...`, `/api/admin/teachers/...`) — follow the repo's existing route conventions.

### 6.3 Row-level scoping (critical, server-enforced)
Create a single reusable helper/service, e.g. `getAssignedScope(teacherUserId)` → returns the set of (sectionId, subjectId) from `teacher_assignments`. **Every** teacher read/write must filter through it:
- Listing classes → only assigned (section, subject) pairs.
- Viewing students → only students in assigned sections.
- Marking/editing attendance → only for assigned (section, subject); reject others with 403.
- Reports → only assigned subjects.
- Messaging a student → only students the teacher actually teaches.
Never rely on the frontend to scope. Add a test that proves a teacher gets 403 on a non-assigned class.

### 6.4 Endpoints (suggested — align names to existing style)
**Teacher**
- `GET /api/teacher/dashboard` — today's classes (from routines ∩ assignments), my stats (my sections, students taught, at-risk count), unread message count, latest admin notifications.
- `GET /api/teacher/classes` — assigned sections/subjects only.
- `GET /api/teacher/classes/:sectionId/:subjectId/students` — roster + attendance % + at-risk flag (scoped).
- `POST` / `PUT` attendance — reuse existing attendance logic if possible, but enforce scoping. **See §11 Q3 about Google Sheets interaction — ask before implementing the write path.**
- `GET /api/teacher/reports?subjectId=` — scoped report generation/download, reusing existing report logic.
- `GET /api/teacher/at-risk` — students under threshold across assigned subjects.
- `GET /api/teacher/profile`, `PUT /api/teacher/profile` (limited fields).

**Messaging (shared by all roles, scoped by eligibility — §10)**
- `GET /api/conversations` — my threads, each with last message + unread count, sorted by `updatedAt`.
- `POST /api/conversations` — start a thread (validate contextType + participant eligibility server-side).
- `GET /api/conversations/:id/messages` — paginated; must be a participant (or admin oversight).
- `POST /api/conversations/:id/messages` — append a message; updates `conversations.updatedAt`.
- `POST /api/conversations/:id/read` — set my `lastReadAt = now`.
- `GET /api/notifications` — my unread system messages/notifications (may just be a filtered conversations view).

**Admin additions**
- `GET/POST/PUT/DELETE /api/admin/teachers` — manage teacher accounts (deactivate, don't hard-delete, to preserve history).
- `POST /api/admin/teachers/:id/assignments`, `DELETE .../assignments/:assignmentId` — assign/unassign sections/subjects.
- `POST /api/admin/notifications` — compose to one teacher / a group / all teachers; returns/creates a conversation with per-recipient read tracking.
- `GET /api/admin/notifications/:id/read-status` — who has/hasn't read.
- `GET /api/admin/oversight/threads` and `GET /api/admin/oversight/threads/:id` — **read-only** view of student↔teacher threads (§10.4).

---

## 7. Teacher web portal (build to match the admin console's look/stack)

Left-nav web app. Screens:

1. **My Dashboard (landing):** today's classes (time, subject, section, room from routines), quick stat cards (my sections, total students I teach, at-risk students in my classes), unread-messages widget, latest admin notifications.
2. **My Classes:** cards/table of assigned (section + subject) only. Click → student roster with attendance % and at-risk flags.
3. **Attendance:** mark/edit attendance for a selected assigned class + date. View history. (Write path pending §11 Q3.)
4. **Reports:** generate/download attendance reports for the teacher's subjects only, reusing existing report generation.
5. **At-risk students:** focused list under threshold in assigned subjects; each row has a "Message student" action.
6. **Messages (inbox):** list of threads (with students and with admin), unread badges, filter by unread / by class; thread view to read + reply. Async — no live updates required; refresh on open.
7. **Profile / settings:** their subjects (read-only, set by admin), contact info, notification preferences.

Future-scope stubs (build only if I say so): section-wide announcements, resource upload, reschedule request. Leave clean extension points, don't implement.

---

## 8. Student mobile additions (Flutter — match existing app architecture)

Do **not** alter existing student screens' behaviour. Add:

1. **"Message a teacher":** entry point (e.g. on a subject/attendance detail and/or a new Messages tab). Student picks from **their own subject teachers only** (resolved via `teacher_assignments` ∩ the student's section/subjects). Thread is tied to that **subject** (contextType `student_teacher_subject`). Optionally auto-prefill context like subject name + current attendance %.
2. **Message inbox:** list of the student's threads with **unread badges**, thread view to read/reply. Async; refresh on open. Reuse the same messaging endpoints as everyone else.

Keep it minimal — students ask and get answered; no thread management bells and whistles.

---

## 9. Admin web additions (extend the existing console, don't replace)

1. **Teacher management:** create/edit/deactivate teacher accounts (deactivate, not hard-delete). List with search.
2. **Class assignment:** assign teachers to sections/subjects (writes `teacher_assignments`). This assignment is what powers all teacher scoping.
3. **Notifications:** compose + send to one teacher / a group / all teachers; view per-recipient **read status**.
4. **Admin ↔ teacher messages:** direct async threads with individual teachers.
5. **Oversight (read-only):** browse student↔teacher threads for accountability. Read-only — admin cannot post into these threads. Log that the admin viewed them.

---

## 10. Messaging — exact behaviour

### 10.1 Async semantics
Send → recipient's unread count increases → they get an in-app/notification alert → they read/reply whenever. **No websockets, no presence, no typing indicators.** Unread is computed by query.

### 10.2 Unread counting
For a conversation and a user: unread = count of `messages` where `createdAt > participant.lastReadAt` and `senderId != userId` (and count system messages as unread too). Marking read sets `lastReadAt = now`. Inbox badge = sum across the user's conversations.

### 10.3 Who can start / join a thread (enforce server-side)
- **Student → teacher:** only teachers who teach that student; thread context = a subject the student takes with that teacher.
- **Teacher → student:** only that teacher's own students.
- **Admin ↔ teacher:** any teacher.
- **Admin broadcast:** selected teachers or all teachers.
- **Forbidden:** student↔student, teacher↔teacher (unless we later decide), any arbitrary/unscoped DM.
> Decide with me (see §11 Q2): can **both** students and teachers initiate a student↔teacher thread, or only one side?

### 10.4 Oversight & child-safety (important for an education tool)
- No fully private, unlogged channels. **All** student↔teacher threads are logged and are visible **read-only** to admins.
- Admin cannot secretly delete messages; if deletion is ever needed, soft-delete with an audit trail — ask before adding delete at all.
- Keep this simple but present; it's a deliberate design choice worth documenting.

---

## 11. Questions to ASK me before deciding (don't guess on these)

1. **Lecturers vs teachers:** Does a `lecturer` (or similar) concept already exist in the DB/admin? Should teachers be **linked to existing lecturer records** or created fresh as new `users`? How do we migrate any existing lecturer data?
2. **Thread initiation:** Can both students and teachers start a student↔teacher thread, or only one side?
3. **Attendance write path:** When a teacher marks/edits attendance in the new portal, should it (a) write to the DB directly, (b) write-through to Google Sheets, or (c) keep Google Sheets as the source of truth and let the existing sync worker reconcile? I need to choose — don't assume.
4. **Notification delivery:** In-app only for now, or also email/push? (The docs mention emails — confirm scope.)
5. **Teacher onboarding:** Do teachers self-register with institutional email, or does admin create accounts and set/reset passwords?
6. **Report parity:** Should teacher reports reuse the exact existing report format/export (Google Sheets/LMS), or a simpler in-app/CSV version for now?
7. **Naming/permissions edge cases:** Anything where the existing code already assumes exactly two roles (guards, enums, UI switches) that I should be aware of before you extend it.

Also: **ask me about anything else you find confusing or ambiguous while working.** I'd rather answer a question than have you guess and break something.

---

## 12. Non-functional requirements

- **Security:** server-side role guards + row scoping on every new endpoint; validate all inputs; no IDOR (never trust IDs from the client without ownership checks).
- **Permissions matrix** (summarise in your PR): student / teacher / admin × each resource (own attendance, class roster, reports, teacher mgmt, assignments, notifications, oversight).
- **Audit logging:** as in §5.4.
- **Error format & validation:** match the existing API's conventions.
- **i18n / locale:** match whatever the app already does; don't introduce a new system.
- **Performance:** index the new FK/lookup columns (§5). Unread counts and inbox lists should be single efficient queries, not N+1.

---

## 13. Testing & documentation

- Add tests in the repo's existing style covering: teacher role auth, **row-scoping (a teacher gets 403 on a non-assigned class)**, sending/reading messages, unread counts, admin notification read-status, and admin oversight being read-only.
- Do not break existing tests. Run the full suite before finishing.
- Update **Swagger** for all new endpoints.
- Update any seed/fixtures with demo data: a couple of teachers, assignments, and sample threads, so the features can be demoed immediately. Don't overwrite existing seeds — extend them.

---

## 14. Deliverables & working style

1. Post the **Phase 0 Findings + Questions** (§4, §11) and wait for my answers on blocking items.
2. Then implement in this order, committing per step on the feature branch: migrations → backend + scoping → admin additions → teacher portal → student additions → messaging → tests/docs/seeds.
3. Provide at the end: a summary of every change, the list of new migrations with a **rollback plan**, the permissions matrix, updated Swagger, and clear run instructions.
4. If at any point something is unclear or risks existing functionality — **pause and ask me.**

Please start with Phase 0 (discovery) and come back to me with what you found and your questions before building.