// utils/emkg.ts
// EMKG Experten-Logik basierend auf der BAuA TRGS 400

export const H_PHRASES_CATALOG = [
  // 200er: Physikalische Gefahren
  { code: 'H200', text: 'Instabil, explosiv', group: '-' },
  { code: 'H201', text: 'Explosiv, Gefahr der Massenexplosion.', group: '-' },
  { code: 'H202', text: 'Explosiv; große Gefahr durch Splitter, Spreng- und Wurfstücke.', group: '-' },
  { code: 'H203', text: 'Explosiv; Gefahr durch Feuer, Luftdruck oder Splitter, Spreng- und Wurfstücke.', group: '-' },
  { code: 'H204', text: 'Gefahr durch Feuer oder Splitter, Spreng- und Wurfstücke.', group: '-' },
  { code: 'H205', text: 'Gefahr der Massenexplosion bei Feuer.', group: '-' },
  { code: 'H206', text: 'Gefahr durch Feuer, Druckstoß oder Sprengstücke; erhöhte Explosionsgefahr, wenn das Desensibilisierungsmittel reduziert wird.', group: '-' },
  { code: 'H207', text: 'Gefahr durch Feuer oder Sprengstücke; erhöhte Explosionsgefahr, wenn das Desensibilisierungsmittel reduziert wird.', group: '-' },
  { code: 'H208', text: 'Gefahr durch Feuer; erhöhte Explosionsgefahr, wenn das Desensibilisierungsmittel reduziert wird.', group: '-' },
  { code: 'H209', text: 'Explosiv.', group: '-' },
  { code: 'H210', text: 'Sehr empfindlich.', group: '-' },
  { code: 'H211', text: 'Kann empfindlich sein.', group: '-' },
  { code: 'H220', text: 'Extrem entzündbares Gas.', group: '-' },
  { code: 'H221', text: 'Entzündbares Gas.', group: '-' },
  { code: 'H222', text: 'Extrem entzündbares Aerosol.', group: '-' },
  { code: 'H223', text: 'Entzündbares Aerosol.', group: '-' },
  { code: 'H224', text: 'Flüssigkeit und Dampf extrem entzündbar.', group: '-' },
  { code: 'H225', text: 'Flüssigkeit und Dampf leicht entzündbar.', group: '-' },
  { code: 'H226', text: 'Flüssigkeit und Dampf entzündbar.', group: '-' },
  { code: 'H227', text: 'Brennbare Flüssigkeit.', group: '-' },
  { code: 'H228', text: 'Entzündbarer Feststoff.', group: '-' },
  { code: 'H229', text: 'Behälter steht unter Druck: kann bei Erwärmung bersten.', group: '-' },
  { code: 'H230', text: 'Kann auch in Abwesenheit von Luft explosionsartig reagieren.', group: '-' },
  { code: 'H231', text: 'Kann auch in Abwesenheit von Luft bei erhöhtem Druck und/oder erhöhter Temperatur explosionsartig reagieren.', group: '-' },
  { code: 'H232', text: 'Kann sich bei Kontakt mit Luft spontan entzünden.', group: '-' },
  { code: 'H240', text: 'Erwärmung kann Explosion verursachen.', group: '-' },
  { code: 'H241', text: 'Erwärmung kann Brand oder Explosion verursachen.', group: '-' },
  { code: 'H242', text: 'Erwärmung kann Brand verursachen.', group: '-' },
  { code: 'H250', text: 'Entzündet sich in Berührung mit Luft von selbst.', group: '-' },
  { code: 'H251', text: 'Selbsterhitzungsfähig; kann in Brand geraten.', group: '-' },
  { code: 'H252', text: 'In großen Mengen selbsterhitzungsfähig; kann in Brand geraten.', group: '-' },
  { code: 'H260', text: 'In Berührung mit Wasser entstehen entzündbare Gase, die sich spontan entzünden können.', group: '-' },
  { code: 'H261', text: 'In Berührung mit Wasser entstehen entzündbare Gase.', group: '-' },
  { code: 'H270', text: 'Kann Brand verursachen oder verstärken; Oxidationsmittel.', group: '-' },
  { code: 'H271', text: 'Kann Brand oder Explosion verursachen; starkes Oxidationsmittel.', group: '-' },
  { code: 'H272', text: 'Kann Brand verstärken; Oxidationsmittel.', group: '-' },
  { code: 'H280', text: 'Enthält Gas unter Druck; kann bei Erwärmung explodieren.', group: '-' },
  { code: 'H281', text: 'Enthält tiefgekühltes Gas; kann Kälteverbrennungen oder -verletzungen verursachen.', group: '-' },
  { code: 'H282', text: 'Extrem entzündbare Chemikalie unter Druck; kann bei Erwärmung explodieren.', group: '-' },
  { code: 'H283', text: 'Entzündbare Chemikalie unter Druck; kann bei Erwärmung explodieren.', group: '-' },
  { code: 'H284', text: 'Chemikalie unter Druck; kann bei Erwärmung explodieren.', group: '-' },
  { code: 'H290', text: 'Kann gegenüber Metallen korrosiv sein.', group: '-' },

  // 300er: Gesundheitsgefahren
  { code: 'H300', text: 'Lebensgefahr bei Verschlucken.', group: 'D' },
  { code: 'H301', text: 'Giftig bei Verschlucken.', group: 'C' },
  { code: 'H302', text: 'Gesundheitsschädlich bei Verschlucken.', group: 'B' },
  { code: 'H303', text: 'Kann bei Verschlucken gesundheitsschädlich sein.', group: 'A' },
  { code: 'H304', text: 'Kann bei Verschlucken und Eindringen in die Atemwege tödlich sein.', group: 'A' },
  { code: 'H305', text: 'Kann bei Verschlucken und Eindringen in die Atemwege gesundheitsschädlich sein.', group: 'A' },
  { code: 'H310', text: 'Lebensgefahr bei Hautkontakt.', group: 'E' },
  { code: 'H311', text: 'Giftig bei Hautkontakt.', group: 'D' },
  { code: 'H312', text: 'Gesundheitsschädlich bei Hautkontakt.', group: 'C' },
  { code: 'H313', text: 'Kann bei Hautkontakt gesundheitsschädlich sein.', group: 'A' },
  { code: 'H314', text: 'Verursacht schwere Verätzungen der Haut und schwere Augenschäden.', group: 'D' },
  { code: 'H315', text: 'Verursacht Hautreizungen.', group: 'B' },
  { code: 'H316', text: 'Verursacht leichte Hautreizungen.', group: 'A' },
  { code: 'H317', text: 'Kann allergische Hautreaktionen verursachen.', group: 'C' },
  { code: 'H318', text: 'Verursacht schwere Augenschäden.', group: 'C' },
  { code: 'H319', text: 'Verursacht schwere Augenreizung.', group: 'B' },
  { code: 'H320', text: 'Verursacht Augenreizung.', group: 'A' },
  { code: 'H330', text: 'Lebensgefahr bei Einatmen.', group: 'D' },
  { code: 'H331', text: 'Giftig bei Einatmen.', group: 'C' },
  { code: 'H332', text: 'Gesundheitsschädlich bei Einatmen.', group: 'B' },
  { code: 'H333', text: 'Kann bei Einatmen gesundheitsschädlich sein.', group: 'A' },
  { code: 'H334', text: 'Kann bei Einatmen Allergie, asthmaartige Symptome oder Atembeschwerden verursachen.', group: 'C' },
  { code: 'H335', text: 'Kann die Atemwege reizen.', group: 'B' },
  { code: 'H336', text: 'Kann Schläfrigkeit und Benommenheit verursachen.', group: 'A' },
  { code: 'H340', text: 'Kann genetische Defekte verursachen (Expositionsweg angeben, sofern schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'E' },
  { code: 'H341', text: 'Kann vermutlich genetische Defekte verursachen (Expositionsweg angeben, sofern schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'D' },
  { code: 'H350', text: 'Kann Krebs erzeugen (Expositionsweg angeben, sofern schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'E' },
  { code: 'H350i', text: 'Kann bei Einatmen Krebs erzeugen.', group: 'E' },
  { code: 'H351', text: 'Kann vermutlich Krebs erzeugen (Expositionsweg angeben, sofern schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'D' },
  { code: 'H360', text: 'Kann die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen (konkrete Wirkung angeben, sofern bekannt) (Expositionsweg angeben, sofern schlüssig belegt ist, dass die Gefahr bei keinem anderen Expositionsweg besteht).', group: 'E' },
  { code: 'H360F', text: 'Kann die Fruchtbarkeit beeinträchtigen.', group: 'E' },
  { code: 'H360D', text: 'Kann das Kind im Mutterleib schädigen.', group: 'E' },
  { code: 'H360FD', text: 'Kann die Fruchtbarkeit beeinträchtigen. Kann das Kind im Mutterleib schädigen.', group: 'E' },
  { code: 'H360Fd', text: 'Kann die Fruchtbarkeit beeinträchtigen. Kann vermutlich das Kind im Mutterleib schädigen.', group: 'E' },
  { code: 'H360Df', text: 'Kann das Kind im Mutterleib schädigen. Kann vermutlich die Fruchtbarkeit beeinträchtigen.', group: 'E' },
  { code: 'H361', text: 'Kann vermutlich die Fruchtbarkeit beeinträchtigen oder das Kind im Mutterleib schädigen (konkrete Wirkung angeben, sofern bekannt) (Expositionsweg angeben, sofern schlüssig belegt ist, dass die Gefahr bei keinem anderen Expositionsweg besteht).', group: 'D' },
  { code: 'H361f', text: 'Kann vermutlich die Fruchtbarkeit beeinträchtigen.', group: 'D' },
  { code: 'H361d', text: 'Kann vermutlich das Kind im Mutterleib schädigen.', group: 'D' },
  { code: 'H361fd', text: 'Kann vermutlich die Fruchtbarkeit beeinträchtigen. Kann vermutlich das Kind im Mutterleib schädigen.', group: 'D' },
  { code: 'H362', text: 'Kann Säuglinge über die Muttermilch schädigen.', group: 'E' },
  { code: 'H370', text: 'Schädigt die Organe (oder alle betroffenen Organe nennen, sofern bekannt) (Expositionsweg angeben, sofern schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'D' },
  { code: 'H371', text: 'Kann die Organe schädigen (oder alle betroffenen Organe nennen, sofern bekannt) (Expositionsweg angeben, sofern schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'C' },
  { code: 'H372', text: 'Schädigt die Organe (alle betroffenen Organe nennen) bei längerer oder wiederholter Exposition (Expositionsweg angeben, wenn schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'D' },
  { code: 'H373', text: 'Kann die Organe schädigen (alle betroffenen Organe nennen, sofern bekannt) bei längerer oder wiederholter Exposition (Expositionsweg angeben, wenn schlüssig belegt ist, dass diese Gefahr bei keinem anderen Expositionsweg besteht).', group: 'C' },

  // 400er: Umweltgefahren
  { code: 'H400', text: 'Sehr giftig für Wasserorganismen.', group: '-' },
  { code: 'H401', text: 'Giftig für Wasserorganismen.', group: '-' },
  { code: 'H402', text: 'Schädlich für Wasserorganismen.', group: '-' },
  { code: 'H410', text: 'Sehr giftig für Wasserorganismen mit langfristiger Wirkung.', group: '-' },
  { code: 'H411', text: 'Giftig für Wasserorganismen, mit langfristiger Wirkung.', group: '-' },
  { code: 'H412', text: 'Schädlich für Wasserorganismen, mit langfristiger Wirkung.', group: '-' },
  { code: 'H413', text: 'Kann für Wasserorganismen schädlich sein, mit langfristiger Wirkung.', group: '-' },
  { code: 'H420', text: 'Schädigt die öffentliche Gesundheit und die Umwelt durch Ozonabbau in der äußeren Atmosphäre.', group: '-' }
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
