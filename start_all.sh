#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ATTENDX_DIR="$ROOT_DIR/AttendX"
CHATBOT_DIR="$ROOT_DIR/Chatbot"
ADMIN_DIR="$ATTENDX_DIR/admin"
API_CLIENT="$ATTENDX_DIR/student/lib/services/api_client.dart"
DOCKER_HOST_VAR="unix:///var/run/docker.sock"

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
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    AttendX — Start Everything + Ngrok           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites ──
echo -e "${YELLOW}[1/6]${NC} Prerequisites"
if ! command -v ngrok &> /dev/null; then
  echo -e "  ${RED}${fail}${NC} ngrok not found. Install: https://ngrok.com/download"
  exit 1
fi
echo -e "  ${GREEN}${ok}${NC} ngrok $(ngrok --version 2>&1 | head -1)"

export DOCKER_HOST="${DOCKER_HOST:-$DOCKER_HOST_VAR}"
if ! docker info > /dev/null 2>&1; then
  echo -e "  ${RED}${fail}${NC} Docker is not running"
  exit 1
fi
echo -e "  ${GREEN}${ok}${NC} Docker is running"

PYTHON="$CHATBOT_DIR/venv/bin/python"
if [ ! -f "$PYTHON" ]; then
  PYTHON=python3
fi
echo -e "  ${GREEN}${ok}${NC} Python $("$PYTHON" --version 2>&1)"

# ── Docker stack ──
echo -e "${YELLOW}[2/6]${NC} Backend stack (Postgres + Redis + API)"
cd "$ATTENDX_DIR"
lsof -ti :5436 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :6379 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :5001 2>/dev/null | xargs kill -9 2>/dev/null || true
docker compose up -d --build db redis backend > /tmp/attendx-docker.log 2>&1
echo -e "  ${GREEN}${ok}${NC} Docker starting (log: /tmp/attendx-docker.log)"
wait_for "http://localhost:5001/api/health" "Backend API" 60

# Ensure tokenVersion column exists (for logout token invalidation)
echo -n "  ${info} Ensuring tokenVersion column..."
docker exec attendance_db psql -U postgres -d "${DB_NAME:-attendance_db}" \
  -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS \"tokenVersion\" INTEGER NOT NULL DEFAULT 0;" 2>/dev/null && \
  echo -e "\r  ${GREEN}${ok}${NC} tokenVersion column ready" || \
  echo -e "\r  ${YELLOW}⚠${NC} Could not verify tokenVersion column (non-fatal)"

# ── Ollama ──
echo -e "${YELLOW}[3/6]${NC} Ollama (LLM)"
if ! pgrep -x ollama > /dev/null; then
  lsof -ti :11434 2>/dev/null | xargs kill -9 2>/dev/null || true
  ollama serve > /dev/null 2>&1 &
  OLLAMA_PID=$!
  wait_for "http://localhost:11434/api/tags" "Ollama" 15
else
  OLLAMA_PID=$(pgrep -x ollama)
  echo -e "  ${GREEN}${ok}${NC} Ollama already running"
fi
ollama pull nomic-embed-text > /dev/null 2>&1 &
ollama pull llama3.2 > /dev/null 2>&1 &

# ── Chatbot + Admin ──
echo -e "${YELLOW}[4/6]${NC} Chatbot + Admin"
lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true
(cd "$CHATBOT_DIR" && "$PYTHON" chatbot_app.py) > /tmp/attendx-chatbot.log 2>&1 &
CHATBOT_PID=$!
wait_for "http://localhost:8000/health" "RAG Chatbot" 30

lsof -ti :4200 2>/dev/null | xargs kill -9 2>/dev/null || true
(cd "$ADMIN_DIR" && npm start) > /tmp/attendx-admin.log 2>&1 &
ADMIN_PID=$!
wait_for "http://localhost:4200" "Angular Admin" 90

# ── Ngrok ──
echo -e "${YELLOW}[5/6]${NC} Ngrok tunnel"
lsof -ti :4040 2>/dev/null | xargs kill -9 2>/dev/null || true
nohup ngrok http 5001 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 4

NGROK_URL=""
for i in $(seq 1 10); do
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'] if t else '')" 2>/dev/null)
  if [ -n "$NGROK_URL" ]; then break; fi
  sleep 1
done

if [ -z "$NGROK_URL" ]; then
  echo -e "  ${RED}${fail}${NC} ngrok failed to start. Check /tmp/ngrok.log"
  NGROK_URL="(unavailable)"
fi

echo -e "  ${GREEN}${ok}${NC} ngrok → ${BLUE}$NGROK_URL${NC}"

# Verify backend is reachable through ngrok tunnel
if [ "$NGROK_URL" != "(unavailable)" ]; then
  echo -n "  ${info} Verifying ngrok tunnel..."
  if curl -sf "$NGROK_URL/api/health" > /dev/null 2>&1; then
    echo -e "\r  ${GREEN}${ok}${NC} Backend reachable via ngrok"
  else
    echo -e "\r  ${RED}${fail}${NC} Backend NOT reachable via ngrok URL"
    echo -e "  ${RED}${fail}${NC} Check: http://localhost:4040 for tunnel status"
  fi
fi

# ── Update Flutter API client ──
echo -e "${YELLOW}[6/6]${NC} Flutter API client"
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
echo -e "  ${GREEN}Ngrok URL${NC}        ${YELLOW}→${NC} ${BLUE}$NGROK_URL${NC} (tunneling to port 5001)"
echo -e "  ${GREEN}Admin Panel${NC}      ${YELLOW}→${NC} http://localhost:4200"
echo -e "  ${GREEN}Backend API${NC}      ${YELLOW}→${NC} http://localhost:5001/api/health"
echo -e "  ${GREEN}Chatbot UI${NC}       ${YELLOW}→${NC} http://localhost:8000"
echo -e "  ${GREEN}Flutter App${NC}      ${YELLOW}→${NC} cd $ATTENDX_DIR/student && flutter run"
echo -e "  ${GREEN}Ngrok Dashboard${NC}  ${YELLOW}→${NC} http://localhost:4040"
echo ""
sleep 2
if command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:4200 2>/dev/null || true
elif command -v open &> /dev/null; then
  open http://localhost:4200 2>/dev/null || true
fi

echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

wait
