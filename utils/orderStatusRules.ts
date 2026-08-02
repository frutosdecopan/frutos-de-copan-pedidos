import { Order, OrderStatus } from '../types';

// Bloquea transiciones de estado que dejarían un pedido en un estado
// inconsistente: pasar a despacho sin repartidor asignado, o revertir un
// pedido que ya salió a ruta con un repartidor asignado.
export const validateStatusTransition = (currentOrder: Order | undefined, newStatus: OrderStatus) => {
    if (!currentOrder) return; // order not loaded locally yet; let the write proceed

    if (newStatus === OrderStatus.DISPATCH && !currentOrder.assignedDeliveryId) {
        throw new Error('Debes asignar un repartidor antes de pasar a "En Despacho".');
    }

    if (
        currentOrder.status === OrderStatus.DISPATCH &&
        currentOrder.assignedDeliveryId &&
        newStatus !== OrderStatus.DELIVERED &&
        newStatus !== OrderStatus.CANCELLED
    ) {
        throw new Error('El pedido ya está en ruta con un repartidor asignado; no se puede revertir el estado.');
    }
};
