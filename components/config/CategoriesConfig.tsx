import { FC, useState } from 'react';
import { Tag, Plus, Edit2, Trash2 } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { Modal, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

export const CategoriesConfig: FC = () => {
    const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const handleOpenModal = (category?: { id: string; name: string }) => {
        if (category) {
            setEditingCategory(category);
            setFormData({ name: category.name });
        } else {
            setEditingCategory(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({ name: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('El nombre es requerido', 'error');
            return;
        }

        const result = editingCategory
            ? await updateCategory(editingCategory.id, { name: formData.name })
            : await createCategory({ name: formData.name });

        if (result.success) {
            addToast(editingCategory ? 'Categoría actualizada' : 'Categoría creada', 'success');
            handleCloseModal();
        } else {
            addToast(result.error || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteCategory(id);
        if (result.success) {
            addToast('Categoría eliminada', 'success');
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
                        <Tag className="w-6 h-6" />
                        Gestión de Categorías
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{categories.length} categorías</p>
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
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(cat)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteConfirm(cat.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{editingCategory ? 'Actualizar' : 'Crear'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Eliminar Categoría"
                message="¿Estás seguro? Esta acción no se puede deshacer."
                variant="danger"
            />
        </div>
    );
};
