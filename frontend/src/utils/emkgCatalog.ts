export interface EmkgGuideline {
  code: string;
  title: string;
  level: number; // 1, 2, 3
  category: 'Einatmen' | 'Haut' | 'Brand und Explosion' | 'Augenschutz';
}

export const EMKG_CATALOG: EmkgGuideline[] = [
  // STUFE 1
  { code: '100', title: 'Freie Lüftung', level: 1, category: 'Einatmen' },
  { code: '110', title: 'Organisations- und Hygienemaßnahmen "Einatmen" – Mindeststandards', level: 1, category: 'Einatmen' },
  { code: '120', title: 'Organisations- und Hygienemaßnahmen "Haut" – Mindeststandards', level: 1, category: 'Haut' },
  { code: 'pc-170', title: 'Brandschutzmaßnahmen – Mindeststandards', level: 1, category: 'Brand und Explosion' },
  { code: 'La-101', title: 'Bereitstellen und Lagern', level: 1, category: 'Einatmen' }, // Aus Screenshot

  // STUFE 2: Einatmen / Allgemeine Tätigkeiten
  { code: '200', title: 'Örtliche Absaugung (Punktabsaugung)', level: 2, category: 'Einatmen' },
  { code: '201', title: 'Abzugsschränke', level: 2, category: 'Einatmen' },
  { code: '203', title: 'Absaugschrank', level: 2, category: 'Einatmen' },
  { code: '204', title: 'Staubentnahme aus Abscheidesystem', level: 2, category: 'Einatmen' },
  { code: '205', title: 'Transport über Förderband', level: 2, category: 'Einatmen' },
  { code: '206', title: 'Befüllen von Säcken', level: 2, category: 'Einatmen' },
  { code: '208', title: 'Entleeren von Säcken', level: 2, category: 'Einatmen' },
  { code: '210', title: 'Beschicken von Kesseln aus Säcken oder Kleingebinden', level: 2, category: 'Einatmen' },
  { code: '211', title: 'Befüllung und Entleerung von Containern (IBC) für Feststoffe', level: 2, category: 'Einatmen' },
  { code: '212', title: 'Befüllen von Fässern', level: 2, category: 'Einatmen' },
  { code: '213', title: 'Entleeren von Fässern mittels Fasspumpe', level: 2, category: 'Einatmen' },
  { code: '214', title: 'Wiegen von Feststoffen', level: 2, category: 'Einatmen' },
  { code: '215', title: 'Mischen von Feststoffen mit anderen Feststoffen oder Flüssigkeiten', level: 2, category: 'Einatmen' },
  { code: '217', title: 'Mischen von Flüssigkeiten in Fässern o. ä.', level: 2, category: 'Einatmen' },
  { code: '222', title: 'Pulverbeschichtung', level: 2, category: 'Einatmen' },
  { code: '223', title: 'Laminieren (Batch)', level: 2, category: 'Einatmen' },
  { code: '228', title: 'Trockenschrank (Horden- oder Tellertrockner)', level: 2, category: 'Einatmen' },
  { code: '230', title: 'Herstellen von Pellets', level: 2, category: 'Einatmen' },
  { code: '240', title: 'Staubarbeitsplätze (Grundsätze) – Emissionsmindernde Maßnahmen', level: 2, category: 'Einatmen' },
  { code: '260', title: 'Wartungs- und Servicearbeiten an Drucker- und Kopiergeräten', level: 2, category: 'Einatmen' },

  // STUFE 2: Augenschutz
  { code: '2020', title: 'EMKG Schutzleitfaden "Augenschutz"', level: 2, category: 'Augenschutz' },
  { code: '2021', title: 'EMKG Schutzleitfaden "Augenspüleinrichtung"', level: 2, category: 'Augenschutz' },

  // STUFE 2: Brand und Explosion
  { code: 'pc-270', title: 'Grundanforderungen bei erhöhter Brandgefährdung – Erweiterte Brandschutzmaßnahmen', level: 2, category: 'Brand und Explosion' },
  { code: 'pc-271', title: 'Erweiterte Brandschutzmaßnahmen – Lackierarbeiten', level: 2, category: 'Brand und Explosion' },
  { code: 'pc-281', title: 'Brennbare Flüssigkeiten um- und abfüllen – Zündquellenvermeidung', level: 2, category: 'Brand und Explosion' },
  { code: 'pc-282', title: 'Lackierarbeiten – Zündquellenvermeidung', level: 2, category: 'Brand und Explosion' },

  // STUFE 3: Geschlossene Systeme
  { code: '300', title: 'Geschlossenes System (Allgemeine Anforderungen)', level: 3, category: 'Einatmen' },
  { code: '301', title: 'Handschuhkasten (Glove-Box)', level: 3, category: 'Einatmen' },
  { code: '305', title: 'Fassbefüllung im geschlossenen System', level: 3, category: 'Einatmen' },
  { code: '306', title: 'Fassentleerung im geschlossenen System', level: 3, category: 'Einatmen' },
  { code: '307', title: 'Befüllung und Entleerung von IBC-Containern (Feststoffe)', level: 3, category: 'Einatmen' },
  { code: '308', title: 'Befüllung und Entleerung von IBC-Containern (Flüssigkeiten)', level: 3, category: 'Einatmen' },
  { code: '310', title: 'Befüllen und Entleeren von Tankfahrzeugen', level: 3, category: 'Einatmen' },
  { code: '312', title: 'Umpumpen von Flüssigkeiten', level: 3, category: 'Einatmen' },
  { code: 'pc-370', title: 'Hohe Brandschutzmaßnahmen – Grundanforderungen für geschlossene Systeme', level: 3, category: 'Brand und Explosion' },
];

export const getGuidelinesByLevel = (level: number) => {
  // Always include level 1
  let relevant = EMKG_CATALOG.filter(g => g.level === 1);
  
  if (level >= 2) {
    // Only include generic level 2 guidelines
    const genericL2 = ['200', '240', '2020', 'pc-270'];
    relevant = [...relevant, ...EMKG_CATALOG.filter(g => g.level === 2 && genericL2.includes(g.code))];
  }
  if (level >= 3) {
    // Only include generic level 3 guidelines
    const genericL3 = ['300', 'pc-370'];
    relevant = [...relevant, ...EMKG_CATALOG.filter(g => g.level === 3 && genericL3.includes(g.code))];
  }
  return relevant;
};
