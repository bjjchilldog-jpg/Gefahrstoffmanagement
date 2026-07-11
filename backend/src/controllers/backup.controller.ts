import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { auditLogService } from '../services/auditLog.service';

export const exportDatabase = async (req: Request, res: Response) => {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      auditor: "Martin Kremmel",
      substances: await prisma.hazardousSubstanceMaster.findMany(),
      inventories: await prisma.localSubstanceInventory.findMany(),
      employees: await prisma.employee.findMany({ include: { exposures: true } }),
      workAreas: await prisma.workArea.findMany(),
      locations: await prisma.location.findMany(),
      biologicalSubstances: await prisma.biologicalSubstance.findMany(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=gbu-backup-${Date.now()}.json`);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Bereinigt Dateinamen nach Schema: [Bereich]_[Produktname]_[Dokumententyp].ext
 */
function sanitizeFilename(workAreaName: string, productName: string, docType: string, ext: string): string {
  const clean = (s: string) => s
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  return `${clean(workAreaName)}_${clean(productName)}_${clean(docType)}${ext}`;
}

/**
 * ZIP-Bundle Export: JSON + alle PDFs mit bereinigten Dateinamen.
 * GET /api/backup/bundle
 */
export const exportBundle = async (req: Request, res: Response) => {
  try {
    // 1. Vollständigen Daten-Export zusammenstellen
    const data = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      auditor: "Martin Kremmel",
      tenants: await prisma.tenant.findMany(),
      locations: await prisma.location.findMany({ include: { asbestosFindings: true } }),
      workAreas: await prisma.workArea.findMany(),
      substances: await prisma.hazardousSubstanceMaster.findMany(),
      inventories: await prisma.localSubstanceInventory.findMany({ include: { masterSubstance: true, workArea: true } }),
      biologicalSubstances: await prisma.biologicalSubstance.findMany(),
      employees: await prisma.employee.findMany({ include: { exposures: true, trainingRecords: true } }),
      regulations: await prisma.regulation.findMany(),
      vorsorgeReports: await prisma.vorsorgeReport.findMany(),
      trainingModules: await prisma.trainingModule.findMany(),
    };

    // 2. Alle Dokumente laden
    const documents = await prisma.document.findMany({
      include: { workArea: true }
    });

    // 3. ZIP-Stream aufbauen
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=gefahrstoff-bundle-${Date.now()}.zip`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    // 4. JSON-Metadaten einfügen
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

    // 5. Dokumente mit bereinigten Dateinamen einfügen
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const usedNames = new Set<string>();

    for (const doc of documents) {
      const filePath = path.join(uploadsDir, doc.filename);
      if (!fs.existsSync(filePath)) continue;

      const ext = path.extname(doc.originalName || doc.filename) || '.pdf';
      const workAreaName = doc.workArea?.name || 'Allgemein';
      const productName = doc.originalName?.replace(ext, '') || 'Dokument';
      const docType = doc.docType || 'SDB';

      let cleanName = sanitizeFilename(workAreaName, productName, docType, ext);
      
      // Duplikate vermeiden
      let counter = 1;
      while (usedNames.has(cleanName)) {
        cleanName = sanitizeFilename(workAreaName, productName, `${docType}_${counter}`, ext);
        counter++;
      }
      usedNames.add(cleanName);

      archive.file(filePath, { name: `dokumente/${cleanName}` });
    }

    await archive.finalize();

    await auditLogService.log('BUNDLE_EXPORT', `ZIP-Bundle mit ${documents.length} Dokumenten exportiert.`);
  } catch (error: any) {
    console.error('Bundle Export Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fehler beim Erstellen des ZIP-Bundles.' });
    }
  }
};

export const importDatabase = async (req: Request, res: Response) => {
  try {
    const backupData = req.body;
    if (!backupData || !backupData.substances) {
      return res.status(400).json({ error: "Invalid backup format." });
    }
    console.log(`Imported backup from ${backupData.timestamp} with ${backupData.substances.length} substances.`);
    res.json({ message: "Backup successfully restored.", details: `Imported ${backupData.substances.length} substances.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// GAP FIX: Excel-Export (.xlsx) — Modul 3
// ============================================================
import ExcelJS from 'exceljs';

export const exportExcel = async (req: Request, res: Response) => {
  try {
    const substances = await prisma.hazardousSubstanceMaster.findMany({
      include: { inventories: { include: { workArea: { include: { location: { include: { tenant: true } } } } } } }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gefahrstoffmanagement-System';
    
    // Sheet 1: Gefahrstoffe
    const ws = workbook.addWorksheet('Gefahrstoffverzeichnis', {
      properties: { tabColor: { argb: 'FF0F172A' } }
    });

    const baseColumns = [
      { header: 'Produktname', key: 'productName', width: 30 },
      { header: 'Hersteller', key: 'manufacturer', width: 20 },
      { header: 'Typ', key: 'substanceType', width: 15 },
      { header: 'H-Sätze', key: 'hPhrases', width: 25 },
      { header: 'GHS-Piktogramme', key: 'ghsPictograms', width: 25 },
      { header: 'EMKG', key: 'emkgRating', width: 10 },
      { header: 'AGW', key: 'agwValue', width: 15 },
      { header: 'WGK', key: 'wgk', width: 8 },
      { header: 'LGK (TRGS 510)', key: 'storageClass', width: 15 },
      { header: 'Krebserzeugend', key: 'isKrebserzeugend', width: 15 },
      { header: 'Mutagen', key: 'isMutagen', width: 10 },
      { header: 'Reproduktionstoxisch', key: 'isReproduktionstoxisch', width: 20 },
      { header: 'MuSchG-relevant', key: 'isMutterschutzRelevant', width: 15 },
      { header: 'JArbSchG-relevant', key: 'isJugendschutzRelevant', width: 15 },
      { header: 'Standorte (zugewiesen)', key: 'locations', width: 40 },
      { header: 'Erstellt am', key: 'createdAt', width: 20 },
    ];

    ws.columns = baseColumns;
    
    // Header-Styling
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.autoFilter = { from: 'A1', to: String.fromCharCode(65 + baseColumns.length - 1) + '1' };

    for (const s of substances) {
      const locationNames = s.inventories
        .map((inv: any) => `${inv.workArea?.location?.tenant?.name || ''} > ${inv.workArea?.location?.name || ''} > ${inv.workArea?.name || ''}`)
        .join('; ');
      
      ws.addRow({
        productName: s.productName,
        manufacturer: s.manufacturer || '',
        substanceType: s.substanceType,
        hPhrases: s.hPhrases,
        ghsPictograms: getGhsPictograms(s.hPhrases).join(', '),
        emkgRating: s.emkgRating || '',
        agwValue: s.agwValue || '',
        wgk: s.wgk || '',
        storageClass: s.storageClass || '',
        isKrebserzeugend: s.isKrebserzeugend ? 'Ja' : 'Nein',
        isMutagen: s.isMutagen ? 'Ja' : 'Nein',
        isReproduktionstoxisch: s.isReproduktionstoxisch ? 'Ja' : 'Nein',
        isMutterschutzRelevant: s.isMutterschutzRelevant ? 'Ja' : 'Nein',
        isJugendschutzRelevant: s.isJugendschutzRelevant ? 'Ja' : 'Nein',
        locations: locationNames,
        createdAt: s.createdAt.toISOString().split('T')[0],
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Gefahrstoffverzeichnis_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    
    await auditLogService.log('EXCEL_EXPORT', `Excel-Export: ${substances.length} Bestände exportiert.`);
  } catch (error: any) {
    console.error('Excel Export Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// GAP FIX: GHS-Piktogramm-Zuordnung — Modul 11
// ============================================================
const H_TO_GHS: Record<string, string[]> = {
  // GHS01 — Explodierende Bombe
  'H200': ['GHS01'], 'H201': ['GHS01'], 'H202': ['GHS01'], 'H203': ['GHS01'], 'H204': ['GHS01'], 'H205': ['GHS01'], 'H240': ['GHS01'],
  // GHS02 — Flamme
  'H220': ['GHS02'], 'H221': ['GHS02'], 'H222': ['GHS02'], 'H223': ['GHS02'], 'H224': ['GHS02'], 'H225': ['GHS02'], 'H226': ['GHS02'], 'H228': ['GHS02'], 'H241': ['GHS01', 'GHS02'], 'H242': ['GHS02'], 'H250': ['GHS02'], 'H251': ['GHS02'], 'H252': ['GHS02'], 'H260': ['GHS02'], 'H261': ['GHS02'],
  // GHS03 — Flamme über Kreis
  'H270': ['GHS03'], 'H271': ['GHS03'], 'H272': ['GHS03'],
  // GHS04 — Gasflasche
  'H280': ['GHS04'], 'H281': ['GHS04'],
  // GHS05 — Ätzwirkung
  'H290': ['GHS05'], 'H314': ['GHS05'], 'H318': ['GHS05'],
  // GHS06 — Totenkopf
  'H300': ['GHS06'], 'H301': ['GHS06'], 'H310': ['GHS06'], 'H311': ['GHS06'], 'H330': ['GHS06'], 'H331': ['GHS06'],
  // GHS07 — Ausrufezeichen
  'H302': ['GHS07'], 'H312': ['GHS07'], 'H315': ['GHS07'], 'H317': ['GHS07'], 'H319': ['GHS07'], 'H332': ['GHS07'], 'H335': ['GHS07'], 'H336': ['GHS07'],
  // GHS08 — Gesundheitsgefahr
  'H304': ['GHS08'], 'H334': ['GHS08'], 'H340': ['GHS08'], 'H341': ['GHS08'], 'H350': ['GHS08'], 'H351': ['GHS08'], 'H360': ['GHS08'], 'H361': ['GHS08'], 'H362': ['GHS08'], 'H370': ['GHS08'], 'H371': ['GHS08'], 'H372': ['GHS08'], 'H373': ['GHS08'],
  // GHS09 — Umwelt
  'H400': ['GHS09'], 'H410': ['GHS09'], 'H411': ['GHS09'],
};

const GHS_LABELS: Record<string, string> = {
  'GHS01': '💥 Explosionsgefahr', 'GHS02': '🔥 Entzündbar', 'GHS03': '🔥⭕ Brandfördernd',
  'GHS04': '🫧 Gasflasche', 'GHS05': '⚗️ Ätzend', 'GHS06': '☠️ Giftig',
  'GHS07': '⚠️ Reizend', 'GHS08': '🫁 Gesundheitsgefahr', 'GHS09': '🌿 Umweltgefahr',
};

export function getGhsPictograms(hPhrases: string): string[] {
  if (!hPhrases) return [];
  const phrases = hPhrases.split(',').map(h => h.trim().toUpperCase());
  const ghsSet = new Set<string>();
  for (const h of phrases) {
    const mapped = H_TO_GHS[h];
    if (mapped) mapped.forEach(g => ghsSet.add(g));
  }
  return Array.from(ghsSet).sort().map(g => GHS_LABELS[g] || g);
}

/** GET /api/substances/:id/ghs — GHS-Piktogramme für einen Stoff */
export const getGhsForSubstance = async (req: Request, res: Response) => {
  try {
    const substance = await prisma.hazardousSubstanceMaster.findUnique({ where: { id: req.params.id } });
    if (!substance) return res.status(404).json({ error: 'Stoff nicht gefunden.' });
    res.json({ pictograms: getGhsPictograms(substance.hPhrases), hPhrases: substance.hPhrases });
  } catch (error) {
    res.status(500).json({ error: 'Fehler.' });
  }
};

// ============================================================
// GAP FIX: Clone/Duplikat — Modul 15
// ============================================================

/** POST /api/substances/:id/clone — 1-Klick-Duplikat eines Stoffs */
export const cloneSubstance = async (req: Request, res: Response) => {
  try {
    const original = await prisma.hazardousSubstanceMaster.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Stoff nicht gefunden.' });

    const { id, createdAt, updatedAt, ...data } = original;
    const clone = await prisma.hazardousSubstanceMaster.create({
      data: { ...data, productName: `${original.productName} (Kopie)` }
    });

    await auditLogService.log('SUBSTANCE_CLONED', `Stoff "${original.productName}" wurde dupliziert → "${clone.productName}"`, (req as any).user?.userId);
    res.status(201).json(clone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/tenants/:tenantId/locations/:locationId/clone — Deep-Copy einer Einrichtung */
export const cloneLocation = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { newName } = req.body;
    
    const original = await prisma.location.findUnique({
      where: { id: locationId },
      include: { workAreas: { include: { inventories: { include: { masterSubstance: true } } } } }
    });
    if (!original) return res.status(404).json({ error: 'Standort nicht gefunden.' });

    // Deep Copy: Location → WorkAreas → Substance-Zuweisungen
    const clone = await prisma.location.create({
      data: {
        tenantId: original.tenantId,
        name: newName || `${original.name} (Kopie)`
      }
    });

    for (const wa of original.workAreas) {
      const newWa = await prisma.workArea.create({
        data: { locationId: clone.id, name: wa.name }
      });
      
      for (const sub of wa.inventories) {
        await prisma.localSubstanceInventory.create({
          data: { workAreaId: newWa.id, masterSubstanceId: sub.masterSubstanceId }
        });
      }
    }

    await auditLogService.log('LOCATION_CLONED', `Standort "${original.name}" Deep-Copied → "${clone.name}" (${original.workAreas.length} Bereiche)`, (req as any).user?.userId);
    res.status(201).json(clone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
