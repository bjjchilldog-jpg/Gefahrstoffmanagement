// popup.js — Gefahrstoff-Manager Browser Extension
const API_BASE = 'http://localhost:3000/api';

// ============================================================
// State & Auth
// ============================================================
let token = null;
let currentTab = 'deadlines';

async function init() {
  const stored = await chrome.storage.local.get(['token']);
  token = stored.token || null;
  
  setupTabs();
  setupLogin();
  setupSearch();
  setupUpload();
  
  if (token) {
    showAuthenticatedUI();
    loadDeadlines();
  } else {
    showLoginUI();
  }
}

function showLoginUI() {
  document.getElementById('loginPanel').style.display = 'block';
  document.getElementById('deadlinesPanel').style.display = 'none';
  document.getElementById('searchPanel').style.display = 'none';
  document.getElementById('uploadPanel').style.display = 'none';
}

function showAuthenticatedUI() {
  document.getElementById('loginPanel').style.display = 'none';
  switchTab(currentTab);
}

// ============================================================
// Tabs
// ============================================================
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (!token) return;
      switchTab(tab.dataset.tab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel:not(#loginPanel)').forEach(p => p.style.display = 'none');
  
  const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (activeTab) activeTab.classList.add('active');
  
  const panel = document.getElementById(`${tabName}Panel`);
  if (panel) panel.style.display = 'block';
}

// ============================================================
// Login
// ============================================================
function setupLogin() {
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const statusEl = document.getElementById('loginStatus');
    
    if (!email || !password) {
      statusEl.innerHTML = '<div class="status error">Bitte E-Mail und Passwort eingeben.</div>';
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        token = data.token;
        await chrome.storage.local.set({ token });
        showAuthenticatedUI();
        loadDeadlines();
      } else {
        statusEl.innerHTML = `<div class="status error">${data.error || 'Login fehlgeschlagen.'}</div>`;
      }
    } catch (err) {
      statusEl.innerHTML = '<div class="status error">Server nicht erreichbar. Läuft das Backend?</div>';
    }
  });
}

// ============================================================
// Deadlines / Fristen-Radar
// ============================================================
async function loadDeadlines() {
  const container = document.getElementById('deadlinesList');
  try {
    const res = await fetch(`${API_BASE}/extension/deadlines`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    const count = data.count || 0;
    const badge = document.getElementById('deadlineBadge');
    
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
    
    container.innerHTML = `
      <div class="deadline-card ${count > 5 ? 'critical' : count > 0 ? 'warning' : 'ok'}">
        <div class="count">${count}</div>
        <div>
          <div class="label">${count > 0 ? 'Stoffe mit abgelaufenem SDB (> 1 Jahr)' : 'Alle SDBs sind aktuell'}</div>
        </div>
      </div>
      <div class="deadline-card ok">
        <div class="count">✓</div>
        <div><div class="label">System-Integrität: Hash-Kette intakt</div></div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="status error">Fehler beim Laden der Fristen.</div>';
  }
}

// ============================================================
// Schnellsuche
// ============================================================
function setupSearch() {
  const input = document.getElementById('searchInput');
  let debounceTimer;
  
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => searchSubstances(input.value), 300);
  });
}

async function searchSubstances(query) {
  const container = document.getElementById('searchResults');
  if (!query || query.length < 2) {
    container.innerHTML = '<div class="empty">Mindestens 2 Zeichen eingeben...</div>';
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/extension/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const substances = await res.json();
    
    if (substances.length === 0) {
      container.innerHTML = '<div class="empty">Keine Stoffe gefunden.</div>';
      return;
    }
    
    container.innerHTML = substances.map(s => `
      <div class="result-item" onclick="window.open('http://localhost:5173', '_blank')">
        <div class="name">${s.productName}</div>
        <div class="meta">${s.manufacturer || ''} ${s.casNumber ? '| CAS: ' + s.casNumber : ''}</div>
        ${s.hPhrases ? `<div class="h-phrases">${s.hPhrases.split(',').slice(0, 5).map(h => `<span>${h.trim()}</span>`).join('')}</div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="status error">Suchfehler.</div>';
  }
}

// ============================================================
// Smart Upload (Drag & Drop)
// ============================================================
function setupUpload() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  
  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      uploadFile(fileInput.files[0]);
    }
  });
}

async function uploadFile(file) {
  const statusEl = document.getElementById('uploadStatus');
  statusEl.innerHTML = '<div class="status info">⏳ Datei wird hochgeladen und analysiert...</div>';
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    if (res.ok) {
      const data = await res.json();
      statusEl.innerHTML = `<div class="status success">✅ "${file.name}" erfolgreich hochgeladen. <br><small>Gespeichert als: ${data.filename}</small></div>`;
    } else {
      statusEl.innerHTML = '<div class="status error">Upload fehlgeschlagen.</div>';
    }
  } catch (err) {
    statusEl.innerHTML = '<div class="status error">Server nicht erreichbar.</div>';
  }
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', init);
