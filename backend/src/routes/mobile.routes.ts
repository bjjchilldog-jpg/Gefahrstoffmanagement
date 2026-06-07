import { Router } from 'express';
import { syncScans } from '../controllers/mobile.controller';

const router = Router();

router.post('/sync', syncScans);

export default router;
