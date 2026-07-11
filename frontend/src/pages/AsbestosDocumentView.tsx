import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Printer, ArrowLeft, ShieldAlert, CheckSquare } from 'lucide-react';

export const AsbestosDocumentView = () => {
  const { locationId, findingId } = useParams();
  const navigate = useNavigate();

  const [finding, setFinding] = React.useState<any>(null);
  const [activity, setActivity] = React.useState('Kleinsttätigkeit'); // Placeholder for now

  React.useEffect(() => {
    fetch('http://localhost:3000/api/tenants')
      .then(res => res.json())
      .then(tenants => {
        for (const t of tenants) {
          const loc = t.locations.find((l: any) => l.id === locationId);
          if (loc && loc.asbestosFindings) {
            const f = loc.asbestosFindings.find((f: any) => f.id === findingId);
            if (f) {
              setFinding(f);
              setActivity(f.status === 'Verdacht' ? 'Kleinsttätigkeit' : 'Umfangreiche Sanierung');
            }
          }
        }
      });
  }, [locationId, findingId]);

  if (!finding) return <div className="p-8">Lade Dokument...</div>;

  if (true) {
    return (
      <div className="max-w-4xl mx-auto bg-white min-h-screen p-8 shadow-lg print:shadow-none print:p-0">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" /> Zurück
          </button>
          <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold">
            <Printer className="w-4 h-4" /> TRGS 555 Drucken
          </button>
        </div>

        {/* TRGS 555 BETRIEBSANWEISUNG LAYOUT */}
        <div className="border-[12px] border-orange-500 p-8 relative">
          <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 font-bold text-sm">
            ASBEST
          </div>
          
          <div className="flex justify-between border-b-2 border-slate-800 pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase">Betriebsanweisung</h1>
              <p className="text-lg font-bold text-slate-700 mt-1">gemäß § 14 GefStoffV / TRGS 555</p>
            </div>
            <div className="text-right text-sm">
              <p>Bauteil: {finding.component}</p>
              <p>Fundort: {finding.exactSpot}</p>
              <p>Datum: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold bg-orange-500 text-white p-2 mb-2 uppercase">1. Arbeitsbereich / Tätigkeit</h2>
            <p className="font-bold text-lg mb-2">
              Asbest-Kategorie: {finding.status} ({activity})
            </p>
            <p>
              {activity === 'Umfangreiche Sanierung' ? 
                'Umfangreiche Arbeiten (z.B. großflächiges Schleifen, Stemmen, Entfernen von Bodenbelägen/Putz). Zutritt nur für sachkundiges Personal (TRGS 519 Anlage 3)! Anzeige bei Behörde (7-Tage-Frist) ist zwingend erfolgt.' : 
                'Begehung asbestverdächtiger Gebäude sowie Kleinsttätigkeiten mit Asbest (gemäß DGUV 201-012). Keine Abbrucharbeiten, keine Sanierungen mit Schwarz-Weiß-Trennung oder Schleusensystemen.'}
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold bg-orange-500 text-white p-2 mb-2 uppercase">2. Gefahren für Mensch und Umwelt</h2>
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-red-100 flex items-center justify-center shrink-0 border border-red-300">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {activity === 'Umfangreiche Sanierung' ? (
                  <>
                    <li><strong>Gefahrstoffe (Asbest):</strong> Massive Faserfreisetzung bei großflächiger Bearbeitung. Hohes Risiko der Inhalation lungengängiger Fasern (Krebserzeugend Kat. 1A). Gefahr der Überschreitung des Akzeptanzwerts ohne technische Schutzsysteme.</li>
                    <li><strong>Arbeitsumfeld:</strong> Physische Belastung durch Arbeiten unter Vollschutz (Hitzestau, eingeschränkte Sicht). Gefahr der großflächigen Faserverschleppung in unbelastete Gebäudeteile. Sturz- und Stolpergefahr im Schwarzbereich.</li>
                    <li><strong>Technik & Energie:</strong> Elektrische Gefährdung durch Sanierungsmaschinen in potenziell feuchter Umgebung. Gefahr durch verdeckte Leitungen. Lärm- und Vibrationsbelastung.</li>
                  </>
                ) : (
                  <>
                    <li><strong>Inhalation:</strong> Einatmen von Fasern führt zu unheilbaren Lungen- und Krebserkrankungen.</li>
                    <li><strong>Kontamination:</strong> Ohne emissionsarme Verfahren (BT-Verfahren) wird Staub unmittelbar in die Raumluft abgegeben.</li>
                    <li><strong>Rechtliche Risiken:</strong> Verstöße gegen Sachkunde- (TRGS 519) oder Meldepflichten führen zu Baustopps und Haftung.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold bg-blue-600 text-white p-2 mb-2 uppercase">3. Schutzmaßnahmen und Verhaltensregeln</h2>
            <ul className="list-disc pl-5 space-y-2">
              {activity === 'Umfangreiche Sanierung' ? (
                <>
                  <li><strong>Vor der Tätigkeit:</strong> Behörden-Check (Fristgerechte Anzeige 7 Tage erfolgt). Errichtung eines staubdichten Schwarzbereichs mit 3-Kammer-Schleuse. Installation und Prüfung der Unterdruckhaltegeräte (UHG) mit HEPA-Filtern.</li>
                  <li><strong>Während der Tätigkeit:</strong> Zugang nur über Schleuse; PSA-Kontrolle (Vollmaske/Gebläse, Typ 5 Anzug). Anwendung von Nassverfahren oder Direktabsaugung am Werkzeug. Kontinuierliche Kontrolle des Unterdrucks.</li>
                  <li><strong>Nach der Tätigkeit:</strong> Zwingende Reinigung von Mensch und Gerät in der Schleuseneinheit. Verpackung des Abfalls in Big-Bags innerhalb der Abschottung. Offizielle Freigabemessung vor Rückbau der Abschottung.</li>
                </>
              ) : (
                <>
                  <li><strong>Generell:</strong> Nicht essen, trinken, rauchen im Arbeitsbereich.</li>
                  <li><strong>Vor der Tätigkeit:</strong> Informationen über Asbestvorkommen prüfen (Gebäude vor 1993 = Generalvermutung). Bereitstellung von FFP3-Maske, Einweg-Handschuhen und Einweg-Overall (Kat. III). Einsatz zertifizierter H-Sauger mit Bohrloch-Absaugadapter.</li>
                  <li><strong>Während der Tätigkeit:</strong> BT-Verfahren anwenden (Sauger vor dem Bohren starten, Bohrer bei laufendem Sauger ziehen). Mechanische Bearbeitung ohne Absaugung ist strikt untersagt.</li>
                  <li><strong>Nach der Tätigkeit:</strong> PSA unmittelbar vor Ort in reißfesten Behältern als Asbestabfall entsorgen. Reinigung von Adapter und Schläuchen (feucht abwischen oder über H-Sauger).</li>
                </>
              )}
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold bg-orange-500 text-white p-2 mb-2 uppercase">4. Verhalten im Gefahrfall</h2>
            <ul className="list-decimal pl-5 space-y-2 font-bold text-red-700">
              {activity === 'Umfangreiche Sanierung' ? (
                <>
                  <li>STOPP: Bei sichtbarem Staub, UHG-Alarm oder Folienriss Arbeit sofort einstellen. Maschinen ausschalten.</li>
                  <li>RAUS: Bereich sofort über Schleuse verlassen. Schwarzbereich verschließen und absperren. Bei PSA-Defekt Atem anhalten.</li>
                  <li>MELDEN: Sachkundigen und Bauleitung sofort informieren. Raumluftmessung veranlassen. Arbeiten erst nach ausdrücklicher Freigabe fortsetzen.</li>
                </>
              ) : (
                <>
                  <li>STOPP: Bei sichtbarem Staub oder Defekt der Absaugung sofort abbrechen.</li>
                  <li>RAUS: Bereich verlassen und gegen unbefugten Zutritt sichern (Verschleppungsschutz).</li>
                  <li>DEKONTAMINATION: PSA vor Ort ablegen; Stäube niemals trocken kehren.</li>
                  <li>MELDEN: Vorfall sofort an Sachkundige (TRGS 519) melden. Erfassung der Mitarbeiter im Expositionsverzeichnis.</li>
                </>
              )}
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold bg-green-600 text-white p-2 mb-2 uppercase">5. Erste Hilfe</h2>
            <div className="bg-green-50 p-4 border border-green-200 text-sm">
              <p className="font-bold mb-2 text-green-900">Notruf: 112 | Giftnotruf: _________________ | D-Arzt: _________________</p>
              {activity === 'Umfangreiche Sanierung' ? (
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Wichtig: Im Schwarzbereich gilt Leben vor Staubfreiheit!</strong></li>
                  <li>Eigenschutz: Helfer müssen zwingend PSA tragen, bevor sie den Schwarzbereich betreten.</li>
                  <li>Rettung: Verletzte Person sofort aus der Gefahrenzone in die Schleuse bringen.</li>
                  <li>Rettungsdienst zwingend informieren: "Achtung, Kontakt mit Asbeststaub möglich!"</li>
                </ul>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hautkontakt: Staub nicht abblasen; sofort gründlich mit Wasser und Seife waschen.</li>
                  <li>Augenkontakt: Unter fließendem Wasser mehrere Minuten spülen.</li>
                  <li>Nachsorge: Nach ungeschütztem Kontakt einen Durchgangsarzt zur Dokumentation aufsuchen.</li>
                </ul>
              )}
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  // --- CHECKLISTE ---
  return (
    <div className="max-w-4xl mx-auto bg-slate-50 min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" /> Zurück
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold shadow-sm">
          <CheckSquare className="w-4 h-4" /> Checkliste abschließen & Speichern
        </button>
      </div>

      <div className="bg-white p-8 shadow-sm border border-slate-200 rounded-lg">
        <div className="text-center border-b border-slate-200 pb-6 mb-6">
          <h1 className="text-2xl font-black text-slate-800">Anlage 1: Checkliste Asbest zur objektbezogenen Bewertung</h1>
          <p className="text-slate-500 mt-1">Diese Checkliste erfüllt den Zweck einer objektbezogenen Gefährdungsbeurteilung vor Ort</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded border border-slate-200">
          <div><label className="text-xs font-bold text-slate-500">Objekt/Raum</label><div className="font-medium">{finding.exactSpot}</div></div>
          <div><label className="text-xs font-bold text-slate-500">Datum / Uhrzeit</label><div className="font-medium">{new Date().toLocaleString()}</div></div>
          <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Tätigkeitstyp</label><div className="font-medium text-blue-700">{activity}</div></div>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 border border-slate-300 w-12">Nr.</th>
              <th className="p-3 border border-slate-300">Beurteilungspunkt</th>
              <th className="p-3 border border-slate-300 text-center w-16">Ja</th>
              <th className="p-3 border border-slate-300 text-center w-16">Nein</th>
              <th className="p-3 border border-slate-300">Bemerkung / Foto</th>
            </tr>
          </thead>
          <tbody>
            {activity === 'Umfangreiche Sanierung' ? (
              <>
                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-3 border border-slate-300 text-blue-800">A - Vorbereitungs-Check</td></tr>
                <tr><td className="p-3 border border-slate-300">A1</td><td className="p-3 border border-slate-300">Behördenmeldung: Liegt die Bestätigung der Anzeige (7-Tage-Frist) vor?</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="a1" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="a1" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
                <tr><td className="p-3 border border-slate-300">A2</td><td className="p-3 border border-slate-300">Unterdruck-Monitor: Ist das Unterdruckhaltegerät (UHG) geprüft und aktiv?</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="a2" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="a2" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
                <tr><td className="p-3 border border-slate-300">A3</td><td className="p-3 border border-slate-300">Schleusensystem: Ist die 3-Kammer-Schleuse funktionsfähig?</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="a3" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="a3" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
                
                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-3 border border-slate-300 text-blue-800">B - Durchführungs-Check</td></tr>
                <tr><td className="p-3 border border-slate-300">B1</td><td className="p-3 border border-slate-300">Staubbindung: Wird konsequent nass gearbeitet oder direkt abgesaugt?</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="b1" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="b1" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
                <tr><td className="p-3 border border-slate-300">B2</td><td className="p-3 border border-slate-300">Zutrittskontrolle: Betreten nur Personen mit Sachkunde Anlage 3 den Bereich?</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="b2" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="b2" /></td><td className="p-1 border border-slate-300"><button className="text-xs bg-slate-100 border p-1 rounded hover:bg-slate-200 w-full text-left text-slate-500 flex items-center gap-1">📷 Foto hochladen</button></td></tr>
              </>
            ) : (
              <>
                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-3 border border-slate-300 text-blue-800">A - Vorbereitungs-Check (Kleinsttätigkeit)</td></tr>
                <tr><td className="p-3 border border-slate-300">A1</td><td className="p-3 border border-slate-300">Baujahr geprüft: Errichtung vor 31.10.1993? Wenn ja, gilt Generalvermutung.</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="ka1" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="ka1" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
                <tr><td className="p-3 border border-slate-300">A2</td><td className="p-3 border border-slate-300">PSA angelegt: FFP3-Maske, Einweg-Overall Typ 5/6, Handschuhe.</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="ka2" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="ka2" /></td><td className="p-1 border border-slate-300"><button className="text-xs bg-slate-100 border p-1 rounded hover:bg-slate-200 w-full text-left text-slate-500 flex items-center gap-1">📷 Foto hochladen</button></td></tr>
                <tr><td className="p-3 border border-slate-300">A3</td><td className="p-3 border border-slate-300">Technik-Check: H-Sauger und Bohrfix-Adapter einsatzbereit.</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="ka3" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="ka3" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
                
                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-3 border border-slate-300 text-blue-800">B - Durchführungs-Check</td></tr>
                <tr><td className="p-3 border border-slate-300">B1</td><td className="p-3 border border-slate-300">Unterdruck: Haftet der Saug-Adapter selbstständig an der Wand?</td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="kb1" /></td><td className="p-3 border border-slate-300 text-center"><input type="radio" name="kb1" /></td><td className="p-1 border border-slate-300"><input type="text" className="w-full text-xs p-1" placeholder="Notiz..." /></td></tr>
              </>
            )}
          </tbody>
        </table>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 rounded" />
            <div>
              <div className="font-bold text-slate-800">Abschluss der Gefährdungsbeurteilung vor Ort</div>
              <div className="text-sm text-slate-600">Hiermit bestätige ich, dass die oben genannten Prüfpunkte erfolgreich kontrolliert wurden und das gewählte Arbeitsverfahren (BT) der betrieblichen Festlegung entspricht.</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
