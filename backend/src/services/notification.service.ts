export class NotificationService {
  async sendAlert(subject: string, message: string, recipients: string[]) {
    if (!recipients || recipients.length === 0) return;
    
    // In einer echten Umgebung: nodemailer
    // Für dieses lokale System simulieren wir den E-Mail-Versand im Terminal
    console.log("\n==================================================");
    console.log("📧 E-MAIL ALARM WIRD GESENDET");
    console.log("An:", recipients.join(', '));
    console.log("Betreff:", subject);
    console.log("Nachricht:");
    console.log(message);
    console.log("==================================================\n");
  }

  async notifyCriticalSubstance(substanceName: string, areaName: string, hierarchy: any, alertReason?: string) {
    const recipients = [];
    if (hierarchy.sifaName) recipients.push(`SiFa: ${hierarchy.sifaName}`);
    if (hierarchy.betriebsarztName) recipients.push(`Betriebsarzt/Ärztin: ${hierarchy.betriebsarztName}`);

    if (recipients.length > 0) {
      await this.sendAlert(
        `🚨 ALARM: ${substanceName} (${alertReason || 'Gefährlich'})`,
        `Der Stoff "${substanceName}" wurde im Bereich "${areaName}" angelegt oder aktualisiert.\nGrund für die Benachrichtigung: ${alertReason || 'Hochgefährlich'}.\nBitte prüfen Sie umgehend die getroffenen Schutzmaßnahmen!`,
        recipients
      );
    }
  }
}

export const notificationService = new NotificationService();
