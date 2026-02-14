import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage first
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('app_theme');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                return savedTheme;
            }
            // Default to light
            return 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return { theme, isDark: theme === 'dark', toggleTheme, setTheme };
};
