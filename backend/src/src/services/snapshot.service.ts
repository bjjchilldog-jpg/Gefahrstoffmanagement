import prisma from '../lib/prisma';
import crypto from 'crypto';
import { auditLogService } from './auditLog.service';

export class SnapshotService {
  async createSnapshot(workAreaId: string, reason: string, userId: string = 'SYSTEM', ipAddress: string = '127.0.0.1') {
    const workArea = await prisma.workArea.findUnique({
      where: { id: workAreaId },
      include: {
        inventories: {
          include: { masterSubstance: true }
        },
        biologicalSubstances: true,
        location: true,
        vorsorgeReports: true
      }
    });

    if (!workArea) return;

    const snapshotData = JSON.stringify(workArea);
    const snapshotHash = crypto.createHash('sha256').update(snapshotData).digest('hex');

    const snapshot = await prisma.gbuSnapshot.create({
      data: {
        workAreaId,
        snapshotData,
        snapshotHash,
        reason
      }
    });

    await auditLogService.logWithHash('SNAPSHOT_CREATED', `GBU Snapshot für Bereich ${workArea.name} aufgrund von: ${reason}`, snapshotHash, userId, ipAddress);
    
    return snapshot;
  }
}

export const snapshotService = new SnapshotService();
