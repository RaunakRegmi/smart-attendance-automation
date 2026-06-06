4. Admin manages active/inactive status
5. Sync jobs:
- Run daily (scheduled)
- Or manually (on demand)
6. Data processed via existing pipeline
7. Logs generated and viewable
8. Listing shows:
- Last successful sync time
- Status and grouping

---

## ⚠️ Key Considerations

- Google Sheets API authentication (OAuth / service account)
- Schema enforcement (strict format match)
- Idempotent sync jobs
- Efficient handling of multiple sheets
- Timezone correctness (NPT scheduling)
- Scalability of job processing

---

## 🧠 Optional Future Enhancements

- Real-time sync (instead of daily polling)
- Change detection (process only updated rows)
- Alerts for failed syncs
- Section-level analytics dashboards
- Auto-disable failing sheets after repeated errors