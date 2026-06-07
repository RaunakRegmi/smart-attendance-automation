# Soft Delete Implementation Plan

> **Scope:** Admin-only. Soft-delete triggered by "Delete" button (not toggle).
> **Principle:** Never lose data. No admin-facing revert. Recovery only via DB or backend script.
> Children keep FK references to deleted parents. Only cascade is Routines → Section.

---

## 1. Deletion Conditions

| Module | Can soft-delete when... | Notes |
|--------|------------------------|-------|
| **Batch** | No sections **AND** no sheets under it | Both conditions must be met |
| **Section** | No students **AND** no sheets under it | |
| **Subject** | No lecturer linked (`lecturerId IS NULL`) | |
| **Lecturer** | No subjects linked to them | |
| **Student** | **Always** — no blocker conditions | Data preserved, login blocked |
| **Sheets** | No attendance records reference it | Requires new `sheetId` FK on Attendance |
| **Routines** | Its section is already soft-deleted | Orphan cleanup only |

### Conditions NOT enforced (no FK exists)

| Originally considered | Why removed |
|---------------------|-------------|
| Section → lecturer check | No FK between section and lecturer |
| Lecturer → students/batches/sections | No FKs (lecturer links only to subjects) |
| Subject → students via attendance | Attendance FK stays intact after soft-delete |
| Sheets → students | No FK exists |
| Sheets → attendance (current) | **Will add** `sheetId` to Attendance |

---

## 2. Cascade Behavior

**No cascade on soft-delete** — except one exception.

| Parent deleted | Children | Behavior |
|----------------|----------|----------|
| Batch | Sections | FK stays. Show `"Batch: [Deleted]"`. |
| Batch | Students | FK stays. Show `"Deleted Batch"` on profile. |
| Batch | Sheets | FK stays. Sync skips inactive sheets. |
| Section | Students | FK stays. Show `"Section: [Deleted]"`. |
| Section | Sheets | FK stays. Sync skips. |
| Section | Routines | ✅ **Cascade soft-delete** (only exception) |
| Subject | Attendance | FK stays. Show `"Deleted Subject"` in reports. |
| Student | Attendance | FK stays. Reports exclude after deletion date. |
| Student | User | Set `isActive = false` manually. Restore → re-activated. |
| Student | SyncJobs | Preserved as audit log. |
| Lecturer | Subjects | FK stays. Show `"Lecturer: [Deleted]"`. |

---

## 3. Sheets Deletion — New `sheetId` on Attendance

### Problem
Attendance has no link back to the sheet that created it. Cannot check "is there attendance linked to this sheet?"

### Solution
Add `sheetId` to Attendance table:

```sql
ALTER TABLE attendance ADD COLUMN "sheetId" UUID REFERENCES "Sheets"(id) ON DELETE SET NULL;
```

### How it works

| Step | Behavior |
|------|----------|
| **Sync creates attendance** | Writes current sheet's UUID into `attendance.sheetId` |
| **Same student+subject+date in two sheets** | Last sync wins (upsert overwrites). Newer sheet's ID replaces older. |
| **Can old sheet be deleted?** | Yes — no attendance currently references its `sheetId`. |
| **Only one sheet per attendance row** | Exactly one `sheetId` at any time. |
| **Unique constraint** | Still `(studentId, subjectId, date)` — unchanged. |

### Deletion check
```javascript
const hasAttendance = await Attendance.count({ where: { sheetId: sheet.id } });
if (hasAttendance > 0) throw new Error("Cannot delete — attendance records reference this sheet");
```

---

## 4. Revert (Backend-Only — No Admin UI)

Revert is **not available through any frontend UI**. Recovery is done via:
1. **Direct database query** — for emergency recovery
2. **Superadmin-only API endpoint** — `POST /api/admin/:module/:id/restore` (not linked in any UI)
3. **CLI script** — `node scripts/restore.js <module> <id>`

### 4a. Scenarios Where Revert Is Needed

| Scenario | Example | Urgency |
|----------|---------|---------|
| **Accidental deletion** | Admin deleted wrong batch (clicked wrong row) | High |
| **Bug/glitch caused deletion** | UI or API bug soft-deleted a record unintentionally | Critical |
| **Testing/QA mistake** | QA deleted production data during testing | High |
| **Re-evaluation of data** | Business decision: a previously deleted batch is needed again | Medium |
| **Audit correction** | Audit reveals deletion was based on incorrect data | Medium |
| **Data migration error** | Bulk delete operation during maintenance deleted wrong scope | Critical |

### 4b. Revert Mechanism — Superadmin API

```
POST /api/admin/:module/:id/restore
Authorization: Bearer <superadmin_token>
```

Each module has its own restore logic:

| Module | Revert action |
|--------|---------------|
| **Batch** | `UPDATE batches SET deleted_at = NULL WHERE id = ?` |
| **Section** | `UPDATE sections SET deleted_at = NULL WHERE id = ?` |
| **Subject** | `UPDATE subjects SET deleted_at = NULL WHERE id = ?` |
| **Lecturer** | `UPDATE lecturers SET deleted_at = NULL WHERE id = ?` |
| **Student** | `UPDATE students SET deleted_at = NULL WHERE id = ?` AND `UPDATE users SET is_active = true WHERE id = student.userId` |
| **Sheets** | `UPDATE "Sheets" SET status = 'active' WHERE id = ?` |
| **Routines** | Restored when Section is restored (cascade reversed — routines are restored automatically) |

### 4c. Revert Conditions Per Module

| Module | Safe to revert when... | Blocked when... | What happens on revert |
|--------|----------------------|-----------------|----------------------|
| **Batch** | No active batch has same name OR abbreviation | An active batch exists with same name or abbreviation | Sections/sheets auto-reconnect (their FK never changed) |
| **Section** | No active section has same `(name, batchId)` pair | Duplicate exists | Students auto-reconnect. Routines cascade-restore. |
| **Subject** | No active subject has same subjectCode | Duplicate exists | Attendance auto-reconnects |
| **Lecturer** | Always safe | Never blocked (no unique constraint on name) | Subjects auto-reconnect |
| **Student** | No active student has same `email`, `regNum`, or `univId` | Any duplicate of these 3 fields | Attendance reconnects. User login re-activated. Reports resume. |
| **Sheets** | Always safe | Never blocked (sheetId is unique to the Google Sheet) | Sync re-enabled |
| **Routines** | Independent restore is **not allowed** | Must restore via Section | Routines restored when Section is restored |

### 4d. Conflict Resolution When Blocked

If a unique constraint blocks revert, the superadmin has options:

| Option | Action | Pros | Cons |
|--------|--------|------|------|
| **Rename old** | Before reverting, rename the *deleted* record's unique fields in DB | Original new record untouched | Data inconsistency (restored record has modified name) |
| **Rename new** | Rename the *active* record that's blocking | Restored record keeps original identity | The "new" record loses its identity |
| **Delete new** | Hard-delete the blocking active record | Clean resolution | Destructive — data loss |
| **Force override** | Remove unique constraint temporarily, restore, then restore constraint | No rename needed | Complex, risky, downtime |

**Recommended default:** Rename the **restored** record by appending a suffix:
- Batch name: `"Spring 2025 (restored 2026-06-07)"`
- Student email: `john@email.com` → `john+restored@email.com`

Then the superadmin can manually clean up.

### 4e. Revert by Rollback (Alternative Approach)

Instead of restoring individual records, restore from a **backup snapshot**:

```
# Full DB restore from backup
pg_restore --dbname=attendance_db backup_2026-06-06.dump
```

| Pros | Cons |
|------|------|
| Reverts ALL changes in one operation | Destructive — loses ALL changes since backup |
| No conflict issues | Requires recent backup |
| Simple operation | Not practical for single-record revert |

**Use case:** Catastrophic data loss, multi-record corruption, or bulk accidental deletion.

### 4f. Revert Safety Checklist

Before reverting any record, verify:

```
[ ] Was the record actually soft-deleted? (deleted_at IS NOT NULL)
[ ] Does the record still exist in the database? (wasn't hard-deleted)
[ ] Will the revert violate any unique constraint? (check duplicates)
[ ] For Students: should the linked User login be reactivated?
[ ] For Batches/Sections: should the dependent children be restored?
[ ] Has the team been notified of the revert?
```

### 4g. Comparing Revert vs. Hard Delete

| Action | What happens | Admin sees | Can be reverted? |
|--------|-------------|------------|-----------------|
| **Delete (soft)** | `deleted_at = NOW()` | Record disappears from list | ✅ Yes (backend only) |
| **Permanent delete** | `DELETE FROM table WHERE id = ?` | Record gone permanently | ❌ No — data lost |

Only soft-deleted records (`deleted_at IS NOT NULL`) can be reverted. If a record was permanently deleted, recovery requires database backup restore.

---

## 5. Reports Behavior

| Period | Behavior |
|--------|----------|
| **Before deletion date** | Accurate — attendance records exist, student reference intact. |
| **After deletion → before restoration** | NULL for that student in period-specific reports. Attendance rows exist but student is excluded. |
| **After restoration** | Resumes normally. Reports show gap for deleted period. |
| **Historical date-range reports** | Include the student for dates before deletion. Exclude dates within deleted period. Include after restoration. |

---

## 6. Unique Constraint Handling

Must replace existing unique constraints with **partial unique indexes** (`WHERE deleted_at IS NULL`):

| Table | Column(s) | Index |
|-------|-----------|-------|
| `batches` | `name` | `WHERE deleted_at IS NULL` |
| `batches` | `abbreviation` | `WHERE deleted_at IS NULL` |
| `sections` | `name`, `batchId` | `WHERE deleted_at IS NULL` |
| `students` | `email` | `WHERE deleted_at IS NULL` |
| `students` | `regNum` | `WHERE deleted_at IS NULL` |
| `students` | `univId` | `WHERE deleted_at IS NULL` |
| `users` | `email` | `WHERE deleted_at IS NULL` |
| `subjects` | `subjectCode` | `WHERE deleted_at IS NULL` |
| `Sheets` | `sheetId` | `WHERE deleted_at IS NULL` |

This allows a soft-deleted record and a new active record to share the same unique value.

---

## 7. AI / Chatbot

| Aspect | Behavior |
|--------|----------|
| **buildPayload()** | Excludes deleted students (filter `deletedAt IS NULL`) |
| **Auto-refresh trigger** | Fires on `afterUpdate` when `deletedAt` transitions (not `afterDestroy`) |
| **Restore** | Also fires auto-refresh (on `afterUpdate` when `deletedAt` cleared) |

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cascade on delete | **No cascade** (except Routines) | Clean reversion — children aren't silently deleted |
| Sheets status field | Use existing `status` ENUM as soft-delete | Already has active/inactive |
| Attendance tracking | Add `sheetId` FK (C1) | Enables deletion condition check |
| Unique constraints | Partial indexes | Allows reusing unique values after delete |
| Reports | Cutoff model | Pre-deletion history preserved |
| Revert | **No admin UI**. DB/backend only. | Admin cannot undo. Recovery requires script or direct SQL. |
| Delete button | Per-row "Delete" performs soft-delete — disabled with tooltip when blockers exist | Clear admin feedback |

---

## 9. Migration Plan

### Phase 1: Database Migrations
1. Add `deletedAt` TIMESTAMP to all Tier 1 models
2. Add `sheetId` to Attendance (FK → Sheets, ON DELETE SET NULL)
3. Drop existing unique constraints, create partial unique indexes
4. Enable `paranoid: true` in all Sequelize models

### Phase 2: Backend Controllers
1. Update all `destroy()` calls — they now set `deletedAt` (Sequelize handles this with `paranoid: true`)
2. Add `paranoid: false` to queries that need deleted records (reports, findOrCreate)
3. Sync process: write `sheetId` into each Attendance row
4. Add restore endpoints: `POST /api/:module/:id/restore`
5. Set `user.isActive = false` when student is soft-deleted; re-activate on restore

### Phase 3: Frontend
1. "Delete" button performs soft-delete (disabled with tooltip if blockers exist)
2. Delete confirmation: "This will deactivate the record permanently. This action cannot be undone."

### Phase 4: AI Hooks
1. Change `afterDestroy` → `afterUpdate` with `deletedAt` change detection
2. Add restore detection for auto-refresh


**********************************************************************************************************************

[â] Explore backend structure: models, controllers, services, migrations
[â¢] Backend Models: Add paranoid:true + sheetId + fix unique + hooks
[ ] Backend Migration: Add deletedAt columns, partial indexes, sheetId
[ ] Backend Controllers: Add deletion condition checks
[ ] Backend: Add restore endpoint (superadmin API)
[ ] Update sync process to write sheetId to attendance
[ ] Frontend: Delete button with confirmation + blocking message + toast
[ ] Update session context after implementation