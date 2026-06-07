import prisma from '../lib/prisma';
import crypto from 'crypto';

export class AuditLogService {
  async logTransaction(action: string, userId: string, entityId: string, payload: any, ipAddress: string = '127.0.0.1') {
    try {
      const timestamp = new Date();
      const payloadString = JSON.stringify(payload);
      
      // Hash generieren: action + userId + entityId + timestamp + payload
      const dataToHash = `${action}|${userId}|${entityId}|${timestamp.toISOString()}|${payloadString}`;
      const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

      await prisma.auditLog.create({
        data: {
          action,
          details: payloadString,
          entityId,
          hash,
          userId,
          ipAddress,
          timestamp
        }
      });
      console.log(`[AUDIT TRANSACTION] ${action} on ${entityId} by ${userId} (Hash: ${hash})`);
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Failed to log transaction:', error);
    }
  }

  async log(action: string, details: string, userId: string = 'SYSTEM', ipAddress: string = '127.0.0.1') {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          details,
          userId,
          ipAddress
        }
      });
      console.log(`[AUDIT LOG] ${action} - ${details} (User: ${userId}, IP: ${ipAddress})`);
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Failed to write audit log:', error);
    }
  }

  async logWithHash(action: string, details: string, hashRef: string, userId: string = 'SYSTEM', ipAddress: string = '127.0.0.1') {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          details,
          hashRef,
          userId,
          ipAddress
        }
      });
      console.log(`[AUDIT LOG] ${action} - ${details} (Hash: ${hashRef})`);
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Failed to write audit log with hash:', error);
    }
  }
}

export const auditLogService = new AuditLogService();
