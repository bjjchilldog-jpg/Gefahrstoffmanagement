export interface TrbaGuideline {
  code: string;
  title: string;
  level: number; // 1 (TRBA 500), 2 (TRBA 250), 3, 4
  category: 'Hygiene' | 'Schutzkleidung & PSA' | 'Organisation & Medizin';
}

export const TRBA_CATALOG: TrbaGuideline[] = [
  // STUFE 1 (TRBA 500 - Grundlegende Maßnahmen)
  { code: 'TRBA-500-1', title: 'Erstellung eines Hygieneplans', level: 1, category: 'Organisation & Medizin' },
  { code: 'TRBA-500-2', title: 'Regelmäßige Händehygiene (Waschen/Desinfektion)', level: 1, category: 'Hygiene' },
  { code: 'TRBA-500-3', title: 'Leicht zu reinigende Arbeitsflächen', level: 1, category: 'Hygiene' },
  { code: 'TRBA-500-4', title: 'Keine Nahrungsaufnahme am Arbeitsplatz', level: 1, category: 'Hygiene' },
  { code: 'TRBA-500-5', title: 'Bereitstellung geeigneter Arbeitskleidung', level: 1, category: 'Schutzkleidung & PSA' },

  // STUFE 2 (z.B. TRBA 250 - Gesundheitswesen und Wohlfahrtspflege)
  { code: 'TRBA-250-1', title: 'Getrennte Aufbewahrung von Arbeits- und Privatkleidung (Schwarz-Weiß-Trennung)', level: 2, category: 'Schutzkleidung & PSA' },
  { code: 'TRBA-250-2', title: 'Tragen von flüssigkeitsdichten Schutzhandschuhen', level: 2, category: 'Schutzkleidung & PSA' },
  { code: 'TRBA-250-3', title: 'Ggf. Tragen von Schutzkitteln/Schürzen bei Kontaminationsgefahr', level: 2, category: 'Schutzkleidung & PSA' },
  { code: 'TRBA-250-4', title: 'Nutzung stichsicherer Instrumente & Kanülenabwurfboxen', level: 2, category: 'Hygiene' },
  { code: 'TRBA-250-5', title: 'Gezielte Wischdesinfektion von kontaminierten Flächen', level: 2, category: 'Hygiene' },
  { code: 'TRBA-250-6', title: 'Angebot arbeitsmedizinischer Vorsorge (Impfangebot z.B. Hep B)', level: 2, category: 'Organisation & Medizin' },
  
  // STUFE 3 (Labor/Hochinfektiös)
  { code: 'TRBA-100-3-1', title: 'Strenge Zugangskontrolle zum Arbeitsbereich', level: 3, category: 'Organisation & Medizin' },
  { code: 'TRBA-100-3-2', title: 'Arbeiten im Unterdruck (Sicherheitswerkbank Klasse II)', level: 3, category: 'Schutzkleidung & PSA' },
  { code: 'TRBA-100-3-3', title: 'Atemschutz (FFP3) zwingend erforderlich', level: 3, category: 'Schutzkleidung & PSA' }
];

export const getTrbaGuidelinesByLevel = (level: number) => {
  // Immer Stufe 1 Maßnahmen (Basis-Hygiene) einschließen
  let relevant = TRBA_CATALOG.filter(g => g.level === 1);
  
  if (level >= 2) {
    relevant = [...relevant, ...TRBA_CATALOG.filter(g => g.level === 2)];
  }
  if (level >= 3) {
    relevant = [...relevant, ...TRBA_CATALOG.filter(g => g.level === 3)];
  }
  return relevant;
};
