import { Router } from 'express';
import multer from 'multer';
import { getDeadlines, searchSubstances, uploadDocument } from '../controllers/extension.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/deadlines', getDeadlines);
router.get('/search', searchSubstances);
router.post('/upload', upload.single('file'), uploadDocument);

export default router;
