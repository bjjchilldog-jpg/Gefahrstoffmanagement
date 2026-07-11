export const config = {
  // Wenn wir in Produktion oder auf einem anderen Gerät sind, nutze die aktuelle IP mit Port 3000 für das Backend
  apiUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : `${window.location.protocol}//${window.location.hostname}:3000`
};
