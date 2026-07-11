import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email?: string;
    id?: string;
    locationId?: string;
    tokenVersion?: number;
  };
}

/**
 * JWT-Authentifizierung mit Live-Validierung:
 * 1. Token vorhanden und JWT-Signatur gültig
 * 2. User existiert noch in der DB
 * 3. user.status === 'ACTIVE' (PENDING/SUSPENDED → 403)
 * 4. tokenVersion stimmt überein (Passwort-Änderung → alle alten Sessions ungültig)
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'dummy-token' || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Fehlendes oder ungültiges Token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tokenVersion?: number };

    // Live-Check: User noch aktiv?
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, status: true, tokenVersion: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Benutzer nicht mehr vorhanden' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: user.status === 'PENDING_APPROVAL' 
          ? 'Ihr Account wartet noch auf Freigabe durch den Administrator.' 
          : 'Ihr Account wurde gesperrt.',
        code: user.status
      });
    }

    // Token-Version prüfen (Passwort geändert → alte Tokens ungültig)
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Sitzung abgelaufen. Bitte erneut anmelden.' });
    }

    req.user = { 
      userId: user.id, 
      role: user.role, 
      email: user.email,
      tokenVersion: user.tokenVersion 
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token ungültig oder abgelaufen' });
  }
};

/**
 * Rollen-basierte Zugriffskontrolle.
 * Muss NACH authenticateToken verwendet werden.
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Zugriff verweigert — unzureichende Berechtigungen' });
    }
    next();
  };
};