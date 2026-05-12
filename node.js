const API_KEY = "AIzaSyDYMkGWL1nIhkUWXHxSsE9O0uiDKA2jOyA";
const chatBox = document.getElementById('chatBox');

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    input.value = '';
    const loadingMsg = appendMessage('ai', 'Печатает...');

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            loadingMsg.innerText = data.candidates[0].content.parts[0].text;
        } else if (data.error) {
            loadingMsg.innerText = "Ошибка API: " + data.error.message;
        }
    } catch (e) {
        loadingMsg.innerText = "Ошибка сети: " + e.message;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', sender); // Убедись, что в CSS есть класс .msg.user и .msg.ai
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}