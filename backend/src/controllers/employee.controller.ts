import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        exposures: {
          include: { masterSubstance: true }
        }
      },
      orderBy: { lastName: 'asc' }
    });
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, employeeNumber, dateOfBirth, department } = req.body;
    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        employeeNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        department
      }
    });
    res.status(201).json(employee);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    await prisma.employee.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addExposure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { masterSubstanceId, exposureType, vorsorgeFrist, nextVorsorgeDate, notes } = req.body;
    
    const exposure = await prisma.employeeExposure.create({
      data: {
        employeeId: id,
        masterSubstanceId,
        exposureType: exposureType || 'GEFAHRSTOFF',
        vorsorgeFrist,
        nextVorsorgeDate: nextVorsorgeDate ? new Date(nextVorsorgeDate) : null,
        notes
      }
    });
    res.status(201).json(exposure);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const removeExposure = async (req: Request, res: Response) => {
  try {
    await prisma.employeeExposure.delete({
      where: { id: req.params.exposureId }
    });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cloneExposures = async (req: Request, res: Response) => {
  try {
    const { sourceEmployeeId, targetEmployeeId } = req.body;
    
    // Get all exposures from source
    const sourceExposures = await prisma.employeeExposure.findMany({
      where: { employeeId: sourceEmployeeId }
    });
    
    // Create them for target
    const newExposures = await Promise.all(sourceExposures.map(exp => 
      prisma.employeeExposure.create({
        data: {
          employeeId: targetEmployeeId,
          masterSubstanceId: exp.masterSubstanceId,
          exposureType: exp.exposureType,
          vorsorgeFrist: exp.vorsorgeFrist,
          nextVorsorgeDate: exp.nextVorsorgeDate,
          notes: exp.notes
        }
      })
    ));
    
    res.json(newExposures);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
