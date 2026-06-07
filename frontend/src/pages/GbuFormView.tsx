import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, AlertTriangle, ShieldCheck, CheckCircle, Upload, FileText, Settings, ShieldAlert, Users } from 'lucide-react';
import { H_PHRASES_CATALOG, calculateHazardGroup, calculateVolatility, calculateProtectionLevel, getProtectionLevelDescription, getSkinProtectionMeasures } from '../utils/emkg';
import { getGuidelinesByLevel } from '../utils/emkgCatalog';

export const GbuFormView = () => {
  const { id } = useParams(); // workAreaId
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [substanceType, setSubstanceType] = useState('GEFAHRSTOFF');
  
  // Zentralkatalog (Master)
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [sdbDate, setSdbDate] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [autoMailToManufacturer, setAutoMailToManufacturer] = useState(false);
  const [selectedHPhrases, setSelectedHPhrases] = useState<string[]>([]);
  const [isMutterschutzRelevant, setIsMutterschutzRelevant] = useState(false);
  const [isMixture, setIsMixture] = useState(false);
  const [involvedPersons, setInvolvedPersons] = useState('');
  const [sifaName, setSifaName] = useState('');
  const [betriebsarztName, setBetriebsarztName] = useState('');
  const [auditorName, setAuditorName] = useState('');
  // EMKG Berechnungswerte
  const [hazardGroup, setHazardGroup] = useState('-');
  const [physicalState, setPhysicalState] = useState('Flüssigkeit');
  
  // Schritt 2 (Menge & Freisetzung)
  const [activityName, setActivityName] = useState('');
  const [amountClass, setAmountClass] = useState('Klein'); // Klein (g/ml), Mittel (kg/l), Groß (t/m3)
  const [boilingPoint, setBoilingPoint] = useState<number | ''>('');
  const [operatingTemp, setOperatingTemp] = useState<number>(20);
  const [vaporPressure, setVaporPressure] = useState<number | ''>('');
  const [isSprayed, setIsSprayed] = useState(false);
  const [isRoomTemp, setIsRoomTemp] = useState(true);
  const [dustiness, setDustiness] = useState('Mittel'); // Niedrig, Mittel, Hoch
  
  // Stäube & Gase
  const [dustType, setDustType] = useState('A-Staub');
  const [hasExtraction, setHasExtraction] = useState(false);
  const [gasType, setGasType] = useState('Druckgasflasche');
  const [gasSecured, setGasSecured] = useState(true);
  const [gasBelowGround, setGasBelowGround] = useState(false);
  const [co2RoomSize, setCo2RoomSize] = useState<number | ''>('');
  const [co2Amount, setCo2Amount] = useState<number | ''>('');

  // Schritt 3 (Resultierende Maßnahmenstufe)
  const [protectionLevel, setProtectionLevel] = useState(0);
  
  // STOP
  const [stopSubstitution, setStopSubstitution] = useState('');
  const [stopTechnical, setStopTechnical] = useState('');
  
  // Schritt 4: Wirksamkeitsprüfung
  const [effectivenessChecks, setEffectivenessChecks] = useState<any[]>([]);
  const [bulkAuditor, setBulkAuditor] = useState('');
  const [bulkDate, setBulkDate] = useState('');

  // Biostoffe & Asbest (Bleiben erhalten)
  const [bioTargetedActivity, setBioTargetedActivity] = useState(false);
  const [bioRiskGroup, setBioRiskGroup] = useState<string>('');
  const [isTargetedActivity, setIsTargetedActivity] = useState<boolean>(false);
  const [transmissionPath, setTransmissionPath] = useState<string>('');
  const [vaccinationOffer, setVaccinationOffer] = useState<string>('');
  const [asbestosActivity, setAsbestosActivity] = useState('Kleinsttätigkeit');
  const [btVerfahren, setBtVerfahren] = useState('');

  // TRGS 401 Hautschutz & Feuchtarbeit (Neu nach EMKG Screenshot)
  const [skinContactExcluded, setSkinContactExcluded] = useState(false);
  const [isWetWork, setIsWetWork] = useState(false);
  const [skinContactArea, setSkinContactArea] = useState('klein'); // 'klein' | 'gross'
  const [skinContactDuration, setSkinContactDuration] = useState('<=15'); // '<=15' | '>15'
  const [skinRiskLevel, setSkinRiskLevel] = useState(1);

  // Phase 5: TRGS 510, WGK, Grenzwerte & Medien
  const [wgk, setWgk] = useState<string>('');
  const [storageClass, setStorageClass] = useState<string>('');
  const [chemicalType, setChemicalType] = useState<string>('');
  const [agwValue, setAgwValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [mediaUploaded, setMediaUploaded] = useState<string | boolean>(false);
  
  const [isScanningSdb, setIsScanningSdb] = useState(false);
  const [sdbScanResult, setSdbScanResult] = useState<string | null>(null);
  const [sdbFile, setSdbFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Abteilungsspezifische Zuständigkeiten beim Laden abrufen
  useEffect(() => {
    if (id) {
      fetch('http://localhost:3000/api/tenants')
        .then(res => res.json())
        .then(tenants => {
          let foundWa = null;
          for (const t of tenants) {
            for (const loc of t.locations) {
              const findInAreas = (areas: any[]): any => {
                for (const wa of areas) {
                  if (wa.id === id) return wa;
                  if (wa.children && wa.children.length > 0) {
                    const found = findInAreas(wa.children);
                    if (found) return found;
                  }
                }
                return null;
              };
              foundWa = findInAreas(loc.workAreas || []);
              if (foundWa) break;
            }
            if (foundWa) break;
          }
          
          if (foundWa) {
            setSifaName(foundWa.sifaName || '');
            setBetriebsarztName(foundWa.betriebsarztName || '');
            setAuditorName(foundWa.auditorName || '');
            
            // Lokale States nur belegen, falls noch nicht händisch überschrieben
            setResponsiblePerson(prev => prev || foundWa.sifaName || '');
            setInvolvedPersons(prev => prev || foundWa.auditorName || '');
            setBulkAuditor(prev => prev || foundWa.auditorName || '');
          }
        })
        .catch(console.error);
    }
  }, [id]);

  // Initialisieren der Wirksamkeitsprüfung wenn sich die Stufe ändert
  useEffect(() => {
    if (protectionLevel > 0) {
      const guidelines = getGuidelinesByLevel(protectionLevel);
      setEffectivenessChecks(prev => {
        // Erhaltene Werte nicht überschreiben, nur neue hinzufügen
        const existingCodes = prev.map(p => p.guidelineCode);
        const newChecks = guidelines.filter(g => !existingCodes.includes(g.code)).map(g => ({
          guidelineCode: g.code,
          title: g.title,
          category: g.category,
          auditor: '',
          checkedAt: '',
          nextReviewDate: '',
          notes: '',
          isActive: true
        }));
        return [...prev, ...newChecks];
      });
    }
  }, [protectionLevel]);

  // Live-Berechnung bei Änderungen in Schritt 1 (Gefahrstoff)
  useEffect(() => {
    setHazardGroup(calculateHazardGroup(selectedHPhrases));
    // Automatische Mutterschutz-Erkennung (H360, H362 etc.)
    const mutterschutzCodes = ['H360', 'H360F', 'H360D', 'H360FD', 'H360Fd', 'H360Df', 'H362'];
    const hasMutterschutz = selectedHPhrases.some(p => mutterschutzCodes.includes(p));
    if (hasMutterschutz) setIsMutterschutzRelevant(true);
  }, [selectedHPhrases]);

  // Live-Berechnung bei Änderungen in Schritt 2 (Gefahrstoff)
  useEffect(() => {
    if (substanceType === 'GEFAHRSTOFF') {
      const volatility = calculateVolatility(
        physicalState, 
        dustiness, 
        boilingPoint === '' ? null : boilingPoint, 
        vaporPressure === '' ? null : vaporPressure,
        isSprayed
      );
      const level = calculateProtectionLevel(hazardGroup, amountClass, volatility);
      setProtectionLevel(level);
    }
  }, [hazardGroup, amountClass, physicalState, dustiness, boilingPoint, vaporPressure, isSprayed, substanceType]);

  // Live-Berechnung TRGS 401 (Hautschutz)
  useEffect(() => {
    if (substanceType === 'HAUTSCHUTZ') {
      import('../utils/emkg').then(module => {
        const risk = module.calculateSkinRisk(skinContactExcluded, isWetWork, skinContactArea, skinContactDuration);
        setSkinRiskLevel(risk);
      });
    }
  }, [skinContactExcluded, isWetWork, skinContactArea, skinContactDuration, substanceType]);

  const toggleHPhrase = (code: string) => {
    setSelectedHPhrases(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };
  const handleSaveWorkAreaDefaults = async () => {
    if (!id) return;
    try {
      const response = await fetch(`http://localhost:3000/api/tenants/work-areas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer dummy-token` },
        body: JSON.stringify({
          sifaName,
          betriebsarztName,
          auditorName
        })
      });
      if (response.ok) {
        alert('Abteilungs-Standards erfolgreich gespeichert!');
      } else {
        alert('Fehler beim Speichern der Abteilungs-Standards.');
      }
    } catch (err) {
      alert('Verbindungsfehler beim Speichern.');
    }
  };

  const handleApplyWorkAreaDefaultsToAll = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/substances/workarea/${id}/bulk-persons`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          responsiblePerson: sifaName, 
          involvedPersons: auditorName,
          sifaName,
          betriebsarztName,
          auditorName
        })
      });
      
      if (!response.ok) throw new Error("Fehler beim Übernehmen");
      alert("Erfolgreich für alle GBU und Wirksamkeitsprüfungen der Abteilung übernommen!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let payload: any = {
        type: substanceType === 'BIOSTOFF' ? 'biological' : 'hazardous',
        productName,
        annualAmount: 0
      };

      if (substanceType === 'BIOSTOFF') {
        payload = {
          type: 'biological',
          name: productName,
          riskGroup: parseInt(bioRiskGroup) || 1,
          protectionLevel: parseInt(bioRiskGroup) === 3 && isTargetedActivity ? 3 : parseInt(bioRiskGroup) === 3 ? 2 : parseInt(bioRiskGroup) || 1,
          isTargetedActivity,
          transmissionPath,
          vaccinationOffer
        };
      } else {
        payload = {
          ...payload,
          manufacturer,
          sdbDate: sdbDate ? new Date(sdbDate).toISOString() : undefined,
          nextReviewDate: nextReviewDate ? new Date(nextReviewDate).toISOString() : undefined,
          responsiblePerson,
          autoMailToManufacturer,
          hPhrases: selectedHPhrases.join(', '),
          activityName,
          physicalState,
          emkgInhalation: hazardGroup,
          emkgSkin: skinRiskLevel.toString(),
          bioTargetedActivity,
          asbestosActivity: substanceType === 'ASBEST' ? asbestosActivity : undefined,
          btVerfahren: substanceType === 'ASBEST' ? btVerfahren : undefined,
          stopSubstitution,
          stopTechnical,
          customFields: { 
            protectionLevel, 
            amountClass,
            dustType: physicalState === 'Staub' ? dustType : undefined,
            hasExtraction: physicalState === 'Staub' ? hasExtraction : undefined,
            gasType: physicalState === 'Gas' ? gasType : undefined,
            gasSecured: physicalState === 'Gas' && gasType === 'Druckgasflasche' ? gasSecured : undefined,
            gasBelowGround: physicalState === 'Gas' && gasType === 'Flüssiggas' ? gasBelowGround : undefined,
            co2RoomSize: physicalState === 'Gas' && gasType === 'CO2' ? co2RoomSize : undefined,
            co2Amount: physicalState === 'Gas' && gasType === 'CO2' ? co2Amount : undefined,
            isSprayed: physicalState === 'Flüssigkeit' ? isSprayed : undefined,
            boilingPoint: physicalState === 'Flüssigkeit' ? boilingPoint : undefined,
            vaporPressure: physicalState === 'Flüssigkeit' ? vaporPressure : undefined,
            isRoomTemp: physicalState === 'Flüssigkeit' ? isRoomTemp : undefined,
            operatingTemp: physicalState === 'Flüssigkeit' && !isRoomTemp ? operatingTemp : undefined,
            mediaUrl: typeof mediaUploaded === 'string' ? mediaUploaded : undefined,
          },
          isKrebserzeugend: hazardGroup === 'E' || (physicalState === 'Staub' && dustType === 'Hartholzstaub'),
          isMutagen: hazardGroup === 'E',
          isMutterschutzRelevant,
          isMixture,
          involvedPersons,
          // TRGS 401
          skinContactExcluded,
          isWetWork,
          skinContactArea,
          skinContactDuration,
          // Phase 5: WGK, LGK, Grenzwerte, Notizen
          wgk,
          storageClass,
          chemicalType,
          agwValue,
          notes,
          // Modul 20: Wirksamkeitsprüfung
          effectivenessChecks: effectivenessChecks.filter(c => c.isActive).map(c => ({
            guidelineCode: c.guidelineCode,
            title: c.title,
            auditor: c.auditor,
            checkedAt: c.checkedAt ? new Date(c.checkedAt).toISOString() : undefined,
            nextReviewDate: c.nextReviewDate ? new Date(c.nextReviewDate).toISOString() : undefined,
            notes: c.notes
          }))
        };
      }

      const response = await fetch(`http://localhost:3000/api/substances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer dummy-token` },
        body: JSON.stringify({
          workAreaId: id,
          substanceType,
          ...payload
        })
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.trgsWarnings && resData.trgsWarnings.length > 0) {
          alert('STOFF GESPEICHERT! ABER ACHTUNG:\\n\\n' + resData.trgsWarnings.join('\\n'));
        } else {
          alert('GBU und Stoff erfolgreich angelegt!');
        }
        navigate(`/work-area/${id}`);
      } else {
        const errorData = await response.json();
        alert('Fehler: ' + (errorData.error || 'Unbekannter Fehler'));
      }
    } catch (err) {
      alert('Verbindungsfehler beim Speichern der GBU');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Neue Gefährdungsbeurteilung</h1>
          <p className="text-slate-500">Intelligente EMKG Experten-Logik nach TRGS 400 & TRGS 401</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* SCHRITT 1 */}
        {step === 1 && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><FlaskConical className="text-blue-600" /> Schritt 1: Stoff & Typisierung</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Was möchten Sie erfassen?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['GEFAHRSTOFF', 'BIOSTOFF', 'ASBEST', 'HAUTSCHUTZ'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSubstanceType(type)}
                      className={`p-3 border rounded-lg text-sm font-medium transition-all ${substanceType === type ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* SDB Upload (KI Scanner) */}
              {substanceType === 'GEFAHRSTOFF' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:bg-blue-100 transition-colors mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    ✨ KI-Scanner
                  </div>
                  <div className="mx-auto flex justify-center mb-3">
                    <div className="bg-white p-4 rounded-full text-blue-600 shadow-sm">
                      <FileText className="w-8 h-8" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">Sicherheitsdatenblatt (PDF) hochladen</h3>
                  <p className="text-slate-600 text-sm mb-4">Laden Sie das SDB hoch. Die KI extrahiert alle relevanten Daten für Sie!</p>
                  
                  {isScanningSdb ? (
                    <div className="text-blue-600 font-bold animate-pulse">KI liest das Dokument... Bitte warten.</div>
                  ) : (
                    <div>
                      <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg cursor-pointer transition-colors inline-block">
                        PDF auswählen
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setSdbFile(file);
                            setIsScanningSdb(true);
                            setSdbScanResult(null);
                            
                            try {
                              const formData = new FormData();
                              formData.append('sdbFile', file);
                              
                              const res = await fetch('http://localhost:3000/api/sdb/parse', {
                                method: 'POST',
                                body: formData
                              });
                              
                              const data = await res.json();
                              if (data.error) throw new Error(data.error);
                              
                              setProductName(data.productName || '');
                              if (data.hPhrases) setSelectedHPhrases(data.hPhrases);
                              if (data.wgk) setWgk(data.wgk);
                              if (data.storageClass) setStorageClass(data.storageClass);
                              if (data.chemicalType) setChemicalType(data.chemicalType);
                              if (data.physicalState) setPhysicalState(data.physicalState);
                              
                              setSdbScanResult(data.notes || (data.isDemo ? 'Demo-Modus aktiv: SDB wurde simuliert ausgelesen.' : 'Erfolgreich ausgelesen!'));
                            } catch (err: any) {
                              setSdbScanResult('Fehler beim KI-Scan: ' + err.message);
                            } finally {
                              setIsScanningSdb(false);
                            }
                          }}
                        />
                      </label>
                      <label className="ml-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg cursor-pointer transition-colors inline-block">
                        Ohne KI anhängen
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSdbFile(file);
                              setSdbScanResult('Datei klassisch angehängt (ohne KI).');
                            }
                          }}
                        />
                      </label>
                      {sdbFile && (
                        <div className="mt-4 p-3 bg-white border border-green-200 rounded text-sm text-green-800 text-left flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Angehängte Datei: <strong>{sdbFile.name}</strong>
                        </div>
                      )}
                      {sdbScanResult && !sdbScanResult.includes('klassisch') && (
                        <div className="mt-4 p-3 bg-white border border-blue-200 rounded text-sm text-blue-800 text-left">
                          <strong>Hinweis:</strong> {sdbScanResult}
                          <div className="text-xs text-slate-500 mt-1">Sie können die eingetragenen Werte unten jederzeit händisch anpassen. Um den Demomodus zu deaktivieren, hinterlegen Sie in den Einstellungen einen API-Key.</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Biostoff-Erfassung (Schritt 1) */}
              {substanceType === 'BIOSTOFF' && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center mb-8">
                  <div className="mx-auto flex justify-center mb-3">
                    <div className="bg-white p-4 rounded-full text-emerald-600 shadow-sm">
                      <Settings className="w-8 h-8" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">Tätigkeitsbasierte Erfassung</h3>
                  <p className="text-slate-600 text-sm">Geben Sie die geplante Tätigkeit ein. Das System schlägt automatisch relevante Erreger, Risikogruppen und Schutzstufen vor!</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {substanceType === 'HAUTSCHUTZ' ? 'Produktname (Hautschutz/Reinigungsmittel) *' : 
                   substanceType === 'BIOSTOFF' ? 'Welche Tätigkeit wird ausgeübt? (z.B. Reinigung Sanitär) *' : 
                   substanceType === 'ASBEST' ? 'Gefährdeter Bereich / Hotspot' :
                   'Produkt- / Stoffname *'}
                </label>
                {substanceType === 'ASBEST' ? (
                  <select value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 font-bold text-lg p-3 bg-slate-50">
                    <option value="">Bitte wählen...</option>
                    <option value="Heizungskeller / Rohrisolierungen (Schwach gebunden)">Heizungskeller / Rohrisolierungen (Schwach gebunden)</option>
                    <option value="Badezimmer / Fliesenkleber / Spachtelmassen (Fest gebunden)">Badezimmer / Fliesenkleber / Spachtelmassen (Fest gebunden)</option>
                    <option value="Dach / Fassade / Wellplatten (Fest gebunden)">Dach / Fassade / Wellplatten (Fest gebunden)</option>
                    <option value="Bodenbeläge / Floor-Flex-Platten (Fest gebunden)">Bodenbeläge / Floor-Flex-Platten (Fest gebunden)</option>
                    <option value="Sonstiges Asbest">Sonstiges</option>
                  </select>
                ) : substanceType === 'BIOSTOFF' ? (
                  <select value={productName} onChange={(e) => {
                    const val = e.target.value;
                    setProductName(val);
                    setIsTargetedActivity(false);
                    
                    switch (val) {
                      case 'Kläranlage / Abwasser':
                        setBioRiskGroup('2'); setTransmissionPath('Kontakt/Schmier'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: E. Coli, Norovirus, Hepatitis A, Polio. Schutzstufe 2!'); break;
                      case 'Pflege / Medizin (Krankenhaus, Arzt)':
                        setBioRiskGroup('3'); setTransmissionPath('Blut/Körperflüssigkeiten'); setVaccinationOffer('PFLICHTVORSORGE');
                        setNotes('Vorgeschlagene Erreger: MRSA, Hepatitis B/C, HIV, Tuberkulose. Schutzstufe 2/3!'); break;
                      case 'Körpernahe Dienstleistungen (Tätowierer, Physio)':
                        setBioRiskGroup('2'); setTransmissionPath('Blut/Körperflüssigkeiten'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Hepatitis B, Hautpilze. Schutzstufe 2!'); break;
                      case 'Polizei, Justiz, Sicherheitsdienste (Angespuckt werden)':
                        setBioRiskGroup('3'); setTransmissionPath('Luft/Tröpfchen'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Hepatitis B/C, Tuberkulose, HIV. Schutzstufe 2!'); break;
                      case 'Streetworker, Stadtreinigung, Entsorgung (Drogen/Spritzen)':
                        setBioRiskGroup('3'); setTransmissionPath('Blut/Körperflüssigkeiten'); setVaccinationOffer('PFLICHTVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Hepatitis B/C, HIV, Tetanus. Stichfeste Handschuhe (Schutzstufe 2/3)!'); break;
                      case 'Grünpflege, Waldarbeit (Giftpflanzen, Tiere)':
                        setBioRiskGroup('2'); setTransmissionPath('Vektoren'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: FSME, Borreliose (Zecken), Hantavirus. Hinweis: Auch Giftpflanzen (Riesenbärenklau, Eichenprozessionsspinner) beachten!'); break;
                      case 'Reinigung (Sanitäranlagen)':
                        setBioRiskGroup('2'); setTransmissionPath('Kontakt/Schmier'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: E. Coli, Norovirus, Schimmelpilze. Schutzstufe 2!'); break;
                      case 'Tierhilfe, Tierärzte, Landwirtschaft':
                        setBioRiskGroup('3'); setTransmissionPath('Vektoren'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Tollwut, Q-Fieber, Zoonosen. Schutzstufe 2!'); break;
                      case 'Küche, Lebensmittel':
                        setBioRiskGroup('2'); setTransmissionPath('Kontakt/Schmier'); setVaccinationOffer('PFLICHTVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Salmonellen, Campylobacter. Infektionsschutzgesetz beachten!'); break;
                      case 'Hotel und Gastronomie':
                        setBioRiskGroup('2'); setTransmissionPath('Kontakt/Schmier'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Norovirus, Legionellen (Duschen), Salmonellen. Schutzstufe 2!'); break;
                      case 'Schwimmbad- und Saunabetrieb':
                        setBioRiskGroup('2'); setTransmissionPath('Kontakt/Schmier'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Legionellen, Pseudomonaden, Fußpilz, HPV (Warzenviren). Schutzstufe 2!'); break;
                      case 'ÖPNV (Bus/Bahn)':
                        setBioRiskGroup('2'); setTransmissionPath('Luft/Tröpfchen'); setVaccinationOffer('ANGEBOTSVORSORGE');
                        setNotes('Vorgeschlagene Erreger: Influenza, Coronaviren, Tuberkulose.'); break;
                      case 'Labor (gezielte Tätigkeiten)':
                        setBioRiskGroup('2'); setIsTargetedActivity(true); setTransmissionPath(''); setVaccinationOffer('');
                        setNotes('Bitte Risikogruppe und Erreger anhand der BioStoffV und der gezielten Tätigkeit manuell festlegen.'); break;
                      default:
                        setBioRiskGroup('1'); setTransmissionPath(''); setVaccinationOffer(''); setNotes(''); break;
                    }
                  }} className="w-full border-slate-300 rounded-md focus:ring-emerald-600 font-bold text-lg p-3 bg-emerald-50">
                    <option value="">Bitte wählen...</option>
                    <option value="Kläranlage / Abwasser">Kläranlage / Abwasser</option>
                    <option value="Pflege / Medizin (Krankenhaus, Arzt)">Pflege / Medizin (Krankenhaus, Arzt)</option>
                    <option value="Körpernahe Dienstleistungen (Tätowierer, Physio)">Körpernahe Dienstleistungen (Tätowierer, Physio)</option>
                    <option value="Polizei, Justiz, Sicherheitsdienste (Angespuckt werden)">Polizei, Justiz, Sicherheitsdienste (Angespuckt werden)</option>
                    <option value="Streetworker, Stadtreinigung, Entsorgung (Drogen/Spritzen)">Streetworker, Stadtreinigung, Entsorgung (Drogen/Spritzen)</option>
                    <option value="Grünpflege, Waldarbeit (Giftpflanzen, Tiere)">Grünpflege, Waldarbeit (Giftpflanzen, Tiere)</option>
                    <option value="Reinigung (Sanitäranlagen)">Reinigung (Sanitäranlagen)</option>
                    <option value="Tierhilfe, Tierärzte, Landwirtschaft">Tierhilfe, Tierärzte, Landwirtschaft</option>
                    <option value="Küche, Lebensmittel">Küche, Lebensmittel</option>
                    <option value="Hotel und Gastronomie">Hotel und Gastronomie</option>
                    <option value="Schwimmbad- und Saunabetrieb">Schwimmbad- und Saunabetrieb</option>
                    <option value="ÖPNV (Bus/Bahn)">ÖPNV (Bus/Bahn)</option>
                    <option value="Labor (gezielte Tätigkeiten)">Labor (gezielte Tätigkeiten)</option>
                    <option value="Sonstige Tätigkeit">Sonstige Tätigkeit</option>
                  </select>
                ) : (
                  <div className="space-y-4">
                    <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 focus:border-blue-600 font-bold text-lg p-3" placeholder="z.B. Aceton 99% oder Handreiniger X" />
                    
                    {substanceType === 'GEFAHRSTOFF' && (
                      <div className="flex items-center gap-6 mt-2">
                        <label className="text-sm font-medium text-slate-700">Typ:</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="mixtureType" checked={!isMixture} onChange={() => setIsMixture(false)} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-sm">Stoff</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="mixtureType" checked={isMixture} onChange={() => setIsMixture(true)} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-sm">Gemisch/Zubereitung</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NEU: Lieferant & SDB-Metadaten (nur für Gefahrstoffe) */}
              {substanceType === 'GEFAHRSTOFF' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-4">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Lieferant & Sicherheitsdatenblatt</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Lieferant / Hersteller</label>
                      <input type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600" placeholder="z.B. Fa. Mustermann" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Datum des aktuellen SDBs</label>
                      <input type="date" value={sdbDate} onChange={e => {
                        setSdbDate(e.target.value);
                        // Automatische Berechnung: +3 Jahre für nächste Überprüfung
                        if (e.target.value) {
                          const date = new Date(e.target.value);
                          date.setFullYear(date.getFullYear() + 3);
                          setNextReviewDate(date.toISOString().split('T')[0]);
                        }
                      }} className="w-full border-slate-300 rounded-md focus:ring-blue-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nächste Überprüfung fällig am</label>
                      <input type="date" value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600" />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-start gap-2">
                    <input type="checkbox" id="autoMail" checked={autoMailToManufacturer} onChange={e => setAutoMailToManufacturer(e.target.checked)} className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                    <label htmlFor="autoMail" className="text-sm text-slate-700">
                      <strong>Automatische Erinnerung aktivieren:</strong> Das System soll rechtzeitig vor Ablauf der Frist eine E-Mail an den Hersteller vorbereiten, um ein aktualisiertes SDB anzufordern.
                    </label>
                  </div>
                  
                  <div className="mt-4 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <input type="checkbox" id="mutterschutz" checked={isMutterschutzRelevant} onChange={e => setIsMutterschutzRelevant(e.target.checked)} className="mt-1 rounded border-rose-300 text-rose-600 focus:ring-rose-600" />
                    <label htmlFor="mutterschutz" className="text-sm text-rose-800 font-medium">
                      Dieser Stoff stellt eine Gefährdung für werdende oder stillende Mütter dar (Mutterschutzgesetz).
                      <span className="block text-xs text-rose-600 font-normal mt-1">Wird bei bestimmten H-Sätzen (z.B. H360) automatisch gesetzt.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Asbest-Erfassung (Assistent) */}
              {substanceType === 'ASBEST' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 mt-4">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-600" /> Objektbezogene Asbest-Erkundung (TRGS 519)</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">1. Gebäudealter: Wurde das Gebäude vor dem 31.10.1993 errichtet?</label>
                      <select className="w-full border-slate-300 rounded-md focus:ring-blue-500" onChange={(e) => {
                        if (e.target.value === 'nein') {
                          alert('Hinweis: Nach 1993 gilt ein Asbest-Verbot. Eine Asbest-Gefährdung ist sehr unwahrscheinlich (außer bei Import-Geräten).');
                        }
                      }}>
                        <option value="">Bitte wählen...</option>
                        <option value="ja">Ja (Generalvermutung für Asbest gilt!)</option>
                        <option value="nein">Nein (Nach Asbestverbot gebaut)</option>
                      </select>
                    </div>

                    {productName && (
                      <div className="bg-white p-4 border border-slate-200 rounded-lg animate-in fade-in">
                        <label className="block text-sm font-bold text-slate-700 mb-2">2. Welche Tätigkeit ist geplant?</label>
                        <div className="space-y-3">
                          <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${asbestosActivity === 'Kleinsttätigkeit' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                            <input type="radio" name="asbestAct" checked={asbestosActivity === 'Kleinsttätigkeit'} onChange={() => setAsbestosActivity('Kleinsttätigkeit')} className="mt-1" />
                            <div>
                              <div className="font-bold text-slate-800">Kleinsttätigkeiten & Begehungen (z.B. Bohren)</div>
                              <div className="text-sm text-slate-500">Verwendung von emissionsarmen Verfahren (z.B. Bohrfix mit H-Sauger). Keine Schwarz-Weiß-Trennung nötig.</div>
                            </div>
                          </label>
                          <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${asbestosActivity === 'Umfangreiche Sanierung' ? 'bg-red-50 border-red-300 ring-1 ring-red-500' : 'border-slate-200'}`}>
                            <input type="radio" name="asbestAct" checked={asbestosActivity === 'Umfangreiche Sanierung'} onChange={() => setAsbestosActivity('Umfangreiche Sanierung')} className="mt-1" />
                            <div>
                              <div className="font-bold text-red-800">Umfangreiche Asbestarbeiten (Abbruch / Sanierung)</div>
                              <div className="text-sm text-red-600">Volle Abschottung, 3-Kammer-Schleuse, Unterdruckhaltegerät und Behördenmeldung (7-Tage) zwingend erforderlich!</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {substanceType === 'BIOSTOFF' && productName && (
                <div className="grid grid-cols-2 gap-6 bg-emerald-50/50 p-6 rounded-lg border border-emerald-200 mt-6 animate-in fade-in">
                  <div className="col-span-2 bg-white p-4 rounded border border-emerald-100 shadow-sm">
                    <h4 className="font-bold text-emerald-800 mb-1">System-Vorschlag basierend auf "{productName}"</h4>
                    <p className="text-sm text-slate-700">{notes}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Ermittelte Risikogruppe</label>
                    <select value={bioRiskGroup} onChange={e => setBioRiskGroup(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-emerald-500 font-bold">
                      <option value="1">RG 1 (Unwahrscheinlich, Krankheit zu verursachen)</option>
                      <option value="2">RG 2 (z.B. E. Coli, Norovirus)</option>
                      <option value="3" className="text-orange-600">RG 3 (z.B. Hepatitis B/C, HIV)</option>
                      <option value="4" className="text-red-600">RG 4 (Schwere Krankheit, keine Behandlung)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Übertragungsweg</label>
                    <select value={transmissionPath} onChange={e => setTransmissionPath(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-emerald-500">
                      <option value="">Bitte wählen...</option>
                      <option value="Luft/Tröpfchen">Luft / Tröpfchen (Aerosol)</option>
                      <option value="Kontakt/Schmier">Kontakt / Schmierinfektion</option>
                      <option value="Blut/Körperflüssigkeiten">Blut / Körperflüssigkeiten</option>
                      <option value="Vektoren">Vektoren (Tiere, Insekten)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded">
                      <input type="checkbox" checked={isTargetedActivity} onChange={e => setIsTargetedActivity(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                      <div>
                        <div className="font-bold text-slate-800">Ist dies eine gezielte Tätigkeit?</div>
                        <div className="text-sm text-slate-500">Nein: Der Kontakt entsteht nur zufällig bei der Arbeit (Standard bei Reinigung). Ja: Der Erreger wird bewusst bearbeitet/vermehrt (Labor).</div>
                      </div>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Arbeitsmedizinische Vorsorge / Impfangebot</label>
                    <select value={vaccinationOffer} onChange={e => setVaccinationOffer(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-emerald-500">
                      <option value="">Keine Angabe</option>
                      <option value="PFLICHTVORSORGE">Pflichtvorsorge (z.B. bei Hepatitis B im KH)</option>
                      <option value="ANGEBOTSVORSORGE">Angebotsvorsorge</option>
                      <option value="WUNSCHVORSORGE">Wunschvorsorge</option>
                    </select>
                  </div>
                </div>
              )}

              {substanceType === 'GEFAHRSTOFF' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Grenzwerte (AGW, MAK, DNEL)</label>
                    <input type="text" value={agwValue} onChange={e => setAgwValue(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-500" placeholder="z.B. 100 mg/m³" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Wassergefährdungsklasse (WGK)</label>
                    <select value={wgk} onChange={e => setWgk(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-500">
                      <option value="">Keine Angabe</option>
                      <option value="1">WGK 1 (schwach wassergefährdend)</option>
                      <option value="2">WGK 2 (deutlich wassergefährdend)</option>
                      <option value="3">WGK 3 (stark wassergefährdend)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Lagerklasse (LGK / TRGS 510)</label>
                    <select value={storageClass} onChange={e => setStorageClass(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-500 font-medium">
                      <option value="">Bitte wählen...</option>
                      <option value="1">1: Explosive Stoffe</option>
                      <option value="2A">2A: Entzündbare Gase</option>
                      <option value="2B">2B: Aerosole</option>
                      <option value="3">3: Entzündbare Flüssigkeiten</option>
                      <option value="4.1A">4.1A: Sonstige explosive Stoffe</option>
                      <option value="4.1B">4.1B: Entzündbare feste Stoffe</option>
                      <option value="4.2">4.2: Selbstentzündliche Stoffe</option>
                      <option value="4.3">4.3: Stoffe, die mit Wasser entzündbare Gase bilden</option>
                      <option value="5.1A">5.1A: Stark oxidierende Stoffe</option>
                      <option value="5.1B">5.1B: Oxidierende Stoffe</option>
                      <option value="5.1C">5.1C: Ammoniumnitrat und zubereitungen</option>
                      <option value="5.2">5.2: Organische Peroxide</option>
                      <option value="6.1A">6.1A: Brennbare, akut toxische Stoffe (Kat. 1/2)</option>
                      <option value="6.1B">6.1B: Nicht brennbare, akut toxische Stoffe (Kat. 1/2)</option>
                      <option value="6.1C">6.1C: Brennbare, akut toxische Stoffe (Kat. 3)</option>
                      <option value="6.1D">6.1D: Nicht brennbare, akut toxische Stoffe (Kat. 3)</option>
                      <option value="6.2">6.2: Ansteckungsgefährliche Stoffe</option>
                      <option value="7">7: Radioaktive Stoffe</option>
                      <option value="8A">8A: Brennbare ätzende Stoffe</option>
                      <option value="8B">8B: Nicht brennbare ätzende Stoffe</option>
                      <option value="10">10: Brennbare Flüssigkeiten</option>
                      <option value="11">11: Brennbare Feststoffe</option>
                      <option value="12">12: Nicht brennbare Flüssigkeiten</option>
                      <option value="13">13: Nicht brennbare Feststoffe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-red-700 mb-1">Typisierung (TRGS 510)</label>
                    <select value={chemicalType} onChange={e => setChemicalType(e.target.value)} className="w-full border-red-300 rounded-md focus:ring-red-500 bg-red-50 text-red-900 font-bold">
                      <option value="">Standard Gefahrstoff</option>
                      <option value="SÄURE">⚠️ SÄURE</option>
                      <option value="LAUGE">⚠️ LAUGE / BASE</option>
                      <option value="LEBENSMITTEL">🍔 Lebensmittel / Futtermittel</option>
                    </select>
                  </div>
                </div>
              )}

              {substanceType === 'GEFAHRSTOFF' && (
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-bold text-slate-700">H-Sätze auswählen (Sicherheitsdatenblatt Kap. 2.2)</label>
                    <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                      Gefährlichkeitsgruppe (EMKG): {hazardGroup}
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {['2', '3', '4'].map(prefix => {
                      const groupPhrases = H_PHRASES_CATALOG.filter(p => p.code.startsWith(`H${prefix}`));
                      if (groupPhrases.length === 0) return null;
                      const title = prefix === '2' ? 'Physikalische Gefahren (200er)' : prefix === '3' ? 'Gesundheitsgefahren (300er)' : 'Umweltgefahren (400er)';
                      
                      return (
                        <details key={prefix} className="group bg-white border border-slate-200 rounded-lg" open={prefix === '3'}>
                          <summary className="flex items-center justify-between p-3 font-bold text-slate-800 cursor-pointer bg-slate-100/50 hover:bg-slate-100">
                            {title}
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {groupPhrases.map(phrase => (
                              <label key={phrase.code} className={`flex items-start gap-2 p-2 border rounded cursor-pointer transition-colors ${selectedHPhrases.includes(phrase.code) ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedHPhrases.includes(phrase.code)} 
                                  onChange={() => toggleHPhrase(phrase.code)} 
                                  className="mt-1 shrink-0"
                                />
                                <div className="text-sm">
                                  <span className="font-bold text-slate-700">{phrase.code}</span>
                                  <p className="text-slate-500 text-xs">{phrase.text}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hautschutz Step 1 entfernt, da EMKG alles in einem Modul bündelt */}

              {/* UNIFIED: Zuständigkeiten & GBU-Erstellung (Für alle Stoffarten) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-6">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> GBU-Erstellung & Zuständigkeiten
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Verantwortliche Person (intern)</label>
                    <input type="text" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600" placeholder="z.B. Max Mustermann (SiFa)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Beteiligte Personen (GBU Erstellung)</label>
                    <input type="text" value={involvedPersons} onChange={e => setInvolvedPersons(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600" placeholder="z.B. Meister Produktion" />
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h4 className="font-bold text-slate-800 text-md mb-2 flex items-center gap-2">
                    🏢 Abteilungs-Standards (einmalig festlegen)
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Hier können Sie die Standard-Zuständigkeiten für diese gesamte Abteilung hinterlegen. 
                    Diese werden bei neuen GBUs automatisch vorgeschlagen.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Fachkraft für Arbeitssicherheit (SiFa)</label>
                      <input type="text" value={sifaName} onChange={e => setSifaName(e.target.value)} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" placeholder="Name der SiFa" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Betriebsarzt</label>
                      <input type="text" value={betriebsarztName} onChange={e => setBetriebsarztName(e.target.value)} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" placeholder="Name des Betriebsarztes" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Standard-Prüfer (Wirksamkeitsprüfung)</label>
                      <input type="text" value={auditorName} onChange={e => setAuditorName(e.target.value)} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" placeholder="Standard-Prüfer" />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={handleSaveWorkAreaDefaults}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded transition-colors"
                    >
                      Als Standard für Abteilung festlegen
                    </button>
                    <button 
                      type="button" 
                      onClick={handleApplyWorkAreaDefaultsToAll}
                      className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded border border-slate-300 transition-colors"
                    >
                      Für alle Stoffe & Prüfungen dieser Abteilung übernehmen
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button onClick={() => setStep(2)} disabled={!productName || (substanceType === 'GEFAHRSTOFF' && hazardGroup === '-')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 transition-colors">
                Weiter zur Gefährdung
              </button>
            </div>
          </div>
        )}

        {/* SCHRITT 2 */}
        {step === 2 && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Schritt 2: Tätigkeit & Exposition ({substanceType})</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Konkrete Tätigkeit am Arbeitsplatz</label>
                <input type="text" value={activityName} onChange={e => setActivityName(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 focus:border-blue-600" placeholder="z.B. Umfüllen aus Kanister in Eimer" />
              </div>

              {/* HAUTSCHUTZ: EMKG MODUL HAUT */}
              {substanceType === 'HAUTSCHUTZ' && (
                <div className="space-y-6 bg-white border border-[#336699] rounded-lg overflow-hidden">
                  <div className="bg-[#336699] text-white px-4 py-2 font-bold flex justify-between items-center">
                    <span>Haut</span>
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">✔ Gespeichert</span>
                  </div>
                  
                  <div className="p-6 space-y-6 bg-[#f4f7fa]">
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={skinContactExcluded} onChange={e => setSkinContactExcluded(e.target.checked)} className="mt-1 text-[#336699] focus:ring-[#336699] rounded border-slate-400" />
                        <div>
                          <span className="text-slate-800 font-medium">Ein Hautkontakt kann aus technischen Gründen ausgeschlossen werden.</span>
                          {skinContactExcluded && <p className="text-red-600 text-sm font-medium mt-1">Durch das Tragen von persönlicher Schutzausrüstung wird ein Hautkontakt nicht verhindert.</p>}
                        </div>
                      </label>

                      <div className="bg-[#e4ebf2] p-4 rounded border border-[#c5d6e6]">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={isWetWork} onChange={e => setIsWetWork(e.target.checked)} className="mt-1 text-[#336699] focus:ring-[#336699] rounded border-slate-400" />
                          <div>
                            <span className="text-slate-800 font-medium">Es handelt sich bei der Tätigkeit um einen <strong>Feuchtarbeitsplatz</strong>.</span>
                            <p className="text-slate-600 text-sm mt-2">Falls ja, haben die Eingaben in Schritt 6 keinen Einfluss mehr auf die Festlegung der Schutzleitfäden. Für eine vollständige Dokumentation können Sie die Eingaben vornehmen oder Sie gehen direkt zum Maßnahmenbedarf.</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-slate-300 pt-4">
                      <p className="text-slate-700 text-sm mb-4">Nehmen Sie für Schritt 6 eine Abschätzung für Wirkfläche und Wirkdauer vor. Für beide Kategorien sind sowohl der direkte als auch der indirekte Hautkontakt relevant. Dabei lassen Sie bereits eingesetzte persönliche Schutzausrüstung wie Handschuhe außer Acht, sofern dadurch kein Feuchtarbeitsplatz (s. o.) entsteht.</p>
                      
                      <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">Wirkfläche</h4>
                        <p className="text-sm text-slate-600 mb-3">Bei der Abschätzung der Wirkfläche ist die Aufnahme des Gefahrstoffes durch direkten und indirekten Hautkontakt zu berücksichtigen.</p>
                        <div className="flex items-center gap-8">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input type="radio" checked={skinContactArea === 'klein'} onChange={() => setSkinContactArea('klein')} className="text-[#336699] focus:ring-[#336699]" />
                            Kleinflächige Benetzung (z.B. Spritzer)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input type="radio" checked={skinContactArea === 'gross'} onChange={() => setSkinContactArea('gross')} className="text-[#336699] focus:ring-[#336699]" />
                            Großflächige Benetzung (z.B. ganze Hand)
                          </label>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 mb-2">Wirkdauer</h4>
                        <p className="text-sm text-slate-600 mb-3">Die Wirkdauer beginnt mit der Verunreinigung und endet mit der wirksamen Beseitigung. Bei wiederholtem Hautkontakt über den Tag sind die Kontaktzeiten zu addieren.</p>
                        <div className="flex items-center gap-8">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input type="radio" checked={skinContactDuration === '<=15'} onChange={() => setSkinContactDuration('<=15')} className="text-[#336699] focus:ring-[#336699]" />
                            ≤ 15min
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input type="radio" checked={skinContactDuration === '>15'} onChange={() => setSkinContactDuration('>15')} className="text-[#336699] focus:ring-[#336699]" />
                            &gt; 15min
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GEFAHRSTOFF: MENGE UND FREISETZUNG */}
              {substanceType === 'GEFAHRSTOFF' && (
                <div className="space-y-6 p-6 bg-blue-50 border border-blue-100 rounded-lg">
                  <h3 className="font-bold text-blue-900">Ermittlung der Freisetzungsgruppe (BauA)</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">Aggregatzustand</label>
                      <select value={physicalState} onChange={e => setPhysicalState(e.target.value)} className="w-full border-blue-200 rounded-md focus:ring-blue-500 font-bold">
                        <option value="Flüssigkeit">Flüssigkeit</option>
                        <option value="Feststoff">Feststoff</option>
                        <option value="Staub">Staub / Rauch (TRGS 553 / TRGS 559)</option>
                        <option value="Gas">Gas (Druckgas / Flüssiggas / CO2)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">Verarbeitete Menge</label>
                      <select value={amountClass} onChange={e => setAmountClass(e.target.value)} className="w-full border-blue-200 rounded-md focus:ring-blue-500">
                        <option value="Klein">Klein (Gramm / Milliliter)</option>
                        <option value="Mittel">Mittel (Kilogramm / Liter)</option>
                        <option value="Groß">Groß (Tonnen / m³)</option>
                      </select>
                    </div>
                  </div>

                  {physicalState === 'Feststoff' && (
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">Staubigkeit bei der Tätigkeit</label>
                      <select value={dustiness} onChange={e => setDustiness(e.target.value)} className="w-full border-blue-200 rounded-md focus:ring-blue-500">
                        <option value="Niedrig">Niedrig: Kaum Staub/Abrieb (Granulat, Pellets, Wachs)</option>
                        <option value="Mittel">Mittel: Staub setzt sich schnell ab (Zucker, Waschmittel)</option>
                        <option value="Hoch">Hoch: Staub bleibt einige Minuten in der Luft (Mehl, Toner)</option>
                      </select>
                      <div className="mt-2 flex items-center justify-between border border-blue-200 p-3 bg-blue-50 rounded">
                        <span className="font-bold text-slate-700">Staubigkeit:</span>
                        <span className="font-bold text-white bg-blue-600 px-4 py-1 rounded shadow">{dustiness.toUpperCase()}</span>
                      </div>
                    </div>
                  )}

                  {physicalState === 'Flüssigkeit' && (
                    <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg space-y-6">
                      <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Freisetzungsgruppe / Brand und Explosion</h4>
                      <p className="text-sm text-slate-600">Geben Sie den Siedepunkt ODER den Dampfdruck ein. Findet die Tätigkeit nicht bei Raumtemperatur (20°C) statt, müssen Sie die Anwendungstemperatur angeben.</p>
                      
                      <div className="flex items-center gap-4">
                        <label className="font-bold text-slate-800 text-sm">Wird die Flüssigkeit versprüht oder vernebelt?</label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" checked={isSprayed} onChange={() => setIsSprayed(true)} className="text-blue-600 focus:ring-blue-500" /> Ja</label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" checked={!isSprayed} onChange={() => setIsSprayed(false)} className="text-blue-600 focus:ring-blue-500" /> Nein</label>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-1">Siedepunkt (°C)</label>
                          <input type="number" value={boilingPoint} onChange={e => setBoilingPoint(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-slate-300 rounded focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-1">Anwendung bei (°C)</label>
                          <input type="number" value={isRoomTemp ? 20 : operatingTemp} onChange={e => setOperatingTemp(Number(e.target.value))} className={`w-full border-slate-300 rounded focus:ring-blue-500 ${isRoomTemp ? 'bg-slate-100 text-slate-500' : ''}`} disabled={isRoomTemp} />
                          <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer font-medium text-slate-600">
                            <input type="checkbox" checked={isRoomTemp} onChange={e => setIsRoomTemp(e.target.checked)} className="rounded text-blue-600" /> Raumtemperatur
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-1">Dampfdruck (hPa)</label>
                          <input type="number" value={vaporPressure} onChange={e => setVaporPressure(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-slate-300 rounded focus:ring-blue-500" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border border-blue-200 p-4 bg-white rounded shadow-sm">
                        <span className="font-bold text-slate-800">Freisetzungsgruppe</span>
                        <span className="font-bold text-white bg-[#336699] px-6 py-1.5 rounded">{
                          calculateVolatility('Flüssigkeit', dustiness, boilingPoint === '' ? null : boilingPoint, vaporPressure === '' ? null : vaporPressure, isSprayed).toUpperCase()
                        }</span>
                      </div>
                    </div>
                  )}

                  {physicalState === 'Staub' && (
                    <div className="bg-white p-4 border border-blue-200 rounded-lg space-y-4">
                      <h4 className="font-bold text-blue-900 flex items-center gap-2">Spezifische Staubbewertung (TRGS 559 / TRGS 553)</h4>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Art des Staubes</label>
                        <select value={dustType} onChange={e => setDustType(e.target.value)} className="w-full border-blue-200 rounded-md focus:ring-blue-500 font-bold">
                          <option value="A-Staub">Allgemeiner A-Staub / E-Staub (TRGS 900)</option>
                          <option value="Hartholzstaub">Hartholzstaub (Buche/Eiche) - TRGS 553</option>
                          <option value="Weichholzstaub">Weichholzstaub (Fichte/Kiefer) - TRGS 553</option>
                          <option value="Quarzstaub">Silikat- / Quarzstaub (Alveolengängig)</option>
                        </select>
                      </div>
                      {dustType === 'Hartholzstaub' && (
                        <div className="p-3 bg-red-100 text-red-900 font-bold border border-red-300 rounded text-sm flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          Achtung: Hartholzstaub ist als krebserzeugend eingestuft! Es gilt ein strenger Minimierungs- und Absaugzwang.
                        </div>
                      )}
                      {(dustType === 'A-Staub' || dustType === 'Quarzstaub') && (
                        <div className="p-3 bg-blue-100 text-blue-900 font-medium border border-blue-300 rounded text-sm">
                          Schichtmittelwert nach TRGS 900 beachten: Bei A-Staub max. 1,25 mg/m³.
                        </div>
                      )}
                      <div>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer border-blue-200 bg-blue-50/50">
                          <input type="checkbox" checked={hasExtraction} onChange={e => setHasExtraction(e.target.checked)} className="mt-1 text-blue-600 focus:ring-blue-500 w-5 h-5" />
                          <div>
                            <div className="font-bold text-blue-900">Wirksame Absaugung vorhanden?</div>
                            <div className="text-sm text-blue-700">Wird der Staub an der Entstehungsstelle abgesaugt (z.B. Industriestaubsauger M/H, Absauganlage)?</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {physicalState === 'Gas' && (
                    <div className="bg-white p-4 border border-blue-200 rounded-lg space-y-4">
                      <h4 className="font-bold text-blue-900 flex items-center gap-2">Gasspezifische Gefährdungen (DGUV Regel 100-500)</h4>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Art des Gases / Gebindes</label>
                        <select value={gasType} onChange={e => setGasType(e.target.value)} className="w-full border-blue-200 rounded-md focus:ring-blue-500 font-bold">
                          <option value="Druckgasflasche">Druckgasflasche (z.B. Sauerstoff, Stickstoff, Argon)</option>
                          <option value="Flüssiggas">Flüssiggas (z.B. Propan / Butan)</option>
                          <option value="CO2">CO2 (Kohlendioxid, z.B. Serverraum / Wasserspender)</option>
                        </select>
                      </div>

                      {gasType === 'Druckgasflasche' && (
                        <div>
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer border-blue-200 bg-blue-50/50">
                            <input type="checkbox" checked={gasSecured} onChange={e => setGasSecured(e.target.checked)} className="mt-1 text-blue-600 focus:ring-blue-500 w-5 h-5" />
                            <div>
                              <div className="font-bold text-blue-900">Flaschen gegen Umfallen gesichert?</div>
                              <div className="text-sm text-blue-700">Sind alle Druckgasflaschen (auch leere!) durch Ketten, Schellen oder in Flaschenwagen fixiert? Zerknall-Gefahr!</div>
                            </div>
                          </label>
                          {!gasSecured && (
                            <div className="mt-2 p-3 bg-red-100 text-red-900 font-bold border border-red-300 rounded text-sm flex items-center gap-2 animate-pulse">
                              <AlertTriangle className="w-5 h-5 shrink-0" />
                              Lebensgefahr: Druckgasflaschen müssen IMMER gesichert werden. Ventilabriss kann zum Zerknall führen.
                            </div>
                          )}
                        </div>
                      )}

                      {gasType === 'Flüssiggas' && (
                        <div>
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer border-blue-200 bg-blue-50/50">
                            <input type="checkbox" checked={gasBelowGround} onChange={e => setGasBelowGround(e.target.checked)} className="mt-1 text-blue-600 focus:ring-blue-500 w-5 h-5" />
                            <div>
                              <div className="font-bold text-blue-900">Wird das Gas unter Erdgleiche (z.B. Keller) verwendet/gelagert?</div>
                              <div className="text-sm text-blue-700">Flüssiggas ist schwerer als Luft und sammelt sich in Senken / Kellern.</div>
                            </div>
                          </label>
                          {gasBelowGround && (
                            <div className="mt-2 p-3 bg-red-100 text-red-900 font-bold border border-red-300 rounded text-sm flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 shrink-0" />
                              VERBOT (DGUV): Flüssiggasanlagen dürfen nicht unter Erdgleiche betrieben oder gelagert werden (Explosions-/Erstickungsgefahr)!
                            </div>
                          )}
                        </div>
                      )}

                      {gasType === 'CO2' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-blue-900 mb-1">Raumgröße (m²)</label>
                              <input type="number" value={co2RoomSize} onChange={e => setCo2RoomSize(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-blue-200 rounded-md focus:ring-blue-500" placeholder="z.B. 10" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-blue-900 mb-1">Menge CO2 (kg)</label>
                              <input type="number" value={co2Amount} onChange={e => setCo2Amount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-blue-200 rounded-md focus:ring-blue-500" placeholder="z.B. 5" />
                            </div>
                          </div>
                          {co2RoomSize !== '' && co2Amount !== '' && (
                            <div className={`p-3 border rounded text-sm flex items-center gap-2 ${Number(co2Amount) > (Number(co2RoomSize) / 5.5) ? 'bg-red-100 text-red-900 border-red-300 font-bold' : 'bg-green-100 text-green-900 border-green-300'}`}>
                              <AlertTriangle className={`w-5 h-5 shrink-0 ${Number(co2Amount) > (Number(co2RoomSize) / 5.5) ? 'text-red-600' : 'text-green-600'}`} />
                              {Number(co2Amount) > (Number(co2RoomSize) / 5.5) ? 
                                `Alarm: Für ${co2Amount}kg CO2 sind min. ${(Number(co2Amount) * 5.5).toFixed(1)}m² erforderlich! (Aktuell: ${co2RoomSize}m²). Zwangsbelüftung / CO2-Warner zwingend notwendig (Erstickungsgefahr)!` :
                                `Unbedenklich: Die CO2-Menge überschreitet nicht den Grenzwert (1kg / 5,5m²) im Falle einer Leckage.`
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-white p-3 rounded border border-blue-200 text-sm flex justify-between">
                    <span>Errechnete Flüchtigkeit / Staubigkeit:</span>
                    <span className="font-bold text-blue-800">
                      {calculateVolatility(
                        physicalState, 
                        dustiness, 
                        boilingPoint === '' ? null : boilingPoint, 
                        vaporPressure === '' ? null : vaporPressure,
                        isSprayed
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* DYNAMISCHE WEICHE: BIOSTOFF */}
              {substanceType === 'BIOSTOFF' && (
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={bioTargetedActivity} onChange={e => setBioTargetedActivity(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5" />
                    <div>
                      <span className="block font-medium text-emerald-900">Gezielte Tätigkeit (BioStoffV)</span>
                    </div>
                  </label>
                </div>
              )}

              {/* DYNAMISCHE WEICHE: ASBEST */}
              {substanceType === 'ASBEST' && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-red-900 mb-1">Tätigkeitsumfang (TRGS 519)</label>
                    <select value={asbestosActivity} onChange={e => setAsbestosActivity(e.target.value)} className="w-full border-red-200 rounded-md focus:ring-red-500">
                      <option value="Kleinsttätigkeit">Kleinsttätigkeit (&lt; 2h)</option>
                      <option value="Grosstätigkeit">Grosstätigkeit (Behördenmeldung erforderlich!)</option>
                    </select>
                  </div>
                  {asbestosActivity === 'Kleinsttätigkeit' && (
                    <div>
                      <label className="block text-sm font-medium text-red-900 mb-1">Anerkanntes BT-Verfahren (DGUV)</label>
                      <select value={btVerfahren} onChange={e => setBtVerfahren(e.target.value)} className="w-full border-red-200 rounded-md focus:ring-red-500">
                        <option value="">Bitte wählen...</option>
                        <option value="BT11">BT 11: Anbohren von asbesthaltigen Platten</option>
                        <option value="BT17">BT 17: Entfernen von asbesthaltigen Fensterkitten</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(1)} className="text-slate-600 hover:text-slate-900 px-4 py-2 font-medium">Zurück</button>
              <button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
                Weiter zur Schutzmaßnahme
              </button>
            </div>
          </div>
        )}

        {/* SCHRITT 3 */}
        {step === 3 && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><ShieldCheck className="text-green-600" /> Schritt 3: Erforderliche Schutzmaßnahmen</h2>
            
            <div className="space-y-6">
              
              {substanceType === 'GEFAHRSTOFF' && (
                <div className={`p-6 rounded-lg border ${protectionLevel >= 3 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <h3 className="text-lg font-bold mb-2">Automatisch berechnete Maßnahmenstufe: {protectionLevel}</h3>
                  <p className="font-medium mb-4">{getProtectionLevelDescription(protectionLevel)}</p>
                  <p className="text-sm opacity-80">
                    Das System hat aus Ihrer Gefährlichkeitsgruppe ({hazardGroup}), der Verarbeitungsmenge ({amountClass}) und der Flüchtigkeit diese Schutzleitfäden nach TRGS 400 für Sie ermittelt.
                  </p>
                </div>
              )}

              {substanceType === 'HAUTSCHUTZ' && (
                <div className={`p-6 rounded-lg border ${skinRiskLevel === 3 ? 'bg-red-50 border-red-200 text-red-900' : skinRiskLevel === 2 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                  <h3 className="text-lg font-bold mb-2">Modul 3: Risikobewertung - {
                    skinRiskLevel === 1 ? 'Stufe 1 (Geringes Risiko)' : 
                    skinRiskLevel === 2 ? 'Stufe 2 (Mittleres Risiko)' : 
                    'Stufe 3 (Hohes Risiko / Feuchtarbeit)'
                  }</h3>
                  
                  <div className="mt-4 space-y-3">
                    <h4 className="font-bold border-b border-current pb-1 mb-2">Modul 4: Abzuleitende S.T.O.P. Maßnahmen</h4>
                    {(() => {
                      const measures = getSkinProtectionMeasures(skinRiskLevel);
                      return (
                        <div className="space-y-2 text-sm">
                          <p><strong>Substitution:</strong> Können hautschonendere Mittel verwendet werden? ({measures.sub})</p>
                          <p><strong>Technisch:</strong> {measures.tech}</p>
                          <p><strong>Organisatorisch:</strong> {measures.org}</p>
                          <p><strong>Persönlich:</strong> {measures.pers}</p>
                        </div>
                      );
                    })()}
                    {skinRiskLevel === 3 && (
                      <div className="mt-4 p-3 bg-red-100 rounded text-red-900 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Achtung: Arbeitsmedizinische Pflichtvorsorge (G 24 / ArbMedVV) ist bei Feuchtarbeit &gt; 4h zwingend vorgeschrieben!
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">S - Substitutionsprüfung (TRGS 600)</label>
                <textarea value={stopSubstitution} onChange={e => setStopSubstitution(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 text-sm" rows={2} placeholder="Begründung, warum der Stoff nicht ersetzt werden kann..." />
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">T - Technische Maßnahmen umsetzen</label>
                <textarea value={stopTechnical} onChange={e => setStopTechnical(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 text-sm" rows={2} placeholder={`Entsprechend Leitfaden ${protectionLevel * 100} umgesetzte Maßnahmen...`} />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(2)} className="text-slate-600 hover:text-slate-900 px-4 py-2 font-medium">Zurück</button>
              <button onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
                Weiter zur Wirksamkeitsprüfung
              </button>
            </div>
          </div>
        )}

        {/* SCHRITT 4: EMKG Wirksamkeitsprüfung */}
        {step === 4 && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Schritt 4: Wirksamkeitsprüfung (Schutzleitfäden)</h2>
            <p className="text-slate-600 mb-6">Basierend auf Maßnahmenstufe {protectionLevel} wurden folgende Schutzleitfäden generiert. Bitte bestätigen Sie die Prüfung oder abwählen Sie nicht zutreffende Punkte.</p>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-blue-800 mb-1">Prüfer für alle übernehmen (Name)</label>
                <input type="text" value={bulkAuditor} onChange={e => setBulkAuditor(e.target.value)} className="w-full text-sm border-blue-300 rounded focus:ring-blue-500" placeholder="z.B. Max Mustermann" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-blue-800 mb-1">Datum für alle übernehmen</label>
                <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} className="w-full text-sm border-blue-300 rounded focus:ring-blue-500" />
              </div>
              <button onClick={() => {
                setEffectivenessChecks(prev => prev.map(p => ({ ...p, auditor: bulkAuditor || p.auditor, checkedAt: bulkDate || p.checkedAt })));
              }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold">Auf alle anwenden</button>
            </div>

            <div className="space-y-6">
              {['Einatmen', 'Haut', 'Brand und Explosion', 'Augenschutz'].map(category => {
                const items = effectivenessChecks.filter(c => c.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 border-b border-slate-200">
                      Bereich: {category}
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-3 w-8">Aktiv</th>
                          <th className="p-3 w-1/4">Leitfaden</th>
                          <th className="p-3">geprüft durch</th>
                          <th className="p-3">am</th>
                          <th className="p-3">Anmerkung</th>
                          <th className="p-3">Nächster Termin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.guidelineCode} className={!item.isActive ? 'opacity-50 bg-slate-50' : ''}>
                            <td className="p-3">
                              <input type="checkbox" checked={item.isActive} onChange={() => {
                                setEffectivenessChecks(prev => prev.map(p => p.guidelineCode === item.guidelineCode ? { ...p, isActive: !p.isActive } : p));
                              }} className="rounded border-slate-300" />
                            </td>
                            <td className="p-3 font-medium text-slate-800">{item.guidelineCode} - {item.title}</td>
                            <td className="p-3">
                              <input type="text" value={item.auditor} onChange={e => setEffectivenessChecks(prev => prev.map(p => p.guidelineCode === item.guidelineCode ? { ...p, auditor: e.target.value } : p))} className="w-full text-xs border-slate-200 rounded" placeholder="Prüfer Name" disabled={!item.isActive} />
                            </td>
                            <td className="p-3"><input type="date" value={item.checkedAt} onChange={e => setEffectivenessChecks(prev => prev.map(p => p.guidelineCode === item.guidelineCode ? { ...p, checkedAt: e.target.value } : p))} className="w-full text-xs border-slate-200 rounded" disabled={!item.isActive} /></td>
                            <td className="p-3"><input type="text" value={item.notes} onChange={e => setEffectivenessChecks(prev => prev.map(p => p.guidelineCode === item.guidelineCode ? { ...p, notes: e.target.value } : p))} className="w-full text-xs border-slate-200 rounded" placeholder="z.B. durchgeführt" disabled={!item.isActive} /></td>
                            <td className="p-3"><input type="date" value={item.nextReviewDate} onChange={e => setEffectivenessChecks(prev => prev.map(p => p.guidelineCode === item.guidelineCode ? { ...p, nextReviewDate: e.target.value } : p))} className="w-full text-xs border-slate-200 rounded" disabled={!item.isActive} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(3)} className="text-slate-600 hover:text-slate-900 px-4 py-2 font-medium">Zurück</button>
              <button onClick={() => setStep(5)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
                Weiter zu Medien & Notizen
              </button>
            </div>
          </div>
        )}

        {/* SCHRITT 5: Medien & Notizen */}
        {step === 5 && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><FileText className="text-blue-600" /> Schritt 5: Dokumentation & Notizen</h2>
            
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">Eigene Bemerkungen (Optional)</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="w-full border-slate-300 rounded-md focus:ring-blue-600 text-sm" 
                  rows={3} 
                  placeholder="Zusätzliche Hinweise für Mitarbeiter oder Besonderheiten am Arbeitsplatz..." 
                />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">Foto / Video vom Gebinde oder Arbeitsplatz</label>
                {!mediaUploaded ? (
                  <label className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-white cursor-pointer hover:bg-slate-50 transition-colors block">
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (res.ok) {
                          setMediaUploaded(data.url);
                        }
                      } catch (err) { alert('Fehler beim Upload'); }
                    }} />
                    <div className="mx-auto flex justify-center mb-3">
                      <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Upload className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="font-medium text-slate-700">Klicken Sie hier, um ein echtes Foto oder kurzes Video hochzuladen</p>
                    <p className="text-xs text-slate-500 mt-1">Unterstützt JPG, PNG, MP4 (max. 100MB)</p>
                  </label>
                ) : (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-slate-400 overflow-hidden">
                      {typeof mediaUploaded === 'string' && mediaUploaded.match(/\\.(mp4|webm)$/i) ? (
                         <video src={`http://localhost:3000${mediaUploaded}`} className="w-full h-full object-cover" />
                      ) : typeof mediaUploaded === 'string' ? (
                         <img src={`http://localhost:3000${mediaUploaded}`} className="w-full h-full object-cover" />
                      ) : <FileText />}
                    </div>
                    <div>
                      <p className="font-bold text-green-800 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Datei erfolgreich angehängt</p>
                      <p className="text-xs text-green-600">Wird mit der GBU gespeichert</p>
                    </div>
                    <button onClick={() => { setMediaUploaded(false); }} className="ml-auto text-sm text-red-600 font-medium hover:underline">Entfernen</button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(4)} className="text-slate-600 hover:text-slate-900 px-4 py-2 font-medium">Zurück</button>
              <div className="flex gap-3">
                {substanceType === 'HAUTSCHUTZ' && (
                  <button type="button" className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-6 py-2 rounded-md font-bold transition-colors">
                    Hautschutzplan generieren
                  </button>
                )}
                <button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-md font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                  <CheckCircle className="w-5 h-5" /> {isSubmitting ? 'Wird gespeichert...' : 'GBU Rechtskräftig Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
