import { FC, useState } from 'react';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import { useCities } from '../../hooks/useCities';
import { Modal, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

export const CitiesConfig: FC = () => {
    const { cities, loading, createCity, updateCity, deleteCity } = useCities();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCity, setEditingCity] = useState<{ id: string; name: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const handleOpenModal = (city?: { id: string; name: string }) => {
        if (city) {
            setEditingCity(city);
            setFormData({ name: city.name });
        } else {
            setEditingCity(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCity(null);
        setFormData({ name: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('El nombre es requerido', 'error');
            return;
        }

        const result = editingCity
            ? await updateCity(editingCity.id, { name: formData.name })
            : await createCity({ name: formData.name });

        if (result.success) {
            addToast(editingCity ? 'Ciudad actualizada' : 'Ciudad creada', 'success');
            handleCloseModal();
        } else {
            addToast(result.error || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteCity(id);
        if (result.success) {
            addToast('Ciudad eliminada', 'success');
        } else {
            addToast(result.error || 'Error al eliminar', 'error');
        }
        setDeleteConfirm(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="w-6 h-6" />
                        Gestión de Ciudades
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{cities.length} ciudades</p>
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
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ciudad</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Bodegas</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {cities.map(city => (
                                <tr key={city.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{city.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                        {city.warehouses?.length || 0} bodega(s)
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(city)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(city.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
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

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCity ? 'Editar Ciudad' : 'Nueva Ciudad'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ej: San Pedro Sula"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{editingCity ? 'Actualizar' : 'Crear'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Eliminar Ciudad"
                message="¿Estás seguro? Esta acción no se puede deshacer."
                variant="danger"
            />
        </div>
    );
};
