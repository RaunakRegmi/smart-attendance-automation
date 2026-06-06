/**
 * Debounced knowledge-base refresh for the RAG chatbot.
 *
 * Fires a single /ingest call after a quiet window (DEBOUNCE_MS)
 * following any data change.  Successive changes reset the timer so
 * bulk operations (Excel upload, sheet sync, etc.) produce exactly
 * one rebuild.
 *
 * Uses lazy require for chatbotController to avoid circular deps
 * (models → service → controller → models).
 *
 * Usage:
 *   const refresh = require('./services/knowledgeRefreshService');
 *   refresh.trigger();   // fire-and-forget, debounced
 */

const DEBOUNCE_MS = parseInt(process.env.KNOWLEDGE_REFRESH_DEBOUNCE_MS || '3000', 10);
const ENABLED = process.env.AUTO_REFRESH_KNOWLEDGE !== 'false';

let timer = null;
let pending = false;

async function doRefresh() {
  if (pending) {
    console.log('[knowledgeRefresh] Skipping — refresh already in progress');
    return;
  }
  pending = true;
  try {
    // Lazy require to break circular dep: model → service → controller → model
    const chatbotController = require('../controllers/chatbotController');
    const result = await chatbotController.refreshInternal();
    if (result.success) {
      console.log(`[knowledgeRefresh] OK — ${result.students} students, ${result.notificationsCreated} notifications`);
    } else {
      console.warn(`[knowledgeRefresh] Skipped — ${result.reason || result.message || 'unknown'}`);
    }
  } catch (err) {
    console.error('[knowledgeRefresh] Error:', err.message);
  } finally {
    pending = false;
  }
}

function trigger() {
  if (!ENABLED) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(doRefresh, DEBOUNCE_MS);
}

module.exports = { trigger };
