import { Router } from 'express';
import { exportExcel, exportCsv, exportFireDeptData } from '../controllers/export.controller';

const router = Router();

router.post('/excel', exportExcel);
router.post('/csv', exportCsv);
router.get('/excel', exportExcel);
router.get('/csv', exportCsv);
router.get('/fire-dept', exportFireDeptData);

export default router;
