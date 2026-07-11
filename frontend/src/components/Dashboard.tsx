import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Check, Activity, BookOpen, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminComment, setAdminComment] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resTasks, resHistory, resEmp] = await Promise.all([
        fetch('/api/regulations/revisions/pending', { headers }),
        fetch('/api/regulations/revisions/history', { headers }),
        fetch('/api/employees', { headers })
      ]);
      const dataTasks = await resTasks.json();
      const dataHistory = await resHistory.json();
      const dataEmp = await resEmp.json();
      setTasks(Array.isArray(dataTasks) ? dataTasks : []);
      setHistoryTasks(Array.isArray(dataHistory) ? dataHistory : []);
      setEmployees(Array.isArray(dataEmp) ? dataEmp : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const confirmTask = async (id: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`/api/regulations/revisions/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminComment: adminComment[id] || 'Geprüft und freigegeben.' })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Lade Dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* SECTION 1: REVISIONS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">Compliance Dashboard (4-Augen-Prinzip)</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center">
            <ShieldCheck className="w-12 h-12 text-green-500 mb-3" />
            <h3 className="text-lg font-medium text-green-800">Alles im grünen Bereich</h3>
            <p className="text-green-600">Es liegen keine offenen Revisions-Tasks vor. Das Regelwerk ist aktuell.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
              <div className="flex items-start">
                <ShieldAlert className="w-5 h-5 text-orange-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-orange-800 font-bold">Achtung: Rechtsänderungen ausstehend!</h4>
                  <p className="text-orange-700 text-sm mt-1">Die folgenden Stoffe oder Arbeitsbereiche sind von Regelwerksänderungen betroffen. Bitte prüfen Sie die Schutzmaßnahmen vor Ort und bestätigen Sie die Task.</p>
                </div>
              </div>
            </div>

          {tasks.map(task => (
            <div key={task.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col md:flex-row gap-6 md:items-center">
              <div className="flex-1">
                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded mb-2">
                  Task-ID: {task.id.slice(0, 8)}
                </span>
                <h4 className="font-bold text-slate-800 text-lg">
                  {task.hazardousSubstance ? `Stoff-Revision: ${task.hazardousSubstance.productName}` : ''}
                  {task.location ? `Asbest-Prüfung: ${task.location.name}` : ''}
                </h4>
                <p className="text-slate-600 text-sm mt-2 bg-slate-50 p-3 rounded border border-slate-100">
                  {task.adminComment}
                </p>
                {task.regulation && (
                  <p className="text-xs text-slate-500 mt-2">Regelwerk: {task.regulation.reference} ({task.regulation.category})</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                <input 
                  type="text" 
                  placeholder="Admin Kommentar (optional)..."
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={adminComment[task.id] || ''}
                  onChange={e => setAdminComment({ ...adminComment, [task.id]: e.target.value })}
                />
                <button 
                  onClick={() => confirmTask(task.id)}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  <Check className="w-4 h-4" /> Bestätigen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {historyTasks.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-400" /> Historie: Bestätigte Warnungen
          </h3>
          <div className="space-y-3">
            {historyTasks.map(task => (
              <div key={task.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold rounded">
                      ID: {task.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Bestätigt am: {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">
                    {task.hazardousSubstance ? `Stoff-Revision: ${task.hazardousSubstance.productName}` : ''}
                    {task.location ? `Asbest-Prüfung: ${task.location.name}` : ''}
                  </h4>
                  <p className="text-slate-600 text-xs mt-1">
                    Freigabe-Kommentar: <span className="italic">"{task.adminComment}"</span>
                  </p>
                </div>
                <div className="shrink-0 text-emerald-600 flex items-center gap-1 font-medium text-sm">
                  <Check className="w-4 h-4" /> Erledigt
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* SECTION 2: MITARBEITER OVERVIEW */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gesamt-Übersicht: LMS & Vorsorge (ArbMedVV)</h2>
            <p className="text-sm text-slate-500">Übersicht aller Mitarbeiter, ZED-Relevanz und Schulungsbedarfe.</p>
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
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Keine Mitarbeiter im System angelegt.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
