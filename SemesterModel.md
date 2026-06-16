# Semester Model — Design Discussion

## 1. Problem Statement

Currently, the system conflates two distinct concepts into a single `Batch` model:

- **Enrollment Cohort** (what "Batch" currently represents) — e.g., "Autumn 2025". When the student enrolled. Never changes.
- **Academic Progression** (what "Semester" should represent) — e.g., "Semester 1", "Semester 2". Changes every academic period until graduation.

There is no mechanism to transition students between semesters, and attendance records carry no semester context, making historical analysis and cross-semester comparison difficult or impossible.

---

## 2. Current Architecture (as-is)

| Concept | How it's modeled | Problem |
|---------|-----------------|---------|
| Enrollment cohort | `Batch` table (e.g., "Autumn 2025") | Works correctly |
| Academic period | Also `Batch` (e.g., "Spring 2026" treated as a new batch) | Conflated — a student changing "batch" loses their cohort identity |
| Semester progression | Not modeled at all | No way to know which semester a student was in when attendance was recorded |
| Student ↔ Subject | Implicit through `Attendance` records only | No direct relationship, but functional |
| Attendance context | `(studentId, subjectId, date)` | No semester/batch field — can't distinguish "Sem 1 CS101" from "Sem 2 CS101" |

---

## 3. Proposed Design Principles

1. **Batch = Immutable Enrollment Cohort** — Never changes after student creation. Represents "Class of 2029."
2. **Semester = Academic Progression** — Changes each term. Tracked separately.
3. **Attendance carries semester context** — Every attendance record knows which semester it belongs to.
4. **No data loss** — Old attendance remains valid and queryable forever.
5. **Backward compatible** — Existing data survives migration.

---

## 4. Phase 1: Fixed Semester Model

A minimal, pragmatic first step. Adds a Semester table and related FKs without building the full customizable system.

### Data Model

```
Batch          → { id, name: "Autumn 2025", abbreviation: "AUT2025" }
                 ↑ IMMUTABLE — enrollment cohort

Semester       → { id, name: "Semester 1", order: 1, batchId (FK → Batch),
                   startDate, endDate }
                 ↑ order defines sequence (1, 2, 3...8)
                 ↑ batchId scopes semesters to a specific cohort

Student        → { ..., batchId (FK → Batch, immutable),
                   currentSemesterId (FK → Semester, updatable) }

Sheets         → { ..., batchId, sectionId, semesterId (FK → Semester) }
                 ↑ Each sheet is linked to one semester

Attendance     → { ..., semesterId (FK → Semester) }
                 ↑ Stamped during sync from the linked sheet's semester
```

### Unique Constraint Consideration

Backlogs/retakes are **out of scope for Phase 1** — retake concept set aside. The existing unique constraint `(studentId, subjectId, date)` remains unchanged.

### Changes Required

| Area | Change |
|------|--------|
| **New model** | `Semester.js` (Sequelize model) |
| **Migration** | Create `semesters` table, add FKs to `students`, `sheets`, `attendance`, `routines` |
| **Sync service** | `sheetsService.js` — stamp `semesterId` from linked sheet during sync |
| **Scheduler** | Skip auto-sync for sheets whose semester's `endDate` has passed; manual sync always works |
| **Routine upload** | Accept `semesterId`; scope destroy/create to section + semester |
| **Admin API** | CRUD for semesters, semester picker when linking sheets and uploading routines |
| **Angular UI** | Semester management page (same pattern as Batches), semester fields in sheet linking and routine upload forms |
| **Flutter UI** | Semester-aware default view (current semester), semester picker for historical views |
| **Chatbot** | `csv_builder.py` — send ALL semesters to chatbot (no knowledge loss). Semester field added to CSVs |
| **Reports** | All 21 existing report views get a semester filter (default = current). New: Student Semester Comparison, Section Semester Comparison, Batch Semester Comparison, Batch Overall Comparison |
| **Backfill script** | One-time migration to assign semesters to existing attendance records by inferring from sheet's batch/section context |

### Backward Compatibility Strategy

All new FKs (`semesterId` on Attendance, Sheets, Routine) are **nullable initially**. No semester filter = returns all records (existing behavior preserved). Frontend and mobile updates can be deployed incrementally after the migration without breakage.

### Complexity Estimate

| Dimension | Effort |
|-----------|--------|
| Backend (model + migration + sync/routine changes) | 3-4 days |
| Admin UI (Angular) | 4-6 days |
| Student app (Flutter) | 2-3 days |
| Chatbot analytics update | 1 day |
| Data backfill | 1 day |
| **Total** | **~11-15 days** |

### Value

80% of the benefit for 20% of the effort. Unblocks semester-level queries, historical analysis, proper student progression tracking, and semester-scoped routines.

---

## 5. Refined Phase 1 Design (from Discussion)

### Final Semester Model

```js
Semester → {
  id:          INTEGER (PK, autoIncrement),
  name:        STRING,          // "Semester 1", "Semester 2"...
  order:       INTEGER,         // 1, 2, 3...8 — defines sequence
  batchId:     UUID (FK→Batch), // scopes semesters to a cohort
  startDate:   DATEONLY,        // term begins
  endDate:     DATEONLY,        // term ends — drives "current" detection
}
```

### Where semesterId is added

| Table | FK | Purpose |
|-------|----|---------|
| Attendance | `semesterId (FK→Semester)` | Stamped during sync from sheet |
| Sheets | `semesterId (FK→Semester)` | Admin picks semester when linking |
| Routine | `semesterId (FK→Semester)` | Each semester has its own timetable |
| Student | `currentSemesterId (FK→Semester)` optional | Explicit progression pointer |

### How "current semester" is determined (date-driven)

```
Query: startDate <= today AND endDate >= today
         → active semester found → use it
         → no active semester → fallback to most recent by endDate DESC
```

No `isCurrent` flag. No admin toggle. Dates drive everything.

### Sync behavior

- **Auto sync** (background scheduler): checks `Semester.endDate`. If past, sheet is skipped.
- **Manual sync** (admin triggered): always proceeds regardless of endDate.

### Student & admin default view

By default: **current semester**. Fallback: **last semester** during gaps. Semester picker available to browse any historical semester.

### Chatbot knowledge

The chatbot receives **all semesters** in its payload. No semester scoping — it retains full historical awareness.

### Report catalog (21 total)

All existing 17 reports get a semester filter (default = current). 4 new comparison reports:
- Student Semester Comparison
- Section Semester Comparison
- Batch Semester Comparison
- Batch Overall Comparison

### What's excluded from Phase 1

- Backlogs / retakes / multi-semester enrollment
- `isCurrent` flag on Semester
- Custom academic term hierarchy (reserved for Phase 2)
- NOT NULL constraints on semesterId FKs (added after backfill)

---

## 6. Phase 2: Fully Customizable Academic Term System

A generalized system that can model any college's academic structure — yearly, semester-based, trimester, or hybrid.

### Objectives

- Admin can define their **program structure** (3-year, 4-year, 4-year + placement, 4-year + training semester, etc.)
- Admin can define **custom terms/events** (Early Bird Session, Training Semester, Placement Year, Internship)
- Terms can be **hierarchical** (Year > Semester, or flat)
- Each term has **customizable** name, type, order, start/end dates (or duration from start)
- System validates **no date overlaps** and **proper sequencing**
- Supports **hybrid models** (yearly with semester breakdown)

### Conceptual Data Model

```
CollegeProfile → { id, name }

Program → { id, name: "B.Tech", collegeId, defaultDurationYears }

TermTemplate → { id, programId, name: "Year 1", type: "year"|"semester"|"training"|"placement"|"session",
                 parentId (nullable, for nesting), order, defaultDurationWeeks,
                 isCredit: boolean, isOptional: boolean }

AcademicCycle → { id, programId, batchId, name: "Autumn 2025 - Spring 2029",
                  startDate, endDate }

TermInstance → { id, academicCycleId, termTemplateId, name: "Semester 1",
                 order, startDate, endDate (or computed from duration),
                 parentId (nullable) }

StudentTerm → { id, studentId, termInstanceId, enrollmentDate,
                status: "pending"|"active"|"completed"|"failed"|"exempted" }

Attendance → { ..., termInstanceId }   ← replaces semesterId
```

### Example Configurations

**4-Year Engineering (8 semesters)**
```
Program: B.Tech (4 years)
├── Year 1
│   ├── Semester 1 (12 weeks, credit)
│   ├── Semester 2 (12 weeks, credit)
├── Year 2
│   ├── Semester 3 (12 weeks, credit)
│   ├── Semester 4 (12 weeks, credit)
├── Year 3
│   ├── Semester 5 (12 weeks, credit)
│   ├── Semester 6 (12 weeks, credit)
├── Year 4
│   ├── Semester 7 (12 weeks, credit)
│   ├── Semester 8 (12 weeks, credit)
```

**4-Year with Placement Year**
```
Program: B.Tech (4 years + placement)
├── Year 1 ... Year 3 (same as above)
├── Year 4
│   ├── Industry Placement (6 months, non-credit)
│   ├── Project Semester (6 months, credit)
```

**3-Year Semester System**
```
Program: B.Sc. (3 years)
├── Semester 1 (16 weeks, credit)
├── Semester 2 (16 weeks, credit)
├── Semester 3 (16 weeks, credit)
├── Semester 4 (16 weeks, credit)
├── Semester 5 (16 weeks, credit)
├── Semester 6 (16 weeks, credit)
```

**Custom: Early Bird Session → Semester → Training**
```
Program: Custom
├── Early Bird Session (4 weeks, non-credit)
├── Semester 1 (12 weeks, credit)
├── Semester 2 (12 weeks, credit)
├── Training Semester (8 weeks, non-credit)
├── Semester 3 (12 weeks, credit)
├── Semester 4 (12 weeks, credit)
```

### Complexity Estimate

| Dimension | Effort | Notes |
|-----------|--------|-------|
| Data model (backend) | 3-4 days | TermTemplate, TermInstance, StudentTerm, associations |
| Admin config UI | **8-12 days** | Visual term builder with drag-drop, date validation, duration calculator — this is the hardest part |
| Sync service update | 1-2 days | Replace semesterId with termInstanceId |
| Student app | 2-3 days | Term navigation, progression view |
| Reporting/chatbot | 2-3 days | Update CSV builder for flexible term hierarchy |
| Validation engine | 2-3 days | Date overlap checks, ordering rules, program completeness validation |
| Migration from Phase 1 | 2-3 days | Convert fixed semesters to TermInstances |
| **Total** | **~20-30 days** | Heavily UI-dependent |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Admin UI complexity | High | Phase 1 first to validate core need |
| Over-engineering for edge cases | Medium | Start with 80% case, iterate |
| Performance: deep hierarchical queries | Low | Flatten hierarchy with `path` materialized column (like nested sets) |
| Backward compat with existing data | Medium | Phase 1 data maps naturally into Phase 2 |

---

## 7. Comparison: Phase 1 vs Phase 2

| Criteria | Phase 1 (Fixed Semester) | Phase 2 (Custom Terms) |
|----------|--------------------------|------------------------|
| Time to ship | ~2 weeks | ~4-6 weeks |
| Flexibility | Semester-only | Any academic calendar |
| Admin effort to configure | Minimal (pick semester number) | High (define full structure) |
| Maintenance burden | Low | Medium |
| Future-proofing | Moderate | High |
| Risk | Low | Medium (UI complexity) |

---

## 8. Decisions Made (Discussion Outcome)

1. **Semester on Attendance + Sheets + Routine** — all three get `semesterId`. Student gets optional `currentSemesterId`.
2. **Current semester detection** — date-driven (`startDate`/`endDate`). No `isCurrent` flag.
3. **Backward compatibility** — all new FKs are nullable. No breakage on migration.
4. **Auto sync** skips ended semesters via endDate check. **Manual sync** always works.
5. **User default view** — current semester. Fallback = last semester during gaps.
6. **Chatbot** — receives ALL semesters (no knowledge loss).
7. **Backlogs/retakes** — excluded from Phase 1. Unique constraint unchanged.
8. **Reports** — all existing 17 + 4 new semester comparison reports (21 total).
9. **Routine** — semester-scoped. Upload replaces for section + semester only.
10. **Full-stack deployment** — migration, backend, Angular, Flutter, chatbot all at once. Nullable FKs ensure zero breakage.

## 9. Open Questions (Deferred to Phase 2)

1. **Backlogs/retakes**: Multi-semester enrollment handling.
2. **Non-credit terms**: Training, placement, early-bird sessions.
3. **Custom term hierarchy**: Year > Semester nesting, hybrid calendars.
