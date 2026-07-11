import { sendAlertEmail } from './email.service';

export class NotificationService {
  /**
   * Sendet eine Alert-E-Mail über den echten SMTP-Kanal (DB → .env → Ethereal).
   * Fallback auf Console-Log falls keine E-Mail-Adressen vorhanden.
   */
  async sendAlert(subject: string, message: string, recipients: string[]) {
    if (!recipients || recipients.length === 0) return;

    // Console-Log als Backup/Debugging
    console.log(`\n[ALERT] 📧 ${subject} → ${recipients.join(', ')}`);

    // Echte E-Mails versenden
    for (const recipient of recipients) {
      // Nur echte E-Mail-Adressen versenden (nicht "SiFa: Herr Maier")
      if (recipient.includes('@')) {
        try {
          await sendAlertEmail(recipient, subject, message);
        } catch (err) {
          console.error(`[ALERT] ❌ Fehler beim Senden an ${recipient}:`, err);
        }
      } else {
        console.log(`[ALERT] ℹ️  Kein E-Mail-Versand für "${recipient}" (keine E-Mail-Adresse hinterlegt)`);
      }
    }
  }

  /**
   * Benachrichtigt SiFa und Betriebsarzt bei kritischen Stoffen (CMR, akut toxisch).
   */
  async notifyCriticalSubstance(substanceName: string, areaName: string, hierarchy: any, alertReason?: string) {
    const recipients: string[] = [];
    if (hierarchy.sifaEmail) recipients.push(hierarchy.sifaEmail);
    else if (hierarchy.sifaName) console.log(`[ALERT] ⚠️  SiFa "${hierarchy.sifaName}" hat keine E-Mail-Adresse hinterlegt.`);
    
    if (hierarchy.betriebsarztEmail) recipients.push(hierarchy.betriebsarztEmail);
    else if (hierarchy.betriebsarztName) console.log(`[ALERT] ⚠️  Betriebsarzt "${hierarchy.betriebsarztName}" hat keine E-Mail-Adresse hinterlegt.`);

    if (recipients.length > 0) {
      await this.sendAlert(
        `ALARM: ${substanceName} (${alertReason || 'Gefährlich'})`,
        `Der Stoff "${substanceName}" wurde im Bereich "${areaName}" angelegt oder aktualisiert.\n\nGrund für die Benachrichtigung: ${alertReason || 'Hochgefährlich'}.\n\nBitte prüfen Sie umgehend die getroffenen Schutzmaßnahmen!`,
        recipients
      );
    }
  }

  /**
   * Benachrichtigt bei kritischen Fristenabläufen (Revisionen, Unterweisungen).
   */
  async notifyDeadlineExpiring(title: string, details: string, recipientEmails: string[]) {
    await this.sendAlert(
      `Fristablauf: ${title}`,
      `${details}\n\nBitte handeln Sie umgehend, um die Compliance sicherzustellen.`,
      recipientEmails
    );
  }
}

export const notificationService = new NotificationService();
