# 🧑‍💼 Admin Panel – Modules & Pages Specification

## 📌 Overview
The Admin Panel is structured around a **sidebar-based navigation system**, where each module is accessible via the side menu. Every module follows a **consistent UI/UX pattern** for scalability and usability.

---

## 🧭 Common UI Pattern (All Modules)

Each module includes:

### 📄 Listing Page
- Search bar (keyword-based)
- Filters (module-specific)
- Data Table:
  - Columns based on module fields
  - Action column:
    - ✏️ Update
    - 🗑️ Delete
- Pagination controls

### ➕ Create Button
- Opens **Create Form Modal/Page**
- Fields based on module
- Submit + Cancel actions
- Validation + error messages

### 📤 Upload Excel Button
- Opens Upload Page:
  - 📥 Download Sample Excel
  - 📘 Field descriptions (format, type, required/optional)
  - File upload input
  - Upload + Cancel actions
  - Success/Error alerts

### ✏️ Update Action
- Opens Update Form (pre-filled)
- Editable fields
- Save changes

### 🗑️ Delete Action
- Confirmation modal:
  - “Are you sure?”
  - Confirm / Cancel

---

# 📦 Modules

---

## 1. 🏫 Batch Module

### Fields
- Batch Name

### Listing Table
- Batch Name
- Created At
- Actions

### Filters
- Batch Name

---

## 2. 🧩 Section Module

### Fields
- Section Name
- Batch (relation)

### Listing Table
- Section Name
- Batch Name
- Actions

### Filters
- Batch
- Section Name

---

## 3. 👨‍🎓 Student Module

### Fields
- Full Name
- Educational Email
- Section (relation)

### Listing Table
- Name
- Email
- Section
- Batch (derived)
- Actions

### Filters
- Batch
- Section
- Email

---

## 4. 📘 Subject Module

### Fields
- Subject Title
- Subject Code

### Listing Table
- Title
- Code
- Actions

### Filters
- Title
- Code

---

## 5. 👨‍🏫 Lecturer Module

### Fields
- Name (required)
- Email (optional)
- Contact (optional)

### Listing Table
- Name
- Email
- Contact
- Actions

### Filters
- Name
- Email

---

## 6. 📊 Report Module (Designed)

### 🎯 Purpose
Provides insights and access to attendance data stored in Google Sheets.

---

### 📄 Pages

#### 1. Report Listing Page
- Filters:
  - Batch
  - Section
  - Subject
  - Lecturer
- Table Columns:
  - Batch
  - Section
  - Subject
  - Lecturer
  - Sheet Link (View)
  - Last Updated
  - Actions

---

#### 2. View Report Page
- Embedded Google Sheet (iframe or link)
- Summary Cards:
  - Total Students
  - Attendance %
- Export Options:
  - Download CSV
  - Download PDF

---

#### 3. Generate Report Page
- Select:
  - Batch
  - Section
  - Subject
- Button: Generate Sheet
- Calls backend to:
  - Create Google Sheet
  - Populate data
- Success Alert:
  - “Sheet Created Successfully”
  - Show link

---

#### 4. Sync Data (Optional Advanced)
- Button: Sync Latest Data
- Pull updated data from Google Sheets

---

## 📤 Upload Excel Page (Common Structure)

### Components
- 📥 Download Sample Button
- 📘 Instructions Section:
  - Field Name
  - Data Type
  - Required/Optional
  - Example values
- File Upload Input
- Upload Button
- Alerts:
  - Success
  - Error (with row-level issues if possible)

---

## ⚠️ Validation Rules (Global)

- Required fields must be enforced
- Email must be valid format
- No duplicate entries (where applicable)
- Proper error messages displayed inline

---

## 🔔 Alerts & Feedback

### Types
- Success Alert (Green)
- Error Alert (Red)
- Warning Alert (Yellow)
- Confirmation Modal (Delete actions)

---

## 🧱 UI Components Summary

- Sidebar Navigation
- Data Table (Reusable)
- Search Bar
- Filter Dropdowns
- Pagination
- Modal Forms (Create/Update)
- File Upload Component
- Alert/Toast Notifications
- Confirmation Dialog

---

## 🚀 Future Enhancements

- Role-based access (Admin, Staff)
- Bulk edit support
- Activity logs
- Real-time sync with Google Sheets
- Dashboard analytics

---

## ✅ Summary

- All modules follow a **consistent CRUD + Upload pattern**
- Report module acts as **analytics + sheet access layer**
- Clean separation ensures **scalability and maintainability**