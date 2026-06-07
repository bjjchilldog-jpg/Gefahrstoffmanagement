import { useState, useEffect, useRef } from 'react';
import { Search, Clock, Upload, Settings, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [workAreaId, setWorkAreaId] = useState('');

  // Lade initial Settings aus dem Storage
  useEffect(() => {
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['serverUrl'], (res) => {
        if (res.serverUrl) setServerUrl(res.serverUrl);
      });
    }
  }, []);

  const handleSaveSettings = () => {
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ serverUrl });
    }
    setShowSettings(false);
    fetchDeadlines(); // Reload deadlines with new URL
  };

  // Fristen-Radar
  const fetchDeadlines = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/extension/deadlines`);
      const data = await res.json();
      setDeadlines(data.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, [serverUrl]);

  // Schnell-Suche
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${serverUrl}/api/extension/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, serverUrl]);

  // Drag & Drop Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!workAreaId) {
      setUploadStatus('Bitte zuerst einen Arbeitsbereich-ID eintragen (MVP Mock)');
      return;
    }
    setUploadStatus('Lade hoch & analysiere...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workAreaId', workAreaId);

    try {
      const res = await fetch(`${serverUrl}/api/extension/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus('Erfolgreich hochgeladen & Stoff angelegt!');
      } else {
        setUploadStatus('Fehler: ' + data.error);
      }
    } catch (err) {
      setUploadStatus('Fehler beim Upload.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-50 text-slate-800">
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-emerald-400" />
          <h1 className="font-bold text-lg">Gefahrstoff Radar</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="p-1 hover:bg-slate-800 rounded transition-colors">
          <Settings className="h-5 w-5 text-slate-300" />
        </button>
      </header>

      {showSettings && (
        <div className="p-4 bg-slate-800 text-white border-b border-slate-700 shadow-inner">
          <label className="block text-sm font-medium mb-1 text-slate-300">Server-URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
            <button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-medium transition-colors">Speichern</button>
          </div>
        </div>
      )}

      <div className="flex border-b border-slate-200 bg-white">
        <button onClick={() => setActiveTab('search')} className={clsx("flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors", activeTab === 'search' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
          <Search className="h-4 w-4" /> Suche
        </button>
        <button onClick={() => setActiveTab('radar')} className={clsx("flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors", activeTab === 'radar' ? "border-red-500 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
          <div className="relative">
            <Clock className="h-4 w-4" />
            {deadlines !== null && deadlines > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>}
          </div>
          Fristen
        </button>
        <button onClick={() => setActiveTab('upload')} className={clsx("flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors", activeTab === 'upload' ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
          <Upload className="h-4 w-4" /> SDB Upload
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {activeTab === 'search' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Gefahrstoff oder CAS suchen..." 
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map(substance => (
                  <div key={substance.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 cursor-pointer transition-colors">
                    <div>
                      <h3 className="font-semibold text-slate-800">{substance.name}</h3>
                      <p className="text-xs text-slate-500">CAS: {substance.casNumber}</p>
                    </div>
                    <div className="flex gap-1">
                      {JSON.parse(substance.pictograms || '[]').map((pic: string, idx: number) => (
                        <div key={idx} className="h-6 w-6 bg-red-100 rounded flex items-center justify-center text-[10px] text-red-600 font-bold border border-red-200" title={pic}>!</div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                searchQuery ? <div className="text-center text-slate-500 mt-8">Keine Ergebnisse für "{searchQuery}"</div> : <div className="text-center text-slate-400 mt-8 flex flex-col items-center gap-2"><Search className="h-8 w-8 opacity-20"/><span>Tippen Sie zum Suchen</span></div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800">Aktion erforderlich</h3>
                <p className="text-sm text-red-600 mt-1">Es gibt {deadlines} überfällige oder veraltete Sicherheitsdatenblätter im System.</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-sm text-slate-600">Offene Tasks</div>
              <div className="p-4 flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <div className="flex-1"><p className="text-sm font-medium text-slate-800">SDB Aktualisierung: Methanol</p><p className="text-xs text-slate-500">Labor Biologie • Abgelaufen seit 12 Tagen</p></div>
                    <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded">Prüfen</button>
                 </div>
                 {/* Placeholder for MVP */}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
            <div className="mb-4">
               <label className="block text-sm font-medium text-slate-700 mb-1">Ziel-Arbeitsbereich ID (Mock)</label>
               <input type="text" value={workAreaId} onChange={(e) => setWorkAreaId(e.target.value)} placeholder="z.B. UUID..." className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
            </div>

            <div 
              className="flex-1 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 flex flex-col items-center justify-center p-8 text-center hover:bg-blue-50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="font-semibold text-slate-700 text-lg mb-1">SDB oder BA hier ablegen</h3>
              <p className="text-sm text-slate-500 mb-6">PDF Datei einfach per Drag & Drop ins Plugin ziehen</p>
              
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => { if (e.target.files?.length) handleFileUpload(e.target.files[0]) }}/>
              <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-300 shadow-sm hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-lg font-medium text-sm transition-colors">
                Datei auswählen
              </button>
            </div>

            {uploadStatus && (
              <div className={clsx("mt-4 p-3 rounded flex items-center gap-2 text-sm", uploadStatus.includes('Erfolg') ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700 border border-slate-200")}>
                {uploadStatus.includes('Erfolg') && <CheckCircle className="h-4 w-4" />}
                {uploadStatus}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
