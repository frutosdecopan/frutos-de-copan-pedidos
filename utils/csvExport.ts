import { Order, OrderStatus, OrderType, User } from '../types';

interface ExportDateFilters {
    dateStart?: string;
    dateEnd?: string;
}

export const buildExportFileName = (baseName: string, extension: string, filters?: ExportDateFilters) => {
    const { dateStart, dateEnd } = filters || {};
    if (dateStart && dateEnd) return `${baseName}_${dateStart}_a_${dateEnd}.${extension}`;
    if (dateStart) return `${baseName}_desde_${dateStart}.${extension}`;
    if (dateEnd) return `${baseName}_hasta_${dateEnd}.${extension}`;
    return `${baseName}_${new Date().toISOString().split('T')[0]}.${extension}`;
};

export const exportOrdersToCSV = (orders: Order[], users: User[], filters?: ExportDateFilters) => {
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
        'Productos',
        'Total Productos'
    ];

    // 2. Transform Data
    const rows = orders.map(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString('es-HN');
        const deliveryUser = users.find(u => u.id === order.assignedDeliveryId)?.name || 'Sin asignar';

        // List each product on its own line, e.g. "15 Libra de Fresa" (same format used in the app UI and PDF export)
        const itemsSummary = order.items.map(item =>
            `${item.quantity} ${item.presentationName} de ${item.productName}`
        ).join('\n');

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
    link.setAttribute('download', buildExportFileName('reporte_pedidos', 'csv', filters));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
