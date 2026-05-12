const firebaseConfig = {
    apiKey: "AIzaSyCg30e6q0vgQifYTXgl7ERe7aC-ZrLaOiY",
    authDomain: "vchat-12103.firebaseapp.com",
    databaseURL: "https://vchat-12103-default-rtdb.firebaseio.com",
    projectId: "vchat-12103",
    storageBucket: "vchat-12103.firebasestorage.app",
    messagingSenderId: "734798044186",
    appId: "1:734798044186:web:4b81505707c1b3a03a05a3"
};

// Инициализация
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
let currentUser = localStorage.getItem('vchat_user') || "";

// Проверка при загрузке
window.onload = () => {
    if (currentUser) {
        showApp();
    }
};

function enterChat() {
    const email = document.getElementById('userEmail').value.trim();
    if (email.includes('@')) {
        currentUser = email;
        localStorage.setItem('vchat_user', email);
        showApp();
    } else {
        alert("Введи почту!");
    }
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    const app = document.getElementById('main-app');
    app.style.display = 'flex';
    document.getElementById('userTitle').innerText = "Вы: " + currentUser;
    loadMessages();
}

function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (text && currentUser) {
        db.ref("messages/public").push().set({
            sender: currentUser,
            text: text,
            timestamp: Date.now()
        });
        input.value = "";
    }
}

function loadMessages() {
    const chatBox = document.getElementById('chatBox');
    db.ref("messages/public").limitToLast(50).on("child_added", (snap) => {
        const data = snap.val();
        const div = document.createElement('div');
        div.classList.add('msg', data.sender === currentUser ? 'user' : 'ai');
        div.innerHTML = `<small style="font-size:9px; display:block; opacity:0.6">${data.sender}</small>${data.text}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}