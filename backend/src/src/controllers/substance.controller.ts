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
    if (!workAreaId) return res.json({ hazardous: [], biological: [] });

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

export const createSubstance = async (req: AuthRequest, res: Response) => {
  try {
    const { type, workAreaId, ...data } = req.body;
    if (!workAreaId) return res.status(400).json({ error: "workAreaId is required" });

    let newSubstance;
    if (type === 'biological') {
      newSubstance = await prisma.biologicalSubstance.create({ data: { ...data, workAreaId } });
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
            chemicalType: data.chemicalType || null,
            isKrebserzeugend: data.isKrebserzeugend || false,
            isMutagen: data.isMutagen || false,
            isReproduktionstoxisch: data.isReproduktionstoxisch || false,
            isMutterschutzRelevant: data.isMutterschutzRelevant || false,
            isJugendschutzRelevant: data.isJugendschutzRelevant || false,
            isAcuteToxic: data.isAcuteToxic || false,
            sdbDate: data.sdbDate ? new Date(data.sdbDate) : null,
            nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : null,
            responsiblePerson: data.responsiblePerson || null,
            autoMailToManufacturer: data.autoMailToManufacturer || false
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
      const trgsCheck = await checkTRGS510Compatibility(workAreaId, master.storageClass || '', master.chemicalType || undefined);
      if (!trgsCheck.isCompatible) {
        newSubstance.trgsWarnings = trgsCheck.conflicts;
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
    }

    vorsorgeService.checkWorkAreaVorsorge(workAreaId).catch(console.error);
    res.status(201).json(newSubstance);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Erstellen" });
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

    // 2. Update lokales Inventory (darf Unit_Leader auch)
    const updatedInventory = await prisma.localSubstanceInventory.update({
      where: { id },
      data: {
        annualAmount: data.annualAmount,
        usageDescription: data.usageDescription,
        substitutionCheck: data.substitutionCheck,
        maxStorageAmount: data.maxStorageAmount,
        customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
        status: data.status
      },
      include: { masterSubstance: true }
    });

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
        auditorName: original.auditorName,
        status: original.status
      },
      include: { masterSubstance: true }
    });

    // Mappe für Response flach
    const responseClone = { ...clone.masterSubstance, ...clone, id: clone.id };
    
    // Audit-Log
    await auditLogService.logTransaction('CLONE', 'SUBSTANCE', clone.id, { clonedFrom: original.id }, req.user?.id || 'SYSTEM', req.ip || '0.0.0.0');

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
        juridicalApprovalBy: req.user?.email || 'SYSTEM',
        juridicalApprovalAt: new Date()
      },
      include: { masterSubstance: true }
    });

    // Audit-Log
    await auditLogService.logTransaction('APPROVE', 'SUBSTANCE', updated.id, { approver: req.user?.email }, req.user?.id || 'SYSTEM', req.ip || '0.0.0.0');

    res.json({ ...updated.masterSubstance, ...updated, id: updated.id });
  } catch (error) {
    res.status(500).json({ error: "Fehler bei der Freigabe" });
  }
};