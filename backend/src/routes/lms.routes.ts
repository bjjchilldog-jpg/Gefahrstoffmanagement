import { Router } from 'express';
import { getModules, createModule, updateModule, assignModule, getMyRecords, submitQuiz, webhookSubmit } from '../controllers/lms.controller';

const router = Router();

// Admin / Kurse
router.get('/modules', getModules);
router.post('/modules', createModule);
router.put('/modules/:id', updateModule);
router.post('/assign', assignModule);

// Employee / Records
router.get('/records/:employeeId', getMyRecords);
router.post('/records/:recordId/submit', submitQuiz);

// Webhook (MS Forms / Google Forms)
router.post('/webhook/:moduleId', webhookSubmit);

export default router;
