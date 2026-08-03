import { FC, useState, useMemo, useEffect } from 'react';
import { ClipboardList, BarChart3, Users, Edit2, Truck, Search, Filter, Calendar, X, ChevronDown, ChevronUp, Clock, Download, MessageSquare, FileText } from 'lucide-react';
import { User, Order, OrderStatus, UserRole } from '../../types';
import { useCities } from '../../hooks/useCities';
import { useOrderTypes } from '../../hooks/useOrderTypes';
import { OrderFilters } from '../../hooks/useOrders';
import { useToast } from '../../ToastContext';
import { TypeBadge, StatusBadge, TableSkeleton, CardSkeleton } from '../common';
import { RejectOrderModal } from '../orders/RejectOrderModal';
import { OrderHistoryModal } from '../orders/OrderHistoryModal';
import { OrderCommentsModal } from '../orders/OrderCommentsModal';
import { exportOrdersToCSV } from '../../utils/csvExport';
import { exportOrdersToPDF } from '../../utils/pdfExport';

interface ManagementDashboardProps {
    user: User;
    orders: Order[];
    users: User[];
    onUpdateStatus: (id: string, status: OrderStatus, reason?: string) => void;
    onAssignDelivery: (orderId: string, deliveryUserId: string) => void;
    onEditOrder: (order: Order) => void;
    onAddComment: (orderId: string, content: string) => Promise<void>;
    loadMore: () => void;
    hasMore: boolean;
    fetchOrdersForExport: (filters: OrderFilters) => Promise<Order[]>;
    isDark: boolean;
    isLoadingOrders?: boolean;
}

export const ManagementDashboard: FC<ManagementDashboardProps> = ({
    user, orders, users, onUpdateStatus, onAssignDelivery, onEditOrder, onAddComment, loadMore, hasMore, fetchOrdersForExport, isDark, isLoadingOrders
}) => {
    const { addToast } = useToast();
    const { cities, loading: citiesLoading } = useCities();
    const { orderTypes } = useOrderTypes();

    // Basic Filters
    const [activeTab, setActiveTab] = useState<'orders' | 'consolidated'>('orders');
    const [showFilters, setShowFilters] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('all'); // "Bodega / Destino"
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterSeller, setFilterSeller] = useState('all');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);

    // Reject/Cancel Modal State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRejectOrderId, setSelectedRejectOrderId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);

    // Comments Modal State — stores only the id so the shown order always
    // reflects live updates (e.g. a comment arriving via realtime) instead
    // of a snapshot frozen at the moment the modal was opened.
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [selectedCommentsOrderId, setSelectedCommentsOrderId] = useState<string | null>(null);
    const selectedCommentsOrder = useMemo(
        () => orders.find(o => o.id === selectedCommentsOrderId) || null,
        [orders, selectedCommentsOrderId]
    );

    const handleOpenHistory = (order: Order) => {
        setSelectedHistoryOrder(order);
        setShowHistoryModal(true);
    };

    const handleOpenComments = (order: Order) => {
        setSelectedCommentsOrderId(order.id);
        setShowCommentsModal(true);
    };

    const handleOpenRejectModal = (orderId: string) => {
        setSelectedRejectOrderId(orderId);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = () => {
        if (selectedRejectOrderId) {
            onUpdateStatus(selectedRejectOrderId, OrderStatus.CANCELLED, rejectReason);
        }
        setShowRejectModal(false);
        setSelectedRejectOrderId(null);
        setRejectReason('');
    };

    // Business rules for valid transitions (driver required for Despacho, no
    // reverting a route in progress) are enforced centrally in useOrders.ts'
    // updateOrderStatus — onUpdateStatus surfaces the specific error via toast.
    const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
        onUpdateStatus(order.id, newStatus);
    };


    const sellers = useMemo(() => users.filter(u => u.role === UserRole.SELLER && u.isActive !== false), [users]);
    const availableDeliveryUsers = useMemo(() => users.filter(u => u.roles.includes(UserRole.DELIVERY) && u.isActive !== false), [users]);

    // --- FILTERING LOGIC --- (MUST be before skeleton return to maintain hooks count)
    // Client-side filter over the paginated `orders` prop — accurate only when no
    // filters are active (i.e. showing whatever pages have been loaded so far).
    const localFilteredOrders = useMemo(() => {
        return orders.filter(o => {
            // 1. Text Search (ID, Client, Seller Name)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesId = o.id.toLowerCase().includes(term);
                const matchesClient = o.clientName.toLowerCase().includes(term);
                const matchesSeller = o.userName.toLowerCase().includes(term);
                if (!matchesId && !matchesClient && !matchesSeller) return false;
            }

            // 2. City/Warehouse
            if (filterCity !== 'all' && o.cityId !== filterCity && o.destinationName !== filterCity) return false;

            // 3. Status
            if (filterStatus !== 'all' && o.status !== filterStatus) return false;

            // 4. Order Type
            if (filterType !== 'all' && o.orderType !== filterType) return false;

            // 5. Seller
            if (filterSeller !== 'all' && o.userId !== filterSeller) return false;

            // 6. Date Range
            if (dateStart) {
                const orderDate = new Date(o.createdAt).setHours(0, 0, 0, 0);
                const start = new Date(dateStart).setHours(0, 0, 0, 0);
                if (orderDate < start) return false;
            }
            if (dateEnd) {
                const orderDate = new Date(o.createdAt).setHours(0, 0, 0, 0);
                const end = new Date(dateEnd).setHours(0, 0, 0, 0);
                if (orderDate > end) return false;
            }

            // 7. Role-based Restrictions (Warehouse/Production)
            if (user.role === UserRole.WAREHOUSE) {
                if (!user.assignedCities.includes(o.cityId)) return false;
            }

            if (user.role === UserRole.PRODUCTION) {
                if (o.status === OrderStatus.DRAFT) return false;
                if (!user.assignedCities.includes(o.cityId)) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, searchTerm, filterCity, filterStatus, filterType, filterSeller, dateStart, dateEnd, user]);

    const handleDeliveryAssignChange = (order: Order, deliveryUserId: string) => {
        if (!deliveryUserId) return;
        const selectedUser = users.find(u => u.id === deliveryUserId);
        // Check availability against the order's actual scheduled delivery date,
        // not always "today" — an order can be scheduled for a future date.
        const checkDate = order.deliveryDate || new Date().toISOString().split('T')[0];

        if (selectedUser?.unavailableDates?.includes(checkDate)) {
            addToast(`⚠️ NO SE PUEDE ASIGNAR:\n\n${selectedUser.name} está marcado como "No Disponible" el ${checkDate}.\nPor favor seleccione otro repartidor.`, 'error', 5000);
            return;
        }
        onAssignDelivery(order.id, deliveryUserId);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterCity('all');
        setFilterStatus('all');
        setFilterType('all');
        setFilterSeller('all');
        setDateStart('');
        setDateEnd('');
        setFilterMonth('');
    };

    const handleMonthChange = (value: string) => {
        setFilterMonth(value);
        if (!value) return;
        const [year, month] = value.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const toISODate = (d: Date) => d.toISOString().split('T')[0];
        setDateStart(toISODate(firstDay));
        setDateEnd(toISODate(lastDay));
    };

    const buildExportFilters = (): OrderFilters => ({
        status: filterStatus !== 'all' ? (filterStatus as OrderStatus) : undefined,
        cityId: filterCity !== 'all' ? filterCity : undefined,
        orderType: filterType !== 'all' ? filterType : undefined,
        userId: filterSeller !== 'all' ? filterSeller : undefined,
        startDate: dateStart || undefined,
        endDate: dateEnd || undefined,
        searchTerm: searchTerm || undefined,
    });

    const getOrdersForExport = async (): Promise<Order[]> => {
        const allMatching = await fetchOrdersForExport(buildExportFilters());

        // Replicate the same role-based city restrictions applied to the on-screen list
        if (user.role === UserRole.WAREHOUSE) {
            return allMatching.filter(o => user.assignedCities.includes(o.cityId));
        }
        if (user.role === UserRole.PRODUCTION) {
            return allMatching.filter(o => o.status !== OrderStatus.DRAFT && user.assignedCities.includes(o.cityId));
        }
        return allMatching;
    };

    // Whether any filter that requires looking beyond the client-loaded pages is active
    const hasActiveFilters = searchTerm !== '' || filterCity !== 'all' || filterStatus !== 'all'
        || filterType !== 'all' || filterSeller !== 'all' || dateStart !== '' || dateEnd !== '';

    // When filters are active, the on-screen list can't rely on the paginated `orders`
    // prop (only whatever pages happened to load) — query Supabase directly for the
    // full matching set, same as exports do, so filtering shows accurate results.
    const [serverFilteredOrders, setServerFilteredOrders] = useState<Order[] | null>(null);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filterFetchError, setFilterFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!hasActiveFilters) {
            setServerFilteredOrders(null);
            setFilterFetchError(null);
            return;
        }

        let cancelled = false;
        setIsFiltering(true);

        const timeoutId = setTimeout(async () => {
            try {
                const results = await getOrdersForExport();
                if (cancelled) return;
                results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setServerFilteredOrders(results);
                setFilterFetchError(null);
            } catch (err: any) {
                if (!cancelled) setFilterFetchError(err.message || 'Error al aplicar filtros');
            } finally {
                if (!cancelled) setIsFiltering(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasActiveFilters, searchTerm, filterCity, filterStatus, filterType, filterSeller, dateStart, dateEnd]);

    // What's actually shown on screen: the full server-matched set while filtering,
    // otherwise the client-side filtered view over the paginated `orders` prop.
    const displayedOrders = hasActiveFilters ? (serverFilteredOrders ?? []) : localFilteredOrders;

    const consolidatedData = useMemo(() => {
        const data: Record<string, { product: string, presentation: string, total: number }> = {};
        displayedOrders.forEach(o => {
            if ([OrderStatus.CANCELLED, OrderStatus.DELIVERED, OrderStatus.DRAFT].includes(o.status)) return;
            o.items.forEach(item => {
                const key = `${item.productId}-${item.presentationId}`;
                if (!data[key]) {
                    data[key] = {
                        product: item.productName,
                        presentation: item.presentationName,
                        total: 0
                    };
                }
                data[key].total += item.quantity;
            });
        });
        return Object.values(data);
    }, [displayedOrders]);

    const activeFiltersCount = [
        filterCity !== 'all',
        filterStatus !== 'all',
        filterType !== 'all',
        filterSeller !== 'all',
        dateStart !== '',
        dateEnd !== ''
    ].filter(Boolean).length;

    const renderActions = (order: Order, isMobile = false) => {
        const btnClass = isMobile
            ? "text-xs px-3 py-2 rounded font-medium border text-center flex-1"
            : "text-[10px] px-2 py-1 rounded text-right border";

        const getStyle = (color: string) => {
            const map: Record<string, string> = {
                'gray': 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300',
                'yellow': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                'blue': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                'purple': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                'orange': 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                'green': 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400',
                'red': 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400',
            }
            return map[color];
        }

        if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
            return (
                <div className={`flex flex-col gap-1 items-end ${isMobile ? 'w-full items-center' : ''}`}>
                    <div className="text-xs text-gray-400 font-medium italic">
                        {order.status === OrderStatus.REJECTED ? 'Rechazado' : 'Finalizado'}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => handleOpenComments(order)} aria-label="Ver comentarios" className={`${btnClass} ${getStyle('blue')} flex items-center justify-center relative`}>
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {order.comments && order.comments.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full">
                                    {order.comments.length}
                                </span>
                            )}
                        </button>
                        {(user.role === UserRole.WAREHOUSE || user.role === UserRole.ADMIN) && order.status === OrderStatus.DELIVERED && (
                            <button onClick={() => onEditOrder(order)} className={`${btnClass} ${getStyle('gray')} flex items-center justify-center`}>
                                <Edit2 className="w-3 h-3 mr-1" /> Editar
                            </button>
                        )}
                        <button onClick={() => handleOpenHistory(order)} className={`${btnClass} ${getStyle('gray')} flex items-center justify-center`}>
                            <Clock className="w-3 h-3 mr-1" /> Historial
                        </button>
                    </div>
                </div>
            );
        }

        if (user.role === UserRole.WAREHOUSE || user.role === UserRole.ADMIN || user.role === UserRole.PRODUCTION) {
            const isCopan = user.assignedCities.includes('c4');
            const isAdmin = user.role === UserRole.ADMIN;
            const isProduction = user.role === UserRole.PRODUCTION;
            const hasFullAccess = isCopan || isAdmin || isProduction;

            return (
                <div className={`flex ${isMobile ? 'flex-row flex-wrap gap-2 w-full' : 'flex-col gap-1 w-40 ml-auto'}`}>
                    {(order.status === OrderStatus.DRAFT || order.status === OrderStatus.REVIEW) && (
                        <button onClick={() => onEditOrder(order)} className={`${btnClass} ${getStyle('gray')} border-dashed`}>
                            <Edit2 className="w-3 h-3 inline mr-1" /> Editar
                        </button>
                    )}

                    {!hasFullAccess && (
                        <>
                            {order.status !== OrderStatus.DRAFT && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.DRAFT)} className={`${btnClass} ${getStyle('gray')}`}>Borrador</button>
                            )}
                            {order.status !== OrderStatus.REVIEW && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.REVIEW)} className={`${btnClass} ${getStyle('blue')}`}>Revisión</button>
                            )}
                            {order.status !== OrderStatus.DISPATCH && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.DISPATCH)} className={`${btnClass} ${getStyle('orange')} flex items-center justify-center`}>
                                    <Truck className="w-3 h-3 mr-1" /> Despacho
                                </button>
                            )}
                            <div className="flex gap-1 justify-end w-full">
                                <button onClick={() => handleOpenComments(order)} aria-label="Ver comentarios" className={`${btnClass} ${getStyle('blue')} flex items-center justify-center relative flex-1`}>
                                    <MessageSquare className="w-3 h-3" />
                                    {order.comments && order.comments.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full border border-white">
                                            {order.comments.length}
                                        </span>
                                    )}
                                </button>
                                {(user.role === UserRole.WAREHOUSE || user.role === UserRole.ADMIN) && (order.status === OrderStatus.DISPATCH) && (
                                    <button onClick={() => onEditOrder(order)} aria-label="Editar pedido" className={`${btnClass} ${getStyle('gray')} flex items-center justify-center flex-1`}>
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                )}
                                <button onClick={() => handleOpenHistory(order)} aria-label="Ver historial" className={`${btnClass} ${getStyle('gray')} flex items-center justify-center flex-1`}>
                                    <Clock className="w-3 h-3" />
                                </button>
                            </div>
                            <button onClick={() => handleOpenRejectModal(order.id)} className={`${btnClass} ${getStyle('red')}`}>Cancelar</button>
                        </>
                    )}

                    {hasFullAccess && (
                        <>
                            {order.status !== OrderStatus.DRAFT && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.DRAFT)} className={`${btnClass} ${getStyle('gray')}`}>Borrador</button>
                            )}
                            {order.status !== OrderStatus.SENT && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.SENT)} className={`${btnClass} ${getStyle('yellow')}`}>Enviado</button>
                            )}
                            {order.status !== OrderStatus.REVIEW && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.REVIEW)} className={`${btnClass} ${getStyle('blue')}`}>Revisión</button>
                            )}
                            {order.status !== OrderStatus.PRODUCTION && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.PRODUCTION)} className={`${btnClass} ${getStyle('purple')}`}>Producción</button>
                            )}
                            {order.status !== OrderStatus.DISPATCH && (
                                <button onClick={() => handleStatusChange(order, OrderStatus.DISPATCH)} className={`${btnClass} ${getStyle('orange')} flex items-center justify-center`}>
                                    <Truck className="w-3 h-3 mr-1" /> Despacho
                                </button>
                            )}
                            <button onClick={() => handleStatusChange(order, OrderStatus.DELIVERED)} className={`${btnClass} ${getStyle('green')}`}>Entregado</button>
                            <div className="flex gap-1 justify-end w-full">
                                <button onClick={() => handleOpenComments(order)} aria-label="Ver comentarios" className={`${btnClass} ${getStyle('blue')} flex items-center justify-center relative flex-1`}>
                                    <MessageSquare className="w-3 h-3" />
                                    {order.comments && order.comments.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full border border-white">
                                            {order.comments.length}
                                        </span>
                                    )}
                                </button>
                                {(user.role === UserRole.WAREHOUSE || user.role === UserRole.ADMIN) && (order.status === OrderStatus.DISPATCH) && (
                                    <button onClick={() => onEditOrder(order)} aria-label="Editar pedido" className={`${btnClass} ${getStyle('gray')} flex items-center justify-center flex-1`}>
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                )}
                                <button onClick={() => handleOpenHistory(order)} aria-label="Ver historial" className={`${btnClass} ${getStyle('gray')} flex items-center justify-center flex-1`}>
                                    <Clock className="w-3 h-3" />
                                </button>
                            </div>
                            <button onClick={() => handleOpenRejectModal(order.id)} className={`${btnClass} ${getStyle('red')}`}>Cancelar</button>
                        </>
                    )}
                </div>
            )
        }

        return (
            <div className={`flex ${isMobile ? 'flex-row gap-2 w-full' : 'flex-col gap-1 w-32 ml-auto'}`}>
                {order.status === OrderStatus.REVIEW && (
                    <button onClick={() => handleStatusChange(order, OrderStatus.PRODUCTION)} className={`${btnClass} ${getStyle('purple')}`}>Producción</button>
                )}
                {order.status === OrderStatus.PRODUCTION && (
                    <button onClick={() => handleStatusChange(order, OrderStatus.DISPATCH)} className={`${btnClass} ${getStyle('orange')}`}>Despachar</button>
                )}
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {user.role === UserRole.PRODUCTION ? 'Panel de Producción' : 'Gestión de Pedidos'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Control operativo, consolidación y logística</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center self-start md:self-auto">
                    <button
                        onClick={async () => {
                            setIsExporting('csv');
                            try {
                                const exportOrders = await getOrdersForExport();
                                exportOrdersToCSV(exportOrders, users, { dateStart, dateEnd });
                                addToast(`CSV generado (${exportOrders.length} pedidos)`, 'success');
                            } catch (err: any) {
                                addToast(`Error al generar CSV: ${err.message || err}`, 'error');
                            } finally {
                                setIsExporting(null);
                            }
                        }}
                        disabled={isExporting !== null}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        title="Exportar pedidos filtrados a CSV"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">{isExporting === 'csv' ? 'Exportando...' : 'Exportar CSV'}</span>
                    </button>
                    <button
                        onClick={async () => {
                            setIsExporting('pdf');
                            try {
                                const exportOrders = await getOrdersForExport();
                                exportOrdersToPDF(exportOrders, {
                                    searchTerm,
                                    filterCity,
                                    filterStatus,
                                    filterType,
                                    filterSeller,
                                    dateStart,
                                    dateEnd
                                });
                                addToast(`PDF generado exitosamente (${exportOrders.length} pedidos)`, 'success');
                            } catch (err: any) {
                                addToast(`Error al generar PDF: ${err.message || err}`, 'error');
                            } finally {
                                setIsExporting(null);
                            }
                        }}
                        disabled={isExporting !== null}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        title="Exportar pedidos filtrados a PDF"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">{isExporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}</span>
                    </button>


                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            <ClipboardList className="w-4 h-4 inline mr-2" /> Pedidos
                        </button>
                        <button
                            onClick={() => setActiveTab('consolidated')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'consolidated' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            <BarChart3 className="w-4 h-4 inline mr-2" /> Consolidado
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Controls: Search & Filter Toggle */}
            <div className="flex flex-col gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Search Bar */}
                    <div className="relative w-full md:max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por ID, Cliente o Vendedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 p-2.5 sm:text-sm"
                        />
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFiltersCount > 0
                            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <span className="ml-1 bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                        {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </button>
                </div>

                {/* Collapsible Advanced Filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-2 border-t border-gray-100 dark:border-gray-800">
                        {/* Status Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            >
                                <option value="all">Todos</option>
                                {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Warehouse / City Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bodega / Destino</label>
                            <select
                                value={filterCity}
                                onChange={e => setFilterCity(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            >
                                <option value="all">Todas</option>
                                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Seller Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendedor</label>
                            <select
                                value={filterSeller}
                                onChange={e => setFilterSeller(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            >
                                <option value="all">Todos</option>
                                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo</label>
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            >
                                <option value="all">Todos</option>
                                {orderTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>

                        {/* Month Quick-Select */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Mes Específico
                            </label>
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={e => handleMonthChange(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Date Range - Start */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Fecha Inicio
                            </label>
                            <input
                                type="date"
                                value={dateStart}
                                onChange={e => setDateStart(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Date Range - End */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Fecha Fin
                            </label>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={e => setDateEnd(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Clear Filters Button */}
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="w-full p-2 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" /> Limpiar Filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* List / Consolidated View */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {activeTab === 'orders' ? (
                    isFiltering ? (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full" />
                                <p>Buscando pedidos que coincidan con los filtros...</p>
                            </div>
                        </div>
                    ) : (!hasActiveFilters && isLoadingOrders && orders.length === 0) ? (
                        <>
                            <div className="hidden md:block p-6">
                                <TableSkeleton rows={6} columns={6} />
                            </div>
                            <div className="md:hidden p-4">
                                <CardSkeleton count={4} />
                            </div>
                        </>
                    ) : filterFetchError ? (
                        <div className="p-12 text-center text-red-500 dark:text-red-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <p>Error al aplicar filtros: {filterFetchError}</p>
                            </div>
                        </div>
                    ) : displayedOrders.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <Search className="w-8 h-8 opacity-20" />
                                <p>No se encontraron pedidos con los filtros actuales.</p>
                                <button onClick={clearFilters} className="text-brand-600 hover:underline text-sm font-medium">Limpiar búsqueda</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pedido</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Destino / Origen</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Repartidor</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {displayedOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400">#{order.id}</span>
                                                        <TypeBadge type={order.orderType} />
                                                        <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1" title="Vendedor">
                                                            <Users className="w-3 h-3" /> {order.userName}
                                                        </div>
                                                        {(order.clientRtn || order.clientPhone) && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5 mt-0.5 border-t border-gray-100 dark:border-gray-800 pt-1">
                                                                {order.clientRtn && (
                                                                    <span>RTN: <span className="font-medium text-gray-700 dark:text-gray-300">{order.clientRtn}</span></span>
                                                                )}
                                                                {order.clientPhone && (
                                                                    <span>Tel: <span className="font-medium text-gray-700 dark:text-gray-300">{order.clientPhone}</span></span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-white mb-1">{order.clientName}</div>
                                                    <div className="space-y-1">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                                                    {item.quantity}
                                                                </span>
                                                                <span>{item.presentationName} de {item.productName}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{order.destinationName}</span>
                                                        <span className="text-xs text-gray-400">Desde: {order.warehouseName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={order.assignedDeliveryId || ''}
                                                        onChange={(e) => handleDeliveryAssignChange(order, e.target.value)}
                                                        className="text-sm p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:outline-none w-full max-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={
                                                            (user.role !== UserRole.ADMIN && user.role !== UserRole.WAREHOUSE && user.role !== UserRole.PRODUCTION) ||
                                                            order.status === OrderStatus.DELIVERED ||
                                                            order.status === OrderStatus.CANCELLED ||
                                                            order.status === OrderStatus.REJECTED
                                                        }
                                                    >
                                                        <option value="">Sin asignar</option>
                                                        {availableDeliveryUsers.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderActions(order)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                                {displayedOrders.map(order => (
                                    <div key={order.id} className="p-4 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400">#{order.id}</span>
                                                    <TypeBadge type={order.orderType} />
                                                </div>
                                                <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1" title="Vendedor">
                                                    <Users className="w-3 h-3" /> {order.userName}
                                                </div>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>

                                        {(order.clientRtn || order.clientPhone) && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5 border-t border-gray-100 dark:border-gray-800 pt-2">
                                                {order.clientRtn && (
                                                    <span>RTN: <span className="font-medium text-gray-700 dark:text-gray-300">{order.clientRtn}</span></span>
                                                )}
                                                {order.clientPhone && (
                                                    <span>Tel: <span className="font-medium text-gray-700 dark:text-gray-300">{order.clientPhone}</span></span>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white mb-1">{order.clientName}</div>
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                                            {item.quantity}
                                                        </span>
                                                        <span>{item.presentationName} de {item.productName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-2">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{order.destinationName}</span>
                                                <span className="text-xs text-gray-400">Desde: {order.warehouseName}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Repartidor</label>
                                            <select
                                                value={order.assignedDeliveryId || ''}
                                                onChange={(e) => handleDeliveryAssignChange(order, e.target.value)}
                                                className="text-sm p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:outline-none w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={
                                                    (user.role !== UserRole.ADMIN && user.role !== UserRole.WAREHOUSE && user.role !== UserRole.PRODUCTION) ||
                                                    order.status === OrderStatus.DELIVERED ||
                                                    order.status === OrderStatus.CANCELLED ||
                                                    order.status === OrderStatus.REJECTED
                                                }
                                            >
                                                <option value="">Sin asignar</option>
                                                {availableDeliveryUsers.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
                                            {renderActions(order, true)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )
                ) : (
                    <div className="p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Consolidado de Productos (Pendientes)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {consolidatedData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{item.product}</div>
                                        <div className="text-sm text-gray-500">{item.presentation}</div>
                                    </div>
                                    <div className="text-xl font-bold text-brand-600 dark:text-brand-400">{item.total}</div>
                                </div>
                            ))}
                            {consolidatedData.length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
                                    No hay productos pendientes para consolidar.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {activeTab === 'orders' && hasMore && !hasActiveFilters && (
                <div className="flex justify-center py-4">
                    <button
                        onClick={loadMore}
                        className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-full shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Cargar más pedidos antiguos
                    </button>
                </div>
            )}

            {/* Reject/Cancel Modal */}
            {showRejectModal && (
                <RejectOrderModal
                    reason={rejectReason}
                    onReasonChange={setRejectReason}
                    onConfirm={handleConfirmReject}
                    onClose={() => setShowRejectModal(false)}
                />
            )}

            {/* History Modal */}
            {showHistoryModal && selectedHistoryOrder && (
                <OrderHistoryModal
                    order={selectedHistoryOrder}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}

            {/* Comments Modal */}
            {showCommentsModal && selectedCommentsOrder && (
                <OrderCommentsModal
                    order={selectedCommentsOrder}
                    onAddComment={(content) => onAddComment(selectedCommentsOrder.id, content)}
                    onClose={() => setShowCommentsModal(false)}
                    isDark={isDark}
                />
            )}
        </div>
    );
};
