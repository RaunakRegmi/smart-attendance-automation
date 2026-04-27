
#### 🧑‍💼 Admin Capabilities
- View all linked sheets grouped by:
- Batch
- Section
- Mark sheets:
- ✅ Active
- ❌ Inactive
- Manage multiple sheets with identical format

#### 📊 Sheet Metadata (per sheet)
- Sheet name
- Batch
- Section
- Status (Active/Inactive)
- Last successful attendance sync time (NEW)
- Last attempted sync time
- Next scheduled sync time (derived)
- Created by / Admin reference

---

### 3. **Advanced Sheet Listing & Filtering**

Admin should be able to:

#### 🔍 Filter by:
- Batch
- Section
- Status (Active / Inactive)
- Last sync time (e.g., today, last 7 days, never synced)
- Job run time (scheduled/manual)

#### 📋 Listing View Should Show:
- Sheet name
- Batch → Section hierarchy
- Status
- 🕒 **Last successful attendance sync time** (NEW)
- Last job run status
- Sync trigger type (Manual / Scheduled)

---

### 4. **Data Processing (Unchanged Core Logic)**
- Same pipeline as Excel:
- Extract students, subjects, attendance
- Validate schema
- Transform & store
- Ensure:
- No duplication
- Idempotent processing

---

### 5. **Sync Job System**

#### 🔄 Automatic Sync
- Runs **daily once**
- Timezone: **Nepal Time (NPT)**
- Applies to:
- All **active sheets only**

#### ⚙️ Manual Sync
Admin can:
- Trigger sync for:
- Single sheet
- Multiple sheets (bulk)
- Works independently of scheduled jobs

---

### 6. **Scheduler Configuration**
- Admin can:
- Set daily sync time
- Update anytime

#### 🔁 Behavior:
- Changes apply immediately
- Future jobs follow updated schedule

---

### 7. **Job Logging & Monitoring (Enhanced)**

#### 📝 Per Job Log
- Job ID
- Trigger type:
- Manual / Scheduled
- Start time / End time
- Status:
- Success / Partial / Failed
- Sheets processed
- Records processed
- Errors (if any)

#### 📊 Drill-down Logs
- Per-sheet execution:
- Fetch → Parse → Store
- Per-step status

#### 📁 Grouping
- Logs grouped by:
- Job run
- Date
- Trigger type

#### 👀 Admin Capabilities
- View all jobs
- Filter logs
- View job details
- Inspect sheet-level processing
- Track historical sync performance

---

## 🔁 Workflow Summary

1. Admin links Google Sheet + assigns:
 - Batch
 - Section
2. System validates & stores
3. Sheet appears under: