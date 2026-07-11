// background.js — Service Worker für Fristen-Badge
const API_BASE = 'http://localhost:3000/api';
const CHECK_INTERVAL_MINUTES = 60; // Stündlich prüfen

// Alarm registrieren beim Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkDeadlines', { periodInMinutes: CHECK_INTERVAL_MINUTES });
  checkDeadlines(); // Sofort beim Install prüfen
});

// Alarm-Handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkDeadlines') {
    checkDeadlines();
  }
});

async function checkDeadlines() {
  try {
    const stored = await chrome.storage.local.get(['token']);
    if (!stored.token) return;
    
    const res = await fetch(`${API_BASE}/extension/deadlines`, {
      headers: { 'Authorization': `Bearer ${stored.token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    
    // Badge aktualisieren
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: count > 5 ? '#dc2626' : '#d97706' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    // Server offline — Badge leeren
    chrome.action.setBadgeText({ text: '' });
  }
}
