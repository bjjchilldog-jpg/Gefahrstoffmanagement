import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware'; 
import { prisma } from '../lib/prisma';

const router = Router();

// Test: Wir lassen die Middleware kurz weg, um zu sehen, ob der Server dann startet
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Fehler' });
  }
});

export default router;