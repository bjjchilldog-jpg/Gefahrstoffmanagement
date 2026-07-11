import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Importiere deine Routen
import tenantRoutes from './routes/tenant.routes';
import substanceRoutes from './routes/substance.routes';
import documentRoutes from './routes/document.routes';
import exportRoutes from './routes/export.routes';
import regulationRoutes from './routes/regulation.routes';
import videoRoutes from './routes/video.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import erpRoutes from './routes/erp.routes';
import settingsRoutes from './routes/settings.routes';
import matrixRoutes from './routes/matrix.routes';
import employeeRoutes from './routes/employee.routes';
import backupRoutes from './routes/backup.routes';
import sdbRoutes from './routes/sdb.routes';
import lmsRoutes from './routes/lms.routes';
import extensionRoutes from './routes/extension.routes';
import mobileRoutes from './routes/mobile.routes';
import userRoutes from './routes/user.routes';
import profileRoutes from './routes/profile.routes';
import pairingRoutes from './routes/pairing.routes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (muss VOR den Routen stehen!)
app.use(cors()); // Erlaubt Anfragen vom Frontend
app.use(express.json({ limit: '50mb' })); // Erlaubt das Parsen von JSON-Body (wichtig für Login!)
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Erstelle uploads Ordner falls nicht existent
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Konfiguration für Dateiuploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max

// Statische Dateien servieren (für hochgeladene Bilder/Videos)
app.use('/uploads', express.static(uploadDir));

// Neuer Upload-Endpunkt
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname, size: req.file.size });
});

// Routes
app.use('/api/auth', authRoutes); // Hier ist jetzt der korrekte Platz
app.use('/api/tenants', tenantRoutes);
app.use('/api/substances', substanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/regulations', regulationRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/sdb', sdbRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/extension', extensionRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/pairing', pairingRoutes);

// Health Check und Fallback Route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Freundliche Status-Seite für Port 3000
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: system-ui, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center;">
          <h1 style="color: #0f172a; margin-top: 0;">Gefahrstoff-Management API</h1>
          <p style="color: #64748b; font-size: 1.1rem;">Der Backend-Server ist aktiv und läuft fehlerfrei.</p>
          <div style="margin-top: 2rem; padding: 1rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
            <p style="color: #1e3a8a; margin: 0; font-weight: 500;">Bitte öffnen Sie die Benutzeroberfläche unter:</p>
            <a href="http://localhost:5173" style="display: block; margin-top: 0.5rem; color: #2563eb; font-weight: bold; font-size: 1.25rem;">http://localhost:5173</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

import { startCronJobs } from './services/cron.service';

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startCronJobs();
});