async function runAI() {
        const input = document.getElementById('userInput').value;
        const output = document.getElementById('output');
        const status = document.getElementById('status');
        const t = translations[currentLang];
        
        // Твой секретный ключ
        const API_KEY = "AIzaSyDYMkGWL1nIhkUWXHxSsE9O0uiDKA2jOyA"; 

        if (!input.trim()) {
            output.innerText = t.empty;
            return;
        }

        status.innerText = t.wait;
        output.innerText = "...";

        try {
            // Запрос напрямую к Gemini API
           const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${API_KEY}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: input }]
                    }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const aiText = data.candidates[0].content.parts[0].text;
                status.innerText = currentLang === 'RU' ? "ОТВЕТ ПОЛУЧЕН" : "RESPONSE RECEIVED";
                output.innerText = aiText;
            } else {
                output.innerText = "Ошибка: API вернул пустой ответ. Проверь ключ или лимиты.";
            }

        } catch (error) {
            output.innerText = "Ошибка сети: Не удалось связаться с нейронкой. " + error.message;
            status.innerText = "ERROR";
        }
    }