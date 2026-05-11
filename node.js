let currentLang = 'RU';
const API_KEY = "AIzaSyDYMkGWL1nIhkUWXHxSsE9O0uiDKA2jOyA";

const textData = {
    RU: {
        title: "AI Терминал",
        subtitle: "Прямой доступ к Gemini 1.5 Flash",
        placeholder: "Напиши вопрос или код...",
        btn: "ВЫПОЛНИТЬ ЗАПРОС",
        ready: "Статус: Система готова",
        loading: "Статус: Нейронка думает...",
        errorEmpty: "Ошибка: Введи текст!",
        errorNet: "Ошибка сети или API ключа.",
        resInit: "Результат появится здесь..."
    },
    EN: {
        title: "AI Terminal",
        subtitle: "Direct access to Gemini 1.5 Flash",
        placeholder: "Type a question or code...",
        btn: "EXECUTE COMMAND",
        ready: "Status: System ready",
        loading: "Status: AI is thinking...",
        errorEmpty: "Error: Input is empty!",
        errorNet: "Network error or API issue.",
        resInit: "Result will appear here..."
    }
};

function toggleLang() {
    currentLang = currentLang === 'RU' ? 'EN' : 'RU';
    document.getElementById('langBtn').innerText = currentLang;
    updateUI();
}

function updateUI() {
    const d = textData[currentLang];
    document.getElementById('ui-title').innerText = d.title;
    document.getElementById('ui-subtitle').innerText = d.subtitle;
    document.getElementById('userInput').placeholder = d.placeholder;
    document.getElementById('execBtn').innerText = d.btn;
    document.getElementById('ui-status').innerText = d.ready;
}

async function runAI() {
    const input = document.getElementById('userInput').value;
    const output = document.getElementById('output');
    const status = document.getElementById('ui-status');
    const loader = document.getElementById('loader');
    const btn = document.getElementById('execBtn');
    const d = textData[currentLang];

    if (!input.trim()) {
        output.innerText = d.errorEmpty;
        return;
    }

    btn.disabled = true;
    loader.style.display = 'block';
    status.innerText = d.loading;
    output.innerText = "...";

    try {
        // Стабильный URL v1
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: input }] }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            output.innerText = data.candidates[0].content.parts[0].text;
            status.innerText = d.ready;
        } else {
            output.innerText = "API Error: " + (data.error ? data.error.message : "Пустой ответ");
        }
    } catch (error) {
        output.innerText = d.errorNet + "\n" + error.message;
    } finally {
        btn.disabled = false;
        loader.style.display = 'none';
    }
}