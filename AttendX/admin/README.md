# Student Attendance Admin Panel

Angular 19 admin dashboard for the Student Attendance Management System. Matches the Figma design (`admin-dashboard.fig`) with sidebar navigation, dashboard analytics, and full CRUD for batches, sections, students, subjects, lecturers, and reports.

## Prerequisites

- Node.js 20+
- Running backend API (see `../backend/`)
- PostgreSQL and Redis (via Docker Compose in `backend/`)

## Quick Start

The admin panel is **not** run in Docker. Start the backend in Docker, then run the UI locally.

### 1. Start the backend (Docker)

From the repo root:

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Or from `backend/`: `docker compose up --build`

API: **http://localhost:5001**

### 2. Start the admin panel (local)

```bash
cd admin
npm install
npm start
```

Open **http://localhost:4200**. API calls are proxied to `http://localhost:5001` via `proxy.conf.json`.

Default login: `admin@example.com` / `admin@123`

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm start`    | Dev server with API proxy      |
| `npm run build`| Production build to `dist/`  |
| `npm test`     | Unit tests                     |

## Environment

| File | Purpose |
|------|---------|
| `src/environments/environment.ts` | Dev — API at `/api` (proxied) |
| `src/environments/environment.prod.ts` | Prod — API at `/api` (same origin) |

For production, serve the built app behind a reverse proxy that forwards `/api` to the backend.

## Features

- **Authentication** — JWT login, route guards, role-based admin access
- **Dashboard** — Stats, recent activity, quick actions, enrollment charts
- **Batches / Sections** — CRUD with search and filters
- **Students** — Paginated list, create/edit/delete, Excel upload
- **Subjects / Lecturers** — Full CRUD
- **Reports** — Google Sheets linking, sync, status toggle, preview

## Project Structure

```
src/app/
├── core/           # Services, guards, interceptors, models
├── features/       # Page components (dashboard, batches, …)
├── layout/         # Admin shell (sidebar + header)
└── shared/         # Toast, confirm dialog
```

## API Integration

All endpoints use the backend under `/api`:

- `POST /api/auth/login`
- `GET /api/attendance/dashboard`
- `GET|POST|PUT|DELETE /api/batches`, `/api/sections`, `/api/students`, `/api/subjects`, `/api/lecturers`
- `GET|POST /api/sheets`, `POST /api/attendance/add-sheet`, `POST /api/attendance/upload`

See backend Swagger at http://localhost:5001/api-docs.

## Build for Production

```bash
npm run build
# Output: dist/admin/browser/
```

Serve static files and proxy `/api` to your backend instance.
