import { useState, useEffect } from 'react';
import { Users, Plus, ShieldAlert, Copy, Trash2, Activity, Download, BookOpen, CheckCircle } from 'lucide-react';

export const EmployeeView = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [substances, setSubstances] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  
  // New Employee State
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newDob, setNewDob] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<{id: string, name: string}[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  
  // New Exposure State
  const [newSubstanceId, setNewSubstanceId] = useState('');
  const [newVorsorge, setNewVorsorge] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  // Manual ArbMedVV State
  const [newManualTagType, setNewManualTagType] = useState('Pflichtvorsorge');
  const [newManualTagReason, setNewManualTagReason] = useState('');
  const [newManualTagCustomReason, setNewManualTagCustomReason] = useState('');
  const loadData = async () => {
    try {
      const [empRes, subRes, tenantsRes] = await Promise.all([
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/substances').then(r => r.json()),
        fetch('/api/tenants').then(r => r.json()).catch(() => [])
      ]);
      setEmployees(empRes);
      // Extrahiere die HazardousSubstanceMaster Daten, falls es eine gemischte Liste ist
      const hazardous = subRes.hazardous || [];
      const biological = subRes.biological || [];
      setSubstances(Array.isArray(subRes) ? subRes : [...hazardous, ...biological]);
      
      let areas: {id: string, name: string, cleanName?: string}[] = [];
      if (Array.isArray(tenantsRes)) {
        tenantsRes.forEach(t => {
          t.locations?.forEach((l: any) => {
            areas.push({ id: `loc_${l.id}`, name: `Standort: ${l.name}` });
            const extractAreas = (waList: any[], indent = '') => {
              waList.forEach(wa => {
                areas.push({ id: wa.id, name: `${indent}└ ${wa.name}`, cleanName: wa.name });
                if (wa.children) extractAreas(wa.children, indent + '  ');
              });
            };
            if (l.workAreas) extractAreas(l.workAreas, '  ');
          });
        });
      }
      if (areas.length === 0) {
        areas = [
          { id: '1', name: 'Standort (Allgemein)', cleanName: 'Standort (Allgemein)' },
          { id: '2', name: 'Labor', cleanName: 'Labor' },
          { id: '3', name: 'Schreinerei', cleanName: 'Schreinerei' },
          { id: '4', name: 'Verwaltung', cleanName: 'Verwaltung' },
          { id: '5', name: 'Reinigung', cleanName: 'Reinigung' }
        ];
      }
      setAvailableDepartments(areas);
      
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
      await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          department: selectedDepts.length > 0 ? selectedDepts.join(', ') : newDept,
          dateOfBirth: newDob ? newDob : undefined
        })
      });
      setShowNewEmployee(false);
      setNewFirstName('');
      setNewLastName('');
      setNewDept('');
      setNewDob('');
      setSelectedDepts([]);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExposure = async () => {
    if (!selectedEmployee || !newSubstanceId) return;
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}/exposures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterSubstanceId: newSubstanceId,
          vorsorgeFrist: newVorsorge,
          notes: newNotes
        })
      });
      if (!res.ok) throw new Error("API Fehler");
      
      setNewSubstanceId('');
      setNewVorsorge('');
      setNewNotes('');
      
      // Update data immediately
      const empRes = await fetch('/api/employees').then(r => r.json());
      setEmployees(empRes);
      const updated = empRes.find((e: any) => e.id === selectedEmployee.id);
      if (updated) setSelectedEmployee(updated);
      
      alert("Erfolgreich zugewiesen.");
    } catch (err) {
      console.error(err);
      alert("Fehler beim Zuweisen.");
    }
  };

  const handleAddManualTag = async () => {
    if (!selectedEmployee) return;
    
    let finalReason = newManualTagReason;
    if (newManualTagReason === 'Weitere (Eigene Eingabe)') {
      finalReason = newManualTagCustomReason.trim();
    }
    
    if (!finalReason) return;
    
    const tagToSave = `${newManualTagType}: ${finalReason}`;
    
    try {
      const currentTags = selectedEmployee.manualVorsorgen ? selectedEmployee.manualVorsorgen.split(',') : [];
      if (!currentTags.includes(tagToSave)) {
        currentTags.push(tagToSave);
        await fetch(`/api/employees/${selectedEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manualVorsorgen: currentTags.join(',') })
        });
        setNewManualTagReason('');
        setNewManualTagCustomReason('');
        
        const empRes = await fetch('/api/employees').then(r => r.json());
        setEmployees(empRes);
        const updated = empRes.find((e: any) => e.id === selectedEmployee.id);
        if (updated) setSelectedEmployee(updated);
      }
    } catch (err) {
      console.error(err);
      alert("Fehler beim Hinzufügen.");
    }
  };

  const handleRemoveManualTag = async (tagToRemove: string) => {
    if (!selectedEmployee) return;
    try {
      const currentTags = selectedEmployee.manualVorsorgen ? selectedEmployee.manualVorsorgen.split(',') : [];
      const updatedTags = currentTags.filter((t: string) => t !== tagToRemove);
      await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualVorsorgen: updatedTags.join(',') })
      });
      
      const empRes = await fetch('/api/employees').then(r => r.json());
      setEmployees(empRes);
      const updated = empRes.find((e: any) => e.id === selectedEmployee.id);
      if (updated) setSelectedEmployee(updated);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Entfernen.");
    }
  };

  const handleRemoveExposure = async (exposureId: string) => {
    try {
      await fetch(`/api/employees/${selectedEmployee.id}/exposures/${exposureId}`, {
        method: 'DELETE'
      });
      const empRes = await fetch('/api/employees').then(r => r.json());
      setEmployees(empRes);
      const updated = empRes.find((e: any) => e.id === selectedEmployee.id);
      if (updated) setSelectedEmployee(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleZEDExport = () => {
    // Generiert eine CSV-Datei gemäß ZED Vorgaben
    let csv = "Vorname;Nachname;Abteilung;Gefahrstoff;CAS;Expositionsart;Bemerkung\n";
    employees.forEach(emp => {
      emp.exposures.forEach((exp: any) => {
        if (exp.masterSubstance?.isKrebserzeugend || exp.masterSubstance?.isMutagen || exp.exposureType === 'BIOSTOFF') {
          csv += `${emp.firstName};${emp.lastName};${emp.department || ''};${exp.masterSubstance?.productName || ''};;${exp.exposureType};${exp.notes || ''}\n`;
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
                <input type="date" value={newDob} onChange={e => setNewDob(e.target.value)} className="w-full mb-4 p-2 border border-slate-300 rounded text-sm text-slate-500" title="Geburtsdatum (für u18-Prüfung)" />
                
                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Abteilung(en) aus Strukturbaum wählen:</label>
                  <div className="max-h-32 overflow-y-auto bg-white border border-slate-300 rounded p-2 text-sm shadow-inner">
                    {availableDepartments.map((dept: any) => {
                      const cleanName = dept.cleanName || dept.name.replace(/^(Standort:\s*|[\s\u2514\u251C\u2500\u2502]+)/, '');
                      const isChecked = selectedDepts.includes(cleanName);
                      return (
                        <label key={dept.id} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-slate-50">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDepts([...selectedDepts, cleanName]);
                              } else {
                                setSelectedDepts(selectedDepts.filter(d => d !== cleanName));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="whitespace-pre font-medium text-slate-700">{dept.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <input type="text" placeholder="Oder Freitext (falls nicht im Baum)" value={newDept} onChange={e => setNewDept(e.target.value)} className="w-full mb-3 p-2 border border-slate-300 rounded text-sm bg-slate-50" />

                <div className="flex gap-2">
                  <button onClick={handleCreateEmployee} className="flex-1 bg-indigo-600 text-white py-1 rounded text-sm font-bold">Speichern</button>
                  <button onClick={() => setShowNewEmployee(false)} className="flex-1 bg-white border border-slate-300 text-slate-600 py-1 rounded text-sm">Abbrechen</button>
                </div>
              </div>
            )}
            
            {employees.map(emp => {
              const getLmsStatus = () => {
                if (!emp.trainingRecords || emp.trainingRecords.length === 0) return null;
                const now = new Date();
                let hasOverdue = false;
                let hasPending = false;
                emp.trainingRecords.forEach((rec: any) => {
                  if (rec.status === 'ASSIGNED') hasPending = true;
                  if (rec.status === 'COMPLETED' && rec.validUntil && new Date(rec.validUntil) < now) hasOverdue = true;
                });
                if (hasOverdue) return { label: 'Überfällig', color: 'bg-red-500' };
                if (hasPending) return { label: 'In Umsetzung', color: 'bg-amber-400' };
                return { label: 'Erledigt', color: 'bg-emerald-500' };
              };
              const lmsStatus = getLmsStatus();

              return (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex justify-between items-start ${selectedEmployee?.id === emp.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div>
                  <div className="font-bold text-slate-800">{emp.lastName}, {emp.firstName}</div>
                  <div className="text-xs text-slate-500">{emp.department || 'Keine Abteilung'}</div>
                  {emp.exposures && emp.exposures.length > 0 && (
                    <div className="mt-2 text-xs font-bold bg-orange-100 text-orange-800 inline-block px-2 py-0.5 rounded-full">
                      {emp.exposures.length} Expositionen
                    </div>
                  )}
                </div>
                {lmsStatus && (
                  <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full text-white ${lmsStatus.color}`}>
                    {lmsStatus.label}
                  </div>
                )}
              </div>
            )})}
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
                        await fetch('/api/employees/clone', {
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
                        <option key={s.id} value={s.id}>{s.productName || s.name} {s.isKrebserzeugend || s.isMutagen ? '(CMR!)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">ArbMedVV Vorsorge (Anlass/Frist)</label>
                    <input type="text" value={newVorsorge} onChange={e => setNewVorsorge(e.target.value)} className="w-full text-sm border-orange-300 rounded focus:ring-orange-500" placeholder="z.B. Pflichtvorsorge: Feuchtarbeit" />
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

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5" /> Sonstige ArbMedVV-Vorsorgen (Manuell)</h3>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex gap-4 items-end">
                    <div className="w-1/3">
                      <label className="block text-xs font-bold text-emerald-800 mb-1">Vorsorge-Typ</label>
                      <select value={newManualTagType} onChange={e => setNewManualTagType(e.target.value)} className="w-full text-sm border-emerald-300 rounded focus:ring-emerald-500">
                        <option value="Pflichtvorsorge">Pflichtvorsorge</option>
                        <option value="Angebotsvorsorge">Angebotsvorsorge</option>
                        <option value="Wunschvorsorge">Wunschvorsorge</option>
                        <option value="Eignungsbeurteilung">Eignungsbeurteilung</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-emerald-800 mb-1">Anlass / Gefährdung</label>
                      <select value={newManualTagReason} onChange={e => setNewManualTagReason(e.target.value)} className="w-full text-sm border-emerald-300 rounded focus:ring-emerald-500">
                        <option value="">Bitte wählen...</option>
                        <option value="Exposition mit diversen Gefahrstoffen">Exposition mit diversen Gefahrstoffen</option>
                        <option value="Exposition durch Staub nicht ausgeschlossen (auch Holz-, Mehl-, Futtermittel-, Labortierstaub und Hochtemperaturwollen)">Exposition durch Staub nicht ausgeschlossen (auch Holz-, Mehl-, Futtermittel-, Labortierstaub und Hochtemperaturwollen)</option>
                        <option value="Feuchtarbeit und insb. Benutzung von Naturgummilatexhandschuhen">Feuchtarbeit und insb. Benutzung von Naturgummilatexhandschuhen</option>
                        <option value="Schweiß- und Trenntätigkeiten (Einfluss von Schweißrauch)">Schweiß- und Trenntätigkeiten (Einfluss von Schweißrauch)</option>
                        <option value="Schädlingsbekämpfung / Begasung">Schädlingsbekämpfung / Begasung</option>
                        <option value="gezielte Tätigkeiten mit biologischen oder gentechnischen Arbeitsstoffen">gezielte Tätigkeiten mit biologischen oder gentechnischen Arbeitsstoffen</option>
                        <option value="nicht gezielte Tätigkeiten mit biologischen und gentechn. Stoffen (Abwasser, Medizin, Betreuung, Kinder, Tiere, Insekten, ...)">nicht gezielte Tätigkeiten mit biologischen und gentechn. Stoffen (Abwasser, Medizin, Betreuung, Kinder, Tiere, Insekten, ...)</option>
                        <option value="Tätigkeiten mit erhöhten körperlichen Belastungen (Muskel-Skelett-System) (z.B. Heben und Tragen, Zwangshaltung)">Tätigkeiten mit erhöhten körperlichen Belastungen (Muskel-Skelett-System) (z.B. Heben und Tragen, Zwangshaltung)</option>
                        <option value="Tätigkeiten mit Hitze- oder Kältebelastung">Tätigkeiten mit Hitze- oder Kältebelastung</option>
                        <option value="Tätigkeiten mit Exposition durch Lärm oder Vibrationen">Tätigkeiten mit Exposition durch Lärm oder Vibrationen</option>
                        <option value="Tätigkeiten mit Atemschutz (auch FFP-Masken) / in Druckluft / unter Wasser">Tätigkeiten mit Atemschutz (auch FFP-Masken) / in Druckluft / unter Wasser</option>
                        <option value="Tätigkeiten mit Exposition durch künstliche optische Strahlung (z.B. Schmelzofen-, Schweißlicht)">Tätigkeiten mit Exposition durch künstliche optische Strahlung (z.B. Schmelzofen-, Schweißlicht)</option>
                        <option value="Tätigkeiten im Ausland">Tätigkeiten im Ausland</option>
                        <option value="Tätigkeit an Bildschirmgeräten">Tätigkeit an Bildschirmgeräten</option>
                        <option value="Fahr-, Steuer und Überwachungstätigkeiten / Erwerb einer Fahrerlaubnis / Tätigkeiten in Schiff- und Luftfahrt">Fahr-, Steuer und Überwachungstätigkeiten / Erwerb einer Fahrerlaubnis / Tätigkeiten in Schiff- und Luftfahrt</option>
                        <option value="Tätigkeiten mit Absturzgefahr / Offshore-Tätigkeit">Tätigkeiten mit Absturzgefahr / Offshore-Tätigkeit</option>
                        <option value="Tätigkeiten im Bergbau und Betrieben des Festlandsockels">Tätigkeiten im Bergbau und Betrieben des Festlandsockels</option>
                        <option value="Beschäftigung Jugendlicher">Beschäftigung Jugendlicher</option>
                        <option value="Forstarbeiten">Forstarbeiten</option>
                        <option value="Tätigkeit mit Exposition durch Radioaktivität / Röntgenstrahlen">Tätigkeit mit Exposition durch Radioaktivität / Röntgenstrahlen</option>
                        <option value="Qualitätssicherung">Qualitätssicherung</option>
                        <option value="Nachtarbeit">Nachtarbeit</option>
                        <option value="Herstellung von Back-, Konditorei- und Süßwaren">Herstellung von Back-, Konditorei- und Süßwaren</option>
                        <option value="Weitere (Eigene Eingabe)">Weitere (Eigene Eingabe)</option>
                      </select>
                    </div>
                  </div>
                  {newManualTagReason === 'Weitere (Eigene Eingabe)' && (
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Eigener Anlass</label>
                        <input type="text" value={newManualTagCustomReason} onChange={e => setNewManualTagCustomReason(e.target.value)} placeholder="Bitte geben Sie den Anlass ein..." className="w-full text-sm border-emerald-300 rounded focus:ring-emerald-500" />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button onClick={handleAddManualTag} disabled={!newManualTagReason || (newManualTagReason === 'Weitere (Eigene Eingabe)' && !newManualTagCustomReason.trim())} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50">
                      Hinzufügen
                    </button>
                  </div>
                </div>
                
                {selectedEmployee.manualVorsorgen && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.manualVorsorgen.split(',').filter(Boolean).map((tag: string, i: number) => (
                      <span key={i} className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-2">
                        {tag}
                        <button onClick={() => handleRemoveManualTag(tag)} className="hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <h3 className="font-bold text-slate-800 mb-4">Erfasste Gefährdungen & Fristen</h3>
              {((!selectedEmployee.exposures || selectedEmployee.exposures.length === 0) && (!selectedEmployee.asbestosFindings || selectedEmployee.asbestosFindings.length === 0)) ? (
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
                            {exp.masterSubstance?.productName || 'Unbekanntes Produkt'}
                            {(exp.masterSubstance?.isKrebserzeugend || exp.masterSubstance?.isMutagen) && (
                              <span className="ml-2 inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                <ShieldAlert className="w-3 h-3" /> TRGS 410 / ZED
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{exp.exposureType}</td>
                          <td className="p-3 font-bold text-indigo-700">{exp.vorsorgeFrist || '-'}</td>
                          <td className="p-3 text-slate-500">{exp.notes || '-'}</td>
                          <td className="p-3">
                            <button onClick={() => handleRemoveExposure(exp.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedEmployee.asbestosFindings?.map((finding: any) => (
                        <tr key={`asbestos-${finding.id}`} className="bg-orange-50/50">
                          <td className="p-3 font-medium text-slate-800 flex items-center gap-2">
                            Asbest: {finding.component}
                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                              TRGS 519
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">Asbest-Exposition ({finding.status})</td>
                          <td className="p-3 font-bold text-indigo-700">G 1.2 / ArbMedVV Anlage 1</td>
                          <td className="p-3 text-slate-500">{finding.location?.name}: {finding.exactSpot}</td>
                          <td className="p-3 text-slate-400 text-xs italic">
                            via Asbest-Kataster
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <h3 className="font-bold text-slate-800 mt-10 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" /> LMS Schulungen & Unterweisungen
              </h3>
              {(!selectedEmployee.trainingRecords || selectedEmployee.trainingRecords.length === 0) ? (
                <p className="text-slate-500 italic text-sm">Keine Unterweisungen zugewiesen.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg mb-8">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-3">Modul</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Ergebnis</th>
                        <th className="p-3">Zertifikat gültig bis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedEmployee.trainingRecords?.map((rec: any) => (
                        <tr key={rec.id}>
                          <td className="p-3 font-medium text-slate-800">{rec.trainingModule?.title}</td>
                          <td className="p-3">
                            {rec.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs font-bold">
                                <CheckCircle className="w-3 h-3" /> Abgeschlossen
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-bold">
                                {rec.status === 'ASSIGNED' ? 'Zugewiesen' : rec.status}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{rec.score != null ? `${rec.score}%` : '-'}</td>
                          <td className="p-3 font-bold text-indigo-700">
                            {rec.validUntil ? new Date(rec.validUntil).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 h-[800px] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Abteilungs-Übersicht (LMS & Vorsorge)</h2>
                  <p className="text-sm text-slate-500">Wählen Sie links einen Mitarbeiter für Details, oder prüfen Sie hier den Gesamtstatus.</p>
                </div>
              </div>
              
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Mitarbeiter</th>
                      <th className="p-3">Abteilung</th>
                      <th className="p-3">ArbMedVV / ZED</th>
                      <th className="p-3">LMS Status (Ampel)</th>
                      <th className="p-3">Offene Module</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map(emp => {
                      const now = new Date();
                      let hasOverdue = false;
                      let hasPending = false;
                      let pendingCount = 0;
                      if (emp.trainingRecords) {
                        emp.trainingRecords.forEach((rec: any) => {
                          if (rec.status === 'ASSIGNED') { hasPending = true; pendingCount++; }
                          if (rec.status === 'COMPLETED' && rec.validUntil && new Date(rec.validUntil) < now) { hasOverdue = true; pendingCount++; }
                        });
                      }
                      
                      let statusBadge = <span className="text-slate-400">Keine Zuweisung</span>;
                      if (hasOverdue) statusBadge = <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">🔴 Überfällig</span>;
                      else if (hasPending) statusBadge = <span className="bg-amber-400 text-white px-2 py-1 rounded text-xs font-bold">🟡 In Umsetzung</span>;
                      else if (emp.trainingRecords?.length > 0) statusBadge = <span className="bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold">🟢 Erledigt</span>;

                      const vorsorgen = emp.exposures?.map((exp: any) => exp.vorsorgeFrist).filter(Boolean) || [];
                      const zedCount = emp.exposures?.filter((exp: any) => exp.masterSubstance?.isKrebserzeugend || exp.masterSubstance?.isMutagen).length || 0;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{emp.lastName}, {emp.firstName}</td>
                          <td className="p-3 text-slate-600">{emp.department || '-'}</td>
                          <td className="p-3 text-slate-600 text-xs">
                            {vorsorgen.length > 0 && <div className="font-bold text-indigo-700">{Array.from(new Set(vorsorgen)).join(', ')}</div>}
                            {zedCount > 0 && <div className="text-red-600 font-bold flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3"/> ZED-relevant ({zedCount})</div>}
                            {vorsorgen.length === 0 && zedCount === 0 && '-'}
                          </td>
                          <td className="p-3">{statusBadge}</td>
                          <td className="p-3 text-slate-600">
                            {pendingCount > 0 ? <span className="text-amber-600 font-bold">{pendingCount} Modul(e) offene Aktion</span> : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-slate-500" />
                  Datenschutz-Hinweis (DSGVO)
                </h3>
                <p className="text-sm text-slate-600">
                  Diese Übersicht enthält sensible Mitarbeiterdaten nach Art. 9 DSGVO (Arbeitsmedizinische Vorsorge) und Leistungsdaten (LMS Ergebnisse). 
                  Der Zugriff ist über ein rollenbasiertes Berechtigungskonzept (RBAC) auf autorisierte Führungskräfte und HR-Administratoren beschränkt. 
                  Zusätzlich wird jeder Abruf und Export (z.B. ZED-Meldung) im Audit-Log protokolliert (Art. 32 TOMs).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
