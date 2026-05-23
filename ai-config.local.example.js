/**
 * Скопируйте в ai-config.local.js (файл в .gitignore).
 * Cursor/Git не будут ругаться на ключ в этом файле, если он не в репозитории.
 */
window.VCHAT_AI_LOCAL_CONFIG = {
  provider: 'gemini', // 'gemini' | 'openai'
  apiKey: 'ВАШ_КЛЮЧ_СЮДА',
  geminiModel: 'gemini-2.0-flash-lite',
  openaiModel: 'gpt-4o-mini',
};
