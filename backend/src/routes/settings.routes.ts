import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireRoles, AuthRequest } from '../middleware/auth.middleware';
import { encryptPassword, invalidateSmtpCache, sendTestEmail } from '../services/email.service';

const router = Router();

// GET /api/settings/:tenantId — Einstellungen laden (public für CD-Settings)
router.get('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    let settings = await prisma.legalSettings.findUnique({ where: { tenantId } });

    if (!settings) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        await prisma.tenant.create({ data: { id: tenantId, name: 'Default Tenant' } });
      }
      settings = await prisma.legalSettings.create({
        data: { tenantId, companyName: '', legalForm: '', representatives: '', address: '', contact: '' }
      });
    }

    // SMTP-Passwort NIEMALS ans Frontend senden!
    const { smtpPass, ...safeSettings } = settings;
    res.json({ ...safeSettings, smtpPass: smtpPass ? '••••••••' : '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
});

// PUT /api/settings/:tenantId — Einstellungen aktualisieren (ADMIN only)
router.put('/:tenantId', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    const data = { ...req.body };

    // SMTP-Passwort verschlüsseln, wenn geändert
    if (data.smtpPass && data.smtpPass !== '••••••••') {
      data.smtpPass = encryptPassword(data.smtpPass);
      invalidateSmtpCache(); // Neue SMTP-Config → Cache invalidieren
    } else if (data.smtpPass === '••••••••' || data.smtpPass === '') {
      delete data.smtpPass; // Passwort nicht ändern wenn Placeholder
    }

    // Wenn SMTP-Host geändert → Cache invalidieren
    if (data.smtpHost !== undefined) {
      invalidateSmtpCache();
    }

    // id/tenantId darf nicht überschrieben werden
    delete data.id;
    delete data.tenantId;

    const settings = await prisma.legalSettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId }
    });

    const { smtpPass, ...safeSettings } = settings;
    res.json({ ...safeSettings, smtpPass: smtpPass ? '••••••••' : '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellungen' });
  }
});

// POST /api/settings/smtp/test — Test-E-Mail senden (ADMIN only)
router.post('/smtp/test', authenticateToken, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-Mail-Adresse erforderlich' });

  const result = await sendTestEmail(email);
  if (result.success) {
    res.json({ 
      message: 'Test-E-Mail wurde versendet.',
      etherealUrl: result.etherealUrl 
    });
  } else {
    res.status(500).json({ error: `SMTP-Fehler: ${result.error}` });
  }
});

export default router;
