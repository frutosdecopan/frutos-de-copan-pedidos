import { FC, useState } from 'react';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useCities } from '../../hooks/useCities';
import { Modal, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

export const WarehousesConfig: FC = () => {
    const { warehouses, loading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
    const { cities } = useCities();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', city_id: '', type: 'Local' as 'Local' | 'Principal' });

    const handleOpenModal = (warehouse?: any) => {
        if (warehouse) {
            setEditingWarehouse(warehouse);
            setFormData({ name: warehouse.name, city_id: warehouse.city_id, type: warehouse.type });
        } else {
            setEditingWarehouse(null);
            setFormData({ name: '', city_id: cities[0]?.id || '', type: 'Local' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingWarehouse(null);
        setFormData({ name: '', city_id: '', type: 'Local' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.city_id) {
            addToast('Por favor completa todos los campos', 'error');
            return;
        }

        const result = editingWarehouse
            ? await updateWarehouse(editingWarehouse.id, formData)
            : await createWarehouse(formData);

        if (result.success) {
            addToast(editingWarehouse ? 'Bodega actualizada' : 'Bodega creada', 'success');
            handleCloseModal();
        } else {
            addToast(result.error || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteWarehouse(id);
        if (result.success) {
            addToast('Bodega eliminada', 'success');
        } else {
            addToast(result.error || 'Error al eliminar', 'error');
        }
        setDeleteConfirm(null);
    };

    const getCityName = (cityId: string) => {
        return cities.find(c => c.id === cityId)?.name || 'Desconocida';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-6 h-6" />
                        Gestión de Bodegas
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{warehouses.length} bodegas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Agregar
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ciudad</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {warehouses.map(warehouse => (
                                <tr key={warehouse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{warehouse.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getCityName(warehouse.city_id)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${warehouse.type === 'Principal'
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                            }`}>
                                            {warehouse.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(warehouse)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(warehouse.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ej: Bodega Principal Copán"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad *</label>
                        <select
                            value={formData.city_id}
                            onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        >
                            <option value="">Seleccionar ciudad</option>
                            {cities.map(city => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Local' | 'Principal' })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        >
                            <option value="Local">Local</option>
                            <option value="Principal">Principal</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{editingWarehouse ? 'Actualizar' : 'Crear'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Eliminar Bodega"
                message="¿Estás seguro? Esta acción no se puede deshacer."
                variant="danger"
            />
        </div>
    );
};
