import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export const RegisterView = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, password, firstName, lastName
          // KEINE Rolle, KEIN Status — wird vom Server ignoriert
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Registrierung fehlgeschlagen.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Server nicht erreichbar. Bitte versuchen Sie es später erneut.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md text-center border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Registrierung eingegangen</h2>
          <p className="text-slate-600 mb-6">
            Ihre Registrierung wurde erfolgreich entgegengenommen. Der Administrator wurde benachrichtigt 
            und wird Ihren Zugang in Kürze prüfen und freischalten.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Sie erhalten eine E-Mail, sobald Ihr Account freigeschaltet wurde.
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zum Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <form onSubmit={handleRegister} className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Konto erstellen</h2>
            <p className="text-sm text-slate-500">Gefahrstoffmanagement</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              placeholder="Max"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              placeholder="Mustermann"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            placeholder="max.mustermann@firma.de"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Passwort * <span className="text-slate-400 font-normal">(min. 8 Zeichen)</span></label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Passwort bestätigen *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Wird registriert...' : 'Registrieren'}
        </button>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            Bereits ein Konto? Anmelden
          </Link>
        </div>
      </form>
    </div>
  );
};
