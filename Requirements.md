# 🧩 Student Mobile App – Complete Module Breakdown

---

## 📱 1. Authentication & Session Module
Handles login, security, and session control.

### Features:
- Login (pre-registered student credentials)
- Secure session management (token-based)
- Logout
- Change Password

### Sub-features:
- Password validation rules
- Session timeout / auto logout
- Forgot password (future scope)

---

## 👤 2. Profile Module
Manages student personal and academic information.

### Overview:
Students will complete/update missing fields on **first login**.

### Fields:
- Full Name
- Email
- Gender
- Blood Group
- Registration Number
- University ID
- Batch (Dropdown)
- Section (Dropdown – dependent on Batch)
- Admission Date
- Date of Birth
- Faculty
- Guardian Name
- Guardian Contact

### Behavior:
- Batch & Section are selected from **predefined dropdowns**
- Section list is dynamically filtered based on selected Batch

### Actions:
- Update Profile
- Change Password
- Logout

---

## 🗄️ 3. Student Data Source Module
Students are pre-registered from attendance sheets.

### Data Flow:
1. Attendance sheet processed
2. Student data extracted
3. Stored in `students` table
4. These 1,2,3 are already exist in the system
5. Completed by student on first login

### Table: `students`
- `name`
- `email` (unique)
- `batch_id` (FK - to be added)
- `section_id` (FK - to be added)
- `gender`
- `blood_group`
- `reg_num` (unique)
- `univ_id` (unique)
- `admission_date`
- `dob`
- `faculty`
- `guardian_name`
- `guardian_contact`
- `created_at`
- `updated_at`

### Notes:
- No self-registration
- Email-based login
- Batch & Section will be linked via foreign keys

---

## 🧩 4. Batch & Section Management Module (NEW – REQUIRED)

### ⚠️ Current State:
- There are **NO existing tables for Batch and Section**
- These tables must be **created in the database**

---

### 📦 Batch Table (To Be Created)

Stores all academic batches.

#### Fields:
- `id` (PK)
- `name` (e.g., November 2025)
- `created_at`
- `updated_at`

---

### 🧩 Section Table (To Be Created)

Stores sections mapped to batches.

#### Fields:
- `id` (PK)
- `name` (e.g., L1, L2, L3)
- `batch_id` (FK → Batch.id)
- `created_at`
- `updated_at`

---

### 🔗 Relationship:
- One Batch → Many Sections
- One Section → Belongs to One Batch

---

### Features:
- Admin can:
  - Create new batches
  - Create sections under each batch
  - Update mappings anytime
- No hardcoded logic (fully database-driven)

---

### App Behavior:
- Fetch batches → populate dropdown
- On batch selection → fetch corresponding sections
- Save selected `batch_id` and `section_id` in student profile

---

### QA Considerations:
- Validate table creation & relationships
- Test Batch → Section dependency
- Ensure correct data population in dropdowns
- Verify admin changes reflect immediately

---

## 🏠 5. Dashboard Module
Default home screen after login.

### Features:
- Today’s attendance
- Weekly summary
- Overall percentage
- Bar chart visualization

---

## 📊 6. Attendance Module
Tracks and filters attendance.

### Features:
- Subject-wise reports

### Filters:
- Subject
- Date / Range
- Status (P/L/A)

---

## 📅 7. Routine (Schedule) Module
Displays personalized class schedule.

### Features:
- Section-based routine
- Day-wise timetable
- Highlight current class

---

## 🧩 8. Section-Based Routine Logic

### Behavior:
If student belongs to a section (e.g., **L2**):
- Show:
  - L2 classes
  - Shared classes (L1+L2)
- Hide:
  - Other sections

---

## 🔔 9. Notification Module (Class Reminder)

### Trigger:
- 20 minutes before class start

### Message Format:
"Your [Module] class starts from [Start Time] to [End Time] at Room [Room]"

---

## 📄 10. Routine File Processing Module

### Input:
- Excel schedule per section which will be same as file A25(L2)ClassSchedule.xlsx and note that db for this is made upto now in the system

### Process:
1. Upload file
2. Extract data
3. Normalize 
4. Store in DB
5. Create necessary api for create, update and get requests

---

## 🧭 11. Navigation Module

### Tabs:
- Home
- Routine
- Attendance
- Profile

---

## 📊 12. Visualization Module

### Features:
- Attendance charts
- Weekly vs overall comparison

---

## 🔌 13. API Integration Module

### Endpoints: 
Most of the endpoints already in the system and othere endpoints need to be made 
Example endpoints:
- GET /student/profile
- GET /batches
- GET /sections?batch_id=
- GET /routine
- GET /attendance/*

---

## 🗄️ 14. Data Models Module

### Models:
- Student
- Batch (NEW)
- Section (NEW)
- Attendance
- Routine

---

## 🔐 15. Security & Validation Module

### Features:
- Input validation
- JWT authentication
- Role-based access

---

## 🧪 16. QA / Testing Scope

### Critical Areas:
- First login profile completion
- Batch & Section table creation
- Dropdown dependency logic
- Section-based filtering
- Notification timing
- API reliability

---

##  NOTE:
    Don't run flutter for now and I just need the backend for these all requirements in nodejs as of now.