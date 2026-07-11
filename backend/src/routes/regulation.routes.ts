import { Router } from 'express';
import { createRegulation, getPendingRevisions, getHistoryRevisions, confirmRevisionTask } from '../controllers/regulation.controller';

const router = Router();

router.post('/', createRegulation);
router.get('/revisions/pending', getPendingRevisions);
router.get('/revisions/history', getHistoryRevisions);
router.post('/revisions/:id/confirm', confirmRevisionTask);

export default router;
