import { Router } from 'express';
import { createRegulation, getPendingRevisions, confirmRevisionTask } from '../controllers/regulation.controller';

const router = Router();

router.post('/regulations', createRegulation);
router.get('/revisions/pending', getPendingRevisions);
router.post('/revisions/:id/confirm', confirmRevisionTask);

export default router;
