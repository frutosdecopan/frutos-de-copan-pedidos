import { FC, useState } from 'react';
import { Settings, Package, Layers, MapPin, Building2, Navigation, Tag, ShoppingBag } from 'lucide-react';
import { UserRole } from '../../types';
import { ProductsConfig } from '../config/ProductsConfig';
import { PresentationsConfig } from '../config/PresentationsConfig';
import { CitiesConfig } from '../config/CitiesConfig';
import { WarehousesConfig } from '../config/WarehousesConfig';
import { DestinationsConfig } from '../config/DestinationsConfig';
import { CategoriesConfig } from '../config/CategoriesConfig';
import { OrderTypesConfig } from '../config/OrderTypesConfig';

interface ConfigurationViewProps {
    user: { role: UserRole };
}

type TabType = 'products' | 'presentations' | 'cities' | 'warehouses' | 'destinations' | 'categories' | 'ordertypes';

export const ConfigurationView: FC<ConfigurationViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<TabType>('products');

    // Only Admin can access configuration
    if (user.role !== UserRole.ADMIN) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600 dark:text-gray-400">Solo los administradores pueden acceder a esta sección.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'products' as TabType, label: 'Productos', icon: Package },
        { id: 'presentations' as TabType, label: 'Presentaciones', icon: Layers },
        { id: 'cities' as TabType, label: 'Ciudades', icon: MapPin },
        { id: 'warehouses' as TabType, label: 'Bodegas', icon: Building2 },
        { id: 'destinations' as TabType, label: 'Destinos', icon: Navigation },
        { id: 'categories' as TabType, label: 'Categorías', icon: Tag },
        { id: 'ordertypes' as TabType, label: 'Tipos de Pedido', icon: ShoppingBag },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-7 h-7" />
                    Configuración del Sistema
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Gestiona la configuración maestra de la aplicación
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${isActive
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                {activeTab === 'products' && <ProductsConfig />}
                {activeTab === 'presentations' && <PresentationsConfig />}
                {activeTab === 'cities' && <CitiesConfig />}
                {activeTab === 'warehouses' && <WarehousesConfig />}
                {activeTab === 'destinations' && <DestinationsConfig />}
                {activeTab === 'categories' && <CategoriesConfig />}
                {activeTab === 'ordertypes' && <OrderTypesConfig />}
            </div>
        </div>
    );
};
