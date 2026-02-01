import { FC } from 'react';

interface LogoProps {
    className?: string;
}

export const Logo: FC<LogoProps> = ({ className = "" }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Orange Ring with gap on right */}
        <path
            d="M 85 35 A 40 40 0 1 0 85 65"
            stroke="#F97316"
            strokeWidth="10"
            strokeLinecap="round"
        />

        {/* Leaves */}
        <path d="M 22 28 Q 10 5 35 5 Q 45 15 22 28 Z" fill="#4ADE80" />
        <path d="M 22 28 Q 0 25 5 5 Q 15 10 22 28 Z" fill="#16A34A" />
    </svg>
);
