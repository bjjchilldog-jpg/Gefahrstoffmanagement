import { Router } from 'express';
import { getSubstances, getSingleSubstance, createSubstance, createMasterSubstance, updateSubstance, cloneSubstance, approveSubstance, deleteSubstance, deleteAllSubstances, bulkUpdatePersons, copySubstance } from '../controllers/substance.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { auditWrapper } from '../middleware/audit.middleware';

const router = Router();

// GET ist für alle angemeldeten User erlaubt
router.get('/', authenticateToken, getSubstances);
router.get('/inventory/:id', authenticateToken, getSingleSubstance);

// POST und PUT werden automatisch auditiert und sind für ADMIN, UNIT_LEADER und LOCATION_MANAGER
router.post('/master', createMasterSubstance);
router.post('/', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, createSubstance);
router.post('/copy', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, copySubstance);
router.post('/:id/clone', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, cloneSubstance);
router.post('/:id/approve', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, approveSubstance);
router.put('/workarea/:workAreaId/bulk-persons', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), bulkUpdatePersons);
router.put('/:id', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, updateSubstance);
router.delete('/:id', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, deleteSubstance);
router.delete('/', authenticateToken, requireRoles(['ADMIN', 'SAFETY_OFFICER', 'UNIT_LEADER', 'LOCATION_MANAGER']), auditWrapper, deleteAllSubstances);

export default router;