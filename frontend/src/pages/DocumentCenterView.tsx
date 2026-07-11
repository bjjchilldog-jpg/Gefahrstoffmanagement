import { useState, useEffect } from 'react';
import { FileText, Search, Filter, Upload, Trash2, Loader2, Plus, X, Download, Edit, Eye } from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';

export const DocumentCenterView = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('BETRIEBSANWEISUNG');
  const [uploadLocation, setUploadLocation] = useState('');
  const [uploading, setUploading] = useState(false);

  // Preview State
  const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string, mimeType: string, htmlContent?: string } | null>(null);

  // Echte Daten vom Backend laden
  useEffect(() => {
    fetchDocuments();
    fetchTenants();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/documents', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fehler beim Laden der Dokumente:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/tenants', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fehler beim Laden der Mandanten:', err);
      setTenants([]);
    }
  };

  // Dynamische Standort-Liste aus echten Tenants
  const allLocations: string[] = [];
  const locationOptions: { id: string, name: string }[] = [];
  tenants.forEach((t: any) => {
    t.locations?.forEach((l: any) => {
      if (!allLocations.includes(l.name)) allLocations.push(l.name);
      locationOptions.push({ id: l.id, name: l.name });
    });
  });

  // Dynamische Dokumententypen aus echten Daten
  const allTypes = Array.from(new Set(documents.map(d => d.docType).filter(Boolean)));
  const typeLabels: Record<string, string> = {
    'PDF_SDB': 'Sicherheitsdatenblatt',
    'SDB': 'Sicherheitsdatenblatt',
    'BETRIEBSANWEISUNG': 'Betriebsanweisung',
    'VIDEO': 'Video / Schulung',
    'NOTFALLPLAN': 'Notfallplan',
    'STUDIE': 'Studie / DGUV',
    'SONSTIGES': 'Sonstiges',
  };

  // Hilfsfunktion: LocationId -> LocationName auflösen
  const resolveLocationName = (doc: any): string => {
    if (doc.locationId) {
      for (const t of tenants) {
        const loc = t.locations?.find((l: any) => l.id === doc.locationId);
        if (loc) return loc.name;
      }
    }
    if (doc.workAreaId) {
      for (const t of tenants) {
        for (const l of (t.locations || [])) {
          const wa = l.workAreas?.find((w: any) => w.id === doc.workAreaId);
          if (wa) return `${l.name} / ${wa.name}`;
        }
      }
    }
    return '-';
  };

  const toggleFilter = (setState: any, state: string[], value: string) => {
    if (state.includes(value)) setState(state.filter((v: string) => v !== value));
    else setState([...state, value]);
  };

  const handleDownload = async (id: string, filename: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Download fehlgeschlagen');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Fehler beim Herunterladen.');
    }
  };

  const handlePreview = async (id: string, filename: string, mimeType: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Vorschau fehlgeschlagen');
      
      const blob = await res.blob();
      
      let htmlContent = undefined;
      if (filename.toLowerCase().endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          htmlContent = result.value;
        } catch (e) {
          console.error("Word preview error:", e);
        }
      }

      const url = window.URL.createObjectURL(blob);
      setPreviewDoc({ url, name: filename, mimeType: blob.type || mimeType, htmlContent });
    } catch (err) {
      alert('Fehler beim Laden der Vorschau.');
    }
  };

  const handleRename = async (id: string, currentName: string) => {
    const newName = prompt('Neuer Name für das Dokument:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const res = await fetch(`http://localhost:3000/api/documents/${id}/rename`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName })
      });
      if (!res.ok) throw new Error('Umbenennen fehlgeschlagen');
      fetchDocuments();
    } catch (err) {
      alert('Fehler beim Umbenennen.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    try {
      await fetch(`http://localhost:3000/api/documents/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDocuments();
    } catch (err) {
      alert('Fehler beim Löschen.');
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchSearch = (doc.originalName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(doc.docType);
    const locName = resolveLocationName(doc);
    const matchLoc = selectedLocations.length === 0 || selectedLocations.some(sl => locName.includes(sl));
    return matchSearch && matchType && matchLoc;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('docType', uploadType);
    formData.append('tenantId', 'default-tenant-id');
    if (uploadLocation) {
      formData.append('locationId', uploadLocation);
    }

    try {
      const res = await fetch('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fehler beim Upload');
      }

      alert('Dokument erfolgreich hochgeladen!');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadLocation('');
      fetchDocuments();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 relative font-sans">
      {/* Sidebar Filters - Modernized with soft colors and shadows */}
      <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col h-full overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-blue-500/20 shadow-lg">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-slate-800 font-extrabold tracking-tight text-lg">DMS Filter-Matrix</h2>
        </div>

        <div className="p-6 border-b border-slate-100">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Dokumentenart</h3>
          {allTypes.length > 0 ? (
            <div className="space-y-3">
              {allTypes.map(type => (
                <label key={type} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={selectedTypes.includes(type)} 
                      onChange={() => toggleFilter(setSelectedTypes, selectedTypes, type)} 
                      className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded bg-slate-50 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer" 
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">{typeLabels[type] || type}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">Noch keine Dokumente</p>
          )}
        </div>

        <div className="p-6">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Standort / Einrichtung</h3>
          {allLocations.length > 0 ? (
            <div className="space-y-3">
              {allLocations.map(loc => (
                <label key={loc} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={selectedLocations.includes(loc)} 
                      onChange={() => toggleFilter(setSelectedLocations, selectedLocations, loc)} 
                      className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded bg-slate-50 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer" 
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-600 transition-colors">{loc}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">Keine Standorte gefunden</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        <div className="p-8 pb-6 border-b border-slate-200/60 bg-white/60 backdrop-blur-md flex flex-col md:flex-row gap-6 justify-between items-start md:items-center sticky top-0 z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-indigo-900 tracking-tight mb-1">
              Dokumenten-Center
            </h1>
            <p className="text-slate-500 font-medium">Zentrale Matrix-Suche für alle hochgeladenen Dokumente</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-80 group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Nach Dokument suchen..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200/80 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Upload
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 relative">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl pointer-events-none"></div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-indigo-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
              <p className="font-medium text-slate-500">Lade Dokumenten-Matrix...</p>
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 relative z-10">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(79,70,229,0.15)] hover:border-indigo-100 transition-all duration-300 group">
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className={`p-4 rounded-xl shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${doc.docType === 'VIDEO' ? 'bg-purple-50 text-purple-600' : doc.docType === 'PDF_SDB' || doc.docType === 'SDB' ? 'bg-blue-50 text-blue-600' : doc.docType === 'BETRIEBSANWEISUNG' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg truncate pr-4 group-hover:text-indigo-700 transition-colors">{doc.originalName}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                          {typeLabels[doc.docType] || doc.docType}
                        </span>
                        <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          {resolveLocationName(doc)}
                        </span>
                        <span className="text-sm text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          {new Date(doc.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pl-6 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => handlePreview(doc.id, doc.originalName, doc.mimeType)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Vorschau">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDownload(doc.id, doc.originalName)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Herunterladen">
                      <Download className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <button onClick={() => handleRename(doc.id, doc.originalName)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Umbenennen">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Löschen">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 relative z-10">
              <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 border border-slate-100">
                <Upload className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Noch keine Dokumente</h3>
              <p className="text-slate-500 max-w-sm text-center font-medium">Laden Sie Betriebsanweisungen, Notfallpläne oder Schulungsvideos hoch, um sie hier zentral zu verwalten.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[500px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Neues Dokument hochladen</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Datei auswählen</label>
                <input 
                  type="file" 
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Dokumentenart</label>
                <select 
                  value={uploadType} 
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-600 focus:border-blue-600 outline-none"
                >
                  <option value="BETRIEBSANWEISUNG">Betriebsanweisung</option>
                  <option value="NOTFALLPLAN">Notfallplan</option>
                  <option value="STUDIE">Studie / DGUV</option>
                  <option value="VIDEO">Schulungsvideo</option>
                  <option value="SONSTIGES">Sonstiges</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Zugeordneter Standort (Optional)</label>
                <select 
                  value={uploadLocation} 
                  onChange={(e) => setUploadLocation(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-blue-600 focus:border-blue-600 outline-none"
                >
                  <option value="">-- Firmenweit (Kein spezieller Standort) --</option>
                  {locationOptions.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Lädt hoch...</>
                  ) : (
                    'Hochladen'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Vorschau: {previewDoc.name}
              </h2>
              <button 
                onClick={() => {
                  window.URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }} 
                className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-200 p-1 rounded-full shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 bg-slate-100 overflow-hidden relative flex items-center justify-center">
              {previewDoc.htmlContent ? (
                <div 
                  className="w-full h-full bg-white p-12 overflow-auto text-left text-slate-800 prose prose-slate max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewDoc.htmlContent }} 
                />
              ) : previewDoc.mimeType.includes('pdf') ? (
                <iframe src={`${previewDoc.url}#view=FitH`} className="w-full h-full border-none" title="PDF Preview" />
              ) : previewDoc.mimeType.includes('image/') ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-full object-contain" />
              ) : previewDoc.mimeType.includes('video/') ? (
                <video src={previewDoc.url} controls className="max-w-full max-h-full" />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 m-8">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-700 mb-2">Vorschau nicht verfügbar</h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Für dieses Dateiformat ({previewDoc.name.split('.').pop()?.toUpperCase() || 'Unbekannt'}) bietet der Browser leider keine integrierte Live-Vorschau an.
                  </p>
                  <a 
                    href={previewDoc.url} 
                    download={previewDoc.name}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Datei herunterladen
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
