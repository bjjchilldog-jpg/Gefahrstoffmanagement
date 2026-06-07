import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver';

export const generateBetriebsanweisung = async (data: any) => {
  // Determine border color based on substance type
  let borderColor = 'FF0000'; // Default Red for GEFAHRSTOFF
  if (data.type === 'BIOSTOFF') borderColor = '008000'; // Green
  else if (data.type === 'ACTIVITY') borderColor = '0000FF'; // Blue

  const borderDefinition = {
    top: { style: BorderStyle.THICK, size: 24, color: borderColor },
    bottom: { style: BorderStyle.THICK, size: 24, color: borderColor },
    left: { style: BorderStyle.THICK, size: 24, color: borderColor },
    right: { style: BorderStyle.THICK, size: 24, color: borderColor }
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
          }
        },
        children: [
          // Main Table wrapped in colored border
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: borderDefinition,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    margins: { top: 400, bottom: 400, left: 400, right: 400 },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'BETRIEBSANWEISUNG', bold: true, size: 36, font: 'Arial' })
                        ],
                        alignment: 'center',
                        spacing: { after: 400 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `Arbeitsbereich: ${data.workAreaName || 'Allgemein'}`, size: 24, font: 'Arial' }),
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `Datum: ${new Date().toLocaleDateString('de-DE')}`, size: 24, font: 'Arial' }),
                        ],
                        spacing: { after: 400 }
                      }),
                      
                      // 1. ANWENDUNGSBEREICH
                      new Paragraph({
                        children: [new TextRun({ text: '1. ANWENDUNGSBEREICH / ARBEITSPLATZ', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })],
                        shading: { fill: borderColor },
                        spacing: { before: 200, after: 100 }
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: data.productName || 'Unbekannter Stoff', bold: true, size: 28, font: 'Arial' })],
                        spacing: { after: 200 }
                      }),

                      // 2. GEFAHREN FÜR MENSCH UND UMWELT
                      new Paragraph({
                        children: [new TextRun({ text: '2. GEFAHREN FÜR MENSCH UND UMWELT', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })],
                        shading: { fill: borderColor },
                        spacing: { before: 200, after: 100 }
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: data.hazards || 'Gefahrenhinweise (H-Sätze) hier einfügen...', size: 22, font: 'Arial' })],
                        spacing: { after: 200 }
                      }),

                      // 3. SCHUTZMAßNAHMEN UND VERHALTENSREGELN
                      new Paragraph({
                        children: [new TextRun({ text: '3. SCHUTZMAßNAHMEN UND VERHALTENSREGELN', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })],
                        shading: { fill: borderColor },
                        spacing: { before: 200, after: 100 }
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: data.precautions || 'Allgemeine Schutzmaßnahmen:', size: 22, font: 'Arial' })],
                        spacing: { after: 100 }
                      }),
                      ...(data.effectivenessChecks && data.effectivenessChecks.length > 0 ? 
                        data.effectivenessChecks.map((c: any) => new Paragraph({
                          children: [new TextRun({ text: `• [EMKG ${c.guidelineCode}] ${c.title}`, size: 22, font: 'Arial' })],
                          spacing: { after: 100, left: 360 }
                        })) : [
                          new Paragraph({
                            children: [new TextRun({ text: 'Keine spezifischen P-Sätze hinterlegt.', size: 22, font: 'Arial' })],
                            spacing: { after: 200 }
                          })
                        ]
                      ),
                      new Paragraph({ spacing: { after: 200 } }),

                      // 4. VERHALTEN IM GEFAHRENFALL
                      new Paragraph({
                        children: [new TextRun({ text: '4. VERHALTEN IM GEFAHRENFALL', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })],
                        shading: { fill: borderColor },
                        spacing: { before: 200, after: 100 }
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'Ruhe bewahren. Gefahrbereich verlassen. Vorgesetzten informieren.', size: 22, font: 'Arial' })],
                        spacing: { after: 200 }
                      }),

                      // 5. ERSTE HILFE
                      new Paragraph({
                        children: [new TextRun({ text: '5. ERSTE HILFE', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })],
                        shading: { fill: borderColor },
                        spacing: { before: 200, after: 100 }
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'Bei Augenkontakt: Behutsam mit Wasser spülen. Bei Hautkontakt: Mit viel Wasser abwaschen. Ersthelfer verständigen.', size: 22, font: 'Arial' })],
                        spacing: { after: 200 }
                      }),

                      // 6. SACHGERECHTE ENTSORGUNG
                      new Paragraph({
                        children: [new TextRun({ text: '6. SACHGERECHTE ENTSORGUNG', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })],
                        shading: { fill: borderColor },
                        spacing: { before: 200, after: 100 }
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'Nicht in den Ausguss leeren. Fachgerecht als Sonderabfall entsorgen.', size: 22, font: 'Arial' })]
                      }),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Betriebsanweisung_${data.productName?.replace(/[^a-z0-9]/gi, '_') || 'Stoff'}.docx`);
};
