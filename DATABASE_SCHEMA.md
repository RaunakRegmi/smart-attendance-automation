# Student Attendance System Database Schema

This document describes the database design for the Student Attendance Management System. It is written so that architects, schema designers, or non-technical stakeholders can understand the tables, relationships, and constraints.

---

## Overview

The system uses the following main entities:

- `users`
- `batches`
- `sections`
- `students`
- `subjects`
- `attendance`
- `routines`
- `sheets`
- `audit_logs`

Each entity maps to one database table, and the tables are related through foreign keys.

---

## Table Definitions

### 1. `users`

Purpose: Store login accounts and roles for administrators and students.

Columns:
- `id` : `INTEGER` — primary key, auto-increment
- `email` : `STRING` — required, unique
- `password` : `STRING` — required
- `role` : `ENUM('ADMIN','STUDENT')` — required, default `STUDENT`
- `isActive` : `BOOLEAN` — required, default `true`
- `createdAt` / `updatedAt` : timestamps

Constraints:
- Primary key: `id`
- Unique: `email`
- Role values limited by enum

Notes:
- Passwords are stored as hashed values.
- Users with `role = ADMIN` manage the application.

---

### 2. `batches`

Purpose: Represent class batches or academic groups.

Columns:
- `id` : `UUID` — primary key, default generated
- `name` : `STRING` — required, unique
- `abbreviation` : `STRING` — optional, unique

Constraints:
- Primary key: `id`
- Unique: `name`
- Unique: `abbreviation`

Notes:
- Batch abbreviations are expected to be uppercase alphanumeric values.

---

### 3. `sections`

Purpose: Represent sections within a batch.

Columns:
- `id` : `UUID` — primary key, default generated
- `name` : `STRING` — required
- `batchId` : `UUID` — required, foreign key to `batches(id)`

Constraints:
- Primary key: `id`
- Foreign key: `batchId` references `batches(id)`
- Unique composite index: `(name, batchId)`

Notes:
- The composite uniqueness ensures the same section name cannot repeat inside one batch.

---

### 4. `students`

Purpose: Store student personal and academic details.

Columns:
- `id` : `INTEGER` — primary key, auto-increment
- `name` : `STRING` — required
- `email` : `STRING` — required, unique
- `gender` : `STRING` — optional
- `bloodGroup` : `STRING` — optional
- `regNum` : `STRING` — optional, unique
- `univId` : `STRING` — optional, unique
- `admissionDate` : `DATEONLY` — optional
- `dob` : `DATEONLY` — optional
- `faculty` : `STRING` — optional
- `guardianName` : `STRING` — optional
- `guardianContact` : `STRING` — optional
- `batchId` : `UUID` — optional, foreign key to `batches(id)`
- `sectionId` : `UUID` — optional, foreign key to `sections(id)`
- `userId` : `UUID` — optional, intended to link to `users(id)`

Constraints:
- Primary key: `id`
- Unique: `email`, `regNum`, `univId`
- Foreign key: `batchId` references `batches(id)`
- Foreign key: `sectionId` references `sections(id)`

Notes:
- `batchId` and `sectionId` connect each student to their academic group.
- `userId` should logically point to the student’s auth user account, though the current implementation contains an inconsistent reference.

---

### 5. `subjects`

Purpose: Store subject metadata for attendance and scheduling.

Columns:
- `id` : `INTEGER` — primary key, auto-increment
- `subjectCode` : `STRING` — required, unique
- `subjectName` : `STRING` — optional

Constraints:
- Primary key: `id`
- Unique: `subjectCode`

---

### 6. `attendance`

Purpose: Track daily attendance status per student and subject.

Columns:
- `id` : `INTEGER` — primary key, auto-increment
- `studentId` : `INTEGER` — required, foreign key to `students(id)`
- `subjectId` : `INTEGER` — required, foreign key to `subjects(id)`
- `date` : `DATEONLY` — required
- `status` : `ENUM('Present','Absent')` — default `Absent`
- `createdAt` / `updatedAt` : timestamps

Constraints:
- Primary key: `id`
- Foreign key: `studentId` references `students(id)`
- Foreign key: `subjectId` references `subjects(id)`
- Unique composite index: `(studentId, subjectId, date)`

Notes:
- One attendance record is allowed per student, subject, and date.

---

### 7. `routines`

Purpose: Store class schedules and timetable entries.

Columns:
- `id` : `INTEGER` — primary key, auto-increment
- `sectionId` : `UUID` — required, foreign key to `sections(id)`
- `dayOfWeek` : `STRING` — required
- `subjectCode` : `STRING` — required
- `subjectName` : `STRING` — required
- `startTime` : `STRING` — required
- `endTime` : `STRING` — required
- `block` : `STRING` — optional
- `room` : `STRING` — optional
- `createdAt` / `updatedAt` : timestamps

Constraints:
- Primary key: `id`
- Foreign key: `sectionId` references `sections(id)`

Notes:
- Routines are stored per section.
- Subject details are duplicated as strings rather than referencing `subjects` directly.

---

### 8. `sheets`

Purpose: Track Google Sheets or external sheet connections used for sync.

Columns:
- `id` : `UUID` — primary key, default generated
- `sheetName` : `STRING` — required
- `sheetId` : `STRING` — required, unique
- `batchId` : `UUID` — required, foreign key to `batches(id)`
- `sectionId` : `UUID` — required, foreign key to `sections(id)`
- `status` : `ENUM('active','inactive')` — default `inactive`
- `lastSuccessfulSyncTime` : `DATE` — optional
- `lastAttemptedSyncTime` : `DATE` — optional
- `metadata` : `JSONB` — optional, default `{}`

Constraints:
- Primary key: `id`
- Unique: `sheetId`
- Foreign key: `batchId` references `batches(id)`
- Foreign key: `sectionId` references `sections(id)`

Notes:
- `metadata` stores sync details or sheet-specific configuration.

---

### 9. `audit_logs`

Purpose: Record HTTP request/response audit data.

Columns:
- `id` : `UUID` — primary key, default generated
- `user_id` : `STRING(36)` — optional
- `timestamp` : `DATE` — required, default now
- `endpoint` : `TEXT` — required
- `method` : `STRING(10)` — required
- `route` : `TEXT` — required
- `client_ip` : `STRING(45)` — required
- `request_headers` : `JSONB` — optional
- `authorization_header` : `TEXT` — optional
- `response_status` : `INTEGER` — optional
- `icp_hash` : `STRING(64)` — optional
- `status` : `JSONB` — optional
- `client_agent` : `TEXT` — optional
- `request_body` : `JSONB` — optional
- `remote_user` : `TEXT` — optional
- `audit_event_type` : `STRING(50)` — required, default `audit`

Constraints:
- Primary key: `id`
- Indexes: `user_id`, `timestamp`, `endpoint`, `audit_event_type`

Notes:
- This table is append-only and used for audit tracking.

---

## Relationships Summary

### Direct relationships

- `batches` → `sections` : one batch can contain many sections.
- `batches` → `students` : one batch can contain many students.
- `batches` → `sheets` : one batch can be linked to many sheets.
- `sections` → `students` : one section can contain many students.
- `sections` → `routines` : one section has many timetable entries.
- `sections` → `sheets` : one section can be linked to many sheets.
- `students` → `attendance` : one student can have many attendance records.
- `subjects` → `attendance` : one subject can appear in many attendance records.

### Implicit or intended relationship

- `students.userId` is intended to connect a student record with its login `users.id`.
- This is not currently enforced in the model file, but it is the expected association.

---

## Visual Relationship Diagram

```
users
  | 1
  | 0..1
 students

batches
  | 1
  | *
 sections

batches
  | 1
  | *
 students

sections
  | 1
  | *
 routines

sections
  | 1
  | *
 sheets

batches
  | 1
  | *
 sheets

students
  | 1
  | *
 attendance

subjects
  | 1
  | *
 attendance
```

Notes:
- `1` means one record.
- `*` means many records.
- `0..1` means optional one.

---

## Design Notes for Implementation

1. Use UUID primary keys for batch, section, and sheet tables.
2. Use integer primary keys for users, students, subjects, attendance, and routines.
3. Use composite unique keys to prevent duplicates where required.
4. Use foreign key constraints to enforce referential integrity.
5. Use ENUM columns for controlled status and role values.
6. Keep `sheets.metadata` as JSONB for expandable sync metadata.
7. If the system needs stronger subject-schedule linkage, consider adding a direct `subjectId` foreign key to `routines`.
8. If student login is required, fix `students.userId` to reference `users(id)`.

---

## Suggested SQL DDL Outline

The following is a conceptual order for table creation.

1. Create `users`
2. Create `batches`
3. Create `sections`
4. Create `students`
5. Create `subjects`
6. Create `attendance`
7. Create `routines`
8. Create `sheets`
9. Create `audit_logs`

Each table should include indexes on foreign keys and unique columns.

---

## Quick Reference Table

| Table | Primary Key | Important Foreign Keys | Unique Constraints | Notes |
|---|---|---|---|---|
| `users` | `id` | — | `email` | login accounts |
| `batches` | `id` | — | `name`, `abbreviation` | academic batch groups |
| `sections` | `id` | `batchId` | `(name,batchId)` | section inside a batch |
| `students` | `id` | `batchId`, `sectionId`, `userId` | `email`, `regNum`, `univId` | student profile |
| `subjects` | `id` | — | `subjectCode` | course metadata |
| `attendance` | `id` | `studentId`, `subjectId` | `(studentId,subjectId,date)` | attendance per day |
| `routines` | `id` | `sectionId` | — | class schedule |
| `sheets` | `id` | `batchId`, `sectionId` | `sheetId` | Google Sheet sync info |
| `audit_logs` | `id` | — | — | request audit trail |

---

## Conclusion

This schema document provides a complete and readable description of tables, relationships, and constraints. A schema designer can use it to build the database structure or to visualize the entity relationships for implementation.
