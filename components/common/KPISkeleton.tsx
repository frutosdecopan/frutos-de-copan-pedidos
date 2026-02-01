import { Skeleton } from './Skeleton';

interface KPISkeletonProps {
    count?: number;
}

export const KPISkeleton = ({ count = 4 }: KPISkeletonProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`kpi-${index}`}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton height="20px" width="120px" />
                        <Skeleton variant="circular" width="40px" height="40px" />
                    </div>

                    <Skeleton height="36px" width="80px" className="mb-2" />
                    <Skeleton height="16px" width="100px" />
                </div>
            ))}
        </div>
    );
};
