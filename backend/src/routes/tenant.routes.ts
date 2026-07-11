import { Router } from 'express';
import {
  getTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  createLocation,
  updateLocation,
  deleteLocation,
  createWorkArea,
  updateWorkArea,
  deleteWorkArea,
  cloneLocation,
  cloneWorkArea,
  moveWorkArea,
  createAsbestosFinding,
  updateAsbestosFinding,
  deleteAsbestosFinding
} from '../controllers/tenant.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/tenants is intentionally public - tree structure needed everywhere in the app
router.get('/', getTenants);
router.post('/', authenticateToken, createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);
router.post('/:tenantId/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

router.post('/locations/:locationId/clone', cloneLocation);
router.post('/work-areas/:id/clone', cloneWorkArea);
router.put('/work-areas/:id/move', moveWorkArea);

router.post('/locations/:locationId/work-areas', createWorkArea);
router.put('/work-areas/:id', updateWorkArea);
router.delete('/work-areas/:id', deleteWorkArea);

router.post('/locations/:locationId/asbestos', createAsbestosFinding);
router.put('/locations/asbestos/:findingId', updateAsbestosFinding);
router.delete('/locations/asbestos/:findingId', deleteAsbestosFinding);

export default router;
