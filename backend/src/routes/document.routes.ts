import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getDocuments, renameDocument } from '../controllers/document.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', getDocuments);
router.post('/upload', upload.single('file'), uploadDocument);
router.put('/:id/rename', renameDocument);

export default router;
