import { memo } from 'react';
import { TrendingUp, ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';

interface KPICardsProps {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalRevenue: number; // Placeholder for now if we don't have price
}

export const KPICards = memo<KPICardsProps>(({ totalOrders, completedOrders, pendingOrders }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Pedidos</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Completados</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedOrders}</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingOrders}</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Eficiencia</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
                    </p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
            </div>
        </div>
    );
});
