import { describe, it, expect } from 'vitest';
import { resolveClientName } from './resolveClientName';

describe('resolveClientName', () => {
    it('agrupa una variante bajo el nombre canónico cuando la palabra clave coincide', () => {
        const rules = [{ keyword: 'barato', canonicalName: 'Barato' }];
        expect(resolveClientName('Sugerido barato #1', rules)).toBe('Barato');
    });

    it('es insensible a mayúsculas y acentos', () => {
        const rules = [{ keyword: 'colonia', canonicalName: 'La Colonia' }];
        expect(resolveClientName('Supermercado LA COLONÍA orden#3005656881', rules)).toBe('La Colonia');
    });

    it('retorna el nombre original si ninguna regla coincide', () => {
        const rules = [{ keyword: 'barato', canonicalName: 'Barato' }];
        expect(resolveClientName('Comisariato Los Andes', rules)).toBe('Comisariato Los Andes');
    });

    it('la regla más específica (keyword más largo) gana sobre una genérica', () => {
        const rules = [
            { keyword: 'super', canonicalName: 'Genérico Super' },
            { keyword: 'super la colonia', canonicalName: 'La Colonia' },
        ];
        expect(resolveClientName('Super La Colonia Centro', rules)).toBe('La Colonia');
    });

    it('retorna el nombre original si no hay reglas', () => {
        expect(resolveClientName('Cualquier Cliente', [])).toBe('Cualquier Cliente');
    });

    it('retorna el nombre original si clientName está vacío', () => {
        expect(resolveClientName('', [{ keyword: 'barato', canonicalName: 'Barato' }])).toBe('');
    });
});
