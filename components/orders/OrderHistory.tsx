import { FC } from 'react';
import { Clock, User } from 'lucide-react';
import { OrderLog } from '../../types';

interface OrderHistoryProps {
    logs: OrderLog[];
}

export const OrderHistory: FC<OrderHistoryProps> = ({ logs }) => {
    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay historial disponible para este pedido.</p>
            </div>
        );
    }

    // Sort logs by date (newest first)
    const sortedLogs = [...logs].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-HN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="space-y-6">
            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                {sortedLogs.map((log, index) => (
                    <div key={index} className="relative pl-8">
                        {/* Timeline Dot */}
                        <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${index === 0 ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}></span>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="space-y-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {log.message}
                                </p>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 gap-1">
                                    <User className="w-3 h-3" />
                                    <span>{log.user}</span>
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-0 text-xs text-gray-400 flex items-center gap-1 min-w-fit">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(log.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
