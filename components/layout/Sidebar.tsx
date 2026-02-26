import { FC } from 'react';
import { BarChart3, BarChart2, Package, ClipboardList, Truck, Users, Calendar, Sun, Moon, LogOut, Settings } from 'lucide-react';
import { User, UserRole } from '../../types';
import { Logo } from '../common';

interface SidebarProps {
    user: User;
    onLogout: () => void;
    activeView: string;
    setView: (view: string) => void;
    toggleTheme: () => void;
    isDark: boolean;
}

export const Sidebar: FC<SidebarProps> = ({ user, onLogout, activeView, setView, toggleTheme, isDark }) => {
    const menuItems = [
        { id: 'dashboard', icon: BarChart3, label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.PRODUCTION, UserRole.WAREHOUSE] },
        { id: 'orders', icon: Package, label: user.role === UserRole.WAREHOUSE ? 'Mis Transferencias' : 'Mis Pedidos', roles: [UserRole.SELLER, UserRole.WAREHOUSE] },
        { id: 'all-orders', icon: ClipboardList, label: 'Gestión Pedidos', roles: [UserRole.ADMIN, UserRole.PRODUCTION, UserRole.WAREHOUSE] },
        { id: 'delivery', icon: Truck, label: 'Mis Entregas', roles: [UserRole.DELIVERY] },
        { id: 'users', icon: Users, label: 'Usuarios', roles: [UserRole.ADMIN] },
        { id: 'availability', icon: Calendar, label: 'Disponibilidad', roles: [UserRole.ADMIN] },
        { id: 'reports', icon: BarChart2, label: 'Reportes', roles: [UserRole.ADMIN] },
        { id: 'config', icon: Settings, label: 'Configuración', roles: [UserRole.ADMIN] },
    ];

    const visibleItems = menuItems.filter(i => i.roles.includes(user.role));

    if (visibleItems.length === 0) return null;

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden sm:flex w-64 flex-col fixed inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50">
                <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800 bg-brand-600">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-2 p-1">
                        <Logo className="w-full h-full" />
                    </div>
                    <span className="font-bold text-white text-lg">Frutos de Copán</span>
                </div>
                <div className="flex-1 py-6 space-y-1 overflow-y-auto">
                    {visibleItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${activeView === item.id
                                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 border-r-2 border-brand-600 dark:border-brand-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs">
                            {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={toggleTheme}
                            className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        <button
                            onClick={onLogout}
                            className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="sm:hidden fixed top-0 inset-x-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center p-1">
                        <Logo className="w-full h-full" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-base">Frutos de Copán</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                        {isDark ? <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
                    </button>
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Cerrar sesión"
                    >
                        <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="sm:hidden fixed bottom-0 inset-x-0 bg-gray-900 dark:bg-gray-950 border-t border-gray-800 dark:border-gray-900 z-40 safe-area-inset-bottom">
                <nav className="flex items-center justify-around px-2 py-2">
                    {visibleItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 rounded-lg transition-colors ${activeView === item.id
                                ? 'text-brand-500'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 mb-1 ${activeView === item.id ? 'text-brand-500' : ''}`} />
                            <span className="text-xs font-medium truncate w-full text-center">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </>
    );
};
