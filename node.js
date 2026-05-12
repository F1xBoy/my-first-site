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

let myKey = "";
let currentChatId = "";
let allUsers = []; // Храним список всех для поиска

function enterChat() {
    const email = document.getElementById('userEmail').value.trim();
    const nick = document.getElementById('userNickname').value.trim();

    if (email && nick) {
        myKey = btoa(email.toLowerCase()).replace(/=/g, "");
        db.ref("users/" + myKey).update({
            email: email.toLowerCase(),
            nickname: nick,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + nick
        });
        localStorage.setItem('vchat_my_key', myKey);
        location.reload(); // Перезагружаем для чистого старта
    }
}

// Авто-вход
window.onload = () => {
    const savedKey = localStorage.getItem('vchat_my_key');
    if (savedKey) {
        myKey = savedKey;
        db.ref("users/" + myKey).once("value", (s) => {
            const data = s.val();
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            document.getElementById('myName').innerText = data.nickname;
            document.getElementById('myAvatar').src = data.avatar;
            loadAllUsers();
        });
    }
};

function loadAllUsers() {
    db.ref("users").on("value", (snapshot) => {
        allUsers = [];
        const data = snapshot.val();
        for (let id in data) {
            if (id !== myKey) { // Не показываем себя в списке
                allUsers.push({ id, ...data[id] });
            }
        }
        renderUserList(allUsers);
    });
}

function renderUserList(users) {
    const container = document.getElementById('userList');
    container.innerHTML = "";
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.onclick = () => startPrivateChat(user);
        div.innerHTML = `
            <img src="${user.avatar}">
            <div class="info">
                <span class="nick">${user.nickname}</span>
                <span class="mail">${user.email}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterUsers() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allUsers.filter(u => 
        u.nickname.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    );
    renderUserList(filtered);
}

function startPrivateChat(targetUser) {
    currentChatId = myKey < targetUser.id ? myKey + "_" + targetUser.id : targetUser.id + "_" + myKey;
    
    document.getElementById('chatTitle').innerText = targetUser.nickname;
    const headerAvatar = document.getElementById('activeChatAvatar');
    headerAvatar.src = targetUser.avatar;
    headerAvatar.style.display = 'block';

    document.getElementById('chatBox').innerHTML = "";
    db.ref("chats/" + currentChatId).off();
    db.ref("chats/" + currentChatId).on("child_added", (snap) => {
        renderMessage(snap.val());
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
    const chatBox = document.getElementById('chatBox');
    const div = document.createElement('div');
    div.classList.add('msg', m.sender === myKey ? 'user' : 'other');
    div.innerText = m.text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function changeAvatar() {
    const nick = document.getElementById('myName').innerText;
    const newSeed = prompt("Введите любое слово для новой аватарки:");
    if (newSeed) {
        const newUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + newSeed;
        db.ref("users/" + myKey).update({ avatar: newUrl });
        document.getElementById('myAvatar').src = newUrl;
    }
}