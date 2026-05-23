# VChat AI Backend Proxy

Фронтенд отправляет **только** на ваш сервер. Ключ Gemini/OpenAI хранится в переменных окружения на сервере.

## Запуск

```bash
cd my-first-site
set GEMINI_API_KEY=ваш_ключ
node server/index.js
```

Сервер слушает `http://localhost:3001` (порт через `PORT`).

В `ai-features.js` укажите тот же origin:

```javascript
const VCHAT_API_CONFIG = {
  baseUrl: 'http://localhost:3001',
  chatPath: '/api/chat',
};
```

## API

### `POST /api/chat`

**Request (JSON):**

```json
{
  "action": "summary",
  "system": "System instructions…",
  "prompt": "User content…",
  "language": "ru",
  "messages": [
    { "author": "Alice", "text": "Hello", "role": "other" }
  ],
  "meta": {
    "userId": "firebase-uid",
    "chatId": "chat-id",
    "chatType": "USER"
  }
}
```

`action`: `"summary"` | `"smart_replies"`

Опционально: заголовок `Authorization: Bearer <Firebase ID token>` — для проверки на сервере (добавьте сами).

**Response (summary):**

```json
{ "ok": true, "result": "• Point one\n• Point two" }
```

**Response (smart_replies):**

```json
{ "ok": true, "replies": ["Sure!", "On my way", "Thanks"] }
```

или `{ "ok": true, "result": ["...", "...", "..."] }`

**Error:**

```json
{ "ok": false, "error": "message" }
```

### `GET /health`

```json
{ "ok": true, "service": "vchat-ai-proxy" }
```

## CORS

По умолчанию `Access-Control-Allow-Origin: *`. Для продакшена задайте:

```bash
set CORS_ORIGIN=https://your-vchat-domain.com
```

## Безопасность (рекомендации)

1. Не коммитьте `.env` с ключами.
2. Проверяйте Firebase ID token в `Authorization` перед вызовом AI.
3. Rate limit по IP / userId.
4. Не логируйте полный текст чатов в продакшене без необходимости.
