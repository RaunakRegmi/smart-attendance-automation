# Swagger API Documentation Guide

Interactive API testing interface with Swagger UI.

## 🎯 Access Swagger UI

Once the server is running:

```
http://localhost:5000/api-docs
```

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   docker compose up
   # or
   npm run dev
   ```

2. **Open Swagger in your browser:**
   ```
   http://localhost:5000/api-docs
   ```

3. **Test any API endpoint** - Click on an endpoint and click "Try it out"

## 📚 Available Endpoints

### Upload & Import
- **POST** `/api/attendance/upload` - Upload Excel file with attendance data
  - Accepts .xlsx or .xls files
  - Returns upload summary with success/failure counts

### Statistics & Dashboard
- **GET** `/api/attendance/stats` - Get overall attendance statistics
- **GET** `/api/attendance/dashboard` - Get today's attendance summary

### Search & Filter
- **GET** `/api/attendance/search` - Search student by email
  - Parameters: email (required), page, limit
  - Returns: Student details + attendance history
  
- **GET** `/api/attendance/filter` - Filter attendance records
  - Parameters: subjectCode, date, status, page, limit
  - Returns: Filtered records with pagination

### Subject & Student Analysis
- **GET** `/api/attendance/subject/{subjectCode}` - Get subject attendance percentage
  - Returns: Total classes, present/absent counts, percentage
  
- **GET** `/api/attendance/student-percentage/{email}` - Get student attendance percentage
  - Returns: Overall + subject-wise attendance percentages

### Export
- **GET** `/api/attendance/export` - Export attendance to Excel
  - Parameters: subjectCode (optional), date (optional)
  - Returns: Excel file download

## 💡 How to Use Swagger UI

### 1. Expand an Endpoint
Click on any endpoint to expand its details:
```
[GET] /api/attendance/stats ▼
```

### 2. Click "Try it out"
```
┌─ Try it out ─┐
└──────────────┘
```

### 3. Fill in Parameters (if needed)
For endpoints with query or path parameters, enter values:
```
email: john@gmail.com
page: 1
limit: 10
```

### 4. Click "Execute"
```
┌─ Execute ─┐
└────────────┘
```

### 5. View Response
The response will show:
- Status code
- Response headers
- Response body (JSON)

## 📋 Example Requests in Swagger

### Example 1: Upload Excel File
1. Find POST `/api/attendance/upload`
2. Click "Try it out"
3. Click "Choose File" and select your attendance.xlsx
4. Click "Execute"
5. See upload summary with success/failure counts

### Example 2: Search Student
1. Find GET `/api/attendance/search`
2. Click "Try it out"
3. Enter: `email = john@gmail.com`
4. Click "Execute"
5. See student's attendance history

### Example 3: Filter by Subject
1. Find GET `/api/attendance/filter`
2. Click "Try it out"
3. Enter: `subjectCode = CS101` and `status = Present`
4. Click "Execute"
5. See all present attendance records for CS101

### Example 4: Export Data
1. Find GET `/api/attendance/export`
2. Click "Try it out"
3. Enter optional filter: `subjectCode = CS101`
4. Click "Execute"
5. File downloads automatically

## 🔧 Response Codes

- **200** - Successful request
- **400** - Bad request (validation error, missing file)
- **404** - Resource not found (student not found, etc)
- **500** - Server error

## 📊 Sample Response

### Get Statistics Response:
```json
{
  "success": true,
  "data": {
    "totalStudents": 50,
    "totalRecords": 500,
    "presentCount": 425,
    "absentCount": 75,
    "presentPercentage": "85.00"
  }
}
```

### Search Student Response:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 1,
      "name": "John Doe",
      "email": "john@gmail.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "attendance": [
      {
        "id": 1,
        "studentId": 1,
        "subjectId": 1,
        "date": "2024-01-15",
        "status": "Present",
        "Student": { ... },
        "Subject": { "id": 1, "subjectCode": "CS101" }
      }
    ],
    "pagination": {
      "total": 10,
      "pages": 1,
      "currentPage": 1
    }
  }
}
```

## 🎨 Swagger UI Features

### 1. Try it Out
Test endpoints directly without leaving the UI

### 2. Syntax Highlighting
Color-coded JSON responses for easy reading

### 3. Schema Validation
Automatic validation of required fields

### 4. Request History
View previous requests (browser dependent)

### 5. Download Curl Command
Some versions allow copying curl commands

## 📱 Mobile Access

Swagger UI is mobile-responsive. Access from:
```
http://localhost:5000/api-docs
```

on any device on your network.

## 🔑 Authentication (Future)

When authentication is added, use the "Authorize" button to enter tokens.

## 📌 Tips & Tricks

1. **Pagination**: Use `page` and `limit` parameters for large datasets
   - Default: page=1, limit=10
   - Max limit: 100 records per page

2. **Date Format**: Use YYYY-MM-DD format for date queries
   - Example: `2024-01-15`

3. **Status Values**: Case-sensitive
   - Valid: `Present` or `Absent`
   - Invalid: `present`, `PRESENT`, `P`

4. **Email Search**: Must be exact match
   - Use full email: `john@gmail.com`

5. **File Upload**: Only .xlsx and .xls files
   - Max file size: 5MB (configurable)

## 🐛 Troubleshooting

### Swagger Not Loading
- Ensure server is running: `docker compose up`
- Check: `http://localhost:5000/api-docs`
- Check console for errors: `docker compose logs -f app`

### File Upload Not Working in Swagger
- Ensure file is .xlsx or .xls format
- Check file size (max 5MB)
- Try uploading from Swagger UI directly

### Endpoint Returns Error
- Check response code in Swagger UI
- Read error message in response body
- Verify parameters are correct

## 📚 API Documentation Files

Swagger spec is auto-generated from:
- `src/routes/attendanceRoutes.js` - Endpoint JSDoc comments
- `src/config/swagger.js` - Base configuration

To add new endpoints:
1. Add JSDoc comments in routes file
2. Include `@swagger` tags
3. Server auto-updates documentation

## 🔗 Additional Resources

- View raw Swagger JSON: `http://localhost:5000/api-docs/swagger.json`
- Health check: `http://localhost:5000/api/health`
- Home: `http://localhost:5000/`

## 📞 Support

For issues with:
- **API Logic**: Check attendanceController.js
- **Database**: Check models folder
- **Validation**: Check validators folder
- **Documentation**: Check swagger.js config

Happy testing! 🚀
