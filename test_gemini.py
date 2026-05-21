import os
from google import genai
import os

client = genai.Client(api_key="AIzaSyCHTsDmMAbUbRCWKMWGEklMG8w2a6ATp80")

print("Список доступных моделей:")
for m in client.models.list():
    print(f"- {m.name}")

def generate():
    # Твой ключ прямо здесь
    MY_KEY = "AIzaSyCHTsDmMAbUbRCWKMWGEklMG8w2a6ATp80" 
    
    # Инициализация клиента
    client = genai.Client(api_key=MY_KEY)
    
    # Используем проверенную стабильную модель
    model = "gemini-2.0-flash-lite"
    
    # Сам запрос
    user_input = "Привет! Если ты это видишь, напиши 'Всё работает, бро!'"
    
    print("Соединяюсь с Gemini...")
    
    try:
        # Отправляем запрос
        response = client.models.generate_content(
            model=model,
            contents=user_input,
        )
        
        # Выводим ответ
        print("\n--- ОТВЕТ ОТ НЕЙРОНКИ ---")
        print(response.text)
        print("--------------------------")
        
    except Exception as e:
        print(f"\nБро, какая-то ошибка: {e}")

if __name__ == "__main__":
    generate()