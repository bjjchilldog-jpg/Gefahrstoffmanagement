import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, ExternalLink, PlayCircle, ShieldAlert, Award } from 'lucide-react';

export const LmsEmployeeView = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  
  // Für das UI-Mocking nutzen wir eine feste Employee-ID
  // In einer echten App kommt die aus dem Auth-Context!
  const DUMMY_EMPLOYEE_ID = '3887d1df-0b5c-4b68-b753-4852c0383794'; 

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      // Wir fetchen einfach alle Module für die Demo und mocken die Zuweisung,
      // da wir noch keine echte Login-Session haben.
      const res = await fetch('http://localhost:3000/api/lms/modules');
      const modules = await res.json();
      
      // Mappe Module in "Employee Records"
      const dummyRecords = modules.map((mod: any) => ({
        id: 'rec-' + mod.id,
        trainingModuleId: mod.id,
        trainingModule: mod,
        status: 'ASSIGNED',
        score: null
      }));
      setRecords(dummyRecords);
    } catch (error) {
      console.error('LMS records error', error);
    }
  };

  const handleStartCourse = (record: any) => {
    if (record.trainingModule.externalFormUrl) {
      // Redirect to MS Forms / Google Forms
      window.open(record.trainingModule.externalFormUrl, '_blank');
      // In a real app we'd wait for the webhook. For demo we just alert.
      alert('Sie wurden zu Microsoft/Google Forms weitergeleitet. Sobald Sie das Quiz dort abschließen, wird dies hier automatisch grün!');
    } else {
      // Start native WBT
      setActiveCourse(record);
    }
  };

  const submitQuiz = async (passed: boolean) => {
    // Demo-Mock für den erfolgreichen Abschluss
    alert(passed ? 'Herzlichen Glückwunsch! Die Unterweisung wurde protokolliert.' : 'Leider nicht bestanden. Bitte wiederholen Sie das Modul.');
    setActiveCourse(null);
    fetchRecords(); // Reload (in real app, we'd update status)
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar: Meine Unterweisungen */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-6 border-b border-slate-200 bg-indigo-600 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6" />
            Mein Lernportal
          </h1>
          <p className="text-sm text-indigo-100 mt-1">Offene Unterweisungen (TRGS 555 / BioStoffV)</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {records.map(rec => (
            <div 
              key={rec.id} 
              className={`p-4 rounded-lg border ${rec.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} shadow-sm`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800 leading-tight">{rec.trainingModule.title}</h3>
                {rec.status === 'COMPLETED' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">{rec.trainingModule.description || 'Allgemeine Sicherheitsunterweisung nach § 14 GefStoffV.'}</p>
              
              {rec.status === 'COMPLETED' ? (
                <div className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded inline-block">
                  Bestanden ({rec.score}%)
                </div>
              ) : (
                <button 
                  onClick={() => handleStartCourse(rec)}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium py-2 rounded text-sm transition-colors flex justify-center items-center gap-2"
                >
                  {rec.trainingModule.externalFormUrl ? (
                    <><ExternalLink className="w-4 h-4" /> Externes Formular starten</>
                  ) : (
                    <><PlayCircle className="w-4 h-4" /> Training starten</>
                  )}
                </button>
              )}
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm">
              Aktuell keine Unterweisungen fällig.
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Native Course Player */}
      <div className="flex-1 flex flex-col bg-slate-100 items-center justify-center">
        {activeCourse ? (
          <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
            <div className="bg-indigo-600 p-6 text-white">
              <h2 className="text-2xl font-bold">{activeCourse.trainingModule.title}</h2>
              <p className="opacity-80">Lesen Sie die folgenden Hinweise aufmerksam durch.</p>
            </div>
            
            <div className="p-8 min-h-[300px] text-lg text-slate-700 leading-relaxed">
              {/* Hier würde der Slider/Player für die JSON-Folien laufen. Für die Demo zeigen wir einen fixen Text. */}
              <p className="mb-4">Willkommen zur Unterweisung. Beachten Sie bei der Arbeit mit Gefahrstoffen stets die PSA-Vorgaben.</p>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                <strong>Wichtig:</strong> Schutzbrille und säurefeste Handschuhe sind zwingend erforderlich!
              </div>
              
              <hr className="my-8 border-slate-200" />
              
              <h3 className="font-bold text-xl mb-4">Quiz: Wissensüberprüfung</h3>
              <div className="space-y-3">
                <p>Ist das Tragen einer Schutzbrille bei dieser Tätigkeit verpflichtend?</p>
                <label className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                  <input type="radio" name="q1" value="yes" />
                  Ja, immer.
                </label>
                <label className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                  <input type="radio" name="q1" value="no" />
                  Nein, nur bei Spritzgefahr.
                </label>
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setActiveCourse(null)} className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-medium transition-colors">Abbrechen</button>
              <button onClick={() => submitQuiz(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors">
                <CheckCircle className="w-5 h-5" /> Quiz abschließen
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center opacity-50">
            <Award className="w-24 h-24 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold text-slate-600">Lernportal</h2>
            <p className="text-slate-500">Wählen Sie links eine Unterweisung aus, um zu starten.</p>
          </div>
        )}
      </div>
    </div>
  );
};
