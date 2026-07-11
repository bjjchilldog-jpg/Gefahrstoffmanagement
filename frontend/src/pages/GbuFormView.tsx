import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, AlertTriangle, ShieldCheck, CheckCircle, Upload, FileText, Settings, ShieldAlert, Users, AlertCircle, Beaker, Factory, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { H_PHRASES_CATALOG, calculateHazardGroup, calculateVolatility, calculateProtectionLevel, getProtectionLevelDescription, getSkinProtectionMeasures } from '../utils/emkg';
import { getGuidelinesByLevel } from '../utils/emkgCatalog';
import { getTrbaGuidelinesByLevel } from '../utils/trbaCatalog';
import { QRCodeSVG } from 'qrcode.react';
import { config } from '../config';

const BIO_TEMPLATES: Record<string, { id: string, label: string, rg: number, path: string, vax: string }[]> = {
  'Kläranlage / Abwasser': [
    { id: 'ka_1', label: 'Kontakt mit Abwasser / Fäkalien (E. Coli, Norovirus)', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' },
    { id: 'ka_2', label: 'Aerosolbildung (Hepatitis A, Polio)', rg: 2, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Pflege / Medizin (Krankenhaus, Arzt)': [
    { id: 'pm_1', label: 'Kontakt mit Blut / Nadelstiche (Hepatitis B/C, HIV)', rg: 3, path: 'Blut/Körperflüssigkeiten', vax: 'PFLICHTVORSORGE' },
    { id: 'pm_2', label: 'Luftgetragene Erreger (MRSA, Tuberkulose)', rg: 3, path: 'Luft/Tröpfchen', vax: 'PFLICHTVORSORGE' }
  ],
  'Behindertenpflege / Heilerziehungspflege': [
    { id: 'bh_1', label: 'Umgang mit Ausscheidungen / Körperpflege', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' },
    { id: 'bh_2', label: 'Potenzielles Angespuckt werden (absichtlich/unabsichtlich)', rg: 3, path: 'Luft/Tröpfchen', vax: 'PFLICHTVORSORGE' },
    { id: 'bh_3', label: 'Kontakt mit Blut / spitzen Gegenständen', rg: 3, path: 'Blut/Körperflüssigkeiten', vax: 'PFLICHTVORSORGE' }
  ],
  'Seniorenpflege / Altenpflege': [
    { id: 'sp_1', label: 'Körperpflege / Umgang mit Inkontinenzmaterial', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' },
    { id: 'sp_2', label: 'MRSA / Multiresistente Erreger', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' },
    { id: 'sp_3', label: 'Umgang mit Blut / Blutzuckermessung', rg: 3, path: 'Blut/Körperflüssigkeiten', vax: 'PFLICHTVORSORGE' }
  ],
  'Körpernahe Dienstleistungen (Tätowierer, Physio)': [
    { id: 'kd_1', label: 'Kontakt mit Blut / Körperflüssigkeiten', rg: 2, path: 'Blut/Körperflüssigkeiten', vax: 'ANGEBOTSVORSORGE' },
    { id: 'kd_2', label: 'Hautpilze / Schmierinfektion', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Polizei, Justiz, Sicherheitsdienste': [
    { id: 'pj_1', label: 'Angespuckt werden', rg: 3, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' },
    { id: 'pj_2', label: 'Kontakt mit Blut / Nadelstiche', rg: 3, path: 'Blut/Körperflüssigkeiten', vax: 'PFLICHTVORSORGE' }
  ],
  'Streetworker, Stadtreinigung, Entsorgung': [
    { id: 'sw_1', label: 'Stichverletzungen durch Spritzen (Drogen)', rg: 3, path: 'Blut/Körperflüssigkeiten', vax: 'PFLICHTVORSORGE' },
    { id: 'sw_2', label: 'Kontakt mit Fäkalien / Müll', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Grünpflege, Waldarbeit (Giftpflanzen, Tiere)': [
    { id: 'gw_1', label: 'Zeckenbisse (FSME, Borreliose)', rg: 2, path: 'Vektoren', vax: 'ANGEBOTSVORSORGE' },
    { id: 'gw_2', label: 'Tierexkremente (Hantavirus)', rg: 2, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Reinigung (Sanitäranlagen)': [
    { id: 'rs_1', label: 'Kontakt mit Fäkalien (E. Coli, Norovirus)', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' },
    { id: 'rs_2', label: 'Schimmelpilze', rg: 2, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Tierhilfe, Tierärzte, Landwirtschaft': [
    { id: 'th_1', label: 'Tierbisse / Kratzer (Tollwut, Zoonosen)', rg: 3, path: 'Vektoren', vax: 'ANGEBOTSVORSORGE' },
    { id: 'th_2', label: 'Kontakt mit Tierexkrementen (Q-Fieber)', rg: 3, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Küche, Lebensmittel': [
    { id: 'kl_1', label: 'Kontakt mit rohem Geflügel (Salmonellen, Campylobacter)', rg: 2, path: 'Kontakt/Schmier', vax: 'PFLICHTVORSORGE' }
  ],
  'Hotel und Gastronomie': [
    { id: 'hg_1', label: 'Reinigung Erbrochenes / Fäkalien (Norovirus)', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' },
    { id: 'hg_2', label: 'Duschen / Aerosole (Legionellen)', rg: 2, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Schwimmbad- und Saunabetrieb': [
    { id: 'ss_1', label: 'Aerosole (Legionellen, Pseudomonaden)', rg: 2, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' },
    { id: 'ss_2', label: 'Böden / Barfußbereiche (Fußpilz, HPV)', rg: 2, path: 'Kontakt/Schmier', vax: 'ANGEBOTSVORSORGE' }
  ],
  'ÖPNV (Bus/Bahn)': [
    { id: 'op_1', label: 'Enge Kontakte / Husten (Influenza, Coronaviren)', rg: 2, path: 'Luft/Tröpfchen', vax: 'ANGEBOTSVORSORGE' }
  ],
  'Labor (gezielte Tätigkeiten)': []
};

export const GbuFormView = () => {
  const { id, inventoryId } = useParams(); // id = workAreaId, inventoryId = optional inventory id
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [substanceType, setSubstanceType] = useState('GEFAHRSTOFF');
  const [showQrModal, setShowQrModal] = useState(false);
  const [pairingSessionId, setPairingSessionId] = useState('');
  const [pairingUrl, setPairingUrl] = useState('');
  
  // Zentralkatalog (Master)
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [sdbDate, setSdbDate] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [autoMailToManufacturer, setAutoMailToManufacturer] = useState(false);
  const [manufacturerEmail, setManufacturerEmail] = useState('');
  const [autoMailAdvanceDays, setAutoMailAdvanceDays] = useState(30);
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
  type SelectedHazard = {
    id: string;
    label: string;
    rg: number;
    path: string;
    vax: string;
    isTargeted: boolean;
    notes?: string;
  };
  const [selectedBioHazards, setSelectedBioHazards] = useState<SelectedHazard[]>([]);
  const [customBioNotes, setCustomBioNotes] = useState('');

  // TRGS 401 Hautschutz & Feuchtarbeit (Neu nach EMKG Screenshot)
  const [skinContactExcluded, setSkinContactExcluded] = useState(false);
  const [isWetWork, setIsWetWork] = useState(false);
  const [skinContactArea, setSkinContactArea] = useState('klein'); // 'klein' | 'gross'
  const [skinContactDuration, setSkinContactDuration] = useState('<=15'); // '<=15' | '>15'
  const [skinRiskLevel, setSkinRiskLevel] = useState(1);

  // Phase 5: TRGS 510, WGK, Grenzwerte & Medien
  const [wgk, setWgk] = useState<string>('');
  const [storageClass, setStorageClass] = useState<string>('');
  const [storageIncompatibilities, setStorageIncompatibilities] = useState<string>('');
  const [incompatibleMaterials, setIncompatibleMaterials] = useState<string>('');
  const [agwValue, setAgwValue] = useState<string>('');
  const [casNumber, setCasNumber] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [mediaUploaded, setMediaUploaded] = useState<string | boolean>(false);
  const [requiresTraining, setRequiresTraining] = useState(false);
  
  const [isScanningSdb, setIsScanningSdb] = useState(false);
  const [sdbScanResult, setSdbScanResult] = useState<string | null>(null);
  const [sdbFile, setSdbFile] = useState<File | null>(null);
  const [sdbFilePath, setSdbFilePath] = useState<string | null>(null);
  const [sdbPreviewUrl, setSdbPreviewUrl] = useState<string | null>(null);
  const [aiExtractedFields, setAiExtractedFields] = useState<Set<string>>(new Set());
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employees for ArbMedVV / ZED Assignment
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [customAsbestosHotspot, setCustomAsbestosHotspot] = useState('');
  const [selectedAsbestosHazards, setSelectedAsbestosHazards] = useState<string[]>([]);

  const ASBESTOS_HAZARDS = [
    "Asbestfaserfreisetzung (Inhalative Gefährdung)",
    "Absturzgefährdung (z.B. Arbeiten auf Dächern, Gerüsten)",
    "Physische Belastung (Tragen von Atemschutz/Schutzanzug)",
    "Hitze-/Kältebelastung (Arbeiten im Freien / unter Vollschutz)",
    "Gefahr durch herabfallende Bauteile",
    "Lärm (Einsatz von Maschinen/Werkzeugen)"
  ];

  useEffect(() => {
    fetch('http://localhost:3000/api/employees')
      .then(res => res.json())
      .then(data => setAllEmployees(data))
      .catch(console.error);
  }, []);

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

  useEffect(() => {
    if (inventoryId) {
      fetch(`http://localhost:3000/api/substances/inventory/${inventoryId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.error) {
          alert('Fehler beim Laden des Stoffes: ' + resData.error);
          return;
        }

        const type = resData.type;
        const data = resData.data;

        if (type === 'GEFAHRSTOFF' || data.masterSubstance?.substanceType === 'ASBEST') {
          const isAsbestos = data.masterSubstance?.substanceType === 'ASBEST';
          setSubstanceType(isAsbestos ? 'ASBEST' : 'GEFAHRSTOFF');
          setProductName(data.masterSubstance?.productName || '');
          setManufacturer(data.masterSubstance?.manufacturer || '');
          setSdbDate(data.masterSubstance?.sdbDate ? data.masterSubstance.sdbDate.split('T')[0] : '');
          if (data.masterSubstance?.sdbFilePath) {
            setSdbFilePath(data.masterSubstance.sdbFilePath);
            setSdbPreviewUrl(`http://localhost:3000${data.masterSubstance.sdbFilePath}`);
          }
          setNextReviewDate(data.masterSubstance?.nextReviewDate ? data.masterSubstance.nextReviewDate.split('T')[0] : '');
          setResponsiblePerson(data.masterSubstance?.responsiblePerson || '');
          setAutoMailToManufacturer(data.masterSubstance?.autoMailToManufacturer || false);
          setManufacturerEmail(data.masterSubstance?.manufacturerEmail || '');
          setAutoMailAdvanceDays(data.masterSubstance?.autoMailAdvanceDays || 30);
          setSelectedHPhrases(data.masterSubstance?.hPhrases ? data.masterSubstance.hPhrases.split(', ') : []);
          setIsMutterschutzRelevant(data.masterSubstance?.isMutterschutzRelevant || false);
          setIsMixture(data.masterSubstance?.isMixture || false);
          setHazardGroup(data.masterSubstance?.emkgInhalation || '-');
          setPhysicalState(data.physicalState || 'Flüssigkeit');
          setActivityName(data.activityName || '');
          
          if (data.customFields) {
            try {
              const cf = JSON.parse(data.customFields);
              setAmountClass(cf.amountClass || 'Klein');
              setProtectionLevel(cf.protectionLevel || 0);
              setDustType(cf.dustType || 'A-Staub');
              setHasExtraction(cf.hasExtraction || false);
              setGasType(cf.gasType || 'Druckgasflasche');
              setGasSecured(cf.gasSecured ?? true);
              setGasBelowGround(cf.gasBelowGround || false);
              setCo2RoomSize(cf.co2RoomSize || '');
              setCo2Amount(cf.co2Amount || '');
              setIsSprayed(cf.isSprayed || false);
              setBoilingPoint(cf.boilingPoint || '');
              setVaporPressure(cf.vaporPressure || '');
              setIsRoomTemp(cf.isRoomTemp ?? true);
              setOperatingTemp(cf.operatingTemp || 20);
            } catch(e) {}
          }
          
          setSifaName(data.sifaName || '');
          setBetriebsarztName(data.betriebsarztName || '');
          setInvolvedPersons(data.involvedPersons || '');
          setSkinContactExcluded(data.skinContactExcluded || false);
          setIsWetWork(data.isWetWork || false);
          setSkinContactArea(data.skinContactArea || 'klein');
          setSkinContactDuration(data.skinContactDuration || '<=15');
          setWgk(data.masterSubstance?.wgk?.toString() || '');
          setStorageClass(data.masterSubstance?.storageClass || '');
          setStorageIncompatibilities(data.masterSubstance?.storageIncompatibilities || '');
          setIncompatibleMaterials(data.masterSubstance?.incompatibleMaterials || '');
          setAgwValue(data.masterSubstance?.agwValue || '');
          setNotes(data.notes || '');
          setRequiresTraining(data.masterSubstance?.requiresTraining || false);
          
          if (data.effectivenessChecks) {
            setEffectivenessChecks(data.effectivenessChecks.map((c: any) => ({
              ...c,
              checkedAt: c.checkedAt ? c.checkedAt.split('T')[0] : '',
              nextReviewDate: c.nextReviewDate ? c.nextReviewDate.split('T')[0] : '',
              isActive: true
            })));
          }
          
          if (isAsbestos) {
             setAsbestosActivity(data.asbestosActivity || 'Kleinsttätigkeit');
             setBtVerfahren(data.btVerfahren || '');
          }

          if (data.masterSubstance?.employeeExposures) {
            setAssignedEmployeeIds(data.masterSubstance.employeeExposures.map((ex: any) => ex.employeeId));
          }
        } else if (type === 'BIOSTOFF') {
          setSubstanceType('BIOSTOFF');
          setProductName(data.name || '');
          // Very basic population for biostoff
          if (data.effectivenessChecks) {
             setEffectivenessChecks(data.effectivenessChecks.map((c: any) => ({
              ...c,
              checkedAt: c.checkedAt ? c.checkedAt.split('T')[0] : '',
              nextReviewDate: c.nextReviewDate ? c.nextReviewDate.split('T')[0] : '',
              isActive: true
            })));
          }
        }
      })
      .catch(console.error);
    }
  }, [inventoryId]);

  // ==========================================
  // AUTOSAVE / LOCAL STORAGE DRAFT LOGIC
  // ==========================================
  const draftKey = `gbu_draft_${id || 'new'}_${inventoryId || 'new'}`;

  // Laden beim initialen Mounten
  useEffect(() => {
    // Nur laden, wenn wir kein bestehendes Inventar von der API abrufen (oder nachdem wir es abgerufen haben)
    // Damit der Draft das API-Ergebnis nicht überschreibt, fragen wir den User
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.productName || d.selectedBioHazards?.length > 0) {
          if (window.confirm('Es wurde ein ungespeicherter lokaler Entwurf gefunden. Möchtest du diesen wiederherstellen?')) {
            if(d.substanceType !== undefined) setSubstanceType(d.substanceType);
            if(d.productName !== undefined) setProductName(d.productName);
            if(d.manufacturer !== undefined) setManufacturer(d.manufacturer);
            if(d.sdbDate !== undefined) setSdbDate(d.sdbDate);
            if(d.nextReviewDate !== undefined) setNextReviewDate(d.nextReviewDate);
            if(d.responsiblePerson !== undefined) setResponsiblePerson(d.responsiblePerson);
            if(d.autoMailToManufacturer !== undefined) setAutoMailToManufacturer(d.autoMailToManufacturer);
            if(d.manufacturerEmail !== undefined) setManufacturerEmail(d.manufacturerEmail);
            if(d.autoMailAdvanceDays !== undefined) setAutoMailAdvanceDays(d.autoMailAdvanceDays);
            if(d.selectedHPhrases !== undefined) setSelectedHPhrases(d.selectedHPhrases);
            if(d.isMutterschutzRelevant !== undefined) setIsMutterschutzRelevant(d.isMutterschutzRelevant);
            if(d.isMixture !== undefined) setIsMixture(d.isMixture);
            if(d.involvedPersons !== undefined) setInvolvedPersons(d.involvedPersons);
            if(d.sifaName !== undefined) setSifaName(d.sifaName);
            if(d.betriebsarztName !== undefined) setBetriebsarztName(d.betriebsarztName);
            if(d.auditorName !== undefined) setAuditorName(d.auditorName);
            if(d.hazardGroup !== undefined) setHazardGroup(d.hazardGroup);
            if(d.physicalState !== undefined) setPhysicalState(d.physicalState);
            if(d.activityName !== undefined) setActivityName(d.activityName);
            if(d.amountClass !== undefined) setAmountClass(d.amountClass);
            if(d.boilingPoint !== undefined) setBoilingPoint(d.boilingPoint);
            if(d.operatingTemp !== undefined) setOperatingTemp(d.operatingTemp);
            if(d.vaporPressure !== undefined) setVaporPressure(d.vaporPressure);
            if(d.isSprayed !== undefined) setIsSprayed(d.isSprayed);
            if(d.isRoomTemp !== undefined) setIsRoomTemp(d.isRoomTemp);
            if(d.dustiness !== undefined) setDustiness(d.dustiness);
            if(d.dustType !== undefined) setDustType(d.dustType);
            if(d.hasExtraction !== undefined) setHasExtraction(d.hasExtraction);
            if(d.gasType !== undefined) setGasType(d.gasType);
            if(d.gasSecured !== undefined) setGasSecured(d.gasSecured);
            if(d.gasBelowGround !== undefined) setGasBelowGround(d.gasBelowGround);
            if(d.co2RoomSize !== undefined) setCo2RoomSize(d.co2RoomSize);
            if(d.co2Amount !== undefined) setCo2Amount(d.co2Amount);
            if(d.protectionLevel !== undefined) setProtectionLevel(d.protectionLevel);
            if(d.stopSubstitution !== undefined) setStopSubstitution(d.stopSubstitution);
            if(d.stopTechnical !== undefined) setStopTechnical(d.stopTechnical);
            if(d.effectivenessChecks !== undefined) setEffectivenessChecks(d.effectivenessChecks);
            if(d.bulkAuditor !== undefined) setBulkAuditor(d.bulkAuditor);
            if(d.bulkDate !== undefined) setBulkDate(d.bulkDate);
            if(d.bioTargetedActivity !== undefined) setBioTargetedActivity(d.bioTargetedActivity);
            if(d.bioRiskGroup !== undefined) setBioRiskGroup(d.bioRiskGroup);
            if(d.isTargetedActivity !== undefined) setIsTargetedActivity(d.isTargetedActivity);
            if(d.transmissionPath !== undefined) setTransmissionPath(d.transmissionPath);
            if(d.vaccinationOffer !== undefined) setVaccinationOffer(d.vaccinationOffer);
            if(d.asbestosActivity !== undefined) setAsbestosActivity(d.asbestosActivity);
            if(d.btVerfahren !== undefined) setBtVerfahren(d.btVerfahren);
            if(d.selectedBioHazards !== undefined) setSelectedBioHazards(d.selectedBioHazards);
            if(d.customBioNotes !== undefined) setCustomBioNotes(d.customBioNotes);
            if(d.skinContactExcluded !== undefined) setSkinContactExcluded(d.skinContactExcluded);
            if(d.isWetWork !== undefined) setIsWetWork(d.isWetWork);
            if(d.skinContactArea !== undefined) setSkinContactArea(d.skinContactArea);
            if(d.skinContactDuration !== undefined) setSkinContactDuration(d.skinContactDuration);
            if(d.skinRiskLevel !== undefined) setSkinRiskLevel(d.skinRiskLevel);
            if(d.wgk !== undefined) setWgk(d.wgk);
            if(d.storageClass !== undefined) setStorageClass(d.storageClass);
            if(d.storageIncompatibilities !== undefined) setStorageIncompatibilities(d.storageIncompatibilities);
            if(d.incompatibleMaterials !== undefined) setIncompatibleMaterials(d.incompatibleMaterials);
            if(d.agwValue !== undefined) setAgwValue(d.agwValue);
            if(d.casNumber !== undefined) setCasNumber(d.casNumber);
            if(d.notes !== undefined) setNotes(d.notes);
            if(d.requiresTraining !== undefined) setRequiresTraining(d.requiresTraining);
            if(d.customAsbestosHotspot !== undefined) setCustomAsbestosHotspot(d.customAsbestosHotspot);
            if(d.selectedAsbestosHazards !== undefined) setSelectedAsbestosHazards(d.selectedAsbestosHazards);
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch(e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Speichern in LocalStorage bei jeder Änderung (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = {
        substanceType, productName, manufacturer, sdbDate, nextReviewDate, responsiblePerson, autoMailToManufacturer, manufacturerEmail, autoMailAdvanceDays, selectedHPhrases, isMutterschutzRelevant, isMixture, involvedPersons, sifaName, betriebsarztName, auditorName, hazardGroup, physicalState, activityName, amountClass, boilingPoint, operatingTemp, vaporPressure, isSprayed, isRoomTemp, dustiness, dustType, hasExtraction, gasType, gasSecured, gasBelowGround, co2RoomSize, co2Amount, protectionLevel, stopSubstitution, stopTechnical, effectivenessChecks, bulkAuditor, bulkDate, bioTargetedActivity, bioRiskGroup, isTargetedActivity, transmissionPath, vaccinationOffer, asbestosActivity, btVerfahren, selectedBioHazards, customBioNotes, skinContactExcluded, isWetWork, skinContactArea, skinContactDuration, skinRiskLevel, wgk, storageClass, storageIncompatibilities, incompatibleMaterials, agwValue, casNumber, notes, requiresTraining, customAsbestosHotspot, selectedAsbestosHazards
      };
      if (productName || selectedBioHazards.length > 0) {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    draftKey, substanceType, productName, manufacturer, sdbDate, nextReviewDate, responsiblePerson, autoMailToManufacturer, manufacturerEmail, autoMailAdvanceDays, selectedHPhrases, isMutterschutzRelevant, isMixture, involvedPersons, sifaName, betriebsarztName, auditorName, hazardGroup, physicalState, activityName, amountClass, boilingPoint, operatingTemp, vaporPressure, isSprayed, isRoomTemp, dustiness, dustType, hasExtraction, gasType, gasSecured, gasBelowGround, co2RoomSize, co2Amount, protectionLevel, stopSubstitution, stopTechnical, effectivenessChecks, bulkAuditor, bulkDate, bioTargetedActivity, bioRiskGroup, isTargetedActivity, transmissionPath, vaccinationOffer, asbestosActivity, btVerfahren, selectedBioHazards, customBioNotes, skinContactExcluded, isWetWork, skinContactArea, skinContactDuration, skinRiskLevel, wgk, storageClass, storageIncompatibilities, incompatibleMaterials, agwValue, casNumber, notes, requiresTraining, customAsbestosHotspot, selectedAsbestosHazards
  ]);

  // Max Bio Protection Level berechnen
  useEffect(() => {
    if (substanceType === 'BIOSTOFF') {
      let maxLevel = 1;
      selectedBioHazards.forEach(h => {
        let level = 1;
        if (h.rg === 3 && h.isTargeted) level = 3;
        else if (h.rg === 3) level = 2;
        else level = h.rg || 1;
        
        if (level > maxLevel) maxLevel = level;
      });
      setProtectionLevel(maxLevel);
    }
  }, [substanceType, selectedBioHazards]);

  // Initialisieren der Wirksamkeitsprüfung wenn sich die Stufe ändert
  useEffect(() => {
    if (protectionLevel > 0) {
      const guidelines = substanceType === 'BIOSTOFF' 
        ? getTrbaGuidelinesByLevel(protectionLevel)
        : getGuidelinesByLevel(protectionLevel);

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
  }, [protectionLevel, substanceType]);

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
      const response = await fetch(`http://localhost:3000/api/substances/workarea/${id}/bulk-persons`, {
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

  // Polling für Mobile Scanner Pairing
  useEffect(() => {
    if (!pairingSessionId) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${config.apiUrl}/api/pairing/${pairingSessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'done' && data.data?.hPhrases) {
            setSelectedHPhrases(prev => {
              const newSet = new Set(prev);
              data.data.hPhrases.forEach((p: string) => newSet.add(p));
              return Array.from(newSet);
            });
            setShowQrModal(false);
            setPairingSessionId('');
            setSdbScanResult('H-Sätze erfolgreich per Smartphone-Scan übernommen!');
          }
        }
      } catch (err) {
        // silently ignore polling errors
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [pairingSessionId]);
  
  const startPairingSession = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/api/pairing/create`, { method: 'POST' });
      const { sessionId } = await res.json();
      setPairingSessionId(sessionId);
      
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const url = `${window.location.protocol}//${host}${port}/scanner?sessionId=${sessionId}`;
      
      setPairingUrl(url);
      setShowQrModal(true);
    } catch (err) {
      alert('Fehler beim Starten der Smartphone-Kopplung.');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let finalNotes = notes;
      if (substanceType === 'ASBEST' && selectedAsbestosHazards.length > 0) {
        finalNotes = `Typische Gefährdungen:\n- ${selectedAsbestosHazards.join('\n- ')}\n\n${notes}`;
      }

      let payload: any = {
        type: substanceType === 'BIOSTOFF' ? 'biological' : 'hazardous',
        productName: productName === 'Sonstiges Asbest' && customAsbestosHotspot ? `Sonstiges: ${customAsbestosHotspot}` : productName,
        annualAmount: 0,
        sdbFilePath: sdbFilePath,
        notes: finalNotes
      };

      if (substanceType === 'BIOSTOFF') {
        const fetchPromises = [];

        for (const hazard of selectedBioHazards) {
          const hazardPayload = {
            workAreaId: id,
            substanceType,
            type: 'biological',
            name: hazard.label,
            riskGroup: hazard.rg,
            protectionLevel: hazard.rg === 3 && hazard.isTargeted ? 3 : hazard.rg === 3 ? 2 : hazard.rg,
            isTargetedActivity: hazard.isTargeted,
            transmissionPath: hazard.path,
            vaccinationOffer: hazard.vax,
            notes: `Bereich: ${productName}${hazard.notes ? `\nNotizen: ${hazard.notes}` : ''}`,
            requiresTraining,
            effectivenessChecks: effectivenessChecks.filter(c => c.isActive).map(c => ({
              guidelineCode: c.guidelineCode,
              title: c.title,
              auditor: c.auditor,
              checkedAt: c.checkedAt,
              nextReviewDate: c.nextReviewDate,
              notes: c.notes
            }))
          };
          fetchPromises.push(
            fetch(inventoryId ? `http://localhost:3000/api/substances/${inventoryId}` : `http://localhost:3000/api/substances`, {
              method: inventoryId ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify(hazardPayload)
            })
          );
        }

        if (customBioNotes.trim() !== '') {
          const customPayload = {
            workAreaId: id,
            substanceType,
            type: 'biological',
            name: 'Sonstige Erreger / Bemerkungen',
            riskGroup: parseInt(bioRiskGroup) || 1,
            protectionLevel: parseInt(bioRiskGroup) === 3 && isTargetedActivity ? 3 : parseInt(bioRiskGroup) === 3 ? 2 : parseInt(bioRiskGroup) || 1,
            isTargetedActivity,
            transmissionPath,
            vaccinationOffer,
            notes: customBioNotes,
            requiresTraining,
            effectivenessChecks: effectivenessChecks.filter(c => c.isActive).map(c => ({
              guidelineCode: c.guidelineCode,
              title: c.title,
              auditor: c.auditor,
              checkedAt: c.checkedAt,
              nextReviewDate: c.nextReviewDate,
              notes: c.notes
            }))
          };
          fetchPromises.push(
            fetch(inventoryId ? `http://localhost:3000/api/substances/${inventoryId}` : `http://localhost:3000/api/substances`, {
              method: inventoryId ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify(customPayload)
            })
          );
        }

        const responses = await Promise.all(fetchPromises);
        const hasError = responses.some(r => !r.ok);
        if (hasError) {
          alert('Fehler beim Speichern einiger Biostoff-Einträge.');
        } else {
          alert('Biostoffe erfolgreich angelegt!');
          navigate(`/work-area/${id}`);
        }
        return;
      } else {
        payload = {
          ...payload,
          manufacturer,
          sdbDate: sdbDate ? new Date(sdbDate).toISOString() : undefined,
          nextReviewDate: nextReviewDate ? new Date(nextReviewDate).toISOString() : undefined,
          responsiblePerson,
          autoMailToManufacturer,
          manufacturerEmail: autoMailToManufacturer ? manufacturerEmail : undefined,
          autoMailAdvanceDays: autoMailToManufacturer ? autoMailAdvanceDays : undefined,
          hPhrases: selectedHPhrases.join(', '),
          activityName,
          physicalState,
          requiresTraining,
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
          storageIncompatibilities,
          incompatibleMaterials,
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

      const payloadData = {
          workAreaId: id,
          substanceType,
          assignedEmployeeIds,
          ...payload
      };

      const response = await fetch(inventoryId ? `http://localhost:3000/api/substances/${inventoryId}` : `http://localhost:3000/api/substances`, {
        method: inventoryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payloadData)
      });

      if (response.ok) {
        const resData = await response.json();
        localStorage.removeItem(draftKey);
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
    <div className={`mx-auto pb-12 flex flex-col xl:flex-row gap-6 ${sdbPreviewUrl ? 'max-w-[1600px] px-4' : 'max-w-4xl'}`}>
      <div className="flex-1 min-w-0">
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
                            // PDF-Vorschau erstellen
                            if (sdbPreviewUrl) URL.revokeObjectURL(sdbPreviewUrl);
                            setSdbPreviewUrl(URL.createObjectURL(file));
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
                              
                              // Produktname setzen (Schutz gegen Section-Header)
                              const pName = data.productName || '';
                              if (pName && !pName.match(/^(Produktidentifikator|Bezeichnung des|ABSCHNITT)/i)) {
                                setProductName(pName);
                              }
                              // Hersteller setzen (Schutz gegen Section-Header)
                              const mfr = data.manufacturer || '';
                              if (mfr && !mfr.match(/^(Einzelheiten|Angaben zum|Details of)/i)) {
                                setManufacturer(mfr);
                              }
                              if (data.hPhrases) setSelectedHPhrases(Array.isArray(data.hPhrases) ? data.hPhrases : data.hPhrases.split(','));
                              
                              // WGK: Robust parsen ("WGK 2", "2", "2 - deutlich" → "2")
                              if (data.wgk != null && data.wgk !== '') {
                                const wgkStr = String(data.wgk).replace(/[^0-9]/g, '');
                                if (['1','2','3'].includes(wgkStr)) setWgk(wgkStr);
                              }
                              // LGK: Robust parsen (extrahiert "8B", "3", "6.1C" etc.)
                              if (data.storageClass != null && data.storageClass !== '') {
                                const match = String(data.storageClass).match(/\b([1-9]|1[0-3])(\.[1-9])?([A-C])?\b/i);
                                if (match) {
                                  setStorageClass(match[0].toUpperCase());
                                } else {
                                  const fallback = String(data.storageClass).replace(/^(LGK|Lagerklasse|VOC)\s*[:\-]?\s*/i, '').split(/\s*[-–:]/)[0].trim().toUpperCase();
                                  setStorageClass(fallback);
                                }
                              }
                              if (data.storageIncompatibilities) setStorageIncompatibilities(data.storageIncompatibilities);
                              if (data.incompatibleMaterials) setIncompatibleMaterials(data.incompatibleMaterials);
                              if (data.physicalState) setPhysicalState(data.physicalState);
                              
                              const parseSdbNum = (val: any) => {
                                if (val == null || val === '') return NaN;
                                const match = String(val).replace(',', '.').match(/-?\d+(\.\d+)?/);
                                return match ? Number(match[0]) : NaN;
                              };

                              if (data.boilingPoint !== undefined && data.boilingPoint !== null) {
                                const bpNum = parseSdbNum(data.boilingPoint);
                                if (!isNaN(bpNum)) setBoilingPoint(bpNum);
                              }
                              
                              if (data.vaporPressure !== undefined && data.vaporPressure !== null) {
                                const vpNum = parseSdbNum(data.vaporPressure);
                                if (!isNaN(vpNum)) setVaporPressure(vpNum);
                              }
                              
                              // AGW: Direkt übernehmen, auch DNEL anhängen
                              if (data.agw || data.dnel) {
                                let grenzwert = data.agw || '';
                                if (data.dnel && data.dnel !== data.agw) {
                                  grenzwert += (grenzwert ? ' | DNEL: ' : 'DNEL: ') + data.dnel;
                                }
                                setAgwValue(grenzwert);
                              }
                              if (data.casNumber) setCasNumber(data.casNumber || '');
                              
                              // SDB-Datum setzen
                              if (data.sdbDate) {
                                const dateStr = String(data.sdbDate);
                                // Unterstütze YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY
                                const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                                const deMatch = dateStr.match(/(\d{2})[./](\d{2})[./](\d{4})/);
                                if (isoMatch) {
                                  setSdbDate(isoMatch[0]);
                                } else if (deMatch) {
                                  setSdbDate(`${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`);
                                }
                              }
                              // Gemisch/Stoff (die meisten Produkte sind Gemische)
                              if (data.sdbFilePath) {
                                setSdbFilePath(data.sdbFilePath);
                              }
                              setIsMixture(data.isMixture !== false);
                              
                              // Sonderhinweise in Notes schreiben
                              if (data.specialNotes || data.storageIncompatibilities || data.incompatibleMaterials) {
                                const parts: string[] = [];
                                if (data.storageIncompatibilities) parts.push('⚠️ Zusammenlagerung: ' + data.storageIncompatibilities);
                                if (data.incompatibleMaterials) parts.push('🚫 Unverträgliche Stoffe: ' + data.incompatibleMaterials);
                                if (data.specialNotes) parts.push('📋 ' + data.specialNotes);
                                setNotes(prev => prev ? prev + '\n' + parts.join('\n') : parts.join('\n'));
                              }
                              
                              console.log('[SDB-Frontend] Empfangene Daten:', { wgk: data.wgk, storageClass: data.storageClass, agw: data.agw, sdbDate: data.sdbDate, dnel: data.dnel });
                              
                              // Gelbe Markierung: Welche Felder wurden durch KI/Parser gefüllt?
                              const filled = new Set<string>();
                              if (pName && !pName.match(/^(Produktidentifikator|Bezeichnung)/i)) filled.add('productName');
                              if (mfr && !mfr.match(/^(Einzelheiten|Angaben)/i)) filled.add('manufacturer');
                              if (data.hPhrases?.length) filled.add('hPhrases');
                              if (data.wgk) filled.add('wgk');
                              if (data.storageClass) filled.add('storageClass');
                              if (data.agw) filled.add('agw');
                              if (data.physicalState) filled.add('physicalState');
                              if (data.boilingPoint !== undefined) filled.add('boilingPoint');
                              if (data.vaporPressure !== undefined) filled.add('vaporPressure');
                              if (data.casNumber) filled.add('casNumber');
                              if (data.isMixture !== undefined) filled.add('isMixture');
                              if (data.sdbDate) filled.add('sdbDate');
                              setAiExtractedFields(filled);
                              setExtractionConfidence(data.confidence?.overall || 0);
                              
                              const method = data.extractionMethod === 'AI_GEMINI' ? 'KI (Gemini)' : data.extractionMethod === 'PDF_REGEX' ? 'PDF-Textanalyse' : 'Demo-Modus';
                              const conf = Math.round((data.confidence?.overall || 0) * 100);
                              setSdbScanResult(data.needsReview 
                                ? `⚡ Extrahiert via ${method} (Konfidenz: ${conf}%). Gelb markierte Felder bitte prüfen!`
                                : data.notes || `Erfolgreich ausgelesen (${method}).`);
                            } catch (err: any) {
                              setSdbScanResult('Fehler beim KI-Scan: ' + err.message);
                            } finally {
                              setIsScanningSdb(false);
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={startPairingSession}
                        className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors inline-block"
                      >
                        Mit Smartphone scannen
                      </button>
                      <label className="ml-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg cursor-pointer transition-colors inline-block">
                        Ohne KI anhängen
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSdbFile(file);
                              if (sdbPreviewUrl) URL.revokeObjectURL(sdbPreviewUrl);
                              setSdbPreviewUrl(URL.createObjectURL(file));
                              setSdbScanResult('Datei klassisch angehängt (ohne KI).');

                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const res = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: formData });
                                const data = await res.json();
                                if (res.ok) setSdbFilePath(data.url);
                              } catch (err) { alert('Fehler beim Upload des SDBs'); }
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
                          {sdbScanResult.includes('Demo-Modus') || sdbScanResult.includes('PDF-Textanalyse')
                            ? <div className="text-xs text-slate-500 mt-1">Sie können die eingetragenen Werte unten jederzeit händisch anpassen. Um den Demomodus zu deaktivieren, hinterlegen Sie in den Einstellungen einen API-Key.</div>
                            : <div className="text-xs text-emerald-600 mt-1">✅ KI-Extraktion aktiv. Die Daten wurden intelligent extrahiert.</div>
                          }
                        </div>
                      )}
                      </div>
                    )}
                    {/* PDF-Direktvorschau */}
                    {sdbPreviewUrl && (
                      <div className="mt-4 xl:hidden">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            📄 SDB-Vorschau
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSdbPreviewUrl(null); setSdbFile(null); }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Vorschau schließen
                          </button>
                        </div>
                        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm" style={{ height: '500px' }}>
                          <object
                            data={sdbPreviewUrl}
                            type="application/pdf"
                            className="w-full h-full"
                          >
                            <iframe src={sdbPreviewUrl} className="w-full h-full" title="SDB PDF Vorschau" />
                          </object>
                        </div>
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
                  <div className="space-y-4">
                    <select value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 font-bold text-lg p-3 bg-slate-50">
                      <option value="">Bitte wählen...</option>
                      <option value="Heizungskeller / Rohrisolierungen (Schwach gebunden)">Heizungskeller / Rohrisolierungen (Schwach gebunden)</option>
                      <option value="Badezimmer / Fliesenkleber / Spachtelmassen (Fest gebunden)">Badezimmer / Fliesenkleber / Spachtelmassen (Fest gebunden)</option>
                      <option value="Dach / Fassade / Wellplatten (Fest gebunden)">Dach / Fassade / Wellplatten (Fest gebunden)</option>
                      <option value="Bodenbeläge / Floor-Flex-Platten (Fest gebunden)">Bodenbeläge / Floor-Flex-Platten (Fest gebunden)</option>
                      <option value="Sonstiges Asbest">Sonstiges</option>
                    </select>
                    {productName === 'Sonstiges Asbest' && (
                      <input 
                        type="text" 
                        value={customAsbestosHotspot} 
                        onChange={e => setCustomAsbestosHotspot(e.target.value)} 
                        className="w-full border-slate-300 rounded-md focus:ring-blue-600 font-bold text-lg p-3 animate-in fade-in" 
                        placeholder="Bitte genauen Bereich / Hotspot eintragen..." 
                      />
                    )}
                  </div>
                ) : substanceType === 'BIOSTOFF' ? (
                  <select value={productName} onChange={(e) => {
                    const val = e.target.value;
                    setProductName(val);
                    setIsTargetedActivity(val === 'Labor (gezielte Tätigkeiten)');
                    setSelectedBioHazards([]);
                    setCustomBioNotes('');
                    setBioRiskGroup('1');
                    setTransmissionPath('');
                    setVaccinationOffer('');
                  }} className="w-full border-slate-300 rounded-md focus:ring-emerald-600 font-bold text-lg p-3 bg-emerald-50">
                    <option value="">Bitte wählen...</option>
                    {Object.keys(BIO_TEMPLATES).map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                    <option value="Sonstige Tätigkeit">Sonstige Tätigkeit</option>
                  </select>
                ) : (
                  <div className="space-y-4">
                    <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 focus:border-blue-600 font-bold text-lg p-3" placeholder="z.B. Aceton 99% oder Handreiniger X" />
                    
                    {substanceType === 'GEFAHRSTOFF' && (
                      <div className="flex items-center gap-6 mt-2">
                        <label className="text-sm font-medium text-slate-700">Typ:</label>
                        <div className={`flex items-center gap-4 p-1 rounded ${aiExtractedFields.has('isMixture') ? 'bg-yellow-100' : ''}`}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="mixtureType" checked={!isMixture} onChange={() => setIsMixture(false)} className="text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm">Stoff</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="mixtureType" checked={isMixture} onChange={() => setIsMixture(true)} className="text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm">Gemisch/Zubereitung</span>
                          </label>
                        </div>
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
                  
                  <div className="mt-4 flex flex-col items-start gap-2">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" id="autoMail" checked={autoMailToManufacturer} onChange={e => setAutoMailToManufacturer(e.target.checked)} className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                      <label htmlFor="autoMail" className="text-sm text-slate-700">
                        <strong>Automatische Erinnerung aktivieren:</strong> Das System soll rechtzeitig vor Ablauf der Frist eine E-Mail an den Hersteller vorbereiten, um ein aktualisiertes SDB anzufordern.
                      </label>
                    </div>
                    {autoMailToManufacturer && (
                      <div className="ml-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 w-full bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail-Adresse des Herstellers</label>
                          <input type="email" placeholder="z.B. sdb@hersteller.com" value={manufacturerEmail} onChange={e => setManufacturerEmail(e.target.value)} className="w-full border-slate-300 rounded-md focus:ring-blue-600 bg-white" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Vorlaufzeit (Tage)</label>
                          <select value={autoMailAdvanceDays} onChange={e => setAutoMailAdvanceDays(Number(e.target.value))} className="w-full border-slate-300 rounded-md focus:ring-blue-600 bg-white">
                            <option value={14}>14 Tage vor Ablauf</option>
                            <option value={30}>30 Tage vor Ablauf</option>
                            <option value={60}>60 Tage vor Ablauf</option>
                            <option value={90}>90 Tage vor Ablauf</option>
                          </select>
                        </div>
                      </div>
                    )}
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
                    
                    {productName && (
                      <div className="bg-red-50/50 p-4 rounded-lg border border-red-100 mt-4 animate-in fade-in">
                        <h4 className="font-bold text-red-900 mb-3">Typische Gefährdungen für diese Tätigkeit (bitte ankreuzen):</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {ASBESTOS_HAZARDS.map(hazard => (
                            <label key={hazard} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedAsbestosHazards.includes(hazard) ? 'bg-white border-red-300 ring-1 ring-red-500 shadow-sm' : 'bg-white border-slate-200 hover:border-red-200'}`}>
                              <input 
                                type="checkbox" 
                                checked={selectedAsbestosHazards.includes(hazard)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedAsbestosHazards([...selectedAsbestosHazards, hazard]);
                                  else setSelectedAsbestosHazards(selectedAsbestosHazards.filter(h => h !== hazard));
                                }}
                                className="mt-1 w-5 h-5 text-red-600 rounded border-slate-300 focus:ring-red-500" 
                              />
                              <span className={`text-sm ${selectedAsbestosHazards.includes(hazard) ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{hazard}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {substanceType === 'BIOSTOFF' && productName && (
                <div className="grid grid-cols-2 gap-6 bg-emerald-50/50 p-6 rounded-lg border border-emerald-200 mt-6 animate-in fade-in">
                  {BIO_TEMPLATES[productName] && BIO_TEMPLATES[productName].length > 0 && (
                    <div className="col-span-2 bg-white p-4 rounded border border-emerald-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-emerald-800">Typische Gefährdungen für diese Tätigkeit (bitte ankreuzen):</h4>
                        <button 
                          onClick={() => {
                            const resetHazards = selectedBioHazards.map(sh => {
                              const template = BIO_TEMPLATES[productName].find(t => t.id === sh.id);
                              return template ? { ...sh, path: template.path, isTargeted: false } : sh;
                            });
                            setSelectedBioHazards(resetHazards);
                          }}
                          className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1.5 rounded font-medium transition-colors"
                        >
                          Standard übernehmen
                        </button>
                      </div>
                      <div className="space-y-3">
                        {BIO_TEMPLATES[productName].map(hazard => {
                          const isSelected = selectedBioHazards.some(h => h.id === hazard.id);
                          const currentHazard = selectedBioHazards.find(h => h.id === hazard.id);
                          
                          return (
                            <div key={hazard.id} className="border rounded-lg overflow-hidden transition-colors hover:border-emerald-300">
                              <label className={`flex items-start gap-3 p-3 cursor-pointer ${isSelected ? 'bg-emerald-50' : 'bg-white'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBioHazards([...selectedBioHazards, { ...hazard, isTargeted: false }]);
                                    } else {
                                      setSelectedBioHazards(selectedBioHazards.filter(id => id.id !== hazard.id));
                                    }
                                  }}
                                  className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                                />
                                <div>
                                  <div className="font-bold text-slate-800">{hazard.label}</div>
                                  <div className="text-xs text-slate-500">Standard: Risikogruppe {hazard.rg} | {hazard.path}</div>
                                </div>
                              </label>
                              
                              {isSelected && currentHazard && (
                                <div className="bg-white p-4 border-t border-emerald-100 flex gap-6 items-start animate-in fade-in slide-in-from-top-2">
                                  <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Übertragungsweg anpassen:</label>
                                    <div className="space-y-1.5">
                                      {['Luft / Tröpfchen (Aerosol)', 'Kontakt / Schmierinfektion', 'Blut / Körperflüssigkeiten', 'Vektoren (Tiere, Insekten)'].map(p => {
                                        const keyword = p.split(' ')[0];
                                        const isChecked = currentHazard.path.includes(keyword);
                                        return (
                                          <label key={p} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                            <input type="checkbox" checked={isChecked} onChange={e => {
                                              let currentPaths = currentHazard.path.split(', ').filter(x => x && x !== '-');
                                              if (e.target.checked) {
                                                if (!currentPaths.some(cp => cp.includes(keyword))) currentPaths.push(p);
                                              } else {
                                                currentPaths = currentPaths.filter(cp => !cp.includes(keyword));
                                              }
                                              setSelectedBioHazards(selectedBioHazards.map(h => h.id === currentHazard.id ? { ...h, path: currentPaths.join(', ') || '-' } : h));
                                            }} className="rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                            <span className={isChecked ? 'font-medium text-slate-900' : 'text-slate-600'}>{p}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex-1 flex flex-col gap-4 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer border border-slate-200 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm">
                                      <input 
                                        type="checkbox" 
                                        checked={currentHazard.isTargeted}
                                        onChange={e => {
                                          setSelectedBioHazards(selectedBioHazards.map(h => h.id === currentHazard.id ? { ...h, isTargeted: e.target.checked } : h));
                                        }}
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                                      />
                                      <span className="text-sm font-bold text-slate-700">Gezielte Tätigkeit (Höhere Schutzstufe!)</span>
                                    </label>
                                    
                                    <div>
                                      <label className="block text-xs font-bold text-slate-700 mb-1">Eigene Notizen / Details:</label>
                                      <textarea 
                                        value={currentHazard.notes || ''} 
                                        onChange={e => setSelectedBioHazards(selectedBioHazards.map(h => h.id === currentHazard.id ? { ...h, notes: e.target.value } : h))}
                                        className="w-full text-sm border-slate-300 rounded-md focus:ring-emerald-500 p-2 placeholder:text-slate-400"
                                        rows={2}
                                        placeholder="Optionale Details zu dieser speziellen Gefährdung..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="col-span-2 bg-white p-4 rounded border border-emerald-100 shadow-sm">
                    <label className="font-bold text-emerald-800 mb-2 block">Eigene Erreger & Zusätzliche Bemerkungen</label>
                    <textarea
                      value={customBioNotes}
                      onChange={e => setCustomBioNotes(e.target.value)}
                      className="w-full border-slate-300 rounded-md focus:ring-emerald-500 text-sm text-slate-700 p-3 mb-4"
                      rows={2}
                      placeholder="Geben Sie hier zusätzliche oder spezifische Erreger ein..."
                    />
                    
                    {customBioNotes.trim() !== '' && (
                      <div className="bg-slate-50 p-4 rounded border border-slate-200 mt-2 animate-in fade-in">
                        <h5 className="font-bold text-slate-700 mb-3 text-sm">Einstellungen für eigene Erreger:</h5>
                        <div className="grid grid-cols-2 gap-4">
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
                                <div className="text-sm text-slate-500">Nein: Der Kontakt entsteht nur zufällig. Ja: Der Erreger wird bewusst bearbeitet.</div>
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
                      </div>
                    )}
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
                  <div className="col-span-2 mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-red-700 mb-1">Zusammenlagerungsverbote (Abschnitt 7.2 / 10.5)</label>
                      <textarea 
                        value={storageIncompatibilities} 
                        onChange={e => setStorageIncompatibilities(e.target.value)} 
                        rows={2}
                        placeholder="z.B. Nicht zusammen mit Oxidationsmitteln lagern"
                        className="w-full border-red-300 rounded-md focus:ring-red-500 bg-red-50 text-red-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-red-700 mb-1">Zu vermeidende Stoffe / Reaktionen (Abschnitt 10.5)</label>
                      <textarea 
                        value={incompatibleMaterials} 
                        onChange={e => setIncompatibleMaterials(e.target.value)} 
                        rows={2}
                        placeholder="z.B. Reagiert stark mit Metallen (Wasserstoffentwicklung)"
                        className="w-full border-red-300 rounded-md focus:ring-red-500 bg-red-50 text-red-900"
                      />
                    </div>
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
                      <select value={physicalState} onChange={e => setPhysicalState(e.target.value)} className={`w-full border-blue-200 rounded-md focus:ring-blue-500 font-bold ${aiExtractedFields.has('physicalState') ? 'bg-yellow-100' : ''}`}>
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
                          <input type="number" value={boilingPoint} onChange={e => setBoilingPoint(e.target.value === '' ? '' : Number(e.target.value))} className={`w-full border-slate-300 rounded focus:ring-blue-500 ${aiExtractedFields.has('boilingPoint') ? 'bg-yellow-100' : ''}`} />
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
                          <input type="number" value={vaporPressure} onChange={e => setVaporPressure(e.target.value === '' ? '' : Number(e.target.value))} className={`w-full border-slate-300 rounded focus:ring-blue-500 ${aiExtractedFields.has('vaporPressure') ? 'bg-yellow-100' : ''}`} />
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
                        <option value="AT 1">AT 1: Demontage von asbesthaltigen Flanschdichtungen</option>
                        <option value="AT 2">AT 2: Demontage asbesthaltiger Stopfbuchsen/Packungen</option>
                        <option value="AT 3">AT 3: Kfz-Kupplungen</option>
                        <option value="AT 4">AT 4: Kfz-Scheibenbremsen</option>
                        <option value="AT 5">AT 5: Kfz-Trommelbremsen</option>
                        <option value="AT 6">AT 6: Standardheizkessel – Wartung und Reinigung</option>
                        <option value="AT 7">AT 7: Standardheizkessel – Ausbau von Dichtschnüren</option>
                        <option value="AT 8.1">AT 8.1: Funktionsprüfung von Brandschutzklappen mit asbesthaltiger Anschlagdichtung</option>
                        <option value="AT 8.2">AT 8.2: Funktionsprüfung von Brandschutzklappen mit asbesthaltigen Bauteilen</option>
                        <option value="AT 8.3">AT 8.3: Funktionsprüfung asbesthaltiger Brandschutzklappen (Abluftklappen)</option>
                        <option value="BT 1">BT 1: Asbestzement(AZ)-Wasserrohrleitungen – Anbohrverfahren</option>
                        <option value="BT 3">BT 3: Asbestzement-Wasserrohrleitungen trennen – Rohrknacken</option>
                        <option value="BT 4">BT 4: Asbestzement-Wasserrohrleitungen trennen – Sägeverfahren</option>
                        <option value="BT 7">BT 7: Schornsteinfegerarbeiten − Kugelverfahren</option>
                        <option value="BT 8">BT 8: Schornsteinfegerarbeiten − Kameraverfahren</option>
                        <option value="BT 10">BT 10: Schornsteinfegerarbeiten − Schwammverfahren</option>
                        <option value="BT 11">BT 11: Ausbau von asbesthaltigen Vinylplatten ("Flexplatten")</option>
                        <option value="BT 12">BT 12: Anbohren von Asbestzementfassadenplatten – Anbohrverfahren</option>
                        <option value="BT 16">BT 16: Asbestzement(AZ)-Rohrleitungen – Berstliningverfahren</option>
                        <option value="BT 17">BT 17: Abschleifen von asbesthaltigen Bitumenklebern von mineralischem Untergrund</option>
                        <option value="BT 18">BT 18: Entfernen asbesthaltiger Estriche</option>
                        <option value="BT 19">BT 19: Reinigung und Beschichtung von Asbestzement-Fassadenplatten</option>
                        <option value="BT 21">BT 21: Asbestzement(AZ)-Wasserrohrleitungen – Hilfsrohrverfahren</option>
                        <option value="BT 22">BT 22: Reinigen und Beschichten von AZ-Lüftungskanälen</option>
                        <option value="BT 23">BT 23: Bohren von Fußböden mit asbesthaltigem Estrich</option>
                        <option value="BT 24">BT 24: Entfernen von fest gebundenen asbesthaltigen Platten in Netzstationen</option>
                        <option value="BT 25">BT 25: Sanierung häuslicher Entwässerungsleitungen aus Asbestzement</option>
                        <option value="BT 26">BT 26: Entfernung asbest- bzw. PAK-haltiger Oberflächenversiegelungen (Pasten-Verfahren)</option>
                        <option value="BT 27">BT 27: Abstrahlen von asbesthaltigen Anstrichstoffen (Vakuum-Saugstrahlverfahren)</option>
                        <option value="BT 28">BT 28: Bohren durch Außenwandkonstruktionen mit Asbestzementplatten</option>
                        <option value="BT 29">BT 29: Hochdruckreinigung von Abwasserkanälen aus Asbestzement</option>
                        <option value="BT 30">BT 30: Bohren in Wände und Decken mit asbesthaltiger Bekleidung</option>
                        <option value="BT 31">BT 31: Ausstanzen von asbesthaltigen Wand- und Deckenbekleidungen ("Stanzverfahren")</option>
                        <option value="BT 32">BT 32: Abstemmen asbesthaltiger Wand- und Deckenbekleidungen ("Stemmverfahren")</option>
                        <option value="BT 33">BT 33: Ausbau von Vinyl-Asbest-Platten inkl. Entfernen des Klebers</option>
                        <option value="BT 34">BT 34: Ausbau von Vinyl-Asbestwandplatten mittels Handspachtel</option>
                        <option value="BT 35">BT 35: Kernbohrungen zur Probenahme in asbesthaltigen Estrichen</option>
                        <option value="BT 36">BT 36: Entschichten asbesthaltiger Oberflächenversiegelungen (Nadel-Verfahren)</option>
                        <option value="BT 37">BT 37: Lösen geschraubter Verbindungsmittel (Schraub-Verfahren) im Freien</option>
                        <option value="BT 38">BT 38: Lösen geschraubter Verbindungsmittel (Schraub-Verfahren) unter Absaugung</option>
                        <option value="BT 39">BT 39: Bohren mit Kernbohrgerät auf Oberflächen mit asbesthaltigen Versiegelungen</option>
                        <option value="BT 40">BT 40: Fräsverfahren für die Boden- und Randbearbeitung</option>
                        <option value="BT 41">BT 41: Ausbau von Vinyl-Asbest-Platten mit einer Handschuhbox</option>
                        <option value="BT 42">BT 42: Ausbau von asbesthaltigem Kitt im Glasfalz</option>
                        <option value="BT 43">BT 43: Entfernen asbesthaltiger Wandbekleidungen (Fräsverfahren)</option>
                        <option value="BT 44">BT 44: Entfernen asbesthaltiger Deckenbekleidungen (Fräsverfahren)</option>
                        <option value="BT 45">BT 45: Lösen von Schrauben & Entschichtungen von Rohrleitungen</option>
                        <option value="BT 46">BT 46: Ausbau asbesthaltiger Fensterbänke</option>
                        <option value="BT 47">BT 47: Reinigung beschichteter Asbestzement-Fassaden mit Crack-System</option>
                        <option value="BT 48">BT 48: Instandhaltungsarbeiten im Türschlossbereich asbesthaltiger Brandschutztüren</option>
                        <option value="BT 49">BT 49: Entfernen asbesthaltiger Fugenmassen</option>
                        <option value="BT 50">BT 50: Kernbohrungen durch Wände mit asbesthaltigen Wandbekleidungen</option>
                        <option value="BT 51">BT 51: Kernbohrungen durch Bodenplatten und Zwischendecken aus Beton</option>
                        <option value="BT 52">BT 52: Reinigung beschichteter Asbestzement-Fassadenplatten (Algenmax)</option>
                        <option value="BT 53">BT 53: GSA-Strahlverfahren</option>
                        <option value="BT 54">BT 54: ENVIPRO-Verfahren</option>
                        <option value="BT 55">BT 55: Kernbohrungen zur Probenahme in asbesthaltigen Fußbodenaufbauten</option>
                        <option value="BT 56">BT 56: Ausbau von asbesthaltigem Kitt aus Glasfalz</option>
                        <option value="BT 57">BT 57: Abfräsen asbesthaltiger Wandbekleidungen sowie Entfernen von Fliesen</option>
                        <option value="BT 58">BT 58: Demontage asbesthaltiger Brandschutzklappen</option>
                        <option value="BT 59">BT 59: Reinigung beschichteter Asbestzement- Fassadenplatten (HD-Softstrahl)</option>
                        <option value="BT 60">BT 60: Erstellen von Topflöchern in Untergründen mit asbesthaltigen Bekleidungen</option>
                        <option value="BT 61">BT 61: Instandhaltung von Abwasserkanälen aus Asbestzement (Schlauchlining)</option>
                        <option value="BT 62">BT 62: Instandhaltung von Asbestzement-Druckrohrleitungen (kevlarverstärkt)</option>
                        <option value="BT 63">BT 63: Entfernen und funktionale Instandhaltung von Dachabdichtungen</option>
                        <option value="BT 64">BT 64: Herstellen von Kernbohrungen in asbesthaltigen Fußböden für Trocknungsarbeiten</option>
                        <option value="ET 1">ET 1: Asbesthaltige Elektrospeicherheizgeräte – Glove-Bag-Verfahren</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
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
      
      {/* Rechte Seite: PDF Vorschau (Sticky Sidebar) */}
      {sdbPreviewUrl && (
        <div className="hidden xl:block w-[600px] flex-shrink-0">
          <div className="sticky top-4 h-[calc(100vh-2rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4"/> SDB Vorschau</span>
              <button onClick={() => { setSdbPreviewUrl(null); setSdbFile(null); }} className="text-red-500 hover:text-red-700 font-medium">Schließen</button>
            </div>
            <div className="flex-1 w-full bg-slate-300">
              <object data={sdbPreviewUrl} type="application/pdf" className="w-full h-full">
                <iframe src={sdbPreviewUrl} className="w-full h-full" title="PDF Vorschau" />
              </object>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Mit Smartphone verbinden</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Scanne diesen QR-Code mit der normalen Kamera deines Smartphones. Das Etikett wird danach direkt auf das Handy fotografiert und die Daten landen automatisch hier auf dem PC!
            </p>
            
            <div className="flex justify-center mb-6 bg-slate-50 p-4 rounded-lg">
              <QRCodeSVG value={pairingUrl} size={200} />
            </div>
            
            <div className="animate-pulse text-indigo-600 font-medium mb-6 text-sm">
              Warte auf Scan vom Smartphone...
            </div>
            
            <button 
              onClick={() => {
                setShowQrModal(false);
                setPairingSessionId('');
              }}
              className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium w-full"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
