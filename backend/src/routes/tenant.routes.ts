import { Router } from 'express';
import { getTenants, createTenant, updateTenant, deleteTenant, createLocation, updateLocation, deleteLocation, createWorkArea, updateWorkArea, deleteWorkArea, cloneLocation } from '../controllers/tenant.controller';

const router = Router();

router.get('/', getTenants);
router.post('/', createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);
router.post('/:tenantId/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

router.post('/locations/:locationId/clone', cloneLocation);

router.post('/locations/:locationId/work-areas', createWorkArea);
router.put('/work-areas/:id', updateWorkArea);
router.delete('/work-areas/:id', deleteWorkArea);

export default router;
