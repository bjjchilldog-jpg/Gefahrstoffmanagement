import { useState, useEffect } from 'react';
import { Grid, Save, AlertCircle, Search } from 'lucide-react';
import { ProfileManagerView } from './ProfileManagerView';

export const MasterMatrixView = () => {
  const [data, setData] = useState<{ masterSubstances: any[], locations: any[] }>({ masterSubstances: [], locations: [] });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'profiles' | 'reverse'>('matrix');
  
  // Mapping von { locId_msId : true } für initiale Checkbox States
  const [initialState, setInitialState] = useState<Record<string, boolean>>({});
  const [currentState, setCurrentState] = useState<Record<string, boolean>>({});

  // Reverse Search State
  const [reverseSubstanceId, setReverseSubstanceId] = useState('');
  const [reverseResults, setReverseResults] = useState<any>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  useEffect(() => {
    fetch('/api/matrix?tenantId=default-tenant-id', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.error || !resData.locations) {
        console.error('API Error:', resData.error || 'Missing locations in response');
        return;
      }
      setData(resData);
      
      const init: Record<string, boolean> = {};
      resData.locations.forEach((loc: any) => {
        const wa = loc.workAreas?.[0];
        if (wa && wa.inventories) {
          wa.inventories.forEach((inv: any) => {
            init[`${loc.id}_${inv.masterSubstanceId}`] = true;
          });
        }
      });
      setInitialState(init);
      setCurrentState(init);
    })
    .catch(console.error);
  }, []);

  const toggleAssignment = (locId: string, msId: string) => {
    const key = `${locId}_${msId}`;
    setCurrentState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasChanges = JSON.stringify(initialState) !== JSON.stringify(currentState);

  const handleSave = async () => {
    setSaving(true);
    const changes = [];
    for (const key in currentState) {
      if (currentState[key] !== initialState[key]) {
        const [locId, msId] = key.split('_');
        changes.push({
          locationId: locId,
          masterSubstanceId: msId,
          action: currentState[key] ? 'add' : 'remove'
        });
      }
    }
    try {
      await fetch('/api/matrix/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assignments: changes })
      });
      setInitialState(currentState);
      alert('Matrix erfolgreich gespeichert.');
    } catch (err) {
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleReverseSearch = async () => {
    if (!reverseSubstanceId) return;
    setReverseLoading(true);
    try {
      const res = await fetch(`/api/matrix/reverse?substanceId=${reverseSubstanceId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      setReverseResults(result);
    } catch (err) {
      console.error(err);
    } finally {
      setReverseLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Grid className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Master-Zuweisungs-Matrix</h1>
            <p className="text-sm text-slate-500">Massen-Zuweisung von Katalogstoffen an Standorte</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'matrix' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Matrix-Zuweisung
          </button>
          <button 
            onClick={() => setActiveTab('reverse')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'reverse' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🔍 Stoff-Suche
          </button>
          <button 
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'profiles' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Profile verwalten
          </button>
        </div>

        {activeTab === 'matrix' && (
          <button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="bg-primary hover:bg-slate-800 text-white px-6 py-2.5 rounded font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Speichert...' : 'Änderungen übernehmen'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {activeTab === 'matrix' ? (
          <>
            <div className="bg-yellow-50 p-4 border-b border-yellow-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Juristischer Hinweis (Four-Eyes-Principle):</strong> Durch das Setzen eines Hakens und das Speichern bestätigen Sie 
                die Richtigkeit der Zuordnung dieses Stoffs zum gewählten Standort. Diese Aktion wird rechtskräftig in das Audit-Log unter Ihrer Benutzer-ID eingetragen.
              </p>
            </div>
            <div className="overflow-auto h-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="p-3 border-b-2 border-slate-200 bg-slate-50 sticky top-0 left-0 z-20 w-80 font-bold text-slate-700">
                      Stoffe aus dem Zentralkatalog
                    </th>
                    {(data.locations || []).map(loc => (
                      <th key={loc.id} className="p-3 border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-10 text-center font-medium text-slate-600 min-w-[120px]">
                        {loc.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.masterSubstances || []).map(ms => (
                    <tr key={ms.id} className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="p-3 border-r border-slate-100 sticky left-0 bg-white font-medium text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {ms.productName}
                      </td>
                      {(data.locations || []).map(loc => {
                        const key = `${loc.id}_${ms.id}`;
                        return (
                          <td key={key} className="p-3 text-center border-r border-slate-100 last:border-r-0">
                            <input 
                              type="checkbox" 
                              checked={!!currentState[key]}
                              onChange={() => toggleAssignment(loc.id, ms.id)}
                              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'reverse' ? (
          /* ======= Umgekehrte Suche: In welchen Häusern ist ein Stoff im Einsatz? ======= */
          <div className="max-w-3xl">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Umgekehrte Suche</h2>
            <p className="text-sm text-slate-500 mb-6">In welchen Standorten / Arbeitsbereichen ist ein bestimmter Stoff aus dem Zentralkatalog im Einsatz?</p>
            
            <div className="flex gap-3 mb-6">
              <select
                value={reverseSubstanceId}
                onChange={(e) => setReverseSubstanceId(e.target.value)}
                className="flex-1 p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Stoff auswählen --</option>
                {(data.masterSubstances || []).map((ms: any) => (
                  <option key={ms.id} value={ms.id}>{ms.productName} {ms.manufacturer ? `(${ms.manufacturer})` : ''}</option>
                ))}
              </select>
              <button 
                onClick={handleReverseSearch}
                disabled={!reverseSubstanceId || reverseLoading}
                className="bg-primary hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                {reverseLoading ? 'Suche...' : 'Suchen'}
              </button>
            </div>

            {reverseResults && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">
                    {reverseResults.substanceName}
                    <span className="ml-3 text-sm font-normal text-slate-500">
                      {reverseResults.totalAssignments} Zuweisung{reverseResults.totalAssignments !== 1 ? 'en' : ''} gefunden
                    </span>
                  </h3>
                </div>
                {reverseResults.totalAssignments === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    Dieser Stoff ist keinem Standort/Arbeitsbereich zugewiesen.
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-sm">
                        <th className="p-3 font-medium">Mandant</th>
                        <th className="p-3 font-medium">Standort</th>
                        <th className="p-3 font-medium">Arbeitsbereich</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Jahresmenge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reverseResults.assignments.map((a: any, i: number) => (
                        <tr key={a.inventoryId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-3 text-slate-700">{a.tenantName}</td>
                          <td className="p-3 font-medium text-slate-800">{a.locationName}</td>
                          <td className="p-3 text-slate-700">{a.workAreaName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{a.annualAmount ? `${a.annualAmount} kg/a` : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ) : (
          <ProfileManagerView />
        )}
      </div>
    </div>
  );
};
