import { Skeleton } from './Skeleton';

export const ChartSkeleton = () => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="mb-4">
                <Skeleton height="24px" width="200px" />
            </div>

            <div className="h-[300px] flex items-end justify-between gap-2">
                {Array.from({ length: 7 }).map((_, index) => {
                    const height = Math.random() * 60 + 40; // Random height between 40-100%
                    return (
                        <div key={`bar-${index}`} className="flex-1 flex flex-col justify-end">
                            <Skeleton height={`${height}%`} className="mb-2" />
                            <Skeleton height="16px" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
