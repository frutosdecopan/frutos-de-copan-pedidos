import { FC, useState, useMemo } from 'react';
import { Package, CheckCircle2, MapPin } from 'lucide-react';
import { User, Order, OrderStatus } from '../../types';
import { Logo, TypeBadge, Button } from '../common';

interface DeliveryDashboardProps {
    user: User;
    orders: Order[];
    onUpdateStatus: (id: string, status: OrderStatus) => void;
    onLogout: () => void;
}

export const DeliveryDashboard: FC<DeliveryDashboardProps> = ({ user, orders, onUpdateStatus }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    const myOrders = useMemo(() => {
        return orders.filter(o => o.assignedDeliveryId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, user.id]);

    const pendingOrders = myOrders.filter(o => o.status === OrderStatus.DISPATCH);
    const historyOrders = myOrders.filter(o => o.status === OrderStatus.DELIVERED);

    const displayOrders = activeTab === 'pending' ? pendingOrders : historyOrders;

    return (
        <div className="p-4 max-w-lg mx-auto pb-24">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Entregas</h1>
                    <p className="text-gray-500 dark:text-gray-400">Hola, {user.name.split(' ')[0]}</p>
                </div>
                <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-full border border-brand-200 dark:border-brand-800">
                    <Logo className="w-8 h-8" />
                </div>
            </div>

            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-gray-700 shadow text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    En Ruta ({pendingOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 shadow text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Entregados
                </button>
            </div>

            <div className="space-y-4">
                {displayOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No hay pedidos en esta lista.</p>
                    </div>
                ) : (
                    displayOrders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">#{order.id}</span>
                                        <TypeBadge type={order.orderType} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{order.clientName}</h3>
                                </div>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destinationName + ' ' + order.clientName)}`} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <MapPin className="w-5 h-5" />
                                </a>
                            </div>
                            <div className="p-4">
                                <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                    <p className="flex items-center"><span className="w-20 text-gray-400">Destino:</span> {order.destinationName}</p>
                                    <p className="flex items-center"><span className="w-20 text-gray-400">Items:</span> {order.items.length} productos</p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    {order.items.map(i => `${i.quantity} ${i.presentationName} ${i.productName}`).join(', ')}
                                </div>

                                {activeTab === 'pending' && (
                                    <Button
                                        onClick={() => onUpdateStatus(order.id, OrderStatus.DELIVERED)}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg shadow-lg shadow-green-900/20"
                                    >
                                        <CheckCircle2 className="w-5 h-5 mr-2" /> Confirmar Entrega
                                    </Button>
                                )}
                                {activeTab === 'history' && (
                                    <div className="flex items-center justify-center text-green-600 dark:text-green-400 font-medium py-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Entregado el {new Date(order.updatedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
