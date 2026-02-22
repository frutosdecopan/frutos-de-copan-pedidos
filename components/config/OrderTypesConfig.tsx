import { FC, useState } from 'react';
import { ShoppingBag, Plus, Edit2, Trash2 } from 'lucide-react';
import { useOrderTypes } from '../../hooks/useOrderTypes';
import { Modal, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

export const OrderTypesConfig: FC = () => {
    const { orderTypes, loading, createOrderType, updateOrderType, deleteOrderType } = useOrderTypes();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const handleOpenModal = (type?: { id: string; name: string }) => {
        if (type) {
            setEditingType(type);
            setFormData({ name: type.name });
        } else {
            setEditingType(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingType(null);
        setFormData({ name: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('El nombre es requerido', 'error');
            return;
        }

        const result = editingType
            ? await updateOrderType(editingType.id, { name: formData.name.trim() })
            : await createOrderType({ name: formData.name.trim() });

        if (result.success) {
            addToast(editingType ? 'Tipo actualizado correctamente' : 'Tipo creado correctamente', 'success');
            handleCloseModal();
        } else {
            addToast(result.error || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteOrderType(id);
        if (result.success) {
            addToast('Tipo eliminado correctamente', 'success');
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
                        <ShoppingBag className="w-6 h-6" />
                        Tipos de Pedido
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {orderTypes.length} tipos configurados — aparecen en el formulario de creación/edición de pedidos
                    </p>
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
            ) : orderTypes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <ShoppingBag className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No hay tipos de pedido configurados.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                    >
                        Agregar el primero
                    </button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {orderTypes.map(type => (
                        <div key={type.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    {type.name}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenModal({ id: type.id, name: type.name })}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(type.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingType ? 'Editar Tipo de Pedido' : 'Nuevo Tipo de Pedido'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del tipo *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Ej: Exportación, Consignación..."
                            autoFocus
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            {editingType ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Eliminar Tipo de Pedido"
                message="¿Estás seguro? Si hay pedidos con este tipo no se podrá eliminar."
                variant="danger"
            />
        </div>
    );
};
