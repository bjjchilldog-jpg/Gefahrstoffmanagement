import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, addExposure, removeExposure, cloneExposures } from '../controllers/employee.controller';

const router = Router();

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

router.post('/:id/exposures', addExposure);
router.delete('/:id/exposures/:exposureId', removeExposure);

router.post('/clone', cloneExposures);

export default router;
