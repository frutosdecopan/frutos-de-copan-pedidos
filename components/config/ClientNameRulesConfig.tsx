import { FC, useState } from 'react';
import { Merge, Plus, Edit2, Trash2 } from 'lucide-react';
import { useClientNameRules, ClientNameRule } from '../../hooks/useClientNameRules';
import { Modal, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

export const ClientNameRulesConfig: FC = () => {
    const { clientNameRules, loading, createClientNameRule, updateClientNameRule, deleteClientNameRule } = useClientNameRules();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<ClientNameRule | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ keyword: '', canonicalName: '' });

    const handleOpenModal = (rule?: ClientNameRule) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({ keyword: rule.keyword, canonicalName: rule.canonicalName });
        } else {
            setEditingRule(null);
            setFormData({ keyword: '', canonicalName: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRule(null);
        setFormData({ keyword: '', canonicalName: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.keyword.trim() || !formData.canonicalName.trim()) {
            addToast('La palabra clave y el nombre unificado son requeridos', 'error');
            return;
        }

        const result = editingRule
            ? await updateClientNameRule(editingRule.id, formData)
            : await createClientNameRule(formData);

        if (result.success) {
            addToast(editingRule ? 'Regla actualizada' : 'Regla creada', 'success');
            handleCloseModal();
        } else {
            addToast(result.error || 'Error al guardar', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteClientNameRule(id);
        if (result.success) {
            addToast('Regla eliminada', 'success');
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
                        <Merge className="w-6 h-6" />
                        Clientes Unificados
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {clientNameRules.length} reglas — agrupa variantes del mismo cliente (ej. "Sugerido barato #1") bajo un solo nombre en los reportes, sin modificar los pedidos originales.
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
            ) : (
                <div className="grid gap-3">
                    {clientNameRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-mono">{rule.keyword}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-medium text-gray-900 dark:text-white">{rule.canonicalName}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(rule)} aria-label="Editar regla" title="Editar" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteConfirm(rule.id)} aria-label="Eliminar regla" title="Eliminar" className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {clientNameRules.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No hay reglas configuradas todavía.
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingRule ? 'Editar Regla' : 'Nueva Regla de Unificación'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Palabra clave *</label>
                        <input
                            type="text"
                            value={formData.keyword}
                            onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                            placeholder="Ej: barato"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cualquier pedido cuyo nombre de cliente contenga esta palabra se agrupará bajo el nombre unificado.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre unificado *</label>
                        <input
                            type="text"
                            value={formData.canonicalName}
                            onChange={(e) => setFormData(prev => ({ ...prev, canonicalName: e.target.value }))}
                            placeholder="Ej: Barato"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{editingRule ? 'Actualizar' : 'Crear'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Eliminar Regla"
                message="¿Estás seguro? Esta acción no se puede deshacer."
                variant="danger"
            />
        </div>
    );
};
