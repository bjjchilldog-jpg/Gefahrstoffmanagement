import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generiert fälschungssicheren Hash für das Zertifikat
const generateCertificateHash = (employeeId: string, moduleId: string, timestamp: string) => {
  return crypto.createHash('sha256').update(`${employeeId}-${moduleId}-${timestamp}-LMS-SECRET`).digest('hex');
};

// 1. Module Management (Admin)
export const getModules = async (req: Request, res: Response) => {
  try {
    const modules = await prisma.trainingModule.findMany({
      include: { hazardousSubstance: true }
    });
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Module' });
  }
};

export const createModule = async (req: Request, res: Response) => {
  try {
    const { title, description, targetAudience, hazardousSubstanceId, content, quizQuestions } = req.body;
    
    const webhookSecret = crypto.randomBytes(16).toString('hex');

    const newModule = await prisma.trainingModule.create({
      data: {
        title,
        description,
        targetAudience,
        hazardousSubstanceId,
        content: content || JSON.stringify([{ type: 'text', text: 'Willkommen zur Unterweisung.' }]),
        quizQuestions: quizQuestions || JSON.stringify([{ question: 'Haben Sie alles verstanden?', options: ['Ja', 'Nein'], correctIndex: 0 }]),
        webhookSecret
      }
    });
    
    res.json(newModule);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Moduls' });
  }
};

export const updateModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, quizQuestions, externalFormUrl } = req.body;
    
    const updated = await prisma.trainingModule.update({
      where: { id },
      data: { content, quizQuestions, externalFormUrl }
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Moduls' });
  }
};

// 2. Zuweisung & Mitarbeiter Record
export const assignModule = async (req: Request, res: Response) => {
  try {
    const { employeeId, moduleId } = req.body;
    const record = await prisma.employeeTrainingRecord.create({
      data: {
        employeeId,
        trainingModuleId: moduleId,
        status: 'ASSIGNED'
      }
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Fehler bei der Zuweisung' });
  }
};

export const getMyRecords = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const records = await prisma.employeeTrainingRecord.findMany({
      where: { employeeId },
      include: { trainingModule: true }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Trainingsdaten' });
  }
};

// 3. Quiz Abschluss (Internes LMS)
export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const { score, passed } = req.body;
    
    const record = await prisma.employeeTrainingRecord.findUnique({ where: { id: recordId }, include: { employee: true, trainingModule: true } });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    if (passed) {
      const completedAt = new Date();
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1); // 12 Monate Gültigkeit (TRGS 555)
      
      const certificateHash = generateCertificateHash(record.employeeId, record.trainingModuleId, completedAt.toISOString());

      const updated = await prisma.employeeTrainingRecord.update({
        where: { id: recordId },
        data: {
          status: 'COMPLETED',
          score,
          completedAt,
          validUntil,
          certificateHash
        }
      });

      // Write to Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'TRAINING_COMPLETED',
          details: `Mitarbeiter ${record.employee.firstName} ${record.employee.lastName} hat die Unterweisung "${record.trainingModule.title}" erfolgreich abgeschlossen.`,
          hashRef: certificateHash,
          entityId: recordId,
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      res.json(updated);
    } else {
      const updated = await prisma.employeeTrainingRecord.update({
        where: { id: recordId },
        data: { status: 'FAILED', score }
      });
      res.json(updated);
    }
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Quizergebnisse' });
  }
};

// 4. Webhook Endpoint für externe Forms (MS Forms / Google Forms)
export const webhookSubmit = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    // Das Secret wird idealerweise als Header x-lms-secret geschickt, wir erlauben aber auch body
    const secret = req.headers['x-lms-secret'] || req.body.secret;
    const { employeeId, score, passed } = req.body;

    const module = await prisma.trainingModule.findUnique({ where: { id: moduleId } });
    if (!module) return res.status(404).json({ error: 'Modul nicht gefunden' });
    
    if (module.webhookSecret !== secret) {
      return res.status(403).json({ error: 'Ungültiges Webhook Secret. Zugriff verweigert.' });
    }

    // Finde den aktiven Record des Mitarbeiters
    const record = await prisma.employeeTrainingRecord.findFirst({
      where: { employeeId, trainingModuleId: moduleId, status: 'ASSIGNED' }
    });

    if (!record) {
      return res.status(404).json({ error: 'Keine offene Unterweisung für diesen Mitarbeiter gefunden.' });
    }

    if (passed) {
      const completedAt = new Date();
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      
      const certificateHash = generateCertificateHash(employeeId, moduleId, completedAt.toISOString());

      await prisma.employeeTrainingRecord.update({
        where: { id: record.id },
        data: {
          status: 'COMPLETED',
          score: score || 100,
          completedAt,
          validUntil,
          certificateHash
        }
      });

      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });

      await prisma.auditLog.create({
        data: {
          action: 'TRAINING_COMPLETED_EXTERNAL',
          details: `Mitarbeiter ${employee?.firstName} ${employee?.lastName} hat die Unterweisung "${module.title}" extern (MS/Google Forms) bestanden.`,
          hashRef: certificateHash,
          entityId: record.id,
          ipAddress: req.ip || '127.0.0.1'
        }
      });
    } else {
      await prisma.employeeTrainingRecord.update({
        where: { id: record.id },
        data: { status: 'FAILED', score: score || 0 }
      });
    }

    res.json({ success: true, message: 'Webhook erfolgreich verarbeitet.' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler bei der Webhook-Verarbeitung' });
  }
};
