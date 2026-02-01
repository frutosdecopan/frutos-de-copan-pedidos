import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { Order } from '../../types';

interface SalesChartProps {
    orders: Order[];
    isDark: boolean;
}

export const SalesChart = ({ orders, isDark }: SalesChartProps) => {
    // Aggregate orders by date
    const data = useMemo(() => {
        const map = new Map<string, number>();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        // Initialize with 0
        last7Days.forEach(date => map.set(date, 0));

        // Fill with data
        orders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            if (map.has(date)) {
                map.set(date, map.get(date)! + 1);
            }
        });

        return Array.from(map.entries()).map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('es-HN', { weekday: 'short' }),
            pedidos: count
        }));
    }, [orders]);

    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    const gridColor = isDark ? '#374151' : '#E5E7EB';

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tendencia de Pedidos (Últimos 7 días)</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ca8a04" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: textColor, fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: textColor, fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderColor: isDark ? '#374151' : '#E5E7EB',
                                borderRadius: '8px',
                                color: isDark ? '#FFFFFF' : '#000000'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="pedidos"
                            stroke="#ca8a04"
                            fillOpacity={1}
                            fill="url(#colorPedidos)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
