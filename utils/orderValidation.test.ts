import { describe, it, expect } from 'vitest';
import { isValidRtn, isValidPhone } from './orderValidation';

describe('isValidRtn', () => {
    it('acepta 13 dígitos', () => {
        expect(isValidRtn('1234567890123')).toBe(true);
    });

    it('acepta 14 dígitos', () => {
        expect(isValidRtn('12345678901234')).toBe(true);
    });

    it('rechaza otras longitudes', () => {
        expect(isValidRtn('123')).toBe(false);
        expect(isValidRtn('123456789012345')).toBe(false);
    });

    it('rechaza vacío (el llamador solo invoca esta función si el usuario ya escribió algo)', () => {
        expect(isValidRtn('')).toBe(false);
    });
});

describe('isValidPhone', () => {
    it('acepta 8 dígitos', () => {
        expect(isValidPhone('98765432')).toBe(true);
    });

    it('acepta 8 dígitos con separadores', () => {
        expect(isValidPhone('9876-5432')).toBe(true);
        expect(isValidPhone('9876 5432')).toBe(true);
    });

    it('rechaza otras longitudes', () => {
        expect(isValidPhone('123')).toBe(false);
        expect(isValidPhone('987654321')).toBe(false);
    });
});
