import { Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth.middleware';
import { auditLogService } from '../services/auditLog.service';
import { sendAccountApproved } from '../services/email.service';

// Erlaubte Rollen für Admin-Zuweisung (ADMIN ist NICHT dabei!)
const ASSIGNABLE_ROLES = ['VIEWER', 'LOCATION_MANAGER', 'SAFETY_OFFICER'];

// =====================================================
// GET /api/users — Alle User (ADMIN only)
// =====================================================
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { locations: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const safeUsers = users.map(u => {
      const { passwordHash, tokenVersion, ...safe } = u;
      return safe;
    });
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
  }
};

// =====================================================
// GET /api/users/pending — Wartende Registrierungen (ADMIN only)
// =====================================================
export const getPendingUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'PENDING_APPROVAL' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        status: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der wartenden Benutzer' });
  }
};

// =====================================================
// POST /api/users/:id/approve — Account freischalten (ADMIN only)
// =====================================================
export const approveUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role, locationIds } = req.body;

  // SICHERHEITSKRITISCH: Admin kann KEINE Admin-Rolle über diese Route vergeben!
  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ 
      error: `Ungültige Rolle. Erlaubt: ${ASSIGNABLE_ROLES.join(', ')}` 
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Benutzer ist nicht im Status PENDING_APPROVAL' });
    }

    const updateData: any = {
      status: 'ACTIVE',
      role
    };

    if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
      updateData.locations = {
        connect: locationIds.map((locId: string) => ({ id: locId }))
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { locations: { select: { id: true, name: true } } }
    });

    await auditLogService.logTransaction(
      'USER_APPROVED',
      req.user!.userId,
      id,
      { email: updatedUser.email, role, locationIds, approvedBy: req.user!.email },
      req.ip || '127.0.0.1'
    );

    // Benachrichtigungs-E-Mail
    sendAccountApproved(updatedUser.email, updatedUser.firstName || '', role);

    const { passwordHash, tokenVersion, ...safeUser } = updatedUser;
    res.json({ message: 'Benutzer freigeschaltet', user: safeUser });
  } catch (error) {
    console.error('Approve-Fehler:', error);
    res.status(500).json({ error: 'Fehler bei der Freischaltung' });
  }
};

// =====================================================
// POST /api/users/:id/suspend — Account sperren (ADMIN only)
// =====================================================
export const suspendUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    // Admin kann sich nicht selbst sperren
    if (user.id === req.user!.userId) {
      return res.status(400).json({ error: 'Sie können sich nicht selbst sperren.' });
    }

    // Admin kann keinen anderen Admin sperren (nur Superadmin-Script)
    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin-Accounts können nur über das Superadmin-Script gesperrt werden.' });
    }

    await prisma.user.update({
      where: { id },
      data: { 
        status: 'SUSPENDED',
        tokenVersion: { increment: 1 } // Alle Sessions sofort ungültig
      }
    });

    await auditLogService.logTransaction(
      'USER_SUSPENDED',
      req.user!.userId,
      id,
      { email: user.email, suspendedBy: req.user!.email },
      req.ip || '127.0.0.1'
    );

    res.json({ message: 'Benutzer gesperrt' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Sperren' });
  }
};

// =====================================================
// PUT /api/users/:id/role — Rolle ändern (ADMIN only)
// =====================================================
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ 
      error: `Ungültige Rolle. Erlaubt: ${ASSIGNABLE_ROLES.join(', ')}` 
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin-Rollen können nur über das Superadmin-Script geändert werden.' });
    }

    const oldRole = user.role;
    await prisma.user.update({
      where: { id },
      data: { role }
    });

    await auditLogService.logTransaction(
      'USER_ROLE_CHANGED',
      req.user!.userId,
      id,
      { email: user.email, oldRole, newRole: role, changedBy: req.user!.email },
      req.ip || '127.0.0.1'
    );

    res.json({ message: `Rolle von ${oldRole} auf ${role} geändert` });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Ändern der Rolle' });
  }
};

// =====================================================
// PUT /api/users/:id/locations — Standort-Zuordnung (ADMIN only)
// =====================================================
export const updateUserLocations = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { locationIds } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        locations: {
          set: locationIds.map((locId: string) => ({ id: locId }))
        }
      },
      include: { locations: true }
    });

    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Standorte' });
  }
};

// =====================================================
// CSV Import (bestehend, unverändert)
// =====================================================
export const importUsersFromCSV = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const dataLines = lines.slice(1);
    
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      const parts = line.split(';');
      if (parts.length < 4) {
        errors.push(`Zeile ${i + 2}: Zu wenige Spalten`);
        continue;
      }

      const email = parts[0].trim().toLowerCase();
      const password = parts[1].trim();
      const role = ASSIGNABLE_ROLES.includes(parts[2].trim()) ? parts[2].trim() : 'VIEWER';
      const locationName = parts[3].trim();

      if (!email || !password || !locationName) {
        errors.push(`Zeile ${i + 2}: Fehlende Pflichtfelder`);
        continue;
      }

      const location = await prisma.location.findFirst({ where: { name: locationName } });
      if (!location) {
        errors.push(`Zeile ${i + 2}: Standort '${locationName}' nicht gefunden.`);
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        errors.push(`Zeile ${i + 2}: Benutzer ${email} existiert bereits.`);
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
          status: 'ACTIVE', // CSV-Import = vom Admin direkt angelegt = sofort aktiv
          locations: { connect: [{ id: location.id }] }
        }
      });

      successCount++;
    }

    res.json({ message: `Import: ${successCount} erfolgreich, ${errors.length} Fehler.`, successCount, errors });
  } catch (error) {
    console.error('CSV Import Fehler:', error);
    res.status(500).json({ error: 'Fehler beim Verarbeiten der CSV-Datei.' });
  }
};
