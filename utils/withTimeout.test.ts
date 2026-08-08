import { describe, it, expect, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
    it('resuelve normalmente si la promesa termina antes del límite', async () => {
        const result = await withTimeout(Promise.resolve('ok'), 1000, 'test');
        expect(result).toBe('ok');
    });

    it('propaga el rechazo original si la promesa falla antes del límite', async () => {
        await expect(withTimeout(Promise.reject(new Error('boom')), 1000, 'test')).rejects.toThrow('boom');
    });

    it('rechaza con un mensaje claro si se excede el límite de tiempo', async () => {
        vi.useFakeTimers();
        const neverResolves = new Promise(() => { });
        const result = withTimeout(neverResolves, 5000, 'fetchOrders');

        vi.advanceTimersByTime(5000);

        await expect(result).rejects.toThrow(/Tiempo de espera agotado \(fetchOrders\)/);
        vi.useRealTimers();
    });
});
