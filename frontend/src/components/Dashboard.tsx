import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Check } from 'lucide-react';

export const Dashboard = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminComment, setAdminComment] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/revisions/pending');
      const data = await res.json();
      setTasks(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const confirmTask = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/revisions/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminComment: adminComment[id] || 'Geprüft und freigegeben.' })
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Lade Revisions-Aufgaben...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-8 h-8 text-accent" />
        <h2 className="text-2xl font-bold text-slate-800">Compliance Dashboard (4-Augen-Prinzip)</h2>
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
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-accent focus:border-accent"
                  value={adminComment[task.id] || ''}
                  onChange={e => setAdminComment({ ...adminComment, [task.id]: e.target.value })}
                />
                <button 
                  onClick={() => confirmTask(task.id)}
                  className="flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  <Check className="w-4 h-4" /> Bestätigen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
