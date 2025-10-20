// Импорт Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// 🔹 Конфигурация твоего проекта Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDbA7nE9igqEmvvWHnxk4c0nJkFdE-FOvY",
  authDomain: "mini-forum-ad215.firebaseapp.com",
  projectId: "mini-forum-ad215",
  storageBucket: "mini-forum-ad215.firebasestorage.app",
  messagingSenderId: "574752413965",
  appId: "1:574752413965:web:1a7752efb212ba4d10b844",
  measurementId: "G-BZ47ZEWN4D"
};

// 🔹 Инициализация Firebase и базы данных Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Firebase подключен");

// =============================
// 💬 ОСНОВНОЙ ФУНКЦИОНАЛ
// =============================

// Элементы DOM
const feed = document.getElementById("feed");
const topicForm = document.getElementById("topic-form");
const btnHome = document.getElementById("btn-home");
const btnNew = document.getElementById("btn-new");
const homePage = document.getElementById("home");
const newTopicPage = document.getElementById("new-topic");
const pages = document.querySelectorAll(".page");

// =============================
// 📌 ФУНКЦИИ
// =============================

// 🔸 Переключение страниц
function showPage(id) {
  pages.forEach((p) => (p.style.display = "none"));
  document.getElementById(id).style.display = "block";
}

// 🔸 Добавление новой темы в Firestore
async function addTopic(title, body, tag) {
  try {
    await addDoc(collection(db, "posts"), {
      title: title,
      body: body,
      tag: tag || "Общее",
      date: new Date().toLocaleString()
    });
    alert("✅ Тема опубликована!");
    topicForm.reset();
    showPage("home");
    loadFeed();
  } catch (error) {
    console.error("Ошибка при добавлении темы:", error);
    alert("Ошибка при сохранении темы!");
  }
}

// 🔸 Загрузка всех тем из Firestore
async function loadFeed() {
  feed.innerHTML = "<p>Загрузка...</p>";
  const q = query(collection(db, "posts"), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);

  feed.innerHTML = "";

  if (querySnapshot.empty) {
    feed.innerHTML = "<p>Тем пока нет. Создайте первую тему!</p>";
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const postDiv = document.createElement("div");
    postDiv.classList.add("post");
    postDiv.innerHTML = `
      <h3>${data.title}</h3>
      <p>${data.body}</p>
      <div class="meta">
        <span class="tag">#${data.tag}</span> • <small>${data.date}</small>
      </div>
    `;
    feed.appendChild(postDiv);
  });
}

// =============================
// ⚙️ СОБЫТИЯ
// =============================

// Кнопка "Главная"
btnHome.addEventListener("click", () => showPage("home"));

// Кнопка "Создать тему"
btnNew.addEventListener("click", () => showPage("new-topic"));

// Отправка формы
topicForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("topic-title").value.trim();
  const body = document.getElementById("topic-body").value.trim();
  const tag = document.getElementById("topic-tag").value.trim();
  addTopic(title, body, tag);
});

// =============================
// 🚀 Запуск при загрузке страницы
// =============================
document.addEventListener("DOMContentLoaded", () => {
  showPage("home");
  loadFeed();
});
