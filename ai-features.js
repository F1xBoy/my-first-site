/**
 * VChat AI (frontend) — все запросы идут на ваш backend proxy.
 *
 * Настройте URL сервера:
 *   window.VCHAT_API_BASE_URL = 'http://localhost:3001';
 * или в этом файле: VCHAT_API_CONFIG.baseUrl
 *
 * Эндпоинт: POST {baseUrl}/api/chat
 * Секретный ключ AI хранится только на сервере.
 */
const VCHAT_API_CONFIG = {
  /** Origin вашего Node-сервера (без слэша в конце). Пустая строка = тот же хост, что и фронт. */
  baseUrl: 'http://localhost:3001',
  chatPath: '/api/chat',
};

(function initVChatAIPWA() {
  const SPEECH_LOCALE = {
    en: 'en-US', ru: 'ru-RU', ru_slang: 'ru-RU', uz: 'uz-UZ', es: 'es-ES',
    fr: 'fr-FR', de: 'de-DE', it: 'it-IT', zh: 'zh-CN',
  };

  let speechRecognition = null;
  let isListening = false;

  function aiT(key) {
    return typeof t === 'function' ? t(key) : key;
  }

  function appUserId() {
    return typeof activeUserId !== 'undefined' ? activeUserId : '';
  }

  function appActiveChat() {
    return typeof currentActiveChat !== 'undefined' ? currentActiveChat : null;
  }

  function getApiBaseUrl() {
    const override = (typeof window !== 'undefined' && window.VCHAT_API_BASE_URL) || '';
    const base = (override || VCHAT_API_CONFIG.baseUrl || '').trim();
    return base.replace(/\/$/, '');
  }

  function getChatApiUrl() {
    const base = getApiBaseUrl();
    const path = VCHAT_API_CONFIG.chatPath || '/api/chat';
    return base ? `${base}${path}` : path;
  }

  async function getProxyAuthHeaders() {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (typeof appAuth !== 'undefined' && appAuth.currentUser) {
      try {
        const token = await appAuth.currentUser.getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch (_) { /* optional */ }
    }
    return headers;
  }

  /**
   * @param {{ action: 'summary'|'smart_replies', system: string, prompt: string, language?: string, messages?: Array<{author:string,text:string,role?:string}>, meta?: object }} payload
   * @returns {Promise<{ ok: boolean, result?: string|string[], error?: string }>}
   */
  async function callVChatBackend(payload) {
    const url = getChatApiUrl();
    const res = await fetch(url, {
      method: 'POST',
      headers: await getProxyAuthHeaders(),
      body: JSON.stringify({
        ...payload,
        language: payload.language || (typeof currentLanguage !== 'undefined' ? currentLanguage : 'en'),
        meta: {
          userId: appUserId() || null,
          chatId: appActiveChat()?.id || null,
          chatType: appActiveChat()?.type || null,
          ...(payload.meta || {}),
        },
      }),
    });

    let data = null;
    const raw = await res.text();
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(raw || `HTTP ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  function collectRecentMessages(limit = 10) {
    const map = typeof loadedMessagesMap !== 'undefined' ? loadedMessagesMap : {};
    return Object.entries(map)
      .map(([key, m]) => ({ key, ...m }))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      .slice(-limit);
  }

  function formatMessagesForAI(messages) {
    return messages
      .map((m) => {
        const author = m.sid === appUserId() ? aiT('you') : (m.snick || aiT('default_user'));
        const body = [m.txt, m.code ? `[code] ${m.code}` : '', m.img ? '[image]' : ''].filter(Boolean).join(' ');
        return `${author}: ${body}`;
      })
      .join('\n');
  }

  function messagesToPayload(messages) {
    return messages.map((m) => ({
      author: m.sid === appUserId() ? aiT('you') : (m.snick || aiT('default_user')),
      text: [m.txt, m.code ? `[code] ${m.code}` : '', m.img ? '[image]' : ''].filter(Boolean).join(' ').trim(),
      role: m.sid === appUserId() ? 'user' : 'other',
    }));
  }

  function getLastIncomingMessage() {
    const msgs = collectRecentMessages(30);
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sid !== appUserId()) return msgs[i];
    }
    return null;
  }

  function fallbackSummary(messages) {
    if (!messages.length) return aiT('ai_summary_empty');
    const lines = messages.map((m) => {
      const who = m.sid === appUserId() ? aiT('you') : m.snick;
      return `• ${who}: ${(m.txt || '').slice(0, 80)}`;
    });
    return `${aiT('ai_summary_fallback_title')}\n\n${lines.join('\n')}`;
  }

  function fallbackSmartReplies(lastMsg) {
    const text = (lastMsg?.txt || '').toLowerCase();
    if (/привет|hello|hi|hey|salom|hola/.test(text)) {
      return [aiT('ai_reply_hi_1'), aiT('ai_reply_hi_2'), aiT('ai_reply_hi_3')];
    }
    if (/\?/.test(lastMsg?.txt || '')) {
      return [aiT('ai_reply_q_1'), aiT('ai_reply_q_2'), aiT('ai_reply_q_3')];
    }
    return [aiT('ai_reply_gen_1'), aiT('ai_reply_gen_2'), aiT('ai_reply_gen_3')];
  }

  function parseSmartRepliesResult(data) {
    if (Array.isArray(data.replies)) return data.replies;
    if (Array.isArray(data.result)) return data.result;
    if (typeof data.result === 'string') return parseJsonArray(data.result) || [];
    return [];
  }

  function parseJsonArray(raw) {
    try {
      const m = String(raw).match(/\[[\s\S]*\]/);
      if (m) return JSON.parse(m[0]);
    } catch (_) { /* ignore */ }
    return null;
  }

  window.executeAISummary = async function executeAISummary() {
    if (!appActiveChat()) return showToast(aiT('select_chat'));

    const modal = document.getElementById('aiSummaryModal');
    const body = document.getElementById('aiSummaryBody');
    if (typeof openModal === 'function') openModal('aiSummaryModal');
    else modal.style.display = 'flex';
    body.innerHTML = `<div class="ai-loading"><span class="ai-spinner"></span> ${aiT('ai_summary_loading')}</div>`;

    const messages = collectRecentMessages(10);
    if (!messages.length) {
      body.textContent = aiT('ai_summary_empty');
      return;
    }

    const transcript = formatMessagesForAI(messages);
    const langHint = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ru';

    try {
      const data = await callVChatBackend({
        action: 'summary',
        system: `You summarize chat conversations briefly in 3-5 bullet points. Reply in the user's app language (${langHint}). Be concise.`,
        prompt: `Summarize this chat (last ${messages.length} messages):\n\n${transcript}`,
        language: langHint,
        messages: messagesToPayload(messages),
      });

      const summary = typeof data.result === 'string' ? data.result : (data.text || data.content || '');
      body.textContent = summary || fallbackSummary(messages);
    } catch (e) {
      const isNetwork = e.message === 'Failed to fetch' || e.name === 'TypeError';
      body.innerHTML = `<p class="ai-error">${aiT('ai_error')}: ${escapeHTML(e.message)}</p><p>${fallbackSummary(messages)}</p>` +
        (isNetwork ? `<p class="ai-hint">${aiT('ai_backend_offline')}</p>` : '');
    }
  };

  window.refreshSmartReplies = async function refreshSmartReplies() {
    const bar = document.getElementById('smartRepliesBar');
    if (!bar) return;

    const chat = appActiveChat();
    if (!chat || chat.type === 'SAVED') {
      bar.classList.add('hidden');
      return;
    }

    const lastIncoming = getLastIncomingMessage();
    if (!lastIncoming) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    const buttons = bar.querySelectorAll('.smart-reply-chip');
    buttons.forEach((btn) => {
      btn.disabled = true;
      btn.textContent = '…';
    });

    let replies = [];
    const langHint = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ru';

    try {
      const data = await callVChatBackend({
        action: 'smart_replies',
        system: `Generate exactly 3 short reply suggestions for a chat app. Return JSON: { "replies": ["...", "...", "..."] }. Language: ${langHint}. Max 60 chars each.`,
        prompt: `Reply to this message:\n"${lastIncoming.txt || aiT('attachment')}"\nFrom: ${lastIncoming.snick || 'User'}`,
        language: langHint,
      });
      replies = parseSmartRepliesResult(data);
      if (replies.length < 3 && typeof data.result === 'string') {
        replies = parseJsonArray(data.result) || replies;
      }
    } catch (_) { /* fallback */ }

    if (replies.length < 3) replies = fallbackSmartReplies(lastIncoming);

    buttons.forEach((btn, i) => {
      btn.disabled = false;
      btn.textContent = replies[i] || '—';
      btn.onclick = () => {
        const input = document.getElementById('messageInputEngine');
        input.value = replies[i];
        input.focus();
      };
    });
  };

  function updateSummaryButtonVisibility() {
    const btn = document.getElementById('aiSummaryBtn');
    const chat = appActiveChat();
    if (btn) btn.style.display = chat ? 'inline-flex' : 'none';
  }

  function escapeHTML(str) {
    return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  }

  window.initVoiceInput = function initVoiceInput() {
    const btn = document.getElementById('voiceInputBtn');
    const input = document.getElementById('messageInputEngine');
    if (!btn || !input) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.title = aiT('voice_unsupported');
      btn.disabled = true;
      return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = true;

    btn.addEventListener('click', () => {
      if (isListening) {
        speechRecognition.stop();
        return;
      }
      const locale = SPEECH_LOCALE[typeof currentLanguage !== 'undefined' ? currentLanguage : 'en'] || 'en-US';
      speechRecognition.lang = locale;
      speechRecognition.start();
    });

    speechRecognition.onstart = () => {
      isListening = true;
      btn.classList.add('listening');
      btn.title = aiT('voice_listening');
      showToast(aiT('voice_listening'));
    };

    speechRecognition.onend = () => {
      isListening = false;
      btn.classList.remove('listening');
      btn.title = aiT('voice_input');
    };

    speechRecognition.onerror = () => {
      isListening = false;
      btn.classList.remove('listening');
      showToast(aiT('voice_error'));
    };

    speechRecognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        const sep = input.value && !input.value.endsWith(' ') ? ' ' : '';
        input.value += sep + transcript.trim();
        input.dispatchEvent(new Event('input'));
      }
    };
  };

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }

  window.resetAIFeaturesUI = function resetAIFeaturesUI() {
    const bar = document.getElementById('smartRepliesBar');
    if (bar) bar.classList.add('hidden');
    updateSummaryButtonVisibility();
  };

  const origReset = window.resetChatWindow;
  if (typeof origReset === 'function') {
    window.resetChatWindow = function (...args) {
      origReset.apply(this, args);
      resetAIFeaturesUI();
    };
  }

  function bootAIFeatures() {
    initVoiceInput();
    registerServiceWorker();
    updateSummaryButtonVisibility();
  }

  window.updateSummaryButtonVisibility = updateSummaryButtonVisibility;
  window.VCHAT_getChatApiUrl = getChatApiUrl;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAIFeatures);
  } else {
    bootAIFeatures();
  }
})();
