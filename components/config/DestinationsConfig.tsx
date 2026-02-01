import { FC, useState } from 'react';
import { Navigation, Plus, Edit2, Trash2 } from 'lucide-react';
import { useDestinations } from '../../hooks/useDestinations';
import { Modal, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

export const DestinationsConfig: FC = () => {
    const { destinations, loading, createDestination, updateDestination, deleteDestination } = useDestinations();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDestination, setEditingDestination] = useState<{ id: string; name: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const handleOpenModal = (destination?: { id: string; name: string }) => {
        if (destination) {
            setEditingDestination(destination);
            setFormData({ name: destination.name });
        } else {
            setEditingDestination(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDestination(null);
        setFormData({ name: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('El nombre es requerido', 'error');
            return;
        }

        const result = editingDestination
            ? await updateDestination(editingDestination.id, { name: formData.name })
            : await createDestination({ name: formData.name });

        if (result.success) {
            addToast(editingDestination ? 'Destino actualizado' : 'Destino creado', 'success');
            handleCloseModal();
        } else {
            addToast(result.error || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteDestination(id);
        if (result.success) {
            addToast('Destino eliminado', 'success');
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
                        <Navigation className="w-6 h-6" />
                        Gestión de Destinos
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{destinations.length} destinos de entrega</p>
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
                <div className="grid gap-3">
                    {destinations.map(dest => (
                        <div key={dest.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-900 dark:text-white">{dest.name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(dest)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteConfirm(dest.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDestination ? 'Editar Destino' : 'Nuevo Destino'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ej: Villanueva, Tegucigalpa"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{editingDestination ? 'Actualizar' : 'Crear'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Eliminar Destino"
                message="¿Estás seguro? Esta acción no se puede deshacer."
                variant="danger"
            />
        </div>
    );
};
