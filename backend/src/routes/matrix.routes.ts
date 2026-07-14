import { Router } from 'express';
import { getMatrix, assignMatrix, reverseSearch } from '../controllers/matrix.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { auditWrapper } from '../middleware/audit.middleware';

const router = Router();

router.get('/', authenticateToken, getMatrix);
router.get('/reverse', authenticateToken, reverseSearch);
router.post('/assign', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER']), auditWrapper, assignMatrix);

export default router;
