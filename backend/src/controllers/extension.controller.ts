import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Fristen-Radar
export const getDeadlines = async (req: Request, res: Response) => {
  try {
    // Hier können beliebige Fristen geprüft werden. Wir prüfen z.B. Schulungen.
    // Wir mocken die Logik hier für die Demo leicht an, bzw. lesen echte ablaufende Fristen
    // Da es ein MVP ist, geben wir eine simulierte Anzahl aus, falls noch keine echten Daten da sind.
    
    // Beispiel: Anzahl an Master-Stoffen ohne SDB oder veraltete SDBs
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const outdatedSubstances = await prisma.hazardousSubstanceMaster.count({
      where: {
        updatedAt: {
          lt: oneYearAgo
        }
      }
    });

    res.json({ count: outdatedSubstances });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
};

// Schnell-Suche
export const searchSubstances = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    if (!query) return res.json([]);

    const substances = await prisma.hazardousSubstanceMaster.findMany({
      where: {
        OR: [
          { productName: { contains: query } },
        ]
      },
      take: 10
    });
    
    res.json(substances);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search' });
  }
};

// Smart Upload
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { workAreaId, substanceName } = req.body;
    
    if (!req.file || !workAreaId) {
      return res.status(400).json({ error: 'Datei und workAreaId erforderlich' });
    }

    // Anlage im Master-Verzeichnis
    const masterSubstance = await prisma.hazardousSubstanceMaster.create({
      data: {
        productName: substanceName || req.file.originalname || "Unbekannter Stoff",
        hPhrases: "",
      }
    });

    // Zuweisung zum lokalen Kataster
    await prisma.localSubstanceInventory.create({
      data: {
        workAreaId,
        masterSubstanceId: masterSubstance.id,
        annualAmount: 1,
        status: "Active"
      }
    });

    res.json({ success: true, substance: masterSubstance });
  } catch (err) {
    console.error("Fehler beim Plugin-Upload:", err);
    res.status(500).json({ error: 'Failed to process upload' });
  }
};
