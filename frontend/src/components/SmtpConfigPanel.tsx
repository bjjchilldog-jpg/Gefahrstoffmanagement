import { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Lock, Unlock, ExternalLink } from 'lucide-react';

const SMTP_PROVIDERS: Record<string, { label: string; host: string; port: number; secure: boolean; hint?: string }> = {
  microsoft365: { label: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', port: 587, secure: false, hint: 'Verwenden Sie ein App-Passwort bei aktivierter 2FA.' },
  google: { label: 'Google Workspace / Gmail', host: 'smtp.gmail.com', port: 587, secure: false, hint: 'Erstellen Sie ein App-Passwort unter myaccount.google.com → Sicherheit.' },
  ionos: { label: 'IONOS (1&1)', host: 'smtp.ionos.de', port: 587, secure: false },
  strato: { label: 'Strato', host: 'smtp.strato.de', port: 465, secure: true },
  apple: { label: 'Apple iCloud', host: 'smtp.mail.me.com', port: 587, secure: false, hint: 'Verwenden Sie ein app-spezifisches Passwort.' },
  aws_ses: { label: 'Amazon SES', host: 'email-smtp.eu-central-1.amazonaws.com', port: 587, secure: false, hint: 'Verwenden Sie SMTP-Credentials (nicht Ihren AWS-Zugriffsschlüssel).' },
  sendgrid: { label: 'SendGrid (Twilio)', host: 'smtp.sendgrid.net', port: 587, secure: false, hint: 'Benutzername ist immer "apikey", Passwort ist Ihr API-Key.' },
  mailgun: { label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  postmark: { label: 'Postmark', host: 'smtp.postmarkapp.com', port: 587, secure: false, hint: 'Verwenden Sie Ihren Server-API-Token als Passwort.' },
  custom: { label: 'Benutzerdefiniert', host: '', port: 587, secure: false }
};

interface SmtpConfig {
  smtpProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

interface SmtpConfigPanelProps {
  settings: any;
  onSettingsChange: (updated: any) => void;
}

export const SmtpConfigPanel = ({ settings, onSettingsChange }: SmtpConfigPanelProps) => {
  const [smtp, setSmtp] = useState<SmtpConfig>({
    smtpProvider: settings.smtpProvider || '',
    smtpHost: settings.smtpHost || '',
    smtpPort: settings.smtpPort || 587,
    smtpSecure: settings.smtpSecure || false,
    smtpUser: settings.smtpUser || '',
    smtpPass: settings.smtpPass || '',
    smtpFrom: settings.smtpFrom || ''
  });
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSmtp({
      smtpProvider: settings.smtpProvider || '',
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || 587,
      smtpSecure: settings.smtpSecure || false,
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass || '',
      smtpFrom: settings.smtpFrom || ''
    });
  }, [settings.smtpProvider, settings.smtpHost]);

  const handleProviderChange = (provider: string) => {
    const config = SMTP_PROVIDERS[provider];
    if (!config) return;

    const updated = {
      ...smtp,
      smtpProvider: provider,
      smtpHost: config.host,
      smtpPort: config.port,
      smtpSecure: config.secure
    };
    setSmtp(updated);
    propagate(updated);
  };

  const handleChange = (field: keyof SmtpConfig, value: any) => {
    const updated = { ...smtp, [field]: value };
    setSmtp(updated);
    propagate(updated);
  };

  const propagate = (data: SmtpConfig) => {
    onSettingsChange({
      ...settings,
      smtpProvider: data.smtpProvider,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpSecure: data.smtpSecure,
      smtpUser: data.smtpUser,
      smtpPass: data.smtpPass,
      smtpFrom: data.smtpFrom
    });
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('http://localhost:3000/api/settings/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ type: 'success', message: data.message, url: data.etherealUrl });
      } else {
        setTestResult({ type: 'error', message: data.error || 'Unbekannter Fehler' });
      }
    } catch {
      setTestResult({ type: 'error', message: 'Server nicht erreichbar' });
    } finally {
      setTesting(false);
    }
  };

  const isCustom = smtp.smtpProvider === 'custom';
  const isLocked = smtp.smtpProvider && smtp.smtpProvider !== 'custom';
  const providerConfig = SMTP_PROVIDERS[smtp.smtpProvider];

  return (
    <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-600" />
        E-Mail-Versand (SMTP)
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Konfigurieren Sie den E-Mail-Versand für Benachrichtigungen, Passwort-Resets und Benutzer-Freigaben.
        Ohne Konfiguration wird der Ethereal-Testmodus verwendet (E-Mail-Vorschau im Backend-Log).
      </p>

      {/* Provider Dropdown */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail-Provider</label>
        <select
          value={smtp.smtpProvider}
          onChange={e => handleProviderChange(e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">— Provider wählen —</option>
          {Object.entries(SMTP_PROVIDERS).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Provider-Hint */}
      {providerConfig?.hint && (
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {providerConfig.hint}
        </div>
      )}

      {smtp.smtpProvider && (
        <>
          {/* Host / Port / Verschlüsselung */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                SMTP-Host {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
              </label>
              <input
                type="text"
                value={smtp.smtpHost}
                onChange={e => handleChange('smtpHost', e.target.value)}
                disabled={!!isLocked}
                className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm ${isLocked ? 'bg-slate-100 text-slate-500' : 'focus:ring-2 focus:ring-blue-500'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Port {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
              </label>
              <input
                type="number"
                value={smtp.smtpPort}
                onChange={e => handleChange('smtpPort', parseInt(e.target.value) || 587)}
                disabled={!!isLocked}
                className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm ${isLocked ? 'bg-slate-100 text-slate-500' : 'focus:ring-2 focus:ring-blue-500'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Verschlüsselung {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
              </label>
              <select
                value={smtp.smtpSecure ? 'tls' : 'starttls'}
                onChange={e => handleChange('smtpSecure', e.target.value === 'tls')}
                disabled={!!isLocked}
                className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm ${isLocked ? 'bg-slate-100 text-slate-500' : 'focus:ring-2 focus:ring-blue-500'}`}
              >
                <option value="starttls">STARTTLS (Port 587)</option>
                <option value="tls">TLS/SSL (Port 465)</option>
              </select>
            </div>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Benutzername / E-Mail</label>
              <input
                type="email"
                value={smtp.smtpUser}
                onChange={e => handleChange('smtpUser', e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="noreply@firma.de"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passwort / App-Passwort</label>
              <input
                type="password"
                value={smtp.smtpPass}
                onChange={e => handleChange('smtpPass', e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Absender */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Absender-Adresse (From)</label>
            <input
              type="text"
              value={smtp.smtpFrom}
              onChange={e => handleChange('smtpFrom', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder='"Gefahrstoffmanagement" <noreply@firma.de>'
            />
          </div>

          {/* Test-Mail */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" /> Test-E-Mail senden
            </h3>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !testEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                {testing ? 'Sendet...' : 'Senden'}
              </button>
            </div>
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${testResult.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {testResult.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <p>{testResult.message}</p>
                  {testResult.url && (
                    <a href={testResult.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-1 underline">
                      <ExternalLink className="w-3 h-3" /> Ethereal-Vorschau öffnen
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
