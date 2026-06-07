import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const syncScans = async (req: Request, res: Response) => {
  try {
    const { scans } = req.body;
    
    if (!scans || !Array.isArray(scans)) {
      return res.status(400).json({ error: 'Ungültiges Format für Scans' });
    }

    const createdSubstances = [];

    for (const scan of scans) {
      // 1. Anlage im Master-Verzeichnis
      const masterSubstance = await prisma.hazardousSubstanceMaster.create({
        data: {
          productName: scan.name || "Unbekannter Stoff",
          hPhrases: JSON.stringify(scan.hPhrases || []),
        }
      });

      // 2. Zuweisung zum lokalen Kataster
      const localSubstance = await prisma.localSubstanceInventory.create({
        data: {
          workAreaId: scan.workAreaId,
          masterSubstanceId: masterSubstance.id,
          annualAmount: 1, // Default,
          status: "Active"
        }
      });

      createdSubstances.push(localSubstance);
    }

    res.json({ success: true, count: createdSubstances.length });
  } catch (err) {
    console.error("Fehler beim Mobile-Sync:", err);
    res.status(500).json({ error: 'Failed to process mobile sync' });
  }
};
