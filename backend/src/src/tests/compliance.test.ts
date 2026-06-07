import { expect, describe, it } from '@jest/globals';

// Dummy-Interfaces für den Test (repräsentiert unsere Prisma-Struktur)
interface MasterSubstance {
  productName: string;
  isKrebserzeugend: boolean;
  isMutagen: boolean;
  isReproduktionstoxisch: boolean;
  isMutterschutzRelevant: boolean;
  isJugendschutzRelevant: boolean;
  isAcuteToxic: boolean;
  hPhrases: string;
}

interface LocalInventory {
  annualAmount: number;
  maxStorageAmount: number | null;
  masterSubstance: MasterSubstance;
}

interface WorkAreaInfo {
  dustExposureType: string | null;
  gasType: string | null;
}

// Business Logik (ähnlich wie im Frontend SubstanceList.tsx und künftigen Backend-Checks)
const checkCompliance = (inventory: LocalInventory, area: WorkAreaInfo) => {
  const ms = inventory.masterSubstance;
  const warnings: string[] = [];

  // TRGS 510
  if (inventory.maxStorageAmount && inventory.annualAmount > inventory.maxStorageAmount) {
    warnings.push('TRGS_510_LIMIT_EXCEEDED');
  }

  // Beschäftigungsverbote (MuSchG / JArbSchG)
  if (ms.isMutterschutzRelevant || ms.isJugendschutzRelevant) {
    warnings.push('EMPLOYMENT_BAN');
  }

  // ArbMedVV (Pflichtvorsorge)
  if (ms.isKrebserzeugend || ms.isMutagen || ms.isReproduktionstoxisch) {
    warnings.push('MANDATORY_HEALTH_CHECK');
  }

  // BetrSichV (Ex-Schutz)
  if (area.gasType === 'Brennbar') {
    warnings.push('EXPLOSION_HAZARD');
  }

  return warnings;
};

describe('Juristische Compliance & Grenzwertprüfungen', () => {
  it('sollte TRGS 510 Lagerüberschreitungen erkennen', () => {
    const inv: LocalInventory = {
      annualAmount: 500,
      maxStorageAmount: 200,
      masterSubstance: {
        productName: 'Test Stoff',
        isKrebserzeugend: false,
        isMutagen: false,
        isReproduktionstoxisch: false,
        isMutterschutzRelevant: false,
        isJugendschutzRelevant: false,
        isAcuteToxic: false,
        hPhrases: 'H225'
      }
    };
    const warnings = checkCompliance(inv, { dustExposureType: null, gasType: null });
    expect(warnings).toContain('TRGS_510_LIMIT_EXCEEDED');
  });

  it('sollte Pflichtvorsorge (ArbMedVV) bei CMR-Stoffen auslösen', () => {
    const inv: LocalInventory = {
      annualAmount: 10,
      maxStorageAmount: 50,
      masterSubstance: {
        productName: 'Giftiger Stoff',
        isKrebserzeugend: true, // Löst ArbMedVV aus
        isMutagen: false,
        isReproduktionstoxisch: false,
        isMutterschutzRelevant: true,
        isJugendschutzRelevant: false,
        isAcuteToxic: false,
        hPhrases: 'H350'
      }
    };
    const warnings = checkCompliance(inv, { dustExposureType: null, gasType: null });
    expect(warnings).toContain('MANDATORY_HEALTH_CHECK');
    expect(warnings).toContain('EMPLOYMENT_BAN');
    expect(warnings).not.toContain('TRGS_510_LIMIT_EXCEEDED');
  });

  it('sollte Explosionsgefahr (BetrSichV) erkennen, wenn Gas Typ Brennbar ist', () => {
    const inv: LocalInventory = {
      annualAmount: 50,
      maxStorageAmount: 100,
      masterSubstance: {
        productName: 'Harmloser Stoff im Ex-Bereich',
        isKrebserzeugend: false,
        isMutagen: false,
        isReproduktionstoxisch: false,
        isMutterschutzRelevant: false,
        isJugendschutzRelevant: false,
        isAcuteToxic: false,
        hPhrases: ''
      }
    };
    const warnings = checkCompliance(inv, { dustExposureType: null, gasType: 'Brennbar' });
    expect(warnings).toContain('EXPLOSION_HAZARD');
  });
});
