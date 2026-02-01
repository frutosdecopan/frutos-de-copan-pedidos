import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Order, OrderStatus } from '../../types';

interface StatusChartProps {
    orders: Order[];
    isDark: boolean;
}

const COLORS: Record<OrderStatus, string> = {
    [OrderStatus.DRAFT]: '#94a3b8',        // Slate-400 (lighter gray)
    [OrderStatus.SENT]: '#fbbf24',         // Amber-400 (bright yellow)
    [OrderStatus.REVIEW]: '#60a5fa',       // Blue-400 (bright blue)
    [OrderStatus.PRODUCTION]: '#a78bfa',   // Violet-400 (bright purple)
    [OrderStatus.DISPATCH]: '#fb923c',     // Orange-400 (bright orange)
    [OrderStatus.DELIVERED]: '#4ade80',    // Green-400 (bright green)
    [OrderStatus.CANCELLED]: '#f87171',    // Red-400 (bright red)
    [OrderStatus.REJECTED]: '#ef4444',     // Red-500 (vivid red)
};

export const StatusChart = ({ orders, isDark }: StatusChartProps) => {
    const data = useMemo(() => {
        const map = new Map<string, number>();

        // Initialize interesting statuses
        Object.values(OrderStatus).forEach(status => map.set(status, 0));

        orders.forEach(order => {
            map.set(order.status, (map.get(order.status) || 0) + 1);
        });

        // Filter out zero values for cleaner chart
        return Array.from(map.entries())
            .filter(([_, count]) => count > 0)
            .map(([name, value]) => ({ name, value }));
    }, [orders]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Distribución por Estado</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as OrderStatus] || '#8884d8'} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderColor: isDark ? '#374151' : '#E5E7EB',
                                borderRadius: '8px',
                            }}
                            itemStyle={{
                                color: isDark ? '#F9FAFB' : '#111827',
                            }}
                            labelStyle={{
                                color: isDark ? '#F9FAFB' : '#111827',
                                fontWeight: 'bold'
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
