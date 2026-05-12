const firebaseConfig = {
    apiKey: "AIzaSyCg30e6q0vgQifYTXgl7ERe7aC-ZrLaOiY",
    authDomain: "vchat-12103.firebaseapp.com",
    databaseURL: "https://vchat-12103-default-rtdb.firebaseio.com",
    projectId: "vchat-12103",
    storageBucket: "vchat-12103.firebasestorage.app",
    messagingSenderId: "734798044186",
    appId: "1:734798044186:web:4b81505707c1b3a03a05a3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let myKey = ""; // ID пользователя в базе
let currentChatId = ""; // ID текущей комнаты

function enterChat() {
    const email = document.getElementById('userEmail').value.trim();
    const nick = document.getElementById('userNickname').value.trim();

    if (email && nick) {
        myKey = btoa(email).replace(/=/g, ""); // Создаем безопасный ID из email
        
        // Сохраняем профиль
        db.ref("users/" + myKey).update({
            email: email,
            nickname: nick,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + nick // Авто-аватарка
        });

        startApp(nick, email);
    }
}

function startApp(nick, email) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('myName').innerText = nick;
    
    // Загружаем нашу аватарку
    db.ref("users/" + myKey + "/avatar").on("value", (s) => {
        document.getElementById('myAvatar').src = s.val();
    });

    loadChatList();
}

// Смена аватара через ссылку
function changeAvatar() {
    const newUrl = prompt("Введите прямую ссылку на картинку или любой текст для генерации новой:");
    if (newUrl) {
        const finalUrl = newUrl.includes("http") ? newUrl : "https://api.dicebear.com/7.x/avataaars/svg?seed=" + newUrl;
        db.ref("users/" + myKey).update({ avatar: finalUrl });
    }
}

// Добавление нового чата по Email
function addChat() {
    const targetEmail = document.getElementById('searchUser').value.trim();
    if (!targetEmail) return;
    
    const targetKey = btoa(targetEmail).replace(/=/g, "");
    
    // Генерируем уникальный ID комнаты (всегда одинаковый для двоих)
    currentChatId = myKey < targetKey ? myKey + "_" + targetKey : targetKey + "_" + myKey;
    
    db.ref("users/" + targetKey).once("value", (s) => {
        if (s.exists()) {
            document.getElementById('chatTitle').innerText = "Чат с " + s.val().nickname;
            openChat(currentChatId);
            document.getElementById('searchUser').value = "";
        } else {
            alert("Пользователь не найден!");
        }
    });
}

function openChat(chatId) {
    currentChatId = chatId;
    document.getElementById('chatBox').innerHTML = "";
    
    // Отключаем старые слушатели и вешаем новый
    db.ref("chats/" + chatId).off();
    db.ref("chats/" + chatId).limitToLast(50).on("child_added", (snap) => {
        const m = snap.val();
        renderMessage(m);
    });
}

function sendMessage() {
    const text = document.getElementById('userInput').value.trim();
    if (text && currentChatId) {
        db.ref("chats/" + currentChatId).push().set({
            sender: myKey,
            text: text,
            time: Date.now()
        });
        document.getElementById('userInput').value = "";
    }
}

function renderMessage(m) {
    const div = document.createElement('div');
    div.classList.add('msg', m.sender === myKey ? 'user' : 'other');
    div.innerText = m.text;
    document.getElementById('chatBox').appendChild(div);
    document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
}