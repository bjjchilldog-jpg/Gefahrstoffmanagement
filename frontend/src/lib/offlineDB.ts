import { openDB } from 'idb';

const DB_NAME = 'gefahrstoff-mobile-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('hierarchy')) {
        db.createObjectStore('hierarchy'); // Zum Speichern von Mandanten/Standorten/Arbeitsbereichen
      }
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true }); // Zum Speichern der Offline-Scans
      }
    },
  });
};

export const saveHierarchyCache = async (data: any) => {
  const db = await initDB();
  await db.put('hierarchy', data, 'tree');
};

export const getHierarchyCache = async () => {
  const db = await initDB();
  return db.get('hierarchy', 'tree');
};

export const saveScan = async (scan: any) => {
  const db = await initDB();
  await db.add('scans', { ...scan, timestamp: Date.now() });
};

export const getScans = async () => {
  const db = await initDB();
  return db.getAll('scans');
};

export const clearScans = async () => {
  const db = await initDB();
  await db.clear('scans');
};
