import { useState, useEffect } from 'react';
import { Grid, Save, AlertCircle } from 'lucide-react';

export const MasterMatrixView = () => {
  const [data, setData] = useState<{ masterSubstances: any[], locations: any[] }>({ masterSubstances: [], locations: [] });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Mapping von { locId_msId : true } für initiale Checkbox States
  const [initialState, setInitialState] = useState<Record<string, boolean>>({});
  const [currentState, setCurrentState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/matrix?tenantId=default-tenant-id', { // In real app: dyn. tenant ID
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(resData => {
      setData(resData);
      
      const init: Record<string, boolean> = {};
      resData.locations.forEach((loc: any) => {
        // Prüfe ob die erste WorkArea Inventar hat
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
    
    // Berechne Delta
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

        <button 
          onClick={handleSave} 
          disabled={!hasChanges || saving}
          className="bg-primary hover:bg-slate-800 text-white px-6 py-2.5 rounded font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Speichert...' : 'Änderungen übernehmen'}
        </button>
      </div>

      <div className="bg-yellow-50 p-4 border-b border-yellow-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
        <p className="text-sm text-yellow-800">
          <strong>Juristischer Hinweis (Four-Eyes-Principle):</strong> Durch das Setzen eines Hakens und das Speichern bestätigen Sie 
          die Richtigkeit der Zuordnung dieses Stoffs zum gewählten Standort. Diese Aktion wird rechtskräftig in das Audit-Log unter Ihrer Benutzer-ID eingetragen.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th className="p-3 border-b-2 border-slate-200 bg-slate-50 sticky top-0 left-0 z-20 w-80 font-bold text-slate-700">
                Stoffe aus dem Zentralkatalog
              </th>
              {data.locations.map(loc => (
                <th key={loc.id} className="p-3 border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-10 text-center font-medium text-slate-600 min-w-[120px]">
                  {loc.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.masterSubstances.map(ms => (
              <tr key={ms.id} className="hover:bg-slate-50 border-b border-slate-100">
                <td className="p-3 border-r border-slate-100 sticky left-0 bg-white font-medium text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  {ms.productName}
                </td>
                {data.locations.map(loc => {
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
    </div>
  );
};
