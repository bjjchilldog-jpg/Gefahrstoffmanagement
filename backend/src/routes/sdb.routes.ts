import { Router } from 'express';
import multer from 'multer';
import { parseSDB, batchParseSDB } from '../controllers/sdb.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Einzelne SDB parsen
router.post('/parse', upload.single('sdbFile'), parseSDB);

// Stapelupload: Mehrere SDBs parsen + Stoffe anlegen
router.post('/batch-parse', authenticateToken, upload.array('files', 50), batchParseSDB);

export default router;
