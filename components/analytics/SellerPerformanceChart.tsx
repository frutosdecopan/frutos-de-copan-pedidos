import { FC, useMemo } from 'react';
import { Order, User, UserRole } from '../../types';
import { TrendingUp, Package, Calendar, AlertTriangle, Users } from 'lucide-react';

interface SellerPerformanceChartProps {
    orders: Order[];
    users: User[];
    isDark: boolean;
}

interface SellerMetrics {
    sellerId: string;
    sellerName: string;
    totalOrders: number;
    totalUnits: number;
    lastOrderDate: string | null;
    daysSinceLastOrder: number | null; // null = nunca ha creado un pedido
}

// Más de esta cantidad de días sin crear un pedido marca a un vendedor como
// "sin actividad reciente" — señal de que probablemente no está usando la
// app (sigue tomando pedidos por WhatsApp/teléfono en su lugar).
const INACTIVITY_THRESHOLD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SellerPerformanceChart: FC<SellerPerformanceChartProps> = ({ orders, users }) => {
    const { ranked, inactive } = useMemo(() => {
        const bySellerId = new Map<string, { totalOrders: number; totalUnits: number; lastOrderDate: string }>();

        orders.forEach(order => {
            const existing = bySellerId.get(order.userId) || {
                totalOrders: 0,
                totalUnits: 0,
                lastOrderDate: order.createdAt,
            };
            const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

            bySellerId.set(order.userId, {
                totalOrders: existing.totalOrders + 1,
                totalUnits: existing.totalUnits + units,
                lastOrderDate: new Date(order.createdAt) > new Date(existing.lastOrderDate)
                    ? order.createdAt
                    : existing.lastOrderDate,
            });
        });

        // Se parte de TODOS los vendedores activos (no solo los que aparecen
        // en `orders`) — un vendedor con cero pedidos también debe aparecer,
        // para poder detectarlo como inactivo.
        const activeSellers = users.filter(u => u.roles.includes(UserRole.SELLER) && u.isActive);
        const now = Date.now();

        const metrics: SellerMetrics[] = activeSellers.map(seller => {
            const data = bySellerId.get(seller.id);
            const lastOrderDate = data?.lastOrderDate ?? null;
            const daysSinceLastOrder = lastOrderDate
                ? Math.floor((now - new Date(lastOrderDate).getTime()) / MS_PER_DAY)
                : null;

            return {
                sellerId: seller.id,
                sellerName: seller.name,
                totalOrders: data?.totalOrders ?? 0,
                totalUnits: data?.totalUnits ?? 0,
                lastOrderDate,
                daysSinceLastOrder,
            };
        });

        const ranked = [...metrics].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 10);

        const inactive = metrics
            .filter(m => m.daysSinceLastOrder === null || m.daysSinceLastOrder > INACTIVITY_THRESHOLD_DAYS)
            .sort((a, b) => (b.daysSinceLastOrder ?? Infinity) - (a.daysSinceLastOrder ?? Infinity));

        return { ranked, inactive };
    }, [orders, users]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Desempeño de Vendedores
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Por número de pedidos
                </span>
            </div>

            <div className="space-y-3">
                {ranked.map((seller, index) => (
                    <div
                        key={seller.sellerId}
                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold text-sm flex-shrink-0">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white truncate" title={seller.sellerName}>
                                    {seller.sellerName}
                                </div>
                                {seller.lastOrderDate && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        Último pedido: {new Date(seller.lastOrderDate).toLocaleDateString('es-HN')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right ml-4">
                            <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-bold">
                                <TrendingUp className="w-4 h-4" />
                                {seller.totalOrders}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                                <Package className="w-3 h-3" />
                                {seller.totalUnits} uds
                            </div>
                        </div>
                    </div>
                ))}

                {ranked.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No hay vendedores activos registrados</p>
                    </div>
                )}
            </div>

            {inactive.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4" />
                        Sin actividad reciente (+{INACTIVITY_THRESHOLD_DAYS} días)
                    </h4>
                    <div className="space-y-2">
                        {inactive.map(seller => (
                            <div
                                key={seller.sellerId}
                                className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg"
                            >
                                <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {seller.sellerName}
                                </span>
                                <span className="text-xs font-medium text-red-700 dark:text-red-400 flex-shrink-0 ml-2">
                                    {seller.daysSinceLastOrder === null
                                        ? 'Nunca ha creado un pedido'
                                        : `${seller.daysSinceLastOrder} días sin pedidos`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
