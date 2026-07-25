"""
RAG Chatbot for Smart Campus Management System.

Setup:
    1. ollama pull nomic-embed-text
    2. ollama pull llama3.2          (or change LLM_MODEL below)
    3. python rag_indexer.py         (builds the vector store once)
    4. python chatbot_app.py         (starts the web server)

Then open http://localhost:8000
"""

import asyncio
import json
import os
import re
import urllib.error
import urllib.request
import uuid

import chromadb
import ollama
import redis.asyncio as redis_async
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

load_dotenv()

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.getenv("CHROMA_DIR", os.path.join(_BASE_DIR, "chroma_db"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "student_data")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")
N_RESULTS = int(os.getenv("N_RESULTS", "5"))
# Max embedding distance for a retrieved doc to count as relevant. Tuned for
# nomic-embed-text on this corpus (on-topic ~250-350, off-topic ~450+); raise it if
# real questions start coming back unanswered, lower it if answers drift off-topic.
RAG_MAX_DISTANCE = float(os.getenv("RAG_MAX_DISTANCE", "400"))
# Context window fed to the model. Default ~2048 silently truncates long history,
# which is the root cause of "forgetting"; raise it (env-tunable; lower to 4096 if
# CPU latency hurts).
NUM_CTX = int(os.getenv("NUM_CTX", os.getenv("OLLAMA_NUM_CTX", "8192")))

# Agent tool-use: the model can call read-only tools that fetch live data from the
# Node backend (which owns Postgres + auth). The caller's JWT is forwarded so the
# backend's RBAC is the single authority (a student literally can't read other data).
#
# The default targets the *host* (start.sh runs this app natively while the backend
# runs in Docker, published on 5001). docker-compose overrides it with
# http://backend:5000 for the on-network case — a hostname that does NOT resolve
# outside the compose network, so it must never be the fallback.
BACKEND_INTERNAL_URL = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:5001")
TOOLS_ENABLED = os.getenv("TOOLS_ENABLED", "true").lower() == "true"
MAX_TOOL_ITERS = int(os.getenv("MAX_TOOL_ITERS", "4"))
TOOL_RESULT_CAP = int(os.getenv("TOOL_RESULT_CAP", "4000"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_TTL = int(os.getenv("SESSION_TTL", "3600"))
MAX_HISTORY = int(os.getenv("MAX_HISTORY", "10"))

_redis = None

async def get_redis():
    global _redis
    if _redis is None:
        _redis = redis_async.from_url(REDIS_URL, decode_responses=True)
    return _redis

def new_session_id() -> str:
    return str(uuid.uuid4())

async def load_history(session_id: str) -> list:
    if not session_id:
        return []
    r = await get_redis()
    try:
        data = await r.get(f"chat:{session_id}")
        return json.loads(data) if data else []
    except Exception:
        return []

async def save_history(session_id: str, messages: list):
    if not session_id:
        return
    r = await get_redis()
    try:
        await r.set(f"chat:{session_id}", json.dumps(messages), ex=SESSION_TTL)
    except Exception:
        pass

ADMIN_SYSTEM_PROMPT = (
    "You are a friendly AI assistant for a Smart Campus Management System. "
    "You are assisting a system ADMINISTRATOR (staff) — NOT a student. The administrator has "
    "read access to all students' data for analytics.\n\n"
    "IMPORTANT: If the user asks who they are (\"who am I\"), tell them they are signed in as an "
    "administrator. NEVER identify or treat the user as a student, and never use tools or search "
    "results to guess the user's own identity — you only know a student's identity when the admin "
    "explicitly asks about that specific student.\n"
    "For greetings or casual messages (e.g. \"hey\", \"hello\", \"how are you\"), respond warmly and briefly, "
    "and let the admin know what you can help with.\n"
    "For data questions, use the tools or provided context to answer. Be concise and specific.\n"
    "If an ATTENDANCE DATA question cannot be answered, say \"I don't have that information.\" "
    "Never say that about ordinary conversation — see MEMORY below.\n\n"
    "MEMORY: the messages in this conversation are your reliable memory. Anything the admin told you "
    "earlier in this conversation is a fact you know — recall it directly and confidently. Never claim you "
    "have no memory, no access to earlier turns, or no knowledge of the admin's stated preferences. "
    "Only attendance figures require a tool; remembering what was said does not."
)

app = FastAPI(title="Smart Campus RAG Chatbot")

# CORS — allow Angular admin (4200), Flutter web (varied), and others to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_collection():
    if not os.path.exists(CHROMA_DIR):
        return None
    try:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        return client.get_collection(COLLECTION_NAME)
    except Exception:
        return None


# Mutable container so /reindex can swap the live collection after rebuilding.
state = {"collection": get_collection()}


def current_collection():
    return state["collection"]


def retrieve_context(query: str) -> str:
    coll = current_collection()
    if coll is None:
        return ""
    resp = ollama.embeddings(model=EMBED_MODEL, prompt=query)
    query_embedding = resp["embedding"]
    results = coll.query(
        query_embeddings=[query_embedding],
        n_results=N_RESULTS,
        include=["documents", "distances"],
    )
    docs = results["documents"][0]
    dists = (results.get("distances") or [None])[0]
    if not dists:
        return "\n\n---\n\n".join(docs)  # fail open if the backend omits distances
    # Chroma returns the N nearest docs regardless of how unrelated they are, so an
    # off-topic query ("favourite colour") still gets handed real student records and
    # the model mines them for an answer. Drop anything past the relevance cutoff:
    # measured on this corpus, on-topic queries score ~250-350 and off-topic ~450+.
    kept = [d for d, dist in zip(docs, dists) if dist <= RAG_MAX_DISTANCE]
    return "\n\n---\n\n".join(kept)


def build_user_content(context: str, question: str) -> str:
    if context:
        return f"Context:\n{context}\n\nQuestion: {question}"
    return question


async def stream_response(user_message: str, session_id: str = ""):
    if current_collection() is None:
        yield f"data: {json.dumps('Error: Vector store not found. Please run python rag_indexer.py first.')}\n\n"
        yield "data: [DONE]\n\n"
        return

    context = retrieve_context(user_message)
    user_content = build_user_content(context, user_message)

    history = await load_history(session_id)
    messages = [{"role": "system", "content": ADMIN_SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_content})

    try:
        response = ollama.chat(
            model=LLM_MODEL,
            messages=messages,
            stream=True,
            options={"num_ctx": NUM_CTX},
        )
        full_reply = ""
        for chunk in response:
            content = chunk.message.content
            if content:
                full_reply += content
                yield f"data: {json.dumps(content)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps(f'Error: {str(e)}')}\n\n"
        return

    yield "data: [DONE]\n\n"

    history.append({"role": "user", "content": user_content})
    history.append({"role": "assistant", "content": full_reply})
    history = history[-MAX_HISTORY * 2:]
    await save_history(session_id, history)


async def collect_reply(user_message: str, session_id: str = "") -> str:
    """Non-streaming version: collect the full reply from the model."""
    coll = current_collection()
    if coll is None:
        return "Error: Knowledge base not built. Refresh AI knowledge."

    context = retrieve_context(user_message)
    user_content = build_user_content(context, user_message)

    history = await load_history(session_id)
    messages = [{"role": "system", "content": ADMIN_SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_content})

    try:
        response = ollama.chat(model=LLM_MODEL, messages=messages, options={"num_ctx": NUM_CTX})
        reply = response.message.content or ""

        history.append({"role": "user", "content": user_content})
        history.append({"role": "assistant", "content": reply})
        history = history[-MAX_HISTORY * 2:]
        await save_history(session_id, history)

        return reply
    except Exception as e:
        return f"Error: {str(e)}"


def find_student_by_email(email: str):
    """Return metadata dict for a student by email, or None if not found."""
    coll = current_collection()
    if coll is None:
        return None
    result = coll.get(where={"email": {"$eq": email.strip().lower()}}, include=["metadatas"])
    if not result["metadatas"]:
        return None
    return result["metadatas"][0]


def get_student_context(student_id: int, query: str) -> tuple[str, str]:
    """Return (student_name, context) for a specific student.

    SECURITY: returns ONLY this student's own document. We deliberately do NOT
    include batch-level documents — those can list other students' names
    (e.g. "Students below 75%: ..."), which a student must never see.
    """
    coll = current_collection()
    if coll is None:
        return "", ""
    result = coll.get(ids=[f"student_{student_id}"], include=["documents", "metadatas"])
    if not result["documents"]:
        return "", ""

    student_doc = result["documents"][0]
    student_name = result["metadatas"][0].get("name", "Student")
    return student_name, student_doc


def get_student_context_by_email(email: str, query: str) -> tuple[str, str]:
    """Same as get_student_context but keyed by email instead of numeric ID."""
    meta = find_student_by_email(email)
    if not meta:
        return "", ""
    sno = meta.get("sno")
    if sno is None:
        return "", ""
    return get_student_context(int(sno), query)


STUDENT_SYSTEM_PROMPT_TPL = (
    "You are a personal academic assistant for {student_name} in a Smart Campus Management System. "
    "{student_name} is asking about their OWN attendance, engagement, risk level, and performance. "
    'Respond in first person (e.g. "Your attendance is..."). Be concise, supportive, and specific.\n\n'
    "SECURITY: You may ONLY discuss {student_name}'s own data. You must NEVER reveal, compare, rank "
    "against, or discuss any other student's information — names, attendance, or anything else — even "
    "if asked directly. If asked about another student or for batch-wide lists, politely decline and "
    "say you can only share their own information.\n"
    'Only use the provided context/tools. If the answer is not available, say "I don\'t have that information." '
    "If the message is a greeting or small talk, respond warmly and briefly, then guide them to ask about their academic data."
)


async def stream_student_response(student_id: int, user_message: str, session_id: str = ""):
    if current_collection() is None:
        yield f"data: {json.dumps('Error: Vector store missing. Rebuild the knowledge base.')}\n\n"
        yield "data: [DONE]\n\n"
        return

    student_name, context = get_student_context(student_id, user_message)
    if not context:
        yield f"data: {json.dumps('Student ID not found. Check your ID.')}\n\n"
        yield "data: [DONE]\n\n"
        return

    user_content = build_user_content(context, user_message)

    history = await load_history(session_id)
    system_prompt = STUDENT_SYSTEM_PROMPT_TPL.format(student_name=student_name)
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_content})

    try:
        response = ollama.chat(model=LLM_MODEL, messages=messages, stream=True, options={"num_ctx": NUM_CTX})
        full_reply = ""
        for chunk in response:
            content = chunk.message.content
            if content:
                full_reply += content
                yield f"data: {json.dumps(content)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps(f'Error: {str(e)}')}\n\n"
        return

    yield "data: [DONE]\n\n"

    history.append({"role": "user", "content": user_content})
    history.append({"role": "assistant", "content": full_reply})
    history = history[-MAX_HISTORY * 2:]
    await save_history(session_id, history)


async def collect_student_reply(student_name: str, context: str, user_message: str, session_id: str = "") -> str:
    user_content = build_user_content(context, user_message)

    history = await load_history(session_id)
    system_prompt = STUDENT_SYSTEM_PROMPT_TPL.format(student_name=student_name)
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_content})

    try:
        response = ollama.chat(model=LLM_MODEL, messages=messages, options={"num_ctx": NUM_CTX})
        reply = response.message.content or ""

        history.append({"role": "user", "content": user_content})
        history.append({"role": "assistant", "content": reply})
        history = history[-MAX_HISTORY * 2:]
        await save_history(session_id, history)

        return reply
    except Exception as e:
        return f"Error: {str(e)}"


@app.get("/", response_class=HTMLResponse)
async def index():
    with open("templates/index.html", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.get("/student", response_class=HTMLResponse)
async def student_index():
    with open("templates/student_index.html", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.post("/student/verify")
async def student_verify(request: Request):
    coll = current_collection()
    if coll is None:
        return JSONResponse({"error": "Vector store not ready"}, status_code=503)
    body = await request.json()
    email = body.get("email", "").strip()
    if not email:
        return JSONResponse({"error": "Email is required"}, status_code=400)

    meta = find_student_by_email(email)
    if not meta:
        return JSONResponse({"error": "Student not found. Check your email."}, status_code=404)

    return JSONResponse({"name": meta.get("name", ""), "batch": meta.get("batch", ""), "sno": meta.get("sno")})


@app.post("/student/chat")
async def student_chat(request: Request):
    body = await request.json()
    user_message = body.get("message", "").strip()
    session_id = body.get("session_id", "")
    try:
        student_id = int(body.get("student_id", ""))
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid student ID"}, status_code=400)
    if not user_message:
        return JSONResponse({"error": "Empty message"}, status_code=400)
    return StreamingResponse(stream_student_response(student_id, user_message, session_id), media_type="text/event-stream")


@app.post("/student/chat-by-email")
async def student_chat_by_email(request: Request):
    """Non-streaming chat endpoint keyed by student email.
    Returns a JSON envelope so the Flutter app (which doesn't speak SSE) can use it.
    """
    body = await request.json()
    user_message = body.get("message", "").strip()
    email = body.get("email", "").strip()
    session_id = body.get("session_id", "")
    if not user_message:
        return JSONResponse({"error": "Empty message"}, status_code=400)
    if not email:
        return JSONResponse({"error": "Email is required"}, status_code=400)
    if current_collection() is None:
        return JSONResponse(
            {"reply": "Knowledge base not built. Ask an admin to refresh it."}
        )

    meta = find_student_by_email(email)
    if not meta:
        reply = await collect_reply(user_message, session_id)
        return JSONResponse({"reply": reply, "personalized": False})

    student_name = meta.get("name", "Student")
    _, context = get_student_context_by_email(email, user_message)
    reply = await collect_student_reply(student_name, context, user_message, session_id)
    return JSONResponse({"reply": reply, "personalized": True, "name": student_name})


@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_message = body.get("message", "").strip()
    session_id = body.get("session_id", "")
    if not user_message:
        return JSONResponse({"error": "Empty message"}, status_code=400)
    return StreamingResponse(stream_response(user_message, session_id), media_type="text/event-stream")


@app.post("/chat-sync")
async def chat_sync(request: Request):
    """Non-streaming admin chat. Convenient for Angular HttpClient."""
    body = await request.json()
    user_message = body.get("message", "").strip()
    session_id = body.get("session_id", "")
    if not user_message:
        return JSONResponse({"error": "Empty message"}, status_code=400)
    reply = await collect_reply(user_message, session_id)
    return JSONResponse({"reply": reply})


@app.post("/reindex")
async def reindex():
    """Rebuild the vector store from the current CSV files, then swap it in."""
    try:
        import rag_indexer
        rag_indexer.build_index()
        state["collection"] = get_collection()
        ready = state["collection"] is not None
        return JSONResponse({"success": ready, "message": "Knowledge base rebuilt" if ready else "Reindex completed but collection empty"})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.post("/ingest")
async def ingest(request: Request):
    """Accept a JSON payload of student records, generate analytics CSVs, then reindex.

    Expected body shape:
    {
      "students": [
        {
          "sno": 1, "name": "...", "email": "...", "batch": "Autumn 2025",
          "subjects": [
            { "code": "MATH201", "name": "Maths", "present": 25, "absent": 2, "late": 1 }
          ]
        }
      ]
    }
    """
    try:
        body = await request.json()
        students = body.get("students", [])
        if not isinstance(students, list) or not students:
            return JSONResponse({"success": False, "error": "Student data is required"}, status_code=400)

        import csv_builder
        csv_builder.build_csvs(students)

        import rag_indexer
        rag_indexer.build_index()
        state["collection"] = get_collection()
        ready = state["collection"] is not None
        return JSONResponse({
            "success": ready,
            "students_indexed": len(students),
            "message": "Knowledge base rebuilt from live data" if ready else "Reindex completed but collection empty",
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


# ── Stateless agent engine ───────────────────────────────────────────────────
# The backend owns the transcript; here we just turn a supplied history into a
# grounded reply. RAG context is attached to the latest user turn; the running
# summary (older turns the backend folded away) is injected into the system prompt.

def _system_prompt_for(scope: str, student_email: str | None, user_email: str | None = None) -> str:
    if scope == "student":
        name = "Student"
        if student_email:
            meta = find_student_by_email(student_email)
            if meta:
                name = meta.get("name", "Student")
        return STUDENT_SYSTEM_PROMPT_TPL.format(student_name=name)
    base = ADMIN_SYSTEM_PROMPT
    if user_email:
        base += f"\n\nThe administrator is signed in as: {user_email}."
    return base


def _rag_context_for(scope: str, student_email: str | None, query: str) -> str:
    if scope == "student" and student_email:
        _, ctx = get_student_context_by_email(student_email, query)
        return ctx
    return retrieve_context(query)


def build_agent_messages(history: list, scope: str, student_email: str | None, running_summary: str | None, inject_rag: bool = True, user_email: str | None = None) -> list:
    """history: [{role, content}] user/assistant, oldest→newest. Returns the full
    ollama message list with the scope system prompt and running summary.
    When inject_rag is True (no-tools mode) RAG context is attached to the latest
    user turn; when False (tool mode) the raw question is kept so the model calls
    tools to fetch data instead of being handed it."""
    system = _system_prompt_for(scope, student_email, user_email)
    if not inject_rag:
        system += (
            "\n\nTOOLS: you have tools that look up live attendance data. They are OPTIONAL — most "
            "turns need no tool at all.\n"
            "CALL a tool only when the admin is asking for attendance facts you do not already have: "
            "specific numbers, named students, batches, courses, or at-risk lists. Then answer concisely "
            "from the results.\n"
            "Do NOT call any tool for: greetings and small talk (\"hey\", \"hello\", \"how are you\", "
            "\"thanks\", \"sup\"); questions about yourself or what you can do; questions about the "
            "conversation itself or anything the admin already told you; or follow-ups you can answer "
            "from the results of a tool you already called this turn. In those cases just reply in words.\n"
            "Never call search_knowledge_base with an empty or vague query — if you have no specific "
            "thing to look up, you do not need the tool.\n"
            "Emit tool calls only through the tool-calling interface. NEVER write tool calls, function "
            "names, or JSON like {\"name\": ...} into your reply text — the admin sees that text."
        )
    if running_summary:
        system += f"\n\nConversation so far (summary of earlier turns):\n{running_summary}"
    msgs = [{"role": "system", "content": system}]

    last_user_idx = None
    for i in range(len(history) - 1, -1, -1):
        if history[i].get("role") == "user":
            last_user_idx = i
            break

    for i, m in enumerate(history):
        role = m.get("role")
        content = m.get("content", "") or ""
        if role not in ("user", "assistant"):
            continue
        if role == "user" and i == last_user_idx and inject_rag:
            ctx = _rag_context_for(scope, student_email, content)
            content = build_user_content(ctx, content)
        msgs.append({"role": role, "content": content})
    return msgs


@app.post("/agent/respond")
async def agent_respond(request: Request):
    """Stateless: take a supplied history + scope, return a grounded reply + token usage."""
    body = await request.json()
    history = body.get("messages", []) or []
    scope = (body.get("scope") or "admin").lower()
    student_email = (body.get("student_email") or "").strip().lower() or None
    running_summary = body.get("running_summary")
    user_email = body.get("user_email")
    jwt = body.get("jwt") if body.get("tools_enabled") else None
    opts = body.get("options") or {}
    num_ctx = int(opts.get("num_ctx", NUM_CTX))

    if current_collection() is None:
        return JSONResponse({
            "reply": "Knowledge base not built yet. Ask an admin to refresh AI knowledge.",
            "usage": {"prompt_tokens": None, "completion_tokens": None, "num_ctx": num_ctx},
        })
    if not history or history[-1].get("role") != "user":
        return JSONResponse({"error": "messages must be non-empty and end with a user turn"}, status_code=400)

    # Tools are admin-only: admins do cross-student analytics; students only ever need
    # their own data (own-doc RAG is more reliable than the small model's tool-calling).
    # Small talk gets neither tools nor retrieved context (see _agent_stream_gen).
    small_talk = _is_small_talk(history)
    use_tools = TOOLS_ENABLED and bool(jwt) and scope == "admin" and not small_talk and tools_supported()
    messages = build_agent_messages(
        history, scope, student_email, running_summary,
        inject_rag=not use_tools and not small_talk, user_email=user_email,
    )
    try:
        if use_tools:
            reply, usage = await asyncio.to_thread(run_tool_loop, messages, scope, student_email, jwt, num_ctx)
            return JSONResponse({"reply": reply, "usage": usage})
        response = await asyncio.to_thread(
            ollama.chat, model=LLM_MODEL, messages=messages, options={"num_ctx": num_ctx}
        )
        reply = response.message.content or ""
        return JSONResponse({
            "reply": reply,
            "usage": {
                "prompt_tokens": getattr(response, "prompt_eval_count", None),
                "completion_tokens": getattr(response, "eval_count", None),
                "num_ctx": num_ctx,
            },
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Agent tools ──────────────────────────────────────────────────────────────

def build_tool_specs(scope: str) -> list:
    """Ollama tool/function specs the model may call, filtered by role."""
    search = {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Semantic search over indexed attendance/engagement/risk analytics. Use for fuzzy or qualitative questions.",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
        },
    }
    if scope == "student":
        return [search, {
            "type": "function",
            "function": {
                "name": "get_student_attendance",
                "description": "Exact live attendance (overall + per subject) for the current student.",
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        }]
    return [
        search,
        {"type": "function", "function": {
            "name": "get_student_attendance",
            "description": "Exact live attendance for one student, looked up by email or sno.",
            "parameters": {"type": "object", "properties": {"email": {"type": "string"}, "sno": {"type": "integer"}}, "required": []}}},
        {"type": "function", "function": {
            "name": "list_at_risk_students",
            "description": (
                "Students whose overall attendance is BELOW a percentage threshold, optionally filtered by batch. "
                "threshold is a percentage from 1-100 and acts as an upper bound. "
                "Use 60 for 'critical' risk, 80 for 'at risk' / 'below threshold' (80 is the institutional pass mark). "
                "Never pass 0 — it means 'below 0%' and always returns nobody. Omit threshold to default to 80."
            ),
            "parameters": {"type": "object", "properties": {
                "threshold": {"type": "number", "description": "Upper-bound percentage, 1-100. 60=critical, 80=at risk. Defaults to 80."},
                "batch": {"type": "string"},
                "limit": {"type": "integer"}}, "required": []}}},
        {"type": "function", "function": {
            "name": "get_batch_summary",
            "description": "Per-batch average attendance and at-risk counts.",
            "parameters": {"type": "object", "properties": {"batch": {"type": "string"}}, "required": []}}},
        {"type": "function", "function": {
            "name": "get_course_performance",
            "description": "Per-course average attendance.",
            "parameters": {"type": "object", "properties": {"course_code": {"type": "string"}}, "required": []}}},
    ]


_TOOL_ENDPOINTS = {
    "get_student_attendance": "student-attendance",
    "list_at_risk_students": "at-risk",
    "get_batch_summary": "batch-summary",
    "get_course_performance": "course-performance",
}


def _post_node(path: str, args: dict, jwt: str) -> dict:
    """Call a Node agent-tool endpoint, forwarding the caller's JWT for RBAC."""
    url = f"{BACKEND_INTERNAL_URL}/api/agent-tools/{path}"
    data = json.dumps(args or {}).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {jwt}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode("utf-8")).get("message", f"HTTP {e.code}")
        except Exception:
            msg = f"HTTP {e.code}"
        # Log it: the model turns a tool error into a vague "I can't access that"
        # apology, which is indistinguishable from the tool never being called.
        print(f"[agent-tool] {path} failed: {msg}", flush=True)
        return {"error": msg}
    except Exception as e:
        print(f"[agent-tool] {path} unreachable at {url}: {e}", flush=True)
        return {"error": f"{e} (url={url})"}


def exec_tool(name: str, args: dict, scope: str, student_email, jwt) -> dict:
    if name == "search_knowledge_base":
        ctx = _rag_context_for(scope, student_email, (args or {}).get("query", ""))
        if ctx:
            return {"results": ctx}
        # The knowledge base holds attendance records only, so a miss usually means the
        # question wasn't an attendance question. Say so, or the model reports the failed
        # lookup to the admin ("I couldn't confirm that in the system's data") even when
        # the answer was sitting in the conversation all along.
        return {"results": None, "note": (
            "No attendance records matched — this question is outside the knowledge base, "
            "which contains only attendance data. Do NOT mention this lookup or say data is "
            "missing. Just answer from the conversation above using your own knowledge."
        )}
    path = _TOOL_ENDPOINTS.get(name)
    if not path:
        return {"error": f"unknown tool: {name}"}
    return _post_node(path, args or {}, jwt)


_tools_supported = None


def tools_supported() -> bool:
    """Probe once whether the configured model accepts tool specs."""
    global _tools_supported
    if _tools_supported is None:
        try:
            ollama.chat(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": "hi"}],
                tools=build_tool_specs("admin"),
                options={"num_ctx": 1024},
            )
            _tools_supported = True
        except Exception:
            _tools_supported = False
    return _tools_supported


def _coerce_args(raw):
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    return {}


# Small models sometimes "call" a tool by typing the JSON into their reply instead of
# using the tool-calling interface. That text is user-visible, so strip it out.
_TEXT_TOOL_CALL_RE = re.compile(
    r'\{\s*"(?:name|function)"\s*:\s*"[^"]+"\s*(?:,\s*"(?:parameters|arguments)"\s*:\s*\{.*?\}\s*)?\}',
    re.DOTALL,
)


def _strip_tool_json(text: str) -> str:
    """Remove leaked text-form tool calls and tidy the whitespace they leave behind."""
    if not text or "{" not in text:
        return text
    cleaned = _TEXT_TOOL_CALL_RE.sub("", text)
    # Drop wrapper fences left empty by the substitution.
    cleaned = re.sub(r"```(?:json)?\s*```", "", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


# Pure small talk — no attendance lookup could possibly help. Deliberately narrow
# (whole-message match on short phrases) so real questions are never caught by it.
_SMALL_TALK_RE = re.compile(
    r"^(?:"
    r"hey+|hi+|hello+|yo+|sup|wass?up|what'?s up|"
    r"how are you( doing)?|how'?s it going|how do you do|"
    r"good (morning|afternoon|evening|day)|greetings|"
    r"thanks?( a lot| you( very much)?)?|thx|ty|cheers|"
    r"ok|okay|kk|cool|nice|great|awesome|perfect|got it|"
    r"bye+|goodbye|see ya|see you|later|good ?night|"
    r"lol|lmao|haha+|hehe+|nvm|never mind"
    r")[\s!.?,]*$",
    re.IGNORECASE,
)


def _is_small_talk(history: list) -> bool:
    """True when the newest user turn is bare small talk, so tools stay detached."""
    for m in reversed(history or []):
        if m.get("role") == "user":
            text = (m.get("content") or "").strip()
            return bool(text) and len(text) <= 40 and bool(_SMALL_TALK_RE.match(text))
    return False


def _is_pointless_search(name: str, args: dict) -> bool:
    """True for search_knowledge_base with no real query — a compulsive call that
    embeds an empty string, returns noise, and shows the admin a spurious chip."""
    if name != "search_knowledge_base":
        return False
    q = (args or {}).get("query")
    return not isinstance(q, str) or len(q.strip()) < 3


def _chunk_text(text: str):
    """Yield ~12-char chunks (on word boundaries) so a non-streamed final answer
    still types out in the UI."""
    buf = ""
    for ch in text:
        buf += ch
        if len(buf) >= 12 and ch == " ":
            yield buf
            buf = ""
    if buf:
        yield buf


def run_tool_loop(messages, scope, student_email, jwt, num_ctx):
    """Non-streaming reason→act→observe loop. Returns (final_text, usage)."""
    tools = build_tool_specs(scope)
    convo = list(messages)
    usage = {"prompt_tokens": None, "completion_tokens": None, "num_ctx": num_ctx}
    for _ in range(MAX_TOOL_ITERS):
        resp = ollama.chat(model=LLM_MODEL, messages=convo, tools=tools, options={"num_ctx": num_ctx})
        msg = resp.message
        usage["prompt_tokens"] = getattr(resp, "prompt_eval_count", None)
        usage["completion_tokens"] = getattr(resp, "eval_count", None)
        tcs = getattr(msg, "tool_calls", None)
        if not tcs:
            return _strip_tool_json(msg.content or ""), usage
        convo.append({"role": "assistant", "content": msg.content or "", "tool_calls": tcs})
        for tc in tcs:
            name = tc.function.name
            args = _coerce_args(tc.function.arguments)
            if _is_pointless_search(name, args):
                convo.append({"role": "tool", "name": name, "content": json.dumps({
                    "skipped": "No query supplied, so no lookup was needed. "
                               "Answer the admin directly in words, using the conversation above."
                })})
                continue
            obs = exec_tool(name, args, scope, student_email, jwt)
            convo.append({"role": "tool", "content": json.dumps(obs)[:TOOL_RESULT_CAP], "name": name})
    resp = ollama.chat(model=LLM_MODEL, messages=convo, options={"num_ctx": num_ctx})
    return _strip_tool_json(resp.message.content or ""), usage


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _agent_stream_gen(history, scope, student_email, running_summary, num_ctx, jwt=None, user_email=None):
    """Sync generator (Starlette runs it in a threadpool). Streams the reply as SSE.
    When tools are available it runs a reason→act→observe loop, emitting tool_call /
    tool_result events, then types out the final answer; otherwise it plain-streams."""
    usage = {"prompt_tokens": None, "completion_tokens": None, "num_ctx": num_ctx}
    try:
        if current_collection() is None:
            yield _sse("error", {"message": "Knowledge base not built yet. Ask an admin to refresh AI knowledge."})
            yield _sse("done", {})
            return
        # Tools are admin-only: admins do cross-student analytics; students only ever need
        # their own data (own-doc RAG is more reliable than the small model's tool-calling).
        # Small talk gets neither tools nor retrieved context. Injecting either is what
        # made "hey" come back with at-risk batch statistics.
        small_talk = _is_small_talk(history)
        use_tools = TOOLS_ENABLED and bool(jwt) and scope == "admin" and not small_talk and tools_supported()
        messages = build_agent_messages(
            history, scope, student_email, running_summary,
            inject_rag=not use_tools and not small_talk, user_email=user_email,
        )

        if use_tools:
            tools = build_tool_specs(scope)
            convo = list(messages)
            final_text = None
            for _ in range(MAX_TOOL_ITERS):
                resp = ollama.chat(model=LLM_MODEL, messages=convo, tools=tools, options={"num_ctx": num_ctx})
                msg = resp.message
                usage["prompt_tokens"] = getattr(resp, "prompt_eval_count", None)
                usage["completion_tokens"] = getattr(resp, "eval_count", None)
                tcs = getattr(msg, "tool_calls", None)
                if not tcs:
                    final_text = msg.content or ""
                    break
                convo.append({"role": "assistant", "content": msg.content or "", "tool_calls": tcs})
                for tc in tcs:
                    name = tc.function.name
                    args = _coerce_args(tc.function.arguments)
                    if _is_pointless_search(name, args):
                        # Don't run it and don't show a chip — just steer the model back
                        # to answering conversationally.
                        convo.append({"role": "tool", "name": name, "content": json.dumps({
                            "skipped": "No query supplied, so no lookup was needed. "
                                       "Answer the admin directly in words, using the conversation above."
                        })})
                        continue
                    yield _sse("tool_call", {"name": name, "args": args})
                    obs = exec_tool(name, args, scope, student_email, jwt)
                    yield _sse("tool_result", {"name": name, "result": obs})
                    convo.append({"role": "tool", "content": json.dumps(obs)[:TOOL_RESULT_CAP], "name": name})
            if final_text is not None:
                final_text = _strip_tool_json(final_text)
                if not final_text:
                    # The model produced nothing usable (or only a leaked tool call).
                    # Ask once more without tools so the admin always gets real prose.
                    retry = ollama.chat(
                        model=LLM_MODEL,
                        messages=convo + [{"role": "user", "content":
                                           "Reply to my last message now, in plain words. Do not call any tool."}],
                        options={"num_ctx": num_ctx},
                    )
                    final_text = _strip_tool_json(retry.message.content or "").strip()
                    usage["prompt_tokens"] = getattr(retry, "prompt_eval_count", None) or usage["prompt_tokens"]
                    usage["completion_tokens"] = getattr(retry, "eval_count", None) or usage["completion_tokens"]
            if final_text is None:
                # Hit the iteration cap — force a final answer without tools. Buffered
                # rather than streamed so a leaked tool call can be stripped before the
                # admin sees it; re-chunked below so it still types out.
                capped = ollama.chat(model=LLM_MODEL, messages=convo, options={"num_ctx": num_ctx})
                usage["prompt_tokens"] = getattr(capped, "prompt_eval_count", None) or usage["prompt_tokens"]
                usage["completion_tokens"] = getattr(capped, "eval_count", None) or usage["completion_tokens"]
                final_text = _strip_tool_json(capped.message.content or "").strip()
                if not final_text:
                    final_text = "I wasn't able to put that together. Could you rephrase?"
            for piece in _chunk_text(final_text):
                yield _sse("token", {"delta": piece})
            yield _sse("usage", usage)
            yield _sse("done", {})
            return

        # ── No tools: plain token streaming ──
        response = ollama.chat(model=LLM_MODEL, messages=messages, stream=True, options={"num_ctx": num_ctx})
        for chunk in response:
            content = chunk.message.content
            if content:
                yield _sse("token", {"delta": content})
            if getattr(chunk, "done", False):
                usage["prompt_tokens"] = getattr(chunk, "prompt_eval_count", None)
                usage["completion_tokens"] = getattr(chunk, "eval_count", None)
        yield _sse("usage", usage)
        yield _sse("done", {})
    except Exception as e:
        yield _sse("error", {"message": str(e)})
        yield _sse("done", {})


@app.post("/agent/stream")
async def agent_stream(request: Request):
    """Streaming counterpart of /agent/respond. Emits SSE events: token, usage, done, error."""
    body = await request.json()
    history = body.get("messages", []) or []
    scope = (body.get("scope") or "admin").lower()
    student_email = (body.get("student_email") or "").strip().lower() or None
    running_summary = body.get("running_summary")
    user_email = body.get("user_email")
    jwt = body.get("jwt") if body.get("tools_enabled") else None
    opts = body.get("options") or {}
    num_ctx = int(opts.get("num_ctx", NUM_CTX))
    if not history or history[-1].get("role") != "user":
        return JSONResponse({"error": "messages must be non-empty and end with a user turn"}, status_code=400)
    return StreamingResponse(
        _agent_stream_gen(history, scope, student_email, running_summary, num_ctx, jwt, user_email),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


SUMMARY_SYSTEM = (
    "You maintain a running memory of a conversation. Update the prior summary with the new turns. "
    "Preserve names, IDs, numbers, decisions, preferences, and any unresolved questions. "
    "Be factual and concise (<= 200 words). Output only the updated summary text."
)


@app.post("/agent/summarize")
async def agent_summarize(request: Request):
    """Fold older turns into a running summary so nothing is forgotten once history
    outgrows the context window."""
    body = await request.json()
    msgs = body.get("messages", []) or []
    prior = (body.get("prior_summary") or "").strip()
    if not msgs:
        return JSONResponse({"summary": prior})

    convo_text = "\n".join(f"{m.get('role')}: {m.get('content', '')}" for m in msgs)
    user_prompt = (f"Prior summary:\n{prior}\n\n" if prior else "") + f"New turns:\n{convo_text}\n\nUpdated summary:"
    try:
        response = await asyncio.to_thread(
            ollama.chat,
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            options={"num_ctx": NUM_CTX},
        )
        return JSONResponse({"summary": (response.message.content or "").strip()})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "vector_store": "ready" if current_collection() is not None else "not indexed",
        "model": LLM_MODEL,
        "num_ctx": NUM_CTX,
    }


if __name__ == "__main__":
    # Auto-build knowledge base on startup if CSVs exist but no vector store
    if state["collection"] is None:
        output_dir = os.path.join(_BASE_DIR, "output")
        csv_files = [f for f in os.listdir(output_dir) if f.endswith(".csv")] if os.path.isdir(output_dir) else []
        if csv_files:
            print("Auto-building knowledge base from existing CSVs...")
            try:
                import rag_indexer
                rag_indexer.build_index()
                state["collection"] = get_collection()
                print(f"Knowledge base ready ({len(csv_files)} CSVs indexed)")
            except Exception as e:
                print(f"Auto-index failed (will be available after /ingest or /reindex): {e}")

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
