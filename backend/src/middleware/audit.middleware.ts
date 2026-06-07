import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { auditLogService } from '../services/auditLog.service';

export const auditWrapper = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Wir hooken uns in res.json oder res.send ein, um auf den Abschluss der Route zu warten
  const originalJson = res.json;
  
  res.json = function (body) {
    // Führe das originale res.json aus
    const result = originalJson.call(this, body);
    
    // Nach erfolgreichem Senden des Responses loggen wir die Transaktion
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        const userId = req.user?.userId || 'SYSTEM';
        const action = `${req.method}_${req.originalUrl}`;
        // Versuche eine entityId aus der Response oder URL zu extrahieren
        const entityId = body?.id || req.params.id || 'N/A';
        
        auditLogService.logTransaction(
          action,
          userId,
          entityId,
          req.body, // Payload der Anfrage
          req.ip || '127.0.0.1'
        ).catch(err => console.error("Auto-Audit failed:", err));
      }
    }
    
    return result;
  };
  
  next();
};
