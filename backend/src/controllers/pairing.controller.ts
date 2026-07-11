import { Request, Response } from 'express';

interface PairingSession {
  status: 'waiting' | 'done';
  data?: any;
  createdAt: number;
}

// In-Memory Store for Pairing Sessions
const pairingSessions = new Map<string, PairingSession>();

// Bereinige alte Sessions alle paar Minuten, um Speicherlecks zu vermeiden
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of pairingSessions.entries()) {
    // Wenn älter als 30 Minuten, löschen
    if (now - session.createdAt > 30 * 60 * 1000) {
      pairingSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

export const createPairingSession = async (req: Request, res: Response) => {
  const sessionId = Math.random().toString(36).substring(2, 10);
  pairingSessions.set(sessionId, { status: 'waiting', createdAt: Date.now() });
  res.json({ sessionId });
};

export const getPairingSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = pairingSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session nicht gefunden oder abgelaufen.' });
  }
  res.json(session);
};

export const updatePairingSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { data } = req.body;
  
  const session = pairingSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session nicht gefunden oder abgelaufen.' });
  }
  
  session.status = 'done';
  session.data = data;
  pairingSessions.set(sessionId, session);
  
  res.json({ success: true });
};
