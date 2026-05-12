// Твои конфиги из Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCg30e6q0vgQifYTXgl7ERe7aC-ZrLaOiY",
  authDomain: "vchat-12103.firebaseapp.com",
  databaseURL: "https://vchat-12103-default-rtdb.firebaseio.com", // Я добавил стандартный URL базы
  projectId: "vchat-12103",
  storageBucket: "vchat-12103.firebasestorage.app",
  messagingSenderId: "734798044186",
  appId: "1:734798044186:web:4b81505707c1b3a03a05a3"
};

// Инициализация (используем старый синтаксис для совместимости)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let userEmail = "";

// Функция входа
function enterChat() {
    const email = document.getElementById('userEmail').value.trim();
    if (email.includes('@')) {
        userEmail = email;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').classList.remove('blur');
        listenForMessages();
    } else {
        alert("Бро, без нормальной почты не пущу!");
    }
}

// Отправка сообщения в облако
function sendMessage() {
    const input = document.getElementById('userInput');
    const msgText = input.value.trim();
    
    if (msgText && userEmail) {
        db.ref("messages").push().set({
            user: userEmail,
            text: msgText,
            time: firebase.database.ServerValue.TIMESTAMP
        });
        input.value = "";
    }
}

// Получение сообщений в реальном времени
function listenForMessages() {
    db.ref("messages").limitToLast(50).on("child_added", (snapshot) => {
        const msg = snapshot.val();
        renderMessage(msg);
    });
}

function renderMessage(msg) {
    const chatBox = document.getElementById('chatBox');
    const div = document.createElement('div');
    
    // Свои сообщения — справа, чужие — слева
    div.classList.add('msg', msg.user === userEmail ? 'user' : 'ai');
    
    div.innerHTML = `
        <small style="font-size: 10px; opacity: 0.5;">${msg.user}</small>
        <div>${msg.text}</div>
    `;
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}