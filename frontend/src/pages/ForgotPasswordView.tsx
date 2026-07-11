import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export const ForgotPasswordView = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus('loading');

    try {
      const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.status === 429) {
        setStatus('error');
        setErrorMessage('Zu viele Anfragen. Bitte warten Sie einige Minuten.');
        return;
      }

      // Server gibt IMMER 200 (Anti-Enumeration)
      setStatus('success');
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
          <h2 className="text-2xl font-bold text-slate-800 mb-3">E-Mail versendet</h2>
          <p className="text-slate-600 mb-6">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Der Link ist <strong>1 Stunde</strong> gültig und kann nur einmal verwendet werden.
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
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Passwort vergessen?</h2>
            <p className="text-sm text-slate-500">Wir senden Ihnen einen Reset-Link</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail-Adresse</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            placeholder="ihre.email@firma.de"
            required
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Wird versendet...' : 'Reset-Link anfordern'}
        </button>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            Zurück zum Login
          </Link>
        </div>
      </form>
    </div>
  );
};
