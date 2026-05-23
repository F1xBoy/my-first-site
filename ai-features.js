/**
 * VChat AI (frontend) — BYOK (Bring Your Own Key) модель.
 */

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

  async function callAI(payload) {
    const provider = localStorage.getItem('vchat_ai_provider') || 'gemini';
    const apiKey = localStorage.getItem('vchat_ai_key');
    
    if (!apiKey) {
        throw new Error(aiT('ai_key_missing'));
    }

    const sysPrompt = payload.system;
    const userPrompt = payload.prompt;

    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const body = {
            contents: [{ role: "user", parts: [{ text: `SYSTEM: ${sysPrompt}\n\nUSER: ${userPrompt}` }] }],
            generationConfig: { temperature: 0.7 }
        };
        const res = await fetch(url, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(body) 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Gemini API Error");
        return { result: data.candidates?.[0]?.content?.parts?.[0]?.text || "" };
    } else {
        const url = `https://api.openai.com/v1/chat/completions`;
        const body = {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: sysPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
        };
        const res = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, 
            body: JSON.stringify(body) 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "OpenAI API Error");
        return { result: data.choices?.[0]?.message?.content || "" };
    }
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

  function parseSmartRepliesResult(resultString) {
    try {
      const m = String(resultString).match(/\[[\s\S]*\]/);
      if (m) {
          const arr = JSON.parse(m[0]);
          if(Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch (_) { /* ignore */ }
    return [];
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
      const data = await callAI({
        system: `You summarize chat conversations briefly in 3-5 bullet points. Reply in the user's app language (${langHint}). Be concise.`,
        prompt: `Summarize this chat (last ${messages.length} messages):\n\n${transcript}`
      });

      body.textContent = data.result || fallbackSummary(messages);
    } catch (e) {
      body.innerHTML = `<p class="ai-error">⚠️ ${aiT('ai_error')}: ${escapeHTML(e.message)}</p><p>${fallbackSummary(messages)}</p>`;
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

    if (!localStorage.getItem('vchat_ai_key')) {
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
      const data = await callAI({
        system: `Generate exactly 3 short reply suggestions for a chat app. Return ONLY a valid JSON array of strings: ["reply1", "reply2", "reply3"]. Language: ${langHint}. Max 40 chars each.`,
        prompt: `Reply to this message:\n"${lastIncoming.txt || aiT('attachment')}"\nFrom: ${lastIncoming.snick || 'User'}`
      });
      replies = parseSmartRepliesResult(data.result);
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
      navigator.serviceWorker.register('./service-worker.js').then(reg => {
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (typeof window.showUpdateNotification === 'function') {
                  window.showUpdateNotification();
                }
              }
            };
          }
        };
      }).catch(() => {});
    });
  }

  // Ядерная кнопка апдейта
  window.updateApp = function updateApp() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
        caches.keys().then(names => {
          for (let name of names) caches.delete(name);
          window.location.reload(true);
        });
      });
    } else {
      window.location.reload(true);
    }
  };

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAIFeatures);
  } else {
    bootAIFeatures();
  }
})();