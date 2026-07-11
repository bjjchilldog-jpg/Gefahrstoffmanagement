const fs = require('fs');

const path = 'C:/Users/Administrator/.gemini/antigravity/scratch/gefahrstoff-management/frontend/src/pages/GbuFormView.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the index of `<div className="mt-8 flex justify-between">`
const startIndex = lines.findIndex(l => l.includes('<div className="mt-8 flex justify-between">'));

const correctCode = `            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(4)} className="text-slate-600 hover:text-slate-900 px-4 py-2 font-medium">Zurück</button>
              <div className="flex gap-3">
                {substanceType === 'HAUTSCHUTZ' && (
                  <button type="button" className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-6 py-2 rounded-md font-bold transition-colors">
                    Hautschutzplan generieren
                  </button>
                )}
                <button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-md font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                  <CheckCircle className="w-5 h-5" /> {isSubmitting ? 'Wird gespeichert...' : 'GBU Rechtskräftig Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      
      {/* Rechte Seite: PDF Vorschau (Sticky Sidebar) */}
      {sdbPreviewUrl && (
        <div className="hidden xl:block w-[600px] flex-shrink-0">
          <div className="sticky top-4 h-[calc(100vh-2rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4"/> SDB Vorschau</span>
              <button onClick={() => { setSdbPreviewUrl(null); setSdbFile(null); }} className="text-red-500 hover:text-red-700 font-medium">Schließen</button>
            </div>
            <div className="flex-1 w-full bg-slate-300">
              <object data={sdbPreviewUrl} type="application/pdf" className="w-full h-full">
                <iframe src={sdbPreviewUrl} className="w-full h-full" title="PDF Vorschau" />
              </object>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Mit Smartphone verbinden</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Scanne diesen QR-Code mit der normalen Kamera deines Smartphones. Das Etikett wird danach direkt auf das Handy fotografiert und die Daten landen automatisch hier auf dem PC!
            </p>
            
            <div className="flex justify-center mb-6 bg-slate-50 p-4 rounded-lg">
              <QRCodeSVG value={pairingUrl} size={200} />
            </div>
            
            <div className="animate-pulse text-indigo-600 font-medium mb-6 text-sm">
              Warte auf Scan vom Smartphone...
            </div>
            
            <button 
              onClick={() => {
                setShowQrModal(false);
                setPairingSessionId('');
              }}
              className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium w-full"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
`;

const newLines = lines.slice(0, startIndex).join('\n') + '\n' + correctCode;
fs.writeFileSync(path, newLines);
console.log('Fixed syntax error in GbuFormView.tsx');
