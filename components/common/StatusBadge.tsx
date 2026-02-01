import { FC } from 'react';
import { OrderStatus } from '../../types';


interface StatusBadgeProps {
    status: OrderStatus;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
    const colors = {
        [OrderStatus.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        [OrderStatus.SENT]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        [OrderStatus.REVIEW]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        [OrderStatus.PRODUCTION]: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        [OrderStatus.DISPATCH]: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
        [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        [OrderStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status]} whitespace-nowrap`}>
            {status}
        </span>
    );
};
