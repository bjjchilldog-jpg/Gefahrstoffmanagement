/**
 * Offline-First Cache Layer via IndexedDB (idb).
 * 
 * Cacht kritische Daten lokal:
 * - Tenant/Location/WorkArea-Struktur
 * - Master-Substanzen
 * - Lokale Inventories
 * 
 * Sync-Strategie: Cache-First mit manuellem Sync-Button.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineCacheDB extends DBSchema {
  tenants: {
    key: string;
    value: any;
  };
  masterSubstances: {
    key: string;
    value: any;
    indexes: { 'by-name': string };
  };
  inventories: {
    key: string;
    value: any;
    indexes: { 'by-workArea': string };
  };
  pendingChanges: {
    key: number;
    value: {
      id?: number;
      url: string;
      method: string;
      body: any;
      timestamp: number;
      retryCount: number;
    };
    autoIncrement: true;
  };
  syncMeta: {
    key: string;
    value: { lastSynced: number };
  };
}

let dbInstance: IDBPDatabase<OfflineCacheDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineCacheDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<OfflineCacheDB>('gefahrstoff-offline', 1, {
    upgrade(db) {
      // Tenant-Baum
      if (!db.objectStoreNames.contains('tenants')) {
        db.createObjectStore('tenants', { keyPath: 'id' });
      }
      // Master-Katalog
      if (!db.objectStoreNames.contains('masterSubstances')) {
        const store = db.createObjectStore('masterSubstances', { keyPath: 'id' });
        store.createIndex('by-name', 'productName');
      }
      // Lokale Inventories
      if (!db.objectStoreNames.contains('inventories')) {
        const store = db.createObjectStore('inventories', { keyPath: 'id' });
        store.createIndex('by-workArea', 'workAreaId');
      }
      // Pending Changes (Offline-Queue)
      if (!db.objectStoreNames.contains('pendingChanges')) {
        db.createObjectStore('pendingChanges', { keyPath: 'id', autoIncrement: true });
      }
      // Sync-Metadaten
      if (!db.objectStoreNames.contains('syncMeta')) {
        db.createObjectStore('syncMeta', { keyPath: 'key' });
      }
    }
  });
  return dbInstance;
}

// ============================================================
// Cache-Operationen
// ============================================================

/** Cached die Tenant-Baumstruktur */
export async function cacheTenants(tenants: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tenants', 'readwrite');
  await tx.store.clear();
  for (const t of tenants) {
    await tx.store.put(t);
  }
  await tx.done;
  await updateSyncTime('tenants');
}

/** Liest Tenants aus dem Cache */
export async function getCachedTenants(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('tenants');
}

/** Cached Master-Substanzen */
export async function cacheMasterSubstances(substances: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('masterSubstances', 'readwrite');
  await tx.store.clear();
  for (const s of substances) {
    await tx.store.put(s);
  }
  await tx.done;
  await updateSyncTime('masterSubstances');
}

/** Liest Master-Substanzen aus dem Cache */
export async function getCachedMasterSubstances(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('masterSubstances');
}

/** Sucht Master-Substanzen nach Name (offline) */
export async function searchCachedSubstances(query: string): Promise<any[]> {
  const db = await getDB();
  const all = await db.getAll('masterSubstances');
  const q = query.toLowerCase();
  return all.filter(s => s.productName?.toLowerCase().includes(q));
}

// ============================================================
// Offline-Queue (Pending Changes)
// ============================================================

/** Speichert eine Änderung in die Offline-Queue */
export async function queueChange(url: string, method: string, body: any): Promise<void> {
  const db = await getDB();
  await db.add('pendingChanges', {
    url, method, body,
    timestamp: Date.now(),
    retryCount: 0
  });
}

/** Gibt alle ausstehenden Änderungen zurück */
export async function getPendingChanges(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('pendingChanges');
}

/** Löscht eine verarbeitete Änderung */
export async function removePendingChange(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('pendingChanges', id);
}

/** Synchronisiert alle ausstehenden Änderungen mit dem Server */
export async function syncPendingChanges(token: string): Promise<{ synced: number; failed: number }> {
  const changes = await getPendingChanges();
  let synced = 0;
  let failed = 0;
  
  for (const change of changes) {
    try {
      const res = await fetch(change.url, {
        method: change.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: change.method !== 'GET' ? JSON.stringify(change.body) : undefined
      });
      
      if (res.ok) {
        await removePendingChange(change.id!);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  
  return { synced, failed };
}

// ============================================================
// Sync-Metadaten
// ============================================================

async function updateSyncTime(storeName: string): Promise<void> {
  const db = await getDB();
  await db.put('syncMeta', { lastSynced: Date.now() }, storeName);
}

export async function getLastSyncTime(storeName: string): Promise<number | null> {
  const db = await getDB();
  const meta = await db.get('syncMeta', storeName);
  return meta?.lastSynced || null;
}

/** Prüft ob Online */
export function isOnline(): boolean {
  return navigator.onLine;
}

/** Fetch mit Offline-Fallback: Versucht Server, fällt auf Cache zurück */
export async function fetchWithCache(
  url: string,
  cacheKey: 'tenants' | 'masterSubstances',
  headers?: Record<string, string>
): Promise<any[]> {
  if (isOnline()) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        // Cache aktualisieren
        if (cacheKey === 'tenants') await cacheTenants(arr);
        else if (cacheKey === 'masterSubstances') await cacheMasterSubstances(arr);
        return arr;
      }
    } catch {
      // Offline-Fallback
    }
  }
  
  // Aus Cache lesen
  if (cacheKey === 'tenants') return getCachedTenants();
  if (cacheKey === 'masterSubstances') return getCachedMasterSubstances();
  return [];
}
