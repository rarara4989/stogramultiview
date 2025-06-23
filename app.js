
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

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
getAnalytics(app);

let currentSearchMode = localStorage.getItem('searchMode') || 'fast';
const HIDDEN_KEY = 'hiddenList';
const FAVORITES_KEY = 'favoritesList';
const CLIENT_ID = 'qkcn5l91u9syfgeh26ed6v80w5k7wj';
const CLIENT_SECRET = '8etp2pc66blwg0i5ttaybz1g77dkma';

window.setSearchMode = function (mode) {
  currentSearchMode = mode;
  localStorage.setItem('searchMode', mode);
  updateModeButtons();
  renderStreams();
}

function updateModeButtons() {
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`mode-${currentSearchMode}`);
  if (activeBtn) activeBtn.classList.add('active');
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
}

function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

window.addFavorite = function () {
  const input = document.getElementById("fav-url");
  const url = input.value.trim();
  const match = url.match(/twitch\.tv\/(\w+)/);
  if (match) {
    const id = match[1].toLowerCase();
    addFavoriteById(id, id);
    input.value = '';
  } else {
    alert("有効なTwitchのURLを入力してください！");
  }
}

function addFavoriteById(id, name) {
  const favs = getFavorites();
  if (!favs.some(f => f.id === id)) {
    favs.push({ id, name });
    saveFavorites(favs);
    updateFavoritesList();
    renderStreams();
  }
}

window.addFavoriteById = addFavoriteById;

async function getTwitchAccessToken() {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
  });
  const data = await res.json();
  return data.access_token;
}

async function isLive(token, login) {
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${login}`, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await res.json();
  return data.data && data.data.length > 0;
}

async function updateFavoritesList() {
  const favs = getFavorites();
  const ul = document.getElementById("favorites-list");
  ul.innerHTML = "";

  const token = await getTwitchAccessToken();
  const query = favs.map(f => `login=${encodeURIComponent(f.id)}`).join('&');
  const res = await fetch(`https://api.twitch.tv/helix/users?${query}`, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await res.json();
  const userMap = new Map(data.data.map(u => [u.login.toLowerCase(), u.display_name]));

  for (let i = 0; i < favs.length; i++) {
    const fav = favs[i];
    const displayName = userMap.get(fav.id.toLowerCase()) || fav.id;
    const li = document.createElement("li");
    const live = await isLive(token, fav.id);
    const icon = live ? '🎥 配信中' : '⏸ 未配信';
    li.textContent = `${displayName}　${icon}`;

    const btn = document.createElement("button");
    btn.textContent = "削除";
    btn.style.marginLeft = "10px";
    btn.onclick = () => {
      favs.splice(i, 1);
      saveFavorites(favs);
      updateFavoritesList();
      renderStreams();
    };
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

function getHiddenList() {
  return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]');
}

function addToHidden(id, name) {
  const list = getHiddenList();
  if (!list.find(x => x.id === id)) {
    list.push({ id, name });
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(list));
    renderStreams();
    updateHiddenList();
  }
}

window.addToHidden = addToHidden;

function removeFromHidden(index) {
  const list = getHiddenList();
  list.splice(index, 1);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(list));
  renderStreams();
  updateHiddenList();
}

async function updateHiddenList() {
  const list = getHiddenList();
  const ul = document.getElementById("hidden-list");
  if (!ul) return;
  ul.innerHTML = "";

  const token = await getTwitchAccessToken();

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const live = await isLive(token, item.id);
    const icon = live ? '🎥 配信中' : '⏸ 未配信';
    const li = document.createElement("li");
    li.textContent = `${item.name}　${icon}`;
    const btn = document.createElement("button");
    btn.textContent = "再表示";
    btn.style.marginLeft = "10px";
    btn.onclick = () => removeFromHidden(i);
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

async function fetchStograStreams(token, limit = 500) {
  const streams = [];
  let cursor = null;
  const favs = getFavorites();
  const favSet = new Set(favs.map(f => f.id.toLowerCase()));

  for (let i = 0; i < Math.ceil(limit / 100); i++) {
    const url = new URL('https://api.twitch.tv/helix/streams');
    url.searchParams.set('first', '100');
    if (cursor) url.searchParams.set('after', cursor);

    const res = await fetch(url, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    cursor = data.pagination?.cursor;
    const batch = data.data || [];

    const filtered = batch.filter(s => {
      const login = s.user_login.toLowerCase();
      const isFav = favSet.has(login);
      const isStogra = s.title.includes('ストグラ') && !s.title.includes('コラボ');
      return isFav || isStogra;
    });

    streams.push(...filtered);
    if (!cursor || streams.length >= limit) break;
  }

  return streams;
}

async function renderStreams() {
  const container = document.getElementById("streams-container");
  if (currentSearchMode === 'deep') {
    container.innerHTML = "🔎 じっくり探索中... 少々お待ちください";
  } else if (currentSearchMode === 'superdeep') {
    container.innerHTML = "🧠 超じっくり探索中（最大数万人規模）... かなり時間がかかります";
  } else {
    container.innerHTML = "読み込み中...";
  }

  let limit = 1000;
  if (currentSearchMode === 'deep') limit = 5000;
  else if (currentSearchMode === 'superdeep') limit = 10000;

  const token = await getTwitchAccessToken();
  const streams = await fetchStograStreams(token, limit);

  const hiddenList = getHiddenList().map(h => h.id);
  const favs = getFavorites();
  const allMap = new Map(streams.map(s => [s.user_login.toLowerCase(), s]));
  const ordered = [
    ...favs.map(f => allMap.get(f.id.toLowerCase())).filter(Boolean),
    ...streams.filter(s => !favs.some(f => f.id.toLowerCase() === s.user_login.toLowerCase()))
  ].filter(s => !hiddenList.includes(s.user_login.toLowerCase()));

  const top = ordered.slice(0, 9);
  container.innerHTML = "";
  const parentHost = location.hostname || "localhost";

  top.forEach(stream => {
    const isFav = favs.some(f => f.id === stream.user_login);
    const star = isFav ? '★' : '☆';
    const block = document.createElement("div");
    block.className = "stream-block";
    block.innerHTML = `
      <div class="info">
        <button class="fav-btn" onclick="addFavoriteById('${stream.user_login}', '${stream.user_name}')">${star}</button>
        <span>${stream.user_name}</span>
        <span>${stream.viewer_count}人</span>
        <button class="hide-btn" onclick="addToHidden('${stream.user_login}', '${stream.user_name}')">非表示</button>
      </div>
      <iframe class="player" src="https://player.twitch.tv/?channel=${stream.user_login}&parent=${parentHost}&muted=true" allowfullscreen></iframe>
    `;
    container.appendChild(block);
  });
}

updateModeButtons();
updateFavoritesList();
updateHiddenList();
renderStreams();
