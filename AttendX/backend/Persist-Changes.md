# Docker: Persistent Development Environment

Docker runs the **backend only** (API, PostgreSQL, Redis). The **admin panel runs on your machine** with `npm start` in `admin/`.

## Quick start

### 1. Backend (Docker)

From the **repository root** or from `backend/`:

```bash
# Root
cp backend/.env.example backend/.env
docker compose up --build

# Or backend-only (same services, from backend/)
cd backend && cp .env.example .env && docker compose up --build
```

| Service  | URL |
|----------|-----|
| API      | http://localhost:5001 |
| Swagger  | http://localhost:5001/api-docs |
| Postgres | localhost:5436 |

### 2. Admin panel (local — not in Docker)

In a **second terminal**:

```bash
cd admin
npm install   # first time only
npm start
```

Open **http://localhost:4200**

Login: `admin@example.com` / `admin@123`

The dev server proxies `/api` to `http://localhost:5001` via `proxy.conf.json`.

## What persists?

| Data | How |
|------|-----|
| **PostgreSQL** | Named volume `attendance_postgres_data` |
| **Redis** | Named volume `attendance_redis_data` |
| **Uploads / exports** | Named volumes `attendance_backend_uploads`, `attendance_backend_exports` |
| **Backend code** | Bind mount `./backend` (nodemon hot reload) |

```bash
docker compose down          # keeps data
docker compose down -v       # ⚠️ deletes DB + uploads volumes
```

## On every `docker compose up`

1. Wait for PostgreSQL  
2. `npm run migrate`  
3. `npm run seed` (admin user, idempotent)  
4. API with **nodemon** on `backend/src`

## Environment variables

`cp backend/.env.example` → `backend/.env`

Optional root `.env`:

```env
BACKEND_PUBLISH_PORT=5001
DB_PUBLISH_PORT=5436
JWT_SECRET=your_secret_here
```

## Architecture

```
Docker:  db + redis + backend (port 5001)
Local:   admin (port 4200) → proxy → localhost:5001
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Admin login fails | Backend running? Check http://localhost:5001/api/health |
| CORS / API errors | Use `npm start` in `admin/` (not opening `dist/` as static files) |
| Stale schema | `docker compose exec backend npm run migrate` |
| Reset DB | `docker compose down -v` then `docker compose up --build` |
