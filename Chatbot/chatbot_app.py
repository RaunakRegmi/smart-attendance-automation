"""
RAG Chatbot for Smart Campus Management System.

Setup:
    1. ollama pull nomic-embed-text
    2. ollama pull llama3.2          (or change LLM_MODEL below)
    3. python rag_indexer.py         (builds the vector store once)
    4. python chatbot_app.py         (starts the web server)

Then open http://localhost:8000
"""

import json
import os
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
    "You help administrators with questions about student attendance, engagement, risk levels, and performance.\n\n"
    "For greetings or casual messages (e.g. \"hey\", \"hello\", \"how are you\"), respond warmly and briefly, "
    "and let the admin know what you can help with.\n"
    "For data questions, use only the provided context to answer. Be concise and specific.\n"
    "If a data question cannot be answered from the context, say \"I don't have that information.\""
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
    results = coll.query(query_embeddings=[query_embedding], n_results=N_RESULTS)
    return "\n\n---\n\n".join(results["documents"][0])


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
        return "Error: knowledge base not built yet. Please refresh AI knowledge."

    context = retrieve_context(user_message)
    user_content = build_user_content(context, user_message)

    history = await load_history(session_id)
    messages = [{"role": "system", "content": ADMIN_SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_content})

    try:
        response = ollama.chat(model=LLM_MODEL, messages=messages)
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
    """Return (student_name, context) for a specific student."""
    coll = current_collection()
    if coll is None:
        return "", ""
    result = coll.get(ids=[f"student_{student_id}"], include=["documents", "metadatas"])
    if not result["documents"]:
        return "", ""

    student_doc = result["documents"][0]
    student_name = result["metadatas"][0].get("name", "Student")
    student_batch = result["metadatas"][0].get("batch", "")

    # Semantic search limited to batch-level docs for extra context
    resp = ollama.embeddings(model=EMBED_MODEL, prompt=query)
    batch_results = coll.query(
        query_embeddings=[resp["embedding"]],
        n_results=2,
        where={"$and": [{"type": {"$eq": "batch"}}, {"batch": {"$eq": student_batch}}]},
    )
    batch_docs = batch_results["documents"][0] if batch_results["documents"] else []

    context_parts = [student_doc] + batch_docs
    return student_name, "\n\n---\n\n".join(context_parts)


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
    "The student is asking about their own attendance, engagement, risk level, and performance. "
    'Respond in first person (e.g. "Your attendance is..."). Be concise, supportive, and specific. '
    'Only use the provided context. If the answer is not in the context, say "I don\'t have that information. '
    'If the question is a greeting or small talk, respond warmly and briefly, then guide the student to ask about their academic data."'
)


async def stream_student_response(student_id: int, user_message: str, session_id: str = ""):
    if current_collection() is None:
        yield f"data: {json.dumps('Error: Vector store not found. Please run python rag_indexer.py first.')}\n\n"
        yield "data: [DONE]\n\n"
        return

    student_name, context = get_student_context(student_id, user_message)
    if not context:
        yield f"data: {json.dumps('Student ID not found. Please check your ID and try again.')}\n\n"
        yield "data: [DONE]\n\n"
        return

    user_content = build_user_content(context, user_message)

    history = await load_history(session_id)
    system_prompt = STUDENT_SYSTEM_PROMPT_TPL.format(student_name=student_name)
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_content})

    try:
        response = ollama.chat(model=LLM_MODEL, messages=messages, stream=True)
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
        response = ollama.chat(model=LLM_MODEL, messages=messages)
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
        return JSONResponse({"error": "Student not found. Check your email and try again."}, status_code=404)

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
            {"reply": "The AI knowledge base hasn't been built yet. Please ask an administrator to refresh it."}
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
        return JSONResponse({"success": ready, "message": "Knowledge base rebuilt" if ready else "Reindex finished but no collection"})
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
            return JSONResponse({"success": False, "error": "students[] is required"}, status_code=400)

        import csv_builder
        csv_builder.build_csvs(students)

        import rag_indexer
        rag_indexer.build_index()
        state["collection"] = get_collection()
        ready = state["collection"] is not None
        return JSONResponse({
            "success": ready,
            "students_indexed": len(students),
            "message": "Knowledge base rebuilt from live data" if ready else "Reindex finished but no collection",
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "vector_store": "ready" if current_collection() is not None else "not indexed",
        "model": LLM_MODEL,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
