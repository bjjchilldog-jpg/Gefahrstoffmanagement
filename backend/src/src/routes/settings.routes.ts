import { Router } from 'express';
import { getLegalSettings, updateLegalSettings } from '../controllers/settings.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { auditWrapper } from '../middleware/audit.middleware';

const router = Router();

router.get('/:tenantId', getLegalSettings);
router.put('/:tenantId', authenticateToken, requireRoles(['ADMIN']), auditWrapper, updateLegalSettings);

export default router;
