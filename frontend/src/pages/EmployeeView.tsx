import { useState, useEffect } from 'react';
import { Users, Plus, ShieldAlert, Copy, Trash2, Activity, Download } from 'lucide-react';

export const EmployeeView = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [substances, setSubstances] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  
  // New Employee State
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDept, setNewDept] = useState('');
  
  // New Exposure State
  const [newSubstanceId, setNewSubstanceId] = useState('');
  const [newVorsorge, setNewVorsorge] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loadData = async () => {
    try {
      const [empRes, subRes] = await Promise.all([
        fetch('http://localhost:3000/api/employees').then(r => r.json()),
        fetch('http://localhost:3000/api/substances').then(r => r.json())
      ]);
      setEmployees(empRes);
      // Extrahiere die HazardousSubstanceMaster Daten, falls es eine gemischte Liste ist
      setSubstances(subRes);
      
      if (selectedEmployee) {
        const updated = empRes.find((e: any) => e.id === selectedEmployee.id);
        if (updated) setSelectedEmployee(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEmployee = async () => {
    try {
      await fetch('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          department: newDept
        })
      });
      setShowNewEmployee(false);
      setNewFirstName('');
      setNewLastName('');
      setNewDept('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExposure = async () => {
    if (!selectedEmployee || !newSubstanceId) return;
    try {
      await fetch(`http://localhost:3000/api/employees/${selectedEmployee.id}/exposures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterSubstanceId: newSubstanceId,
          vorsorgeFrist: newVorsorge,
          notes: newNotes
        })
      });
      setNewSubstanceId('');
      setNewVorsorge('');
      setNewNotes('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExposure = async (exposureId: string) => {
    try {
      await fetch(`http://localhost:3000/api/employees/${selectedEmployee.id}/exposures/${exposureId}`, {
        method: 'DELETE'
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleZEDExport = () => {
    // Generiert eine CSV-Datei gemäß ZED Vorgaben
    let csv = "Vorname;Nachname;Abteilung;Gefahrstoff;CAS;Expositionsart;Bemerkung\n";
    employees.forEach(emp => {
      emp.exposures.forEach((exp: any) => {
        if (exp.masterSubstance.isKrebserzeugend || exp.masterSubstance.isMutagen || exp.exposureType === 'BIOSTOFF') {
          csv += `${emp.firstName};${emp.lastName};${emp.department || ''};${exp.masterSubstance.productName};;${exp.exposureType};${exp.notes || ''}\n`;
        }
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ZED_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Personal & ArbMedVV (ZED)
          </h1>
          <p className="text-slate-500 mt-2">Personenbezogene Gefährdungsbeurteilung und Vorsorgefristen</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleZEDExport} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
            <Download className="w-5 h-5" /> ZED-Export (TRGS 410)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT: Employee List */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[800px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">Mitarbeiter</h2>
            <button onClick={() => setShowNewEmployee(true)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 p-2 rounded-full">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {showNewEmployee && (
              <div className="p-4 border-b border-indigo-100 bg-indigo-50/30">
                <input type="text" placeholder="Vorname" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} className="w-full mb-2 p-2 border border-slate-300 rounded text-sm" />
                <input type="text" placeholder="Nachname" value={newLastName} onChange={e => setNewLastName(e.target.value)} className="w-full mb-2 p-2 border border-slate-300 rounded text-sm" />
                <input type="text" placeholder="Abteilung (z.B. Haustechnik)" value={newDept} onChange={e => setNewDept(e.target.value)} className="w-full mb-2 p-2 border border-slate-300 rounded text-sm" />
                <div className="flex gap-2">
                  <button onClick={handleCreateEmployee} className="flex-1 bg-indigo-600 text-white py-1 rounded text-sm font-bold">Speichern</button>
                  <button onClick={() => setShowNewEmployee(false)} className="flex-1 bg-white border border-slate-300 text-slate-600 py-1 rounded text-sm">Abbrechen</button>
                </div>
              </div>
            )}
            
            {employees.map(emp => (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedEmployee?.id === emp.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div className="font-bold text-slate-800">{emp.lastName}, {emp.firstName}</div>
                <div className="text-xs text-slate-500">{emp.department || 'Keine Abteilung'}</div>
                {emp.exposures.length > 0 && (
                  <div className="mt-2 text-xs font-bold bg-orange-100 text-orange-800 inline-block px-2 py-0.5 rounded-full">
                    {emp.exposures.length} Expositionen
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Employee Details & Exposures */}
        <div className="md:col-span-2">
          {selectedEmployee ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                  <p className="text-slate-500">{selectedEmployee.department}</p>
                </div>
                <button 
                  onClick={async () => {
                    const sourceName = prompt("Mitarbeiter-Name oder ID, von dem kopiert werden soll (Für die Demo bitte exakte ID eingeben):");
                    if (sourceName) {
                      try {
                        await fetch('http://localhost:3000/api/employees/clone', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sourceEmployeeId: sourceName,
                            targetEmployeeId: selectedEmployee.id
                          })
                        });
                        loadData();
                        alert("Erfolgreich kopiert!");
                      } catch (err) {
                        alert("Fehler beim Kopieren.");
                      }
                    }
                  }}
                  className="text-sm font-bold text-slate-600 hover:text-indigo-600 border border-slate-300 rounded px-3 py-1.5 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Profil von jemandem kopieren
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5" /> Neue Exposition zuweisen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">Stoff aus Kataster</label>
                    <select value={newSubstanceId} onChange={e => setNewSubstanceId(e.target.value)} className="w-full text-sm border-orange-300 rounded focus:ring-orange-500">
                      <option value="">Bitte wählen...</option>
                      {substances.map(s => (
                        <option key={s.id} value={s.id}>{s.productName} {s.isKrebserzeugend || s.isMutagen ? '(CMR!)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">ArbMedVV Vorsorge (z.B. G24, G20)</label>
                    <input type="text" value={newVorsorge} onChange={e => setNewVorsorge(e.target.value)} className="w-full text-sm border-orange-300 rounded focus:ring-orange-500" placeholder="G 24 Haut" />
                  </div>
                  <div className="col-span-2 flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-orange-800 mb-1">Bemerkung</label>
                      <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="w-full text-sm border-orange-300 rounded focus:ring-orange-500" placeholder="Zusätzliche Infos..." />
                    </div>
                    <button onClick={handleAddExposure} disabled={!newSubstanceId} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50">
                      Zuweisen
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 mb-4">Erfasste Gefährdungen & Fristen</h3>
              {selectedEmployee.exposures.length === 0 ? (
                <p className="text-slate-500 italic text-sm">Keine Expositionen zugewiesen.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-3">Stoff</th>
                        <th className="p-3">Gefährdung</th>
                        <th className="p-3">Vorsorge (ArbMedVV)</th>
                        <th className="p-3">Bemerkung</th>
                        <th className="p-3">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedEmployee.exposures.map((exp: any) => (
                        <tr key={exp.id}>
                          <td className="p-3 font-medium text-slate-800">
                            {exp.masterSubstance.productName}
                            {(exp.masterSubstance.isKrebserzeugend || exp.masterSubstance.isMutagen) && (
                              <span className="ml-2 inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                <ShieldAlert className="w-3 h-3" /> TRGS 410 / ZED
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{exp.exposureType}</td>
                          <td className="p-3 font-bold text-indigo-700">{exp.vorsorgeFrist || '-'}</td>
                          <td className="p-3 text-slate-500">{exp.notes || '-'}</td>
                          <td className="p-3">
                            <button onClick={() => handleDeleteExposure(exp.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center flex flex-col items-center justify-center h-[800px]">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-4">
                <Users className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Kein Mitarbeiter ausgewählt</h2>
              <p className="text-slate-500 max-w-sm">Wählen Sie links einen Mitarbeiter aus oder legen Sie einen neuen an, um die personenbezogene Gefährdungsbeurteilung durchzuführen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
