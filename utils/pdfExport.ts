import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, OrderStatus } from '../types';

interface FilterOptions {
    searchTerm?: string;
    filterCity?: string;
    filterStatus?: string;
    filterType?: string;
    filterSeller?: string;
    dateStart?: string;
    dateEnd?: string;
}

export const exportOrdersToPDF = (orders: Order[], filters?: FilterOptions) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Brand colors as tuples
    const brandColor: [number, number, number] = [212, 175, 55]; // Golden/Yellow
    const darkGray: [number, number, number] = [55, 65, 81];
    const lightGray: [number, number, number] = [243, 244, 246];

    // Header
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title background
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Frutos de Copán', 14, 12);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Pedidos', 14, 19);

    // Date
    const currentDate = new Date().toLocaleDateString('es-HN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.setFontSize(10);
    doc.text(currentDate, pageWidth - 14, 12, { align: 'right' });

    // Filter info
    if (filters) {
        let filterText = 'Filtros aplicados: ';
        const activeFilters: string[] = [];

        if (filters.filterStatus && filters.filterStatus !== 'all') {
            activeFilters.push(`Estado: ${filters.filterStatus}`);
        }
        if (filters.filterCity && filters.filterCity !== 'all') {
            activeFilters.push(`Ciudad: ${filters.filterCity}`);
        }
        if (filters.filterType && filters.filterType !== 'all') {
            activeFilters.push(`Tipo: ${filters.filterType}`);
        }
        if (filters.filterSeller && filters.filterSeller !== 'all') {
            activeFilters.push(`Vendedor: ${filters.filterSeller}`);
        }
        if (filters.searchTerm) {
            activeFilters.push(`Búsqueda: "${filters.searchTerm}"`);
        }

        if (activeFilters.length > 0) {
            filterText += activeFilters.join(', ');
            doc.setFontSize(8);
            doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
            doc.text(filterText, pageWidth - 14, 19, { align: 'right' });
        }
    }

    // Prepare table data
    const tableData = orders.map(order => {
        const productsText = order.items
            .map(item => `${item.productName} (${item.quantity})`)
            .join(', ');

        const statusText = getStatusText(order.status);
        const deliveryName = order.assignedDeliveryId ? 'Asignado' : 'Sin asignar';

        return [
            order.id.substring(0, 8),
            order.clientName,
            order.destinationName,
            productsText.length > 50 ? productsText.substring(0, 47) + '...' : productsText,
            statusText,
            deliveryName,
            new Date(order.createdAt).toLocaleDateString('es-HN')
        ];
    });

    // Table
    autoTable(doc, {
        head: [['ID', 'Cliente', 'Ciudad', 'Productos', 'Estado', 'Repartidor', 'Fecha']],
        body: tableData,
        startY: 30,
        theme: 'striped',
        headStyles: {
            fillColor: brandColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 8,
            textColor: darkGray
        },
        alternateRowStyles: {
            fillColor: lightGray
        },
        columnStyles: {
            0: { cellWidth: 20 }, // ID
            1: { cellWidth: 35 }, // Cliente
            2: { cellWidth: 30 }, // Ciudad
            3: { cellWidth: 70 }, // Productos
            4: { cellWidth: 25 }, // Estado
            5: { cellWidth: 35 }, // Repartidor
            6: { cellWidth: 25 }  // Fecha
        },
        margin: { top: 30, left: 14, right: 14 },
        didDrawPage: (data) => {
            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

            doc.setFontSize(8);
            doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
            doc.text(
                `Página ${currentPage} de ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );

            doc.text(
                `Total de pedidos: ${orders.length}`,
                14,
                pageHeight - 10
            );
        }
    });

    // Summary statistics
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    if (finalY < pageHeight - 40) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.text('Resumen', 14, finalY);

        const stats = getOrderStats(orders);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        let yPos = finalY + 6;
        doc.text(`• Total de pedidos: ${stats.total}`, 14, yPos);
        yPos += 5;
        doc.text(`• Completados: ${stats.completed} (${stats.completedPercent}%)`, 14, yPos);
        yPos += 5;
        doc.text(`• Pendientes: ${stats.pending}`, 14, yPos);
        yPos += 5;
        doc.text(`• Cancelados: ${stats.cancelled}`, 14, yPos);
    }

    // Save PDF
    const fileName = `pedidos_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

const getStatusText = (status: OrderStatus): string => {
    const statusMap: Record<OrderStatus, string> = {
        [OrderStatus.DRAFT]: 'Borrador',
        [OrderStatus.SENT]: 'Enviado',
        [OrderStatus.REVIEW]: 'En Revisión',
        [OrderStatus.PRODUCTION]: 'En Producción',
        [OrderStatus.DISPATCH]: 'En Despacho',
        [OrderStatus.DELIVERED]: 'Entregado',
        [OrderStatus.CANCELLED]: 'Cancelado',
        [OrderStatus.REJECTED]: 'Rechazado'
    };
    return statusMap[status] || status;
};

const getOrderStats = (orders: Order[]) => {
    const total = orders.length;
    const completed = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
    const pending = orders.filter(o =>
        [OrderStatus.SENT, OrderStatus.REVIEW, OrderStatus.PRODUCTION, OrderStatus.DISPATCH].includes(o.status)
    ).length;
    const cancelled = orders.filter(o => o.status === OrderStatus.CANCELLED).length;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, cancelled, completedPercent };
};
