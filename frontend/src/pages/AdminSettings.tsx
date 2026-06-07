import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, Database, Download, Upload } from 'lucide-react';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    companyName: '',
    legalForm: '',
    representatives: '',
    address: '',
    contact: '',
    registerInfo: '',
    primaryColor: '#0f172a',
    logoBase64: ''
  });
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('default-tenant-id'); // In einer echten App aus dem Auth Context

  useEffect(() => {
    fetch(`/api/settings/${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setSettings(data);
      })
      .catch(console.error);
  }, [tenantId]);

  const handleChange = (e: any) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/settings/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      alert('Einstellungen erfolgreich gespeichert.');
    } catch (err) {
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">System-Einstellungen</h1>
            <p className="text-slate-500">Konfigurieren Sie hier die gesetzlichen Pflichtangaben (DDG) für das Impressum.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Firmenname</label>
              <input type="text" name="companyName" value={settings.companyName} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="z.B. Muster GmbH" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rechtsform</label>
              <input type="text" name="legalForm" value={settings.legalForm} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="z.B. Gesellschaft mit beschränkter Haftung" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Vertretungsberechtigte (z.B. Geschäftsführer)</label>
              <input type="text" name="representatives" value={settings.representatives} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Anschrift</label>
              <textarea name="address" value={settings.address} onChange={handleChange} rows={3} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="Straße, PLZ, Ort"></textarea>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Kontaktinformationen (Telefon, E-Mail)</label>
              <textarea name="contact" value={settings.contact} onChange={handleChange} rows={3} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Registergericht & Registernummer</label>
              <input type="text" name="registerInfo" value={settings.registerInfo} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="z.B. Amtsgericht München, HRB 12345" />
            </div>

            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                🎨 Corporate Design (CD)
              </h2>
              <p className="text-sm text-slate-500 mb-6">Passen Sie das Tool optisch an Ihr Firmen-Branding an.</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Primärfarbe (App-Theme)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" name="primaryColor" value={(settings as any).primaryColor || '#0f172a'} onChange={handleChange} className="h-10 w-14 rounded border border-slate-300 cursor-pointer" />
                    <input type="text" name="primaryColor" value={(settings as any).primaryColor || '#0f172a'} onChange={handleChange} className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm uppercase" placeholder="#0F172A" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Firmenlogo (PNG/JPG)</label>
                  <div className="flex items-center gap-3">
                    {(settings as any).logoBase64 ? (
                      <div className="relative border border-slate-200 rounded p-1">
                        <img src={(settings as any).logoBase64} alt="Logo" className="h-12 w-auto object-contain" />
                        <button type="button" onClick={() => setSettings({...settings, logoBase64: ''})} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-200">×</button>
                      </div>
                    ) : (
                      <label className="bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium cursor-pointer transition-colors w-full text-center block">
                        Logo hochladen
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setSettings({...settings, logoBase64: ev.target?.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
                KI-Sicherheitsdatenblatt-Parser (SDB-Hook)
              </h2>
              <p className="text-sm text-slate-500 mb-6">Konfigurieren Sie hier die Schnittstelle zu Ihrem bevorzugten KI-Anbieter für das automatische Auslesen von hochgeladenen PDF-Sicherheitsdatenblättern.</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">KI Anbieter / LLM Provider</label>
                  <select name="aiProvider" value={(settings as any).aiProvider || 'gemini'} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500">
                    <option value="gemini">Google Gemini (Empfohlen)</option>
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="custom">Benutzerdefinierter Webhook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">API-Key / Webhook-URL</label>
                  <input type="password" name="aiApiKey" value={(settings as any).aiApiKey || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="sk-..." />
                  <p className="text-xs text-slate-500 mt-1">Ihr Key wird verschlüsselt in der Datenbank abgelegt.</p>
                </div>
              </div>
            </div>
            
            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Datensicherung & Archivierung (Backup/Restore)
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Erstellen Sie hier ein vollständiges ZIP/JSON-Backup der Datenbank. Dies dient als Archivierung (Nachweis für die Berufsgenossenschaft) oder als Fallback-Sicherung.
              </p>
              
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => {
                    window.location.href = 'http://localhost:3000/api/backup/export';
                  }} 
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" /> Gesamte Datenbank exportieren (JSON)
                </button>
                <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" /> Backup wiederherstellen
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const json = JSON.parse(event.target?.result as string);
                          const res = await fetch('/api/backup/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(json)
                          });
                          const data = await res.json();
                          alert(data.message || 'Backup wiederhergestellt.');
                        } catch (err) {
                          alert('Fehler beim Wiederherstellen des Backups.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button type="submit" disabled={saving} className="bg-primary hover:bg-slate-800 text-white px-6 py-2.5 rounded font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
              <Save className="w-5 h-5" />
              {saving ? 'Speichert...' : 'Einstellungen speichern'}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-blue-50 border border-blue-200 p-4 rounded flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>Hinweis zur DSGVO:</strong> Diese Daten werden systemweit in das Impressum injiziert und sind aus jedem Tenant heraus abrufbar. Die Datenschutzerklärung generiert sich automatisch gemäß der gesetzlichen Vorgaben.
          </p>
        </div>
      </div>
    </div>
  );
};
