import { FC, useMemo } from 'react';
import { Order } from '../../types';
import { TrendingUp, Award, Calendar, Package } from 'lucide-react';

interface TopClientsChartProps {
    orders: Order[];
    isDark: boolean;
}

interface ClientMetrics {
    clientName: string;
    totalOrders: number;
    totalUnits: number;
    lastOrderDate: string;
    frequency: 'VIP' | 'Regular' | 'Ocasional';
}

export const TopClientsChart: FC<TopClientsChartProps> = ({ orders, isDark }) => {
    const topClients = useMemo(() => {
        const clientMap = new Map<string, { totalOrders: number; totalUnits: number; lastOrderDate: string }>();

        orders.forEach(order => {
            const existing = clientMap.get(order.clientName) || {
                totalOrders: 0,
                totalUnits: 0,
                lastOrderDate: order.createdAt
            };

            const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);

            clientMap.set(order.clientName, {
                totalOrders: existing.totalOrders + 1,
                totalUnits: existing.totalUnits + totalUnits,
                lastOrderDate: new Date(order.createdAt) > new Date(existing.lastOrderDate)
                    ? order.createdAt
                    : existing.lastOrderDate
            });
        });

        return Array.from(clientMap.entries())
            .map(([clientName, data]): ClientMetrics => {
                // Determine frequency based on total orders
                let frequency: 'VIP' | 'Regular' | 'Ocasional' = 'Ocasional';
                if (data.totalOrders >= 10) frequency = 'VIP';
                else if (data.totalOrders >= 5) frequency = 'Regular';

                return {
                    clientName,
                    ...data,
                    frequency
                };
            })
            .sort((a, b) => b.totalOrders - a.totalOrders)
            .slice(0, 10);
    }, [orders]);

    const getFrequencyBadge = (frequency: string) => {
        const badges = {
            'VIP': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
            'Regular': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
            'Ocasional': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
        };
        return badges[frequency as keyof typeof badges] || badges.Ocasional;
    };

    const getFrequencyIcon = (frequency: string) => {
        if (frequency === 'VIP') return '🔥';
        if (frequency === 'Regular') return '⭐';
        return '👤';
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Top 10 Clientes
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Por número de pedidos
                </span>
            </div>

            <div className="space-y-3">
                {topClients.map((client, index) => (
                    <div
                        key={client.clientName}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold text-sm">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white truncate">
                                    {client.clientName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getFrequencyBadge(client.frequency)} font-medium`}>
                                        {getFrequencyIcon(client.frequency)} {client.frequency}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(client.lastOrderDate).toLocaleDateString('es-HN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right ml-4">
                            <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-bold">
                                <TrendingUp className="w-4 h-4" />
                                {client.totalOrders}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                                <Package className="w-3 h-3" />
                                {client.totalUnits} uds
                            </div>
                        </div>
                    </div>
                ))}

                {topClients.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Award className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No hay datos de clientes disponibles</p>
                    </div>
                )}
            </div>
        </div>
    );
};
