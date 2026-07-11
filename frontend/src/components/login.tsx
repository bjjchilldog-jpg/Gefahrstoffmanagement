import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPending(false);
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate('/');
      } else if (data.code === 'PENDING_APPROVAL') {
        setIsPending(true);
      } else if (data.code === 'SUSPENDED') {
        setError('Ihr Account wurde gesperrt. Bitte wenden Sie sich an den Administrator.');
      } else {
        setError(data.error || 'Login fehlgeschlagen.');
      }
    } catch {
      setError('Server nicht erreichbar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
            <LogIn className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Anmelden</h2>
            <p className="text-sm text-slate-500">Gefahrstoffmanagement</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isPending && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Freigabe ausstehend</p>
              <p className="text-sm text-amber-700 mt-1">
                Ihr Account wurde registriert, wartet aber noch auf die Freigabe durch den Administrator. 
                Sie werden per E-Mail benachrichtigt, sobald Ihr Zugang freigeschaltet ist.
              </p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" 
            placeholder="ihre.email@firma.de"
            required 
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Passwort</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" 
            placeholder="••••••••"
            required 
          />
        </div>

        <div className="mb-6 text-right">
          <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            Passwort vergessen?
          </Link>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Wird angemeldet...' : 'Anmelden'}
        </button>

        <div className="mt-4 relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">oder</span></div>
        </div>

        <button 
          type="button"
          onClick={async () => {
            try {
              const res = await fetch('/api/auth/sso/login');
              const data = await res.json();
              if (data.authUrl) {
                window.location.href = data.authUrl;
              } else {
                setError(data.error || 'SSO ist nicht konfiguriert.');
              }
            } catch { setError('Server nicht erreichbar.'); }
          }}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          🔐 Mit Enterprise SSO anmelden
        </button>

        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <Link to="/register" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            Noch kein Konto? Registrieren
          </Link>
        </div>
      </form>
    </div>
  );
};
