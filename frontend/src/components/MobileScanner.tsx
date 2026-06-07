import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Scan, Loader2 } from 'lucide-react';

export const MobileScanner = ({ onPhrasesDetected, onFileProcessed }: { onPhrasesDetected?: (phrases: string[]) => void, onFileProcessed?: (phrases: string[], file: File) => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        file,
        'deu+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;
      // Regex to find H-phrases (e.g., H300, H314)
      const hPhraseRegex = /H\d{3}[a-zA-Z]*/g;
      const matches = text.match(hPhraseRegex);
      
      if (matches) {
        // Filter unique phrases
        const uniquePhrases = Array.from(new Set(matches));
        if (onPhrasesDetected) onPhrasesDetected(uniquePhrases);
        if (onFileProcessed) onFileProcessed(uniquePhrases, file);
      } else {
        alert("Keine H-Sätze auf dem Foto erkannt.");
        if (onFileProcessed) onFileProcessed([], file); // Weiterhin hochladen erlauben
      }
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Fehler bei der Texterkennung.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <Scan className="h-5 w-5 text-accent" />
          Mobile OCR-Erkennung (H-Sätze)
        </h4>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Fotografieren Sie ein Gefahrstoffetikett. Das System erkennt automatisch die H-Sätze und wählt sie aus.
      </p>

      {isScanning ? (
        <div className="flex flex-col items-center py-4">
          <Loader2 className="h-8 w-8 text-accent animate-spin mb-2" />
          <p className="text-sm font-medium text-slate-600">Analysiere Bild... {progress}%</p>
        </div>
      ) : (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-medium transition-colors"
        >
          <Camera className="h-5 w-5" />
          Etikett fotografieren
        </button>
      )}

      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef}
        onChange={processImage}
      />
    </div>
  );
};
