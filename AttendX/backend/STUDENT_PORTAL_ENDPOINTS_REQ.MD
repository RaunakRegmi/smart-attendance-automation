# Student Portal API – Current Coverage + Missing Requirements (Aligned with Mobile UI)

This document outlines:

1. Existing endpoints and how they map to the Student Mobile UI
2. Missing endpoints required to fully support the UI
3. Recommended improvements for consistency and mobile-first architecture

---

# ✅ EXISTING ENDPOINTS (CURRENT SYSTEM)

## Authentication Endpoints (E:\src\routes\authRoutes.js)

1. POST /login
   - Summary: User login
   - Parameters: email (string), password (string)
   - UI Usage:
     - Login screen authentication

2. POST /users
   - Summary: Create new user (admin-only)
   - Parameters: email, password, role (default: STUDENT), isActive (default: true)

3. PUT /users/{id}
   - Summary: Update user (admin-only)
   - Parameters: email, password, role, isActive

4. DELETE /users/{id}
   - Summary: Delete user (admin-only)

5. GET /me
   - Summary: Get current user profile
   - Security: Bearer token required
   - UI Usage:
     - Profile screen (basic identity info)

6. GET /users
   - Summary: Get all users (admin-only)

---

## Student Profile Endpoints (E:\src\routes\studentRoutes.js)

7. GET /profile
   - Summary: Get student profile by email
   - Parameters: email (required)
   - UI Usage:
     - Profile Screen (student details)

8. PUT /profile
   - Summary: Update student profile
   - Parameters: email (required), fields to update

⚠️ Note:
- Currently uses email-based querying
- Should be migrated to token + role-based access (see improvements section)

---

## Attendance Endpoints (E:\src\routes/attendanceRoutes.js)

9. POST /upload
   - Summary: Upload attendance Excel file
   - Security: Multer file upload required
   - UI Usage:
     - Admin only

10. POST /add-sheet
   - Summary: Add Google Sheet URL for attendance syncing
   - Parameters: googleSheetUrl, batchId, sectionId
   - UI Usage:
     - Admin only

11. GET /stats
   - Summary: Get overall attendance statistics
   - Response: Total students, records, present/absent counts
   - UI Usage:
     - Insights screen (basic stats)

12. GET /search
   - Summary: Search attendance by email (and optional date)
   - Parameters: email (required), date (YYYY-MM-DD)
   - UI Usage:
     - Attendance Screen (daily records)

13. GET /filter
   - Summary: Filter attendance records
   - Parameters: subjectCode, date, status (Present/Absent)

14. GET /subject/{subjectCode}
   - Summary: Get attendance stats for subject
   - Parameters: subjectCode
   - UI Usage:
     - Attendance Screen (subject breakdown)

15. GET /export
   - Summary: Export attendance to Excel
   - Parameters: subjectCode, date

16. GET /student-percentage/{email}
   - Summary: Get student's attendance percentage
   - Parameters: email (required)
   - UI Usage:
     - Home Dashboard (KPI Card)

17. GET /dashboard
   - Summary: Today's attendance dashboard
   - Response: Total students, present/absent today
   - UI Usage:
     - Partial support for dashboard stats

---

# ❌ MISSING ENDPOINTS (REQUIRED FOR MOBILE UI / STUDENTS)

## Schedule Module Status

✔️ Schedule module already exists  
✔️ Admin can:
- Add schedule/module details  
- Manage timetable data  
- Retrieve schedule information (admin-side)

⚠️ However, student-facing endpoints are currently missing

---

## Schedule Endpoints (Student)

> ℹ️ Students are identified via Bearer token (no explicit student ID required in request)

18. GET /schedule/today  
   - Summary: Get today's class schedule for logged-in student  
   - Security: Bearer token required (student derived from token)  
   - Response:  
     - List of class cards (time, module, lecturer, room, status)  
   - UI Usage:  
     - Home Dashboard → "Today's Schedule" section  

19. GET /schedule/week  
   - Summary: Get weekly timetable (Sun-Fri)  
   - Security: Bearer token required (student derived from token)  
   - Response:  
     - Weekly grouped schedule data  
   - UI Usage:  
     - Schedule Screen (weekly view)  

20. GET /schedule  
   - Summary: Get full timetable  
   - Security: Bearer token required (student derived from token)  
   - Response:  
     - Complete timetable data for the student  
   - UI Usage:  
     - "View Full Timetable" quick action  

---

## ⚠️ Gap Summary

- Schedule data is available (admin-managed)  
- Student-specific retrieval endpoints are missing  
- Student identity should be resolved from auth token  
- Mobile UI schedule features are currently blocked  

---

## ✅ Recommendation

- Implement student-specific schedule APIs  
- Resolve student context from Bearer token  
- Filter data based on:
  - Enrolled modules  
  - Batch / cohort  
- Optimize responses for mobile usage  

## Notification Endpoints (NEW MODULE REQUIRED)

⚠️ No notification system exists

21. GET /notifications
   - Summary: Get all notifications for logged-in student
   - Security: Bearer token required
   - Response:
     - Title, description, timestamp, category
   - UI Usage:
     - Home Dashboard (notifications preview)
     - Notifications list

22. PUT /notifications/{id}/read
   - Summary: Mark notification as read
   - Security: Bearer token required

23. POST /notifications
   - Summary: Create notification (admin/system)
   - Parameters:
     - title, description, category, target audience

---

## Attendance Insights Endpoints (EXTENSION REQUIRED)

24. GET /attendance/trend
   - Summary: Get attendance trends
   - Parameters: period (weekly | monthly)
   - Security: Bearer token required
   - UI Usage:
     - Insights Screen (graph card)

25. GET /attendance/risk
   - Summary: Get attendance risk analysis
   - Security: Bearer token required
   - Response:
     - status (SAFE | WARNING | CRITICAL)
     - currentPercentage
     - requiredClassesToSafe
   - UI Usage:
     - Insights Screen (risk card)

---

## Dashboard Aggregation Endpoint (CRITICAL FOR PERFORMANCE)

26. GET /student/dashboard
   - Summary: Get complete dashboard data in one response
   - Security: Bearer token required
   - Response:
     - attendance summary
     - today schedule
     - notifications preview
     - quick stats
   - UI Usage:
     - Home Dashboard (single API powering entire screen)

---

# ⚠️ REQUIRED IMPROVEMENTS (ARCHITECTURE FIXES)

## 1. Replace Email-Based Access with Token-Based Identity + Role-Based Access

❌ Current:
- /profile?email=
- /student-percentage/{email}
- /search?email=

⚠️ Issues:
- Exposes user data via query parameters
- Not secure for student access
- Not aligned with authenticated mobile apps

---

✅ Required:
- Use authenticated user identity from Bearer token
- Implement role-based access control:
  - STUDENT → access only their own data (via token)
  - ADMIN → access any student data using query parameters (email)

---

## 🔐 Updated Endpoint Behavior (Unified Design)

### GET /profile

- STUDENT:
  - Returns profile of logged-in user (from token)

- ADMIN:
  - GET /profile?email=student@example.com
  - Returns profile of specified student

---

### GET /attendance/percentage

- STUDENT:
  - Returns own attendance percentage

- ADMIN:
  - GET /attendance/percentage?email=student@example.com

---

### GET /attendance/records

- STUDENT:
  - Returns own attendance records
  - Ignores email parameter if provided

- ADMIN:
  - Can filter using:
    - email
    - date
    - subjectCode
    - status

---

## ⚙️ Access Control Rules

- STUDENT:
  - Must NOT pass email
  - System MUST use: req.user.email

- ADMIN:
  - Can pass email via query
  - Must validate email when accessing specific student data

---

## 🚀 Optional (Cleaner Student-Only Endpoints)

- GET /profile/me
- GET /attendance/me

- These endpoints:
  - Are strictly for STUDENT use
  - Do not accept query parameters
  - Always resolve from token identity

---

## 2. Standardize Response Structure for UI Components

All endpoints should return data formatted for UI cards:

- KPI Card → percentage, counts, status
- Schedule Card → time, module, lecturer, room, status
- Notification Card → message, timestamp, category
- Graph Card → structured time-series data

---

## 3. Mobile Optimization

- Reduce multiple API calls using aggregation endpoints
- Ensure lightweight responses
- Include status fields (e.g., Upcoming, Ongoing, Completed)

---

# 🚀 FINAL SYSTEM COVERAGE

## Fully Supported After Implementation:

- ✅ Dashboard (KPI + Schedule + Notifications)
- ✅ Attendance Tracking (daily + subject + percentage)
- ✅ Weekly Timetable System
- ✅ Attendance Insights + Risk Detection
- ✅ Smart Notification System
- ✅ Profile Management

---

# 🧠 SYSTEM TRANSFORMATION

Current System:
→ Attendance Tracking Backend

Target System:
→ Student Productivity Dashboard API

This transformation requires:
- Adding schedule module
- Adding notifications module
- Enhancing analytics
- Aggregating dashboard data



---Yes – every task in the list is now marked                  completed:                                                                                                         
                                                                                                                                                              
  ┌─────┬────────────────────────────────────────────┬───────────┐
  │  #  │                Description                 │  Status   │                                                                                              
  ├─────┼────────────────────────────────────────────┼───────────┤
  │ 1   │ Implement GET /api/schedule/today          │ Completed │                                                                                              
  ├─────┼────────────────────────────────────────────┼───────────┤                                                                                            
  │ 2   │ Implement GET /api/schedule/week           │ Completed │
  ├─────┼────────────────────────────────────────────┼───────────┤
  │ 3   │ Implement GET /api/schedule/full           │ Completed │
  ├─────┼────────────────────────────────────────────┼───────────┤
  │ 4   │ Implement PUT /api/notifications/{id}/read │ Completed │
  ├─────┼────────────────────────────────────────────┼───────────┤
  │ 5   │ Create Notification model                  │ Completed │
  ├─────┼────────────────────────────────────────────┼───────────┤
  │ 6   │ Implement GET /api/notifications           │ Completed │
  ├─────┼────────────────────────────────────────────┼───────────┤
  │ 7   │ Implement POST /api/notifications (admin)  │ Completed │
  └─────┴────────────────────────────────────────────┴───────────┘

  All required routes, controllers, services, and Swagger documentation have been added, and the system now exposes the full schedule and notification APIs as
  specified.