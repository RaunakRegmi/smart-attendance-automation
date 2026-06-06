# Student Attendance Management System

A production-ready Node.js backend for managing student attendance with Excel import/export capabilities.

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services with Docker
docker compose up

# Server: http://localhost:5000
# Swagger UI: http://localhost:5000/api-docs  ⭐
# Database password: admin
```

### Option 2: Local Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with PostgreSQL credentials
# Then start the server
npm run dev
```

Server runs on `http://localhost:5000`
**Test API with Swagger UI:** `http://localhost:5000/api-docs`

## Key Features

- 📤 **Excel Upload** - Import attendance data from Excel files
- 📊 **Statistics** - View overall attendance metrics
- 🔍 **Search** - Find student attendance by email
- 🎯 **Filter** - Filter by subject, date, or status
- 📈 **Reports** - Calculate attendance percentages
- 📥 **Export** - Export attendance data back to Excel
- 📋 **Dashboard** - Quick overview of today's attendance

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **File Handling**: Multer, XLSX, ExcelJS
- **Validation**: Joi

## 📖 Documentation

- [Swagger UI](./SWAGGER_GUIDE.md) - Interactive API testing (Recommended) 🎯
- [Docker Guide](./DOCKER_GUIDE.md) - Docker & Docker Compose setup
- [Setup Guide](./SETUP_GUIDE.md) - Detailed installation and configuration
- [Excel Format](./SAMPLE_EXCEL_FORMAT.md) - Required Excel file structure
- [API Reference](./SETUP_GUIDE.md#api-endpoints) - Complete API documentation

## Project Structure

```
src/
├── controllers/  - Business logic
├── models/       - Database models
├── routes/       - API routes
├── middleware/   - Error handling & validation
├── config/       - Database configuration
├── validators/   - Joi validation schemas
└── utils/        - Helper functions
```

## Example Usage

**Upload attendance:**
```bash
curl -X POST -F "file=@attendance.xlsx" http://localhost:5000/api/attendance/upload
```

**Get student attendance:**
```bash
curl "http://localhost:5000/api/attendance/search?email=john@gmail.com"
```

**Export to Excel:**
```bash
curl "http://localhost:5000/api/attendance/export" -o attendance.xlsx
```

## Requirements

- Node.js v14+
- PostgreSQL v12+
- Excel file (.xlsx or .xls)

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete setup instructions.
