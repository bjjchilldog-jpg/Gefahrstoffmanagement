// utils/emkg.ts
// EMKG Experten-Logik basierend auf der BAuA TRGS 400

export const H_PHRASES_CATALOG = [
  // 200er: Physikalische Gefahren
  { code: 'H200', text: 'Instabil, explosiv.', group: '-' },
  { code: 'H220', text: 'Extrem entzündbares Gas.', group: '-' },
  { code: 'H225', text: 'Flüssigkeit und Dampf leicht entzündbar.', group: '-' },
  { code: 'H226', text: 'Flüssigkeit und Dampf entzündbar.', group: '-' },

  // 300er: Gesundheitsgefahren
  // Gefährlichkeitsgruppe A
  { code: 'H304', text: 'Kann bei Verschlucken und Eindringen in die Atemwege tödlich sein', group: 'A' },
  { code: 'H315', text: 'Verursacht Hautreizungen', group: 'A' },
  { code: 'H319', text: 'Verursacht schwere Augenreizung', group: 'A' },
  { code: 'H336', text: 'Kann Schläfrigkeit und Benommenheit verursachen', group: 'A' },
  { code: 'H337', text: 'Verursacht schwere Augenreizung (Sonderfall)', group: 'A' }, // User Request

  // Gefährlichkeitsgruppe B
  { code: 'H302', text: 'Gesundheitsschädlich bei Verschlucken', group: 'B' },
  { code: 'H312', text: 'Gesundheitsschädlich bei Hautkontakt', group: 'B' },
  { code: 'H332', text: 'Gesundheitsschädlich bei Einatmen', group: 'B' },
  { code: 'H371', text: 'Kann die Organe schädigen', group: 'B' },
  
  // Gefährlichkeitsgruppe C
  { code: 'H314', text: 'Verursacht schwere Verätzungen der Haut und schwere Augenschäden', group: 'C' },
  { code: 'H318', text: 'Verursacht schwere Augenschäden', group: 'C' },
  { code: 'H301', text: 'Giftig bei Verschlucken', group: 'C' },
  { code: 'H311', text: 'Giftig bei Hautkontakt', group: 'C' },
  { code: 'H331', text: 'Giftig bei Einatmen', group: 'C' },
  { code: 'H370', text: 'Schädigt die Organe', group: 'C' },
  
  // Gefährlichkeitsgruppe D (Akut sehr giftig)
  { code: 'H300', text: 'Lebensgefahr bei Verschlucken', group: 'D' },
  { code: 'H310', text: 'Lebensgefahr bei Hautkontakt', group: 'D' },
  { code: 'H330', text: 'Lebensgefahr bei Einatmen', group: 'D' },
  
  // Gefährlichkeitsgruppe E (CMR Stoffe)
  { code: 'H340', text: 'Kann genetische Defekte verursachen', group: 'E' },
  { code: 'H350', text: 'Kann Krebs erzeugen', group: 'E' },
  { code: 'H350i', text: 'Kann bei Einatmen Krebs erzeugen', group: 'E' },
  { code: 'H360', text: 'Kann die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen', group: 'E' },

  // 400er: Umweltgefahren
  { code: 'H400', text: 'Sehr giftig für Wasserorganismen.', group: '-' },
  { code: 'H410', text: 'Sehr giftig für Wasserorganismen mit langfristiger Wirkung.', group: '-' },
  { code: 'H411', text: 'Giftig für Wasserorganismen, mit langfristiger Wirkung.', group: '-' }
];

// Berechnet die höchste Gefährlichkeitsgruppe aus einer Liste von H-Sätzen
export const calculateHazardGroup = (selectedCodes: string[]): string => {
  let highestGroup = '-';
  const groupWeights: Record<string, number> = { '-': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };

  selectedCodes.forEach(code => {
    const phrase = H_PHRASES_CATALOG.find(p => p.code === code);
    if (phrase && groupWeights[phrase.group] > groupWeights[highestGroup]) {
      highestGroup = phrase.group;
    }
  });

  return highestGroup; // Returns 'A', 'B', 'C', 'D', 'E' or '-'
};

export const calculateVolatility = (
  physicalState: string,
  dustiness: string, // 'Niedrig', 'Mittel', 'Hoch'
  boilingPoint: number | null,
  vaporPressure: number | null,
  isSprayed: boolean
): string => {
  if (physicalState === 'Feststoff') {
    return dustiness || 'Mittel';
  }

  if (physicalState === 'Flüssigkeit') {
    if (isSprayed) return 'Hoch';
    
    // Priorisiere Dampfdruck, wenn vorhanden
    if (vaporPressure !== null) {
      if (vaporPressure > 250) return 'Hoch';
      if (vaporPressure >= 5) return 'Mittel';
      return 'Niedrig';
    }
    
    // Fallback auf Siedepunkt
    if (boilingPoint !== null) {
      if (boilingPoint < 49) return 'Hoch'; // oft < 50
      if (boilingPoint <= 150) return 'Mittel';
      return 'Niedrig';
    }
  }
  
  return 'Mittel'; // Fallback
};

// BauA Matrix zur Ermittlung der Schutzmaßnahmenstufe (1-4)
// Matrix: { HazardGroup: { MengeKlasse: { Freisetzungsgruppe: Stufe } } }
// Mengenklassen: 'Klein' (g/ml), 'Mittel' (kg/l), 'Groß' (t/m3)
export const calculateProtectionLevel = (
  hazardGroup: string,
  amountClass: string,
  volatility: string
): number => {
  if (hazardGroup === '-' || !amountClass || !volatility) return 0;

  // Stufe 4 ist bei Gruppe E fast immer Standard (CMR)
  if (hazardGroup === 'E') return 4;
  
  // Matrix (Vereinfachte BauA Abbildung für den Prototyp)
  const matrix: Record<string, any> = {
    'A': {
      'Klein': { 'Niedrig': 1, 'Mittel': 1, 'Hoch': 1 },
      'Mittel': { 'Niedrig': 1, 'Mittel': 1, 'Hoch': 2 },
      'Groß': { 'Niedrig': 1, 'Mittel': 2, 'Hoch': 2 }
    },
    'B': {
      'Klein': { 'Niedrig': 1, 'Mittel': 1, 'Hoch': 2 },
      'Mittel': { 'Niedrig': 1, 'Mittel': 2, 'Hoch': 2 },
      'Groß': { 'Niedrig': 2, 'Mittel': 2, 'Hoch': 3 }
    },
    'C': {
      'Klein': { 'Niedrig': 1, 'Mittel': 2, 'Hoch': 2 },
      'Mittel': { 'Niedrig': 2, 'Mittel': 2, 'Hoch': 3 },
      'Groß': { 'Niedrig': 2, 'Mittel': 3, 'Hoch': 3 }
    },
    'D': {
      // Akut giftig verlangt meist geschlossene Systeme (Stufe 3)
      'Klein': { 'Niedrig': 2, 'Mittel': 3, 'Hoch': 3 },
      'Mittel': { 'Niedrig': 3, 'Mittel': 3, 'Hoch': 3 },
      'Groß': { 'Niedrig': 3, 'Mittel': 3, 'Hoch': 3 }
    }
  };

  return matrix[hazardGroup]?.[amountClass]?.[volatility] || 1;
};

export const getProtectionLevelDescription = (level: number) => {
  switch(level) {
    case 1: return "Schutzleitfaden 100: Grundmaßnahmen (Lüftung, Hygiene, Standard-PSA)";
    case 2: return "Schutzleitfaden 200: Emissionsmindernde Maßnahmen (Punktabsaugung)";
    case 3: return "Schutzleitfaden 300: Geschlossenes System erforderlich";
    case 4: return "Schutzleitfaden 400: Strenges Minimierungsgebot (CMR-Stoffe / Expositionsmessung Pflicht)";
  }
};

// ==========================================
// TRGS 401: HAUTSCHUTZ & FEUCHTARBEIT
// ==========================================

export const calculateSkinRisk = (
  skinContactExcluded: boolean,
  isWetWork: boolean,
  skinContactArea: string, // 'klein' oder 'gross'
  skinContactDuration: string // '<=15' oder '>15'
): number => {
  if (skinContactExcluded) return 1; // Kein Risiko
  if (isWetWork) return 3; // Feuchtarbeit = Hohes Risiko

  if (skinContactArea === 'klein' && skinContactDuration === '<=15') return 1;
  if (skinContactArea === 'gross' && skinContactDuration === '>15') return 3;
  
  return 2; // Mittel
};

export const getSkinProtectionMeasures = (riskLevel: number) => {
  switch(riskLevel) {
    case 1:
      return {
        level: "Stufe 1 (Geringes Risiko)",
        sub: "Hautschonende Seife ohne Abrasiva verwenden.",
        tech: "Standard-Spendersysteme nutzen.",
        org: "Allgemeine Hygienemaßnahmen.",
        pers: "Bereitstellung von Basis-Pflegecreme nach der Arbeit."
      };
    case 2:
      return {
        level: "Stufe 2 (Mittleres Risiko)",
        sub: "Prüfung auf mildere Spezialreiniger. Lösemittel/Abrasiva reduzieren.",
        tech: "Berührungslose Spendersysteme zwingend erforderlich.",
        org: "Gezielter arbeitsplatzspezifischer Hautschutzplan muss erstellt werden.",
        pers: "Spezifischer Hautschutz (Vor der Arbeit), milde Reinigung, Pflege."
      };
    case 3:
      return {
        level: "Stufe 3 (Hohes Risiko / Feuchtarbeit)",
        sub: "Zwingende Substitution aggressiver Kombipräparate!",
        tech: "Geschlossene berührungslose Spendersysteme.",
        org: "Arbeitsmedizinische PFLICHTVORSORGE (G 24) zwingend erforderlich! Tragezeit für Handschuhe streng begrenzen.",
        pers: "Baumwollunterziehhandschuhe bereitstellen. Hochwertiges Schutz- und Pflegekonzept."
      };
    default:
      return { level: "", sub: "", tech: "", org: "", pers: "" };
  }
};
