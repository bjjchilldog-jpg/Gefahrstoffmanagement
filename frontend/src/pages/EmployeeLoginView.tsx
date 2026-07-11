import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Lock, User, Loader2 } from 'lucide-react';

export const EmployeeLoginView = () => {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeNumber || !pin) {
      setError('Bitte Personalnummer und PIN eingeben.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/lms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeNumber, pin })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      // Store employee specific token and data
      localStorage.setItem('lmsToken', data.token);
      localStorage.setItem('lmsEmployee', JSON.stringify(data.employee));
      
      // Navigate to the LMS training view
      navigate('/lms/training');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="bg-indigo-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/30">
            <Award className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Mitarbeiter-Portal</h1>
          <p className="text-slate-500 font-medium mt-2">Loggen Sie sich ein, um offene Sicherheitsunterweisungen zu absolvieren.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Personalnummer</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="z.B. 1001"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">4-stellige PIN</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="****"
                  maxLength={4}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 tracking-widest text-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/30 transition-all flex justify-center items-center"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Anmelden'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Demo-Accounts für diesen Prototyp:<br/>1001 (PIN: 1234) &nbsp;|&nbsp; 1002 (PIN: 9876)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
