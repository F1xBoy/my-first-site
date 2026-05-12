const API_KEY = "AIzaSyDYMkGWL1nIhkUWXHxSsE9O0uiDKA2jOyA";
const chatBox = document.getElementById('chatBox');

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    
    if (!text) return;

    // 1. Добавляем твое сообщение на экран
    appendMessage('user', text);
    input.value = '';

    // 2. Показываем, что ИИ "печатает"
    const loadingMsg = appendMessage('ai', '...');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;

        // 3. Заменяем "..." на реальный ответ
        loadingMsg.innerText = aiText;
        
    } catch (error) {
        loadingMsg.innerText = "Ошибка связи. Проверь интернет, бро.";
    }

    // Скроллим вниз
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}