# Quick API Testing Guide

Test all API endpoints in 5 minutes using Swagger UI.

## 🚀 Start Here

1. **Start the server:**
   ```bash
   docker compose up
   ```

2. **Open Swagger UI:**
   ```
   http://localhost:5000/api-docs
   ```

## ✅ Test Sequence

Follow these steps to test all features:

### Step 1: Health Check
- **Endpoint**: GET `/api/health`
- **Action**: Click "Try it out" → "Execute"
- **Expected**: `{"success": true, "message": "Server is running"}`

### Step 2: Check Statistics (Empty DB)
- **Endpoint**: GET `/api/attendance/stats`
- **Action**: Click "Try it out" → "Execute"
- **Expected**: Shows 0 students, 0 records

### Step 3: Create Sample Excel File

Create a file named `sample.xlsx` with this data:

| Student Name | Email (Gmail) | Subject Code | Date | Attendance Status |
|---|---|---|---|---|
| John Doe | john@gmail.com | CS101 | 2024-01-15 | Present |
| Jane Smith | jane@gmail.com | CS101 | 2024-01-15 | Present |
| Mike Brown | mike@gmail.com | CS101 | 2024-01-15 | Absent |
| John Doe | john@gmail.com | MATH201 | 2024-01-15 | Present |
| Jane Smith | jane@gmail.com | MATH201 | 2024-01-15 | Absent |

### Step 4: Upload Excel File
- **Endpoint**: POST `/api/attendance/upload`
- **Action**: 
  1. Click "Try it out"
  2. Click "Choose File"
  3. Select your `sample.xlsx`
  4. Click "Execute"
- **Expected**: `{"success": true, "data": {"success": 5, "failed": 0}}`

### Step 5: Check Updated Statistics
- **Endpoint**: GET `/api/attendance/stats`
- **Action**: Click "Try it out" → "Execute"
- **Expected**: Shows 3 students, 5 records, attendance percentage

### Step 6: Search by Email
- **Endpoint**: GET `/api/attendance/search`
- **Action**:
  1. Click "Try it out"
  2. Enter parameter: `email = john@gmail.com`
  3. Click "Execute"
- **Expected**: Returns John's attendance records (2 records)

### Step 7: Filter by Subject
- **Endpoint**: GET `/api/attendance/filter`
- **Action**:
  1. Click "Try it out"
  2. Enter: `subjectCode = CS101`, `status = Present`
  3. Click "Execute"
- **Expected**: Returns 2 present records for CS101

### Step 8: Get Subject Percentage
- **Endpoint**: GET `/api/attendance/subject/CS101`
- **Action**: Click "Try it out" → "Execute"
- **Expected**: 
  ```json
  {
    "subjectCode": "CS101",
    "totalClasses": 3,
    "presentCount": 2,
    "absentCount": 1,
    "attendancePercentage": 66.67
  }
  ```

### Step 9: Get Student Percentage
- **Endpoint**: GET `/api/attendance/student-percentage/john@gmail.com`
- **Action**: Click "Try it out" → "Execute"
- **Expected**: Returns John's overall and subject-wise attendance percentage

### Step 10: Get Dashboard
- **Endpoint**: GET `/api/attendance/dashboard`
- **Action**: Click "Try it out" → "Execute"
- **Expected**: Shows today's attendance summary

### Step 11: Export to Excel
- **Endpoint**: GET `/api/attendance/export`
- **Action**:
  1. Click "Try it out"
  2. Enter (optional): `subjectCode = CS101`
  3. Click "Execute"
- **Expected**: Excel file downloads

## 📊 Test Results Checklist

- [ ] Health check working
- [ ] Empty statistics correct
- [ ] File upload successful
- [ ] Statistics updated after upload
- [ ] Email search returns correct records
- [ ] Filter works by subject and status
- [ ] Subject percentage calculated correctly
- [ ] Student percentage showing both overall and subject-wise
- [ ] Dashboard shows attendance summary
- [ ] Export downloads Excel file

## 🎯 Swagger UI Tips

### Finding Endpoints
Endpoints are grouped by tags:
- **Attendance** - Upload endpoint
- **Statistics** - Stats endpoint
- **Search** - Search endpoint
- **Filter** - Filter endpoint
- **Subject** - Subject-wise analysis
- **Student** - Student analysis
- **Export** - Export endpoint
- **Dashboard** - Dashboard endpoint

### Reading Responses

Each response shows:
- **Status Code** (200 = success, 404 = not found, 400 = error)
- **Response Headers**
- **Response Body** (Pretty-printed JSON)

### Testing Different Scenarios

**Scenario 1: Upload multiple times**
- Upload same data twice
- Second upload shows 0 new records (duplicates detected)

**Scenario 2: Search non-existent student**
- Search for email: `notexist@gmail.com`
- Expected: 404 error "Student not found"

**Scenario 3: Filter with multiple criteria**
- Filter by date and status together
- Should show only matching records

**Scenario 4: Pagination**
- Add `page=1&limit=10` to search or filter
- Try page 2 when you have > 10 records

## 🔧 Troubleshooting

### Swagger Not Loading
**Problem**: Getting 404 or blank page
**Solution**:
1. Ensure server is running: `docker compose logs -f app`
2. Check URL: `http://localhost:5000/api-docs`
3. Try refreshing browser (Ctrl+F5)

### Upload Fails
**Problem**: File upload returns error
**Solution**:
1. Ensure file is .xlsx format
2. Check file size < 5MB
3. Verify Excel headers match exactly:
   - Student Name
   - Email (Gmail)
   - Subject Code
   - Date
   - Attendance Status

### Search Returns 404
**Problem**: Email search not finding student
**Solution**:
1. Verify email was uploaded (check stats first)
2. Use exact email address (case-insensitive)
3. Ensure no extra spaces in email

### Database Connection Error
**Problem**: Server shows DB connection error
**Solution**:
1. Check PostgreSQL is running: `docker ps`
2. Verify password is "admin"
3. Restart: `docker compose restart`

## 📝 Example Curl Commands

If you prefer testing with curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Get statistics
curl http://localhost:5000/api/attendance/stats

# Search by email
curl "http://localhost:5000/api/attendance/search?email=john@gmail.com"

# Filter by subject
curl "http://localhost:5000/api/attendance/filter?subjectCode=CS101"

# Get subject percentage
curl http://localhost:5000/api/attendance/subject/CS101

# Get student percentage
curl http://localhost:5000/api/attendance/student-percentage/john@gmail.com

# Get dashboard
curl http://localhost:5000/api/attendance/dashboard

# Export to Excel
curl "http://localhost:5000/api/attendance/export" -o attendance.xlsx
```

## ✨ Next Steps

After testing:
1. Create your own Excel file with real data
2. Upload it using the upload endpoint
3. Query the data using various endpoints
4. Export results back to Excel
5. Integrate into your application

## 📖 More Help

- Full Swagger Guide: [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)
- API Reference: [SETUP_GUIDE.md](./SETUP_GUIDE.md#api-endpoints)
- Excel Format: [SAMPLE_EXCEL_FORMAT.md](./SAMPLE_EXCEL_FORMAT.md)

Happy testing! 🚀
