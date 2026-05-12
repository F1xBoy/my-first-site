const firebaseConfig = {
    apiKey: "AIzaSyCg30e6q0vgQifYTXgl7ERe7aC-ZrLaOiY",
    authDomain: "vchat-12103.firebaseapp.com",
    databaseURL: "https://vchat-12103-default-rtdb.firebaseio.com",
    projectId: "vchat-12103",
    storageBucket: "vchat-12103.firebasestorage.app",
    messagingSenderId: "734798044186",
    appId: "1:734798044186:web:4b81505707c1b3a03a05a3"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
let currentUser = "";

// Вход
function enterChat() {
    const email = document.getElementById('userEmail').value.trim();
    if (email.includes('@')) {
        currentUser = email;
        localStorage.setItem('vchat_user', email); // Сохраняем вход в браузере
        showApp();
    } else {
        alert("Введите корректный Email");
    }
}

// Показ приложения и загрузка сообщений
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('displayUser').innerText = currentUser;
    
    // Очищаем чат перед загрузкой истории
    document.getElementById('chatBox').innerHTML = '';
    listenForMessages();
}

// Отправка
function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (text) {
        db.ref("messages/public").push().set({
            sender: currentUser,
            text: text,
            timestamp: Date.now()
        });
        input.value = "";
    }
}

// Слушатель базы
function listenForMessages() {
    // .on("child_added") автоматически подтянет ВСЕ старые сообщения при запуске
    db.ref("messages/public").limitToLast(100).on("child_added", (snapshot) => {
        const data = snapshot.val();
        renderMessage(data);
    });
}

function renderMessage(data) {
    const chatBox = document.getElementById('chatBox');
    const div = document.createElement('div');
    const isMe = data.sender === currentUser;
    
    div.classList.add('msg', isMe ? 'user' : 'ai');
    div.innerHTML = `
        <small style="opacity:0.5; font-size:10px">${data.sender}</small>
        <div>${data.text}</div>
    `;
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Авто-вход, если уже заходил раньше
window.onload = () => {
    const savedUser = localStorage.getItem('vchat_user');
    if (savedUser) {
        currentUser = savedUser;
        showApp();
    }
};