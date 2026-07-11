/**
 * Lokale SQLite-Datenbank für Offline-WBT-Ergebnisse.
 * Nutzt better-sqlite3 für synchronen Zugriff im Electron-Hauptprozess.
 */
const path = require('path');
const { app } = require('electron');

let db = null;

function initDB() {
  // better-sqlite3 wird erst im Electron-Kontext geladen
  const Database = require('better-sqlite3');
  const dbPath = path.join(app.getPath('userData'), 'wbt-offline.db');
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Performance + Crash-Sicherheit
  
  // Schema erstellen
  db.exec(`
    CREATE TABLE IF NOT EXISTS offline_modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slides_json TEXT,
      quiz_json TEXT,
      synced_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS offline_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      score REAL,
      passed INTEGER DEFAULT 0,
      result_data TEXT NOT NULL,
      signature TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      synced_at TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_results_synced ON offline_results(synced);
    CREATE INDEX IF NOT EXISTS idx_results_employee ON offline_results(employee_id);
  `);
  
  console.log('[WBT-DB] Lokale Datenbank initialisiert:', dbPath);
  return db;
}

function getDB() {
  if (!db) throw new Error('Datenbank nicht initialisiert. initDB() zuerst aufrufen.');
  return db;
}

module.exports = { initDB, getDB };
