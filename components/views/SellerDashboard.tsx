import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, ShoppingCart, CheckCircle2, Clock, MapPin, Package, Edit2 } from 'lucide-react';
import { User, Order, OrderStatus, OrderType, OrderItem } from '../../types';
import { useCities } from '../../hooks/useCities';
import { Button, StatusBadge, TypeBadge, CardSkeleton } from '../common';
import { useToast } from '../../ToastContext';
import { UserRole } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { usePresentations } from '../../hooks/usePresentations';
import { useDestinations } from '../../hooks/useDestinations';

interface SellerDashboardProps {
    user: User;
    orders: Order[];
    onSaveOrder: (order: Partial<Order>, isEdit?: boolean) => void;
    editingOrderId?: string | null; // Optional prop to indicate edit mode
}

export const SellerDashboard = ({ user, orders, onSaveOrder, editingOrderId: propEditingOrderId }: SellerDashboardProps) => {
    const { addToast } = useToast();
    const { cities, loading: citiesLoading } = useCities();
    const { products, loading: productsLoading } = useProducts();
    const { presentations, loading: presentationsLoading } = usePresentations();
    const { destinations, loading: destinationsLoading } = useDestinations();

    const [mode, setMode] = useState<'list' | 'create'>('list');
    const [localEditingOrderId, setLocalEditingOrderId] = useState<string | null>(null);

    // Filter only available products
    const availableProducts = useMemo(() => products.filter(p => p.available), [products]);

    // Available Warehouses logic - Flexible based on region
    const availableWarehouses = useMemo(() => {
        const options = [];
        const localCityId = user.assignedCities[0]; // Primary city
        const localCity = cities.find(c => c.id === localCityId);

        if (localCity) {
            // For northern cities (La Ceiba, SPS, Puerto Cortés) and Villanueva
            const northernCityIds = [
                'a1a1a1a1-b1b1-c1c1-d1d1-e1e1e1e1e1e1', // La Ceiba
                'a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2', // San Pedro Sula
                'a3a3a3a3-b3b3-c3c3-d3d3-e3e3e3e3e3e3'  // Puerto Cortés
            ];

            if (northernCityIds.includes(localCityId)) {
                // Add San Pedro Sula warehouse
                const spsCity = cities.find(c => c.id === 'a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2');
                if (spsCity && spsCity.warehouses.length > 0) {
                    options.push({
                        cityId: spsCity.id,
                        cityName: spsCity.name,
                        warehouseId: spsCity.warehouses[0].id,
                        warehouseName: spsCity.warehouses[0].name,
                        type: 'Regional'
                    });
                }

                // Add Principal warehouse (Copán)
                const copanCity = cities.find(c => c.id === 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4');
                if (copanCity && copanCity.warehouses.length > 0) {
                    options.push({
                        cityId: copanCity.id,
                        cityName: copanCity.name,
                        warehouseId: copanCity.warehouses[0].id,
                        warehouseName: copanCity.warehouses[0].name + ' (Principal)',
                        type: 'Principal'
                    });
                }
            }
            // For Copán sellers
            else if (localCityId === 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4') {
                // Only Copán warehouse
                if (localCity.warehouses.length > 0) {
                    options.push({
                        cityId: localCity.id,
                        cityName: localCity.name,
                        warehouseId: localCity.warehouses[0].id,
                        warehouseName: localCity.warehouses[0].name,
                        type: 'Principal'
                    });
                }
            }
            // For other cities (Roatán, etc.) - add their local warehouse + Principal
            else {
                // Local warehouse
                if (localCity.warehouses.length > 0) {
                    options.push({
                        cityId: localCity.id,
                        cityName: localCity.name,
                        warehouseId: localCity.warehouses[0].id,
                        warehouseName: localCity.warehouses[0].name + ' (Local)',
                        type: 'Local'
                    });
                }

                // Principal warehouse
                const copanCity = cities.find(c => c.id === 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4');
                if (copanCity && copanCity.warehouses.length > 0) {
                    options.push({
                        cityId: copanCity.id,
                        cityName: copanCity.name,
                        warehouseId: copanCity.warehouses[0].id,
                        warehouseName: copanCity.warehouses[0].name + ' (Principal)',
                        type: 'Principal'
                    });
                }
            }
        }

        return options;
    }, [user, cities]);

    // Form State
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(availableWarehouses[0]?.warehouseId || '');
    const [selectedDestination, setSelectedDestination] = useState<string>('');
    const [selectedOrderType, setSelectedOrderType] = useState<OrderType>(OrderType.SALE);
    const [clientName, setClientName] = useState('');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Initialize destination when destinations load
    useEffect(() => {
        if (destinations.length > 0 && !selectedDestination) {
            setSelectedDestination(destinations[0].name);
        }
    }, [destinations, selectedDestination]);

    // Auto-open edit mode if editingOrderId prop is provided
    useEffect(() => {
        if (propEditingOrderId && orders.length > 0) {
            const orderToEdit = orders.find(o => o.id === propEditingOrderId);
            if (orderToEdit) {
                // Inline edit logic to avoid calling undefined function
                setLocalEditingOrderId(orderToEdit.id);
                setClientName(orderToEdit.clientName);
                setSelectedWarehouseId(orderToEdit.warehouseId);
                setSelectedDestination(orderToEdit.destinationName || destinations[0]?.name || '');
                setSelectedOrderType(orderToEdit.orderType || OrderType.SALE);
                setCart(orderToEdit.items);
                setMode('create');
            }
        }
    }, [propEditingOrderId, orders, destinations]);

    const myOrders = useMemo(() =>
        orders.filter(o => o.userId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [orders, user.id]);

    const originCityName = useMemo(() => {
        const city = cities.find(c => c.id === user.assignedCities[0]);
        return city?.name || 'Ruta';
    }, [user, cities]);

    // Show skeleton while loading - AFTER all hooks
    if (citiesLoading || productsLoading || presentationsLoading || destinationsLoading) {
        return (
            <div className="p-6">
                <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
                <CardSkeleton count={3} />
            </div>
        );
    }


    const resetForm = () => {
        setCart([]);
        setClientName('');
        setSelectedWarehouseId(availableWarehouses[0]?.warehouseId || '');
        setSelectedDestination(destinations[0]?.name || '');
        setSelectedOrderType(OrderType.SALE);
        setLocalEditingOrderId(null);
        setSearchTerm('');
    };

    const handleCreateNew = () => {
        resetForm();
        setMode('create');
    };

    const handleEditOrder = (order: Order) => {
        setLocalEditingOrderId(order.id);
        setClientName(order.clientName);
        setSelectedWarehouseId(order.warehouseId);
        setSelectedDestination(order.destinationName || destinations[0]?.name || '');
        setSelectedOrderType(order.orderType || OrderType.SALE);
        setCart(order.items);
        setMode('create');
    };

    const updateCart = (productId: string, presentationId: string, delta: number) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === productId && i.presentationId === presentationId);
            const product = products.find(p => p.id === productId)!;
            const presentation = presentations.find(p => p.id === presentationId)!;

            if (existing) {
                const newQty = existing.quantity + delta;
                if (newQty <= 0) return prev.filter(i => i !== existing);
                return prev.map(i => i === existing ? { ...i, quantity: newQty } : i);
            } else if (delta > 0) {
                return [...prev, {
                    productId,
                    presentationId,
                    quantity: delta,
                    productName: product.name,
                    presentationName: presentation.name
                }];
            }
            return prev;
        });
    };

    const getQuantity = (prodId: string, presId: string) => {
        return cart.find(i => i.productId === prodId && i.presentationId === presId)?.quantity || 0;
    };

    const handleSubmit = () => {
        if (cart.length === 0) return;
        if (!clientName.trim()) {
            addToast("Por favor ingrese el nombre del Cliente / Negocio", 'warning');
            return;
        }

        const targetWarehouse = availableWarehouses.find(w => w.warehouseId === selectedWarehouseId);
        if (!targetWarehouse) return;

        const payload: Partial<Order> = {
            id: localEditingOrderId || undefined,
            userId: user.id,
            userName: user.name,
            clientName: clientName,
            originCityName: originCityName,
            orderType: selectedOrderType,
            destinationName: selectedDestination,
            cityId: targetWarehouse.cityId,
            cityName: targetWarehouse.cityName,
            warehouseId: targetWarehouse.warehouseId,
            warehouseName: targetWarehouse.warehouseName,
            status: OrderStatus.SENT,
            items: cart,
        };

        onSaveOrder(payload, !!localEditingOrderId);
        resetForm();
        // Don't change mode here - let App.tsx handle navigation
        // setMode('list'); // Removed to prevent showing list before navigation
    };

    if (mode === 'create') {
        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
                <div className="bg-white dark:bg-gray-900 p-4 sticky top-0 z-10 shadow-sm border-b dark:border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {localEditingOrderId ? 'Editar Pedido' : 'Nuevo Pedido'}
                        </h2>
                        <Button variant="ghost" onClick={() => setMode('list')}>Cancelar</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo de Pedido</label>
                            <select
                                value={selectedOrderType}
                                onChange={(e) => setSelectedOrderType(e.target.value as OrderType)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800"
                            >
                                {Object.values(OrderType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre del Cliente / Negocio *</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Ej: Supermercado La Colonia"
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lugar de Entrega (Destino)</label>
                            <select
                                value={selectedDestination}
                                onChange={(e) => setSelectedDestination(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800"
                            >
                                {destinations.map(dest => (
                                    <option key={dest.id} value={dest.name}>{dest.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bodega de Despacho (Origen)</label>
                            <select
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800"
                            >
                                {availableWarehouses.map(wh => (
                                    <option key={wh.warehouseId} value={wh.warehouseId}>
                                        {wh.warehouseName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-32">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-800"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        {availableProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                            <div key={product.id} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                                        {product.name.charAt(0)}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{product.name}</h3>
                                </div>

                                <div className="space-y-3">
                                    {presentations.map(pres => {
                                        const qty = getQuantity(product.id, pres.id);
                                        return (
                                            <div key={pres.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">{pres.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => updateCart(product.id, pres.id, -1)}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-full border ${qty > 0 ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-brand-600 dark:text-brand-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-transparent'}`}
                                                    >
                                                        -
                                                    </button>
                                                    <span className={`w-8 text-center font-bold ${qty > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>{qty}</span>
                                                    <button
                                                        onClick={() => updateCart(product.id, pres.id, 1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-sm active:bg-brand-700"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {cart.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 md:hidden">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Items: {cart.length}</span>
                            <span className="text-brand-600 dark:text-brand-500 font-bold text-lg">Total Unds: {cart.reduce((a, b) => a + b.quantity, 0)}</span>
                        </div>
                        <Button onClick={handleSubmit} className="w-full h-12 text-lg">
                            {localEditingOrderId ? 'Guardar Cambios' : 'Confirmar Pedido'} <CheckCircle2 className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                )}
                {cart.length > 0 && (
                    <div className="hidden md:flex fixed bottom-8 right-8 z-20">
                        <Button onClick={handleSubmit} className="h-14 px-8 text-lg shadow-xl">
                            {localEditingOrderId ? 'Guardar Cambios' : 'Confirmar Pedido'} ({cart.reduce((a, b) => a + b.quantity, 0)}) <CheckCircle2 className="w-6 h-6 ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {user.role === UserRole.WAREHOUSE ? 'Mis Transferencias' : 'Mis Pedidos'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Bienvenido, {user.name}</p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="w-5 h-5 mr-1" /> Nuevo
                </Button>
            </div>

            <div className="space-y-4">
                {myOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No has realizado pedidos aún.</p>
                    </div>
                ) : (
                    myOrders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">#{order.id}</span>
                                        <TypeBadge type={order.orderType} />
                                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{order.clientName}</h3>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-col gap-1">
                                        <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> Destino: <span className="font-medium ml-1 text-gray-700 dark:text-gray-300">{order.destinationName}</span></span>
                                        <span className="flex items-center"><Package className="w-3 h-3 mr-1" /> Desde: {order.warehouseName}</span>
                                    </div>
                                </div>
                                <StatusBadge status={order.status} />
                            </div>

                            {/* Audit Trail - Show last modification */}
                            {order.logs && order.logs.length > 1 && (() => {
                                const lastLog = order.logs[order.logs.length - 1];
                                const isEdit = lastLog.message.toLowerCase().includes('editado') || lastLog.message.toLowerCase().includes('actualizado');
                                const isCancel = lastLog.message.toLowerCase().includes('cancelado');
                                const isReject = lastLog.message.toLowerCase().includes('rechazado');

                                if (isEdit || isCancel || isReject) {
                                    return (
                                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-2 text-xs">
                                                <Edit2 className="w-3 h-3 text-gray-400" />
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {isEdit && '✏️ Editado'}
                                                    {isCancel && '🛑 Cancelado'}
                                                    {isReject && '⛔ Rechazado'}
                                                    {' por '}
                                                    <span className="font-semibold text-gray-900 dark:text-white">{lastLog.user}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs mt-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    {new Date(lastLog.timestamp).toLocaleString('es-HN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Rejection/Edit/Cancel Feedback */}
                            {(() => {
                                const lastLog = order.logs[order.logs.length - 1];
                                if (!lastLog) return null;

                                if (order.status === OrderStatus.REJECTED) {
                                    return (
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 mb-3 text-sm">
                                            <span className="font-bold text-red-700 dark:text-red-400 block mb-1">
                                                ⛔ {lastLog.message}
                                            </span>
                                            <span className="text-xs text-red-600 dark:text-red-500">
                                                Por: {lastLog.user}
                                            </span>
                                        </div>
                                    );
                                }

                                if (order.status === OrderStatus.CANCELLED) {
                                    return (
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 mb-3 text-sm">
                                            <span className="font-bold text-red-700 dark:text-red-400 block mb-1">
                                                🛑 Pedido Cancelado
                                            </span>
                                            <span className="text-xs text-red-600 dark:text-red-500">
                                                Por: {lastLog.user}
                                            </span>
                                        </div>
                                    );
                                }

                                if (lastLog.message.includes('actualizado') || lastLog.message.includes('editado')) {
                                    return (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 mb-3 text-sm">
                                            <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">
                                                ✏️ {lastLog.message}
                                            </span>
                                            <span className="text-xs text-blue-600 dark:text-blue-500">
                                                Por: {lastLog.user}
                                            </span>
                                        </div>
                                    );
                                }

                                return null;
                            })()}

                            {/* Product Items List */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Productos ({order.items.length})</div>
                                <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">
                                                <span className="font-semibold text-brand-600 dark:text-brand-400">{item.quantity}x</span> {item.presentationName} de {item.productName}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                                    Total unidades: <span className="font-semibold text-gray-700 dark:text-gray-300">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                </div>
                            </div>

                            <div className="flex justify-end items-center border-t dark:border-gray-800 pt-3 gap-3">
                                {(order.status === OrderStatus.DRAFT || order.status === OrderStatus.REVIEW) ? (
                                    <button
                                        onClick={() => {
                                            console.log('Editing order:', order);
                                            handleEditOrder(order);
                                        }}
                                        className="text-white font-medium flex items-center bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-4 py-2 rounded-lg transition-colors shadow-sm"
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" /> Editar Pedido
                                    </button>
                                ) : (
                                    <span className="text-gray-400 italic text-sm">No editable</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
