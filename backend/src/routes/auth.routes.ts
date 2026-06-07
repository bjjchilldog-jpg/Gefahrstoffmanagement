import { Router } from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Prüfen, ob User existiert
    if (!user) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    // SICHERER VERGLEICH MIT BCRYPT
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Passwort falsch' });
    }

    // Token erstellen
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token });
  } catch (error) {
  console.error("DEBUG FEHLER:", error); // Das schreibt den echten Fehler in dein Backend-Terminal
  res.status(500).json({ error: 'Interner Serverfehler' });
}

});

export default router;