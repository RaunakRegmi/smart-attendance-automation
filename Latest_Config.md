# AttendX — Latest Configuration

## System Architecture

```
attendance-chatbot/
├── AttendX/                  # Main application
│   ├── backend/             # Node.js API (Express + Sequelize)
│   ├── admin/               # Angular 19 Admin Panel
│   ├── student/             # Flutter Mobile App
│   ├── docker-compose.yml   # PostgreSQL + Redis + Backend
│   └── start.sh             # Legacy launcher
├── Chatbot/                 # RAG AI Chatbot
│   ├── chatbot_app.py       # FastAPI server
│   ├── rag_indexer.py       # Vector store builder
│   ├── csv_builder.py       # CSV generator
│   ├── venv/                # Python virtual environment
│   └── requirements.txt
└── start.sh                 # Project launcher script
```

---

## Running Services

| Service | Technology | URL / Port | Status |
|---------|-----------|------------|--------|
| **Backend API** | Node.js (Express) | http://localhost:5001/api/health | ✅ Running |
| **Admin Panel** | Angular 19 | http://localhost:4200 | ✅ Running |
| **Chatbot (AI)** | Python FastAPI | http://localhost:8000 | ✅ Running |
| **Chatbot UI** | HTML/JS | http://localhost:8000 | ✅ Running |
| **Student Chat** | HTML/JS | http://localhost:8000/student | ✅ Running |
| **Swagger Docs** | OpenAPI | http://localhost:5001/api-docs | ✅ Running |
| **PostgreSQL** | 15-alpine (Docker) | `localhost:5436` | ✅ Healthy |
| **Redis** | 7-alpine (Docker) | `localhost:6379` | ✅ Healthy |
| **Ollama** | Local LLM | `localhost:11434` | ✅ Running |

---

## Database Connection (DBeaver / External)

```
JDBC URL:     jdbc:postgresql://localhost:5436/attendance_db
Host:         localhost
Port:         5436
Database:     attendance_db
Username:     postgres
Password:     admin
```

### Docker Compose DB Configuration
```yaml
POSTGRES_DB:       attendance_db
POSTGRES_USER:     postgres
POSTGRES_PASSWORD: admin
```

> **Note:** The PostgreSQL container is mapped from internal port `5432` to host port `5436` to avoid conflicts with any local PostgreSQL instance.

---

## Port Mapping Summary

Default ports changed from `docker-compose.yml` standard internal ports to host-accessible ports:

| Service | Container Port | Host Port | Reason |
|---------|--------------|-----------|--------|
| PostgreSQL | 5432 | **5436** | Avoid conflict with local PG |
| Redis | 6379 | **6379** | Default (unchanged) |
| Backend API | 5000 | **5001** | Avoid conflict with other apps |
| Chatbot | 8000 | **8000** | Default |
| Admin Panel | 4200 | **4200** | Default (Angular) |
| Ollama | 11434 | **11434** | Default |

---

## Environment Variables

### Backend (`AttendX/backend/.env.docker`)
```env
NODE_ENV=development
JWT_SECRET=dev_jwt_secret_change_me
DB_PASSWORD=admin
```

### Docker Compose Override
Use these environment variables to customize:
```bash
DB_PUBLISH_PORT=5436      # PostgreSQL host port
REDIS_PUBLISH_PORT=6379   # Redis host port
BACKEND_PUBLISH_PORT=5001 # Backend API host port
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=admin
```

---

## Dependencies Installed

### Chatbot (Python)
| Package | Version |
|---------|---------|
| fastapi | >=0.111.0 |
| uvicorn | >=0.29.0 |
| chromadb | >=0.5.0 |
| ollama | >=0.3.0 |
| pandas | 2.2.2 |
| openpyxl | 3.1.2 |
| python-dotenv | >=1.0.0 |

### Backend (Node.js — 397 packages)
| Key Package | Version |
|------------|---------|
| express | ^4.18.2 |
| sequelize | ^6.35.2 |
| pg | ^8.11.3 |
| bullmq | ^5.76.2 |
| ioredis | ^5.10.1 |
| jsonwebtoken | ^9.0.3 |
| bcryptjs | ^3.0.3 |
| exceljs | ^4.4.0 |
| swagger-ui-express | ^5.0.0 |

### Admin (Angular 19 — 950 packages)
| Key Package | Version |
|------------|---------|
| @angular/core | ^19.2.0 |
| @angular/cli | ^19.2.26 |
| typescript | ~5.7.2 |

### Flutter (Student App)
- Dart SDK environment
- Shared preferences, permission_handler
- flutter_local_notifications

---

## Ollama Models

| Model | Size | Status |
|-------|------|--------|
| `nomic-embed-text:latest` | 274 MB | ✅ Pulled |
| `llama3.2:latest` | ~2.0 GB | ⏳ Downloading (background) |

> The chatbot requires `llama3.2` for LLM responses and `nomic-embed-text` for embeddings. The chatbot will still serve on port 8000 while the model downloads.

---

## Pending / Notes

- [ ] **Llama3.2 model** — still downloading (~2GB); chatbot will error on chat until it completes
- [ ] **Vector store** — not yet indexed. Run `python rag_indexer.py` from `Chatbot/` or upload data via Admin Panel
- [ ] **Flutter app** — run `flutter run` from `AttendX/student/`
- [ ] **start.sh** — needs `DOCKER_HOST` env var (see below) or modify to use system docker socket

### Running start.sh
```bash
export DOCKER_HOST="unix:///var/run/docker.sock"
bash start.sh
```

---

## Shutdown (Turning Everything Off)

```bash
# 1. Kill Chatbot (FastAPI on :8000)
kill $(lsof -ti :8000) 2>/dev/null

# 2. Kill Angular Admin (on :4200)
kill $(lsof -ti :4200) 2>/dev/null

# 3. Stop Docker containers (Postgres, Redis, Backend)
export DOCKER_HOST="unix:///var/run/docker.sock"
cd /home/addy/Addy/InnovationProject/attendance-chatbot/AttendX
docker compose down

# 4. Kill Ollama (LLM server)
kill $(lsof -ti :11434) 2>/dev/null

echo "All services stopped."
```

---

## Restart After System Reboot

Run these commands **in order** after logging back in:

### Step 1 — Verify Docker is running
```bash
sudo systemctl status docker   # should show "active (running)"
```
If not running: `sudo systemctl start docker`

### Step 2 — Start Docker services (Postgres + Redis + Backend)
```bash
export DOCKER_HOST="unix:///var/run/docker.sock"
cd /home/addy/Addy/InnovationProject/attendance-chatbot/AttendX
docker compose up -d --build
```

### Step 3 — Wait for backend to be healthy
```bash
sleep 20
curl http://localhost:5001/api/health
```
Expected: `{"success":true,"message":"Server is running"}`

### Step 4 — Start Ollama (LLM server for chatbot)
```bash
ollama serve &
sleep 3
ollama list   # confirm models are available
```

### Step 5 — Start Chatbot (FastAPI on :8000)
```bash
cd /home/addy/Addy/InnovationProject/attendance-chatbot/Chatbot
nohup ./venv/bin/python chatbot_app.py > /tmp/attendx-chatbot.log 2>&1 &
sleep 5
curl http://localhost:8000/health
```

### Step 6 — Start Angular Admin Panel (on :4200)
```bash
cd /home/addy/Addy/InnovationProject/attendance-chatbot/AttendX/admin
nohup npm start > /tmp/attendx-admin.log 2>&1 &
sleep 15
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200   # should return 200
```

### Step 7 — Verify everything
```bash
echo "Backend:  $(curl -sf http://localhost:5001/api/health)"
echo "Chatbot:  $(curl -sf http://localhost:8000/health)"
echo "Admin:    $(curl -s -o /dev/null -w '%{http_code}' http://localhost:4200)"
```

---

## One-Shot Restart Script

Save this as `restart.sh` at the project root:

```bash
#!/bin/bash
ROOT_DIR="/home/addy/Addy/InnovationProject/attendance-chatbot"
export DOCKER_HOST="unix:///var/run/docker.sock"

echo "Starting AttendX services..."

cd "$ROOT_DIR/AttendX"
docker compose up -d --build

sleep 20
echo "Docker services ready."

ollama serve &
sleep 3

cd "$ROOT_DIR/Chatbot"
nohup ./venv/bin/python chatbot_app.py > /tmp/attendx-chatbot.log 2>&1 &

cd "$ROOT_DIR/AttendX/admin"
nohup npm start > /tmp/attendx-admin.log 2>&1 &

echo "All services launched. Check with: curl http://localhost:5001/api/health"
```

---
