// backend/src/services/trgs510.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TRGS 510 Zusammenlagerungs-Matrix (Vereinfachtes, sicheres Modell für Kernklassen)
// '+' = Zusammenlagerung erlaubt
// '-' = Zusammenlagerung separat (getrennt) erforderlich
// 'E' = Einschränkungen (z.B. Mengenbegrenzung)
// Da dies eine essenzielle Warnfunktion ist, bewerten wir '-' und 'E' als Warnung.
const COMPATIBILITY_MATRIX: Record<string, Record<string, boolean>> = {
  // Klasse 2A: Entzündbare Gase
  '2A': { '2A': true, '2B': true, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': false, '8B': false, '10': false, '11': false, '12': false, '13': false },
  // Klasse 3: Entzündbare Flüssigkeiten
  '3': { '2A': false, '2B': false, '3': true, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': false, '6.1D': false, '6.2': false, '7': false, '8A': false, '8B': false, '10': false, '11': false, '12': false, '13': false },
  // Klasse 8A: Brennbare ätzende Stoffe
  '8A': { '2A': false, '2B': false, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': true, '8B': true, '10': true, '11': true, '12': true, '13': true },
  // Klasse 8B: Nicht brennbare ätzende Stoffe
  '8B': { '2A': false, '2B': false, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': true, '8B': true, '10': true, '11': true, '12': true, '13': true },
  // Klasse 10: Brennbare Flüssigkeiten
  '10': { '2A': false, '2B': false, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': true, '8B': true, '10': true, '11': true, '12': true, '13': true },
  // Klasse 11: Brennbare Feststoffe
  '11': { '2A': false, '2B': false, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': true, '8B': true, '10': true, '11': true, '12': true, '13': true },
  // Klasse 12: Nicht brennbare Flüssigkeiten
  '12': { '2A': false, '2B': false, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': true, '8B': true, '10': true, '11': true, '12': true, '13': true },
  // Klasse 13: Nicht brennbare Feststoffe
  '13': { '2A': false, '2B': false, '3': false, '4.1A': false, '4.1B': false, '4.2': false, '4.3': false, '5.1A': false, '5.1B': false, '5.2': false, '6.1A': false, '6.1B': false, '6.1C': true, '6.1D': true, '6.2': false, '7': false, '8A': true, '8B': true, '10': true, '11': true, '12': true, '13': true },
  
  // HINWEIS: Für den Prototyp haben wir die Matrix radikal gekürzt und fokussieren uns auf die Warnung bei hochkritischen Kombinationen
  // (z.B. LGK 3 Entzündbar vs. LGK 8 Ätzend).
};

export const checkTRGS510Compatibility = async (workAreaId: string, newStorageClass: string, newChemicalType?: string): Promise<{ isCompatible: boolean, conflicts: string[] }> => {
  const conflicts: string[] = [];
  
  // Hole alle Stoffe im selben Raum
  const existingInventories = await prisma.localSubstanceInventory.findMany({
    where: { workAreaId },
    include: { masterSubstance: true }
  });

  if (newStorageClass && COMPATIBILITY_MATRIX[newStorageClass]) {
    for (const inv of existingInventories) {
      const existingLGK = inv.masterSubstance.storageClass;
      if (existingLGK && COMPATIBILITY_MATRIX[existingLGK]) {
        // Prüfe, ob die Kombination laut Matrix erlaubt ist
        const isAllowed = COMPATIBILITY_MATRIX[newStorageClass]?.[existingLGK];
        if (isAllowed === false) {
          conflicts.push(`LGK ${newStorageClass} darf nach TRGS 510 nicht mit LGK ${existingLGK} ("${inv.masterSubstance.productName}") gelagert werden!`);
        }
      }
    }
  }

  // Säure-Laugen Prüfung (TRGS 510 Abschnitt 13.1.2)
  if (newChemicalType === 'SÄURE' || newChemicalType === 'LAUGE') {
    for (const inv of existingInventories) {
      const existingType = inv.masterSubstance.chemicalType;
      if (newChemicalType === 'SÄURE' && existingType === 'LAUGE') {
        conflicts.push(`LEBENSGEFAHR! Säuren dürfen nach TRGS 510 nicht mit Laugen ("${inv.masterSubstance.productName}") zusammen gelagert werden (Gefahr exothermer Reaktionen)!`);
      }
      if (newChemicalType === 'LAUGE' && existingType === 'SÄURE') {
        conflicts.push(`LEBENSGEFAHR! Laugen dürfen nach TRGS 510 nicht mit Säuren ("${inv.masterSubstance.productName}") zusammen gelagert werden (Gefahr exothermer Reaktionen)!`);
      }
    }
  }

// Lebensmittel, Futtermittel und Medikamente dürfen mit gar nichts zusammen gelagert werden
  if (newStorageClass === '10' && newChemicalType === 'LEBENSMITTEL') { // Behelfsmäßig
     // wird unten in spezieller Logik abgedeckt
  }

  // Erweiterte Lebensmittel & Futtermittel Prüfung (TRGS 510)
  if (newChemicalType === 'LEBENSMITTEL') {
    if (existingInventories.length > 0) {
      conflicts.push(`VERBOT! Lebensmittel/Futtermittel/Medikamente dürfen nach TRGS 510 nicht mit Gefahrstoffen zusammen gelagert werden!`);
    }
  } else {
    // Prüfen ob schon Lebensmittel im Raum sind
    const hasLebensmittel = existingInventories.some(inv => inv.masterSubstance.chemicalType === 'LEBENSMITTEL');
    if (hasLebensmittel) {
      conflicts.push(`VERBOT! Dieser Raum enthält Lebensmittel/Futtermittel. Gefahrstoffe dürfen hier nicht gelagert werden!`);
    }
  }

  // Spezifische Prüfungen für Explosive (LGK 1) und Radioaktive (LGK 7) Stoffe
  if (newStorageClass === '1' || newStorageClass === '7' || newStorageClass === '4.2' || newStorageClass === '5.1A') {
    if (existingInventories.length > 0) {
       conflicts.push(`STRIKTES VERBOT! LGK ${newStorageClass} (Explosiv/Radioaktiv/Selbstentzündlich/Stark oxidierend) unterliegt striktem Zusammenlagerungsverbot mit anderen Stoffen!`);
    }
  }

  const existingExtreme = existingInventories.find(inv => ['1', '7', '4.2', '5.1A'].includes(inv.masterSubstance.storageClass || ''));
  if (existingExtreme && !['1', '7', '4.2', '5.1A'].includes(newStorageClass)) {
     conflicts.push(`STRIKTES VERBOT! Raum enthält bereits LGK ${existingExtreme.masterSubstance.storageClass} ("${existingExtreme.masterSubstance.productName}"). Keine Zubelastung mit anderen Stoffen erlaubt!`);
  }

  // Eindeutige Konflikte filtern
  const uniqueConflicts = [...new Set(conflicts)];

  return {
    isCompatible: uniqueConflicts.length === 0,
    conflicts: uniqueConflicts
  };
};
