import * as XLSX from 'xlsx';

// Genera un archivo .xlsx real (no un .csv renombrado) — los números quedan
// como números dentro de la planilla, no como texto, y abre correctamente
// en Excel/LibreOffice/Google Sheets.
export const exportToExcel = (
    rows: Record<string, string | number>[],
    filename: string,
    sheetName = 'Reporte'
) => {
    if (!rows.length) return;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
