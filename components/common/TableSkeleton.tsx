import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export const TableSkeleton = ({ rows = 5, columns = 4 }: TableSkeletonProps) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`header-${i}`} height="24px" />
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="p-4">
                        {/* Desktop */}
                        <div className="hidden md:grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <Skeleton key={`cell-${rowIndex}-${colIndex}`} height="20px" />
                            ))}
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-2">
                            <Skeleton height="20px" width="60%" />
                            <Skeleton height="16px" width="40%" />
                            <Skeleton height="16px" width="80%" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
