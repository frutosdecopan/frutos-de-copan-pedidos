import { Order, OrderStatus, OrderType, User } from '../types';

export const exportOrdersToCSV = (orders: Order[], users: User[]) => {
    // 1. Define Headers
    const headers = [
        'ID Pedido',
        'Fecha Creación',
        'Cliente',
        'Vendedor',
        'Tipo',
        'Estado',
        'Bodega Origen',
        'Destino',
        'Repartidor',
        'Productos (Resumen)',
        'Total Productos'
    ];

    // 2. Transform Data
    const rows = orders.map(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString('es-HN');
        const deliveryUser = users.find(u => u.id === order.assignedDeliveryId)?.name || 'Sin asignar';

        // Summarize items: "3x Cafe (400g), 2x Miel"
        const itemsSummary = order.items.map(item =>
            `${item.quantity}x ${item.productName} (${item.presentationName})`
        ).join(', ');

        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

        return [
            order.id,
            orderDate,
            `"${order.clientName}"`, // Quote strings with spaces/commas
            `"${order.userName}"`,
            order.orderType,
            order.status,
            `"${order.warehouseName || ''}"`,
            `"${order.destinationName || ''}"`,
            `"${deliveryUser}"`,
            `"${itemsSummary}"`,
            totalItems
        ];
    });

    // 3. Construct CSV Content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
