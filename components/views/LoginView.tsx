import { FC, useState } from 'react';
import { LogIn, AlertCircle, Sun, Moon } from 'lucide-react';
import { User } from '../../types';
import { Logo } from '../common';
import { useTheme } from '../../hooks/useTheme';

interface LoginViewProps {
    onLogin: (user: User) => void;
    users: User[];
}

export const LoginView: FC<LoginViewProps> = ({ onLogin, users }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { isDark, toggleTheme } = useTheme();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Por favor ingresa usuario y contraseña');
            return;
        }

        const user = users.find(u => {
            const userUsername = u.username?.toLowerCase() || '';
            const userName = u.name?.toLowerCase() || '';
            const inputUsername = username.toLowerCase();

            return userUsername === inputUsername || userName === inputUsername;
        });

        if (!user) {
            setError('Usuario o contraseña incorrectos');
            return;
        }

        if (!user.isActive) {
            setError('Este usuario está inactivo. Contacta al administrador.');
            return;
        }

        if (user.password !== password) {
            setError('Usuario o contraseña incorrectos');
            return;
        }

        onLogin(user);
    };

    return (
        <div className="min-h-screen bg-brand-50 dark:bg-gray-900 flex items-center justify-center p-4 relative transition-colors duration-200">
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all backdrop-blur-sm"
                title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
                {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-transparent dark:border-gray-800">
                <div className="bg-brand-600 p-8 text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg p-2">
                        <Logo className="w-full h-full" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Frutos de Copán</h1>
                    <p className="text-brand-100">Sistema de Pedidos Internos</p>
                </div>
                <div className="p-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Iniciar Sesión</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Usuario
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Ingresa tu usuario"
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Ingresa tu contraseña"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                        >
                            <LogIn className="w-5 h-5" />
                            Iniciar Sesión
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
