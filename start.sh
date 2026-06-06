#!/bin/bash
# AttendX — one command to launch all services.
# Layout:
#   ROOT_DIR/
#     AttendX/{backend,admin,student}/  + docker-compose.yml   (Node + Angular + Flutter)
#     Chatbot/                          (Python FastAPI + ChromaDB + Ollama)

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ATTENDX_DIR="$ROOT_DIR/AttendX"
BACKEND_DIR="$ATTENDX_DIR/backend"
ADMIN_DIR="$ATTENDX_DIR/admin"
STUDENT_DIR="$ATTENDX_DIR/student"
CHATBOT_DIR="$ROOT_DIR/Chatbot"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok=" ✓"; fail=" ✗"; info=" •"

cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  kill $CHATBOT_PID $ADMIN_PID 2>/dev/null || true
  echo "  Stopping Docker containers..."
  cd "$ATTENDX_DIR" && docker compose down 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

wait_for() {
  local url="$1" name="$2" timeout="${3:-30}"
  echo -n "  ${info} Waiting for ${name}..."
  for i in $(seq 1 $timeout); do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo -e "\r  ${GREEN}${ok}${NC} ${name} is ready"
      return 0
    fi
    sleep 1
  done
  echo -e "\r  ${RED}${fail}${NC} ${name} not ready after ${timeout}s"
  return 1
}

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AttendX — Starting All Services      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Docker ────────────────────────────────────────────────────
echo -e "${YELLOW}[1/4]${NC} Docker"
if ! docker info > /dev/null 2>&1; then
  echo -e "  ${RED}${fail}${NC} Docker is not running"
  echo "  Start Docker Desktop: open -a Docker"
  exit 1
fi
echo -e "  ${GREEN}${ok}${NC} Docker is running"

# ── 2. Python venv for chatbot ───────────────────────────────────
echo -e "${YELLOW}[2/4]${NC} Python chatbot environment"
if [ -f "$CHATBOT_DIR/venv/bin/python" ]; then
  PYTHON="$CHATBOT_DIR/venv/bin/python"
elif [ -f "$ROOT_DIR/.venv/bin/python" ]; then
  PYTHON="$ROOT_DIR/.venv/bin/python"
else
  PYTHON=python3
fi
echo -e "  ${GREEN}${ok}${NC} Python $("$PYTHON" --version 2>&1)"
"$PYTHON" -m pip install -q -r "$CHATBOT_DIR/requirements.txt" 2>/dev/null || true

# ── 3. Docker Compose (Postgres + Redis + Backend) ──────────────
echo -e "${YELLOW}[3/4]${NC} Backend stack"
cd "$ATTENDX_DIR"
lsof -ti :5436 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :6379 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :5001 2>/dev/null | xargs kill -9 2>/dev/null || true
docker compose up -d --build db redis backend > /tmp/attendx-docker.log 2>&1
echo -e "  ${GREEN}${ok}${NC} Docker services starting (log: /tmp/attendx-docker.log)"
wait_for "http://localhost:5001/api/health" "Backend API" 60

# ── 4. Chatbot + Admin ──────────────────────────────────────────
echo -e "${YELLOW}[4/4]${NC} Chatbot + Admin"

# Chatbot (FastAPI on 8000)
lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true
(
  cd "$CHATBOT_DIR" && "$PYTHON" chatbot_app.py
) > /tmp/attendx-chatbot.log 2>&1 &
CHATBOT_PID=$!
echo -e "  ${GREEN}${ok}${NC} Chatbot starting (PID $CHATBOT_PID, log: /tmp/attendx-chatbot.log)"
wait_for "http://localhost:8000/health" "RAG Chatbot" 30

# Angular admin (4200)
lsof -ti :4200 2>/dev/null | xargs kill -9 2>/dev/null || true
(
  cd "$ADMIN_DIR" && npm start
) > /tmp/attendx-admin.log 2>&1 &
ADMIN_PID=$!
echo -e "  ${GREEN}${ok}${NC} Admin starting (PID $ADMIN_PID, log: /tmp/attendx-admin.log)"
wait_for "http://localhost:4200" "Angular Admin" 90

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            All services running!                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Admin Panel${NC}     ${YELLOW}→${NC} http://localhost:4200"
echo -e "  ${GREEN}AI Assistant${NC}    ${YELLOW}→${NC} http://localhost:4200/chatbot"
echo -e "  ${GREEN}Backend API${NC}     ${YELLOW}→${NC} http://localhost:5001/api/health"
echo -e "  ${GREEN}Swagger Docs${NC}    ${YELLOW}→${NC} http://localhost:5001/api-docs"
echo -e "  ${GREEN}Chatbot UI${NC}      ${YELLOW}→${NC} http://localhost:8000"
echo -e "  ${GREEN}Student Chat${NC}    ${YELLOW}→${NC} http://localhost:8000/student"
echo -e "  ${GREEN}Flutter App${NC}     ${YELLOW}→${NC} cd $STUDENT_DIR && flutter run"
echo ""

if command -v open &> /dev/null; then
  sleep 2
  open http://localhost:4200 2>/dev/null || true
fi

echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

wait
