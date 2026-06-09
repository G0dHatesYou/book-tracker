// ── Config ──
const BIN_ID = '6a2841ebda38895dfea17c6c';
const API_KEY = '$2a$10$L1O6QwFVpC8owPRMFLOPS.waWfKz7/6GN4Ax1HNg/7vqW2YeP2MBO';
const BASE = 'https://api.jsonbin.io/v3/b';
const GOAL = 10;

// ── State ──
let db = { users: {} };
let currentUser = null;
let rivalName = null;
let saveTimer = null;

// ── Utils ──
const dateKey = d => d.toLocaleDateString('sv-SE');
const todayKey = () => dateKey(new Date());

const initials = name => name.slice(0, 2).toUpperCase();

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── JSONBin ──
async function loadDB() {
  try {
    const r = await fetch(`${BASE}/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });
    const j = await r.json();
    db = j.record || { users: {} };
    if (!db.users) db.users = {};
  } catch (e) {
    db = { users: {} };
  }
}

async function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch(`${BASE}/${BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
        body: JSON.stringify(db)
      });
    } catch (e) {}
  }, 600);
}

// ── Auth ──
async function handleLogin() {
  const name = document.getElementById('name-input').value.trim();
  if (!name) return;
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  await loadDB();

  if (!db.users[name]) {
    db.users[name] = { history: {}, rival: null, book: { title: '', total: 0 } };
    await saveDB();
  }

  currentUser = name;
  localStorage.setItem('bs_user', name);
  showMain();
}

function logout() {
  localStorage.removeItem('bs_user');
  currentUser = null;
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('name-input').value = '';
  const btn = document.getElementById('login-btn');
  btn.disabled = false;
  btn.textContent = 'Sign in / Register';
}

// ── Main ──
function showMain() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';

  const u = db.users[currentUser];
  rivalName = u.rival || null;

  document.getElementById('header-avatar').textContent = initials(currentUser);
  document.getElementById('header-name').textContent = currentUser;
  document.getElementById('my-avatar').textContent = initials(currentUser);
  document.getElementById('my-name').textContent = currentUser;

  if (u.book && u.book.title) {
    document.getElementById('book-name-input').value = u.book.title;
    document.getElementById('book-pages-input').value = u.book.total || '';
  }

  render();
}

// ── Render ──
function render() {
  const u = db.users[currentUser];
  if (!u) return;

  const today = todayKey();
  if (!u.history[today]) u.history[today] = 0;

  const todayPages = u.history[today];
  const done = todayPages >= GOAL;
  const streak = computeStreak(u.history);
  const total = Object.values(u.history).reduce((s, v) => s + v, 0);

  // Stats
  document.getElementById('stat-my-streak').textContent = streak + ' 🔥';
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-today').textContent = done ? '✅' : '⏳';
  document.getElementById('stat-today-sub').textContent = done ? 'Well done!' : 'goal pending';

  // My card
  document.getElementById('my-streak-label').textContent = streak + ' 🔥 streak · ' + total + ' pages total';
  document.getElementById('my-pages').textContent = todayPages;
  document.getElementById('my-prog').style.width = Math.min(100, todayPages / GOAL * 100) + '%';
  const doneBtn = document.getElementById('done-btn');
  doneBtn.classList.toggle('active', done);
  doneBtn.textContent = done ? '✓ Done!' : '✓ Mark done';

  renderBook();
  renderRival();
  renderHeatmap();
}

function computeStreak(history) {
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (true) {
    const k = dateKey(d);
    if ((history[k] || 0) >= GOAL) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function renderBook() {
  const u = db.users[currentUser];
  const b = u.book || {};
  document.getElementById('book-title').textContent = b.title || 'No book set';
  if (b.title && b.total) {
    const myTotal = Object.values(u.history).reduce((s, v) => s + v, 0);
    const pct = Math.min(100, Math.round(myTotal / b.total * 100));
    document.getElementById('book-meta').textContent = `${b.total} pages · ${pct}% read`;
  } else if (b.title) {
    document.getElementById('book-meta').textContent = 'Page count not set';
  } else {
    document.getElementById('book-meta').textContent = '—';
  }
}

function renderRival() {
  const infoEl = document.getElementById('rival-info');
  const avatarEl = document.getElementById('rival-avatar');

  if (!rivalName || !db.users[rivalName]) {
    avatarEl.textContent = '?';
    avatarEl.className = 'rival-avatar';
    infoEl.innerHTML = '<div class="no-rival-placeholder">No rival selected</div>';
    return;
  }

  const r = db.users[rivalName];
  const today = todayKey();
  const todayPages = (r.history && r.history[today]) || 0;
  const streak = computeStreak(r.history || {});
  const total = Object.values(r.history || {}).reduce((s, v) => s + v, 0);
  const pct = Math.min(100, todayPages / GOAL * 100);
  const done = todayPages >= GOAL;

  avatarEl.textContent = initials(rivalName);
  avatarEl.className = 'rival-avatar active';

  infoEl.innerHTML = `
    <div class="rival-name">${rivalName} ${done ? '✅' : ''}</div>
    <div class="rival-meta">${streak} 🔥 streak · ${total} pages total</div>
    <div class="rival-progress">
      <div class="prog-label">
        <span>Today</span>
        <span>${todayPages} / ${GOAL}</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap');
  const u = db.users[currentUser];
  const rData = (rivalName && db.users[rivalName]) ? db.users[rivalName] : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 28);
  const dow = startDate.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  for (let i = 0; i < offset; i++) cells.push('<div class="hm-cell empty"></div>');
  for (let i = 0; i <= 28; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const k = dateKey(d);
    const isToday = k === todayKey();
    const isFuture = d > today;
    let cls = 'hm-cell';
    if (!isFuture) {
      const myOk = (u.history[k] || 0) >= GOAL;
      const rvOk = rData ? (rData.history[k] || 0) >= GOAL : false;
      if (myOk) cls += ' both';
      else if (rvOk) cls += ' one';
      else if (k < todayKey()) cls += ' missed';
    }
    if (isToday) cls += ' today';
    cells.push(`<div class="${cls}" title="${k}"></div>`);
  }
  grid.innerHTML = cells.join('');
}

// ── Actions ──
function addPages(delta) {
  const u = db.users[currentUser];
  const k = todayKey();
  if (!u.history[k]) u.history[k] = 0;
  u.history[k] = Math.max(0, u.history[k] + delta);
  saveDB();
  render();
}

function addCustomPages() {
  const n = parseInt(prompt('How many pages did you read?'), 10);
  if (!isNaN(n) && n > 0) {
    const u = db.users[currentUser];
    const k = todayKey();
    if (!u.history[k]) u.history[k] = 0;
    u.history[k] += n;
    saveDB();
    render();
    showToast(`+${n} pages added!`);
  }
}

function markDone() {
  const u = db.users[currentUser];
  const k = todayKey();
  if (!u.history[k]) u.history[k] = 0;
  if (u.history[k] < GOAL) u.history[k] = GOAL;
  saveDB();
  render();
  showToast('Great job! 🔥');
}

function saveBook() {
  const title = document.getElementById('book-name-input').value.trim();
  const total = parseInt(document.getElementById('book-pages-input').value) || 0;
  if (!title) return;
  db.users[currentUser].book = { title, total };
  saveDB();
  renderBook();
  showToast('Book saved!');
}

// ── Rival modal ──
function openRivalModal() {
  document.getElementById('rival-search').value = '';
  renderUserList('');
  document.getElementById('rival-modal').classList.add('open');
}

function closeRivalModal() {
  document.getElementById('rival-modal').classList.remove('open');
}

function filterUsers() {
  renderUserList(document.getElementById('rival-search').value.trim().toLowerCase());
}

function renderUserList(q) {
  const list = document.getElementById('user-list');
  const others = Object.keys(db.users).filter(n => n !== currentUser && (!q || n.toLowerCase().includes(q)));
  if (!others.length) {
    list.innerHTML = '<div class="empty-state">No other users yet</div>';
    return;
  }
  list.innerHTML = others.map(name => {
    const u = db.users[name];
    const streak = computeStreak(u.history || {});
    const total = Object.values(u.history || {}).reduce((s, v) => s + v, 0);
    const isSelected = name === rivalName;
    return `
      <div class="user-item" onclick="selectRival('${name.replace(/'/g, "\\'")}')">
        <div class="user-item-avatar">${initials(name)}</div>
        <div>
          <div class="user-item-name">${name} ${isSelected ? '✓' : ''}</div>
          <div class="user-item-meta">${streak} 🔥 streak · ${total} pages</div>
        </div>
      </div>`;
  }).join('');
}

function selectRival(name) {
  rivalName = name;
  db.users[currentUser].rival = name;
  saveDB();
  closeRivalModal();
  render();
  showToast(`${name} is your new rival!`);
}

// ── Auto-refresh (pull rival data every 30s) ──
setInterval(async () => {
  if (!currentUser) return;
  const savedBook = JSON.stringify(db.users[currentUser]?.book);
  const savedHistory = JSON.stringify(db.users[currentUser]?.history);
  await loadDB();
  if (db.users[currentUser]) {
    db.users[currentUser].book = JSON.parse(savedBook || '{}');
    db.users[currentUser].history = JSON.parse(savedHistory || '{}');
  }
  render();
}, 30000);

// ── Init ──
(async () => {
  await loadDB();
  document.getElementById('loading').style.display = 'none';
  const saved = localStorage.getItem('bs_user');
  if (saved && db.users[saved]) {
    currentUser = saved;
    showMain();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
  }
})();

// Close modal on overlay click
document.getElementById('rival-modal').addEventListener('click', function(e) {
  if (e.target === this) closeRivalModal();
});
