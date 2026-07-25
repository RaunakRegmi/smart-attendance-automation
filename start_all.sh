#!/bin/bash
set -e

# ── Configurable via environment variables (defaults below) ──────────
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ATTENDX_DIR="$ROOT_DIR/AttendX"
CHATBOT_DIR="$ROOT_DIR/Chatbot"
ADMIN_DIR="$ATTENDX_DIR/admin"
API_CLIENT="$ATTENDX_DIR/student/lib/services/api_client.dart"

# Ports / URLs
BACKEND_PORT="${BACKEND_PORT:-5001}"
DB_PORT="${DB_PORT:-5436}"
REDIS_PORT="${REDIS_PORT:-6379}"
CHATBOT_PORT="${CHATBOT_PORT:-8000}"
ADMIN_PORT="${ADMIN_PORT:-4200}"
NGROK_PORT="${NGROK_PORT:-4040}"

# Database
DB_NAME="${DB_NAME:-attendance_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-admin}"
DB_CONTAINER="${DB_CONTAINER:-attendance_db}"

# Clean DB on startup (true = drop all data, false = keep existing)
CLEAN_DB="${CLEAN_DB:-false}"

# Docker
DOCKER_HOST_VAR="unix:///var/run/docker.sock"
export DOCKER_HOST="${DOCKER_HOST:-$DOCKER_HOST_VAR}"

# ── Helpers ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok=" ✓"; fail=" ✗"; info=" •"

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $OLLAMA_PID $CHATBOT_PID $ADMIN_PID $NGROK_PID 2>/dev/null || true
  cd "$ATTENDX_DIR" && docker compose down 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
# SIGINT = Ctrl+C (user stops), SIGTERM = external kill — ignore SIGTERM so services stay running
# when the parent shell is killed (e.g. tool timeout)
trap cleanup SIGINT
trap '' SIGTERM SIGQUIT

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

kill_port() {
  local port="$1"
  fuser -k "${port}/tcp" 2>/dev/null || true
}

# ── Header ──
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    AttendX — Start Everything + Ngrok           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── [1/7] Prerequisites ──
echo -e "${YELLOW}[1/7]${NC} Prerequisites"
if ! command -v ngrok &> /dev/null; then
  echo -e "  ${RED}${fail}${NC} ngrok not found. Install: https://ngrok.com/download"
  exit 1
fi
echo -e "  ${GREEN}${ok}${NC} ngrok $(ngrok --version 2>&1 | head -1)"

if ! docker info > /dev/null 2>&1; then
  echo -e "  ${RED}${fail}${NC} Docker is not running"
  exit 1
fi
echo -e "  ${GREEN}${ok}${NC} Docker is running"

# Ensure .env has CHATBOT_URL for non-Docker fallback
ENV_FILE="$ATTENDX_DIR/backend/.env"
if [ -f "$ENV_FILE" ]; then
  if ! grep -q '^CHATBOT_URL=' "$ENV_FILE"; then
    echo -e "\nCHATBOT_URL=http://localhost:8000" >> "$ENV_FILE"
    echo -e "  ${GREEN}${ok}${NC} Added CHATBOT_URL to backend/.env"
  fi
else
  cat > "$ENV_FILE" <<-EOF
PORT=5000
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=admin
DB_HOST=localhost
DB_PORT=5436
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev_jwt_secret_change_me
CHATBOT_URL=http://localhost:8000
DB_SYNC_ALTER=true
EOF
  echo -e "  ${GREEN}${ok}${NC} Created backend/.env with default values"
fi

PYTHON="$CHATBOT_DIR/venv/bin/python"
if [ ! -f "$PYTHON" ]; then
  echo -e "  ${YELLOW}${info}${NC} No venv found — creating one..."
  python3 -m venv "$CHATBOT_DIR/venv"
  PYTHON="$CHATBOT_DIR/venv/bin/python"
fi
echo -e "  ${GREEN}${ok}${NC} Python $("$PYTHON" --version 2>&1)"

# ── [2/7] Clean DB (if enabled) ──
echo -e "${YELLOW}[2/7]${NC} Prepare environment"

# Always kill processes on target ports and stop orphan Docker stack
kill_port "$DB_PORT"
kill_port "$REDIS_PORT"
kill_port "$BACKEND_PORT"
sleep 1

cd "$ATTENDX_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker rm -f attendance_backend attendance_db attendance_redis 2>/dev/null || true

if [ "$CLEAN_DB" = "true" ]; then
  # Remove the persistent volume to guarantee a clean slate
  docker volume rm attendance_postgres_data 2>/dev/null && \
    echo -e "  ${GREEN}${ok}${NC} Removed Postgres volume (clean DB on startup)" || \
    echo -e "  ${info} No Postgres volume to remove"
else
  echo -e "  ${info} Keeping existing data (CLEAN_DB=false)"
fi

# ── [3/7] Docker stack ──
echo -e "${YELLOW}[3/7]${NC} Backend stack (Postgres + Redis + API)"
cd "$ATTENDX_DIR"
docker compose up -d --build db redis backend > /tmp/attendx-docker.log 2>&1
echo -e "  ${GREEN}${ok}${NC} Docker starting (log: /tmp/attendx-docker.log)"
wait_for "http://localhost:${BACKEND_PORT}/api/health" "Backend API" 60

# ── [4/7] Ollama ──
echo -e "${YELLOW}[4/7]${NC} Ollama (LLM)"
if ! pgrep -x ollama > /dev/null; then
  kill_port 11434
  ollama serve > /dev/null 2>&1 &
  OLLAMA_PID=$!
  wait_for "http://localhost:11434/api/tags" "Ollama" 15
else
  OLLAMA_PID=$(pgrep -x ollama)
  echo -e "  ${GREEN}${ok}${NC} Ollama already running"
fi
# Install Python dependencies if missing
if [ -d "$CHATBOT_DIR/venv" ]; then
  "$PYTHON" -m pip install -q -r "$CHATBOT_DIR/requirements.txt" 2>/dev/null && \
    echo -e "  ${GREEN}${ok}${NC} Chatbot deps installed" || \
    echo -e "  ${YELLOW}${info}${NC} pip install skipped (check /tmp/attendx-chatbot-deps.log)"
fi

echo -n "  ${info} Pulling Ollama models..."
ollama pull nomic-embed-text > /tmp/attendx-ollama-embed.log 2>&1 && \
  echo -e "\r  ${GREEN}${ok}${NC} Ollama nomic-embed-text pulled" || \
  echo -e "\r  ${YELLOW}${info}${NC} nomic-embed-text pull skipped (may already exist)"
LLM_MODEL="${LLM_MODEL:-qwen2.5:7b}"
ollama pull "$LLM_MODEL" > /tmp/attendx-ollama-llm.log 2>&1 && \
  echo -e "\r  ${GREEN}${ok}${NC} Ollama $LLM_MODEL pulled" || \
  echo -e "\r  ${YELLOW}${info}${NC} $LLM_MODEL pull skipped (may already exist)"

# ── [5/7] Chatbot + Admin ──
echo -e "${YELLOW}[5/7]${NC} Chatbot + Admin"
kill_port "$CHATBOT_PORT"
# Chatbot runs natively while the backend runs in Docker (published on $BACKEND_PORT),
# so agent tools must reach the backend over localhost, not the compose hostname.
(cd "$CHATBOT_DIR" && BACKEND_INTERNAL_URL="http://localhost:${BACKEND_PORT}" \
  LLM_MODEL="$LLM_MODEL" "$PYTHON" chatbot_app.py) > /tmp/attendx-chatbot.log 2>&1 &
CHATBOT_PID=$!
wait_for "http://localhost:${CHATBOT_PORT}/health" "RAG Chatbot" 30

kill_port "$ADMIN_PORT"
(cd "$ADMIN_DIR" && npm start) > /tmp/attendx-admin.log 2>&1 &
ADMIN_PID=$!
wait_for "http://localhost:${ADMIN_PORT}" "Angular Admin" 90

# ── [6/7] Ngrok tunnel ──
echo -e "${YELLOW}[6/7]${NC} Ngrok tunnel"
kill_port "$NGROK_PORT"
nohup ngrok http "$BACKEND_PORT" --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 4

NGROK_URL=""
for i in $(seq 1 10); do
  NGROK_URL=$(curl -s http://localhost:${NGROK_PORT}/api/tunnels 2>/dev/null | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'] if t else '')" 2>/dev/null)
  if [ -n "$NGROK_URL" ]; then break; fi
  sleep 1
done

if [ -z "$NGROK_URL" ]; then
  echo -e "  ${RED}${fail}${NC} ngrok failed to start. Check /tmp/ngrok.log"
  NGROK_URL="(unavailable)"
fi
echo -e "  ${GREEN}${ok}${NC} ngrok → ${BLUE}$NGROK_URL${NC}"

# Verify backend is reachable through ngrok
if [ "$NGROK_URL" != "(unavailable)" ]; then
  echo -n "  ${info} Verifying ngrok tunnel..."
  if curl -sf "$NGROK_URL/api/health" > /dev/null 2>&1; then
    echo -e "\r  ${GREEN}${ok}${NC} Backend reachable via ngrok"
  else
    echo -e "\r  ${RED}${fail}${NC} Backend NOT reachable via ngrok"
    echo -e "  ${info} Check: http://localhost:${NGROK_PORT}"
  fi
fi

# ── [7/7] Flutter API client ──
echo -e "${YELLOW}[7/7]${NC} Flutter API client"
if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "(unavailable)" ] && [ -f "$API_CLIENT" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|return 'https://.*ngrok-free.dev'|return '$NGROK_URL'|" "$API_CLIENT"
  else
    sed -i "s|return 'https://.*ngrok-free.dev'|return '$NGROK_URL'|" "$API_CLIENT"
  fi
  echo -e "  ${GREEN}${ok}${NC} Updated $API_CLIENT → $NGROK_URL"
  echo -e "  ${info} Rebuilding Flutter APK..."
  cd "$ATTENDX_DIR/student" && flutter build apk --debug > /tmp/attendx-flutter-build.log 2>&1 && \
    echo -e "  ${GREEN}${ok}${NC} Flutter APK rebuilt" || \
    echo -e "  ${RED}${fail}${NC} Flutter build failed (check /tmp/attendx-flutter-build.log)"
else
  echo -e "  ${RED}${fail}${NC} Could not update API client"
fi

# ── Summary ──
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Everything is running!                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Ngrok URL${NC}        ${YELLOW}→${NC} ${BLUE}$NGROK_URL${NC} (tunneling to port $BACKEND_PORT)"
echo -e "  ${GREEN}Admin Panel${NC}      ${YELLOW}→${NC} http://localhost:${ADMIN_PORT}"
echo -e "  ${GREEN}Backend API${NC}      ${YELLOW}→${NC} http://localhost:${BACKEND_PORT}/api/health"
echo -e "  ${GREEN}Chatbot UI${NC}       ${YELLOW}→${NC} http://localhost:${CHATBOT_PORT}"
echo -e "  ${GREEN}Flutter App${NC}      ${YELLOW}→${NC} cd $ATTENDX_DIR/student && flutter run"
echo -e "  ${GREEN}Ngrok Dashboard${NC}  ${YELLOW}→${NC} http://localhost:${NGROK_PORT}"
echo ""
sleep 2
if command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:${ADMIN_PORT} 2>/dev/null || true
elif command -v open &> /dev/null; then
  open http://localhost:${ADMIN_PORT} 2>/dev/null || true
fi

echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

wait
