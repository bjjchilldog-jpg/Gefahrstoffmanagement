import prisma from '../lib/prisma';

export class VorsorgeService {
  /**
   * Evaluates AMR 3.2 and ArbMedVV criteria for a specific WorkArea.
   * Generates or updates VorsorgeReports accordingly.
   */
  async checkWorkAreaVorsorge(workAreaId: string) {
    // 1. Lade den Arbeitsbereich mit allen zugehörigen Stoffen
    const workArea = await prisma.workArea.findUnique({
      where: { id: workAreaId },
      include: {
        hazardousSubstances: true,
      }
    });

    if (!workArea) return;

    // Wir sammeln alle Vorsorge-Gründe in einem Array, um sie am Ende abzugleichen
    const requiredReports: {
       hazardousSubstanceId?: string;
       type: 'Pflichtvorsorge' | 'Angebotsvorsorge';
       trigger: string;
    }[] = [];

    // 2. Feuchtarbeit (AMR 3.2 Kriterien) prüfen
    if (workArea.isFeuchtarbeit && workArea.dailyExposureHours) {
      if (workArea.dailyExposureHours > 4) {
        requiredReports.push({
          type: 'Pflichtvorsorge',
          trigger: `Feuchtarbeit > 4h/Tag (AMR 3.2) - Erfasst: ${workArea.dailyExposureHours}h`,
        });
      } else if (workArea.dailyExposureHours > 2) {
        requiredReports.push({
          type: 'Angebotsvorsorge',
          trigger: `Feuchtarbeit > 2h/Tag (AMR 3.2) - Erfasst: ${workArea.dailyExposureHours}h`,
        });
      }
    }

    // 3. Stoff-spezifische Kriterien prüfen (Krebserzeugend, Mutagen)
    for (const sub of workArea.hazardousSubstances) {
      if (sub.isKrebserzeugend || sub.isMutagen) {
        requiredReports.push({
          hazardousSubstanceId: sub.id,
          type: 'Pflichtvorsorge',
          trigger: `KMR-Stoff: ${sub.productName}`,
        });
      }
    }

    // 4. Datenbank aktualisieren
    // Wir löschen existierende 'Offene' Reports dieses Arbeitsbereichs und legen die aktuellen neu an.
    // Reports im Status 'Erledigt' bleiben erhalten als Historie.
    await prisma.vorsorgeReport.deleteMany({
      where: {
        workAreaId,
        status: 'Offen'
      }
    });

    if (requiredReports.length > 0) {
      const dataToInsert = requiredReports.map(req => ({
        workAreaId,
        hazardousSubstanceId: req.hazardousSubstanceId || null,
        type: req.type,
        trigger: req.trigger,
        status: 'Offen'
      }));

      await prisma.vorsorgeReport.createMany({
        data: dataToInsert
      });
    }

    console.log(`VorsorgeService: ${requiredReports.length} aktive Vorsorge-Anforderungen für Arbeitsbereich ${workAreaId} ermittelt.`);
  }
}

export const vorsorgeService = new VorsorgeService();
