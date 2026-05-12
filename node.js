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
        // Пробуем стабильный URL v1
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        console.log("Ответ от Google:", data); // Открой консоль (F12), чтобы видеть это

        if (data.error) {
            loadingMsg.innerText = "Ошибка Google: " + data.error.message;
        } else if (data.candidates && data.candidates[0].content.parts[0].text) {
            loadingMsg.innerText = data.candidates[0].content.parts[0].text;
        } else {
            loadingMsg.innerText = "Странно, но ИИ прислал пустой ответ.";
        }
        
    } catch (error) {
        loadingMsg.innerText = "Ошибка сети: " + error.message;
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg-bubble', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}