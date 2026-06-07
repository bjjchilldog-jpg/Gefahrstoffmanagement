import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

// Hilfsfunktion: IDs sicher aus dem Request holen (egal ob Frontend GET oder POST nutzt)
const getSelectedIds = (req: Request): string[] => {
  if (req.body && req.body.selectedIds && Array.isArray(req.body.selectedIds)) {
    return req.body.selectedIds;
  }
  if (req.query.ids && typeof req.query.ids === 'string') {
    return req.query.ids.split(',');
  }
  return [];
};

// ---------------------------------------------------------
// 1. EXCEL EXPORT
// ---------------------------------------------------------
export const exportExcel = async (req: Request, res: Response) => {
  try {
    const selectedIds = getSelectedIds(req);
    
    // Die absolute Wahrheit: Sind IDs ausgewählt, filtere danach. Wenn nicht, hol alle.
    const whereClause = selectedIds.length > 0 ? { id: { in: selectedIds } } : {};

    // Da wir IDs exportieren, beziehen sich diese auf LocalSubstanceInventory IDs.
    const substances = await prisma.localSubstanceInventory.findMany({
      where: whereClause,
      include: { masterSubstance: true }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gefahrstoffe');

    // Spaltenköpfe exakt nach deinem Schema
    worksheet.columns = [
      { header: 'Produktname', key: 'productName', width: 25 },
      { header: 'Hersteller', key: 'manufacturer', width: 20 },
      { header: 'H-Sätze', key: 'hPhrases', width: 15 },
      { header: 'EMKG', key: 'emkgRating', width: 10 },
      { header: 'AGW', key: 'agwValue', width: 10 },
    ];

    // Reale Datenbank-Einträge in die Zeilen füllen
    substances.forEach(sub => {
      const ms = sub.masterSubstance;
      worksheet.addRow({
        productName: ms.productName,
        manufacturer: ms.manufacturer || '-',
        hPhrases: ms.hPhrases,
        emkgRating: ms.emkgRating || '-',
        agwValue: ms.agwValue || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=gefahrstoffe.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Fehler:", error);
    res.status(500).send("Fehler beim Generieren der Excel-Datei.");
  }
};

// ---------------------------------------------------------
// 2. CSV EXPORT
// ---------------------------------------------------------
export const exportCsv = async (req: Request, res: Response) => {
  try {
    const selectedIds = getSelectedIds(req);
    const whereClause = selectedIds.length > 0 ? { id: { in: selectedIds } } : {};

    const substances = await prisma.localSubstanceInventory.findMany({
      where: whereClause,
      include: { masterSubstance: true }
    });

    // UTF-8 BOM für deutsches Excel + Semikolon-Trennung
    let csvContent = '\uFEFF'; 
    csvContent += "Produktname;Hersteller;H-Sätze;EMKG;AGW\n";

    substances.forEach(sub => {
      const ms = sub.masterSubstance;
      // Wenn ein Feld leer ist, setzen wir einen leeren String, damit die Spalten nicht verrutschen
      csvContent += `"${ms.productName}";"${ms.manufacturer || ''}";"${ms.hPhrases}";"${ms.emkgRating || ''}";"${ms.agwValue || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=gefahrstoffe.csv');
    res.send(csvContent);
  } catch (error) {
    console.error("CSV Fehler:", error);
    res.status(500).send("Fehler beim Generieren der CSV-Datei.");
  }
};

// ---------------------------------------------------------
// 3. FEUERWEHR EXPORT (JSON für Print-View)
// ---------------------------------------------------------
export const exportFireDeptData = async (req: Request, res: Response) => {
  try {
    const substances = await prisma.localSubstanceInventory.findMany({
      include: { 
        masterSubstance: true,
        workArea: {
          include: { location: true }
        }
      },
      orderBy: { maxStorageAmount: 'desc' }
    });

    res.json(substances);
  } catch (error) {
    console.error("Feuerwehr Export Fehler:", error);
    res.status(500).json({ error: "Fehler beim Laden der Feuerwehr-Daten." });
  }
};