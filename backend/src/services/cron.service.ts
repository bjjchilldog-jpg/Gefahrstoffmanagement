import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendManufacturerSdbRequest } from './email.service';

/**
 * Täglicher Job, der prüft, welche SDBs abgelaufen/bald fällig sind
 * und ob der Haken `autoMailToManufacturer` gesetzt ist.
 * Gruppiert nach manufacturerEmail, um Sammelmails zu schicken.
 */
export function startCronJobs() {
  // Läuft jeden Tag um 08:00 Uhr
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Starte Überprüfung auf ausstehende SDB-Aktualisierungen...');
    try {
      await processSdbMailRequests();
    } catch (error) {
      console.error('[CRON] Fehler beim Ausführen des SDB-Mail-Jobs:', error);
    }
  });
  console.log('[CRON] SDB-Erinnerungs-Job registriert (Täglich um 08:00).');
}

export async function processSdbMailRequests() {
  const now = new Date();
  
  // 1. Hole alle Stoffe, bei denen der Auto-Mail Haken sitzt und eine E-Mail vorliegt
  const masterSubstances = await prisma.hazardousSubstanceMaster.findMany({
    where: {
      autoMailToManufacturer: true,
      manufacturerEmail: { not: null, notIn: [""] },
      nextReviewDate: { not: null }
    },
    include: {
      inventories: true
    }
  });

  if (masterSubstances.length === 0) return;

  // 2. Filtern und Gruppieren
  const toSend = new Map<string, typeof masterSubstances>();
  
  for (const sub of masterSubstances) {
    if (!sub.nextReviewDate || !sub.manufacturerEmail) continue;

    const reviewDate = new Date(sub.nextReviewDate);
    const timeDiffDays = (reviewDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    
    // Prüfen, ob der Schwellenwert erreicht ist (z.B. in <= 30 Tagen)
    if (timeDiffDays <= sub.autoMailAdvanceDays) {
      
      // Prüfen, ob wir in den letzten 6 Monaten (180 Tagen) schon angefragt haben
      if (sub.lastManufacturerMailDate) {
        const lastMailDays = (now.getTime() - new Date(sub.lastManufacturerMailDate).getTime()) / (1000 * 3600 * 24);
        if (lastMailDays < 180) {
          continue; // Bereits vor Kurzem benachrichtigt
        }
      }

      // Extract custom fields from the first available inventory for article info (EAN, SAP, etc.)
      let articleInfo = '';
      if (sub.inventories && sub.inventories.length > 0 && sub.inventories[0].customFields) {
        try {
          const cf = JSON.parse(sub.inventories[0].customFields);
          const excludeKeys = ['amountClass', 'protectionLevel', 'dustType', 'hasExtraction', 'gasType', 'gasSecured', 'gasBelowGround'];
          const extraInfos: string[] = [];
          for (const [key, value] of Object.entries(cf)) {
            if (!excludeKeys.includes(key) && value) {
               extraInfos.push(`${key}: ${value}`);
            }
          }
          if (extraInfos.length > 0) {
            articleInfo = extraInfos.join(' | ');
          }
        } catch (e) {
          console.error('[CRON] Fehler beim Parsen der customFields', e);
        }
      }
      (sub as any).articleInfo = articleInfo;

      // Zur Mail-Gruppe hinzufügen
      const email = sub.manufacturerEmail.trim();
      if (!toSend.has(email)) {
        toSend.set(email, []);
      }
      toSend.get(email)!.push(sub);
    }
  }

  if (toSend.size === 0) {
    console.log('[CRON] Keine neuen SDB-Anfragen fällig.');
    return;
  }

  // 3. Sammelmails versenden
  for (const [email, substances] of toSend.entries()) {
    try {
      console.log(`[CRON] Sende SDB-Sammelmail an ${email} für ${substances.length} Stoff(e)...`);
      
      const manufacturerName = substances[0].manufacturer || 'Hersteller';
      const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
      const subject = `[SDB-Request-${manufacturerName}-${now.getFullYear()}-${monthStr}] Bitte um aktuelle Sicherheitsdatenblätter`;

      await sendManufacturerSdbRequest(email, subject, substances as any);
      
      // 4. lastManufacturerMailDate aktualisieren
      const ids = substances.map(s => s.id);
      await prisma.hazardousSubstanceMaster.updateMany({
        where: { id: { in: ids } },
        data: { lastManufacturerMailDate: new Date() }
      });
      console.log(`[CRON] Mail an ${email} versendet und DB aktualisiert.`);
    } catch (err) {
      console.error(`[CRON] Fehler beim Senden an ${email}:`, err);
    }
  }
}
