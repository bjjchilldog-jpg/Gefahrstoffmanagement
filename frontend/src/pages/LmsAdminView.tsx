import { useState, useEffect } from 'react';
import { BookOpen, Settings, Save, Link as LinkIcon, CheckCircle, Search, Edit, FileText, AlertTriangle, Trash2, Eye, Copy, UserPlus, Users } from 'lucide-react';
import { LmsSlideEditor } from '../components/LmsSlideEditor';
import { LmsCoursePlayer } from '../components/LmsCoursePlayer';

export const LmsAdminView = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'needs'>('modules');
  const [previewMode, setPreviewMode] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [draggedModId, setDraggedModId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  
  useEffect(() => {
    fetchModules();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error('LMS employees error', error);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/lms/modules');
      const data = await res.json();
      setModules(data);
    } catch (error) {
      console.error('LMS modules error', error);
    }
  };

  const handleCreateNew = async () => {
    try {
      const res = await fetch('/api/lms/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Neue Unterweisung (Entwurf)',
          targetAudience: 'Alle Mitarbeitenden',
          content: JSON.stringify([{ type: 'text', text: 'Willkommen zur neuen Unterweisung. Dieser Text kann vom Admin bearbeitet werden.' }]),
          quizQuestions: JSON.stringify([{ question: 'Haben Sie die Unterweisung verstanden?', options: ['Ja', 'Nein'], correctIndex: 0 }])
        })
      });
      const data = await res.json();
      setModules([...modules, data]);
      setEditingModule(data);
    } catch (error) {
      console.error('Fehler beim Erstellen', error);
    }
  };

  const handleCopyModule = async (modToCopy: any) => {
    try {
      const res = await fetch('/api/lms/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${modToCopy.title} (Kopie)`,
          targetAudience: modToCopy.targetAudience,
          content: typeof modToCopy.content === 'string' ? modToCopy.content : JSON.stringify(modToCopy.content),
          quizQuestions: typeof modToCopy.quizQuestions === 'string' ? modToCopy.quizQuestions : JSON.stringify(modToCopy.quizQuestions),
          externalFormUrl: modToCopy.externalFormUrl
        })
      });
      const data = await res.json();
      setModules([...modules, data]);
      setEditingModule(data);
    } catch (error) {
      console.error('Fehler beim Kopieren', error);
    }
  };

  const handleSave = async (silent = false) => {
    if (!editingModule) return;
    try {
      const resSave = await fetch(`/api/lms/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingModule.title,
          targetAudience: editingModule.targetAudience,
          content: typeof editingModule.content === 'string' ? editingModule.content : JSON.stringify(editingModule.content),
          quizQuestions: typeof editingModule.quizQuestions === 'string' ? editingModule.quizQuestions : JSON.stringify(editingModule.quizQuestions),
          externalFormUrl: editingModule.externalFormUrl
        })
      });
      if (!resSave.ok) throw new Error("API Fehler beim Speichern");
      const savedData = await resSave.json();
      // Update editingModule with fresh data from server (preserving parsed content)
      setEditingModule((prev: any) => prev ? { ...prev, ...savedData } : savedData);
      fetchModules();
      if (!silent) alert('Erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern', error);
      if (!silent) alert('Fehler beim Speichern');
    }
  };

  const handleAssignEmployee = async () => {
    if (selectedEmployeeIds.length === 0 || !editingModule) return;
    try {
      // Auto-save the module first (silent - no alert popup)
      await handleSave(true);

      const assignRes = await fetch('/api/lms/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: selectedEmployeeIds, moduleId: editingModule.id })
      });
      if (!assignRes.ok) throw new Error("API Fehler");
      setSelectedEmployeeIds([]);
      fetchModules();
    } catch (error) {
      console.error('Fehler beim Zuweisen', error);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Dieses WBT wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/lms/modules/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      fetchModules();
      if (editingModule?.id === id) setEditingModule(null);
    } catch (error) {
      alert('Fehler beim Löschen. Möglicherweise gibt es bereits verknüpfte Teilnehmer-Ergebnisse.');
    }
  };

  const [needs, setNeeds] = useState<any[]>([]);
  const [selectedNeedIds, setSelectedNeedIds] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'needs') {
      fetchNeeds();
    }
  }, [activeTab]);

  const fetchNeeds = async () => {
    try {
      const res = await fetch('/api/lms/needs');
      const data = await res.json();
      setNeeds(data);
    } catch (error) {
      console.error('LMS needs error', error);
    }
  };

  const handleGroupNeeds = async () => {
    if (selectedNeedIds.length === 0) return alert('Bitte mindestens einen Bedarf auswählen.');
    try {
      const res = await fetch('/api/lms/group-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needIds: selectedNeedIds, title: groupTitle })
      });
      const data = await res.json();
      setModules([data, ...modules]);
      setActiveTab('modules');
      setEditingModule(data);
      setSelectedNeedIds([]);
      setGroupTitle('');
    } catch (error) {
      console.error('Fehler beim Gruppieren', error);
    }
  };

  const handleDragStart = (e: any, id: string) => {
    setDraggedModId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any, targetId: string) => {
    e.preventDefault();
    if (!draggedModId || draggedModId === targetId) return;
    
    const draggedIdx = modules.findIndex(m => m.id === draggedModId);
    const targetIdx = modules.findIndex(m => m.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const newModules = [...modules];
    const [draggedItem] = newModules.splice(draggedIdx, 1);
    newModules.splice(targetIdx, 0, draggedItem);
    
    newModules.forEach((m, idx) => m.sortOrder = idx);
    setModules(newModules);
  };

  const handleDrop = async () => {
    setDraggedModId(null);
    try {
      const orderData = modules.map(m => ({ id: m.id, sortOrder: m.sortOrder }));
      await fetch('/api/lms/modules/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderData })
      });
    } catch (error) {
      console.error('Reorder error', error);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 relative">
      {/* Sidebar / Module List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            LMS Verwaltung
          </h1>
          <p className="text-sm text-slate-500 mt-1">TRGS 555 Unterweisungen anpassen und MS Forms verknüpfen.</p>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'modules' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('modules')}
          >
            WBT Module
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'needs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('needs')}
          >
            Offene Bedarfe
            {needs.length > 0 && <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{needs.length}</span>}
          </button>
        </div>
        
        {activeTab === 'modules' && (
          <>
            <div className="p-4 border-b border-slate-100 flex gap-2">
              <button onClick={handleCreateNew} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors flex justify-center items-center gap-2">
                <BookOpen className="w-4 h-4" /> Neues WBT
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {modules.map(mod => (
                <div 
                  key={mod.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, mod.id)}
                  onDragOver={(e) => handleDragOver(e, mod.id)}
                  onDrop={handleDrop}
                  onDragEnd={() => setDraggedModId(null)}
                  onClick={() => setEditingModule(mod)}
                  className={`p-4 rounded-lg border cursor-grab active:cursor-grabbing transition-colors relative group ${editingModule?.id === mod.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-200'} ${draggedModId === mod.id ? 'opacity-50' : ''}`}
                >
                  <h3 className="font-bold text-slate-800 mb-1 pr-8">{mod.title}</h3>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>{mod.targetAudience || 'Alle'}</span>
                    {mod.externalFormUrl ? <span className="text-amber-600 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> MS Forms</span> : <span className="text-indigo-600 flex items-center gap-1"><FileText className="w-3 h-3"/> Nativ</span>}
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopyModule(mod); }} 
                      className="text-slate-300 hover:text-indigo-600 p-1"
                      title="Modul kopieren"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }} 
                      className="text-slate-300 hover:text-red-500 p-1"
                      title="Modul löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'needs' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-sm text-indigo-800">
              Wählen Sie mehrere Meldungen aus der GBU aus, um sie zu einer <b>Gruppenunterweisung</b> zusammenzufassen.
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {needs.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-8">Keine offenen Bedarfe.</div>
              ) : (
                needs.map(need => (
                  <label key={need.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedNeedIds.includes(need.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedNeedIds([...selectedNeedIds, need.id]);
                        else setSelectedNeedIds(selectedNeedIds.filter(id => id !== need.id));
                      }}
                      className="mt-1 w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <div className="font-bold text-slate-700 text-sm">{need.substanceName}</div>
                      <div className="text-xs text-slate-500">{need.substanceType} • {need.workAreaName}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-white">
              <input 
                type="text" 
                placeholder="Titel (z.B. Umgang mit Sprays)"
                value={groupTitle}
                onChange={e => setGroupTitle(e.target.value)}
                className="w-full text-sm border-slate-300 rounded mb-2 focus:ring-indigo-500"
              />
              <button 
                onClick={handleGroupNeeds} 
                disabled={selectedNeedIds.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
              >
                Als neues WBT bündeln
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {editingModule ? (
          <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <input 
                  type="text" 
                  value={editingModule.title} 
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                  className="text-3xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full pb-1 transition-colors"
                  placeholder="Modul Titel"
                />
                <p className="text-slate-500 mt-1">Modul-ID: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{editingModule.id}</code></p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setPreviewMode(true)} 
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2.5 rounded font-medium flex items-center gap-2 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  Vorschau
                </button>
                <button onClick={() => handleSave()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded font-medium flex items-center gap-2 transition-colors">
                  <Save className="w-5 h-5" />
                  Speichern
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-8 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 p-4 font-bold flex items-center gap-2 text-slate-700">
                <LinkIcon className="w-5 h-5 text-slate-400" />
                Schnittstelle für externe Formulare (z.B. Microsoft Forms / Google Forms)
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">
                  Wenn Sie anstelle des integrierten LMS-Quiz lieber ein eigenes Microsoft Forms oder Google Forms verwenden möchten (z.B. weil Ihre Organisation dieses System bereits nutzt), können Sie die Ergebnisse per Webhook automatisch an dieses Modul schicken. Das System protokolliert dann die erfolgreiche Unterweisung vollautomatisch im Audit-Log!
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ihre MS Forms / Google Forms URL (Leitet die Mitarbeitenden direkt dorthin um)</label>
                  <input 
                    type="text" 
                    value={editingModule.externalFormUrl || ''} 
                    onChange={e => setEditingModule({...editingModule, externalFormUrl: e.target.value})}
                    placeholder="https://forms.office.com/Pages/ResponsePage.aspx?id=..."
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-6">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4"/> Webhook Integration (Power Automate)</h4>
                  <p className="text-sm text-amber-700 mb-3">Richten Sie einen Power Automate Flow ein, der beim Absenden Ihres MS Forms folgenden POST-Request an Ihren Server sendet:</p>
                  
                  <div className="mb-2">
                    <label className="block text-xs font-bold text-amber-800 mb-1">Webhook URL</label>
                    <code className="block bg-amber-100 p-2 rounded text-xs select-all">https://ihr-server.de/api/lms/webhook/{editingModule.id}</code>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">Webhook Secret (Sicherheits-Token im Header "x-lms-secret")</label>
                    <code className="block bg-amber-100 p-2 rounded text-xs select-all">{editingModule.webhookSecret}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-8 overflow-hidden">
               <div className="border-b border-slate-200 bg-slate-50 p-4 font-bold flex items-center gap-2 text-slate-700">
                <FileText className="w-5 h-5 text-slate-400" />
                Schulungs-Inhalte (WBT-Editor)
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-6">
                  Hier bearbeiten Sie den JSON-Baum für die Schulungsfolien. (In der finalen Version ist hier ein Rich-Text Drag&Drop Editor vorgesehen).
                </p>

                <h3 className="font-bold text-slate-800 mb-4">Folien & Inhalte</h3>
                <LmsSlideEditor 
                  slides={
                    Array.isArray(editingModule.content)
                      ? editingModule.content
                      : (typeof editingModule.content === 'string' && editingModule.content.startsWith('['))
                        ? JSON.parse(editingModule.content)
                        : []
                  }
                  onChange={(slides) => setEditingModule({ ...editingModule, content: slides })}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-8 overflow-hidden">
               <div className="border-b border-slate-200 bg-slate-50 p-4 font-bold flex items-center gap-2 text-slate-700">
                <Users className="w-5 h-5 text-slate-400" />
                Mitarbeiter-Zuweisung & Status
              </div>
              <div className="p-6">
                <div className="mb-6 border border-slate-200 rounded bg-slate-50 overflow-hidden">
                  <div className="p-3 bg-slate-100 font-medium text-slate-700 flex justify-between items-center border-b border-slate-200">
                    <span>Mitarbeiter oder Abteilungen auswählen</span>
                    <button 
                      onClick={handleAssignEmployee}
                      disabled={selectedEmployeeIds.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      Auswahl Zuweisen ({selectedEmployeeIds.length})
                    </button>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto grid grid-cols-2 gap-6">
                    {/* Gruppierung nach Abteilung */}
                    {Object.entries(
                      employees.reduce((acc, emp) => {
                        const dept = emp.department || 'Ohne Abteilung';
                        if (!acc[dept]) acc[dept] = [];
                        acc[dept].push(emp);
                        return acc;
                      }, {} as Record<string, any[]>)
                    ).map(([dept, emps]: any) => {
                      const allSelectedInDept = emps.every((e: any) => selectedEmployeeIds.includes(e.id));
                      return (
                        <div key={dept} className="space-y-2">
                          <label className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-1 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={allSelectedInDept && emps.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newIds = new Set(selectedEmployeeIds);
                                  emps.forEach((emp: any) => newIds.add(emp.id));
                                  setSelectedEmployeeIds(Array.from(newIds));
                                } else {
                                  setSelectedEmployeeIds(selectedEmployeeIds.filter(id => !emps.find((emp: any) => emp.id === id)));
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            Abteilung: {dept}
                          </label>
                          {emps.map((emp: any) => (
                            <label key={emp.id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded">
                              <input 
                                type="checkbox"
                                checked={selectedEmployeeIds.includes(emp.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                                  else setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.id));
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                              />
                              {emp.firstName} {emp.lastName} {emp.employeeNumber && <span className="text-xs text-slate-400">({emp.employeeNumber})</span>}
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 font-medium text-slate-600">Mitarbeiter</th>
                        <th className="p-3 font-medium text-slate-600">Status</th>
                        <th className="p-3 font-medium text-slate-600">Ergebnis</th>
                        <th className="p-3 font-medium text-slate-600">Gültig bis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(editingModule.records || []).map((rec: any) => (
                        <tr key={rec.id}>
                          <td className="p-3 font-medium">{rec.employee?.firstName} {rec.employee?.lastName}</td>
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
                          <td className="p-3 text-slate-600">{rec.score !== null ? `${rec.score}%` : '-'}</td>
                          <td className="p-3 text-slate-600">{rec.validUntil ? new Date(rec.validUntil).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                      {(!editingModule.records || editingModule.records.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500">Noch keine Zuweisungen.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
               <div className="border-b border-slate-200 bg-slate-50 p-4 font-bold flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-5 h-5 text-slate-400" />
                Wissensabfrage (Quiz-Editor)
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500 mb-4">Hier bearbeiten Sie die Quiz-Fragen im JSON-Format.</p>
                <textarea 
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-300 rounded font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  value={typeof editingModule.quizQuestions === 'string' ? editingModule.quizQuestions : JSON.stringify(editingModule.quizQuestions, null, 2)}
                  onChange={e => setEditingModule({...editingModule, quizQuestions: e.target.value})}
                />
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-24 h-24 mb-4 text-slate-200" />
            <h2 className="text-2xl font-bold text-slate-500">Kein Modul ausgewählt</h2>
            <p>Wählen Sie links ein Modul aus oder erstellen Sie ein neues.</p>
          </div>
        )}
      </div>

      {/* Preview Fullscreen Overlay */}
      {previewMode && editingModule && (
        <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col">
          {editingModule.externalFormUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl text-center">
                <LinkIcon className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Externes Formular</h3>
                <p className="text-slate-600 mb-6">Mitarbeiter werden bei dieser Unterweisung automatisch zu der folgenden URL weitergeleitet:</p>
                <a href={editingModule.externalFormUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline break-all mb-8 block">
                  {editingModule.externalFormUrl}
                </a>
                <button onClick={() => setPreviewMode(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-8 py-2 rounded-lg font-bold transition-colors">
                  Vorschau schließen
                </button>
              </div>
            </div>
          ) : (
            <LmsCoursePlayer
              moduleTitle={`[Vorschau] ${editingModule.title}`}
              slides={
                Array.isArray(editingModule.content)
                  ? editingModule.content
                  : (typeof editingModule.content === 'string' && editingModule.content.startsWith('['))
                    ? JSON.parse(editingModule.content)
                    : []
              }
              onComplete={() => {
                alert('Die Vorschau wurde abgeschlossen (Zertifikat-Generierung simuliert).');
                setPreviewMode(false);
              }}
              onCancel={() => setPreviewMode(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};
