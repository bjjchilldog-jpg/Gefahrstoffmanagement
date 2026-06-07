import { ShieldCheck, Lock, FileDigit, Server } from 'lucide-react';

export const DatenschutzView = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
          <ShieldCheck className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Datenschutzerklärung</h1>
            <p className="text-slate-500">Transparenz-Information zur Verarbeitung im Gefahrstoff-System</p>
          </div>
        </div>

        <div className="space-y-10 text-slate-600 leading-relaxed">
          
          <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Revisionssicheres Audit-Log (Compliance)</h2>
                <p>
                  Zur Erfüllung gesetzlicher Vorgaben im Umgang mit Gefahrstoffen (GefStoffV) verarbeitet dieses System Nutzerdaten innerhalb eines kryptografisch abgesicherten Audit-Logs. 
                  Jeder schreibende Zugriff (Anlegen, Ändern, Löschen von Stoffen) wird mit Ihrer <strong>Benutzer-ID</strong>, Ihrer <strong>IP-Adresse</strong> und einem <strong>Zeitstempel</strong> manipulationssicher protokolliert. 
                  Diese Daten werden mittels SHA-256 Hashes versiegelt und ausschließlich zur Nachvollziehbarkeit bei Betriebsprüfungen verwendet.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div className="flex items-start gap-4">
              <FileDigit className="w-6 h-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Personenbezogene Schutzmaßnahmen</h2>
                <p>
                  Im Rahmen der Unterweisungs- und Vorsorgeplanung werden Namen von Verantwortlichen (z.B. Sicherheitsfachkräfte, Betriebsärzte) gespeichert.
                  Die Rechtsgrundlage für diese Verarbeitung ist Art. 6 Abs. 1 lit. c DSGVO i.V.m. § 14 GefStoffV (Arbeitsschutzgesetz).
                  Eine Übermittlung dieser Daten an unbefugte Dritte findet nicht statt.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div className="flex items-start gap-4">
              <Server className="w-6 h-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Server- und Logdaten</h2>
                <p>
                  Aus Gründen der technischen Sicherheit und zur Abwehr von Angriffsversuchen werden kurzfristig Server-Logfiles (IP-Adresse, Browser-Agent, Zugriffszeit) gespeichert.
                  Diese Daten werden nach spätestens 14 Tagen automatisiert gelöscht oder anonymisiert, sofern kein sicherheitsrelevanter Vorfall eine längere Aufbewahrung erfordert.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
