# Discussion — AI Knowledge System Design

## 1. Chatbot Context Awareness

**Q:** Is the chatbot context-aware (remembers conversation history)?

**A:** No. Each API call is stateless — the prompt is built with only the current question + retrieved context. No conversation history, session storage, or messages array is maintained. If you ask "What's John's attendance?" then "What about his risk?", the second question has no memory of the first.

---

## 2. Data Flow: How the AI Gets Knowledge

```
PostgreSQL (Backend DB)
    ↓  Admin uploads Excel / adds data
Admin clicks "Refresh AI Knowledge" (or auto-sync triggers)
    ↓
Backend queries PostgreSQL → builds JSON payload
    ↓  POST /ingest
Chatbot csv_builder.py → writes CSV files
    ↓
Chatbot rag_indexer.py → generates embeddings via Ollama
    ↓
ChromaDB vector store (chroma_db/)
    ↓
Chatbot queries ChromaDB at question time
```

The chatbot queries **ChromaDB**, not PostgreSQL directly.

---

## 3. What Happens on Delete

If data is deleted from PostgreSQL, the ChromaDB vector store **still holds the old embeddings**. The chatbot will continue answering with deleted/stale data until a manual "Refresh AI" is triggered.

**Risks:**
- Privacy violations (GDPR — deleted students still known to AI)
- Misleading answers (references non-existent students or outdated records)
- Trust erosion (dashboard vs chatbot mismatch)

There is **no auto-trigger on delete** currently. The only auto-refresh happens after sheet syncs (`sheetSyncWorker.js:48`).

---

## 4. Reindex Behavior (Current System)

Every refresh does a **full rebuild from scratch**:

1. ChromaDB collection is deleted (`client.delete_collection()`)
2. All CSV files are re-read
3. Embeddings are regenerated via Ollama
4. Everything is re-added to ChromaDB

No incremental update. No merge logic.

---

## 5. Reindex Decision: Full Rebuild vs Incremental

| Factor | Full Rebuild | Incremental Upsert |
|--------|-------------|-------------------|
| Data volume | Fits (hundreds/thousands) | Overkill |
| Change pattern | Batch (sheet syncs) | Row-by-row edits |
| Correctness | ✅ Perfect — no ghost data | ⚠️ Complex edge cases |
| Complexity | Simple | High (track changes, deletes, conflicts) |
| Speed | ~seconds | ~seconds (same at this scale) |

**Verdict:** Full rebuild is the right choice for this system. Simple, correct, and fast enough.

---

## 6. Standard Approaches to AI Knowledge Sync

| Scale | Approach | When to use |
|-------|----------|------------|
| **Small** (<10K docs) | Full rebuild on demand | ✅ This project |
| **Medium** (10K-1M) | Incremental upsert + periodic full rebuild | Chatbots, CMS |
| **Large** (1M+) | CDC pipeline + streaming embeddings | Enterprise search |

ChromaDB supports `collection.upsert()` for incremental updates, but given the batch-oriented nature of attendance data, full rebuild is simpler and more reliable.

---

## 7. Improvement Needed

Add an **auto-reindex trigger** on data deletion endpoints (Sequelize hook or webhook) so the chatbot stays consistent without requiring manual "Refresh AI" clicks.

---

## 8. Conversation Context Awareness

**Q:** Can we make the chatbot remember conversation history?

**A:** Yes. Each call to Ollama can include a `messages` array (system + user + assistant turns) instead of a single user prompt. The chatbot currently sends a single prompt — adding history is straightforward.

### Where to store context

| Storage | Survives restart? | Complexity |
|---------|------------------|------------|
| In-memory dict | ❌ Lost | Trivial |
| Redis (already in stack) | ✅ Persists | Low |
| PostgreSQL | ✅ Persists | Medium |

**Redis is the right choice** — it's already running in the Docker stack (port 6379), has built-in TTL expiry, and survives chatbot restarts.

### Implementation approach

- Use `redis-py` to store `session_id → messages[]` as JSON
- Each chat endpoint accepts a `session_id` parameter (from client)
- On every request, load previous messages from Redis, append new Q&A, send full history to Ollama
- Set TTL (e.g. 3600s) so stale conversations auto-cleanup

### Complexity

- **Software:** ~30-40 lines of new code, zero existing code changed
- **Hardware:** None — uses existing Redis in Docker
- **Memory:** ~5-10 KB per conversation session. 1000 concurrent sessions = ~10 MB. Negligible.
- **LLM constraint:** llama3.2 has 128K token context window. A sliding window of last ~10 exchanges is more than enough.

### Is it worth it?

Nice-to-have, not critical. Attendance queries are mostly self-contained ("What's John's attendance?"). The main benefit is multi-turn flows like *"Show at-risk students"* → *"Which batch has the most?"* → *"Notify their advisors."*

### Risk if using in-memory (without Redis)

If the chatbot process restarts, all in-memory conversation history is lost — users lose context mid-conversation.
