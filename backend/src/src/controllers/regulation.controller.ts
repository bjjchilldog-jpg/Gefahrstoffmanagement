import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { regulationService } from '../services/regulation.service';
import { auditLogService } from '../services/auditLog.service';

export const createRegulation = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const reg = await prisma.regulation.create({ data });
    await auditLogService.log('REGULATION_CREATED', `Regelwerk ${reg.ruleId} angelegt.`);
    res.status(201).json(reg);
  } catch (error) {
    console.error("Error creating regulation:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

export const getPendingRevisions = async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.revisionTask.findMany({
      where: { status: 'PENDING' },
      include: {
        regulation: true,
        hazardousSubstance: true,
        location: true
      }
    });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching revision tasks:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};

export const confirmRevisionTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminComment, userId } = req.body; // In real app, userId comes from JWT
    
    await regulationService.confirmRevisionTask(id, userId || 'ADMIN', adminComment);
    res.json({ message: "Task bestätigt." });
  } catch (error) {
    console.error("Error confirming task:", error);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
};
