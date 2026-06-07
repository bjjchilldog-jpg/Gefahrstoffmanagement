import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, mimetype } = req.file;
    const { docType, tenantId, locationId, workAreaId } = req.body;

    let finalPath = filePath;
    let finalFilename = filename;
    let isVideo = mimetype.startsWith('video/');

    // Video Compression Pipeline (Async)
    if (isVideo) {
      const compressedPath = filePath + '_compressed.mp4';
      ffmpeg(filePath)
        .outputOptions(['-c:v libx264', '-crf 28', '-preset fast', '-c:a aac', '-b:a 128k', '-t 30'])
        .save(compressedPath)
        .on('end', async () => {
          // Replace original with compressed
          fs.unlinkSync(filePath);
          fs.renameSync(compressedPath, filePath);
          console.log('Video compression finished for:', filename);
        })
        .on('error', (err) => {
          console.error('Video compression error:', err);
        });
    }

    const document = await prisma.document.create({
      data: {
        originalName: originalname,
        filename: finalFilename,
        path: finalPath,
        mimeType: mimetype,
        docType: docType || (isVideo ? 'VIDEO' : 'PDF_SDB'),
        tenantId: tenantId || null,
        locationId: locationId || null,
        workAreaId: workAreaId || null,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { tenantId, locationId, workAreaId } = req.query;
    
    const documents = await prisma.document.findMany({
      where: {
        tenantId: tenantId as string || undefined,
        locationId: locationId as string || undefined,
        workAreaId: workAreaId as string || undefined,
      }
    });
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const renameDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Physical renaming on disk logic
    const oldPath = document.path;
    const newFilename = `${Date.now()}_${newName}`;
    const newPath = path.join(path.dirname(oldPath), newFilename);
    
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { 
        originalName: newName,
        filename: newFilename,
        path: newPath
      },
    });

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename document' });
  }
};
