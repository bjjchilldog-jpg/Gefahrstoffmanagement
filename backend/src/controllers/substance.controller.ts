import { Response } from 'express';
import prisma from '../lib/prisma';
import { vorsorgeService } from '../services/vorsorge.service';
import { regulationService } from '../services/regulation.service';
import { snapshotService } from '../services/snapshot.service';
import { checkTRGS510Compatibility } from '../services/trgs510.service';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getSubstances = async (req: AuthRequest, res: Response) => {
  try {
    const workAreaId = req.query.workAreaId as string;
    if (!workAreaId) {
      const allMasters = await prisma.hazardousSubstanceMaster.findMany();
      return res.json({ hazardous: allMasters, biological: [] });
    }
    const inventories = await prisma.localSubstanceInventory.findMany({
      where: { workAreaId },
      include: { masterSubstance: true, effectivenessChecks: true }
    });

    // Sammle alle Konflikte
    const areaConflicts = new Set<string>();

    const hazardous = await Promise.all(inventories.map(async inv => {
      let warnings: string[] = [];
      if (inv.masterSubstance.storageClass) {
        const check = await checkTRGS510Compatibility(workAreaId as string, inv.masterSubstance.storageClass);
        if (!check.isCompatible) {
          warnings = check.conflicts;
          check.conflicts.forEach(c => areaConflicts.add(c));
        }
      }
      return {
        ...inv.masterSubstance,
        ...inv,
        id: inv.id,
        trgsWarnings: warnings
      };
    }));

    const biological = await prisma.biologicalSubstance.findMany({ where: { workAreaId } });
    const workAreaInfo = await prisma.workArea.findUnique({ where: { id: workAreaId } });

    res.json({ hazardous, biological, workAreaInfo, areaConflicts: Array.from(areaConflicts) });
  } catch (error) {
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

export const getSingleSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const inventory = await prisma.localSubstanceInventory.findUnique({
      where: { id },
      include: { 
        masterSubstance: {
          include: {
            employeeExposures: true
          }
        }, 
        effectivenessChecks: true 
      }
    });
    
    if (inventory) {
      return res.json({ type: 'GEFAHRSTOFF', data: inventory });
    }

    const biological = await prisma.biologicalSubstance.findUnique({
      where: { id },
      include: { effectivenessChecks: true }
    });

    if (biological) {
      return res.json({ type: 'BIOSTOFF', data: biological });
    }

    res.status(404).json({ error: "Substance not found" });
  } catch (error) {
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

export const createSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { type, workAreaId, ...data } = req.body;
    if (!workAreaId) return res.status(400).json({ error: "workAreaId is required" });

    let newSubstance;
    if (type === 'biological') {
      const { substanceType, effectivenessChecks, requiresTraining, ...bioData } = data as any;
      newSubstance = await prisma.biologicalSubstance.create({ 
        data: { 
          ...bioData, 
          workAreaId,
          effectivenessChecks: effectivenessChecks && effectivenessChecks.length > 0 ? {
            create: effectivenessChecks.map((c: any) => ({
              guidelineCode: c.guidelineCode,
              title: c.title,
              auditor: c.auditor,
              checkedAt: c.checkedAt ? new Date(c.checkedAt) : null,
              nextReviewDate: c.nextReviewDate ? new Date(c.nextReviewDate) : null,
              notes: c.notes,
              isActive: true
            }))
          } : undefined
        },
        include: { effectivenessChecks: true }
      });

      if (requiresTraining) {
        await prisma.trainingNeed.create({
          data: {
            substanceName: newSubstance.name,
            substanceType: 'BIOSTOFF',
            workAreaName: 'Arbeitsbereich', // We don't have workArea name here, we could fetch it but it's optional
          }
        });
      }
    } else {
      // 1. Prüfen, ob der Master-Stoff bereits existiert
      let master = await prisma.hazardousSubstanceMaster.findFirst({
        where: { productName: data.productName }
      });

      if (!master) {
        // NUR ADMINS DÜRFEN NEUE STAMMDATEN ANLEGEN!
        if (req.user?.role !== 'ADMIN') {
          return res.status(403).json({ error: "Nur Administratoren dürfen komplett neue Gefahrstoff-Stammdaten anlegen." });
        }
        
        master = await prisma.hazardousSubstanceMaster.create({
          data: {
            productName: data.productName,
            manufacturer: data.manufacturer,
            substanceType: data.substanceType || 'GEFAHRSTOFF',
            hPhrases: data.hPhrases,
            emkgRating: data.emkgRating,
            agwValue: data.agwValue,
            wgk: data.wgk ? Number(data.wgk) : null,
            storageClass: data.storageClass || null,
            storageIncompatibilities: data.storageIncompatibilities || null,
            incompatibleMaterials: data.incompatibleMaterials || null,
            isKrebserzeugend: data.isKrebserzeugend || false,
            isMutagen: data.isMutagen || false,
            isReproduktionstoxisch: data.isReproduktionstoxisch || false,
            isMutterschutzRelevant: data.isMutterschutzRelevant || false,
            isJugendschutzRelevant: data.isJugendschutzRelevant || false,
            isAcuteToxic: data.isAcuteToxic || false,
            sdbDate: data.sdbDate ? new Date(data.sdbDate) : null,
            sdbFilePath: data.sdbFilePath || null,
            nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : null,
            responsiblePerson: data.responsiblePerson || null,
            autoMailToManufacturer: data.autoMailToManufacturer || false,
            manufacturerEmail: data.manufacturerEmail || null,
            autoMailAdvanceDays: data.autoMailAdvanceDays || 30
          }
        });
      }

      // 2. Erstelle Inventory und verknüpfe es mit dem Master
      newSubstance = await prisma.localSubstanceInventory.create({
        data: {
          workAreaId,
          masterSubstanceId: master.id,
          annualAmount: data.annualAmount || 0,
          usageDescription: data.usageDescription || "",
          substitutionCheck: data.substitutionCheck || null,
          maxStorageAmount: data.maxStorageAmount || null,
          customFields: data.customFields ? JSON.stringify(data.customFields) : null,
          activityName: data.activityName,
          physicalState: data.physicalState,
          emkgInhalation: data.emkgInhalation,
          emkgSkin: data.emkgSkin,
          emkgFire: data.emkgFire,
          stopSubstitution: data.stopSubstitution,
          stopTechnical: data.stopTechnical,
          stopOrganizational: data.stopOrganizational,
          stopPersonal: data.stopPersonal,
          bioTargetedActivity: data.bioTargetedActivity,
          bioRiskGroup: data.bioRiskGroup,
          asbestosActivity: data.asbestosActivity,
          asbestosBinding: data.asbestosBinding,
          btVerfahren: data.btVerfahren,
          gasStorageType: data.gasStorageType,
          skinDirtType: data.skinDirtType,
          skinCleaningAgents: data.skinCleaningAgents,
          skinWashingFreq: data.skinWashingFreq,
          skinGloveDuration: data.skinGloveDuration,
          notes: data.notes,
          effectivenessChecks: data.effectivenessChecks && data.effectivenessChecks.length > 0 ? {
            create: data.effectivenessChecks.map((c: any) => ({
              guidelineCode: c.guidelineCode,
              title: c.title,
              auditor: c.auditor,
              checkedAt: c.checkedAt ? new Date(c.checkedAt) : null,
              nextReviewDate: c.nextReviewDate ? new Date(c.nextReviewDate) : null,
              notes: c.notes,
              isActive: true
            }))
          } : undefined
        },
        include: { masterSubstance: true, effectivenessChecks: true }
      });
      
// Mappe für Response flach
      newSubstance = { ...newSubstance.masterSubstance, ...newSubstance, id: newSubstance.id };

      // TRGS 510 Zusammenlagerungs-Prüfung
      const trgsCheck = await checkTRGS510Compatibility(workAreaId, master.storageClass || '');
      if (!trgsCheck.isCompatible) {
        (newSubstance as any).trgsWarnings = trgsCheck.conflicts;
      }

      // Trigger RegulationService
      regulationService.checkSubstanceAgainstRegulations(master.id).catch(console.error);
       await snapshotService.createSnapshot(workAreaId, `Initialerfassung: ${master.productName}`);

      // Modul 15 & Mutterschutz & TRGS 510: Alarmierung
      const isDangerous = master.isKrebserzeugend || master.isMutagen || master.isReproduktionstoxisch || master.isAcuteToxic || master.isMutterschutzRelevant;
      const trgsViolated = !trgsCheck.isCompatible;

      if (isDangerous || trgsViolated) {
        // Ermittle Zuständigkeiten (Vererbung auflösen)
        const area = await prisma.workArea.findUnique({
          where: { id: workAreaId },
          include: { location: { include: { tenant: true } } }
        });
        
        if (area) {
          const sifaName = newSubstance.sifaName || area.sifaName || area.location.sifaName || area.location.tenant.sifaName;
          const betriebsarztName = newSubstance.betriebsarztName || area.betriebsarztName || area.location.betriebsarztName || area.location.tenant.betriebsarztName;
          
          let alertReason = "Hochgefährlicher Stoff (CMR / akut toxisch / Mutterschutz)";
          if (trgsViolated) alertReason = "Zusammenlagerungskonflikt (TRGS 510) oder Mengenüberschreitung";
          if (isDangerous && trgsViolated) alertReason = "Hochgefährlicher Stoff UND Zusammenlagerungskonflikt";

          await notificationService.notifyCriticalSubstance(master.productName, area.name, { sifaName, betriebsarztName }, alertReason);
        }
      }

      // Sync employee exposures
      if (Array.isArray(data.assignedEmployeeIds)) {
        for (const empId of data.assignedEmployeeIds) {
          await prisma.employeeExposure.create({
            data: {
              masterSubstanceId: master.id,
              employeeId: empId,
              exposureType: "GEFAHRSTOFF"
            }
          });
        }
      }

      // LMS Hook
      if (data.requiresTraining) {
        const fallbackArea = await prisma.workArea.findUnique({ where: { id: workAreaId } });
        await prisma.trainingNeed.create({
          data: {
            substanceName: master.productName,
            substanceType: master.substanceType,
            workAreaName: fallbackArea ? fallbackArea.name : 'Arbeitsbereich',
          }
        });
      }
    }

    vorsorgeService.checkWorkAreaVorsorge(workAreaId).catch(console.error);
    res.status(201).json(newSubstance);
  } catch (error) {
    console.error("Error creating substance:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
};

export const createMasterSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const master = await prisma.hazardousSubstanceMaster.create({
      data: {
        productName: data.productName,
        manufacturer: data.manufacturer,
        substanceType: data.substanceType || 'GEFAHRSTOFF',
        hPhrases: data.hPhrases || '',
        isKrebserzeugend: data.isKrebserzeugend || false,
        isMutagen: data.isMutagen || false,
        isReproduktionstoxisch: data.isReproduktionstoxisch || false,
        isAcuteToxic: data.isAcuteToxic || false,
        isMutterschutzRelevant: data.isMutterschutzRelevant || false,
        wgk: data.wgk ? parseInt(data.wgk) : null,
        storageClass: data.storageClass || null
      }
    });
    res.status(201).json(master);
  } catch (error) {
    console.error("Error creating master substance:", error);
    res.status(500).json({ error: "Fehler beim Anlegen des Master-Stoffs" });
  }
};

export const updateSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, ...data } = req.body;

    const inventory = await prisma.localSubstanceInventory.findUnique({
      where: { id },
      include: { masterSubstance: true }
    });

    if (!inventory) return res.status(404).json({ error: "Nicht gefunden" });

    // 1. Update Master Substance (falls Admin/Leader Eigenschaften ändert)
    // We update all provided master fields (Prisma ignores undefined)
    await prisma.hazardousSubstanceMaster.update({
        where: { id: inventory.masterSubstanceId },
        data: {
          productName: data.productName !== undefined ? data.productName : undefined,
          hPhrases: data.hPhrases,
          storageIncompatibilities: data.storageIncompatibilities !== undefined ? data.storageIncompatibilities : undefined,
          incompatibleMaterials: data.incompatibleMaterials !== undefined ? data.incompatibleMaterials : undefined,
          isKrebserzeugend: data.isKrebserzeugend,
          isMutagen: data.isMutagen,
          isReproduktionstoxisch: data.isReproduktionstoxisch,
          isAcuteToxic: data.isAcuteToxic,
          isMutterschutzRelevant: data.isMutterschutzRelevant,
          sdbFilePath: data.sdbFilePath !== undefined ? data.sdbFilePath : undefined,
          sdbDate: data.sdbDate ? new Date(data.sdbDate) : undefined,
          nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : undefined,
          responsiblePerson: data.responsiblePerson !== undefined ? data.responsiblePerson : undefined,
          autoMailToManufacturer: data.autoMailToManufacturer !== undefined ? data.autoMailToManufacturer : undefined,
          manufacturerEmail: data.manufacturerEmail !== undefined ? data.manufacturerEmail : undefined,
          autoMailAdvanceDays: data.autoMailAdvanceDays !== undefined ? data.autoMailAdvanceDays : undefined,
          manufacturer: data.manufacturer !== undefined ? data.manufacturer : undefined
        }
      });
      // Trigger Regulation Check when H-Phrases change
      regulationService.checkSubstanceAgainstRegulations(inventory.masterSubstanceId).catch(console.error);

    // 2. Update lokales Inventory (darf Unit_Leader auch)
    const updatedInventory = await prisma.localSubstanceInventory.update({
      where: { id },
      data: {
        annualAmount: data.annualAmount,
        usageDescription: data.usageDescription,
        substitutionCheck: data.substitutionCheck,
        maxStorageAmount: data.maxStorageAmount,
        customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
        status: data.status,
        sifaName: data.sifaName !== undefined ? data.sifaName : undefined,
        betriebsarztName: data.betriebsarztName !== undefined ? data.betriebsarztName : undefined,
        activityName: data.activityName,
        physicalState: data.physicalState,
        emkgInhalation: data.emkgInhalation,
        emkgSkin: data.emkgSkin,
        emkgFire: data.emkgFire,
        stopSubstitution: data.stopSubstitution,
        stopTechnical: data.stopTechnical,
        stopOrganizational: data.stopOrganizational,
        stopPersonal: data.stopPersonal,
        bioTargetedActivity: data.bioTargetedActivity,
        bioRiskGroup: data.bioRiskGroup,
        asbestosActivity: data.asbestosActivity,
        asbestosBinding: data.asbestosBinding,
        btVerfahren: data.btVerfahren,
        gasStorageType: data.gasStorageType,
        skinDirtType: data.skinDirtType,
        skinCleaningAgents: data.skinCleaningAgents,
        skinWashingFreq: data.skinWashingFreq,
        skinGloveDuration: data.skinGloveDuration,
        notes: data.notes
      },
      include: { masterSubstance: true }
    });

    // Sync employee exposures
    if (Array.isArray(data.assignedEmployeeIds)) {
      const masterId = updatedInventory.masterSubstanceId;
      
      // Entferne alle Zuordnungen, die nicht in assignedEmployeeIds sind
      await prisma.employeeExposure.deleteMany({
        where: {
          masterSubstanceId: masterId,
          employeeId: { notIn: data.assignedEmployeeIds }
        }
      });

      // Füge neue Zuordnungen hinzu
      for (const empId of data.assignedEmployeeIds) {
        const exists = await prisma.employeeExposure.findFirst({
          where: { masterSubstanceId: masterId, employeeId: empId }
        });
        if (!exists) {
          await prisma.employeeExposure.create({
            data: {
              masterSubstanceId: masterId,
              employeeId: empId,
              exposureType: "GEFAHRSTOFF"
            }
          });
        }
      }
    }

    // LMS Hook on Update
    if (data.requiresTraining) {
      const fallbackArea = await prisma.workArea.findUnique({ where: { id: updatedInventory.workAreaId } });
      await prisma.trainingNeed.create({
        data: {
          substanceName: updatedInventory.masterSubstance.productName,
          substanceType: updatedInventory.masterSubstance.substanceType,
          workAreaName: fallbackArea ? fallbackArea.name : 'Arbeitsbereich',
        }
      });
    }

    res.json({ ...updatedInventory.masterSubstance, ...updatedInventory, id: updatedInventory.id });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Update" });
  }
};

// Modul 15: Stoff Klonen (1-Klick Duplikat)
export const cloneSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Finde das Original-Inventory
    const original = await prisma.localSubstanceInventory.findUnique({
      where: { id },
      include: { masterSubstance: true }
    });

    if (!original) {
      return res.status(404).json({ error: "Stoff nicht gefunden." });
    }

    // Dupliziere das Inventory
    const clone = await prisma.localSubstanceInventory.create({
      data: {
        workAreaId: original.workAreaId,
        masterSubstanceId: original.masterSubstanceId,
        annualAmount: original.annualAmount,
        usageDescription: (original.usageDescription || "Kopie") + " (Kopie)",
        substitutionCheck: original.substitutionCheck,
        maxStorageAmount: original.maxStorageAmount,
        customFields: original.customFields,
        sifaName: original.sifaName,
        betriebsarztName: original.betriebsarztName,
        status: original.status
      },
      include: { masterSubstance: true }
    });

    // Mappe für Response flach
    const responseClone = { ...clone.masterSubstance, ...clone, id: clone.id };
    
    // Audit-Log
    console.log('AUDIT: CLONE', 'SUBSTANCE', clone.id, { clonedFrom: original.id });

    res.status(201).json(responseClone);
  } catch (error) {
    console.error("Fehler beim Klonen:", error);
    res.status(500).json({ error: "Fehler beim Klonen des Stoffes." });
  }
};

// Modul 18: Juristische Freigabe (Four-Eyes Principle)
export const approveSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const inventory = await prisma.localSubstanceInventory.findUnique({
      where: { id }
    });

    if (!inventory) return res.status(404).json({ error: "Nicht gefunden" });

    const updated = await prisma.localSubstanceInventory.update({
      where: { id },
      data: {
        juridicalApprovalBy: (req.user as any)?.email || 'SYSTEM',
        juridicalApprovalAt: new Date()
      },
      include: { masterSubstance: true }
    });

    // Audit-Log
    console.log('AUDIT: APPROVE', 'SUBSTANCE', updated.id, { approver: (req.user as any)?.email });

    res.json({ ...updated.masterSubstance, ...updated, id: updated.id });
  } catch (error) {
    res.status(500).json({ error: "Fehler bei der Freigabe" });
  }
};

export const deleteSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const inventory = await prisma.localSubstanceInventory.findUnique({
      where: { id }
    });

    if (!inventory) return res.status(404).json({ error: "Nicht gefunden" });

    await prisma.localSubstanceInventory.delete({
      where: { id }
    });

    res.json({ message: "Erfolgreich gelöscht" });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
};

export const deleteAllSubstances = async (req: AuthRequest, res: Response) => {
  try {
    const { workAreaId } = req.query;
    if (!workAreaId) return res.status(400).json({ error: "workAreaId parameter is required" });

    // Delete all local inventories for this workAreaId
    await prisma.localSubstanceInventory.deleteMany({
      where: { workAreaId: String(workAreaId) }
    });
    
    // Also delete biological substances if any
    await prisma.biologicalSubstance.deleteMany({
      where: { workAreaId: String(workAreaId) }
    });

    res.json({ message: "Alle Einträge erfolgreich gelöscht" });
  } catch (error) {
    console.error("Error deleting all substances:", error);
    res.status(500).json({ error: "Fehler beim Löschen aller Einträge" });
  }
};
export const bulkUpdatePersons = async (req: AuthRequest, res: Response) => {
  try {
    const { workAreaId } = req.params;
    const { responsiblePerson, involvedPersons, sifaName, betriebsarztName, auditorName } = req.body;

    const inventories = await prisma.localSubstanceInventory.findMany({
      where: { workAreaId }
    });

    for (const inv of inventories) {
      const dataToUpdate: any = {};
      if (involvedPersons !== undefined) dataToUpdate.involvedPersons = involvedPersons;
      if (sifaName !== undefined) dataToUpdate.sifaName = sifaName;
      if (betriebsarztName !== undefined) dataToUpdate.betriebsarztName = betriebsarztName;

      if (Object.keys(dataToUpdate).length > 0) {
        await prisma.localSubstanceInventory.update({
          where: { id: inv.id },
          data: dataToUpdate
        });
      }

      if (responsiblePerson !== undefined) {
        await prisma.hazardousSubstanceMaster.update({
          where: { id: inv.masterSubstanceId },
          data: { responsiblePerson }
        });
      }

      if (auditorName !== undefined) {
        await prisma.effectivenessCheck.updateMany({
          where: { inventoryId: inv.id },
          data: { auditor: auditorName }
        });
      }
    }

    res.json({ message: "Erfolgreich übernommen" });
  } catch (error) {
    console.error('Fehler beim Zuweisen der Personen:', error);
    res.status(500).json({ error: 'Fehler beim Zuweisen der Personen' });
  }
};

export const copySubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { substanceId, targetWorkAreaId } = req.body;
    
    if (!substanceId || !targetWorkAreaId) {
      return res.status(400).json({ error: "Fehlende Parameter" });
    }

    // Prüfe ob Gefahrstoff
    const originalInventory = await prisma.localSubstanceInventory.findUnique({
      where: { id: substanceId },
      include: { masterSubstance: true }
    });

    if (originalInventory) {
      const copy = await prisma.localSubstanceInventory.create({
        data: {
          workAreaId: targetWorkAreaId,
          masterSubstanceId: originalInventory.masterSubstanceId,
          annualAmount: originalInventory.annualAmount,
          usageDescription: originalInventory.usageDescription,
          substitutionCheck: originalInventory.substitutionCheck,
          maxStorageAmount: originalInventory.maxStorageAmount,
          customFields: originalInventory.customFields,
          sifaName: originalInventory.sifaName,
          betriebsarztName: originalInventory.betriebsarztName,
          status: originalInventory.status
        },
        include: { masterSubstance: true }
      });
      const responseCopy = { ...copy.masterSubstance, ...copy, id: copy.id };
      return res.status(201).json(responseCopy);
    }

    // Prüfe ob Biostoff
    const originalBio = await prisma.biologicalSubstance.findUnique({
      where: { id: substanceId }
    });

    if (originalBio) {
      const copyBio = await prisma.biologicalSubstance.create({
        data: {
          workAreaId: targetWorkAreaId,
          name: originalBio.name,
          riskGroup: originalBio.riskGroup,
          protectionLevel: originalBio.protectionLevel,
          isTargetedActivity: originalBio.isTargetedActivity,
          transmissionPath: originalBio.transmissionPath,
          vaccinationOffer: originalBio.vaccinationOffer,
          notes: originalBio.notes,
        }
      });
      return res.status(201).json(copyBio);
    }

    return res.status(404).json({ error: "Stoff nicht gefunden." });

  } catch (error) {
    console.error("Fehler beim Kopieren des Stoffes:", error);
    res.status(500).json({ error: "Fehler beim Kopieren des Stoffes." });
  }
};