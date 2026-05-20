import os
from google import genai

# Вставь сюда свой ключ (тот, что создавал в AI Studio)
os.environ["GEMINI_API_KEY"] = "AIzaSyC9OdqX6E0V54M7qzmLBwMJmLMAE2ZizxI"

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.0-flash", 
    contents="Привет! Если ты это видишь, напиши 'Всё работает, бро!'"
)

print(response.text)