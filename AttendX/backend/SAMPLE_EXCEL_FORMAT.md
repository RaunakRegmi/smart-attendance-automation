# Sample Excel Format for Attendance Upload

Create an Excel file (.xlsx or .xls) with the following structure:

| Student Name | Email (Gmail) | Subject Code | Date | Attendance Status |
|---|---|---|---|---|
| John Doe | john@gmail.com | CS101 | 2024-01-15 | Present |
| Jane Smith | jane@gmail.com | CS101 | 2024-01-15 | Present |
| John Doe | john@gmail.com | CS101 | 2024-01-16 | Absent |
| Jane Smith | jane@gmail.com | CS101 | 2024-01-16 | Present |
| John Doe | john@gmail.com | MATH201 | 2024-01-15 | Present |
| Jane Smith | jane@gmail.com | MATH201 | 2024-01-15 | Absent |

## Column Requirements:
- **Student Name**: Full name of the student (string)
- **Email (Gmail)**: Valid email address (must include @gmail.com or other domain)
- **Subject Code**: Course or subject code (string, e.g., CS101, MATH201)
- **Date**: Date of the class (YYYY-MM-DD format)
- **Attendance Status**: Either "Present" or "Absent" (case-sensitive)

## Important Notes:
1. Headers must match exactly as shown above
2. Dates should be in YYYY-MM-DD format
3. Duplicate entries (same student + subject + date) will be skipped
4. Email must be unique per student
5. The file should have at least one row of data besides headers
