import { Router } from 'express';
import { exportDatabase, importDatabase, exportBundle, exportExcel, getGhsForSubstance, cloneSubstance, cloneLocation } from '../controllers/backup.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/export', exportDatabase);
router.post('/import', importDatabase);
router.get('/bundle', authenticateToken, exportBundle);
router.get('/excel', authenticateToken, exportExcel);

// GHS-Piktogramme (Modul 11)
router.get('/substances/:id/ghs', authenticateToken, getGhsForSubstance);

// Clone/Duplikat (Modul 15)
router.post('/substances/:id/clone', authenticateToken, cloneSubstance);
router.post('/locations/:locationId/clone', authenticateToken, cloneLocation);

export default router;
