# RAG chatbot service (FastAPI + ChromaDB).
# Reaches Ollama and Redis over the compose network via OLLAMA_HOST / REDIS_URL.
FROM python:3.13-slim

WORKDIR /app

# All pinned deps ship cp313 wheels (pandas bumped to 2.2.3 for py3.13), so no build toolchain is needed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Vector store persists on a named volume (see docker-compose.yml).
ENV CHROMA_DIR=/app/chroma_db

EXPOSE 8000

CMD ["python", "chatbot_app.py"]
