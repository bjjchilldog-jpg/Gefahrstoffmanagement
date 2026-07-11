import { Request, Response, NextFunction } from 'express';

/**
 * In-Memory Rate Limiter (kein Redis nötig für SQLite-Setup)
 * Schützt öffentliche Endpunkte gegen Brute-Force-Angriffe.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function createRateLimit(maxRequests: number, windowMs: number) {
  const storeName = `rl_${maxRequests}_${windowMs}_${Date.now()}`;
  stores.set(storeName, new Map());

  return (req: Request, res: Response, next: NextFunction) => {
    const store = stores.get(storeName)!;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      // Neues Fenster starten
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        retryAfterSeconds: retryAfterSec
      });
    }

    entry.count++;
    next();
  };
}

// Vordefinierte Limiter für Auth-Routen
export const loginLimiter = createRateLimit(10, 15 * 60 * 1000);      // 10 Versuche / 15 Min
export const registerLimiter = createRateLimit(5, 15 * 60 * 1000);    // 5 Versuche / 15 Min
export const forgotPasswordLimiter = createRateLimit(3, 15 * 60 * 1000); // 3 Versuche / 15 Min
export const resetPasswordLimiter = createRateLimit(5, 15 * 60 * 1000);  // 5 Versuche / 15 Min
