# Write to Google Sheet — Plan

## Goal

When an admin adds a student under a specific batch + section via the admin portal, automatically append that student as a new row to all linked Google Sheets under that same batch + section. The appended row must match the existing sheet structure.

---

## Current State

| Aspect | Details |
|--------|---------|
| Data flow | Google Sheets → PostgreSQL only. Strictly one-way. |
| Google API scope | `spreadsheets.readonly` in both `sheetsService.js` and `googleAuthMiddleware.js` |
| Write-back | Zero. No code exists that writes to Google Sheets. |
| Auth file | `src/utils/keys.json` — identity only, no scope/permissions embedded |

### Sheet Structure (Flat Header / Layout A)

Each row in the linked sheets is an **attendance record**, not a student roster entry:

| Column | Examples |
|--------|----------|
| Student Name | John Doe |
| Email (Gmail) | john@example.com |
| Subject Code | WEB_L2 |
| Subject Title | Web Engineering |
| Lecturer | Dr. Smith |
| Date | 2025-03-15 |
| Status (attendance) | Present / Absent / Late |

---

## Required Changes

### 1. Google API Scope

Change from read-only to read/write in two files:

**`src/services/sheetsService.js`**
```
scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
→ scopes: ['https://www.googleapis.com/auth/spreadsheets']
```

**`src/middleware/googleAuthMiddleware.js`**
```
scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
→ scopes: ['https://www.googleapis.com/auth/spreadsheets']
```

### 2. Google Sheet Sharing

The service account `attendance@attendance-492705.iam.gserviceaccount.com` must have **Editor** access (not just Viewer) on every linked Google Sheet.

### 3. Student Creation → Sheet Append Logic

When `POST /api/students` creates a student:

1. Query all Sheets records where `batchId` and `sectionId` match the new student's
2. For each linked sheet:
   - Fetch the sheet's current data to determine the existing header structure & column positions
   - Append a new row at the bottom with:
     - `Student Name` → student's name
     - `Email (Gmail)` → student's email
     - `Subject Code` → blank (student isn't tied to a specific subject)
     - Remaining attendance columns → blank
3. Trigger a sync after write to keep DB in sync (or skip sync since we already have the data).

### 4. Concerns to Address

| Concern | Notes |
|---------|-------|
| **Sync loop** | Writing to sheets then re-syncing could create confusion. Use upsert idempotency or skip re-sync. |
| **Blank columns** | Subject/Date/Status will be empty since a student isn't an attendance record. Consider if this is acceptable. |
| **Duplicate rows** | If the same student already exists in the sheet (from a prior sync), we should detect and skip. |
| **Scope of work** | Currently sheets track attendance records, not student rosters. Adding bare student entries may feel mismatched. |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/sheetsService.js` | Update scope + add appendRow() method |
| `src/middleware/googleAuthMiddleware.js` | Update scope |
| `src/controllers/studentController.js` | After student creation, call sheet append logic |
| `keys.json` | **No change needed** — identity file only |
