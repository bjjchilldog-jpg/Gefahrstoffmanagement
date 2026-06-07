import { Router } from 'express';
import { getTenants, createTenant, createLocation, createWorkArea, cloneLocation } from '../controllers/tenant.controller';

const router = Router();

router.get('/', getTenants);
router.post('/', createTenant);
router.post('/:tenantId/locations', createLocation);
router.post('/locations/:locationId/clone', cloneLocation);
router.post('/locations/:locationId/work-areas', createWorkArea);

export default router;
