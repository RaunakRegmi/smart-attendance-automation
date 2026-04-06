# QR Attendance Backend (Node.js + Express + PostgreSQL)

## Requirements
- Node.js 18+ (recommended)
- PostgreSQL 13+

## Setup
1. Create a database (example):

```bash
npm run db:create
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Run migrations + seed (seeds the admin user):

```bash
npm run db:setup
```

Admin seed:
- email: `admin@example.com`
- password: `admin123`

4. Start API:

```bash
npm run dev
```

## Swagger
- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/docs.json`

## Notes
- JWT auth uses `Authorization: Bearer <token>`
- Attendance scan uses an **opaque** `qrToken` that is valid only during the session window.

