import nodemailer from 'nodemailer';
import crypto from 'crypto';
import prisma from '../lib/prisma';

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigHash: string | null = null;
let isEtherealMode = false;

// Einfache Verschlüsselung für SMTP-Passwörter in der DB
const CIPHER_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'super_secret_key').digest();
const IV_LENGTH = 16;

export function encryptPassword(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptPassword(text: string): string {
  try {
    const [ivHex, encrypted] = text.split(':');
    if (!ivHex || !encrypted) return text; // Fallback: unverschlüsselt
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text; // Fallback wenn Entschlüsselung fehlschlägt
  }
}

/**
 * Lädt SMTP-Config aus der DB und erstellt/cached den Transporter.
 * Priorität: DB-Config > .env-Config > Ethereal-Fallback
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  // 1. Versuche DB-Config
  try {
    const settings = await prisma.legalSettings.findFirst({
      where: { smtpHost: { not: null } },
      select: { smtpHost: true, smtpPort: true, smtpSecure: true, smtpUser: true, smtpPass: true, smtpFrom: true }
    });

    if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPass) {
      const configHash = crypto.createHash('md5').update(
        `${settings.smtpHost}:${settings.smtpPort}:${settings.smtpUser}`
      ).digest('hex');

      if (cachedTransporter && cachedConfigHash === configHash) {
        return cachedTransporter;
      }

      const decryptedPass = decryptPassword(settings.smtpPass);
      cachedTransporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: settings.smtpSecure || false,
        auth: { user: settings.smtpUser, pass: decryptedPass }
      });
      cachedConfigHash = configHash;
      isEtherealMode = false;
      console.log(`[EMAIL] SMTP aus DB: ${settings.smtpHost}:${settings.smtpPort || 587}`);
      return cachedTransporter;
    }
  } catch (e) {
    // DB nicht verfügbar — weiter mit .env
  }

  // 2. Versuche .env-Config
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    if (cachedTransporter && !isEtherealMode) return cachedTransporter;
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: (SMTP_PORT || '587') === '465',
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    isEtherealMode = false;
    console.log(`[EMAIL] SMTP aus .env: ${SMTP_HOST}:${SMTP_PORT || 587}`);
    return cachedTransporter;
  }

  // 3. Ethereal Fallback
  if (cachedTransporter && isEtherealMode) return cachedTransporter;
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
  isEtherealMode = true;
  console.log('[EMAIL] ⚠️  Kein SMTP konfiguriert — Ethereal-Testmodus aktiv.');
  return cachedTransporter;
}

async function getFromAddress(): Promise<string> {
  try {
    const settings = await prisma.legalSettings.findFirst({
      where: { smtpFrom: { not: null } },
      select: { smtpFrom: true }
    });
    if (settings?.smtpFrom) return settings.smtpFrom;
  } catch {}
  return process.env.SMTP_FROM || '"Gefahrstoffmanagement" <noreply@gefahrstoff.local>';
}

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    const transport = await getTransporter();
    const from = await getFromAddress();
    const info = await transport.sendMail({ from, to, subject, html });

    if (isEtherealMode) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EMAIL] ✉️  Ethereal-Vorschau: ${previewUrl}`);
    } else {
      console.log(`[EMAIL] ✉️  Gesendet an ${to}: ${subject}`);
    }
  } catch (error) {
    console.error(`[EMAIL] ❌ Fehler beim Senden an ${to}:`, error);
  }
}

/**
 * Cache invalidieren — wird aufgerufen wenn Admin SMTP-Settings ändert.
 */
export function invalidateSmtpCache(): void {
  cachedTransporter = null;
  cachedConfigHash = null;
  isEtherealMode = false;
  console.log('[EMAIL] SMTP-Cache invalidiert — nächster Versand nutzt neue Config.');
}

/**
 * Test-E-Mail senden — für die SMTP-Konfiguration im Admin-Panel.
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string; etherealUrl?: string }> {
  try {
    invalidateSmtpCache(); // Frische Config laden
    const transport = await getTransporter();
    const from = await getFromAddress();
    const info = await transport.sendMail({
      from, to,
      subject: '✅ SMTP-Test — Gefahrstoffmanagement',
      html: `<div style="font-family: system-ui; padding: 2rem; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0f172a;">SMTP-Verbindung erfolgreich</h2>
        <p>Diese Test-E-Mail bestätigt, dass der E-Mail-Versand korrekt konfiguriert ist.</p>
        <p style="color: #64748b; font-size: 0.85rem; margin-top: 2rem;">Gefahrstoffmanagement-System</p>
      </div>`
    });
    const etherealUrl = isEtherealMode ? (nodemailer.getTestMessageUrl(info) as string) : undefined;
    return { success: true, etherealUrl };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unbekannter Fehler' };
  }
}

// ==========================================
// E-Mail-Templates
// ==========================================

export async function sendRegistrationPending(to: string, firstName: string): Promise<void> {
  await sendMail(to, 'Registrierung eingegangen – Gefahrstoffmanagement', `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #0f172a;">Registrierung eingegangen</h2>
      <p>Hallo ${firstName || 'Nutzer'},</p>
      <p>Ihre Registrierung wurde erfolgreich entgegengenommen. Ihr Account wird in Kürze von einem Administrator geprüft und freigeschaltet.</p>
      <p>Sie erhalten eine weitere E-Mail, sobald Ihr Zugang aktiviert wurde.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />
      <p style="color: #94a3b8; font-size: 0.85rem;">Gefahrstoffmanagement-System</p>
    </div>
  `);
}

export async function sendAdminNewRegistration(adminEmail: string, newUserEmail: string, newUserName: string): Promise<void> {
  await sendMail(adminEmail, `Neue Registrierung: ${newUserName} – Freigabe erforderlich`, `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #0f172a;">🔔 Neue Registrierung</h2>
      <p>Ein neuer Benutzer hat sich registriert und wartet auf Freigabe:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.5rem; color: #64748b;">Name:</td><td style="padding: 0.5rem; font-weight: bold;">${newUserName}</td></tr>
        <tr><td style="padding: 0.5rem; color: #64748b;">E-Mail:</td><td style="padding: 0.5rem; font-weight: bold;">${newUserEmail}</td></tr>
      </table>
      <a href="${APP_URL}/settings" style="display: inline-block; background: #0f172a; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">Im Admin-Dashboard prüfen</a>
    </div>
  `);
}

export async function sendAccountApproved(to: string, firstName: string, role: string): Promise<void> {
  await sendMail(to, 'Ihr Zugang wurde freigeschaltet – Gefahrstoffmanagement', `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #0f172a;">✅ Zugang freigeschaltet</h2>
      <p>Hallo ${firstName || 'Nutzer'},</p>
      <p>Ihr Account wurde freigeschaltet. Sie können sich ab sofort anmelden.</p>
      <p><strong>Zugewiesene Rolle:</strong> ${role}</p>
      <a href="${APP_URL}/login" style="display: inline-block; background: #0f172a; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 1rem;">Jetzt anmelden</a>
    </div>
  `);
}

export async function sendPasswordResetLink(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  await sendMail(to, 'Passwort zurücksetzen – Gefahrstoffmanagement', `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #0f172a;">Passwort zurücksetzen</h2>
      <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 1rem 0;">Neues Passwort setzen</a>
      <p style="color: #ef4444; font-size: 0.9rem;">⏱️ Dieser Link ist <strong>1 Stunde</strong> gültig und kann nur einmal verwendet werden.</p>
      <p style="color: #94a3b8; font-size: 0.85rem;">Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
    </div>
  `);
}

/**
 * Generische Alert-E-Mail — wird vom NotificationService für kritische Stoffe, Fristenalarme etc. genutzt.
 */
export async function sendAlertEmail(to: string, subject: string, message: string): Promise<void> {
  await sendMail(to, subject, `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #dc2626;">🚨 ${subject}</h2>
      <div style="white-space: pre-line; line-height: 1.6;">${message}</div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />
      <p style="color: #94a3b8; font-size: 0.85rem;">Gefahrstoffmanagement-System — Automatische Benachrichtigung</p>
    </div>
  `);
}

export async function sendManufacturerSdbRequest(to: string, subject: string, substances: { productName: string, sdbDate: Date | null, nextReviewDate: Date | null, articleInfo?: string }[]): Promise<void> {
  const substanceRows = substances.map(s => {
    const sdbDateStr = s.sdbDate ? s.sdbDate.toLocaleDateString('de-DE') : 'Unbekannt';
    const nextReviewDateStr = s.nextReviewDate ? s.nextReviewDate.toLocaleDateString('de-DE') : 'Unbekannt';
    const articleStr = s.articleInfo ? `<br><small style="color: #64748b;">${s.articleInfo}</small>` : '';
    return `<tr>
      <td style="padding: 0.5rem; border: 1px solid #e2e8f0;">${s.productName}${articleStr}</td>
      <td style="padding: 0.5rem; border: 1px solid #e2e8f0;">${sdbDateStr}</td>
      <td style="padding: 0.5rem; border: 1px solid #e2e8f0; color: #dc2626;">${nextReviewDateStr}</td>
    </tr>`;
  }).join('');

  await sendMail(to, subject, `
    <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #0f172a;">Aktualisierung von Sicherheitsdatenblättern angefordert</h2>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>für die folgenden Produkte aus Ihrem Hause läuft in Kürze unsere interne Überprüfungsfrist für das Sicherheitsdatenblatt ab. Wir bitten Sie hiermit, uns die aktuellen Sicherheitsdatenblätter (SDB) für diese Produkte zukommen zu lassen.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;">
        <thead>
          <tr style="background-color: #f8fafc; text-align: left;">
            <th style="padding: 0.5rem; border: 1px solid #e2e8f0;">Produkt (Artikelnummer etc.)</th>
            <th style="padding: 0.5rem; border: 1px solid #e2e8f0;">Aktuelles SDB-Datum</th>
            <th style="padding: 0.5rem; border: 1px solid #e2e8f0;">Fristablauf bei uns</th>
          </tr>
        </thead>
        <tbody>
          ${substanceRows}
        </tbody>
      </table>
      
      <p>Bitte antworten Sie auf diese E-Mail mit den entsprechenden PDF-Dokumenten im Anhang. Nutzen Sie dabei gerne das Ticket im Betreff dieser Mail für die Zuordnung.</p>
      <p>Vielen Dank für Ihre Unterstützung.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />
      <p style="color: #94a3b8; font-size: 0.85rem;">Gefahrstoffmanagement-System</p>
    </div>
  `);
}
