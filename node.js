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
let myUser = "";

function enterChat() {
    const email = document.getElementById('userEmail').value;
    if (email.includes('@')) {
        myUser = email;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('displayUser').innerText = "Вы: " + myUser;
        
        // Начинаем слушать базу
        db.ref("messages").limitToLast(50).on("child_added", (snap) => {
            const m = snap.val();
            const div = document.createElement('div');
            div.classList.add('msg', m.user === myUser ? 'user' : 'ai');
            div.innerHTML = `<small style="display:block;opacity:0.5;font-size:10px">${m.user}</small>${m.text}`;
            document.getElementById('chatBox').appendChild(div);
            document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
        });
    }
}

function sendMessage() {
    const input = document.getElementById('userInput');
    if (input.value.trim() && myUser) {
        db.ref("messages").push().set({
            user: myUser,
            text: input.value,
            time: Date.now()
        });
        input.value = "";
    }
}