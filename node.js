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
let allUsers = [];

// ВХОД
function enterChat() {
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const nick = document.getElementById('userNickname').value.trim();

    if (email.includes('@') && nick) {
        myKey = btoa(email).replace(/=/g, "");
        db.ref("users/" + myKey).update({
            email: email,
            nickname: nick,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + nick
        }).then(() => {
            localStorage.setItem('vchat_my_key', myKey);
            location.reload();
        });
    } else {
        alert("Заполни поля правильно, бро!");
    }
}

// АВТО-ВХОД
window.onload = () => {
    if (myKey) {
        db.ref("users/" + myKey).once("value", (s) => {
            const data = s.val();
            if (data) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'flex';
                document.getElementById('myName').innerText = data.nickname;
                document.getElementById('myAvatar').src = data.avatar;
                loadUsers();
            }
        });
    }
};

// ЗАГРУЗКА ЛЮДЕЙ
function loadUsers() {
    db.ref("users").on("value", (snapshot) => {
        allUsers = [];
        const data = snapshot.val();
        for (let id in data) {
            if (id !== myKey) allUsers.push({ id, ...data[id] });
        }
        renderUserList(allUsers);
    });
}

function renderUserList(list) {
    const container = document.getElementById('userList');
    container.innerHTML = "";
    list.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.onclick = () => startChat(u);
        div.innerHTML = `<img src="${u.avatar}"><div class="info"><span class="nick">${u.nickname}</span><span class="mail">${u.email}</span></div>`;
        container.appendChild(div);
    });
}

// ПОИСК
function filterUsers() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allUsers.filter(u => u.nickname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    renderUserList(filtered);
}

// ЧАТ
function startChat(target) {
    currentChatId = myKey < target.id ? myKey + "_" + target.id : target.id + "_" + myKey;
    document.getElementById('chatTitle').innerText = target.nickname;
    const av = document.getElementById('activeChatAvatar');
    av.src = target.avatar; av.style.display = 'block';
    
    document.getElementById('chatBox').innerHTML = "";
    db.ref("chats/" + currentChatId).off();
    db.ref("chats/" + currentChatId).on("child_added", (snap) => {
        const m = snap.val();
        const div = document.createElement('div');
        div.classList.add('msg', m.sender === myKey ? 'user' : 'other');
        div.innerText = m.text;
        document.getElementById('chatBox').appendChild(div);
        document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById('userInput');
    if (input.value.trim() && currentChatId) {
        db.ref("chats/" + currentChatId).push().set({
            sender: myKey,
            text: input.value.trim(),
            time: Date.now()
        });
        input.value = "";
    }
}

// НАСТРОЙКИ
function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
function setFastAv(s) { document.getElementById('editAvatarUrl').value = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`; }

function saveProfile() {
    const nick = document.getElementById('editNickname').value.trim();
    const av = document.getElementById('editAvatarUrl').value.trim();
    if (nick) {
        db.ref("users/" + myKey).update({ nickname: nick, avatar: av || document.getElementById('myAvatar').src });
        location.reload();
    }
}