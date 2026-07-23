## 📌 Feature: Google Sheets Integration for Attendance System (Enhanced)

### 🎯 Objective
Replace Excel uploads with **live Google Sheets integration**, while enabling:
- Multi-sheet management  
- Section-based grouping  
- Advanced filtering & visibility  
- Automated + manual sync with full observability  

---

## 🧩 Core Modules

### 1. **Google Sheets Integration Module**
- Admin can:
  - Link a new Google Sheet (via URL / Sheet ID)
  - Provide metadata during linking:
    - **Batch**
    - **Section** (NEW)
  - Validate sheet format (must match existing schema)

- System should:
  - Fetch and parse:
    - Students
    - Subjects
    - Attendance
  - Store sheet + metadata mapping

---

### 2. **Sheet Management (Enhanced)**

#### 📂 Hierarchical Organization
- Sheets are grouped as: