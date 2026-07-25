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
  # `npm start` and the chatbot each run inside a subshell, so $CHATBOT_PID/$ADMIN_PID
  # are the subshells — killing those orphans the real `ng serve` / python children,
  # which keep holding :4200 and :8000. Reap by port, which catches the whole tree.
  kill $CHATBOT_PID $ADMIN_PID 2>/dev/null || true
  for port in 8000 4200; do
    lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
  done
  # Only stop Ollama if this script started it — otherwise we'd kill a daemon the
  # user already had running and pay the 4.7 GB model reload on the next launch.
  if [ "$OLLAMA_STARTED_BY_US" = true ]; then
    kill $OLLAMA_PID 2>/dev/null || true
  fi
  echo "  Stopping Docker containers..."
  # No -v: named volumes (and the seeded DB) must survive a restart.
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

# Everything needed to run is cached locally (backend image, Ollama models, npm and
# pip deps), so the whole stack comes up offline. Probe once up front so the
# network-dependent steps can be skipped cleanly instead of stalling on retries
# and printing alarming red ✗ marks mid-presentation.
ONLINE=false
if curl -sf --max-time 3 https://registry.ollama.ai > /dev/null 2>&1 \
   || curl -sf --max-time 3 https://registry.npmjs.org > /dev/null 2>&1; then
  ONLINE=true
fi
if [ "$ONLINE" = true ]; then
  echo -e "  ${info} Network: online"
else
  echo -e "  ${info} Network: offline — using cached images and models"
fi
echo ""

# ── 1. Docker ────────────────────────────────────────────────────
echo -e "${YELLOW}[1/5]${NC} Docker"
if ! docker info > /dev/null 2>&1; then
  echo -e "  ${RED}${fail}${NC} Docker is not running"
  echo "  Start Docker Desktop: open -a Docker"
  exit 1
fi
# `docker info` answers as soon as the CLI proxy is up, which can be before the
# VM/daemon is actually ready to build or pull images — confirm it can run a
# real container before trusting it, since that's what compose is about to do.
echo -n "  ${info} Confirming daemon can run containers..."
DOCKER_READY=false
for i in $(seq 1 30); do
  if docker run --rm hello-world > /dev/null 2>&1; then
    DOCKER_READY=true
    break
  fi
  sleep 1
done
if [ "$DOCKER_READY" = true ]; then
  echo -e "\r  ${GREEN}${ok}${NC} Docker is running"
else
  echo -e "\r  ${RED}${fail}${NC} Docker daemon not fully ready after 30s"
  echo "  Try: quit Docker Desktop completely (not just close the window), reopen it, and wait for the whale icon to settle before rerunning."
  exit 1
fi

# ── 2. Python venv for chatbot ───────────────────────────────────
echo -e "${YELLOW}[2/5]${NC} Python chatbot environment"
# Pick the first interpreter that can actually import the chatbot's heavy deps.
# Checking imports rather than just existence matters: Chatbot/venv is a venv
# imported from another machine (its symlinks dangle), and a plain `python3` can
# resolve to conda base — which has no chromadb — if a conda env is active.
CHATBOT_DEPS_CHECK='import chromadb, ollama, fastapi, uvicorn, redis, dotenv, pandas'
PYTHON=""
for candidate in \
  "$CHATBOT_DIR/venv/bin/python" \
  "$ROOT_DIR/.venv/bin/python" \
  /usr/local/bin/python3 \
  /opt/homebrew/bin/python3 \
  python3
do
  if command -v "$candidate" > /dev/null 2>&1 \
     && "$candidate" -c "$CHATBOT_DEPS_CHECK" > /dev/null 2>&1; then
    PYTHON="$candidate"
    break
  fi
done

if [ -n "$PYTHON" ]; then
  echo -e "  ${GREEN}${ok}${NC} Python $("$PYTHON" --version 2>&1) — $("$PYTHON" -c 'import sys; print(sys.executable)')"
else
  # Nothing has the deps. Fall back and try to install, which needs the network.
  PYTHON=python3
  echo -e "  ${YELLOW}${info}${NC} No interpreter has the chatbot deps — installing into $(command -v python3)"
  if [ "$ONLINE" = true ]; then
    "$PYTHON" -m pip install -q -r "$CHATBOT_DIR/requirements.txt" 2>&1 | tail -3 || true
  else
    echo -e "  ${RED}${fail}${NC} Offline — cannot install. The chatbot will not start."
  fi
  if "$PYTHON" -c "$CHATBOT_DEPS_CHECK" > /dev/null 2>&1; then
    echo -e "  ${GREEN}${ok}${NC} Dependencies installed"
  else
    echo -e "  ${RED}${fail}${NC} Chatbot dependencies still missing — chat features will be down"
  fi
fi

# ── 3. Docker Compose (Postgres + Redis + Backend) ──────────────
echo -e "${YELLOW}[3/5]${NC} Backend stack"
cd "$ATTENDX_DIR"
# NOTE: these ports are forwarded through the Docker engine's own listener once
# db/redis/backend containers are up — killing whatever holds them kills the
# engine itself, not a stray process. `docker compose up -d` already recreates
# its own containers safely, so no manual port cleanup is needed here.

COMPOSE_OK=false
for attempt in 1 2; do
  if docker compose up -d --build db redis backend > /tmp/attendx-docker.log 2>&1; then
    COMPOSE_OK=true
    break
  fi
  echo -e "  ${YELLOW}${info}${NC} docker compose up failed (attempt $attempt), retrying in 5s..."
  sleep 5
done
if [ "$COMPOSE_OK" != true ]; then
  echo -e "  ${RED}${fail}${NC} docker compose up failed after retries — check /tmp/attendx-docker.log"
  exit 1
fi
echo -e "  ${GREEN}${ok}${NC} Docker services starting (log: /tmp/attendx-docker.log)"
# The backend entrypoint runs db:migrate + seed before listening, so first boot on a
# recreated container takes ~30-60s.
wait_for "http://localhost:5001/api/health" "Backend API" 90 || BACKEND_FAILED=true

# ── 4. Ollama ───────────────────────────────────────────────────
echo -e "${YELLOW}[4/5]${NC} Ollama (LLM service)"
OLLAMA_STARTED_BY_US=false
if ! pgrep -x ollama > /dev/null; then
  lsof -ti :11434 2>/dev/null | xargs kill -9 2>/dev/null || true
  ollama serve > /dev/null 2>&1 &
  OLLAMA_PID=$!
  OLLAMA_STARTED_BY_US=true
  echo -e "  ${GREEN}${ok}${NC} Ollama starting (PID $OLLAMA_PID)"
  wait_for "http://localhost:11434/api/tags" "Ollama" 15 || OLLAMA_FAILED=true
else
  OLLAMA_PID=$(pgrep -x ollama)
  echo -e "  ${GREEN}${ok}${NC} Ollama already running (PID $OLLAMA_PID)"
fi

# Required models. Both are already in the local Ollama store, so a pull is only ever
# a freshness check — verify presence locally and skip the network round-trip when
# offline, rather than failing a pull and printing a red ✗ for a model we do have.
EMBED_MODEL="${EMBED_MODEL:-nomic-embed-text}"
LLM_MODEL="${LLM_MODEL:-qwen2.5:7b}"
echo -e "  ${info} Checking Ollama models..."
OLLAMA_LOCAL_MODELS="$(ollama list 2>/dev/null | awk 'NR>1 {print $1}')"
for model in "$EMBED_MODEL" "$LLM_MODEL"; do
  # `ollama list` always prints an explicit tag, so an untagged name needs ":latest".
  case "$model" in *:*) want="$model" ;; *) want="$model:latest" ;; esac
  if printf '%s\n' "$OLLAMA_LOCAL_MODELS" | grep -qxF "$want"; then
    echo -e "  ${GREEN}${ok}${NC} Model present: $model"
  elif [ "$ONLINE" = true ]; then
    echo -n "  ${info} Pulling $model (this can take several minutes)..."
    if ollama pull "$model" > /dev/null 2>&1; then
      echo -e "\r  ${GREEN}${ok}${NC} Model pulled: $model            "
    else
      echo -e "\r  ${RED}${fail}${NC} Failed to pull $model           "
      MODELS_FAILED=true
    fi
  else
    echo -e "  ${RED}${fail}${NC} Model missing and offline: $model"
    MODELS_FAILED=true
  fi
done

# ── 5. Chatbot + Admin ──────────────────────────────────────────
echo -e "${YELLOW}[5/5]${NC} Chatbot + Admin"

# Chatbot (FastAPI on 8000)
lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true
# The backend runs in Docker (published on host 5001), the chatbot runs natively here,
# so its agent tools must call the backend via localhost — the compose-network
# hostname `backend` does not resolve from the host.
(
  cd "$CHATBOT_DIR" && BACKEND_INTERNAL_URL="http://localhost:5001" \
    EMBED_MODEL="$EMBED_MODEL" LLM_MODEL="$LLM_MODEL" "$PYTHON" chatbot_app.py
) > /tmp/attendx-chatbot.log 2>&1 &
CHATBOT_PID=$!
echo -e "  ${GREEN}${ok}${NC} Chatbot starting (PID $CHATBOT_PID, log: /tmp/attendx-chatbot.log)"
if ! wait_for "http://localhost:8000/health" "RAG Chatbot" 30; then
  CHATBOT_FAILED=true
  echo -e "  ${RED}${info}${NC} Last lines of /tmp/attendx-chatbot.log:"
  tail -5 /tmp/attendx-chatbot.log 2>/dev/null | sed 's/^/      /'
fi

# Angular admin (4200)
lsof -ti :4200 2>/dev/null | xargs kill -9 2>/dev/null || true
# --host 0.0.0.0 is required for the QR demo: the QR encodes a deep link to
# /student, and the phone's browser opens it against this machine's LAN IP.
# ng serve binds to localhost only by default, so the phone would get connection
# refused. --disable-host-check accepts the IP-based Host header.
(
  cd "$ADMIN_DIR" && npm start -- --host 0.0.0.0 --disable-host-check
) > /tmp/attendx-admin.log 2>&1 &
ADMIN_PID=$!
echo -e "  ${GREEN}${ok}${NC} Admin starting (PID $ADMIN_PID, log: /tmp/attendx-admin.log)"
# A cold Angular build can exceed 90s; keep waiting a bit longer rather than opening
# the browser at a dev server that hasn't finished its first compile.
wait_for "http://localhost:4200" "Angular Admin" 150 || ADMIN_FAILED=true

# The phone reaches the backend over the LAN, not loopback — detect the address now so
# the printed command is correct for whatever network we're on today.
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo ""
if [ -n "$BACKEND_FAILED$CHATBOT_FAILED$ADMIN_FAILED$OLLAMA_FAILED$MODELS_FAILED" ]; then
  echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║        Started, but some services need attention     ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  [ -n "$BACKEND_FAILED" ] && echo -e "  ${RED}${fail}${NC} Backend API  — check /tmp/attendx-docker.log; then: docker compose logs backend"
  [ -n "$OLLAMA_FAILED" ]  && echo -e "  ${RED}${fail}${NC} Ollama       — run 'ollama serve' in another terminal"
  [ -n "$MODELS_FAILED" ]  && echo -e "  ${RED}${fail}${NC} Models       — AI answers will fail until the model is present"
  [ -n "$CHATBOT_FAILED" ] && echo -e "  ${RED}${fail}${NC} RAG Chatbot  — check /tmp/attendx-chatbot.log"
  [ -n "$ADMIN_FAILED" ]   && echo -e "  ${RED}${fail}${NC} Admin panel  — check /tmp/attendx-admin.log (may still be compiling; reload in a minute)"
else
  echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║            All services running!                     ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
fi
echo ""
echo -e "  ${GREEN}Admin Panel${NC}     ${YELLOW}→${NC} http://localhost:4200"
echo -e "  ${GREEN}AI Assistant${NC}    ${YELLOW}→${NC} http://localhost:4200/chatbot"
echo -e "  ${GREEN}Backend API${NC}     ${YELLOW}→${NC} http://localhost:5001/api/health"
echo -e "  ${GREEN}Swagger Docs${NC}    ${YELLOW}→${NC} http://localhost:5001/api-docs"
echo -e "  ${GREEN}Chatbot UI${NC}      ${YELLOW}→${NC} http://localhost:8000"
echo -e "  ${GREEN}Student Chat${NC}    ${YELLOW}→${NC} http://localhost:8000/student"
echo ""
if [ -n "$LAN_IP" ]; then
  echo -e "  ${YELLOW}QR demo — the phone scans a deep link, so use the LAN URL, not localhost:${NC}"
  echo -e "    ${GREEN}Open the teacher portal here${NC} ${YELLOW}→${NC} http://${LAN_IP}:4200"
  echo -e "    ${info} The QR encodes this page's origin. Opening it at localhost makes the"
  echo -e "      phone resolve the link to itself, so the scan will fail."
  echo -e "    ${info} Check from the phone's browser first: ${YELLOW}http://${LAN_IP}:4200${NC}"
  echo ""
  echo -e "  ${GREEN}Flutter app${NC} (optional — it has no QR scanner; login/attendance views only):"
  echo -e "    cd $STUDENT_DIR && flutter run --dart-define=API_BASE_URL=http://${LAN_IP}:5001"
else
  echo -e "  ${RED}${fail}${NC} No LAN IP found (Wi-Fi off?) — a phone cannot reach this machine."
  echo -e "      Join a network, or use a phone hotspot, then restart."
fi
echo ""

if command -v open &> /dev/null && [ -z "$ADMIN_FAILED" ]; then
  sleep 2
  open http://localhost:4200 2>/dev/null || true
fi

echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

wait
