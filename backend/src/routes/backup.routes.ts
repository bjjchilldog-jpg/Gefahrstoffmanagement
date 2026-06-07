import { Router } from 'express';
import { exportDatabase, importDatabase } from '../controllers/backup.controller';

const router = Router();

router.get('/export', exportDatabase);
router.post('/import', importDatabase);

export default router;
