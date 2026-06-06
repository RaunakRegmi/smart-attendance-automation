Implement an automated attendance sync scheduler system without breaking any existing functionality.

Requirements:

1. Background Sync Job
- Create a reusable background job system if one does not already exist.
- Jobs must support:
  - create
  - update
  - pause
  - resume
  - manual trigger
- Jobs run daily at a configurable time in Nepal Time (Asia/Kathmandu).

2. Auto Sync API
Create dedicated APIs to:
- create sync job
- update sync schedule/time
- pause/resume job
- manually trigger sync
- fetch sync logs/status

3. Active Sheet Filtering
Automatic sync jobs must only process sheets with `status = active` in the database.

4. Attendance Sync Logic
While syncing attendance:
- Read date headers from Row 7, Columns E → AL.
- Identify the latest already-synced attendance date from the system/database.
- Sync only columns after the last synced date.
- If no new attendance exists:
  - skip sync
  - create clear log message such as:
    `Attendance already synced up to <date>`.

5. Manual Sync
Manual sync must:
- use the request trigger timestamp as sync initiated time
- follow the same validation, retry, and logging flow as auto sync
- return immediate success acknowledgement to the user

6. Retry Mechanism
If sync fails:
- retry automatically up to 2 additional times
- capture failure details in logs

7. Sync Logging
Maintain detailed sync logs including:
- sync type (`AUTO` or `MANUAL`)
- sheet name/id
- sync start time
- sync completion time
- status (`SUCCESS`, `FAILED`, `SKIPPED`)
- retry count
- failure reason/error details

Logs must clearly distinguish between automatic and manual syncs.

8. Data Integrity
Ensure:
- no duplicate attendance records
- consistent sync state
- idempotent retry behavior
- no corruption of existing data

9. Backward Compatibility
Do not alter, break, or regress any existing system functionality.

10. Project Guidelines
Before implementation:
- review all guidelines inside the `docs/` directory
- strictly follow `Persist-Changes.md`

Deliverables:
- APIs
- background scheduler implementation
- retry mechanism
- sync log system
- attendance incremental sync logic
- necessary DB changes/migrations
- tests for scheduler, retry flow, and sync logic


************************************************************************************
                                FIXES
************************************************************************************

You already implemented the scheduler, queue registration, APIs, and sync job creation.

Now perform a COMPLETE EXECUTION FLOW AUDIT and FIX the actual job execution pipeline.

Current issue:

* Jobs are being created/queued successfully
* Scheduler APIs work
* But queued jobs are never actually completing attendance sync
* Newly added sheets are not being fetched/processed/stored automatically
* Immediate sync during add-sheet partially fails

Observed runtime error:
`rollback has been called on this transaction(...), you can no longer use it`

This indicates transaction/session misuse after rollback.

Your task now is NOT to rebuild the scheduler.
Your task is to FIX the execution architecture safely without breaking existing functionality.

Requirements:

1. Diagnose Full Job Lifecycle
   Trace and verify:

* scheduler registration
* queue insertion
* worker pickup
* worker execution
* transaction lifecycle
* retry handling
* completion/failure handling
* logging persistence

Identify exactly where execution stops.

2. Fix Transaction Handling
   Ensure:

* no query executes after rollback
* failed transactions are fully disposed
* each retry gets a fresh DB transaction/session
* long-running sync jobs do not reuse invalid transaction objects
* transaction boundaries are isolated per sheet sync

IMPORTANT:
Do NOT wrap entire multi-sheet sync inside one transaction.
Use smaller isolated transactions:

* one transaction per sheet
* optionally one transaction per attendance batch

3. Ensure Workers Actually Execute Jobs
   Verify:

* queue workers are started during app boot
* workers are subscribed to correct queue names
* concurrency config is valid
* job handlers are properly registered
* scheduler triggers worker execution
* no silent promise rejection exists

Add startup logs:

* worker initialized
* queue connected
* scheduler started
* jobs picked
* jobs completed
* jobs failed

4. Newly Added Sheet Behavior
   When a new sheet is added:

* automatically enqueue immediate sync job
* fetch sheet data immediately
* process attendance
* persist records
* create sync logs
* update sync state

If sync fails:

* sheet should still remain registered
* failure should only affect sync status/logs
* API should clearly report partial success

Expected behavior:
"Sheet registered successfully. Initial sync queued."

5. Make Sync Fully Idempotent
   Ensure:

* duplicate attendance rows are never inserted
* retries do not create duplicate data
* partially completed syncs can safely rerun
* latest synced date is updated only after successful persistence

Use:

* upsert strategy
* unique constraints where necessary
* transactional consistency

6. Incremental Sync Validation
   During execution:

* read Row 7 headers from columns E → AL
* determine latest synced attendance date
* sync only newer dates
* if no newer dates:
  create SKIPPED log:
  `Attendance already synced up to <date>`

7. Retry Architecture
   Retries must:

* create fresh execution context
* create fresh transaction/session
* preserve retry count in logs
* stop after max retries
* never corrupt sync state

8. Logging Improvements
   Add detailed structured logs:

* jobId
* sheetId
* queue event timestamps
* worker pickup timestamp
* sync start/end
* retry number
* DB transaction start/commit/rollback
* failure stack traces

9. Startup Verification
   At app startup:

* verify scheduler initialized
* verify worker running
* verify queues connected
* verify pending jobs recover correctly

10. Tests
    Add tests for:

* worker execution
* retry after rollback
* adding new sheet triggers sync
* incremental sync
* skipped sync
* duplicate prevention
* transaction rollback isolation

11. IMPORTANT SAFETY REQUIREMENTS

* Review docs/ directory again
* Follow Persist-Changes.md strictly
* Do NOT break existing APIs or flows
* Do NOT remove current scheduler architecture unless necessary
* Prefer targeted fixes over rewrites
* Preserve backward compatibility

Finally provide:

* root cause analysis
* exact files changed
* execution flow diagram
* how retries now work
* how transactions are isolated
* how new sheet onboarding works
* how to monitor worker health
