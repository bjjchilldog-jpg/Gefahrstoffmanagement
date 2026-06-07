import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { auditLogService } from '../services/auditLog.service';

export const syncInventory = async (req: Request, res: Response) => {
  try {
    const payloads = req.body; // Erwartet ein Array von Objekten

    if (!Array.isArray(payloads)) {
      return res.status(400).json({ error: "Payload muss ein Array sein." });
    }

    const results = { updated: 0, failed: 0, errors: [] as any[] };

    for (const item of payloads) {
      try {
        const { productName, workAreaId, currentAmount, customFields } = item;

        if (!productName || !workAreaId) {
          throw new Error("productName und workAreaId sind Pflichtfelder.");
        }

        // Finde den Master-Stoff
        const master = await prisma.hazardousSubstanceMaster.findFirst({
          where: { productName }
        });

        if (!master) {
          throw new Error(`Master-Stoff '${productName}' nicht gefunden.`);
        }

        // Finde das lokale Inventory
        const inventory = await prisma.localSubstanceInventory.findFirst({
          where: { 
            workAreaId,
            masterSubstanceId: master.id
          }
        });

        if (!inventory) {
          throw new Error(`Inventory für '${productName}' im Bereich '${workAreaId}' nicht gefunden.`);
        }

        // Aktualisiere das Inventory
        let existingCustomFields = {};
        if (inventory.customFields) {
          try {
            existingCustomFields = JSON.parse(inventory.customFields);
          } catch(e){}
        }

        const mergedCustomFields = {
          ...existingCustomFields,
          ...(customFields || {})
        };

        await prisma.localSubstanceInventory.update({
          where: { id: inventory.id },
          data: {
            annualAmount: currentAmount !== undefined ? currentAmount : inventory.annualAmount,
            customFields: JSON.stringify(mergedCustomFields)
          }
        });

        // Audit Log schreiben
        await auditLogService.logTransaction(
          'ERP_SYNC',
          'SYSTEM_ERP',
          inventory.id,
          { currentAmount, customFields },
          req.ip || 'ERP-SYSTEM'
        );

        results.updated++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ item, error: err.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("ERP Sync Fehler:", error);
    res.status(500).json({ error: "Interner Serverfehler beim ERP-Sync." });
  }
};
