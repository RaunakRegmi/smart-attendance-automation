# Student Attendance Management System - Setup Guide

A complete Node.js backend system for managing student attendance with Excel upload/export functionality.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE attendance_db;
```

### 3. Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=your_password

UPLOAD_DIR=uploads
MAX_FILE_SIZE=5000000
ALLOWED_EXTENSIONS=xlsx,xls
```

### 4. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## Project Structure

```
student-attendance-system/
├── src/
│   ├── controllers/
│   │   └── attendanceController.js    # Business logic
│   ├── models/
│   │   ├── Student.js               # Student model
│   │   ├── Subject.js               # Subject model
│   │   └── Attendance.js            # Attendance model
│   ├── routes/
│   │   └── attendanceRoutes.js      # API routes
│   ├── middleware/
│   │   ├── errorHandler.js          # Error handling
│   │   └── validateRequest.js       # Request validation
│   ├── config/
│   │   └── database.js              # Database configuration
│   ├── validators/
│   │   └── attendanceValidator.js   # Joi schemas
│   ├── utils/
│   │   └── excelHandler.js          # Excel parsing & export
│   └── index.js                     # Main entry point
├── uploads/                         # Uploaded Excel files (auto-created)
├── exports/                         # Exported Excel files (auto-created)
├── package.json
├── .env.example
└── SETUP_GUIDE.md
```

## API Endpoints

### 1. Upload Attendance Excel
**POST** `/api/attendance/upload`
- Upload an Excel file with attendance data
- Returns: Upload summary with success/failure counts

```bash
curl -X POST -F "file=@attendance.xlsx" http://localhost:5000/api/attendance/upload
```

### 2. Get Attendance Statistics
**GET** `/api/attendance/stats`
- Get overall attendance statistics
- Returns: Total students, records, present/absent counts

```bash
curl http://localhost:5000/api/attendance/stats
```

### 3. Search Student by Email
**GET** `/api/attendance/search?email=john@gmail.com&page=1&limit=10`
- Search attendance history by student email
- Returns: Student details and attendance records

```bash
curl "http://localhost:5000/api/attendance/search?email=john@gmail.com"
```

### 4. Filter Attendance
**GET** `/api/attendance/filter?subjectCode=CS101&status=Present&page=1&limit=10`
- Filter attendance by subject, date, or status
- Supports pagination

```bash
curl "http://localhost:5000/api/attendance/filter?subjectCode=CS101&status=Present"
```

### 5. Get Subject-wise Attendance Percentage
**GET** `/api/attendance/subject/:subjectCode`
- Get attendance percentage for a specific subject
- Returns: Total classes, present/absent counts, percentage

```bash
curl http://localhost:5000/api/attendance/subject/CS101
```

### 6. Export Attendance to Excel
**GET** `/api/attendance/export?subjectCode=CS101`
- Export attendance records to Excel file
- Optional filters: subjectCode, date
- Returns: Excel file download

```bash
curl -o attendance.xlsx "http://localhost:5000/api/attendance/export?subjectCode=CS101"
```

### 7. Get Student Attendance Percentage
**GET** `/api/attendance/student-percentage/:email`
- Get overall and subject-wise attendance percentage for a student

```bash
curl http://localhost:5000/api/attendance/student-percentage/john@gmail.com
```

### 8. Get Dashboard Data
**GET** `/api/attendance/dashboard`
- Get summary data for today (total students, present/absent today)

```bash
curl http://localhost:5000/api/attendance/dashboard
```

### 9. Health Check
**GET** `/api/health`
- Check if server is running

```bash
curl http://localhost:5000/api/health
```

## Database Schema

### Students Table
```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subjects Table
```sql
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  subjectCode VARCHAR UNIQUE NOT NULL,
  subjectName VARCHAR,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  studentId INTEGER NOT NULL REFERENCES students(id),
  subjectId INTEGER NOT NULL REFERENCES subjects(id),
  date DATE NOT NULL,
  status ENUM('Present', 'Absent') DEFAULT 'Absent',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(studentId, subjectId, date)
);
```

## Excel Format

See `SAMPLE_EXCEL_FORMAT.md` for the required Excel file format.

Key points:
- Columns: Student Name, Email (Gmail), Subject Code, Date, Attendance Status
- Date format: YYYY-MM-DD
- Status: "Present" or "Absent"
- File types: .xlsx or .xls

## Example Request/Response

### Upload Excel
**Request:**
```bash
POST /api/attendance/upload
Content-Type: multipart/form-data
file: [attendance.xlsx]
```

**Response:**
```json
{
  "success": true,
  "message": "Excel file processed",
  "data": {
    "success": 10,
    "failed": 0,
    "errors": []
  }
}
```

### Search by Email
**Request:**
```
GET /api/attendance/search?email=john@gmail.com&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 1,
      "name": "John Doe",
      "email": "john@gmail.com"
    },
    "attendance": [
      {
        "id": 1,
        "studentId": 1,
        "subjectId": 1,
        "date": "2024-01-15",
        "status": "Present",
        "Student": { "id": 1, "name": "John Doe", "email": "john@gmail.com" },
        "Subject": { "id": 1, "subjectCode": "CS101" }
      }
    ],
    "pagination": {
      "total": 1,
      "pages": 1,
      "currentPage": 1
    }
  }
}
```

## Features

✅ Excel upload with duplicate validation
✅ Student and subject management
✅ Attendance tracking
✅ Search by student email
✅ Filter by subject, date, status
✅ Calculate attendance percentages
✅ Export to Excel
✅ Dashboard overview
✅ Error handling
✅ Input validation
✅ Pagination support
✅ MVC architecture

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify credentials in .env file
- Ensure database exists

### File Upload Error
- Check uploads/ directory exists and is writable
- Verify file is valid Excel (.xlsx or .xls)
- Check file size (max 5MB by default)

### Port Already in Use
- Change PORT in .env file
- Or kill the process using port 5000

## Additional Notes

- The system automatically creates the uploads/ directory
- Uploaded files are deleted after processing
- Pagination defaults: page=1, limit=10
- Maximum limit: 100 records per page
- Dates should be in YYYY-MM-DD format
- Duplicate attendance records are skipped during upload

## License

MIT
