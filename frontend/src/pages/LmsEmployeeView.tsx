import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, ExternalLink, PlayCircle, ShieldAlert, Award, LogOut } from 'lucide-react';
import { LmsCoursePlayer } from '../components/LmsCoursePlayer';

export const LmsEmployeeView = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmp = localStorage.getItem('lmsEmployee');
    const token = localStorage.getItem('lmsToken');
    
    if (!savedEmp || !token) {
      navigate('/lms/login');
      return;
    }
    
    const emp = JSON.parse(savedEmp);
    setEmployee(emp);
    fetchRecords(emp.id, token);
  }, []);

  const fetchRecords = async (empId: string, token: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/lms/records/${empId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Fehler beim Laden');
      }
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error('LMS records error', error);
    }
  };

  const handleStartCourse = (record: any) => {
    if (record.trainingModule.externalFormUrl) {
      window.open(record.trainingModule.externalFormUrl, '_blank');
      alert('Sie wurden zu Microsoft/Google Forms weitergeleitet. Sobald Sie das Quiz dort abschließen, wird dies hier automatisch grün!');
    } else {
      setActiveCourse(record);
    }
  };

  const submitQuiz = async (passed: boolean) => {
    try {
      const token = localStorage.getItem('lmsToken');
      const res = await fetch(`http://localhost:3000/api/lms/records/${activeCourse.id}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ passed, score: passed ? 100 : 0 })
      });

      if (!res.ok) throw new Error('Fehler beim Speichern');
      
      alert(passed ? 'Herzlichen Glückwunsch! Die Unterweisung wurde erfolgreich protokolliert.' : 'Leider nicht bestanden. Bitte wiederholen Sie das Modul.');
      setActiveCourse(null);
      if (employee) {
        fetchRecords(employee.id, token || '');
      }
    } catch (err) {
      alert('Fehler bei der Kommunikation mit dem Server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lmsEmployee');
    localStorage.removeItem('lmsToken');
    navigate('/lms/login');
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar: Meine Unterweisungen */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-6 border-b border-slate-200 bg-indigo-600 text-white relative">
          <button 
            onClick={handleLogout}
            className="absolute top-4 right-4 p-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors text-indigo-100 hover:text-white"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
          
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6" />
            Mein Lernportal
          </h1>
          <p className="text-sm text-indigo-100 mt-1 mb-3">Offene Unterweisungen (TRGS 555 / BioStoffV)</p>
          
          {employee && (
            <div className="bg-indigo-700/50 rounded-lg p-3 text-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div>
                <p className="font-bold">{employee.firstName} {employee.lastName}</p>
                <p className="text-indigo-200 text-xs">Personalnr: {employee.employeeNumber}</p>
              </div>
            </div>
          )}
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
      {/* Main Content Area */}
      {activeCourse ? (
        <div className="flex-1 flex flex-col bg-slate-900 absolute inset-0 z-50">
          <LmsCoursePlayer
            moduleTitle={activeCourse.trainingModule.title}
            slides={
              Array.isArray(activeCourse.trainingModule.content)
                ? activeCourse.trainingModule.content
                : (typeof activeCourse.trainingModule.content === 'string' && activeCourse.trainingModule.content.startsWith('['))
                  ? JSON.parse(activeCourse.trainingModule.content)
                  : []
            }
            onComplete={(passed) => submitQuiz(passed)}
            onCancel={() => setActiveCourse(null)}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 relative">
          <div className="text-center opacity-50">
            <Award className="w-24 h-24 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold text-slate-600">Lernportal</h2>
            <p className="text-slate-500">Wählen Sie links eine Unterweisung aus, um zu starten.</p>
          </div>
        </div>
      )}
    </div>
  );
};
