import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-gefahrstoff';

export const lmsLogin = async (req: Request, res: Response) => {
  try {
    const { employeeNumber, pin } = req.body;
    if (!employeeNumber || !pin) {
      return res.status(400).json({ error: 'Personalnummer und PIN sind erforderlich.' });
    }

    const employee = await prisma.employee.findFirst({
      where: { employeeNumber }
    });

    if (!employee || !employee.pin) {
      return res.status(401).json({ error: 'Ungültige Personalnummer oder PIN.' });
    }

    const isMatch = await bcrypt.compare(pin, employee.pin);
    if (!isMatch) {
      return res.status(401).json({ error: 'Ungültige Personalnummer oder PIN.' });
    }

    const token = jwt.sign(
      { id: employee.id, employeeNumber: employee.employeeNumber, role: 'EMPLOYEE' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, employee });
  } catch (error) {
    console.error('LMS Login Error:', error);
    res.status(500).json({ error: 'Ein Fehler ist beim Login aufgetreten.' });
  }
};

// Generiert fälschungssicheren Hash für das Zertifikat
const generateCertificateHash = (employeeId: string, moduleId: string, timestamp: string) => {
  return crypto.createHash('sha256').update(`${employeeId}-${moduleId}-${timestamp}-LMS-SECRET`).digest('hex');
};

// 1. Module Management (Admin)
export const getModules = async (req: Request, res: Response) => {
  try {
    const modules = await prisma.trainingModule.findMany({
      include: { 
        hazardousSubstance: true,
        records: {
          include: { employee: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
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
    const { title, targetAudience, content, quizQuestions, externalFormUrl } = req.body;
    
    const updated = await prisma.trainingModule.update({
      where: { id },
      data: { title, targetAudience, content, quizQuestions, externalFormUrl }
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Moduls' });
  }
};

export const reorderModules = async (req: Request, res: Response) => {
  try {
    const { order } = req.body; // array of { id, sortOrder }
    
    await prisma.$transaction(
      order.map((item: any) => 
        prisma.trainingModule.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Neusortieren der Module' });
  }
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if there are any dependent records that might prevent deletion
    // Wait, let's just let prisma do it. If it fails due to records, we return an error.
    await prisma.trainingModule.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Moduls (evtl. existieren noch verknüpfte Trainingsdaten)' });
  }
};

// 2. Needs Management (Bedarfspool)
export const getNeeds = async (req: Request, res: Response) => {
  try {
    const needs = await prisma.trainingNeed.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(needs);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Bedarfe' });
  }
};

export const groupNeeds = async (req: Request, res: Response) => {
  try {
    const { needIds, title } = req.body;
    
    if (!needIds || needIds.length === 0) {
      return res.status(400).json({ error: 'Keine Bedarfe ausgewählt.' });
    }

    const needs = await prisma.trainingNeed.findMany({
      where: { id: { in: needIds } }
    });

    const substanceNames = needs.map(n => n.substanceName).join(', ');
    const webhookSecret = crypto.randomBytes(16).toString('hex');

    const newModule = await prisma.trainingModule.create({
      data: {
        title: title || 'Gruppenunterweisung',
        targetAudience: 'Alle betroffenen Mitarbeitenden',
        content: JSON.stringify([
          { type: 'text', text: `Willkommen zur Unterweisung. \n\nDiese Unterweisung gilt für folgende Gefährdungen/Tätigkeiten:\n${substanceNames}` }
        ]),
        quizQuestions: JSON.stringify([{ question: 'Haben Sie die Unterweisung verstanden?', options: ['Ja', 'Nein'], correctIndex: 0 }]),
        webhookSecret,
        trainingNeeds: {
          connect: needIds.map((id: string) => ({ id }))
        }
      }
    });

    await prisma.trainingNeed.updateMany({
      where: { id: { in: needIds } },
      data: { status: 'RESOLVED' }
    });

    res.json(newModule);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Gruppen-WBTs' });
  }
};

// 3. Zuweisung & Mitarbeiter Record
export const assignModule = async (req: Request, res: Response) => {
  try {
    const { employeeIds, moduleId } = req.body;
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ error: 'employeeIds array is required' });
    }
    
    // Check existing assignments to prevent duplicates
    const existingRecords = await prisma.employeeTrainingRecord.findMany({
      where: {
        trainingModuleId: moduleId,
        employeeId: { in: employeeIds },
        status: { in: ['ASSIGNED'] }
      }
    });
    
    const existingEmpIds = new Set(existingRecords.map(r => r.employeeId));
    const newEmpIds = employeeIds.filter(id => !existingEmpIds.has(id));

    if (newEmpIds.length > 0) {
      await prisma.employeeTrainingRecord.createMany({
        data: newEmpIds.map(empId => ({
          employeeId: empId,
          trainingModuleId: moduleId,
          status: 'ASSIGNED'
        }))
      });
    }
    
    res.json({ success: true, assignedCount: newEmpIds.length, skippedCount: employeeIds.length - newEmpIds.length });
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
      
      // JArbSchG: Unter 18 Jährige müssen halbjährlich unterwiesen werden
      let isUnder18 = false;
      if (record.employee.dateOfBirth) {
        const ageDifMs = Date.now() - new Date(record.employee.dateOfBirth).getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        isUnder18 = age < 18;
      }
      
      if (isUnder18) {
        validUntil.setMonth(validUntil.getMonth() + 6); // 6 Monate
      } else {
        validUntil.setFullYear(validUntil.getFullYear() + 1); // 12 Monate (TRGS 555)
      }
      
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

      // Supervisor Benachrichtigung bei Erledigung
      const employeeWithSupervisor = await prisma.employee.findUnique({
        where: { id: record.employee.id },
        include: { supervisor: true }
      });

      if (employeeWithSupervisor?.supervisor) {
        await prisma.notificationTask.create({
          data: {
            type: 'COMPLETION_SUPERVISOR',
            employeeId: employeeWithSupervisor.supervisor.id,
            trainingRecordId: record.id,
            status: 'SENT',
            sendAfter: new Date(),
            sentAt: new Date()
          }
        });
        console.log(`[EMAIL/SMS] -> An Vorgesetzten: ${employeeWithSupervisor.supervisor.firstName} | Betreff: Erledigung: ${record.employee.firstName} ${record.employee.lastName} hat Unterweisung "${record.trainingModule.title}" abgeschlossen.`);
      }

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
      
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      
      let isUnder18 = false;
      if (employee?.dateOfBirth) {
        const ageDifMs = Date.now() - new Date(employee.dateOfBirth).getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        isUnder18 = age < 18;
      }
      
      if (isUnder18) {
        validUntil.setMonth(validUntil.getMonth() + 6);
      } else {
        validUntil.setFullYear(validUntil.getFullYear() + 1);
      }
      
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
// 5. Eskalations-Prozess (Cronjob Demo)
export const triggerEscalation = async (req: Request, res: Response) => {
  try {
    // Finde alle zugewiesenen Trainings (in echt: mit abgelaufener Frist)
    const overdueRecords = await prisma.employeeTrainingRecord.findMany({
      where: { status: 'ASSIGNED' },
      include: {
        employee: { include: { supervisor: true } },
        trainingModule: true
      }
    });

    const logs = [];

    for (const record of overdueRecords) {
      const emp = record.employee;
      const mod = record.trainingModule;

      // 1. Benachrichtigung an Mitarbeiter simulieren
      const reminderTask = await prisma.notificationTask.create({
        data: {
          type: 'REMINDER_EMPLOYEE',
          employeeId: emp.id,
          trainingRecordId: record.id,
          status: 'SENT',
          sendAfter: new Date(),
          sentAt: new Date()
        }
      });

      console.log(`[EMAIL/SMS] -> An: ${emp.email || emp.phone || emp.firstName} | Betreff: Erinnerung: Unterweisung "${mod.title}" ist fällig!`);
      logs.push(`Erinnerung gesendet an ${emp.firstName} ${emp.lastName}`);

      // 2. Benachrichtigung an Vorgesetzten simulieren, falls vorhanden
      if (emp.supervisor) {
        await prisma.notificationTask.create({
          data: {
            type: 'ESCALATION_SUPERVISOR',
            employeeId: emp.supervisor.id,
            trainingRecordId: record.id,
            status: 'SENT',
            sendAfter: new Date(),
            sentAt: new Date()
          }
        });

        console.log(`[EMAIL/SMS] -> An Vorgesetzten: ${emp.supervisor.email || emp.supervisor.firstName} | Betreff: Eskalation: ${emp.firstName} ${emp.lastName} hat Unterweisung "${mod.title}" verpasst!`);
        logs.push(`Eskalation gesendet an Vorgesetzten ${emp.supervisor.firstName} ${emp.supervisor.lastName}`);
      }
    }

    res.json({ message: 'Eskalations-Job ausgeführt', logs });
  } catch (error) {
    console.error('Escalation Error:', error);
    res.status(500).json({ error: 'Fehler beim Eskalations-Job' });
  }
};
