import { useState, useEffect } from 'react';
import { BookOpen, Settings, Save, Link as LinkIcon, CheckCircle, Search, Edit, FileText, AlertTriangle } from 'lucide-react';

export const LmsAdminView = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [editingModule, setEditingModule] = useState<any>(null);
  
  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/lms/modules');
      const data = await res.json();
      setModules(data);
    } catch (error) {
      console.error('LMS modules error', error);
    }
  };

  const handleCreateNew = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/lms/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Neue Unterweisung (Entwurf)',
          targetAudience: 'Alle Mitarbeiter',
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

  const handleSave = async () => {
    if (!editingModule) return;
    try {
      await fetch(`http://localhost:3000/api/lms/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: typeof editingModule.content === 'string' ? editingModule.content : JSON.stringify(editingModule.content),
          quizQuestions: typeof editingModule.quizQuestions === 'string' ? editingModule.quizQuestions : JSON.stringify(editingModule.quizQuestions),
          externalFormUrl: editingModule.externalFormUrl
        })
      });
      fetchModules();
      setEditingModule(null);
      alert('Erfolgreich gespeichert!');
    } catch (error) {
      alert('Fehler beim Speichern');
    }
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar / Module List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            LMS Verwaltung
          </h1>
          <p className="text-sm text-slate-500 mt-1">TRGS 555 Unterweisungen anpassen und MS Forms verknüpfen.</p>
        </div>
        
        <div className="p-4 border-b border-slate-100 flex gap-2">
          <button onClick={handleCreateNew} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors flex justify-center items-center gap-2">
            <BookOpen className="w-4 h-4" /> Neues WBT
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {modules.map(mod => (
            <div 
              key={mod.id} 
              onClick={() => setEditingModule(mod)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${editingModule?.id === mod.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
            >
              <h3 className="font-bold text-slate-800 mb-1">{mod.title}</h3>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>{mod.targetAudience || 'Alle'}</span>
                {mod.externalFormUrl ? <span className="text-amber-600 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> MS Forms</span> : <span className="text-indigo-600 flex items-center gap-1"><FileText className="w-3 h-3"/> Nativ</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {editingModule ? (
          <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">{editingModule.title}</h2>
                <p className="text-slate-500 mt-1">Modul-ID: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{editingModule.id}</code></p>
              </div>
              <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded font-medium flex items-center gap-2 transition-colors">
                <Save className="w-5 h-5" />
                Speichern
              </button>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ihre MS Forms / Google Forms URL (Leitet den Mitarbeiter direkt dorthin um)</label>
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
                <p className="text-sm text-slate-500 mb-4">Hier bearbeiten Sie den JSON-Baum für die Schulungsfolien. (In der finalen Version ist hier ein Rich-Text Drag&Drop Editor vorgesehen).</p>
                <textarea 
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-300 rounded font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  value={typeof editingModule.content === 'string' ? editingModule.content : JSON.stringify(editingModule.content, null, 2)}
                  onChange={e => setEditingModule({...editingModule, content: e.target.value})}
                />
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
            <BookOpen className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-xl">Wählen Sie links ein Modul zur Bearbeitung aus.</p>
          </div>
        )}
      </div>
    </div>
  );
};
