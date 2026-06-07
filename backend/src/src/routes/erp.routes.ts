import { Router } from 'express';
import { syncInventory } from '../controllers/erp.controller';

const router = Router();

// Einfacher Key-Auth oder IP-Whitelisting kann in einer Middleware vorgeschaltet werden
// Für diesen Prototyp erlauben wir den Zugriff direkt (z.B. im internen Netz)
router.post('/sync', syncInventory);

export default router;
