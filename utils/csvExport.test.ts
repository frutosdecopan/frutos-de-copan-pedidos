import { describe, it, expect } from 'vitest';
import { buildExportFileName } from './csvExport';

describe('buildExportFileName', () => {
    it('usa el rango de fechas cuando hay inicio y fin', () => {
        expect(buildExportFileName('reporte_pedidos', 'csv', { dateStart: '2026-01-01', dateEnd: '2026-01-31' }))
            .toBe('reporte_pedidos_2026-01-01_a_2026-01-31.csv');
    });

    it('usa solo la fecha de inicio si no hay fecha de fin', () => {
        expect(buildExportFileName('reporte_pedidos', 'csv', { dateStart: '2026-01-01' }))
            .toBe('reporte_pedidos_desde_2026-01-01.csv');
    });

    it('usa solo la fecha de fin si no hay fecha de inicio', () => {
        expect(buildExportFileName('reporte_pedidos', 'csv', { dateEnd: '2026-01-31' }))
            .toBe('reporte_pedidos_hasta_2026-01-31.csv');
    });

    it('usa la fecha de hoy cuando no hay filtros', () => {
        const today = new Date().toISOString().split('T')[0];
        expect(buildExportFileName('reporte_pedidos', 'csv')).toBe(`reporte_pedidos_${today}.csv`);
    });
});
