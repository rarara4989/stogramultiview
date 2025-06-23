
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBswWqnrGKNWI-UD7Ey64XrzXEkcRFZBJk",
  authDomain: "stogra-chat.firebaseapp.com",
  databaseURL: "https://stogra-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stogra-chat",
  storageBucket: "stogra-chat.appspot.com",
  messagingSenderId: "907543392818",
  appId: "1:907543392818:web:14933a6add154d3d7e422b",
  measurementId: "G-LY8CGRWLR5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const chatRef = ref(db, "chat");

const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");

nameInput.value = localStorage.getItem("chatName") || "";

sendBtn.onclick = () => {
  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  if (!name || !message) return;
  push(chatRef, { name, message, timestamp: Date.now() });
  messageInput.value = "";
  localStorage.setItem("chatName", name);
};

onChildAdded(chatRef, (data) => {
  const { name, message } = data.val();
  const div = document.createElement("div");
  div.textContent = `【${name}】 ${message}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});
