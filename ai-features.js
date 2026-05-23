/**
 * VChat AI & PWA helpers
 * ─────────────────────────────────────────────────────────────
 * Ключ НЕ храните в этом файле — Cursor/Git заблокируют.
 *
 * Способ 1 (рекомендуется): Профиль → AI → вставить ключ → «Сохранить»
 * Способ 2: ai-config.local.js (см. ai-config.local.example.js, в .gitignore)
 */
const VCHAT_AI_CONFIG = {
  defaultProvider: 'gemini',
  geminiModel: 'gemini-2.0-flash-lite',
  openaiModel: 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',
};

const VCHAT_AI_STORAGE = {
  provider: 'vchat_ai_provider',
  apiKey: 'vchat_ai_api_key',
};

(function initVChatAIPWA() {
  const SPEECH_LOCALE = {
    en: 'en-US', ru: 'ru-RU', ru_slang: 'ru-RU', uz: 'uz-UZ', es: 'es-ES',
    fr: 'fr-FR', de: 'de-DE', it: 'it-IT', zh: 'zh-CN',
  };

  let speechRecognition = null;
  let isListening = false;

  function getLocalAIConfig() {
    return window.VCHAT_AI_LOCAL_CONFIG || null;
  }

  function getProvider() {
    return (
      localStorage.getItem(VCHAT_AI_STORAGE.provider) ||
      getLocalAIConfig()?.provider ||
      VCHAT_AI_CONFIG.defaultProvider ||
      'gemini'
    );
  }

  function getApiKey() {
    return (
      localStorage.getItem(VCHAT_AI_STORAGE.apiKey) ||
      getLocalAIConfig()?.apiKey ||
      ''
    ).trim();
  }

  function maskApiKey(key) {
    if (!key || key.length < 8) return '';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }

  async function callGemini(apiKey, systemPrompt, userPrompt) {
    const model =
      getLocalAIConfig()?.geminiModel ||
      VCHAT_AI_CONFIG.geminiModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Gemini HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  async function callOpenAI(apiKey, systemPrompt, userPrompt) {
    const model =
      getLocalAIConfig()?.openaiModel ||
      VCHAT_AI_CONFIG.openaiModel;
    const res = await fetch(`${VCHAT_AI_CONFIG.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `OpenAI HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  function aiT(key) {
    return typeof t === 'function' ? t(key) : key;
  }

  function collectRecentMessages(limit = 10) {
    const entries = Object.entries(typeof loadedMessagesMap !== 'undefined' ? loadedMessagesMap : {})
      .map(([key, m]) => ({ key, ...m }))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return entries.slice(-limit);
  }

  function formatMessagesForAI(messages) {
    return messages
      .map((m) => {
        const author = m.sid === activeUserId ? aiT('you') : (m.snick || aiT('default_user'));
        const body = [m.txt, m.code ? `[code] ${m.code}` : '', m.img ? '[image]' : ''].filter(Boolean).join(' ');
        return `${author}: ${body}`;
      })
      .join('\n');
  }

  function getLastIncomingMessage() {
    const msgs = collectRecentMessages(30);
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sid !== activeUserId) return msgs[i];
    }
    return null;
  }

  async function callVChatAI(systemPrompt, userPrompt) {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const provider = getProvider();
    if (provider === 'openai') return callOpenAI(apiKey, systemPrompt, userPrompt);
    return callGemini(apiKey, systemPrompt, userPrompt);
  }

  function fallbackSummary(messages) {
    if (!messages.length) return aiT('ai_summary_empty');
    const lines = messages.map((m) => {
      const who = m.sid === activeUserId ? aiT('you') : m.snick;
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

  function parseJsonArray(raw) {
    try {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) return JSON.parse(m[0]);
    } catch (_) { /* ignore */ }
    return null;
  }

  window.executeAISummary = async function executeAISummary() {
    if (!currentActiveChat) return showToast(aiT('select_chat'));

    const modal = document.getElementById('aiSummaryModal');
    const body = document.getElementById('aiSummaryBody');
    modal.style.display = 'flex';
    body.innerHTML = `<div class="ai-loading"><span class="ai-spinner"></span> ${aiT('ai_summary_loading')}</div>`;

    const messages = collectRecentMessages(10);
    if (!messages.length) {
      body.textContent = aiT('ai_summary_empty');
      return;
    }

    const transcript = formatMessagesForAI(messages);
    const langHint = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ru';

    try {
      let summary = null;
      if (getApiKey()) {
        summary = await callVChatAI(
          `You summarize chat conversations briefly in 3-5 bullet points. Reply in the user's app language (${langHint}). Be concise.`,
          `Summarize this chat (last ${messages.length} messages):\n\n${transcript}`
        );
      }
      if (!summary) {
        if (!getApiKey()) {
          body.innerHTML = `<p>${fallbackSummary(messages)}</p><p class="ai-hint">${aiT('ai_no_api')}</p>`;
        } else {
          body.textContent = fallbackSummary(messages);
        }
      } else {
        body.textContent = summary;
      }
    } catch (e) {
      body.innerHTML = `<p class="ai-error">${aiT('ai_error')}: ${e.message}</p><p>${fallbackSummary(messages)}</p>`;
    }
  };

  window.refreshSmartReplies = async function refreshSmartReplies() {
    const bar = document.getElementById('smartRepliesBar');
    if (!bar) return;

    if (!currentActiveChat || currentActiveChat.type === 'SAVED') {
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
      if (getApiKey()) {
        const raw = await callVChatAI(
          `Generate exactly 3 short reply suggestions for a chat app. Return ONLY a JSON array of 3 strings, no markdown. Language: ${langHint}. Max 60 chars each.`,
          `Reply to this message:\n"${lastIncoming.txt || aiT('attachment')}"\nFrom: ${lastIncoming.snick || 'User'}`
        );
        replies = parseJsonArray(raw) || [];
      }
    } catch (_) { /* fallback below */ }

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
    if (btn) btn.style.display = currentActiveChat ? 'inline-flex' : 'none';
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

  window.loadAISettingsUI = function loadAISettingsUI() {
    const providerEl = document.getElementById('aiProviderSelect');
    const keyEl = document.getElementById('aiApiKeyInp');
    const statusEl = document.getElementById('aiKeyStatus');
    if (!providerEl || !keyEl) return;

    providerEl.value = getProvider();
    const saved = getApiKey();
    keyEl.value = '';
    keyEl.placeholder = saved
      ? `${aiT('ai_key_saved_mask')} ${maskApiKey(saved)}`
      : aiT('ai_key_placeholder');

    if (statusEl) {
      statusEl.textContent = saved
        ? `${aiT('ai_key_active')} (${getProvider() === 'gemini' ? 'Gemini' : 'OpenAI'})`
        : aiT('ai_key_missing');
      statusEl.style.color = saved ? 'var(--success)' : 'var(--warning)';
    }
  };

  window.saveAISettings = function saveAISettings() {
    const providerEl = document.getElementById('aiProviderSelect');
    const keyEl = document.getElementById('aiApiKeyInp');
    if (!providerEl) return;

    localStorage.setItem(VCHAT_AI_STORAGE.provider, providerEl.value);
    const newKey = (keyEl?.value || '').trim();
    if (newKey) localStorage.setItem(VCHAT_AI_STORAGE.apiKey, newKey);

    showToast(aiT('ai_key_saved_toast'));
    loadAISettingsUI();
    if (currentActiveChat && typeof refreshSmartReplies === 'function') refreshSmartReplies();
  };

  window.clearAISettings = function clearAISettings() {
    if (!confirm(aiT('ai_key_clear_confirm'))) return;
    localStorage.removeItem(VCHAT_AI_STORAGE.apiKey);
    showToast(aiT('ai_key_cleared'));
    loadAISettingsUI();
  };

  function bootAIFeatures() {
    initVoiceInput();
    registerServiceWorker();
    updateSummaryButtonVisibility();
    loadAISettingsUI();
  }

  window.updateSummaryButtonVisibility = updateSummaryButtonVisibility;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAIFeatures);
  } else {
    bootAIFeatures();
  }
})();
