import { useState, useEffect } from 'react';
import { ShieldAlert, Flame, Skull, AlertTriangle, Droplets } from 'lucide-react';

export const FireDepartmentView = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/export/fire-dept')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="p-8 text-center">Lade Feuerwehr-Daten...</div>;

  // Gruppieren nach WorkArea / Location
  const grouped = data.reduce((acc, item) => {
    const locName = item.workArea?.location?.name || 'Unbekannter Standort';
    const areaName = item.workArea?.name || 'Unbekannter Bereich';
    const key = `${locName} - ${areaName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Richtige GHS-Piktogramme (Lokale PNGs)
  const renderGHS = (ms: any) => {
    const pictograms = [];
    const h = ms.hPhrases || '';

    // GHS01 Explosiv (H200-205)
    if (h.includes('H20')) pictograms.push('/ghs/ghs01.png');
    // GHS02 Entzündbar (H220-228)
    if (h.includes('H22')) pictograms.push('/ghs/ghs02.png');
    // GHS03 Brandfördernd (H270, H271, H272)
    if (h.includes('H27')) pictograms.push('/ghs/ghs03.png');
    // GHS04 Gas unter Druck (H280, H281)
    if (h.includes('H28')) pictograms.push('/ghs/ghs04.png');
    // GHS05 Ätzend (H314, H318)
    if (h.includes('H314') || h.includes('H318')) pictograms.push('/ghs/ghs05.png');
    // GHS06 Akut Toxisch (H300, H310, H330)
    if (ms.isAcuteToxic || h.includes('H300') || h.includes('H310') || h.includes('H330')) pictograms.push('/ghs/ghs06.png');
    // GHS08 Gesundheitsgefahr (CMR, H304, H370)
    if (ms.isKrebserzeugend || ms.isMutagen || ms.isReproduktionstoxisch || h.includes('H304')) pictograms.push('/ghs/ghs08.png');
    // GHS07 Ausrufezeichen (H315, H317, H319, H335)
    if (!pictograms.includes('/ghs/ghs06.png') && (h.includes('H315') || h.includes('H317') || h.includes('H319') || h.includes('H332') || h.includes('H312') || h.includes('H302'))) {
      pictograms.push('/ghs/ghs07.png');
    }
    // GHS09 Umwelt (H400, H410, H411)
    if (h.includes('H400') || h.includes('H410') || h.includes('H411')) {
      pictograms.push('/ghs/ghs09.png');
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {pictograms.map((url, i) => (
          <img key={i} src={url} alt="GHS" className="w-8 h-8 object-contain" />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen p-8 text-slate-900 print:p-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end border-b-4 border-red-600 pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-600" />
              Gefahrstoff-Verzeichnis (§ 22 GefStoffV)
            </h1>
            <p className="text-slate-500 mt-2">Ausgabe für Feuerwehr und Rettungskräfte</p>
          </div>
          <div className="print:hidden flex gap-3">
            <button 
              onClick={() => window.close()}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-300 transition-colors"
            >
              Schließen
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors"
            >
              Als PDF drucken
            </button>
          </div>
        </div>

        {Object.entries(grouped).map(([areaName, items]) => (
          <div key={areaName} className="mb-12 break-inside-avoid">
            <h2 className="text-xl font-bold bg-slate-100 p-3 border-l-4 border-slate-800 mb-4">
              {areaName}
            </h2>
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border border-slate-300 w-1/4">Produktname</th>
                  <th className="p-3 border border-slate-300 w-1/4">Gefahren (GHS)</th>
                  <th className="p-3 border border-slate-300">H-Sätze</th>
                  <th className="p-3 border border-slate-300 w-32">Menge / Max</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const ms = item.masterSubstance;
                  return (
                    <tr key={item.id}>
                      <td className="p-3 border border-slate-300 font-bold">{ms.productName}</td>
                      <td className="p-3 border border-slate-300">{renderGHS(ms)}</td>
                      <td className="p-3 border border-slate-300 text-sm">{ms.hPhrases}</td>
                      <td className="p-3 border border-slate-300 font-mono">
                        {item.annualAmount || 0} kg 
                        {item.maxStorageAmount ? ` / Max: ${item.maxStorageAmount} kg` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        
        <div className="mt-16 text-sm text-slate-500 text-center print:block hidden">
          Generiert am {new Date().toLocaleDateString('de-DE')} durch das Gefahrstoff-Managementsystem.
        </div>
      </div>
    </div>
  );
};
