import { FC } from 'react';
import { OrderType } from '../../types';


interface TypeBadgeProps {
    type: string;
}

export const TypeBadge: FC<TypeBadgeProps> = ({ type }) => {
    const colors: Record<string, string> = {
        [OrderType.SALE]: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
        [OrderType.TASTING]: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
        [OrderType.EXCHANGE]: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
        [OrderType.SAMPLE]: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
        [OrderType.PROMO]: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
        [OrderType.DONATION]: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300',
    };

    const colorClass = colors[type] || 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300';

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${colorClass} whitespace-nowrap`}>
            {type}
        </span>
    );
};

