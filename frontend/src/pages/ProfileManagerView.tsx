import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, FileText, Settings, ShieldAlert, Check, Download, Upload, AlertCircle } from 'lucide-react';

export const ProfileManagerView = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  
  const [newProfileName, setNewProfileName] = useState('');
  
  const [masterSubstances, setMasterSubstances] = useState<any[]>([]);
  const [addingSubstanceId, setAddingSubstanceId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [missingSubstances, setMissingSubstances] = useState<any[]>([]);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [currentMissingIndex, setCurrentMissingIndex] = useState(0);
  const [currentFormData, setCurrentFormData] = useState<any>(null);
  
  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      setProfiles(data);
      if (selectedProfile) {
        setSelectedProfile(data.find((p: any) => p.id === selectedProfile.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMasterSubstances = async () => {
    try {
      const res = await fetch('/api/substances', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMasterSubstances(data.hazardous || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchMasterSubstances();
  }, []);

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fehler beim Erstellen');
        return;
      }
      setNewProfileName('');
      fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Profil wirklich löschen?')) return;
    try {
      await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (selectedProfile?.id === id) setSelectedProfile(null);
      fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubstance = async () => {
    if (!selectedProfile || !addingSubstanceId) return;
    try {
      await fetch(`/api/profiles/${selectedProfile.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBiological: false, masterSubstanceId: addingSubstanceId })
      });
      setAddingSubstanceId('');
      fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await fetch(`/api/profiles/items/${itemId}`, { method: 'DELETE' });
      fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportProfile = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/profiles/${id}/export`);
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Profil_${name.replace(/[^a-z0-9A-Z]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Fehler beim Exportieren');
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const profileData = JSON.parse(text);

      const res = await fetch('/api/profiles/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      const result = await res.json();
      if (!res.ok) {
        if (result.missingSubstances) {
           setMissingSubstances(result.missingSubstances);
           setPendingImportData(result.profileData);
           setCurrentMissingIndex(0);
           setCurrentFormData(result.missingSubstances[0]);
           setShowImportModal(true);
        } else {
           alert(result.error || 'Fehler beim Import');
        }
      } else {
        alert('Profil erfolgreich importiert!');
        fetchProfiles();
      }
    } catch (err) {
      alert('Ungültige oder defekte Datei');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateMissingSubstance = async () => {
    try {
      const res = await fetch('/api/substances/master', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') }`
        },
        body: JSON.stringify(currentFormData)
      });
      if (!res.ok) throw new Error('Fehler beim Anlegen');
      
      const nextIndex = currentMissingIndex + 1;
      if (nextIndex < missingSubstances.length) {
        setCurrentMissingIndex(nextIndex);
        setCurrentFormData(missingSubstances[nextIndex]);
      } else {
        setShowImportModal(false);
        const retryRes = await fetch('/api/profiles/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingImportData)
        });
        if (retryRes.ok) {
          alert('Profil und alle fehlenden Stoffe erfolgreich importiert!');
          fetchProfiles();
          fetchMasterSubstances();
        } else {
          alert('Import fehlgeschlagen nach Anlage der Stoffe.');
        }
      }
    } catch (e) {
      alert('Fehler beim Speichern des Stoffs.');
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar: Profile List */}
      <div className="w-1/3 bg-white rounded-lg border border-slate-200 p-4 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportFileChange}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2"
              title="Profil aus JSON importieren"
            >
              <Upload className="w-4 h-4" /> Import
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Neues Profil (z.B. Bauhof)" 
            className="flex-1 border-slate-300 rounded"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
          />
          <button 
            onClick={handleCreateProfile}
            disabled={!newProfileName.trim()}
            className="bg-indigo-600 text-white p-2 rounded disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 border-t border-slate-100 pt-2 space-y-2">
          {profiles.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedProfile(p)}
              className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-colors ${selectedProfile?.id === p.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-slate-200'}`}
            >
              <div className="flex items-center gap-2">
                <Settings className={`w-4 h-4 ${selectedProfile?.id === p.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-medium text-slate-700">{p.name}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExportProfile(p.id, p.name); }} 
                  className="text-slate-300 hover:text-indigo-600"
                  title="Profil exportieren"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }} 
                  className="text-slate-300 hover:text-red-600"
                  title="Profil löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Keine Profile angelegt.</p>}
        </div>
      </div>

      {/* Main Content: Profile Details */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 flex flex-col h-full">
        {selectedProfile ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              Profil: {selectedProfile.name}
            </h2>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <h3 className="font-bold text-slate-700 mb-3">Gefahrstoff aus Katalog hinzufügen</h3>
              <div className="flex gap-2">
                <select 
                  className="flex-1 rounded border-slate-300"
                  value={addingSubstanceId}
                  onChange={(e) => setAddingSubstanceId(e.target.value)}
                >
                  <option value="">-- Stoff auswählen --</option>
                  {masterSubstances.map(ms => (
                    <option key={ms.id} value={ms.id}>{ms.productName} ({ms.manufacturer || 'Kein Hersteller'})</option>
                  ))}
                </select>
                <button 
                  onClick={handleAddSubstance}
                  disabled={!addingSubstanceId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Hinzufügen
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className="font-bold text-slate-700 mb-3">Enthaltene Stoffe ({selectedProfile.items.length})</h3>
              {selectedProfile.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Noch keine Stoffe in diesem Profil.</div>
              ) : (
                <div className="grid gap-2">
                  {selectedProfile.items.map((item: any) => (
                    <div key={item.id} className="p-3 border border-slate-200 rounded-lg flex justify-between items-center bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{item.masterSubstance?.productName}</p>
                          <p className="text-xs text-slate-500">{item.masterSubstance?.manufacturer || 'Kein Hersteller'}</p>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-600 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Settings className="w-16 h-16 mb-4 opacity-20" />
            <p>Wähle links ein Profil aus oder erstelle ein neues.</p>
          </div>
        )}
      </div>

      {/* Import Missing Substances Modal */}
      {showImportModal && currentFormData && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Fehlender Stoff ({currentMissingIndex + 1}/{missingSubstances.length})</h3>
                <p className="text-sm text-slate-500">Dieser Stoff existiert noch nicht in deinem Zentralkatalog.</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Produktname</label>
                <input 
                  type="text" 
                  value={currentFormData.productName || ''} 
                  onChange={e => setCurrentFormData({...currentFormData, productName: e.target.value})}
                  className="w-full border-slate-300 rounded focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hersteller</label>
                <input 
                  type="text" 
                  value={currentFormData.manufacturer || ''} 
                  onChange={e => setCurrentFormData({...currentFormData, manufacturer: e.target.value})}
                  className="w-full border-slate-300 rounded focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Substanz-Typ</label>
                <select 
                  value={currentFormData.substanceType || 'GEFAHRSTOFF'} 
                  onChange={e => setCurrentFormData({...currentFormData, substanceType: e.target.value})}
                  className="w-full border-slate-300 rounded focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="GEFAHRSTOFF">Gefahrstoff</option>
                  <option value="BIOSTOFF">Biostoff</option>
                  <option value="ASBEST">Asbest</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wassergefährdungsklasse (WGK)</label>
                <input 
                  type="number" 
                  value={currentFormData.wgk || ''} 
                  onChange={e => setCurrentFormData({...currentFormData, wgk: e.target.value})}
                  className="w-full border-slate-300 rounded focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
              >
                Import abbrechen
              </button>
              <button 
                onClick={handleCreateMissingSubstance}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Anlegen & Weiter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
