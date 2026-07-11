import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } from '../middleware/rateLimit.middleware';
import { auditLogService } from '../services/auditLog.service';
import { sendRegistrationPending, sendAdminNewRegistration, sendPasswordResetLink } from '../services/email.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

// =====================================================
// POST /api/auth/login — Rate-Limited, Status-Check
// =====================================================
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    console.log(`[LOGIN ATTEMPT] Email: ${email}, Found user: ${!!user}`);

    // Anti-Enumeration: Einheitliche Fehlermeldung
    if (!user) {
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log(`[LOGIN ATTEMPT] isValidPassword: ${isValidPassword}`);

    if (!isValidPassword) {
      await auditLogService.log('LOGIN_FAILED', `Fehlgeschlagener Login-Versuch für ${email}`, 'SYSTEM', req.ip || '127.0.0.1');
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }

    // Status-Check: Nur ACTIVE darf rein
    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({ 
        error: 'Ihr Account wartet noch auf Freigabe durch den Administrator.',
        code: 'PENDING_APPROVAL'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ 
        error: 'Ihr Account wurde gesperrt. Bitte wenden Sie sich an den Administrator.',
        code: 'SUSPENDED'
      });
    }

    // Token erstellen MIT tokenVersion
    const token = jwt.sign(
      { userId: user.id, role: user.role, tokenVersion: user.tokenVersion },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await auditLogService.log('LOGIN_SUCCESS', `Login: ${email} (Rolle: ${user.role})`, user.id, req.ip || '127.0.0.1');

    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// =====================================================
// POST /api/auth/register — Rate-Limited, KEIN Rollenfeld
// =====================================================
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  // SICHERHEITSKRITISCH: Nur diese 4 Felder werden akzeptiert!
  // Alles andere (role, status, tokenVersion) wird VERWORFEN.
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  const trimmedEmail = email.toLowerCase().trim();

  // Passwort-Qualität prüfen
  if (password.length < 8) {
    return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  try {
    // Prüfen ob E-Mail bereits existiert
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      // Anti-Enumeration: Gleiche Antwort wie bei Erfolg
      return res.status(200).json({ 
        message: 'Falls diese E-Mail-Adresse noch nicht registriert ist, wurde Ihre Anfrage entgegengenommen.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12); // Cost-Factor 12 (höher als vorher)

    // HARDCODED: role=VIEWER, status=PENDING_APPROVAL
    // Egal was der Client sendet — diese Werte werden IMMER gesetzt.
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        role: 'VIEWER',                  // HARDCODED — nicht vom Client steuerbar
        status: 'PENDING_APPROVAL',      // HARDCODED — nicht vom Client steuerbar
        tokenVersion: 0
      }
    });

    await auditLogService.log(
      'USER_REGISTERED', 
      `Neue Registrierung: ${trimmedEmail} (${firstName || ''} ${lastName || ''}) — Status: PENDING_APPROVAL`,
      'SYSTEM',
      req.ip || '127.0.0.1'
    );

    // E-Mails senden (async, blockiert nicht die Response)
    sendRegistrationPending(trimmedEmail, firstName || '');

    // Alle Admins benachrichtigen
    const admins = await prisma.user.findMany({ 
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { email: true }
    });
    for (const admin of admins) {
      sendAdminNewRegistration(admin.email, trimmedEmail, `${firstName || ''} ${lastName || ''}`.trim());
    }

    res.status(201).json({ 
      message: 'Ihre Registrierung wurde entgegengenommen. Der Administrator wurde benachrichtigt.'
    });
  } catch (error) {
    console.error('Registrierung-Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// =====================================================
// POST /api/auth/forgot-password — Rate-Limited, Anti-Enumeration
// =====================================================
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich.' });
  }

  // IMMER 200 — egal ob User existiert oder nicht (Anti-Enumeration)
  const successMessage = 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen versendet.';

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || user.status === 'SUSPENDED') {
      // Kein Hinweis ob User existiert!
      return res.status(200).json({ message: successMessage });
    }

    // Alte unbenutzte Tokens für diesen User löschen
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null }
    });

    // Neuer kryptografischer Token (512-bit Entropie)
    const resetToken = crypto.randomBytes(64).toString('hex');

    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde
      }
    });

    await auditLogService.log(
      'PASSWORD_RESET_REQUESTED', 
      `Passwort-Reset angefordert für ${user.email}`,
      user.id,
      req.ip || '127.0.0.1'
    );

    // E-Mail senden (async)
    sendPasswordResetLink(user.email, resetToken);

    res.status(200).json({ message: successMessage });
  } catch (error) {
    console.error('Forgot-Password-Fehler:', error);
    // Auch bei Fehler keine Enumeration ermöglichen
    res.status(200).json({ message: successMessage });
  }
});

// =====================================================
// POST /api/auth/reset-password — Token-basiert, Single-Use
// =====================================================
router.post('/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  try {
    // Token suchen: muss existieren, unbenutzt und nicht abgelaufen sein
    const resetEntry = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetEntry) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Link.' });
    }

    if (resetEntry.usedAt) {
      return res.status(400).json({ error: 'Dieser Link wurde bereits verwendet.' });
    }

    if (new Date() > resetEntry.expiresAt) {
      return res.status(400).json({ error: 'Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomare Transaktion: Passwort setzen + Token verbrauchen + tokenVersion bumpen
    await prisma.$transaction([
      // 1. Token als benutzt markieren (Single-Use)
      prisma.passwordResetToken.update({
        where: { id: resetEntry.id },
        data: { usedAt: new Date() }
      }),
      // 2. Passwort ändern + tokenVersion hochzählen (invalidiert alle JWTs)
      prisma.user.update({
        where: { id: resetEntry.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 }
        }
      })
    ]);

    await auditLogService.log(
      'PASSWORD_RESET_COMPLETED',
      `Passwort erfolgreich zurückgesetzt für ${resetEntry.user.email}`,
      resetEntry.userId,
      req.ip || '127.0.0.1'
    );

    res.json({ message: 'Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.' });
  } catch (error) {
    console.error('Reset-Password-Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// =====================================================
// GET /api/auth/me — Eigenes Profil (authentifiziert)
// =====================================================
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        locations: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});
// =====================================================
// SSO Routes (Modul 22)
// =====================================================
import { getSsoConfig, updateSsoConfig, ssoLogin, ssoCallback, getSsoMappings, createSsoMapping, deleteSsoMapping, createSubstanceSnapshot, getSubstanceSnapshots, samlLogin, samlCallback, autoTriggerTraining } from '../controllers/sso.controller';

router.get('/sso/config', authenticateToken, getSsoConfig);
router.put('/sso/config', authenticateToken, updateSsoConfig);
router.get('/sso/login', ssoLogin);
router.get('/sso/callback', ssoCallback);
router.get('/sso/mappings', authenticateToken, getSsoMappings);
router.post('/sso/mappings', authenticateToken, createSsoMapping);
router.delete('/sso/mappings/:id', authenticateToken, deleteSsoMapping);

// SAML 2.0
router.get('/sso/saml/login', samlLogin);
router.post('/sso/saml/callback', samlCallback);

// Stoff-Historisierung (Freeze-State)
router.post('/substances/:id/snapshot', authenticateToken, createSubstanceSnapshot);
router.get('/substances/:id/snapshots', authenticateToken, getSubstanceSnapshots);

// Auto-Trigger: H-Sätze → Unterweisungsbedarf
router.post('/substances/:id/auto-trigger-training', authenticateToken, autoTriggerTraining);

// GBU ↔ Snapshot Rückverknüpfung
router.post('/gbu/:gbuId/link-snapshot', authenticateToken);

export default router;
