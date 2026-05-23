/**
 * VChat AI Backend Proxy (пример)
 * Запуск: GEMINI_API_KEY=your_key node server/index.js
 *
 * POST /api/chat
 * Body: { action, system, prompt, language?, messages?, meta? }
 * Response: { ok: true, result: string | string[] }
 */

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function callGemini(system, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(raw || `Gemini ${res.status}`);
  const data = JSON.parse(raw);
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function parseReplies(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      if (Array.isArray(obj.replies)) return obj.replies;
    }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
  } catch (_) { /* ignore */ }
  return null;
}

async function handleChat(body) {
  if (!GEMINI_API_KEY) {
    const err = new Error('Server: GEMINI_API_KEY not configured');
    err.status = 503;
    throw err;
  }

  const { action, system, prompt } = body;
  if (!system || !prompt) {
    const err = new Error('Missing system or prompt');
    err.status = 400;
    throw err;
  }

  const text = await callGemini(system, prompt);

  if (action === 'smart_replies') {
    const replies = parseReplies(text);
    if (replies && replies.length >= 1) {
      return { ok: true, replies: replies.slice(0, 3) };
    }
    return { ok: true, result: replies || [text, text, text] };
  }

  return { ok: true, result: text };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'vchat-ai-proxy' });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      const body = await readBody(req);
      const result = await handleChat(body);
      return sendJson(res, 200, result);
    } catch (e) {
      return sendJson(res, e.status || 500, { ok: false, error: e.message });
    }
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`VChat AI proxy http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/api/chat`);
  if (!GEMINI_API_KEY) console.warn('Warning: set GEMINI_API_KEY env variable');
});
