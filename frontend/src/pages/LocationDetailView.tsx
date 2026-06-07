import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Building, AlertTriangle, CheckCircle, Save, Plus } from 'lucide-react';

export const LocationDetailView = () => {
  const { id } = useParams();
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Asbest States
  const [asbestosStatus, setAsbestosStatus] = useState<string>('UNKNOWN');
  const [constructionYear, setConstructionYear] = useState<number | ''>('');
  
  useEffect(() => {
    // In einer echten App: Hole Location per API
    // Für diesen Prototyp mocken wir die Daten basierend auf dem bisherigen Stand
    fetch('http://localhost:3000/api/tenants')
      .then(res => res.json())
      .then(tenants => {
        let foundLoc = null;
        for (const t of tenants) {
          foundLoc = t.locations.find((l: any) => l.id === id);
          if (foundLoc) break;
        }
        if (foundLoc) {
          setLocation(foundLoc);
          setConstructionYear(foundLoc.constructionYear || '');
          // Automatik: Baujahr < 1993 -> Generalvermutung
          if (foundLoc.constructionYear && foundLoc.constructionYear < 1993 && !foundLoc.asbestosStatus) {
            setAsbestosStatus('SUSPECTED');
          } else {
            setAsbestosStatus(foundLoc.asbestosStatus || 'UNKNOWN');
          }
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = () => {
    // API Call an Backend zum Speichern
    alert('Standort-Daten inkl. Asbest-Kataster wurden gespeichert (API Mock).');
  };

  if (loading) return <div className="p-8">Lade Standort-Details...</div>;
  if (!location) return <div className="p-8">Standort nicht gefunden</div>;

  const showKataster = constructionYear && constructionYear < 1993 && asbestosStatus !== 'CLEARED';

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full overflow-y-auto pb-12">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <Building className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{location.name}</h1>
            <p className="text-sm text-slate-500">Standort-Details & Gebäude-Schadstoffe</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Baujahr</label>
            <input 
              type="number" 
              value={constructionYear}
              onChange={(e) => setConstructionYear(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full border-slate-300 rounded-md focus:ring-primary focus:border-primary" 
              placeholder="z.B. 1985"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asbest-Status</label>
            <select 
              value={asbestosStatus}
              onChange={(e) => setAsbestosStatus(e.target.value)}
              className="w-full border-slate-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="UNKNOWN">Unbekannt / Nicht geprüft</option>
              <option value="SUSPECTED">Nicht sicher (Generalvermutung)</option>
              <option value="CLEARED">Nachweislich schadstofffrei (Kernsanierung)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="bg-primary hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2">
            <Save className="w-4 h-4" /> Speichern
          </button>
        </div>
      </div>

      {showKataster && (
        <div className="bg-orange-50 p-6 rounded-lg shadow-sm border border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-orange-800">Dynamisches Asbest-Kataster (TRGS 519)</h2>
              <p className="text-sm text-orange-700 mt-1">
                Aufgrund des Baujahrs ({constructionYear}) gilt für dieses Gebäude eine Asbest-Generalvermutung. 
                Erfassen Sie hier bekannte Fundorte, um bei Handwerksarbeiten die korrekten Betriebsanweisungen auszulösen.
              </p>
            </div>
          </div>

          <div className="bg-white rounded border border-orange-200 overflow-hidden mt-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-orange-100/50">
                <tr>
                  <th className="p-3 font-medium text-orange-900">Bauteil (Katalog)</th>
                  <th className="p-3 font-medium text-orange-900">Genauer Fundort</th>
                  <th className="p-3 font-medium text-orange-900">Gefährdung</th>
                  <th className="p-3 font-medium text-orange-900">Aktion</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-orange-100">
                  <td className="p-3">Floor-Flex-Platten</td>
                  <td className="p-3">Kellergang 1 bis 3</td>
                  <td className="p-3 text-red-600 font-medium">Grosstätigkeit</td>
                  <td className="p-3 text-slate-500">Demo</td>
                </tr>
                <tr className="border-t border-orange-100 bg-orange-50/30">
                  <td colSpan={4} className="p-3 text-center text-orange-600 hover:bg-orange-100 cursor-pointer transition-colors">
                    <Plus className="w-4 h-4 inline-block mr-1" /> Fundort hinzufügen
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
