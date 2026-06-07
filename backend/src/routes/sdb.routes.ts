import { Router } from 'express';
import multer from 'multer';
import { parseSDB } from '../controllers/sdb.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse', upload.single('sdbFile'), parseSDB);

export default router;
