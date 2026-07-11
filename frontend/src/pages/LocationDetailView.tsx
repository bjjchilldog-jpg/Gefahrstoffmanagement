import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building, AlertTriangle, CheckCircle, Save, Plus, X, Users, Search, BookOpen, Trash2 } from 'lucide-react';

export const LocationDetailView = () => {
  const { id } = useParams();
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Asbest States
  const [asbestosStatus, setAsbestosStatus] = useState<string>('UNKNOWN');
  const [constructionYear, setConstructionYear] = useState<number | ''>('');
  
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  
  // New Finding State
  const [isAddingFinding, setIsAddingFinding] = useState(false);
  const [newComponent, setNewComponent] = useState('');
  const [newSpot, setNewSpot] = useState('');
  const [newStatus, setNewStatus] = useState('Verdacht');
  const [employeesInContact, setEmployeesInContact] = useState(false);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [requiresTraining, setRequiresTraining] = useState(false);

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:3000/api/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenants = await res.json();
      let foundLoc = null;
      for (const t of tenants) {
        foundLoc = t.locations.find((l: any) => l.id === id);
        if (foundLoc) break;
      }
      if (foundLoc) {
        setLocation(foundLoc);
        setConstructionYear(foundLoc.constructionYear || '');
        if (foundLoc.constructionYear && foundLoc.constructionYear < 1993 && !foundLoc.asbestosStatus) {
          setAsbestosStatus('SUSPECTED');
        } else {
          setAsbestosStatus(foundLoc.asbestosStatus || 'UNKNOWN');
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:3000/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAllEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`http://localhost:3000/api/tenants/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          constructionYear: constructionYear || null,
          asbestosStatus
        })
      });
      alert('Standort-Daten wurden erfolgreich gespeichert.');
    } catch (e) {
      console.error(e);
      alert('Fehler beim Speichern');
    }
  };

  const handleSaveFinding = async () => {
    try {
      await fetch(`http://localhost:3000/api/tenants/locations/${id}/asbestos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: newComponent,
          exactSpot: newSpot,
          status: newStatus,
          assignedEmployeeIds: employeesInContact ? assignedEmployeeIds : [],
          requiresTraining: employeesInContact ? requiresTraining : false
        })
      });
      
      // Reset form
      setIsAddingFinding(false);
      setNewComponent('');
      setNewSpot('');
      setEmployeesInContact(false);
      setAssignedEmployeeIds([]);
      setRequiresTraining(false);
      
      // Reload data
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Fehler beim Speichern des Fundorts');
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    if (!confirm('Wirklich löschen?')) return;
    try {
      await fetch(`http://localhost:3000/api/tenants/locations/asbestos/${findingId}`, {
        method: 'DELETE'
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8">Lade Standort-Details...</div>;
  if (!location) return <div className="p-8">Standort nicht gefunden</div>;

  const showKataster = constructionYear && constructionYear < 1993 && asbestosStatus !== 'CLEARED';

  const filteredEmployees = allEmployees.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

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
                  <th className="p-3 font-medium text-orange-900">Status</th>
                  <th className="p-3 font-medium text-orange-900">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {location.asbestosFindings?.length > 0 ? location.asbestosFindings.map((finding: any) => (
                  <tr key={finding.id} className="border-t border-orange-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{finding.component}</td>
                    <td className="p-3 text-slate-600">{finding.exactSpot}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        finding.status === 'Verdacht' ? 'bg-yellow-100 text-yellow-800' :
                        finding.status === 'Bestätigt' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {finding.status}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <Link to={`/locations/${id}/asbestos/${finding.id}/ba`} className="text-blue-600 hover:text-blue-800" title="Betriebsanweisung">
                        <BookOpen className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDeleteFinding(finding.id)} className="text-red-500 hover:text-red-700" title="Löschen">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr className="border-t border-orange-100">
                    <td colSpan={4} className="p-3 text-center text-slate-500">Bisher keine Fundorte erfasst.</td>
                  </tr>
                )}
                
                {!isAddingFinding && (
                  <tr className="border-t border-orange-100 bg-orange-50/30">
                    <td colSpan={4} className="p-3 text-center text-orange-600 hover:bg-orange-100 cursor-pointer transition-colors" onClick={() => setIsAddingFinding(true)}>
                      <Plus className="w-4 h-4 inline-block mr-1" /> Fundort hinzufügen
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {isAddingFinding && (
              <div className="p-4 border-t border-orange-200 bg-orange-50/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Neuen Fundort erfassen</h3>
                  <button onClick={() => setIsAddingFinding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Bauteil</label>
                    <input type="text" value={newComponent} onChange={e => setNewComponent(e.target.value)} className="w-full text-sm border-slate-300 rounded" placeholder="z.B. Floor-Flex-Platten" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Genauer Fundort</label>
                    <input type="text" value={newSpot} onChange={e => setNewSpot(e.target.value)} className="w-full text-sm border-slate-300 rounded" placeholder="z.B. Heizungskeller Wand X" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full text-sm border-slate-300 rounded">
                      <option value="Verdacht">Verdacht</option>
                      <option value="Bestätigt">Bestätigt (Analyse liegt vor)</option>
                      <option value="Saniert">Saniert</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white p-4 rounded border border-slate-200 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-blue-600 rounded" 
                      checked={employeesInContact} 
                      onChange={e => setEmployeesInContact(e.target.checked)} 
                    />
                    <div className="font-bold text-slate-800">
                      Kommen Beschäftigte mit diesem Asbest-Bauteil in Kontakt?
                      <p className="text-xs font-normal text-slate-500">z.B. durch Handwerksarbeiten, Bohren oder Demontage. Wenn sie nur den Raum betreten (z.B. Heizkeller), ohne das Bauteil zu bearbeiten, bleibt das Häkchen leer.</p>
                    </div>
                  </label>
                </div>

                {employeesInContact && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                    <div className="flex gap-2 items-center mb-4">
                      <Users className="w-5 h-5 text-blue-700" />
                      <h4 className="font-bold text-blue-900">Beschäftigte der Asbest-Exposition zuweisen</h4>
                    </div>

                    <div className="relative mb-4">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Mitarbeiter suchen..." 
                        className="w-full pl-9 text-sm border-slate-300 rounded focus:ring-blue-500"
                        value={employeeSearch}
                        onChange={e => setEmployeeSearch(e.target.value)}
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded p-2 mb-4">
                      {filteredEmployees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                          <input 
                            type="checkbox" 
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            checked={assignedEmployeeIds.includes(emp.id)}
                            onChange={(e) => {
                              if (e.target.checked) setAssignedEmployeeIds([...assignedEmployeeIds, emp.id]);
                              else setAssignedEmployeeIds(assignedEmployeeIds.filter(id => id !== emp.id));
                            }}
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-800">{emp.lastName}, {emp.firstName}</div>
                            <div className="text-xs text-slate-500">{emp.department}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 mb-2 p-3 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50">
                      <input 
                        type="checkbox" 
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        checked={requiresTraining}
                        onChange={e => setRequiresTraining(e.target.checked)}
                      />
                      <span className="text-sm font-bold text-blue-900">
                        Unterweisungsbedarf (TRGS 519) an LMS melden
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAddingFinding(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Abbrechen</button>
                  <button onClick={handleSaveFinding} disabled={!newComponent || !newSpot} className="px-4 py-2 text-sm font-bold bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50">Fundort speichern</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
