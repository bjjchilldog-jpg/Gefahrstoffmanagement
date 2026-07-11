import { useState, useEffect } from 'react';
import { getHierarchyCache, saveHierarchyCache, getScans, saveScan, clearScans } from '../lib/offlineDB';
import { MobileScanner } from '../components/MobileScanner';
import { RefreshCw, Database, MapPin, Building, Folder, FlaskConical, WifiOff, Wifi } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export const MobileAppView = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedWorkArea, setSelectedWorkArea] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingScans, setPendingScans] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [substanceName, setSubstanceName] = useState('');

  // 1. Online/Offline Listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Lade Hierarchie (Cache oder Live)
  useEffect(() => {
    loadHierarchy();
    loadPendingScans();
  }, []);

  const loadHierarchy = async () => {
    try {
      if (navigator.onLine) {
        const res = await fetch('/api/tenants');
        const data = await res.json();
        setTenants(data);
        saveHierarchyCache(data); // In IndexedDB speichern
      } else {
        const cached = await getHierarchyCache();
        if (cached) setTenants(cached);
      }
    } catch (err) {
      console.warn('Fehler beim Laden, nutze Cache', err);
      const cached = await getHierarchyCache();
      if (cached) setTenants(cached);
    }
  };

  const loadPendingScans = async () => {
    const scans = await getScans();
    setPendingScans(scans);
  };

  // 3. Scanner Handler
  const handleScanResult = async (phrases: string[], file: File) => {
    if (!selectedWorkArea || !substanceName) {
      alert("Bitte füllen Sie vorher Stoffname und Arbeitsbereich aus.");
      return;
    }

    try {
      // Client-side Image Compression
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });

      // Konvertiere File in Base64 für IndexedDB
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const scanData = {
          name: substanceName,
          workAreaId: selectedWorkArea,
          hPhrases: phrases,
          image: base64data
        };

        await saveScan(scanData);
        alert("Scan erfolgreich offline gespeichert!");
        setSubstanceName('');
        loadPendingScans();
      };
    } catch (err) {
      console.error("Komprimierungsfehler", err);
      alert("Fehler beim Verarbeiten des Bildes.");
    }
  };

  // 4. Sync Handler
  const handleSync = async () => {
    if (!navigator.onLine) {
      alert("Sie sind offline. Sync nicht möglich.");
      return;
    }
    if (pendingScans.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await fetch('/api/mobile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans: pendingScans })
      });
      if (res.ok) {
        await clearScans();
        setPendingScans([]);
        alert("Erfolgreich mit Server synchronisiert!");
      } else {
        alert("Fehler beim Synchronisieren.");
      }
    } catch (err) {
      alert("Netzwerkfehler beim Sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  const currentTenant = tenants.find(t => t.id === selectedTenant);
  const locations = currentTenant?.locations || [];
  const currentLocation = locations.find((l: any) => l.id === selectedLocation);
  const workAreas = currentLocation?.workAreas || [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-xl">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-400" />
          Vor-Ort Erfassung
        </h1>
        <div className="flex items-center gap-3">
          {isOffline ? <WifiOff className="h-5 w-5 text-red-400" /> : <Wifi className="h-5 w-5 text-emerald-400" />}
          <button onClick={handleSync} disabled={isSyncing || pendingScans.length === 0} className="relative disabled:opacity-50">
            <RefreshCw className={`h-6 w-6 text-slate-300 ${isSyncing ? 'animate-spin' : ''}`} />
            {pendingScans.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingScans.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto pb-20">
        
        {/* Offline Warning */}
        {isOffline && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm flex gap-2">
            <Database className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Offline-Modus aktiv</p>
              <p>Alle Scans werden lokal gespeichert und können später synchronisiert werden.</p>
            </div>
          </div>
        )}

        {/* Standort-Navigator */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800 mb-2 border-b pb-2">1. Zielort wählen</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Building className="h-3 w-3"/> Mandant</label>
            <select className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700" value={selectedTenant} onChange={e => { setSelectedTenant(e.target.value); setSelectedLocation(''); setSelectedWorkArea(''); }}>
              <option value="">Bitte wählen...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Folder className="h-3 w-3"/> Standort</label>
            <select disabled={!selectedTenant} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 disabled:opacity-50" value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setSelectedWorkArea(''); }}>
              <option value="">Bitte wählen...</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><FlaskConical className="h-3 w-3"/> Arbeitsbereich</label>
            <select disabled={!selectedLocation} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 disabled:opacity-50" value={selectedWorkArea} onChange={e => setSelectedWorkArea(e.target.value)}>
              <option value="">Bitte wählen...</option>
              {workAreas.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </section>

        {/* Scan Section */}
        <section className={`transition-opacity duration-300 ${selectedWorkArea ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-800 mb-4 border-b pb-2">2. Stoff erfassen</h2>
            <div className="flex flex-col gap-1 mb-4">
              <label className="text-xs font-medium text-slate-500">Produktname (vom Etikett)</label>
              <input type="text" value={substanceName} onChange={e => setSubstanceName(e.target.value)} placeholder="z.B. WD-40, Isopropanol..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700" />
            </div>
            
            <MobileScanner onPhrasesDetected={() => {}} onFileProcessed={handleScanResult} />
          </div>
        </section>
      </main>
    </div>
  );
};
