import { Router } from 'express';
import { getSubstances, createSubstance, updateSubstance, cloneSubstance, approveSubstance, deleteSubstance, bulkUpdatePersons } from '../controllers/substance.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { auditWrapper } from '../middleware/audit.middleware';

const router = Router();

// GET ist für alle angemeldeten User erlaubt
router.get('/', authenticateToken, getSubstances);

// POST und PUT werden automatisch auditiert und sind für ADMIN und UNIT_LEADER
router.post('/', authenticateToken, requireRoles(['ADMIN', 'UNIT_LEADER']), auditWrapper, createSubstance);
router.post('/:id/clone', authenticateToken, requireRoles(['ADMIN', 'UNIT_LEADER']), auditWrapper, cloneSubstance);
router.post('/:id/approve', authenticateToken, requireRoles(['ADMIN', 'UNIT_LEADER']), auditWrapper, approveSubstance);
router.put('/workarea/:workAreaId/bulk-persons', authenticateToken, requireRoles(['ADMIN', 'UNIT_LEADER']), bulkUpdatePersons);
router.put('/:id', authenticateToken, requireRoles(['ADMIN', 'UNIT_LEADER']), auditWrapper, updateSubstance);
router.delete('/:id', authenticateToken, requireRoles(['ADMIN', 'UNIT_LEADER']), auditWrapper, deleteSubstance);

export default router;