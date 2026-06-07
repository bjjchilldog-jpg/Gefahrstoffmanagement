import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Settings, AlertTriangle, Copy, FileText, Trash2 } from 'lucide-react';
import { generateBetriebsanweisung } from '../utils/docxExport';

export const SubstanceList = ({ selectedIds, onSelectIds }: any) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'hazardous' | 'biological' | 'asbestos'>('hazardous');
  const [hazardousSubstances, setHazardousSubstances] = useState<any[]>([]);
  const [biologicalSubstances, setBiologicalSubstances] = useState<any[]>([]);
  const [asbestosSubstances, setAsbestosSubstances] = useState<any[]>([]);
  const [workAreaInfo, setWorkAreaInfo] = useState<any>(null);
  const [areaConflicts, setAreaConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubstances = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/substances?workAreaId=${id}`);
      const data = await res.json();
      
      // Trenne Asbest von regulären Gefahrstoffen
      const haz = (data.hazardous || []).filter((s: any) => s.masterSubstance?.substanceType !== 'ASBEST');
      const asb = (data.hazardous || []).filter((s: any) => s.masterSubstance?.substanceType === 'ASBEST');
      
      setHazardousSubstances(haz);
      setAsbestosSubstances(asb);
      setBiologicalSubstances(data.biological || []);
      setWorkAreaInfo(data.workAreaInfo || null);
      setAreaConflicts(data.areaConflicts || []);

      if (haz.length === 0 && asb.length > 0) setActiveTab('asbestos');
      else if (haz.length === 0 && data.biological?.length > 0) setActiveTab('biological');
      else setActiveTab('hazardous');
    } catch (err) {
      console.error("Fehler beim Laden der Stoffe:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstances();
  }, [id]);

  const allHazardColumns = ['Produktname', 'Hersteller', 'Verantwortliche', 'Compliance', 'Vorsorge', 'H-Sätze', 'WGK/LGK', 'EMKG', 'AGW (TRGS 900)', 'Lagermenge', 'Substitutionsprüfung', 'Medien', 'Zusatzfelder', 'Aktionen'];
  const bioColumns = ['Biostoff', 'Tätigkeit', 'Risikogruppe', 'Schutzstufe', 'Übertragung', 'Impfangebot', 'Aktionen'];
  const asbestosColumns = ['Gefährdungsbereich', 'Tätigkeit', 'Dokumente', 'Aktionen'];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('gefahrstoffVisibleCols');
    return saved ? JSON.parse(saved) : ['Produktname', 'Compliance', 'Verantwortliche', 'Lagermenge', 'WGK/LGK', 'Vorsorge', 'Medien', 'Aktionen'];
  });
  const [showColSettings, setShowColSettings] = useState(false);

  const toggleColumn = (col: string) => {
    const newCols = visibleColumns.includes(col) 
      ? visibleColumns.filter(c => c !== col) 
      : [...visibleColumns, col];
    setVisibleColumns(newCols);
    localStorage.setItem('gefahrstoffVisibleCols', JSON.stringify(newCols));
  };

  const columns = activeTab === 'hazardous' 
    ? allHazardColumns.filter(c => visibleColumns.includes(c)) 
    : activeTab === 'biological' ? bioColumns : asbestosColumns;
    
  const currentList = activeTab === 'hazardous' ? hazardousSubstances : activeTab === 'biological' ? biologicalSubstances : asbestosSubstances;

  // Modul 15: Bulk Update und Clone
  const handleBulkAssign = async () => {
    const sifa = prompt("Spezielle Fachkraft für Arbeitssicherheit (SiFa) eintragen:\n\nLeer lassen = Keine Änderung\nBindestrich (-) = Spezial-Zuweisung löschen (Standard-SiFa erben)");
    const betriebsarzt = prompt("Spezieller Betriebsarzt:\n\nLeer lassen = Keine Änderung\nBindestrich (-) = Spezial-Zuweisung löschen (Standard-Arzt erben)");
    if (!sifa && !betriebsarzt) return;
    
    await Promise.all(selectedIds.map((sid: string) => 
      fetch(`http://localhost:3000/api/substances/${sid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}` },
        body: JSON.stringify({ 
          ...(sifa && { sifaName: sifa === '-' ? null : sifa }),
          ...(betriebsarzt && { betriebsarztName: betriebsarzt === '-' ? null : betriebsarzt })
        })
      })
    ));
    
    onSelectIds([]);
    fetchSubstances();
  };

  const handleClone = async (cloneId: string) => {
    if (!confirm("Diesen Stoff inkl. aller Metadaten klonen?")) return;
    await fetch(`http://localhost:3000/api/substances/${cloneId}/clone`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}` }
    });
    fetchSubstances();
  };

  const handleDelete = async (deleteId: string) => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/substances/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}` }
      });
      if (res.ok) {
        fetchSubstances();
      } else {
        alert("Fehler beim Löschen.");
      }
    } catch (err) {
      alert("Fehler beim Löschen.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Kataster & Gefährdungen</h2>
        <button onClick={() => navigate(`/work-area/${id}/gbu/new`)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
          <span className="text-lg">+</span> Gefährdung erfassen
        </button>
      </div>

      {workAreaInfo && (workAreaInfo.dustExposureType || workAreaInfo.gasType) && (
        <div className="flex flex-wrap gap-3 p-4 bg-slate-50 border-b border-slate-200">
          {workAreaInfo.dustExposureType && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full border border-orange-200 shadow-sm">
              <ShieldAlert className="w-4 h-4" /> Staub-Exposition: {workAreaInfo.dustExposureType}
            </span>
          )}
          {workAreaInfo.gasType === 'Brennbar' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full border border-red-200 shadow-sm">
              <ShieldAlert className="w-4 h-4" /> Explosionsgefahr (BetrSichV)
            </span>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-3 px-6 flex justify-between items-center z-10">
          <span className="text-blue-800 font-medium">{selectedIds.length} Stoffe ausgewählt</span>
          <button onClick={handleBulkAssign} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 shadow-sm" title="Weisen Sie diesen Stoffen eine andere SiFa oder einen anderen Betriebsarzt zu, als für den Raum standardmäßig gilt.">
            Sonder-Zuständigkeit (SiFa/Arzt) zuweisen
          </button>
        </div>
      )}

      {hazardousSubstances.length === 0 && biologicalSubstances.length === 0 && asbestosSubstances.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-400">
            <ShieldAlert className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Dieser Raum ist noch sicher (und leer)</h2>
          <p className="text-slate-500 max-w-md mb-8">Es wurden noch keine Gefahrstoffe, Biostoffe oder Hautgefährdungen für diesen Arbeitsbereich erfasst.</p>
          <button onClick={() => navigate(`/work-area/${id}/gbu/new`)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-md flex items-center gap-2 text-lg">
            <span className="text-2xl">+</span> Erste Gefährdung erfassen
          </button>
        </div>
      ) : (
        <>
          <div className="flex border-b border-slate-200 justify-between items-center pr-4 bg-slate-50">
            <div className="flex">
              {hazardousSubstances.length > 0 && (
                <button className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'hazardous' ? 'border-blue-600 text-blue-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('hazardous')}>
                  Gefahrstoffe ({hazardousSubstances.length})
                </button>
              )}
              {biologicalSubstances.length > 0 && (
                <button className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'biological' ? 'border-blue-600 text-blue-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('biological')}>
                  Biostoffe ({biologicalSubstances.length})
                </button>
              )}
              {asbestosSubstances.length > 0 && (
                <button className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'asbestos' ? 'border-red-600 text-red-800 bg-red-50/50' : 'border-transparent text-red-400 hover:text-red-700'}`} onClick={() => setActiveTab('asbestos')}>
                  <ShieldAlert className="w-4 h-4" /> Asbest ({asbestosSubstances.length})
                </button>
              )}
            </div>
            
            {activeTab === 'hazardous' && (
              <div className="relative flex items-center gap-3">
                <button onClick={() => setShowColSettings(!showColSettings)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors">
                  <Settings className="w-4 h-4" /> Spalten
                </button>
                {showColSettings && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2">
                    {allHazardColumns.map(col => (
                      <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                        <input type="checkbox" checked={visibleColumns.includes(col)} onChange={() => toggleColumn(col)} className="rounded" /> {col}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

      {/* TRGS 510 Warnbanner */}
      {areaConflicts.length > 0 && activeTab === 'hazardous' && (
        <div className="mb-6 bg-red-100 border border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            TRGS 510 Zusammenlagerungsverbote erkannt!
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {areaConflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
            <th className="p-4 w-12">
              <input type="checkbox" onChange={(e) => onSelectIds(e.target.checked ? currentList.map(i => i.id) : [])} checked={currentList.length > 0 && selectedIds.length === currentList.length} />
            </th>
            {columns.map(col => <th key={col} className="p-4 font-medium">{col}</th>)}
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700">
          {loading ? (
            <tr><td colSpan={columns.length + 1} className="p-4 text-center">Lade Daten...</td></tr>
          ) : currentList.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="p-4 text-center text-slate-500">Keine Daten gefunden.</td></tr>
          ) : (
            currentList.map(item => {
              // Zugriff auf die Stammdaten (Master)
              const ms = item.masterSubstance || {};
              
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => {
                      if (e.target.checked) onSelectIds([...selectedIds, item.id]);
                      else onSelectIds(selectedIds.filter((id: string) => id !== item.id));
                    }} />
                  </td>
                  {activeTab === 'hazardous' ? (
                    <>
                      {columns.includes('Produktname') && <td className="p-4 font-medium text-slate-900">{ms.productName}</td>}
                      {columns.includes('Hersteller') && <td className="p-4">{ms.manufacturer || '-'}</td>}
                      
                      {columns.includes('Verantwortliche') && (
                        <td className="p-4 text-xs">
                          {item.sifaName ? <div className="text-blue-700 font-medium">SiFa: {item.sifaName} (Override)</div> : <div className="text-slate-400">SiFa: Ererbt</div>}
                          {item.betriebsarztName ? <div className="text-blue-700 font-medium">Arzt: {item.betriebsarztName} (Override)</div> : <div className="text-slate-400">Arzt: Ererbt</div>}
                        </td>
                      )}

                      {columns.includes('Compliance') && (
                        <td className="p-4">
                          <div className="group relative inline-block cursor-help">
                            {(() => {
                              const isRed = ms.isMutterschutzRelevant || ms.isJugendschutzRelevant || workAreaInfo?.gasType;
                              const isOrange = !isRed && (ms.isAcuteToxic || workAreaInfo?.dustExposureType);
                              let message = 'Stoff sicher';
                              
                              if (workAreaInfo?.gasType) message = `Gefahr: ${workAreaInfo.gasType} (BetrSichV)`;
                              else if (ms.isMutterschutzRelevant || ms.isJugendschutzRelevant) message = 'Beschäftigungsverbot Jugendliche/Schwangere';
                              else if (ms.isAcuteToxic) message = 'Prüfung durch SiFa erforderlich (Akut Toxisch)';
                              else if (workAreaInfo?.dustExposureType) message = 'Staub-Exposition (TRGS 553/559)';
                              
                              return (
                                <>
                                  <span className={`flex items-center justify-center w-6 h-6 rounded-full border ${isRed ? 'bg-red-100 text-red-600 border-red-300' : isOrange ? 'bg-orange-100 text-orange-600 border-orange-300' : 'bg-green-100 text-green-600 border-green-300'}`}>
                                    {isRed || isOrange ? <ShieldAlert className="w-3 h-3" /> : <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      )}
                      
                      {columns.includes('Vorsorge') && (
                        <td className="p-4">
                          {(ms.isKrebserzeugend || ms.isMutagen || ms.isReproduktionstoxisch) ? (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold border border-red-200">Pflichtvorsorge</span>
                          ) : <span className="text-slate-300 text-xs">-</span>}
                        </td>
                      )}
                      
                      {columns.includes('H-Sätze') && <td className="p-4"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-mono">{ms.hPhrases}</span></td>}
                      
                      {/* Phase 5: WGK & LGK */}
                      {columns.includes('WGK/LGK') && (
                        <td className="p-4 text-xs font-medium">
                          {ms.wgk ? <div className="mb-1 text-blue-700">WGK: {ms.wgk}</div> : <div className="mb-1 text-slate-400">WGK: -</div>}
                          {ms.storageClass ? <div className="text-purple-700">LGK: {ms.storageClass}</div> : <div className="text-slate-400">LGK: -</div>}
                        </td>
                      )}

                      {columns.includes('EMKG') && <td className="p-4">{ms.emkgRating || '-'}</td>}
                      {columns.includes('AGW (TRGS 900)') && <td className="p-4 font-mono">{ms.agwValue || '-'}</td>}
                      
                      {/* TRGS 510 Mengenwarnung */}
                      {columns.includes('Lagermenge') && (
                        <td className="p-4 font-mono">
                          <div className="flex items-center gap-2">
                            {item.annualAmount || 0} kg
                            {item.maxStorageAmount && item.annualAmount > item.maxStorageAmount && (
                              <span title={`Maximum ${item.maxStorageAmount} kg (TRGS 510)`} className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold animate-pulse border border-red-300">
                                <AlertTriangle className="w-3 h-3" /> Limit!
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      
                      {/* TRGS 600 Substitution */}
                      {columns.includes('Substitutionsprüfung') && (
                        <td className="p-4 text-xs text-slate-600 max-w-[150px] truncate" title={item.substitutionCheck || 'Noch nicht geprüft'}>
                          {item.substitutionCheck ? '✓ Geprüft' : <span className="text-orange-500">Ausstehend</span>}
                        </td>
                      )}

                      {/* Phase 5: Medien & Notizen */}
                      {columns.includes('Medien') && (
                        <td className="p-4 text-xs">
                          {item.notes && <div className="text-slate-600 truncate max-w-[120px]" title={item.notes}>📝 {item.notes}</div>}
                          <div className="text-blue-600 font-medium cursor-pointer mt-1 hover:underline flex items-center gap-1">
                            📸 1 Foto
                          </div>
                        </td>
                      )}

                      {/* Custom Fields (JSON) */}
                      {columns.includes('Zusatzfelder') && (
                        <td className="p-4 text-xs">
                          {(() => {
                            if (!item.customFields) return '-';
                            try {
                              const parsed = JSON.parse(item.customFields);
                              return Object.entries(parsed).map(([k,v]) => `${k}: ${v}`).join(', ') || '-';
                            } catch { return 'Fehler'; }
                          })()}
                        </td>
                      )}

                      {/* Aktionen: Modul 15 Klonen & Modul 18 Freigabe & Word-Export */}
                      {columns.includes('Aktionen') && (
                        <td className="p-4 flex gap-2 items-center">
                          <button onClick={() => {
                            const data = {
                              type: activeTab === 'hazardous' ? 'GEFAHRSTOFF' : 'BIOSTOFF',
                              productName: ms.productName,
                              workAreaName: workAreaInfo?.name,
                              hazards: ms.hPhrases || 'Nicht angegeben',
                              precautions: 'Keine spezifischen P-Sätze hinterlegt.',
                              effectivenessChecks: item.effectivenessChecks || []
                            };
                            generateBetriebsanweisung(data);
                          }} className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors" title="Betriebsanweisung als Word (.docx) exportieren">
                            <FileText className="w-4 h-4" />
                          </button>
                          
                          {!item.juridicalApprovalBy && (
                            <button onClick={async () => {
                              if (!confirm("Ich bestätige die juristische Richtigkeit dieser Zuweisung. Dies wird rechtskräftig protokolliert.")) return;
                              await fetch(`http://localhost:3000/api/substances/${item.id}/approve`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}` }
                              });
                              alert("Freigabe erteilt und im Audit-Log vermerkt.");
                              window.location.reload(); 
                            }} className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded font-medium shadow-sm transition-colors" title="Juristische Freigabe erteilen">
                              Freigeben
                            </button>
                          )}
                          <button onClick={() => handleClone(item.id)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors" title="Diesen Stoff duplizieren">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors" title="Löschen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </>
                  ) : activeTab === 'biological' ? (
                    <>
                      {columns.includes('Biostoff') && <td className="p-4 font-bold text-slate-800">{item.name}</td>}
                      {columns.includes('Tätigkeit') && (
                        <td className="p-4">
                          {item.isTargetedActivity ? 
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold border border-purple-200">Gezielt</span> : 
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">Ungezielt</span>
                          }
                        </td>
                      )}
                      {columns.includes('Risikogruppe') && (
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${item.riskGroup >= 3 ? 'bg-red-100 text-red-800 border-red-300' : item.riskGroup === 2 ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                            RG {item.riskGroup}
                          </span>
                        </td>
                      )}
                      {columns.includes('Schutzstufe') && (
                        <td className="p-4">
                          <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold">
                            Stufe {item.protectionLevel}
                          </span>
                        </td>
                      )}
                      {columns.includes('Übertragung') && (
                        <td className="p-4 text-sm text-slate-600">{item.transmissionPath || '-'}</td>
                      )}
                      {columns.includes('Impfangebot') && (
                        <td className="p-4">
                          {item.vaccinationOffer === 'PFLICHTVORSORGE' ? (
                            <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">
                              <AlertTriangle className="w-3 h-3" /> Pflicht
                            </span>
                          ) : item.vaccinationOffer === 'ANGEBOTSVORSORGE' ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-200">Angebot</span>
                          ) : <span className="text-slate-400 text-xs">-</span>}
                        </td>
                      )}
                      {columns.includes('Aktionen') && (
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button className="text-slate-400 hover:text-blue-600 p-1.5"><Settings className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors" title="Löschen">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      {columns.includes('Gefährdungsbereich') && (
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-600" /> 
                            {item.masterSubstance?.productName || item.productName || 'Asbest'}
                          </div>
                        </td>
                      )}
                      {columns.includes('Tätigkeit') && (
                        <td className="p-4">
                          {item.asbestosActivity === 'Umfangreiche Sanierung' ? (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-bold border border-red-300 flex items-center w-max gap-1">
                              <AlertTriangle className="w-3 h-3" /> Umfangreiche Sanierung (Abschottung)
                            </span>
                          ) : (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-xs font-bold border border-orange-300 flex items-center w-max gap-1">
                              <Settings className="w-3 h-3" /> Kleinsttätigkeit (BT-Verfahren)
                            </span>
                          )}
                        </td>
                      )}
                      {columns.includes('Dokumente') && (
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => navigate(`/work-area/${id}/asbestos/${item.id}/document/ba`)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
                              <FileText className="w-3 h-3" /> Betriebsanweisung (TRGS 555)
                            </button>
                            <button onClick={() => navigate(`/work-area/${id}/asbestos/${item.id}/document/checklist`)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
                              <ShieldAlert className="w-3 h-3" /> GBU Checkliste ausfüllen
                            </button>
                          </div>
                        </td>
                      )}
                      {columns.includes('Aktionen') && (
                        <td className="p-4">
                          <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors flex items-center gap-1 font-medium">
                            <Trash2 className="w-4 h-4" /> Löschen
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </>
      )}
    </div>
  );
};