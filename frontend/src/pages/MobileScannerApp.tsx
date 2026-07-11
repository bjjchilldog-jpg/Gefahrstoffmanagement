import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MobileScanner } from '../components/MobileScanner';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { config } from '../config';

export const MobileScannerApp = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePhrasesDetected = async (phrases: string[]) => {
    if (!sessionId) {
      setErrorMsg('Keine Session-ID im Link gefunden. Bitte QR-Code erneut scannen.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch(`${config.apiUrl}/api/pairing/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { hPhrases: phrases } })
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Senden an den PC');
      }
      
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verbindungsfehler zum PC.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Erfolgreich!</h2>
        <p className="text-slate-600 mb-6">
          Die H-Sätze wurden erfolgreich an deinen Desktop-PC gesendet. Du kannst dieses Fenster jetzt schließen.
        </p>
        <button 
          onClick={() => window.close()} 
          className="bg-slate-200 text-slate-800 px-6 py-2 rounded-lg font-medium"
        >
          Fenster schließen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-primary text-white p-4 text-center shadow-md">
        <h1 className="text-lg font-bold">Kamera-Scanner</h1>
        {sessionId ? (
          <p className="text-sm opacity-80">Verbunden mit PC</p>
        ) : (
          <p className="text-sm text-red-200">Keine PC-Verbindung</p>
        )}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {status === 'error' && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex flex-col items-center text-center w-full max-w-sm">
            <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
            <p>{errorMsg}</p>
            <button 
              onClick={() => setStatus('idle')}
              className="mt-4 bg-red-100 px-4 py-2 rounded font-medium"
            >
              Erneut versuchen
            </button>
          </div>
        )}
        
        {status === 'idle' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
            <MobileScanner onPhrasesDetected={handlePhrasesDetected} />
          </div>
        )}
        
        {status === 'sending' && (
          <div className="flex flex-col items-center text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-600">Sende Daten an den PC...</p>
          </div>
        )}
      </div>
    </div>
  );
};
