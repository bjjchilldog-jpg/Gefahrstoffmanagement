import { Router } from 'express';
import { 
  getProfiles, 
  createProfile, 
  updateProfile, 
  deleteProfile, 
  addProfileItem, 
  removeProfileItem, 
  applyProfile,
  exportProfile,
  importProfile
} from '../controllers/profile.controller';

const router = Router();

router.get('/', getProfiles);
router.post('/', createProfile);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);

router.get('/:id/export', exportProfile);
router.post('/import', importProfile);

router.post('/:id/items', addProfileItem);
router.delete('/items/:itemId', removeProfileItem);

router.post('/:id/apply', applyProfile);

export default router;
