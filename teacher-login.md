# AttendX — Addendum: Teacher Account Creation + Credential Delivery (Email / SMS)

**Paste this to Claude Code as an addition to the Teacher Portal work already in progress.** This extends **§9.1 (Admin → Teacher management)**. Everything from the earlier prompt and the Phase 0 answers still applies (additive only, nothing destructive, ask if unsure, feature branch).

---

## 0. Scope boundary — read first (this changes one earlier decision)

- Phase 0 **Q7** said "in-app only, no email/SMS." **This addendum deliberately introduces email + SMS infrastructure — but ONLY for the teacher credential-delivery and password-reset use case described here.**
- **Student notifications stay in-app only, unchanged.** Do not route student notifications through the new email/SMS services.
- There is currently no email or SMS code in the repo (confirmed in discovery: no nodemailer, no SMS). So this is new, self-contained infrastructure. Keep it isolated behind services so it doesn't leak into other flows.

---

## 1. What this feature is (plain terms)

When an admin adds a teacher, AttendX creates the teacher's login account and then **sends the teacher their credentials** — a link to the login page, their temporary password, and a link to set/reset their password — via **email, SMS, or both**, depending on the contact details the admin entered. The teacher uses the temp password (or the reset link) to log in, then changes it.

**v1 = manual single-teacher entry. Bulk Excel upload of teachers is OUT of scope — do not build it.** Each teacher is a **separate login account with their own unique email**; teachers sign in with their own email + password (email uniqueness enforced by the existing `users.email` unique constraint).

---

## 2. Data model changes (additive migrations)

1. **Add `address` to the `users` table — nullable/optional.** (General instruction: this column should exist and tolerate empty values.)
2. Ensure the teacher record can store **`phone`** (check if `users` already has a phone column from discovery; if not, add it, nullable).
3. **`mustChangePassword`** boolean on `users`, default `false`; set `true` for newly admin-created teachers. Cleared when they change their password. (This was the Q8 "cheap flag" — implement it here.)
4. **Password reset / set-password tokens** — check discovery for any existing forgot-password/reset infra:
   - If it exists, reuse it.
   - If not, add a minimal, reversible mechanism: a `password_reset_tokens` table (or equivalent) with `userId`, `tokenHash`, `expiresAt`, `usedAt` (nullable), `createdAt`. Tokens are single-use, time-limited (e.g. 24–72h — confirm), and stored hashed, never in plaintext.
5. Optional (from Q1 decision): if the admin is creating a teacher login for someone who already exists as a loginless **lecturer**, allow linking via the nullable `lecturers.userId` — but do not auto-match; only if the admin chooses to.

Keep all migrations additive and reversible. Do not alter existing columns.

---

## 3. Backend — services (isolated, env-configured, swappable)

Build three small, single-responsibility services. **No secrets hardcoded — everything via env vars.**

### 3.1 `emailService.send(to, subject, html)`
- Implement with nodemailer over SMTP configured from env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`), abstracted so the provider can be swapped.
- Support an env switch `MAIL_PROVIDER=demo|smtp`. In **demo** mode it logs the email (recipient, subject, body) to the console instead of sending — so the whole flow is testable now without real SMTP credentials. Real SMTP drops in later via the same interface.
- Returns a success/failure result (don't throw into the request flow — see §5).

### 3.2 `smsService.send(to, message)` — **DEMO / mock for now (Sparrow later)**
- **Do NOT integrate real Sparrow SMS yet.** For now implement a **demo SMS sender**: it validates the number, "sends" by logging the message to the server console (and returning it in the API response in dev), and reports success — no external HTTP call, no credentials needed.
- Keep it behind the generic `send(to, message)` interface with an env switch (e.g. `SMS_PROVIDER=demo|sparrow`) so **real Sparrow can drop in later without touching any callers**. Leave `SPARROW_SMS_TOKEN` / `SPARROW_SMS_FROM` / base URL in `.env.example` as commented placeholders for the future Sparrow implementation.
- Still **normalize/validate Nepali phone numbers** so the demo behaves like the real thing.
- A demo message/OTP printed to the console or returned in the dev response is fine for testing this flow.

### 3.3 `credentialDeliveryService`
- Given a user + chosen channels, composes the message and dispatches it.
- **Message contents:** (a) the login page URL, (b) the temporary password, (c) a set/reset-password link (built from a fresh reset token). Keep the copy short and professional; include the college/app name.
- Dispatches to email and/or SMS via the services above.
- **SMS is short** — send the login URL + the temporary password + a short reset link. Full, formatted detail goes in the email.
- Returns **per-channel delivery status** (email: ok/failed, sms: ok/failed) so the admin sees what actually went out.

---

## 4. Backend — flow & endpoints (match existing conventions, admin-only)

Extend the admin teacher-management endpoints from §9.1:

1. **`POST /api/admin/teachers`** (create teacher) — accepts: `name`, `email` (optional if phone given), `phone` (optional if email given), `address` (optional), `defaultPassword`, and `deliveryChannels` (which of email/sms to send on).
   - **Duplicate guard (required):** before creating, check `email` and `phone` against existing `users` (and lecturers where relevant). If already registered, **reject with a clear, specific message** ("A user with this email/phone already exists") — do not silently create a duplicate. (The bulk "select/deselect duplicates" behaviour from the parent system is a bulk-upload concern; not needed for single manual entry.)
   - Create the `users` row: role `TEACHER`, password **bcrypt-hashed** (reuse existing model hook), `mustChangePassword = true`, `isActive = true`, plus name/email/phone/address.
   - Generate a reset token.
   - Call `credentialDeliveryService` for the chosen channels.
   - **Account creation and credential delivery are decoupled:** if delivery fails, the account is still created — return the teacher record **plus** the per-channel delivery status. Never leave a half-created account because an SMS failed.
2. **`POST /api/admin/teachers/:id/resend-credentials`** — regenerates a reset token and re-sends credentials on the chosen channels. For when a first send failed or the teacher lost the message.
3. **Password set/reset endpoints** (reuse existing if present, else add):
   - `POST /api/auth/reset-password` (consume token, set new password, mark token used, clear `mustChangePassword`).
   - Existing login: if `mustChangePassword` is true, the client should route the teacher to a change-password step (backend enforces on next password-change; don't hard-block their session in a way that traps them).
4. Log to `audit_logs` (explicit `AuditLog.create`, per the Phase 0 audit note): teacher created, credentials sent (with channels + per-channel result), credentials resent, password reset consumed.

---

## 5. Delivery-channel logic (be precise)

- **Email** is attempted if the teacher has an email **and** the admin selected email.
- **SMS** is attempted if the teacher has a phone **and** the admin selected SMS.
- **Default channel selection in the UI:** pre-select whichever channels the admin has entered contact details for (email checked if email filled, SMS checked if phone filled). Admin can toggle either off.
- If the admin entered only one contact method, only that channel is available.
- If a channel send fails, surface it in the response and the UI ("Email sent ✓, SMS failed ✗ — Resend"). Do not roll back the account.

---

## 6. Admin UI (same Angular project, admin area — match existing components/tokens)

- Extend the teacher-management screen with an **"Add Teacher" form**: name, **unique login email**, phone, address (optional), **temporary password (set by the admin)**, and **channel checkboxes (Email / SMS)** defaulting per §5. (An optional "generate password" helper is fine, but the admin-entered value is what's stored and sent.)
- On submit, show the created teacher and a **delivery-status indicator** per channel, with a **Resend credentials** action.
- Duplicate errors from the backend shown inline on the relevant field.
- Reuse existing form/validation/toast/pagination patterns; no new UI library.

---

## 7. Security & guardrails

- **Never log or store plaintext passwords or tokens.** Passwords hashed (existing bcrypt); reset tokens stored hashed; only the raw token goes in the delivered link.
- **Decision:** the admin-set temporary password **is** sent in the message (email and/or demo SMS). Accepted for now despite the usual tradeoff of putting a password in transit; the teacher changes it on first login.
- Admin-only on all these endpoints (`authorizeRoles('ADMIN')`).
- Env-based secrets only; add the new env vars to `.env.example` (no real values).
- Rate-limit resend/reset endpoints if a limiter already exists in the repo; if not, note it as a follow-up rather than adding new infra silently.
- Keep email/SMS services fully isolated from the student notification path.

---

## 8. Decisions already made (do not re-ask)

- **No bulk upload.** Manual single-teacher entry only. Ignore `@member_sample_sheet.xlsx`.
- **Each teacher = separate account with a unique login email.**
- **Send the admin-set temporary password** in the message (email + demo SMS), plus login URL + reset link.
- **SMS = demo/mock now** (console/dev output), Sparrow later behind the same interface.
- **Email = works in demo/console mode now**; real SMTP can be wired later via env.

## 9. Questions to ASK me before/while building

- **Q-A3 — Existing reset infra:** Did discovery find any forgot-password/reset-token flow to reuse, or should the minimal token mechanism in §2.4 be built fresh? Proceed with the minimal fresh one unless you find something to reuse.
- **Q-A4 — Login URL:** What base URL should the credential message link to? For now, read it from an env var (e.g. `APP_LOGIN_URL`) with a sensible localhost default — confirm the env-var approach is fine.
- **Q-A6 — Token lifetime & first login:** Reset-token expiry window (default 48h unless you say otherwise), and on first login with the temp password, **force an immediate change** (recommended) vs just prompt?

Everything needed to start is decided — begin on migrations + the backend services + the create/deliver endpoint. Ask on Q-A3/Q-A4/Q-A6 only if they block you; otherwise use the stated defaults and note them. Pause and ask if anything here collides with existing code.