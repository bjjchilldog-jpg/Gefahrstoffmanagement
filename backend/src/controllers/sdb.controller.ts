import { Request, Response } from 'express';
const pdfParse = require('pdf-parse');
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

// ============================================================
// Regex-basierte H-Satz / P-Satz Extraktion aus SDB-Text
// ============================================================

const H_PHRASE_REGEX = /\b(H\d{3}[A-Za-z]?(?:\s*\+\s*H\d{3}[A-Za-z]?)*)\b/g;
const P_PHRASE_REGEX = /\b(P\d{3}(?:\s*\+\s*P\d{3})*)\b/g;
const WGK_REGEX = /WGK\s*[:=]?\s*(\d)/i;
const CAS_REGEX = /\b(\d{2,7}-\d{2}-\d)\b/g;
const STORAGE_CLASS_REGEX = /(?:Lagerklasse|LGK|Storage\s*Class)\s*[:=]?\s*([\d.]+[A-B]?)/i;
const AGW_REGEX = /(?:AGW|MAK|OEL|Arbeitsplatzgrenzwert|Grenzwert)\s*[:=]?\s*([\d.,]+)\s*(mg\/m[³3]|ppm|ml\/m[³3])/i;
const MANUFACTURER_REGEX = /(?:1\.3[\s.]*|Lieferant|Hersteller|Firma|Company|Supplier|Vertrieb)\s*[:=]?\s*([^\n]{3,80})/i;
const WGK_REGEX_ALT = /(?:Wassergefährdungsklasse|water\s*hazard\s*class)\s*[:=]?\s*(\d)/i;

// Bekannte H-Satz → GHS-Einstufungs-Mapping (vereinfacht)
const H_TO_CMR: Record<string, string> = {
  'H340': 'mutagen', 'H341': 'mutagen_verdacht',
  'H350': 'krebserzeugend', 'H350i': 'krebserzeugend',
  'H351': 'krebserzeugend_verdacht',
  'H360': 'reproduktionstoxisch', 'H360F': 'reproduktionstoxisch',
  'H360D': 'reproduktionstoxisch', 'H360FD': 'reproduktionstoxisch',
  'H360Fd': 'reproduktionstoxisch', 'H360Df': 'reproduktionstoxisch',
  'H361': 'reproduktionstoxisch_verdacht',
};

/**
 * Extrahiert strukturierte Daten aus dem Rohtext eines Sicherheitsdatenblatts.
 */
function extractFromText(text: string, fileName: string): any {
  // Normalisiere Whitespace
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // --- Produktname (Abschnitt 1.1) ---
  let productName = '';
  
  // Strategie 1: Suche "Handelsname:" oder "Produktname:" gefolgt von Wert
  const directMatch = normalizedText.match(/(?:Handelsname|Produktname|Stoffname|Trade\s*name)\s*[:=]\s*([^\n]{3,80})/i);
  if (directMatch && !directMatch[1].match(/^(Produktidentifikator|Einzelheiten|Angaben|Bezeichnung des|Relevante)/i)) {
    productName = directMatch[1].trim();
  }
  
  // Strategie 2: Nach "1.1" Abschnittsheader die nächste substantielle Zeile nehmen
  if (!productName) {
    const section1Area = normalizedText.match(/1\.1[.\s]*(?:Produktidentifikator|Bezeichnung)[^\n]*\n+([\s\S]{0,500}?)(?=\n\s*1\.2|\n\s*Relevante)/i);
    if (section1Area) {
      const lines = section1Area[1].split('\n').map(l => l.trim()).filter(l => 
        l.length > 2 && 
        !l.match(/^(Produktidentifikator|Handelsname|Stoffname|Einzelheiten|Angaben|Bezeichnung|Relevante|1\.\d)/i) &&
        !l.match(/^(Artikelnummer|Registrierungsnummer|Index-Nr\.|EG-Nummer|CAS-Nummer|Eindeutiger|Rezepturidentifikator|UFI)/i)
      );
      if (lines.length > 0) {
        // Falls Zeile z.B. "Schwefelsäure 95-98 %, Ph.Eur." ist
        productName = lines[0].substring(0, 80);
      }
    }
  }

  // Strategie 3: Dateiname intelligent parsen ("Carl Roth - Kerosin - 11.06.2026" → "Kerosin")
  if (!productName) {
    const parts = fileName.replace(/\.pdf$/i, '').split(/[-–]/);
    if (parts.length >= 2) {
      // Mittlerer Teil ist meist der Produktname
      productName = parts.length >= 3 ? parts[1].trim() : parts[parts.length - 1].trim();
    } else {
      productName = fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim();
    }
  }

  // --- Hersteller (Abschnitt 1.3) ---
  let manufacturer = '';
  
  // Strategie 1: Direkte Nennung "Firma:" oder "Lieferant:"
  const mfrDirect = normalizedText.match(/(?:Firma|Lieferant|Hersteller|Vertreiber|Supplier|Company)\s*[:=]\s*([^\n]{3,60})/i);
  if (mfrDirect && !mfrDirect[1].match(/^(Einzelheiten|Angaben|Details|und|des|der)/i)) {
    manufacturer = mfrDirect[1].trim();
  }
  
  // Strategie 2: Nach Abschnitt 1.3 die nächste Firmenzeile finden
  if (!manufacturer) {
    const section13Area = normalizedText.match(/1\.3[.\s]*(?:Einzelheiten|Angaben|Details)[^\n]*\n+([\s\S]{0,400}?)(?=\n\s*1\.4|\n\s*Notruf)/i);
    if (section13Area) {
      const mfrLines = section13Area[1].split('\n').map(l => l.trim()).filter(l =>
        l.length > 3 &&
        !l.match(/^(Einzelheiten|Angaben|Telefon|Tel|Fax|E-Mail|www\.|http|Notruf|\d)/i) &&
        (l.match(/GmbH|AG|KG|Co\.|Ltd|Inc|S\.A\.|e\.K\.|SE\b/i) || l.length > 5)
      );
      if (mfrLines.length > 0) manufacturer = mfrLines[0].substring(0, 60);
    }
  }

  // Strategie 3: Aus Dateiname extrahieren ("Carl Roth - Kerosin" → "Carl Roth")
  if (!manufacturer) {
    const parts = fileName.replace(/\.pdf$/i, '').split(/[-–]/);
    if (parts.length >= 2) manufacturer = parts[0].trim();
  }

  // --- H-Sätze ---
  const hPhrases = [...new Set([...(normalizedText.match(H_PHRASE_REGEX) || [])].map(h => h.trim()))];
  
  // --- P-Sätze ---
  const pPhrases = [...new Set([...(normalizedText.match(P_PHRASE_REGEX) || [])].map(p => p.trim()))];
  
  // --- WGK ---
  let wgkMatch = normalizedText.match(WGK_REGEX);
  if (!wgkMatch) wgkMatch = normalizedText.match(WGK_REGEX_ALT);
  const wgk = wgkMatch ? wgkMatch[1] : null;
  
  // --- CAS-Nummer ---
  const casMatches = normalizedText.match(CAS_REGEX);
  const casNumber = casMatches ? casMatches[0] : null;
  
  // --- Lagerklasse (LGK) ---
  const lgkMatch = normalizedText.match(STORAGE_CLASS_REGEX);
  const storageClass = lgkMatch ? lgkMatch[1] : null;
  
  // --- AGW (Arbeitsplatzgrenzwert) ---
  const agwMatch = normalizedText.match(AGW_REGEX);
  const agw = agwMatch ? `${agwMatch[1]} ${agwMatch[2]}` : null;
  
  // --- CMR-Einstufung ---
  let isKrebserzeugend = false;
  let isMutagen = false;
  let isReproduktionstoxisch = false;
  
  for (const h of hPhrases) {
    const cmr = H_TO_CMR[h];
    if (cmr?.startsWith('krebserzeugend')) isKrebserzeugend = true;
    if (cmr?.startsWith('mutagen')) isMutagen = true;
    if (cmr?.startsWith('reproduktionstoxisch')) isReproduktionstoxisch = true;
  }
  
  // --- Aggregatzustand ---
  let physicalState = 'Unbekannt';
  if (/\b(flüssig|Flüssigkeit|liquid)\b/i.test(normalizedText)) physicalState = 'Flüssigkeit';
  else if (/\b(fest|Feststoff|solid|Pulver|Granulat)\b/i.test(normalizedText)) physicalState = 'Feststoff';
  else if (/\b(gasförmig|Gas|gaseous)\b/i.test(normalizedText)) physicalState = 'Gas';
  else if (/\b(Aerosol|Spray)\b/i.test(normalizedText)) physicalState = 'Aerosol';
  
  // --- Chemischer Typ ---
  let chemicalType = 'GEMISCH';
  if (/\b(Säure|saure|acid)\b/i.test(normalizedText)) chemicalType = 'SÄURE';
  else if (/\b(Lauge|Base|basisch|alkalisch|alkaline)\b/i.test(normalizedText)) chemicalType = 'LAUGE';
  else if (/\b(Lösungsmittel|Lösemittel|solvent)\b/i.test(normalizedText)) chemicalType = 'LÖSUNGSMITTEL';
  else if (/\b(Oxidationsmittel|oxidierend|oxidizing)\b/i.test(normalizedText)) chemicalType = 'OXIDATIONSMITTEL';

  // --- SDB-Datum ---
  let sdbDate: string | null = null;
  const dateMatch = normalizedText.match(/(?:Überarbeitet\s*am|Druckdatum|Revision(?:sdatum)?|Version\s*(?:date|vom)|Erstellt\s*am|Datum\s*der\s*letzten\s*Überarbeitung)\s*[:=]?\s*(\d{2})[./](\d{2})[./](\d{4})/i);
  if (dateMatch) {
    sdbDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  } else {
    // Fallback: ISO-Format
    const isoDateMatch = normalizedText.match(/(?:Überarbeitet|Revision|Version)\s*[:=]?\s*(\d{4})-(\d{2})-(\d{2})/i);
    if (isoDateMatch) sdbDate = isoDateMatch[0].match(/\d{4}-\d{2}-\d{2}/)![0];
  }

  // Konfidenz-Berechnung
  const confidence = {
    productName: productName ? 0.9 : 0.5,
    hPhrases: hPhrases.length > 0 ? 0.95 : 0.1,
    wgk: wgk ? 0.9 : 0.0,
    storageClass: storageClass ? 0.85 : 0.0,
    overall: 0
  };
  confidence.overall = (confidence.productName + confidence.hPhrases + (wgk ? 0.9 : 0) + (storageClass ? 0.85 : 0)) / 4;

  return {
    productName,
    manufacturer,
    sdbDate,
    isMixture: true, // Default: Gemisch (die meisten Produkte)
    hPhrases,
    pPhrases,
    wgk,
    casNumber,
    storageClass,
    agw,
    chemicalType,
    physicalState,
    isKrebserzeugend,
    isMutagen,
    isReproduktionstoxisch,
    confidence,
    extractionMethod: 'PDF_REGEX',
    needsReview: true,
  };
}

// Mock Database für Demo-Modus (Fallback)
const DUMMY_SDB_DB: any = {
  'aceton': {
    productName: 'Aceton (Propan-2-on)',
    hPhrases: ['H225', 'H319', 'H336', 'EUH066'],
    pPhrases: ['P210', 'P233', 'P305+P351+P338'],
    wgk: '1', storageClass: '3', chemicalType: 'LÖSUNGSMITTEL', physicalState: 'Flüssigkeit',
    casNumber: '67-64-1', agw: '1200 mg/m³',
    isKrebserzeugend: false, isMutagen: false, isReproduktionstoxisch: false,
    confidence: { overall: 1.0, productName: 1.0, hPhrases: 1.0, wgk: 1.0, storageClass: 1.0 },
    extractionMethod: 'DEMO_DB', needsReview: false,
    notes: 'KI-Demo: Daten aus integrierter Demo-Datenbank.'
  },
  'essigsäure': {
    productName: 'Essigsäure 99%',
    hPhrases: ['H226', 'H314'], pPhrases: ['P280', 'P305+P351+P338', 'P310'],
    wgk: '1', storageClass: '8A', chemicalType: 'SÄURE', physicalState: 'Flüssigkeit',
    casNumber: '64-19-7', agw: '25 mg/m³',
    isKrebserzeugend: false, isMutagen: false, isReproduktionstoxisch: false,
    confidence: { overall: 1.0, productName: 1.0, hPhrases: 1.0, wgk: 1.0, storageClass: 1.0 },
    extractionMethod: 'DEMO_DB', needsReview: false,
    notes: 'KI-Demo: Daten aus integrierter Demo-Datenbank.'
  }
};

export const parseSDB = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine PDF-Datei hochgeladen.' });
    }
    const fileName = req.file.originalname.toLowerCase();
    const fileBuffer = req.file.buffer;
    
    // SDB lokal speichern
    let sdbFilePath: string | undefined;
    try {
      const uploadDir = path.join(process.cwd(), 'uploads', 'sdb');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const savedFileName = uniqueSuffix + '.pdf';
      fs.writeFileSync(path.join(uploadDir, savedFileName), fileBuffer);
      sdbFilePath = `/uploads/sdb/${savedFileName}`;
    } catch (err) {
      console.error('[SDB] Fehler beim Speichern der Datei:', err);
    }

    // 1. Prüfe ob API-Key für KI vorhanden
    let aiApiKey: string | null = null;
    let aiProvider: string | null = null;
    try {
      const settings = await prisma.legalSettings.findFirst({
        select: { aiApiKey: true, aiProvider: true }
      });
      if (settings?.aiApiKey && settings.aiApiKey.length > 10) {
        aiApiKey = settings.aiApiKey;
        aiProvider = settings.aiProvider || 'gemini';
      }
    } catch {}

    // 2. Versuche PDF-Text-Extraktion
    let pdfText = '';
    try {
      const result = await pdfParse(fileBuffer);
      pdfText = result.text || '';
      console.log(`[SDB] PDF geparst: ${pdfText.length} Zeichen`);
    } catch (pdfErr) {
      console.warn('[SDB] PDF-Parse fehlgeschlagen:', pdfErr);
    }

    // 3. Entscheidungslogik
    let extractedData: any;

    if (pdfText.length > 100) {
      // Echte PDF-Extraktion via Regex
      extractedData = extractFromText(pdfText, fileName);
      
      // KI-Verfeinerung wenn API-Key vorhanden
      if (aiApiKey && aiProvider) {
        try {
          console.log(`[SDB] KI-Verfeinerung gestartet (${pdfText.length} Zeichen, Provider: ${aiProvider})...`);
          const aiResult = await callAI(aiApiKey, pdfText, aiProvider);
          if (aiResult) {
            extractedData = { ...extractedData, ...aiResult, extractionMethod: `AI_${aiProvider.toUpperCase()}`, confidence: { ...extractedData.confidence, overall: 0.95 } };
            console.log('[SDB] KI-Extraktion erfolgreich:', JSON.stringify({
              productName: aiResult.productName, manufacturer: aiResult.manufacturer,
              sdbDate: aiResult.sdbDate, wgk: aiResult.wgk, storageClass: aiResult.storageClass,
              agw: aiResult.agw, dnel: aiResult.dnel, isMixture: aiResult.isMixture,
              hCount: aiResult.hPhrases?.length
            }));
          }
        } catch (aiErr) {
          console.warn('[SDB] KI-Verfeinerung fehlgeschlagen, Regex-Ergebnis wird verwendet:', aiErr);
        }
      }
    } else if (aiApiKey && aiProvider) {
      console.log(`[SDB] Wenig Text extrahiert (${pdfText.length} Zeichen), versuche KI mit Dateiname...`);
      const fallbackText = `Dateiname: ${req.file!.originalname}\nExtrahierter Text (evtl. unvollständig): ${pdfText || 'Kein Text extrahierbar (Bild-PDF)'}`;
      try {
        const aiResult = await callAI(aiApiKey, fallbackText, aiProvider);
        if (aiResult && (aiResult.hPhrases?.length > 0 || aiResult.productName)) {
          extractedData = {
            ...aiResult,
            extractionMethod: 'AI_GEMINI',
            needsReview: true,
            confidence: { overall: 0.7, productName: 0.8, hPhrases: aiResult.hPhrases?.length > 0 ? 0.8 : 0.1, wgk: 0.5, storageClass: 0.5 },
            notes: 'KI-Extraktion aus Dateiname (PDF enthielt keinen lesbaren Text).'
          };
          console.log('[SDB] KI-Fallback erfolgreich:', aiResult.productName);
        } else {
          // KI konnte auch nichts extrahieren
          extractedData = {
            productName: fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '),
            hPhrases: [], pPhrases: [], wgk: null, storageClass: null, chemicalType: 'GEMISCH',
            physicalState: 'Unbekannt', casNumber: null, agw: null,
            isKrebserzeugend: false, isMutagen: false, isReproduktionstoxisch: false,
            confidence: { overall: 0.1, productName: 0.3, hPhrases: 0.0, wgk: 0.0, storageClass: 0.0 },
            extractionMethod: 'FILENAME_ONLY', needsReview: true,
            notes: 'KI konnte keine Daten aus diesem PDF extrahieren. Bitte manuell ergänzen.'
          };
        }
      } catch {
        extractedData = {
          productName: fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '),
          hPhrases: [], pPhrases: [], wgk: null, storageClass: null, chemicalType: 'GEMISCH',
          physicalState: 'Unbekannt', casNumber: null, agw: null,
          isKrebserzeugend: false, isMutagen: false, isReproduktionstoxisch: false,
          confidence: { overall: 0.1, productName: 0.3, hPhrases: 0.0, wgk: 0.0, storageClass: 0.0 },
          extractionMethod: 'FILENAME_ONLY', needsReview: true,
          notes: 'KI-Aufruf fehlgeschlagen. Bitte Daten manuell ergänzen.'
        };
      }
    } else {
      // Kein API-Key + kein Text → Demo-Modus
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (fileName.includes('aceton')) extractedData = { ...DUMMY_SDB_DB['aceton'], isDemo: true };
      else if (fileName.includes('essig')) extractedData = { ...DUMMY_SDB_DB['essigsäure'], isDemo: true };
      else extractedData = {
        productName: fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '),
        hPhrases: [], pPhrases: [], wgk: null, storageClass: null, chemicalType: 'GEMISCH',
        physicalState: 'Unbekannt', casNumber: null, agw: null,
        isKrebserzeugend: false, isMutagen: false, isReproduktionstoxisch: false,
        confidence: { overall: 0.1, productName: 0.3, hPhrases: 0.0, wgk: 0.0, storageClass: 0.0 },
        extractionMethod: 'FILENAME_ONLY', needsReview: true, isDemo: true,
        notes: 'PDF konnte nicht gelesen werden. Bitte Daten manuell ergänzen oder API-Key hinterlegen.'
      };
    }

    if (sdbFilePath) {
      extractedData.sdbFilePath = sdbFilePath;
    }

    try {
      require('fs').writeFileSync('last_ai_response.json', JSON.stringify(extractedData, null, 2));
    } catch(e) {}

    res.json(extractedData);
  } catch (error: any) {
    console.error('SDB Parse Error:', error);
    res.status(500).json({ error: 'Fehler beim Verarbeiten des Sicherheitsdatenblatts.' });
  }
};

/**
 * Provider-unabhängiger KI-Aufruf für SDB-Extraktion.
 * Unterstützt: Gemini, OpenAI (GPT), Anthropic (Claude), Custom (OpenAI-kompatibel)
 */
async function callAI(apiKey: string, pdfText: string, provider: string = 'gemini'): Promise<any | null> {
  const truncatedText = pdfText.substring(0, 50000);
  
  const systemPrompt = `Du bist ein Chemie-Experte für Sicherheitsdatenblätter (SDB) nach EU-Verordnung 2020/878.

WICHTIGE REGELN:
- Antworte NUR mit validem JSON. KEIN Markdown, KEINE Erklärungen, KEIN \`\`\`json.
- Verwende NIEMALS Abschnittsüberschriften als Werte (z.B. NICHT "Produktidentifikator" als productName).
- Verwende NIEMALS Beschreibungstext wie "Einzelheiten zum Lieferanten" als manufacturer.
- Nutze null wenn ein Wert nicht im Text gefunden wird.
- Bei Gemischen (Abschnitt 3.2): isMixture = true. Bei Reinstoffen (Abschnitt 3.1): isMixture = false.

Extrahiere folgende Daten:
{
  "productName": "Bezeichnung des Stoffs / Handelsname aus Abschnitt 1.1 (z.B. 'Schwefelsäure 95-98 %'). WICHTIG: Ignoriere Artikelnummern komplett!",
  "manufacturer": "Firmenname (Abschnitt 1.3), z.B. 'Carl Roth GmbH', NICHT 'Einzelheiten zum Lieferanten...'",
  "sdbDate": "Überarbeitungsdatum/Druckdatum im Format YYYY-MM-DD. Suche: Überarbeitet am, Druckdatum, Revision",
  "isMixture": true,
  "hPhrases": ["H225", "H319"],
  "pPhrases": ["P210", "P233"],
  "wgk": "1 oder 2 oder 3 (Wassergefährdungsklasse, Abschnitt 12.6). Nur die Zahl.",
  "casNumber": "CAS-Nummer des Hauptbestandteils (Abschnitt 3)",
  "storageClass": "Lagerklasse (LGK) nach TRGS 510 (aus Abschnitt 7.2 oder 15). Oft als 'LGK 8B' angegeben. WICHTIG: Gib nur den Code aus, z.B. '8B', '3', '10'.",
  "agw": "Arbeitsplatzgrenzwert (AGW, MAK, OEL) aus Abschnitt 8.1. WICHTIG: Kompletten Text mit Einheit übernehmen, z.B. '100 mg/m³'.",
  "dnel": "DNEL-Wert(e) aus Abschnitt 8.1. WICHTIG: Kompletten Text übernehmen, falls vorhanden.",
  "storageIncompatibilities": "Zusammenlagerungsverbote (Abschnitt 7.2), z.B. 'Nicht mit Oxidationsmitteln lagern'",
  "physicalState": "Flüssigkeit oder Feststoff oder Gas oder Aerosol (Abschnitt 9.1)",
  "incompatibleMaterials": "Zu vermeidende Stoffe / Gefährliche Reaktionen (Abschnitt 10.3 UND 10.5). SEHR WICHTIG: Liste hier unbedingt auch alle Stoffe aus 10.3 auf (z.B. 'Heftige Reaktion mit...'), nicht nur 10.5!",
  "specialNotes": "Sonstige Besonderheiten: Lagerhinweise, Explosionsgrenzen, Löschmittel, Umwelthinweise (max 200 Zeichen)",
  "boilingPoint": "Siedepunkt in °C (z.B. 108 oder -35). Suchbegriff in Abschnitt 9: 'Siedepunkt' oder 'Siedebeginn'. WICHTIG: Nur als Zahl angeben!",
  "vaporPressure": "Dampfdruck in hPa (z.B. 23). Suchbegriff in Abschnitt 9: 'Dampfdruck'. Falls in kPa, rechne in hPa um (1 kPa = 10 hPa). Nur als Zahl angeben!",
  "isKrebserzeugend": false,
  "isMutagen": false,
  "isReproduktionstoxisch": false
}`;

  const userMessage = `--- SDB TEXT ---\n${truncatedText}`;

  try {
    let aiText = '';

    if (provider === 'gemini') {
      // ═══ Google Gemini (mit Retry bei 429/503) ═══
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiBody = JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      });
      
      let lastError = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`[SDB] Gemini Retry ${attempt}/3 in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
        
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiBody
        });
        
        if (response.ok) {
          const data = await response.json();
          aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          break;
        }
        
        lastError = `${response.status}`;
        if (response.status === 429 || response.status === 503) {
          console.warn(`[SDB] Gemini ${response.status} (Versuch ${attempt + 1}/3)`);
          continue; // Retry
        }
        
        console.error(`[SDB] Gemini API ${response.status}:`, await response.text());
        return null;
      }
      
      if (!aiText) {
        console.error(`[SDB] Gemini alle Versuche fehlgeschlagen (letzter Fehler: ${lastError})`);
        return null;
      }

    } else if (provider === 'openai') {
      // ═══ OpenAI (GPT-4o-mini / GPT-4o) ═══
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_object' }
        })
      });
      if (!response.ok) {
        console.error(`[SDB] OpenAI API ${response.status}:`, await response.text());
        return null;
      }
      const data = await response.json();
      aiText = data?.choices?.[0]?.message?.content || '';

    } else if (provider === 'anthropic') {
      // ═══ Anthropic (Claude) ═══
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          temperature: 0.1,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      });
      if (!response.ok) {
        console.error(`[SDB] Anthropic API ${response.status}:`, await response.text());
        return null;
      }
      const data = await response.json();
      aiText = data?.content?.[0]?.text || '';

    } else if (provider === 'custom') {
      // ═══ Custom OpenAI-kompatibel (z.B. lokale LLMs, Azure, Ollama) ═══
      // apiKey = die URL des Endpoints (z.B. http://localhost:11434/v1/chat/completions)
      const response = await fetch(apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          max_tokens: 2048
        })
      });
      if (!response.ok) {
        console.error(`[SDB] Custom API ${response.status}:`, await response.text());
        return null;
      }
      const data = await response.json();
      aiText = data?.choices?.[0]?.message?.content || '';
    }

    console.log(`[SDB] KI-Antwort (${provider}): ${aiText.substring(0, 200)}...`);

    // JSON aus Antwort extrahieren (manche Modelle wrappen in ```)
    const cleaned = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.warn(`[SDB] ${provider} API-Aufruf fehlgeschlagen:`, err);
    return null;
  }
}

// ============================================================
// Stapelupload: Mehrere SDBs auf einmal parsen + Stoffe anlegen
// ============================================================

export const batchParseSDB = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const workAreaId = req.body.workAreaId;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen.' });
    }
    if (!workAreaId) {
      return res.status(400).json({ error: 'workAreaId fehlt.' });
    }

    console.log(`[SDB-BATCH] Starte Stapelverarbeitung: ${files.length} Dateien`);

    // API-Key laden
    let aiApiKey: string | null = null;
    let aiProvider: string | null = null;
    try {
      const settings = await prisma.legalSettings.findFirst({
        select: { aiApiKey: true, aiProvider: true }
      });
      if (settings?.aiApiKey && settings.aiApiKey.length > 10) {
        aiApiKey = settings.aiApiKey;
        aiProvider = settings.aiProvider || 'gemini';
      }
    } catch {}

    const results: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.originalname.toLowerCase();
      console.log(`[SDB-BATCH] ${i + 1}/${files.length}: ${file.originalname}`);
      
      // Datei lokal speichern
      let sdbFilePath: string | undefined;
      try {
        const uploadDir = path.join(process.cwd(), 'uploads', 'sdb');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const savedFileName = uniqueSuffix + '.pdf';
        fs.writeFileSync(path.join(uploadDir, savedFileName), file.buffer);
        sdbFilePath = `/uploads/sdb/${savedFileName}`;
      } catch (err) {
        console.error('[SDB-BATCH] Fehler beim Speichern der Datei:', err);
      }

      try {
        // PDF-Text extrahieren
        let pdfText = '';
        try {
          const result = await pdfParse(file.buffer);
          pdfText = result.text || '';
        } catch {}

        // Extrahieren (Regex + optional KI)
        let data: any;
        if (pdfText.length > 100) {
          data = extractFromText(pdfText, fileName);
          
          if (aiApiKey && aiProvider) {
            try {
              const aiResult = await callAI(aiApiKey, pdfText, aiProvider);
              if (aiResult) {
                data = { ...data, ...aiResult, extractionMethod: `AI_${aiProvider.toUpperCase()}` };
              }
            } catch {}
          }
        } else if (aiApiKey && aiProvider) {
          const fallbackText = `Dateiname: ${file.originalname}\nText: ${pdfText || 'Bild-PDF'}`;
          try {
            const aiResult = await callAI(aiApiKey, fallbackText, aiProvider);
            if (aiResult) data = { ...aiResult, extractionMethod: `AI_${aiProvider.toUpperCase()}` };
          } catch {}
        }

        if (!data) {
          data = {
            productName: fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '),
            manufacturer: '', hPhrases: [], pPhrases: [],
            extractionMethod: 'FILENAME_ONLY'
          };
        }

        // Stoff in DB anlegen
        const hPhrasesStr = Array.isArray(data.hPhrases) ? data.hPhrases.join(', ') : (data.hPhrases || '');
        
        const master = await prisma.hazardousSubstanceMaster.create({
          data: {
            productName: data.productName || file.originalname.replace(/\.pdf$/i, ''),
            manufacturer: data.manufacturer || '',
            hPhrases: hPhrasesStr,
            wgk: data.wgk ? parseInt(data.wgk) : null,
            storageClass: data.storageClass || null,
            agwValue: data.agw || null,
            storageIncompatibilities: data.storageIncompatibilities || null,
            incompatibleMaterials: data.incompatibleMaterials || null,
            substanceType: 'GEFAHRSTOFF',
            sdbFilePath: sdbFilePath,
            sdbDate: data.sdbDate ? new Date(data.sdbDate) : null,
            isKrebserzeugend: data.isKrebserzeugend || false,
            isMutagen: data.isMutagen || false,
            isReproduktionstoxisch: data.isReproduktionstoxisch || false,
          }
        });

        // Dem Arbeitsbereich zuweisen
        await prisma.localSubstanceInventory.create({
          data: {
            workAreaId,
            masterSubstanceId: master.id,
            status: 'ACTIVE',
          }
        });

        results.push({
          index: i,
          fileName: file.originalname,
          status: 'OK',
          productName: master.productName,
          manufacturer: data.manufacturer,
          hPhrases: hPhrasesStr,
          method: data.extractionMethod,
          masterId: master.id,
        });

        console.log(`[SDB-BATCH] ✅ ${file.originalname} → "${master.productName}"`);
      } catch (err: any) {
        results.push({
          index: i,
          fileName: file.originalname,
          status: 'ERROR',
          error: err.message,
        });
        console.error(`[SDB-BATCH] ❌ ${file.originalname}:`, err.message);
      }
    }

    const ok = results.filter(r => r.status === 'OK').length;
    const fail = results.filter(r => r.status === 'ERROR').length;
    console.log(`[SDB-BATCH] Fertig: ${ok} erfolgreich, ${fail} fehlgeschlagen`);

    res.json({ total: files.length, success: ok, failed: fail, results });
  } catch (error: any) {
    console.error('Batch SDB Error:', error);
    res.status(500).json({ error: 'Fehler bei der Stapelverarbeitung.' });
  }
};
