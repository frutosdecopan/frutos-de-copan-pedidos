import { describe, it, expect } from 'vitest';
import { validateStatusTransition } from './orderStatusRules';
import { Order, OrderStatus } from '../types';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'ORD-001',
    userId: 'seller-1',
    userName: 'Vendedor Uno',
    clientName: 'Cliente Prueba',
    originCityName: 'Copán',
    orderType: 'Venta',
    destinationName: 'Copán Ruinas',
    cityId: 'city-1',
    cityName: 'Copán',
    warehouseId: 'wh-1',
    warehouseName: 'Bodega Principal',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: OrderStatus.SENT,
    items: [],
    logs: [],
    ...overrides,
});

describe('validateStatusTransition', () => {
    it('no bloquea si el pedido aún no está cargado localmente', () => {
        expect(() => validateStatusTransition(undefined, OrderStatus.DISPATCH)).not.toThrow();
    });

    it('bloquea pasar a "En Despacho" sin repartidor asignado', () => {
        const order = makeOrder({ status: OrderStatus.PRODUCTION, assignedDeliveryId: undefined });
        expect(() => validateStatusTransition(order, OrderStatus.DISPATCH)).toThrow(/repartidor/i);
    });

    it('permite pasar a "En Despacho" con repartidor asignado', () => {
        const order = makeOrder({ status: OrderStatus.PRODUCTION, assignedDeliveryId: 'driver-1' });
        expect(() => validateStatusTransition(order, OrderStatus.DISPATCH)).not.toThrow();
    });

    it('bloquea revertir un pedido en despacho con repartidor a un estado anterior', () => {
        const order = makeOrder({ status: OrderStatus.DISPATCH, assignedDeliveryId: 'driver-1' });
        expect(() => validateStatusTransition(order, OrderStatus.PRODUCTION)).toThrow(/no se puede revertir/i);
    });

    it('permite marcar como Entregado un pedido en despacho con repartidor', () => {
        const order = makeOrder({ status: OrderStatus.DISPATCH, assignedDeliveryId: 'driver-1' });
        expect(() => validateStatusTransition(order, OrderStatus.DELIVERED)).not.toThrow();
    });

    it('permite cancelar un pedido en despacho con repartidor', () => {
        const order = makeOrder({ status: OrderStatus.DISPATCH, assignedDeliveryId: 'driver-1' });
        expect(() => validateStatusTransition(order, OrderStatus.CANCELLED)).not.toThrow();
    });

    it('permite transiciones normales que no involucran despacho', () => {
        const order = makeOrder({ status: OrderStatus.SENT });
        expect(() => validateStatusTransition(order, OrderStatus.REVIEW)).not.toThrow();
    });
});
