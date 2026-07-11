import { Router, Request, Response } from 'express';
import { getModules, createModule, updateModule, assignModule, getMyRecords, submitQuiz, webhookSubmit, getNeeds, groupNeeds, deleteModule, lmsLogin, reorderModules } from '../controllers/lms.controller';
import prisma from '../lib/prisma';
import { auditLogService } from '../services/auditLog.service';

const router = Router();

// Auth
router.post('/auth/login', lmsLogin);

// Admin / Kurse
router.get('/modules', getModules);
router.post('/modules', createModule);
router.post('/modules/reorder', reorderModules);
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);
router.post('/assign', assignModule);

// Bedarfe
router.get('/needs', getNeeds);
router.post('/group-needs', groupNeeds);

// Employee / Records
router.get('/records/:employeeId', getMyRecords);
router.post('/records/:recordId/submit', submitQuiz);

// Webhook (MS Forms / Google Forms)
router.post('/webhook/:moduleId', webhookSubmit);

// Escalation Trigger (Manual Cron for Demo)
router.post('/cron/escalate', async (req, res) => {
  const { triggerEscalation } = await import('../controllers/lms.controller');
  await triggerEscalation(req, res);
});

// --- Modul 11: Digitale Lesebestätigung ---
router.post('/read-confirmation', async (req: Request, res: Response) => {
  try {
    const { employeeId, documentId, substanceId, substanceName } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId ist erforderlich.' });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden.' });

    const confirmation = await prisma.readConfirmation.create({
      data: {
        employeeId,
        documentId: documentId || null,
        substanceId: substanceId || null,
        substanceName: substanceName || null,
        ipAddress: req.ip || '0.0.0.0',
      }
    });

    await auditLogService.logTransaction(
      'READ_CONFIRMATION',
      employeeId,
      confirmation.id,
      {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        substanceName: substanceName || documentId || 'Unbekannt',
        confirmedAt: confirmation.confirmedAt,
      },
      req.ip || '0.0.0.0'
    );

    res.status(201).json({
      message: 'Lesebestätigung erfolgreich protokolliert.',
      confirmation
    });
  } catch (error) {
    console.error('Read Confirmation Error:', error);
    res.status(500).json({ error: 'Fehler bei der Lesebestätigung.' });
  }
});

// --- Modul 17: Offline-WBT Import (signierte Ergebnisse) ---
router.post('/import-offline-bundle', async (req: Request, res: Response) => {
  try {
    const bundle = req.body;
    
    if (!bundle?.results || !Array.isArray(bundle.results)) {
      return res.status(400).json({ error: 'Ungültiges Bundle-Format. Erwartet: { results: [...] }' });
    }
    
    // Integritäts-Hash prüfen
    if (bundle.integrityHash) {
      const crypto = await import('crypto');
      const computedHash = crypto.createHash('sha256').update(JSON.stringify(bundle.results)).digest('hex');
      if (computedHash !== bundle.integrityHash) {
        await auditLogService.log('OFFLINE_IMPORT_REJECTED', `Integritäts-Hash-Mismatch! Erwartet: ${bundle.integrityHash}, Berechnet: ${computedHash}`);
        return res.status(400).json({ error: 'Integritäts-Hash stimmt nicht überein. Die Datei wurde möglicherweise manipuliert.' });
      }
    }
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const result of bundle.results) {
      try {
        // Signatur-Verifikation (wenn verfügbar)
        if (result.verified === false) {
          errors.push(`Ergebnis für ${result.employee_id}/${result.module_id}: Signatur ungültig — übersprungen.`);
          skipped++;
          continue;
        }
        
        // Doppel-Import verhindern: Prüfe ob schon ein COMPLETED Record existiert
        const existing = await prisma.employeeTrainingRecord.findFirst({
          where: {
            employeeId: result.employee_id,
            trainingModuleId: result.module_id,
            status: 'COMPLETED',
            completedAt: { gte: new Date(result.completed_at) }
          }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Record finden oder erstellen
        let record = await prisma.employeeTrainingRecord.findFirst({
          where: { employeeId: result.employee_id, trainingModuleId: result.module_id, status: 'ASSIGNED' }
        });
        
        if (record) {
          const validUntil = new Date(result.completed_at);
          validUntil.setFullYear(validUntil.getFullYear() + 1);
          
          const crypto = await import('crypto');
          const certHash = crypto.createHash('sha256').update(`${result.employee_id}:${result.module_id}:${result.completed_at}`).digest('hex');
          
          await prisma.employeeTrainingRecord.update({
            where: { id: record.id },
            data: {
              status: 'COMPLETED',
              score: result.score || 100,
              completedAt: new Date(result.completed_at),
              validUntil,
              certificateHash: certHash,
            }
          });
          imported++;
        } else {
          errors.push(`Kein offener Record für ${result.employee_id}/${result.module_id}.`);
          skipped++;
        }
      } catch (err: any) {
        errors.push(`Fehler bei ${result.employee_id}: ${err.message}`);
        skipped++;
      }
    }
    
    await auditLogService.log(
      'OFFLINE_WBT_IMPORT',
      `Offline-Bundle importiert: ${imported} Ergebnisse übernommen, ${skipped} übersprungen. Quelle: ${bundle.machineId || 'Unbekannt'}`
    );
    
    res.json({
      message: `Import abgeschlossen: ${imported} Ergebnisse übernommen.`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Offline Import Error:', error);
    res.status(500).json({ error: 'Fehler beim Import der Offline-Ergebnisse.' });
  }
});

export default router;

