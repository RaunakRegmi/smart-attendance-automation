# 📊 Attendance Sheet Integration Module (Google Sheets)

## 📌 Overview
This module enables the system to generate attendance sheets in Google Sheets based on a predefined template. The generated sheet will be mapped to a specific **Batch + Section + Subject** and dynamically populated with relevant data.

---

## 🎯 Objectives
- Generate Google Sheets from a predefined Excel/Sheet template
- Map sheets to specific Batch and Section
- Dynamically populate student and lecturer data
- Ensure formulas scale automatically based on student count
- Maintain system data consistency (DB as source of truth)

---

## 🧱 Existing System Data

### ✅ Available
- Batch Name
- Section

### ❌ Not Available (to be implemented)
- Subject Title
- Subject Code
- Lecturer Details
- Student Name
- Student Educational Email

---

## 🧩 New Modules to be Created

### 1. Subject Module
**Fields:**
- id
- title (required)
- code (required)

**Features:**
- Create Subject
- Update Subject
- Delete Subject
- List Subjects

---

### 2. Lecturer Module
**Fields:**
- id
- name (required)
- email (optional)
- contact (optional)

**Features:**
- Create Lecturer
- Update Lecturer
- Delete Lecturer
- List Lecturers

---

### 3. Section-Subject Mapping
Defines which subject is taught in which section by which lecturer.

**Fields:**
- sectionId
- subjectId
- lecturerId

---

### 4. Student Module (Recommended)
**Fields:**
- id
- fullName
- eduEmail
- sectionId

**Features:**
- Add Students
- Bulk Import (CSV/manual)
- Assign to Section

---

## 📄 Google Sheets Integration

### Template ویژگی
- Predefined sheet with formulas
- Designed for ~33 students
- Must support dynamic scaling

---

## ⚙️ Sheet Generation Logic

### Steps:
1. Select:
   - Batch
   - Section
   - Subject
2. Fetch:
   - Lecturer details
   - Student list
3. Create Google Sheet via API
4. Copy template
5. Rename sheet
6. Populate:
   - Student names
   - Student emails
   - Lecturer info
7. Apply formulas dynamically

---

## 📐 Formula Handling

### Requirement:
- Sheet must adapt to varying student counts

### Recommended Approach:
Use `ARRAYFORMULA` instead of fixed row formulas.

**Example:**
Batch2025_A_CS101_Attendance


---

## 🔗 Database Storage for Sheets

Store mapping after sheet creation:

```json
{
  "sectionId": "...",
  "subjectId": "...",
  "sheetId": "...",
  "sheetUrl": "..."
}

---

## Project Structure

src/
  modules/
    subject/
    lecturer/
    student/
    section/
    attendanceSheet/
  services/
    googleSheetsService.js
  config/
    googleSheets.js