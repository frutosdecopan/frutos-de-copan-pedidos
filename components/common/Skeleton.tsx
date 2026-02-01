interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton = ({
    width = '100%',
    height = '20px',
    className = '',
    variant = 'rectangular'
}: SkeletonProps) => {
    const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]';

    const variantClasses = {
        rectangular: 'rounded',
        circular: 'rounded-full',
        text: 'rounded'
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={{ width, height }}
        />
    );
};
