import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export const ImpressumView = () => {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    // In einer echten Umgebung müssten wir den aktuellen tenantId dynamisch laden
    // Für diesen Showcase laden wir einfach den ersten (oder Dummy-Daten)
    fetch('/api/settings/default-tenant-id') // Wir passen die Route an, wenn die UI komplett steht
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-slate-800">Impressum</h1>
        </div>

        <div className="space-y-6 text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Angaben gemäß DDG</h2>
            {settings ? (
              <>
                <p><strong>{settings.companyName}</strong></p>
                <p>{settings.legalForm}</p>
                <p className="whitespace-pre-line">{settings.address}</p>
              </>
            ) : (
              <p className="italic text-slate-400">Lade Anbieterkennzeichnung...</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Vertreten durch</h2>
            <p>{settings?.representatives || '-'}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Kontakt</h2>
            <p className="whitespace-pre-line">{settings?.contact || '-'}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Registereintrag</h2>
            <p className="whitespace-pre-line">{settings?.registerInfo || '-'}</p>
          </section>
        </div>
      </div>
    </div>
  );
};
