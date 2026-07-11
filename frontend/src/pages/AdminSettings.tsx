import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, Database, Download, Upload } from 'lucide-react';
import { UserManager } from '../components/UserManager';
import { SmtpConfigPanel } from '../components/SmtpConfigPanel';
import { useToast } from '../components/Toast';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    companyName: '',
    legalForm: '',
    representatives: '',
    address: '',
    contact: '',
    registerInfo: '',
    primaryColor: '#0f172a',
    logoBase64: '',
    aiProvider: 'gemini',
    aiApiKey: '',
    smtpProvider: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: ''
  });
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('default-tenant-id');
  const { toast } = useToast();

  useEffect(() => {
    fetch(`http://localhost:3000/api/settings/${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setSettings(prev => ({ ...prev, ...data }));
      })
      .catch(() => toast('error', 'Einstellungen konnten nicht geladen werden.'));
  }, [tenantId]);

  const handleChange = (e: any) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3000/api/settings/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        toast('success', 'Einstellungen erfolgreich gespeichert.');
      } else {
        const data = await res.json();
        toast('error', data.error || 'Fehler beim Speichern.');
      }
    } catch {
      toast('error', 'Server nicht erreichbar.');
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

            {/* CD Settings */}
            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                🎨 Corporate Design (CD)
              </h2>
              <p className="text-sm text-slate-500 mb-6">Passen Sie das Tool optisch an Ihr Firmen-Branding an.</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Primärfarbe (App-Theme)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" name="primaryColor" value={settings.primaryColor || '#0f172a'} onChange={handleChange} className="h-10 w-14 rounded border border-slate-300 cursor-pointer" />
                    <input type="text" name="primaryColor" value={settings.primaryColor || '#0f172a'} onChange={handleChange} className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm uppercase" placeholder="#0F172A" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Firmenlogo (PNG/JPG)</label>
                  <div className="flex items-center gap-3">
                    {settings.logoBase64 ? (
                      <div className="relative border border-slate-200 rounded p-1">
                        <img src={settings.logoBase64} alt="Logo" className="h-12 w-auto object-contain" />
                        <button type="button" onClick={() => setSettings({...settings, logoBase64: ''})} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-200">×</button>
                      </div>
                    ) : (
                      <label className="bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium cursor-pointer transition-colors w-full text-center block">
                        Logo hochladen
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setSettings({...settings, logoBase64: ev.target?.result as string});
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* KI Parser */}
            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
                KI-Sicherheitsdatenblatt-Parser (SDB-Hook)
              </h2>
              <p className="text-sm text-slate-500 mb-6">Konfigurieren Sie hier die Schnittstelle zu Ihrem bevorzugten KI-Anbieter für das automatische Auslesen von hochgeladenen PDF-Sicherheitsdatenblättern.</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">KI Anbieter / LLM Provider</label>
                  <select name="aiProvider" value={settings.aiProvider || 'gemini'} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500">
                    <option value="gemini">Google Gemini (Empfohlen)</option>
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="custom">Benutzerdefinierter Webhook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">API-Key / Webhook-URL</label>
                  <input type="password" name="aiApiKey" value={settings.aiApiKey || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="sk-..." />
                  <p className="text-xs text-slate-500 mt-1">Ihr Key wird verschlüsselt in der Datenbank abgelegt.</p>
                </div>
              </div>
            </div>

            {/* SMTP Config — NEU */}
            <SmtpConfigPanel settings={settings} onSettingsChange={setSettings} />

            {/* Backup */}
            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Datensicherung & Archivierung (Backup/Restore)
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Erstellen Sie hier ein vollständiges ZIP/JSON-Backup der Datenbank.
              </p>
              <div className="flex gap-4 flex-wrap">
                <button type="button" onClick={() => { window.location.href = 'http://localhost:3000/api/backup/export'; }}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-5 h-5" /> Datenbank exportieren (JSON)
                </button>
                <button type="button" onClick={async () => {
                  const token = localStorage.getItem('token');
                  const res = await fetch('http://localhost:3000/api/backup/bundle', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `gefahrstoff-bundle-${Date.now()}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } else { alert('Fehler beim Erstellen des ZIP-Bundles.'); }
                }}
                  className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-5 h-5" /> 📦 Komplett-Bundle (ZIP + PDFs)
                </button>
                <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" /> Backup wiederherstellen
                  <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const json = JSON.parse(event.target?.result as string);
                        const res = await fetch('http://localhost:3000/api/backup/import', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(json)
                        });
                        const data = await res.json();
                        toast('success', data.message || 'Backup wiederhergestellt.');
                      } catch { toast('error', 'Fehler beim Wiederherstellen des Backups.'); }
                    };
                    reader.readAsText(file);
                  }} />
                </label>
              </div>
            </div>

            {/* Nutzerverwaltung */}
            <div className="col-span-2 mt-8 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                👥 Nutzerverwaltung & CSV-Import
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Importieren Sie Standortverantwortliche, Führungskräfte und andere Nutzer gebündelt über eine CSV-Datei.
                Format: <code>Email;Passwort;Rolle;StandortName</code>
              </p>
              <div className="flex gap-4 items-center">
                <label className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors border border-emerald-300">
                  <Upload className="w-5 h-5" /> Nutzer CSV hochladen
                  <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch('http://localhost:3000/api/users/import', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: formData
                      });
                      const data = await res.json();
                      if (res.ok) {
                        toast('success', data.message);
                        if (data.errors?.length) toast('info', `${data.errors.length} Zeilen mit Fehlern.`);
                      } else { toast('error', data.error); }
                    } catch { toast('error', 'Fehler beim Upload.'); }
                    e.target.value = '';
                  }} />
                </label>
              </div>

              <UserManager />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button type="submit" disabled={saving} className="bg-primary hover:bg-slate-800 text-white px-6 py-2.5 rounded font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
              <Save className="w-5 h-5" />
              {saving ? 'Speichert...' : 'Einstellungen speichern'}
            </button>
          </div>
        </form>

        {/* Custom Fields Definition */}
        <CustomFieldsSection />

        {/* SSO Konfiguration */}
        <SsoConfigPanel />

        {/* Offline-WBT Import */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
            🖥️ Offline-WBT Import
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Importieren Sie signierte Ergebnisdateien aus der Desktop-WBT-App.
          </p>
          <label className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors border border-amber-300 inline-flex">
            <Upload className="w-5 h-5" /> WBT-Bundle importieren (.json)
            <input type="file" accept=".json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async (ev) => {
                try {
                  const bundle = JSON.parse(ev.target?.result as string);
                  const res = await fetch('http://localhost:3000/api/lms/import-offline-bundle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(bundle)
                  });
                  const data = await res.json();
                  if (res.ok) {
                    toast('success', `${data.imported} Ergebnis(se) importiert, ${data.skipped} übersprungen.`);
                  } else {
                    toast('error', data.error || 'Import fehlgeschlagen.');
                  }
                } catch { toast('error', 'Fehler beim Lesen der Datei.'); }
              };
              reader.readAsText(file);
              e.target.value = '';
            }} />
          </label>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 p-4 rounded flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>Hinweis zur DSGVO:</strong> Diese Daten werden systemweit in das Impressum injiziert. SMTP-Passwörter und SSO-Secrets werden verschlüsselt in der Datenbank gespeichert.
          </p>
        </div>
      </div>
    </div>
  );
};

/** Custom Fields Section — erlaubt Admins, eigene Datenfelder für das Inventar zu definieren */
const CustomFieldsSection = () => {
  const [fields, setFields] = useState<{ name: string; type: string; required: boolean }[]>([]);
  const [newField, setNewField] = useState({ name: '', type: 'text', required: false });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('customFieldDefs');
      if (stored) setFields(JSON.parse(stored));
    } catch {}
  }, []);

  const save = (updated: typeof fields) => {
    setFields(updated);
    localStorage.setItem('customFieldDefs', JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!newField.name.trim()) return;
    if (fields.some(f => f.name.toLowerCase() === newField.name.trim().toLowerCase())) {
      alert('Ein Feld mit diesem Namen existiert bereits.');
      return;
    }
    save([...fields, { ...newField, name: newField.name.trim() }]);
    setNewField({ name: '', type: 'text', required: false });
  };

  const handleDelete = (index: number) => {
    if (!confirm(`Feld "${fields[index].name}" wirklich löschen? Bestehende Daten in diesem Feld bleiben in der DB erhalten, werden aber nicht mehr angezeigt.`)) return;
    save(fields.filter((_, i) => i !== index));
  };

  const typeLabels: Record<string, string> = {
    text: 'Text',
    number: 'Zahl',
    date: 'Datum',
    checkbox: 'Ja/Nein',
    select: 'Auswahl',
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
        🧩 Benutzerdefinierte Felder
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Definieren Sie hier zusätzliche Datenfelder, die im Stoffinventar angezeigt werden (z.B. „Verbrauchsmenge pro Schicht", „Lagerort-Code").
      </p>

      {fields.length > 0 && (
        <table className="w-full border border-slate-200 rounded-lg overflow-hidden mb-4">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm">
              <th className="p-3 text-left font-medium">Feldname</th>
              <th className="p-3 text-left font-medium">Typ</th>
              <th className="p-3 text-center font-medium">Pflichtfeld</th>
              <th className="p-3 text-center font-medium w-24">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-800">{f.name}</td>
                <td className="p-3 text-slate-600">{typeLabels[f.type] || f.type}</td>
                <td className="p-3 text-center">
                  {f.required ? <span className="text-red-600 font-bold">Ja</span> : <span className="text-slate-400">Nein</span>}
                </td>
                <td className="p-3 text-center">
                  <button 
                    onClick={() => handleDelete(i)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-end gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Feldname</label>
          <input 
            type="text" 
            value={newField.name} 
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="z.B. Verbrauch pro Schicht"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Feldtyp</label>
          <select 
            value={newField.type} 
            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="text">Text</option>
            <option value="number">Zahl</option>
            <option value="date">Datum</option>
            <option value="checkbox">Ja/Nein</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap pb-0.5">
          <input 
            type="checkbox" 
            checked={newField.required} 
            onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300"
          />
          Pflichtfeld
        </label>
        <button 
          onClick={handleAdd}
          disabled={!newField.name.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded font-medium text-sm disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          + Hinzufügen
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-slate-400 mt-3 italic">Noch keine benutzerdefinierten Felder angelegt.</p>
      )}
    </div>
  );
};

/** SSO Configuration Panel — OIDC / SAML 2.0 */
const SsoConfigPanel = () => {
  const [sso, setSso] = useState({
    ssoEnabled: false, ssoProvider: 'oidc', ssoClientId: '', ssoClientSecret: '',
    ssoIssuerUrl: '', ssoCallbackUrl: 'http://localhost:3000/api/auth/sso/callback', ssoGroupMapping: ''
  });
  const [mappings, setMappings] = useState<{ id: string; adGroupName: string; systemRole: string }[]>([]);
  const [newMapping, setNewMapping] = useState({ adGroupName: '', systemRole: 'VIEWER' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3000/api/auth/sso/config', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(data => { if (data && !data.error) setSso(prev => ({ ...prev, ...data })); }).catch(() => {});
    
    fetch('http://localhost:3000/api/auth/sso/mappings', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data)) setMappings(data); }).catch(() => {});
  }, []);

  const saveSso = async () => {
    setSaving(true);
    try {
      await fetch('http://localhost:3000/api/auth/sso/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(sso)
      });
      alert('SSO-Konfiguration gespeichert.');
    } catch { alert('Fehler.'); }
    setSaving(false);
  };

  const addMapping = async () => {
    if (!newMapping.adGroupName) return;
    try {
      const res = await fetch('http://localhost:3000/api/auth/sso/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(newMapping)
      });
      const data = await res.json();
      if (res.ok) {
        setMappings([...mappings, data]);
        setNewMapping({ adGroupName: '', systemRole: 'VIEWER' });
      } else { alert(data.error); }
    } catch {}
  };

  const deleteMapping = async (id: string) => {
    await fetch(`http://localhost:3000/api/auth/sso/mappings/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    setMappings(mappings.filter(m => m.id !== id));
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
        🔐 Enterprise SSO (OIDC / SAML 2.0)
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Konfigurieren Sie Single Sign-On mit Microsoft Entra ID, Google Workspace oder einem anderen OIDC-Provider.
      </p>

      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={sso.ssoEnabled || false} onChange={e => setSso({ ...sso, ssoEnabled: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300" />
          <span className="font-medium text-slate-700">SSO aktivieren</span>
        </label>

        {sso.ssoEnabled && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Provider</label>
              <select value={sso.ssoProvider || 'oidc'} onChange={e => setSso({ ...sso, ssoProvider: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white text-sm">
                <option value="oidc">OpenID Connect (Microsoft, Google, etc.)</option>
                <option value="saml">SAML 2.0</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Client ID</label>
              <input type="text" value={sso.ssoClientId || ''} onChange={e => setSso({ ...sso, ssoClientId: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded text-sm font-mono" placeholder="z.B. a1b2c3d4-..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Client Secret</label>
              <input type="password" value={sso.ssoClientSecret || ''} onChange={e => setSso({ ...sso, ssoClientSecret: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Issuer URL</label>
              <input type="url" value={sso.ssoIssuerUrl || ''} onChange={e => setSso({ ...sso, ssoIssuerUrl: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded text-sm font-mono" placeholder="https://login.microsoftonline.com/{tenantId}/v2.0" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Callback URL (automatisch)</label>
              <input type="text" value={sso.ssoCallbackUrl || ''} readOnly
                className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-100 text-slate-500 font-mono" />
            </div>

            <div className="col-span-2 flex justify-end">
              <button onClick={saveSso} disabled={saving}
                className="bg-primary hover:bg-slate-800 text-white px-5 py-2 rounded font-medium text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Speichert...' : 'SSO-Konfiguration speichern'}
              </button>
            </div>
          </div>
        )}

        {sso.ssoEnabled && (
          <div className="mt-6">
            <h3 className="font-bold text-slate-700 mb-2">AD-Gruppen → Rollen-Mapping</h3>
            <p className="text-xs text-slate-500 mb-3">Ordnen Sie Active Directory-Gruppen den System-Rollen zu.</p>
            
            {mappings.length > 0 && (
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden mb-3">
                <thead><tr className="bg-slate-50 text-xs text-slate-600">
                  <th className="p-2 text-left font-medium">AD-Gruppenname</th>
                  <th className="p-2 text-left font-medium">System-Rolle</th>
                  <th className="p-2 text-center font-medium w-20">Aktion</th>
                </tr></thead>
                <tbody>
                  {mappings.map(m => (
                    <tr key={m.id} className="border-t border-slate-100 text-sm">
                      <td className="p-2 font-mono text-slate-800">{m.adGroupName}</td>
                      <td className="p-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{m.systemRole}</span></td>
                      <td className="p-2 text-center"><button onClick={() => deleteMapping(m.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Entfernen</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input type="text" value={newMapping.adGroupName} onChange={e => setNewMapping({ ...newMapping, adGroupName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="AD-Gruppenname (z.B. GS_Admins)" />
              </div>
              <select value={newMapping.systemRole} onChange={e => setNewMapping({ ...newMapping, systemRole: e.target.value })}
                className="p-2 border border-slate-300 rounded text-sm bg-white w-40">
                <option value="ADMIN">Admin</option>
                <option value="UNIT_LEADER">Standortleiter</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button onClick={addMapping} disabled={!newMapping.adGroupName}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
                + Mapping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
