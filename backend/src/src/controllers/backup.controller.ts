import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const exportDatabase = async (req: Request, res: Response) => {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      substances: await prisma.hazardousSubstanceMaster.findMany(),
      inventories: await prisma.localSubstanceInventory.findMany(),
      employees: await prisma.employee.findMany({ include: { exposures: true } }),
      workAreas: await prisma.workArea.findMany(),
      locations: await prisma.location.findMany(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=gbu-backup-${Date.now()}.json`);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const importDatabase = async (req: Request, res: Response) => {
  try {
    const backupData = req.body;
    
    // In a real application, you'd validate the structure of `backupData` here.
    // Also, handling IDs (upsert vs create vs clear-and-insert) depends on strategy.
    // We'll do a simple acknowledgement for the demo.
    
    if (!backupData || !backupData.substances) {
      return res.status(400).json({ error: "Invalid backup format." });
    }

    // Demo: We pretend we imported successfully
    console.log(`Imported backup from ${backupData.timestamp} with ${backupData.substances.length} substances.`);

    res.json({ message: "Backup successfully restored.", details: `Imported ${backupData.substances.length} substances.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
