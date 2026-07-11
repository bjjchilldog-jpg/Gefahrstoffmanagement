/**
 * Offizielle GHS-Piktogramme nach UN GHS Rev.10
 * Rote Raute mit schwarzem Symbol auf weißem Grund
 */

// H-Satz → GHS-Piktogramm-Code Zuordnung
const H_TO_GHS: Record<string, string[]> = {
  // GHS01 - Explodierende Bombe
  H200:['GHS01'],H201:['GHS01'],H202:['GHS01'],H203:['GHS01'],H204:['GHS01'],H205:['GHS01'],H240:['GHS01'],H241:['GHS01','GHS02'],
  // GHS02 - Flamme
  H220:['GHS02'],H221:['GHS02'],H222:['GHS02'],H223:['GHS02'],H224:['GHS02'],H225:['GHS02'],H226:['GHS02'],H228:['GHS02'],
  H242:['GHS02'],H250:['GHS02'],H251:['GHS02'],H252:['GHS02'],H260:['GHS02'],H261:['GHS02'],
  // GHS03 - Flamme über Kreis
  H270:['GHS03'],H271:['GHS03'],H272:['GHS03'],
  // GHS04 - Gasflasche
  H280:['GHS04'],H281:['GHS04'],
  // GHS05 - Ätzwirkung
  H290:['GHS05'],H314:['GHS05'],H318:['GHS05'],
  // GHS06 - Totenkopf
  H300:['GHS06'],H301:['GHS06'],H310:['GHS06'],H311:['GHS06'],H330:['GHS06'],H331:['GHS06'],
  // GHS07 - Ausrufezeichen
  H302:['GHS07'],H312:['GHS07'],H315:['GHS07'],H317:['GHS07'],H319:['GHS07'],H332:['GHS07'],H335:['GHS07'],H336:['GHS07'],
  // GHS08 - Gesundheitsgefahr
  H304:['GHS08'],H334:['GHS08'],H340:['GHS08'],H341:['GHS08'],H350:['GHS08'],H351:['GHS08'],
  H360:['GHS08'],H361:['GHS08'],H362:['GHS08'],H370:['GHS08'],H371:['GHS08'],H372:['GHS08'],H373:['GHS08'],
  // GHS09 - Umwelt
  H400:['GHS09'],H410:['GHS09'],H411:['GHS09'],H412:['GHS09'],H413:['GHS09'],
};

const GHS_LABELS: Record<string, string> = {
  GHS01: 'Explosionsgefahr',
  GHS02: 'Entzündbar',
  GHS03: 'Brandfördernd',
  GHS04: 'Gas unter Druck',
  GHS05: 'Ätzend',
  GHS06: 'Akut toxisch',
  GHS07: 'Reizend',
  GHS08: 'Gesundheitsgefahr',
  GHS09: 'Umweltgefahr',
};

// SVG-Symbole für jedes GHS-Piktogramm (schwarze Symbole im Diamant)
const GHS_SYMBOLS: Record<string, JSX.Element> = {
  GHS01: ( // Explodierende Bombe
    <g transform="translate(50,50) scale(0.6)">
      <circle cx="0" cy="5" r="12" fill="black"/>
      <line x1="-5" y1="-8" x2="-15" y2="-20" stroke="black" strokeWidth="3"/>
      <line x1="5" y1="-8" x2="15" y2="-20" stroke="black" strokeWidth="3"/>
      <line x1="0" y1="-12" x2="0" y2="-25" stroke="black" strokeWidth="3"/>
      <line x1="-10" y1="0" x2="-22" y2="-5" stroke="black" strokeWidth="3"/>
      <line x1="10" y1="0" x2="22" y2="-5" stroke="black" strokeWidth="3"/>
      <line x1="-8" y1="8" x2="-18" y2="15" stroke="black" strokeWidth="3"/>
      <line x1="8" y1="8" x2="18" y2="15" stroke="black" strokeWidth="3"/>
    </g>
  ),
  GHS02: ( // Flamme
    <g transform="translate(50,50) scale(0.55)">
      <path d="M0,-35 C-5,-20 -18,-15 -18,0 C-18,12 -10,22 0,25 C10,22 18,12 18,0 C18,-15 5,-20 0,-35Z" fill="black"/>
      <path d="M0,-10 C-3,-5 -8,0 -8,8 C-8,14 -4,18 0,18 C4,18 8,14 8,8 C8,0 3,-5 0,-10Z" fill="white"/>
    </g>
  ),
  GHS03: ( // Flamme über Kreis
    <g transform="translate(50,50) scale(0.5)">
      <circle cx="0" cy="12" r="16" fill="none" stroke="black" strokeWidth="5"/>
      <path d="M0,-35 C-4,-22 -14,-18 -14,-5 C-14,5 -8,12 0,15 C8,12 14,5 14,-5 C14,-18 4,-22 0,-35Z" fill="black"/>
    </g>
  ),
  GHS04: ( // Gasflasche
    <g transform="translate(50,50) scale(0.5)">
      <rect x="-10" y="-20" width="20" height="35" rx="3" fill="black"/>
      <rect x="-4" y="-28" width="8" height="10" rx="2" fill="black"/>
      <ellipse cx="0" cy="15" rx="10" ry="4" fill="black"/>
    </g>
  ),
  GHS05: ( // Ätzwirkung
    <g transform="translate(50,50) scale(0.5)">
      <path d="M-15,-25 L-5,-25 L-5,-8 C-5,-5 -12,0 -12,5 L-12,8 L5,8 L5,5 C5,0 -2,-5 -2,-8 L-2,-25 L8,-25 L8,-8 C8,-2 15,3 15,10 L15,15 C15,20 10,25 5,25 L-12,25 C-17,25 -22,20 -22,15 L-22,10 C-22,3 -15,-2 -15,-8Z" fill="black"/>
    </g>
  ),
  GHS06: ( // Totenkopf mit Knochen
    <g transform="translate(50,50) scale(0.5)">
      <circle cx="0" cy="-8" r="16" fill="black"/>
      <circle cx="-6" cy="-12" r="4" fill="white"/>
      <circle cx="6" cy="-12" r="4" fill="white"/>
      <path d="M-4,-2 L-2,0 L0,-2 L2,0 L4,-2" stroke="white" strokeWidth="2" fill="none"/>
      <line x1="-18" y1="15" x2="18" y2="22" stroke="black" strokeWidth="6" strokeLinecap="round"/>
      <line x1="-18" y1="22" x2="18" y2="15" stroke="black" strokeWidth="6" strokeLinecap="round"/>
    </g>
  ),
  GHS07: ( // Ausrufezeichen
    <g transform="translate(50,50) scale(0.55)">
      <rect x="-4" y="-28" width="8" height="32" rx="3" fill="black"/>
      <circle cx="0" cy="16" r="5" fill="black"/>
    </g>
  ),
  GHS08: ( // Gesundheitsgefahr (Torso mit Stern)
    <g transform="translate(50,50) scale(0.5)">
      <circle cx="0" cy="-22" r="8" fill="black"/>
      <path d="M-12,-12 L12,-12 L15,20 L5,15 L0,25 L-5,15 L-15,20Z" fill="black"/>
      <polygon points="0,-10 2,-4 8,-4 3,0 5,6 0,3 -5,6 -3,0 -8,-4 -2,-4" fill="white" transform="translate(0,4) scale(1.2)"/>
    </g>
  ),
  GHS09: ( // Umwelt (toter Baum und Fisch)
    <g transform="translate(50,50) scale(0.5)">
      <line x1="-5" y1="-30" x2="-5" y2="10" stroke="black" strokeWidth="3"/>
      <line x1="-5" y1="-25" x2="-15" y2="-15" stroke="black" strokeWidth="3"/>
      <line x1="-5" y1="-18" x2="8" y2="-10" stroke="black" strokeWidth="3"/>
      <line x1="-5" y1="-10" x2="-12" y2="-2" stroke="black" strokeWidth="3"/>
      <path d="M-15,15 C-10,10 0,10 5,12 C10,14 15,14 18,12 C18,18 12,22 5,22 C0,22 -10,22 -15,18Z" fill="black"/>
      <circle cx="12" cy="14" r="1.5" fill="white"/>
    </g>
  ),
};

/** Einzelnes GHS-Piktogramm als SVG-Diamant */
export const GhsPictogram = ({ code, size = 32 }: { code: string; size?: number }) => {
  const symbol = GHS_SYMBOLS[code];
  if (!symbol) return null;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <title>{`${code}: ${GHS_LABELS[code]}`}</title>
      {/* Roter Diamant-Rahmen */}
      <polygon
        points="50,2 98,50 50,98 2,50"
        fill="white"
        stroke="#cc0000"
        strokeWidth="4"
      />
      {/* Symbol */}
      {symbol}
    </svg>
  );
};

/** Gibt die GHS-Codes für eine kommaseparierte H-Satz-Liste zurück */
export function getGhsCodes(hPhrases: string): string[] {
  if (!hPhrases) return [];
  const codes = new Set<string>();
  hPhrases.split(',').map(h => h.trim().toUpperCase()).forEach(h => {
    H_TO_GHS[h]?.forEach(c => codes.add(c));
  });
  // Sortiert nach GHS-Nummer
  return Array.from(codes).sort();
}

/** Gibt den Label-Text für einen GHS-Code zurück */
export function getGhsLabel(code: string): string {
  return GHS_LABELS[code] || code;
}

/** Zeigt alle GHS-Piktogramme für eine H-Satz-Liste an */
export const GhsPictogramRow = ({ hPhrases, size = 28 }: { hPhrases: string; size?: number }) => {
  const codes = getGhsCodes(hPhrases);
  if (codes.length === 0) return <span className="text-xs text-slate-400">–</span>;

  return (
    <div className="flex flex-wrap gap-1 items-center" title={codes.map(c => `${c}: ${GHS_LABELS[c]}`).join('\n')}>
      {codes.map(code => (
        <GhsPictogram key={code} code={code} size={size} />
      ))}
    </div>
  );
};
