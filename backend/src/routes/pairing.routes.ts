import { Router } from 'express';
import { createPairingSession, getPairingSession, updatePairingSession } from '../controllers/pairing.controller';

const router = Router();

router.post('/create', createPairingSession);
router.get('/:sessionId', getPairingSession);
router.post('/:sessionId', updatePairingSession);

export default router;
