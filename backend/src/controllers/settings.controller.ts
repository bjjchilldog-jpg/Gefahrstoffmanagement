import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// LegalSettings für einen Tenant abrufen
export const getLegalSettings = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    let settings = await prisma.legalSettings.findUnique({
      where: { tenantId }
    });
    
    // Fallback: Leeres Objekt erstellen, wenn noch nicht existent
    if (!settings) {
      // Stelle sicher, dass der Tenant existiert
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        await prisma.tenant.create({ data: { id: tenantId, name: 'Default Tenant' } });
      }

      settings = await prisma.legalSettings.create({
        data: {
          tenantId,
          companyName: '',
          legalForm: '',
          representatives: '',
          address: '',
          contact: '',
          registerInfo: ''
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
};

// LegalSettings aktualisieren
export const updateLegalSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    const data = req.body;
    
    const settings = await prisma.legalSettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId }
    });
    
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellungen' });
  }
};
