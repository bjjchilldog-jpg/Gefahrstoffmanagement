import { Router } from 'express';
import multer from 'multer';
import { 
  getUsers, getPendingUsers, approveUser, suspendUser, 
  updateUserRole, updateUserLocations, importUsersFromCSV 
} from '../controllers/user.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Alle Routen erfordern ADMIN-Rolle
router.get('/', authenticateToken, requireRoles(['ADMIN']), getUsers);
router.get('/pending', authenticateToken, requireRoles(['ADMIN']), getPendingUsers);
router.post('/:id/approve', authenticateToken, requireRoles(['ADMIN']), approveUser);
router.post('/:id/suspend', authenticateToken, requireRoles(['ADMIN']), suspendUser);
router.put('/:id/role', authenticateToken, requireRoles(['ADMIN']), updateUserRole);
router.put('/:id/locations', authenticateToken, requireRoles(['ADMIN']), updateUserLocations);
router.post('/import', authenticateToken, requireRoles(['ADMIN']), upload.single('file'), importUsersFromCSV);

export default router;
