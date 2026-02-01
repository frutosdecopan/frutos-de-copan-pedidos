import { Skeleton } from './Skeleton';

interface CardSkeletonProps {
    count?: number;
}

export const CardSkeleton = ({ count = 3 }: CardSkeletonProps) => {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`card-${index}`}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <Skeleton height="24px" width="60%" className="mb-2" />
                            <Skeleton height="16px" width="40%" />
                        </div>
                        <Skeleton variant="circular" width="40px" height="40px" />
                    </div>

                    <div className="space-y-2 mb-3">
                        <Skeleton height="16px" width="80%" />
                        <Skeleton height="16px" width="70%" />
                        <Skeleton height="16px" width="60%" />
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Skeleton height="32px" width="80px" />
                        <Skeleton height="32px" width="80px" />
                    </div>
                </div>
            ))}
        </div>
    );
};
