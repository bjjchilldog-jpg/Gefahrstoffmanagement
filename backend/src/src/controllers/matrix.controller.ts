import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMatrix = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    // 1. Alle MasterSubstances für diesen Tenant (bzw. Global)
    const masterSubstances = await prisma.hazardousSubstanceMaster.findMany({
      orderBy: { productName: 'asc' }
    });

    // 2. Alle Locations für diesen Tenant
    const locations = await prisma.location.findMany({
      where: { tenantId: String(tenantId) },
      include: {
        workAreas: {
          include: {
            inventories: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ masterSubstances, locations });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Matrix-Daten' });
  }
};

export const assignMatrix = async (req: AuthRequest, res: Response) => {
  try {
    const { assignments } = req.body; 
    // assignments: { locationId: string, masterSubstanceId: string, action: 'add' | 'remove' }[]

    for (const assignment of assignments) {
      const { locationId, masterSubstanceId, action } = assignment;
      
      // Hole die Default WorkArea der Location (bzw. die erste)
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        include: { workAreas: true }
      });

      if (!location || location.workAreas.length === 0) continue;
      const targetWorkAreaId = location.workAreas[0].id;

      if (action === 'add') {
        // Prüfen ob schon existiert
        const exists = await prisma.localSubstanceInventory.findFirst({
          where: { workAreaId: targetWorkAreaId, masterSubstanceId }
        });
        if (!exists) {
          await prisma.localSubstanceInventory.create({
            data: {
              workAreaId: targetWorkAreaId,
              masterSubstanceId,
              status: 'ACTIVE',
              juridicalApprovalBy: req.user?.email, // Four-Eyes Approval wird bei Zuweisung dokumentiert
              juridicalApprovalAt: new Date()
            }
          });
        }
      } else if (action === 'remove') {
        await prisma.localSubstanceInventory.deleteMany({
          where: { workAreaId: targetWorkAreaId, masterSubstanceId }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler bei der Zuweisung' });
  }
};
