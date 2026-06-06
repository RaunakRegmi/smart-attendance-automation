# Attendance Sheet Validation Guidelines

## Purpose
This document describes the validation rules applied when importing attendance data, either via manual Excel upload or automatic Google Sheet sync. It ensures data integrity by rejecting sheets with ambiguous or missing date information.

## Validation Rules
1. **Supported Formats**
   - **Flat Header**: A header row containing `Student Name`, `Email (Gmail)`, `Subject Code`, `Date`, and a column containing the word `Attendance` (e.g., `Attendance Status`).
   - **Legacy Format**: Subject code in **row 3** and session dates in **row 7**. All values in row 7 must be parsable dates.

2. **Row 7 Date Validation**
   - Each cell in row 7 is parsed using `parseDateValue`.
   - If any cell cannot be converted to a valid JavaScript `Date`, the import is **rejected**.
   - The response includes a detailed error listing the offending columns.

3. **Error Response Structure**
   ```json
   {
     "success": false,
     "message": "Sheet contains invalid date headers in row 7",
     "details": ["Column 2: Oct 5", "Column 5: Invalid Date"]
   }
   ```

4. **Skipping Invalid Records**
   - Even after a successful validation, any attendance record lacking a parsed `date` is skipped and reported in the `errors` array of the upload response.

## Impact on Calculations
- **Total Sessions**: Computed as the number of **valid distinct dates** (row 7) for a given subject.
- **Attendance Percentage**: `(Present + Late) / Total Sessions * 100`.
- **Separate Counts**: `presentCount`, `lateCount`, and `absentCount` are still stored individually.

## API Changes
- **Swagger**: Updated to reference `ValidationError` schema and added detailed description for the upload endpoint.
- **Controller (`uploadExcel`)**: Implements validation, error logging, and response handling.
- **Parsing (`excelHandler.parseTabularData`)**: Adds `invalidDateHeaders` detection.

## Sync Process
The same validation runs during automatic Google Sheet sync (`sheetsService.syncSheet`) because it relies on `excelHandler.parseTabularData`. Sheets with invalid dates will fail to sync and return the same validation error.

## Future Considerations
- Add unit tests for both valid and invalid sheet scenarios.
- Potentially expose a separate endpoint to preview validation errors before committing data.

---
*Document version: 2026‑05‑08*