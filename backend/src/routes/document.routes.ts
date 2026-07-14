import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getDocuments, renameDocument, deleteDocument, downloadDocument } from '../controllers/document.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', authenticateToken, getDocuments);
router.get('/:id/download', authenticateToken, downloadDocument);
router.post('/upload', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'LOCATION_MANAGER', 'UNIT_LEADER']), upload.single('file'), uploadDocument);
router.put('/:id/rename', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'LOCATION_MANAGER', 'UNIT_LEADER']), renameDocument);
router.delete('/:id', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'LOCATION_MANAGER', 'UNIT_LEADER']), deleteDocument);

export default router;
