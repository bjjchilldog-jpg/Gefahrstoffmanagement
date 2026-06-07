import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Start Migration: Alt-Gefahrstoffe zu Master/Inventory aufteilen...");

  const oldSubstances = await prisma.hazardousSubstance.findMany();
  console.log(`Gefunden: ${oldSubstances.length} alte Gefahrstoff-Einträge.`);

  for (const old of oldSubstances) {
    // 1. Prüfen ob es schon einen Master für diesen Stoffnamen gibt
    let master = await prisma.hazardousSubstanceMaster.findFirst({
      where: { productName: old.productName }
    });

    if (!master) {
      // 2. Erstelle Master
      master = await prisma.hazardousSubstanceMaster.create({
        data: {
          productName: old.productName,
          manufacturer: old.manufacturer,
          hPhrases: old.hPhrases,
          emkgRating: old.emkgRating,
          agwValue: old.agwValue,
          isKrebserzeugend: old.isKrebserzeugend,
          isMutagen: old.isMutagen,
          isReproduktionstoxisch: old.isReproduktionstoxisch,
          isMutterschutzRelevant: old.isMutterschutzRelevant,
          isJugendschutzRelevant: old.isJugendschutzRelevant,
          isAcuteToxic: old.isAcuteToxic
        }
      });
      console.log(`Master angelegt: ${master.productName}`);
    }

    // 3. Erstelle Inventory Link zur WorkArea
    await prisma.localSubstanceInventory.create({
      data: {
        workAreaId: old.workAreaId,
        masterSubstanceId: master.id,
        // Standard-Werte für lokale Eigenfelder
        annualAmount: 0,
        usageDescription: "Standard-Migration"
      }
    });
    console.log(`-> Lokales Inventory für WorkArea ${old.workAreaId} verknüpft.`);
  }

  console.log("Migration erfolgreich abgeschlossen. Teste die API und das Frontend.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
