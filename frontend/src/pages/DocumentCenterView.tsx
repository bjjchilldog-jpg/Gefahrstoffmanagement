import { useState, useEffect } from 'react';
import { FileText, Search, Filter, Upload, Trash2, Loader2 } from 'lucide-react';

export const DocumentCenterView = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Echte Daten vom Backend laden
  useEffect(() => {
    fetchDocuments();
    fetchTenants();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/documents');
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Fehler beim Laden der Dokumente:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/tenants');
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error('Fehler beim Laden der Mandanten:', err);
    }
  };

  // Dynamische Standort-Liste aus echten Tenants
  const allLocations: string[] = [];
  tenants.forEach((t: any) => {
    t.locations?.forEach((l: any) => {
      if (!allLocations.includes(l.name)) allLocations.push(l.name);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    try {
      await fetch(`http://localhost:3000/api/documents/${id}`, { method: 'DELETE' });
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

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar Filters */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-800 font-bold">
          <Filter className="w-5 h-5 text-blue-600" />
          DMS Filter-Matrix
        </div>

        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dokumentenart</h3>
          {allTypes.length > 0 ? allTypes.map(type => (
            <label key={type} className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-700 hover:text-blue-600">
              <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleFilter(setSelectedTypes, selectedTypes, type)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              {typeLabels[type] || type}
            </label>
          )) : (
            <p className="text-xs text-slate-400 italic">Noch keine Dokumente vorhanden</p>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Standort / Einrichtung</h3>
          {allLocations.length > 0 ? allLocations.map(loc => (
            <label key={loc} className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-700 hover:text-blue-600">
              <input type="checkbox" checked={selectedLocations.includes(loc)} onChange={() => toggleFilter(setSelectedLocations, selectedLocations, loc)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              {loc}
            </label>
          )) : (
            <p className="text-xs text-slate-400 italic">Keine Standorte gefunden</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-200 bg-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dokumenten-Center</h1>
            <p className="text-slate-500">Zentrale Matrix-Suche für alle hochgeladenen Dokumente</p>
          </div>
          <div className="relative w-80">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nach Dokument suchen..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-600 focus:border-blue-600 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              Lade Dokumente...
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                    <th className="p-4 font-medium">Dokument</th>
                    <th className="p-4 font-medium">Kategorie</th>
                    <th className="p-4 font-medium">Einrichtung</th>
                    <th className="p-4 font-medium text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <FileText className={`w-5 h-5 ${doc.docType === 'VIDEO' ? 'text-purple-500' : doc.docType === 'PDF_SDB' || doc.docType === 'SDB' ? 'text-blue-500' : 'text-red-500'}`} />
                          <div>
                            <p className="font-bold text-slate-800">{doc.originalName}</p>
                            <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString('de-DE')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                          {typeLabels[doc.docType] || doc.docType}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{resolveLocationName(doc)}</td>
                      <td className="p-4 text-right flex gap-2 justify-end">
                        <button onClick={() => handleDelete(doc.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Löschen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Upload className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-lg font-medium text-slate-500">Noch keine Dokumente vorhanden</p>
              <p className="text-sm mt-1">Laden Sie SDBs oder Betriebsanweisungen über das Gefahrstoff-Kataster hoch.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
