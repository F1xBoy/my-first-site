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

let myKey = localStorage.getItem('vchat_my_key') || "";
let currentChatId = "";
let replyTo = null; // Храним сообщение, на которое отвечаем
let forwardMsg = null; // Храним сообщение для пересылки

// --- ИНИЦИАЛИЗАЦИЯ И ВХОД (БЕЗ ИЗМЕНЕНИЙ) ---
window.onload = () => { if (myKey) loadProfile(); };
function loadProfile() {
    db.ref("users/" + myKey).once("value", s => {
        const d = s.val();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('myName').innerText = d.nickname;
        document.getElementById('myAvatar').src = d.avatar;
        loadUsers();
    });
}

function enterChat() {
    const e = document.getElementById('userEmail').value.trim().toLowerCase();
    const n = document.getElementById('userNickname').value.trim();
    if (e.includes('@') && n) {
        myKey = btoa(e).replace(/=/g, "");
        db.ref("users/" + myKey).update({ email: e, nickname: n, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + n });
        localStorage.setItem('vchat_my_key', myKey);
        location.reload();
    }
}

// --- ЛОГИКА ЧАТА (НОВАЯ) ---

function startChat(target) {
    currentChatId = myKey < target.id ? myKey + "_" + target.id : target.id + "_" + myKey;
    document.getElementById('chatTitle').innerText = target.nickname;
    document.getElementById('chatBox').innerHTML = "";
    
    db.ref("chats/" + currentChatId).off();
    db.ref("chats/" + currentChatId).on("value", snapshot => {
        document.getElementById('chatBox').innerHTML = "";
        snapshot.forEach(child => {
            renderMessage(child.val(), child.key);
        });
    });
}

function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || !currentChatId) return;

    const msgData = {
        sender: myKey,
        senderNick: document.getElementById('myName').innerText,
        text: text,
        time: Date.now()
    };

    // Если это ответ
    if (replyTo) {
        msgData.reply = replyTo;
        replyTo = null;
        document.getElementById('userInput').placeholder = "Сообщение...";
    }

    db.ref("chats/" + currentChatId).push().set(msgData);
    input.value = "";
}

function renderMessage(m, msgId) {
    const div = document.createElement('div');
    div.classList.add('msg', m.sender === myKey ? 'user' : 'other');
    
    let html = "";
    // Если есть ответ
    if (m.reply) {
        html += `<div style="background:rgba(0,0,0,0.2); padding:5px; border-left:3px solid #58a6ff; font-size:11px; margin-bottom:5px;">
                    <b>${m.reply.nick}:</b> ${m.reply.text}
                 </div>`;
    }
    // Если это пересланное сообщение
    if (m.forwardedFrom) {
        html += `<small style="color:#58a6ff; font-size:10px;">↪ Переслано от ${m.forwardedFrom}</small><br>`;
    }

    html += `<div>${m.text}</div>`;
    div.innerHTML = html;

    // Клик для меню действий
    div.onclick = () => {
        const action = prompt("1: Ответить, 2: Удалить (только свои), 3: Переслать");
        if (action === "1") {
            replyTo = { text: m.text, nick: m.senderNick || "Кто-то" };
            document.getElementById('userInput').placeholder = "Ответ на: " + m.text;
        } else if (action === "2" && m.sender === myKey) {
            db.ref("chats/" + currentChatId + "/" + msgId).remove();
        } else if (action === "3") {
            forwardMsg = { text: m.text, from: m.senderNick || "Аноним" };
            alert("Теперь выбери чат, кому переслать, и нажми 'Переслать' (кнопка появится)");
        }
    };

    document.getElementById('chatBox').appendChild(div);
    document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
}

// Функционал ПЕРЕСЫЛКИ (нужно нажать на юзера после выбора сообщения)
// Добавь проверку в функцию startChat:
function startChat(target) {
    // ... (старый код начала чата)
    if (forwardMsg) {
        if (confirm(`Переслать сообщение в чат с ${target.nickname}?`)) {
            db.ref("chats/" + currentChatId).push().set({
                sender: myKey,
                senderNick: document.getElementById('myName').innerText,
                text: forwardMsg.text,
                forwardedFrom: forwardMsg.from,
                time: Date.now()
            });
            forwardMsg = null;
        }
    }
}