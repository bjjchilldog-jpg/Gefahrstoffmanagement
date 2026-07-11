import prisma from '../lib/prisma';
import { auditLogService } from './auditLog.service';

export class RegulationService {
  /**
   * Gleicht die H-Sätze eines Stoffs gegen alle aktiven Regularien (z.B. MuSchG, JArbSchG) ab
   * Setzt die Warn-Flags am Stoff und erstellt ggf. PENDING RevisionTasks.
   */
  async checkSubstanceAgainstRegulations(substanceId: string) {
    const substance = await prisma.hazardousSubstanceMaster.findUnique({
      where: { id: substanceId }
    });
    
    if (!substance || !substance.hPhrases) return;

    const subPhrases = substance.hPhrases.split(',').map(p => p.trim());

    const activeRegulations = await prisma.regulation.findMany({
      where: { status: 'ACTIVE' }
    });

    let isMutterschutzRelevant = false;
    let isJugendschutzRelevant = false;
    let isAcuteToxic = false;
    let createdTasksCount = 0;

    for (const reg of activeRegulations) {
      const regPhrases = reg.triggerHPhrases.split(',').map(p => p.trim());
      
      const hasMatch = regPhrases.some(rp => subPhrases.includes(rp));
      
      if (hasMatch) {
        if (reg.isMutterschutzRelevant) isMutterschutzRelevant = true;
        if (reg.isJugendschutzRelevant) isJugendschutzRelevant = true;

        const existingTask = await prisma.revisionTask.findFirst({
          where: {
            regulationId: reg.id,
            hazardousSubstanceId: substance.id, // Dies verweist in RevisionTask nun eigentlich auf den Master, wir müssen in der DB gucken
            status: 'PENDING'
          }
        });

        if (!existingTask) {
          await prisma.revisionTask.create({
            data: {
              regulationId: reg.id,
              hazardousSubstanceId: substance.id,
              status: 'PENDING',
              adminComment: `System-Warnung: Stoff "${substance.productName}" fällt unter Regelwerk: ${reg.reference}. Bitte Schutzmaßnahmen vor Ort prüfen.`
            }
          });
          createdTasksCount++;
        }
      }
    }

    // Heuristik für akute Toxizität (H300, H310, H330) - Oranges Badge
    if (subPhrases.some(p => p.startsWith('H300') || p.startsWith('H310') || p.startsWith('H330'))) {
        isAcuteToxic = true;
    }

    // Flags am Stoff updaten
    await prisma.hazardousSubstanceMaster.update({
      where: { id: substance.id },
      data: {
        isMutterschutzRelevant,
        isJugendschutzRelevant,
        isAcuteToxic
      }
    });

    if (createdTasksCount > 0) {
       await auditLogService.log('REVISION_TASK_CREATED', `${createdTasksCount} Tasks für Stoff ${substance.productName} generiert.`);
    }
  }

  /**
   * Asbest-Generalvermutung (TRGS 519): Prüft das Baujahr des Gebäudes
   */
  async checkLocationAsbestos(locationId: string) {
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });
    
    if (!location) return;

    if (location.constructionYear && location.constructionYear < 1993) {
      if (location.asbestosStatus !== 'SUSPECTED') {
        await prisma.location.update({
          where: { id: locationId },
          data: { asbestosStatus: 'SUSPECTED' }
        });
        
        await auditLogService.log('ASBESTOS_STATUS_UPDATE', `Generalvermutung für Gebäude ${location.name} (Baujahr ${location.constructionYear}) aktiviert.`);
        
        // Triggert zwingend den TRGS-519-Workflow
        const trgs519Reg = await prisma.regulation.findFirst({
          where: { ruleId: 'TRGS_519_ASBEST', status: 'ACTIVE' }
        });

        if (trgs519Reg) {
          const existingTask = await prisma.revisionTask.findFirst({
            where: {
              regulationId: trgs519Reg.id,
              locationId: location.id,
              status: 'PENDING'
            }
          });

          if (!existingTask) {
            await prisma.revisionTask.create({
              data: {
                regulationId: trgs519Reg.id,
                locationId: location.id,
                status: 'PENDING',
                adminComment: `Asbest-Generalvermutung (Baujahr < 1993). TRGS 519 Workflow zwingend erforderlich.`
              }
            });
            await auditLogService.log('REVISION_TASK_CREATED', `TRGS 519 Asbest-Task für Location ${location.name} generiert.`);
          }
        }
      }
    }
  }

  /**
   * Admin bestätigt einen RevisionTask. Das 4-Augen-Prinzip greift.
   */
  async confirmRevisionTask(taskId: string, userId: string, adminComment?: string) {
    const task = await prisma.revisionTask.findUnique({ where: { id: taskId } });
    if (!task || task.status === 'CONFIRMED') return;

    const updatedTask = await prisma.revisionTask.update({
      where: { id: taskId },
      data: { 
        status: 'CONFIRMED',
        confirmedBy: userId,
        adminComment: adminComment || task.adminComment
      }
    });

    await auditLogService.logTransaction(
      'REVISION_TASK_CONFIRMED',
      userId,
      taskId,
      {
        oldStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        comment: updatedTask.adminComment
      }
    );
  }
}

export const regulationService = new RegulationService();
