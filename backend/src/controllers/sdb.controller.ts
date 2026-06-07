import { Request, Response } from 'express';
// import pdfParse from 'pdf-parse'; // This will be used when pdf-parse is successfully installed

// Mock Database of AI Responses for the Demo Mode
const DUMMY_SDB_DB: any = {
  'aceton': {
    productName: 'Aceton (Propan-2-on)',
    hPhrases: ['H225', 'H319', 'H336', 'EUH066'],
    wgk: '1',
    storageClass: '3',
    chemicalType: 'LÖSUNGSMITTEL',
    physicalState: 'Flüssigkeit',
    notes: 'KI-Demo: Die Daten wurden aus dem simulierten SDB für Aceton extrahiert.'
  },
  'essigsäure': {
    productName: 'Essigsäure 99%',
    hPhrases: ['H226', 'H314'],
    wgk: '1',
    storageClass: '8A',
    chemicalType: 'SÄURE',
    physicalState: 'Flüssigkeit',
    notes: 'KI-Demo: Die Daten wurden aus dem simulierten SDB für Essigsäure extrahiert.'
  },
  'default': {
    productName: 'Unbekanntes Produkt (Aus SDB generiert)',
    hPhrases: ['H315', 'H319'],
    wgk: '2',
    storageClass: '10',
    chemicalType: 'GEMISCH',
    physicalState: 'Feststoff',
    notes: 'KI-Demo: Standard-Extraktion, da der Stoff nicht explizit in der Demo-Datenbank hinterlegt war.'
  }
};

export const parseSDB = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine PDF-Datei hochgeladen.' });
    }

    const fileName = req.file.originalname.toLowerCase();
    
    // In einer echten App würden wir hier die Settings aus der DB laden, 
    // um zu prüfen ob ein API-Key für Gemini/OpenAI hinterlegt ist.
    // Für dieses Beispiel simulieren wir die Logik:
    const hasRealApiKey = false; // "false" zwingt uns in den Demo-Modus

    let extractedData;

    if (hasRealApiKey) {
      // Echter KI-Modus:
      // 1. pdfParse(req.file.buffer) aufrufen, um den Text zu extrahieren.
      // 2. Fetch-Request an https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
      // 3. System Prompt: "You are an expert chemist. Extract product name, H-phrases, WGK... output strictly JSON."
      // 4. extractedData = JSON.parse(aiResponse);
      
      console.log('Real AI processing would happen here...');
    } else {
      // Demo-Modus:
      // Wir simulieren eine Verzögerung von 2 Sekunden für das "KI-Gefühl"
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (fileName.includes('aceton')) {
        extractedData = DUMMY_SDB_DB['aceton'];
      } else if (fileName.includes('essig')) {
        extractedData = DUMMY_SDB_DB['essigsäure'];
      } else {
        extractedData = DUMMY_SDB_DB['default'];
      }
      
      extractedData.isDemo = true;
    }

    res.json(extractedData);
  } catch (error: any) {
    console.error('SDB Parse Error:', error);
    res.status(500).json({ error: 'Fehler beim Verarbeiten des Sicherheitsdatenblatts.' });
  }
};
