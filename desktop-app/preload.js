const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wbtBridge', {
  // Module
  saveModule: (moduleData) => ipcRenderer.invoke('wbt:save-module', moduleData),
  getModules: () => ipcRenderer.invoke('wbt:get-modules'),
  
  // Ergebnisse
  submitResult: (result) => ipcRenderer.invoke('wbt:submit-result', result),
  getPendingResults: () => ipcRenderer.invoke('wbt:get-pending-results'),
  
  // Sync
  syncResults: (serverUrl, token) => ipcRenderer.invoke('wbt:sync-results', serverUrl, token),
  
  // Export
  exportBundle: () => ipcRenderer.invoke('wbt:export-bundle'),
  
  // Info
  isDesktopApp: true,
});
