import { Request, Response } from 'express';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { auditLogService } from '../services/auditLog.service';

export const uploadVideo = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Video hochgeladen' });
    }

    const { workAreaId, tenantId, locationId, docType } = req.body;
    const inputPath = req.file.path;
    const outputFilename = `compressed-${Date.now()}.mp4`;
    const outputPath = path.join('uploads', outputFilename);

    // FFmpeg Kompressions-Pipeline: 480p, H.264, max. 30 Sekunden
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-crf 28', // Gute Kompression
        '-preset fast',
        '-c:a aac',
        '-b:a 128k',
        '-t 30', // Max 30 Sekunden
        '-vf scale=-2:480' // Skaliere auf 480p
      ])
      .save(outputPath)
      .on('end', async () => {
        // Original löschen
        fs.unlinkSync(inputPath);

        // Document in DB anlegen
        const document = await prisma.document.create({
          data: {
            originalName: req.file!.originalname,
            filename: outputFilename,
            path: outputPath,
            mimeType: 'video/mp4',
            docType: docType || 'VIDEO',
            workAreaId: workAreaId || null,
            tenantId: tenantId || null,
            locationId: locationId || null
          }
        });

        await auditLogService.log('VIDEO_COMPRESSED', `Video ${document.originalName} erfolgreich komprimiert und in Anlage ${document.id} gespeichert.`);
        res.status(201).json(document);
      })
      .on('error', (err) => {
        console.error('FFmpeg Error:', err);
        fs.unlinkSync(inputPath);
        res.status(500).json({ error: 'Fehler bei der Video-Kompression' });
      });

  } catch (error) {
    console.error('Video Upload Error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
