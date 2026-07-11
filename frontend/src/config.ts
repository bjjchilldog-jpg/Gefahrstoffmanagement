export const config = {
  // Wenn wir lokal entwickeln (localhost), greife auf Port 3000 zu. 
  // In der Cloud (Production) läuft alles über denselben Port, daher relativer Pfad.
  apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' 
    : ''
};
