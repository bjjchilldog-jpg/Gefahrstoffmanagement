import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { regulationService } from '../services/regulation.service';

export const getTenants = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let locationFilter: any = {};
    if (userRole === 'LOCATION_MANAGER' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { locations: true }
      });
      if (user && user.locations.length > 0) {
        locationFilter = { id: { in: user.locations.map(l => l.id) } };
      } else {
        // Fallback, wenn der Nutzer keine Standorte hat -> Nichts zurückgeben
        locationFilter = { id: 'no-locations' };
      }
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        locations: {
          where: locationFilter,
          include: {
            workAreas: {
              where: { parentId: null },
              include: {
                children: {
                  include: { children: true }
                }
              }
            },
            asbestosFindings: {
              include: { exposedEmployees: true }
            }
          },
        },
      },
    });

    // If LOCATION_MANAGER, we only want to return tenants that actually have matching locations
    const filteredTenants = userRole === 'LOCATION_MANAGER' 
      ? tenants.filter(t => t.locations.length > 0)
      : tenants;

    res.json(filteredTenants);
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
    const { name, constructionYear, asbestosStatus } = req.body;
    const location = await prisma.location.create({
      data: { 
        name, 
        tenantId,
        constructionYear: constructionYear !== undefined ? constructionYear : undefined,
        asbestosStatus: asbestosStatus !== undefined ? asbestosStatus : undefined
      },
    });
    // Check Asbestos Regulation
    await regulationService.checkLocationAsbestos(location.id).catch(console.error);
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create location' });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, constructionYear, asbestosStatus } = req.body;
    const location = await prisma.location.update({
      where: { id },
      data: { 
        name: name !== undefined ? name : undefined,
        constructionYear: constructionYear !== undefined ? constructionYear : undefined,
        asbestosStatus: asbestosStatus !== undefined ? asbestosStatus : undefined
      },
    });
    // Check Asbestos Regulation if construction year was provided/changed
    if (constructionYear !== undefined) {
      await regulationService.checkLocationAsbestos(location.id).catch(console.error);
    }
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

export const cloneWorkArea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cloneRecursive = async (originalId: string, newParentId: string | null) => {
      const original = await prisma.workArea.findUnique({
        where: { id: originalId },
        include: {
          inventories: true,
          biologicalSubstances: { include: { effectivenessChecks: true } },
          children: true
        }
      });

      if (!original) return null;

      const clonedWa = await prisma.workArea.create({
        data: {
          name: newParentId ? original.name : original.name + " (Kopie)",
          locationId: original.locationId,
          parentId: newParentId,
          isFeuchtarbeit: original.isFeuchtarbeit,
          dailyExposureHours: original.dailyExposureHours,
          dustExposureType: original.dustExposureType,
          gasType: original.gasType,
          roomVolume: original.roomVolume,
          sifaName: original.sifaName,
          betriebsarztName: original.betriebsarztName,
          auditorName: original.auditorName,
          inventories: {
            create: original.inventories.map(inv => ({
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
            create: original.biologicalSubstances.map(bio => ({
              name: bio.name,
              riskGroup: bio.riskGroup,
              protectionLevel: bio.protectionLevel,
              isTargetedActivity: bio.isTargetedActivity,
              transmissionPath: bio.transmissionPath,
              vaccinationOffer: bio.vaccinationOffer,
              notes: bio.notes,
              effectivenessChecks: {
                create: bio.effectivenessChecks.map(c => ({
                  guidelineCode: c.guidelineCode,
                  title: c.title,
                  auditor: c.auditor,
                  checkedAt: c.checkedAt,
                  nextReviewDate: c.nextReviewDate,
                  notes: c.notes,
                  isActive: c.isActive
                }))
              }
            }))
          }
        }
      });

      for (const child of original.children) {
        await cloneRecursive(child.id, clonedWa.id);
      }

      return clonedWa;
    };

    const cloned = await cloneRecursive(id, null);
    if (!cloned) return res.status(404).json({ error: "Arbeitsbereich nicht gefunden." });

    res.status(201).json(cloned);
  } catch (error) {
    console.error("Fehler beim Klonen des WorkAreas:", error);
    res.status(500).json({ error: "Fehler beim Klonen." });
  }
};

export const moveWorkArea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetLocationId, targetParentId } = req.body;

    const original = await prisma.workArea.findUnique({
      where: { id }
    });

    if (!original) {
      return res.status(404).json({ error: "Arbeitsbereich nicht gefunden." });
    }

    const updated = await prisma.workArea.update({
      where: { id },
      data: {
        locationId: targetLocationId,
        parentId: targetParentId || null
      }
    });

    res.json(updated);
  } catch (error) {
    console.error("Fehler beim Verschieben des WorkAreas:", error);
    res.status(500).json({ error: "Fehler beim Verschieben." });
  }
};

// --- Modul 23: Asbest-Kataster (TRGS 519) ---

export const createAsbestosFinding = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { component, exactSpot, status, notes, assignedEmployeeIds, requiresTraining } = req.body;
    
    const employeeConnections = assignedEmployeeIds && assignedEmployeeIds.length > 0
      ? { connect: assignedEmployeeIds.map((id: string) => ({ id })) }
      : undefined;

    const finding = await prisma.asbestosFinding.create({
      data: {
        locationId,
        component,
        exactSpot,
        status,
        notes,
        exposedEmployees: employeeConnections
      },
      include: { exposedEmployees: true }
    });

    if (requiresTraining && assignedEmployeeIds && assignedEmployeeIds.length > 0) {
      const loc = await prisma.location.findUnique({ where: { id: locationId } });
      await prisma.trainingNeed.create({
        data: {
          substanceName: `Asbest: ${component}`,
          substanceType: 'ASBEST',
          workAreaName: loc ? loc.name : 'Standort',
        }
      });
    }

    res.status(201).json(finding);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create asbestos finding' });
  }
};

export const updateAsbestosFinding = async (req: Request, res: Response) => {
  try {
    const { findingId } = req.params;
    const { component, exactSpot, status, notes, assignedEmployeeIds, requiresTraining } = req.body;
    
    const employeeConnections = assignedEmployeeIds && assignedEmployeeIds.length > 0
      ? { set: assignedEmployeeIds.map((id: string) => ({ id })) }
      : { set: [] };

    const finding = await prisma.asbestosFinding.update({
      where: { id: findingId },
      data: {
        component: component !== undefined ? component : undefined,
        exactSpot: exactSpot !== undefined ? exactSpot : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
        exposedEmployees: employeeConnections
      },
      include: { exposedEmployees: true, location: true }
    });

    if (requiresTraining && assignedEmployeeIds && assignedEmployeeIds.length > 0) {
      await prisma.trainingNeed.create({
        data: {
          substanceName: `Asbest: ${finding.component}`,
          substanceType: 'ASBEST',
          workAreaName: finding.location ? finding.location.name : 'Standort',
        }
      });
    }

    res.json(finding);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update asbestos finding' });
  }
};

export const deleteAsbestosFinding = async (req: Request, res: Response) => {
  try {
    const { findingId } = req.params;
    await prisma.asbestosFinding.delete({
      where: { id: findingId },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asbestos finding' });
  }
};
