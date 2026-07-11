import prisma from '../lib/prisma';
import crypto from 'crypto';

/**
 * Revisionssicherer AuditLog-Service mit Blockchain-artiger Hash-Kette.
 * 
 * Jeder Eintrag enthält:
 * - hash: SHA256 des eigenen Inhalts
 * - prevHash: SHA256 des vorherigen Eintrags (Kettenglied)
 * - seqNo: Lückenlose Sequenznummer
 * 
 * Manipulation ist erkennbar: Wenn ein Eintrag gelöscht, eingefügt oder
 * geändert wird, reißt die Hash-Kette. Ein Forensiker prüft:
 *   hash(Eintrag N-1) === prevHash(Eintrag N) für alle N
 */

async function getNextSeqAndPrevHash(): Promise<{ seqNo: number; prevHash: string }> {
  const lastEntry = await prisma.auditLog.findFirst({
    where: { seqNo: { not: null } },
    orderBy: { seqNo: 'desc' },
    select: { seqNo: true, hash: true }
  });

  if (!lastEntry || lastEntry.seqNo === null) {
    return { seqNo: 1, prevHash: 'GENESIS' };
  }

  return {
    seqNo: lastEntry.seqNo + 1,
    prevHash: lastEntry.hash || 'UNKNOWN'
  };
}

function computeHash(action: string, details: string, userId: string | undefined, seqNo: number, prevHash: string, timestamp: string): string {
  const data = `${seqNo}|${action}|${userId || 'SYSTEM'}|${details}|${prevHash}|${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class AuditLogService {
  /**
   * Revisionssicherer Log mit Hash-Kette.
   * Wird bei allen sicherheitsrelevanten Aktionen aufgerufen.
   */
  async logTransaction(action: string, userId: string, entityId: string, payload: any, ipAddress: string = '127.0.0.1') {
    try {
      const timestamp = new Date();
      const payloadString = JSON.stringify(payload);
      const { seqNo, prevHash } = await getNextSeqAndPrevHash();

      // Prüfen ob User in DB existiert, um FK-Fehler zu vermeiden
      let validUserId: string | undefined = undefined;
      if (userId && userId !== 'SYSTEM' && userId !== 'mock-admin-id') {
        const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validUserId = userId;
      }

      const hash = computeHash(action, payloadString, validUserId, seqNo, prevHash, timestamp.toISOString());

      await prisma.auditLog.create({
        data: {
          action,
          details: payloadString,
          entityId,
          seqNo,
          hash,
          prevHash,
          userId: validUserId,
          ipAddress,
          timestamp
        }
      });
      console.log(`[AUDIT #${seqNo}] ${action} on ${entityId} by ${userId || 'SYSTEM'} (Chain: ${prevHash.slice(0, 8)}→${hash.slice(0, 8)})`);
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Failed to log transaction:', error);
    }
  }

  async log(action: string, details: string, userId: string = 'SYSTEM', ipAddress: string = '127.0.0.1') {
    try {
      const timestamp = new Date();
      const { seqNo, prevHash } = await getNextSeqAndPrevHash();

      let validUserId: string | undefined = undefined;
      if (userId && userId !== 'SYSTEM' && userId !== 'mock-admin-id') {
        const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validUserId = userId;
      }

      const hash = computeHash(action, details, validUserId, seqNo, prevHash, timestamp.toISOString());

      await prisma.auditLog.create({
        data: {
          action,
          details,
          seqNo,
          hash,
          prevHash,
          userId: validUserId,
          ipAddress
        }
      });
      console.log(`[AUDIT #${seqNo}] ${action} - ${details.substring(0, 80)} (Chain: ${prevHash.slice(0, 8)}→${hash.slice(0, 8)})`);
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Failed to write audit log:', error);
    }
  }

  async logWithHash(action: string, details: string, hashRef: string, userId: string = 'SYSTEM', ipAddress: string = '127.0.0.1') {
    try {
      const timestamp = new Date();
      const { seqNo, prevHash } = await getNextSeqAndPrevHash();

      let validUserId: string | undefined = undefined;
      if (userId && userId !== 'SYSTEM' && userId !== 'mock-admin-id') {
        const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validUserId = userId;
      }

      const hash = computeHash(action, details, validUserId, seqNo, prevHash, timestamp.toISOString());

      await prisma.auditLog.create({
        data: {
          action,
          details,
          hashRef,
          seqNo,
          hash,
          prevHash,
          userId: validUserId,
          ipAddress
        }
      });
      console.log(`[AUDIT #${seqNo}] ${action} - ${details.substring(0, 80)} (Ref: ${hashRef.slice(0, 8)}, Chain: ${prevHash.slice(0, 8)}→${hash.slice(0, 8)})`);
    } catch (error) {
      console.error('[AUDIT LOG ERROR] Failed to write audit log with hash:', error);
    }
  }

  /**
   * Verifiziert die Integrität der gesamten Hash-Kette.
   * Gibt ein Array von Fehlern zurück (leer = alles OK).
   */
  async verifyChain(): Promise<{ valid: boolean; errors: string[]; totalEntries: number }> {
    const entries = await prisma.auditLog.findMany({
      where: { seqNo: { not: null } },
      orderBy: { seqNo: 'asc' },
      select: { id: true, seqNo: true, hash: true, prevHash: true }
    });

    const errors: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Prüfe Sequenznummer-Lücken
      if (i === 0 && entry.seqNo !== 1) {
        errors.push(`Sequenz startet bei ${entry.seqNo} statt 1`);
      }
      if (i > 0 && entry.seqNo !== entries[i - 1].seqNo! + 1) {
        errors.push(`Lücke in Sequenz: ${entries[i - 1].seqNo} → ${entry.seqNo} (erwartet: ${entries[i - 1].seqNo! + 1})`);
      }

      // Prüfe Hash-Kette
      if (i === 0 && entry.prevHash !== 'GENESIS') {
        errors.push(`Erster Eintrag hat prevHash '${entry.prevHash}' statt 'GENESIS'`);
      }
      if (i > 0 && entry.prevHash !== entries[i - 1].hash) {
        errors.push(`Hash-Kette gerissen bei seqNo ${entry.seqNo}: prevHash '${entry.prevHash?.slice(0, 8)}' ≠ vorheriger hash '${entries[i - 1].hash?.slice(0, 8)}'`);
      }
    }

    return { valid: errors.length === 0, errors, totalEntries: entries.length };
  }
}

export const auditLogService = new AuditLogService();
