import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        locations: {
          include: {
            workAreas: {
              where: { parentId: null },
              include: {
                children: {
                  include: { children: true }
                }
              }
            },
          },
        },
      },
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const tenant = await prisma.tenant.create({
      data: { name },
    });
    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tenant' });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { name },
    });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.tenant.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
};

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { name } = req.body;
    const location = await prisma.location.create({
      data: { name, tenantId },
    });
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create location' });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const location = await prisma.location.update({
      where: { id },
      data: { name },
    });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.location.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
};

export const createWorkArea = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { name, parentId } = req.body;
    const workArea = await prisma.workArea.create({
      data: { name, locationId, parentId: parentId || null },
    });
    res.status(201).json(workArea);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create work area' });
  }
};

export const updateWorkArea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sifaName, betriebsarztName, auditorName } = req.body;
    const workArea = await prisma.workArea.update({
      where: { id },
      data: { 
        name,
        sifaName: sifaName !== undefined ? sifaName : undefined,
        betriebsarztName: betriebsarztName !== undefined ? betriebsarztName : undefined,
        auditorName: auditorName !== undefined ? auditorName : undefined
      },
    });
    res.json(workArea);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update work area' });
  }
};

export const deleteWorkArea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.workArea.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete work area' });
  }
};

// Modul 15: Struktur-Klonen (Deep Copy für Location)
export const cloneLocation = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;

    // 1. Hole Location mit kompletter Baumstruktur
    const original = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        workAreas: {
          include: {
            inventories: true,
            biologicalSubstances: true
          }
        }
      }
    });

    if (!original) {
      return res.status(404).json({ error: "Standort nicht gefunden." });
    }

    // 2. Erstelle neue Location (Deep Copy)
    const cloned = await prisma.location.create({
      data: {
        name: original.name + " (Kopie)",
        tenantId: original.tenantId,
        constructionYear: original.constructionYear,
        asbestosStatus: original.asbestosStatus,
        sifaName: original.sifaName,
        betriebsarztName: original.betriebsarztName,
        auditorName: original.auditorName,
        workAreas: {
          create: original.workAreas.map(wa => ({
            name: wa.name,
            isFeuchtarbeit: wa.isFeuchtarbeit,
            dailyExposureHours: wa.dailyExposureHours,
            dustExposureType: wa.dustExposureType,
            gasType: wa.gasType,
            roomVolume: wa.roomVolume,
            sifaName: wa.sifaName,
            betriebsarztName: wa.betriebsarztName,
            auditorName: wa.auditorName,
            inventories: {
              create: wa.inventories.map(inv => ({
                masterSubstanceId: inv.masterSubstanceId,
                annualAmount: inv.annualAmount,
                usageDescription: inv.usageDescription,
                substitutionCheck: inv.substitutionCheck,
                maxStorageAmount: inv.maxStorageAmount,
                customFields: inv.customFields,
                sifaName: inv.sifaName,
                betriebsarztName: inv.betriebsarztName,
                status: inv.status
              }))
            },
            biologicalSubstances: {
              create: wa.biologicalSubstances.map(bio => ({
                name: bio.name,
                riskGroup: bio.riskGroup,
                protectionLevel: bio.protectionLevel
              }))
            }
          }))
        }
      },
      include: {
        workAreas: {
          include: { inventories: true }
        }
      }
    });

    res.status(201).json(cloned);
  } catch (error) {
    console.error("Fehler beim Klonen der Location:", error);
    res.status(500).json({ error: "Fehler beim Struktur-Klonen." });
  }
};
