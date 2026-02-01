import { FC, useMemo } from 'react';
import { Order } from '../../types';
import { BarChart3, TrendingUp, TrendingDown, Minus, Package } from 'lucide-react';

interface TopProductsChartProps {
    orders: Order[];
    isDark: boolean;
}

interface ProductMetrics {
    productName: string;
    totalUnits: number;
    ordersCount: number;
    percentage: number;
}

export const TopProductsChart: FC<TopProductsChartProps> = ({ orders, isDark }) => {
    const { topProducts, totalUnits } = useMemo(() => {
        const productMap = new Map<string, { totalUnits: number; ordersCount: number }>();

        orders.forEach(order => {
            order.items.forEach(item => {
                const existing = productMap.get(item.productName) || {
                    totalUnits: 0,
                    ordersCount: 0
                };

                productMap.set(item.productName, {
                    totalUnits: existing.totalUnits + item.quantity,
                    ordersCount: existing.ordersCount + 1
                });
            });
        });

        const total = Array.from(productMap.values()).reduce((sum, p) => sum + p.totalUnits, 0);

        const products = Array.from(productMap.entries())
            .map(([productName, data]): ProductMetrics => ({
                productName,
                ...data,
                percentage: total > 0 ? (data.totalUnits / total) * 100 : 0
            }))
            .sort((a, b) => b.totalUnits - a.totalUnits)
            .slice(0, 15);

        return { topProducts: products, totalUnits: total };
    }, [orders]);

    const maxUnits = topProducts[0]?.totalUnits || 1;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Top 15 Productos
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Por unidades vendidas
                </span>
            </div>

            <div className="space-y-3">
                {topProducts.map((product, index) => {
                    const barWidth = (product.totalUnits / maxUnits) * 100;

                    return (
                        <div key={product.productName} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6">
                                        #{index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                        {product.productName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {product.ordersCount} pedidos
                                    </span>
                                    <span className="font-bold text-brand-600 dark:text-brand-400 min-w-[60px] text-right">
                                        {product.totalUnits} uds
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[45px] text-right">
                                        {product.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-500 rounded-full transition-all duration-500"
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                        </div>
                    );
                })}

                {topProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No hay datos de productos disponibles</p>
                    </div>
                )}
            </div>

            {topProducts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total unidades vendidas:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{totalUnits.toLocaleString()} uds</span>
                    </div>
                </div>
            )}
        </div>
    );
};
