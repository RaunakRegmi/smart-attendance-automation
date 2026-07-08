// Durable, per-user chat memory + orchestration.
//
// The backend owns the transcript (Postgres) and is the single source of truth;
// the Python chatbot is a stateless inference/RAG engine. Each turn we persist the
// user message, send a budget-trimmed history (+ running summary) to the chatbot,
// then persist the assistant reply with token counts. The full transcript is never
// deleted, so the conversation survives tab switches / reloads / new devices and the
// model never "forgets" — older turns it can't fit are folded into runningSummary.

const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Student = require('../models/Student');
const User = require('../models/User');

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://host.docker.internal:8000';
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX || 8192);
// Char budget for history sent to the model (≈ NUM_CTX*4 minus room for system+RAG+reply).
const HISTORY_CHAR_BUDGET = Number(process.env.CHAT_HISTORY_CHAR_BUDGET || 12000);
const KEEP_RECENT = Number(process.env.CHAT_KEEP_RECENT || 12);
const SUMMARY_TRIGGER = Number(process.env.CHAT_SUMMARY_TRIGGER || 16);

async function getOrCreateActiveConversation(userId, scope) {
  let conv = await Conversation.findOne({
    where: { userId, scope, isActive: true },
    order: [['updatedAt', 'DESC']],
  });
  if (!conv) {
    conv = await Conversation.create({ userId, scope, isActive: true });
  }
  return conv;
}

function serializeMessage(m) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    toolName: m.toolName,
    toolArgs: m.toolArgs,
    toolResult: m.toolResult,
    promptTokens: m.promptTokens,
    completionTokens: m.completionTokens,
    createdAt: m.createdAt,
  };
}

async function resolveStudentEmail(userId) {
  const s = await Student.findOne({ where: { userId } });
  return s ? (s.email || '').trim().toLowerCase() : null;
}

async function resolveUserEmail(userId) {
  const u = await User.findByPk(userId, { attributes: ['email'] });
  return u ? u.email : null;
}

// Build the budget-trimmed message list (oldest→newest) for the model. Messages
// already folded into runningSummary (id <= summarizedThroughId) are skipped.
function packMessages(allMessages, summarizedThroughId) {
  const kept = [];
  let chars = 0;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const m = allMessages[i];
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (summarizedThroughId && m.id <= summarizedThroughId) break;
    const c = (m.content || '').length;
    if (chars + c > HISTORY_CHAR_BUDGET && kept.length > 0) break;
    kept.push({ role: m.role, content: m.content || '' });
    chars += c;
  }
  kept.reverse();
  return kept;
}

// ── SSE helpers ──────────────────────────────────────────────────────────────
function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
}

function parseSseFrame(frame) {
  let event = null;
  let dataStr = '';
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
  }
  let data = null;
  if (dataStr) {
    try { data = JSON.parse(dataStr); } catch { data = null; }
  }
  return { event, data };
}

// ── GET conversation + history (restore on load) ─────────────────────────────
async function getConversation(req, res, scope) {
  try {
    const conv = await getOrCreateActiveConversation(req.user.id, scope);
    const messages = await ChatMessage.findAll({
      where: { conversationId: conv.id },
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    res.json({
      success: true,
      data: {
        conversation: {
          id: conv.id,
          scope: conv.scope,
          title: conv.title,
          runningSummary: conv.runningSummary,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        },
        messages: messages.map(serializeMessage),
      },
    });
  } catch (err) {
    console.error('getConversation failed:', err);
    res.status(500).json({ success: false, message: 'Failed to load conversation' });
  }
}

// ── GET context-window stats (token meter + memory state) ───────────────────
async function getContext(req, res, scope) {
  try {
    const conv = await getOrCreateActiveConversation(req.user.id, scope);
    const messageCount = await ChatMessage.count({ where: { conversationId: conv.id } });
    const lastAssistant = await ChatMessage.findOne({
      where: { conversationId: conv.id, role: 'assistant' },
      order: [['id', 'DESC']],
    });
    const promptTokens = lastAssistant?.promptTokens ?? 0;
    const completionTokens = lastAssistant?.completionTokens ?? 0;
    const total = promptTokens + completionTokens;
    res.json({
      success: true,
      data: {
        numCtx: NUM_CTX,
        used: { promptTokens, completionTokens, total },
        percentUsed: NUM_CTX > 0 ? Math.round((total / NUM_CTX) * 1000) / 10 : 0,
        messageCount,
        summarized: !!conv.runningSummary,
        runningSummary: conv.runningSummary || null,
      },
    });
  } catch (err) {
    console.error('getContext failed:', err);
    res.status(500).json({ success: false, message: 'Failed to load context stats' });
  }
}

// ── DELETE conversation (soft archive; transcript retained for the "forever" guarantee) ──
async function clearConversation(req, res, scope) {
  try {
    const conv = await getOrCreateActiveConversation(req.user.id, scope);
    conv.isActive = false;
    await conv.save();
    res.json({ success: true });
  } catch (err) {
    console.error('clearConversation failed:', err);
    res.status(500).json({ success: false, message: 'Failed to clear conversation' });
  }
}

// ── POST chat — persist, call chatbot with history, persist reply ────────────
async function chat(req, res, scope) {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const text = message.trim();

    let studentEmail = null;
    if (scope === 'STUDENT') {
      studentEmail = await resolveStudentEmail(req.user.id);
      if (!studentEmail) {
        return res.status(404).json({ success: false, message: 'Student profile/email not found' });
      }
    }

    const conv = await getOrCreateActiveConversation(req.user.id, scope);

    // Persist the user message first so a mid-call crash still records the question.
    await ChatMessage.create({ conversationId: conv.id, role: 'user', content: text });
    if (!conv.title) {
      conv.title = text.slice(0, 60);
      await conv.save();
    }

    const all = await ChatMessage.findAll({
      where: { conversationId: conv.id },
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    const packed = packMessages(all, conv.summarizedThroughId);

    const payload = {
      messages: packed,
      scope: scope.toLowerCase(),
      running_summary: conv.runningSummary || null,
      options: { num_ctx: NUM_CTX },
    };
    if (scope === 'STUDENT') payload.student_email = studentEmail;
  payload.tools_enabled = true;
  payload.jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  payload.user_email = scope === 'STUDENT' ? studentEmail : await resolveUserEmail(req.user.id);

    const resp = await fetch(`${CHATBOT_URL}/agent/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => { throw new Error(`Chatbot unreachable: ${err.message}`); });

    if (!resp.ok) {
      const b = await resp.json().catch(() => ({}));
      return res.status(502).json({ success: false, message: b.error || `Chatbot returned ${resp.status}` });
    }
    const body = await resp.json();
    const reply = body.reply || '';
    const usage = body.usage || {};

    await ChatMessage.create({
      conversationId: conv.id,
      role: 'assistant',
      content: reply,
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
    });

    res.json({
      success: true,
      reply,
      usage: {
        prompt_tokens: usage.prompt_tokens ?? null,
        completion_tokens: usage.completion_tokens ?? null,
        num_ctx: usage.num_ctx ?? NUM_CTX,
      },
    });

    // Fold overflow into the running summary (best-effort, after responding).
    compactIfNeeded(conv.id).catch((e) => console.warn('compact failed:', e.message));
  } catch (err) {
    console.error('chat failed:', err);
    res.status(503).json({ success: false, message: err.message || 'Chatbot service unreachable' });
  }
}

// ── POST chat/stream — same as chat() but streams the reply token-by-token (SSE) ──
async function chatStream(req, res, scope) {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }
  const text = message.trim();

  let studentEmail = null;
  if (scope === 'STUDENT') {
    studentEmail = await resolveStudentEmail(req.user.id);
    if (!studentEmail) {
      return res.status(404).json({ success: false, message: 'Student profile/email not found' });
    }
  }

  const conv = await getOrCreateActiveConversation(req.user.id, scope);
  await ChatMessage.create({ conversationId: conv.id, role: 'user', content: text });
  if (!conv.title) {
    conv.title = text.slice(0, 60);
    await conv.save();
  }

  const all = await ChatMessage.findAll({
    where: { conversationId: conv.id },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });
  const packed = packMessages(all, conv.summarizedThroughId);
  const payload = {
    messages: packed,
    scope: scope.toLowerCase(),
    running_summary: conv.runningSummary || null,
    options: { num_ctx: NUM_CTX },
  };
  if (scope === 'STUDENT') payload.student_email = studentEmail;
  payload.tools_enabled = true;
  payload.jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  payload.user_email = scope === 'STUDENT' ? studentEmail : await resolveUserEmail(req.user.id);

  // SSE response headers (no-transform + X-Accel-Buffering defeat any proxy buffering).
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const ac = new AbortController();
  let assistantText = '';
  let usage = {};
  const toolRows = [];
  const argsByName = {};
  let clientGone = false;
  req.on('close', () => { clientGone = true; ac.abort(); });

  try {
    const upstream = await fetch(`${CHATBOT_URL}/agent/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    if (!upstream.ok || !upstream.body) {
      res.write(sseEvent('error', { message: `Chatbot returned ${upstream.status}` }));
    } else {
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const { event, data } = parseSseFrame(frame);
          if (!event || clientGone) continue;
          if (event === 'token' && data && data.delta) {
            assistantText += data.delta;
            res.write(sseEvent('token', { delta: data.delta }));
          } else if (event === 'tool_call') {
            if (data && data.name) argsByName[data.name] = data.args ?? null;
            res.write(sseEvent('tool_call', data || {}));
          } else if (event === 'tool_result') {
            if (data && data.name) {
              toolRows.push({ toolName: data.name, toolArgs: argsByName[data.name] ?? null, toolResult: data.result ?? null });
            }
            res.write(sseEvent('tool_result', data || {}));
          } else if (event === 'usage') {
            usage = data || {};
            res.write(sseEvent('usage', usage));
          } else if (event === 'error') {
            res.write(sseEvent('error', data || {}));
          }
        }
      }
    }
  } catch (err) {
    if (!clientGone) res.write(sseEvent('error', { message: 'Chatbot stream failed' }));
  }

  // Persist tool calls (for the trace) then the assistant text (full or partial).
  try {
    for (const t of toolRows) {
      await ChatMessage.create({
        conversationId: conv.id,
        role: 'tool',
        content: null,
        toolName: t.toolName,
        toolArgs: t.toolArgs,
        toolResult: t.toolResult,
      });
    }
    if (assistantText) {
      await ChatMessage.create({
        conversationId: conv.id,
        role: 'assistant',
        content: assistantText,
        promptTokens: usage.prompt_tokens ?? null,
        completionTokens: usage.completion_tokens ?? null,
      });
    }
  } catch (e) {
    console.warn('persist assistant (stream) failed:', e.message);
  }

  if (!clientGone) {
    res.write(sseEvent('done', { conversationId: conv.id }));
    res.end();
  }
  compactIfNeeded(conv.id).catch((e) => console.warn('compact failed:', e.message));
}

// Fold older, un-summarized turns into runningSummary so nothing is forgotten
// once history outgrows the context window. Idempotent via summarizedThroughId.
async function compactIfNeeded(conversationId) {
  const conv = await Conversation.findByPk(conversationId);
  if (!conv) return;
  const all = await ChatMessage.findAll({
    where: { conversationId },
    order: [['id', 'ASC']],
  });
  if (all.length <= KEEP_RECENT + SUMMARY_TRIGGER) return;

  const cutoff = all.length - KEEP_RECENT;
  const candidates = all
    .slice(0, cutoff)
    .filter((m) => (m.role === 'user' || m.role === 'assistant'))
    .filter((m) => !conv.summarizedThroughId || m.id > conv.summarizedThroughId);
  if (candidates.length < SUMMARY_TRIGGER) return;

  const resp = await fetch(`${CHATBOT_URL}/agent/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: candidates.map((m) => ({ role: m.role, content: m.content || '' })),
      prior_summary: conv.runningSummary || null,
    }),
  });
  if (!resp.ok) return;
  const { summary } = await resp.json();
  if (!summary) return;
  conv.runningSummary = summary;
  conv.summarizedThroughId = candidates[candidates.length - 1].id;
  await conv.save();
}

module.exports = {
  getOrCreateActiveConversation,
  getConversation,
  getContext,
  clearConversation,
  chat,
  chatStream,
};
