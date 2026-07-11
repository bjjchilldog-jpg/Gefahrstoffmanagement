const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { initDB, getDB } = require('./db');

let mainWindow;
const APP_URL = 'http://localhost:5173'; // Oder gebundled: 'file://' + __dirname + '/renderer/index.html'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Gefahrstoff WBT — Offline-Modus',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    autoHideMenuBar: true,
  });

  // Versuche Server zu erreichen, sonst lokale Fallback-Seite
  mainWindow.loadURL(APP_URL).catch(() => {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'offline.html'));
  });
}

app.whenReady().then(() => {
  initDB();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// IPC Handlers — Offline WBT Logik
// ============================================================

/** Schulungsmodul lokal speichern (für Offline-Zugriff) */
ipcMain.handle('wbt:save-module', async (event, moduleData) => {
  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO offline_modules (id, title, slides_json, quiz_json, synced_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(moduleData.id, moduleData.title, JSON.stringify(moduleData.slides), JSON.stringify(moduleData.quiz));
  return { success: true };
});

/** Alle lokal gespeicherten Module laden */
ipcMain.handle('wbt:get-modules', async () => {
  const db = getDB();
  return db.prepare('SELECT * FROM offline_modules ORDER BY title').all();
});

/** Offline-Ergebnis speichern (kryptographisch signiert) */
ipcMain.handle('wbt:submit-result', async (event, result) => {
  const db = getDB();
  
  const dataToSign = JSON.stringify({
    employeeId: result.employeeId,
    moduleId: result.moduleId,
    score: result.score,
    passed: result.passed,
    completedAt: new Date().toISOString(),
  });
  
  // Kryptographische Signatur (HMAC-SHA256)
  const secret = app.getPath('userData') + '-gefahrstoff-wbt-signing-key';
  const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
  
  db.prepare(`
    INSERT INTO offline_results (employee_id, module_id, score, passed, result_data, signature, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(result.employeeId, result.moduleId, result.score, result.passed ? 1 : 0, dataToSign, signature);
  
  return { success: true, signature };
});

/** Alle ausstehenden Ergebnisse laden */
ipcMain.handle('wbt:get-pending-results', async () => {
  const db = getDB();
  return db.prepare('SELECT * FROM offline_results WHERE synced = 0 ORDER BY completed_at DESC').all();
});

/** Ergebnisse mit dem Server synchronisieren */
ipcMain.handle('wbt:sync-results', async (event, serverUrl, token) => {
  const db = getDB();
  const pending = db.prepare('SELECT * FROM offline_results WHERE synced = 0').all();
  
  let synced = 0;
  let failed = 0;
  
  for (const result of pending) {
    try {
      const res = await fetch(`${serverUrl}/api/lms/records/${result.employee_id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moduleId: result.module_id,
          score: result.score,
          passed: result.passed === 1,
          offlineSignature: result.signature,
          offlineCompletedAt: result.completed_at,
        })
      });
      
      if (res.ok) {
        db.prepare('UPDATE offline_results SET synced = 1, synced_at = datetime("now") WHERE id = ?').run(result.id);
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
  }
  
  return { synced, failed, total: pending.length };
});

/** ZIP-Bundle exportieren (signierte Teilnahmedatei) */
ipcMain.handle('wbt:export-bundle', async () => {
  const db = getDB();
  const results = db.prepare('SELECT * FROM offline_results ORDER BY completed_at').all();
  
  if (results.length === 0) {
    return { error: 'Keine Ergebnisse vorhanden.' };
  }
  
  const bundle = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    machineId: crypto.createHash('md5').update(app.getPath('userData')).digest('hex'),
    results: results.map(r => ({
      ...r,
      verified: verifySignature(r.result_data, r.signature)
    })),
    integrityHash: '' // Wird unten gesetzt
  };
  
  bundle.integrityHash = crypto.createHash('sha256').update(JSON.stringify(bundle.results)).digest('hex');
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'WBT-Ergebnisse exportieren',
    defaultPath: `wbt-ergebnisse-${Date.now()}.json`,
    filters: [{ name: 'JSON-Datei', extensions: ['json'] }]
  });
  
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2));
    return { success: true, path: filePath, count: results.length };
  }
  
  return { cancelled: true };
});

function verifySignature(data, signature) {
  const secret = app.getPath('userData') + '-gefahrstoff-wbt-signing-key';
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
