import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        locations: {
          include: {
            workAreas: true,
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

export const createWorkArea = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { name } = req.body;
    const workArea = await prisma.workArea.create({
      data: { name, locationId },
    });
    res.status(201).json(workArea);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create work area' });
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
                auditorName: inv.auditorName,
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
