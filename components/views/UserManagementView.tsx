import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, Edit2, X, Check } from 'lucide-react';
import { User, UserRole } from '../../types';
import { useCities } from '../../hooks/useCities';
import { Button, TableSkeleton, ConfirmDialog } from '../common';
import { useToast } from '../../ToastContext';

interface UserManagementViewProps {
    users: User[];
    onAddUser: (u: Omit<User, 'id'>) => void;
    onUpdateUser: (u: User) => void;
    onDeleteUser: (id: string) => void;
}

export const UserManagementView = ({ users, onAddUser, onUpdateUser, onDeleteUser }: UserManagementViewProps) => {
    const { addToast } = useToast();
    const { cities, loading: citiesLoading } = useCities();

    // Create form state
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>(UserRole.SELLER);
    const [newCityId, setNewCityId] = useState<string>(cities[0]?.id || '');
    const [newIsActive, setNewIsActive] = useState(true);

    // Update default city when cities load
    useEffect(() => {
        if (cities.length > 0 && !newCityId) {
            setNewCityId(cities[0].id);
        }
    }, [cities, newCityId]);

    // Edit state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editRole, setEditRole] = useState<UserRole>(UserRole.SELLER);
    const [editCityId, setEditCityId] = useState<string>('');
    const [editIsActive, setEditIsActive] = useState(true);

    const handleAdd = () => {
        if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
            addToast('Por favor completa todos los campos requeridos', 'error');
            return;
        }

        if (newPassword.length < 6) {
            addToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        // Check if username already exists
        if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            addToast('El nombre de usuario ya existe', 'error');
            return;
        }

        const newUser: Omit<User, 'id'> = {
            name: newName,
            username: newUsername,
            password: newPassword,
            role: newRole,
            assignedCities: [newCityId],
            unavailableDates: [],
            isActive: newIsActive
        };
        onAddUser(newUser);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewIsActive(true);
    };

    const handleStartEdit = (user: User) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditUsername(user.username);
        setEditPassword(''); // Don't show password
        setEditRole(user.role);
        setEditCityId(user.assignedCities[0] || cities[0]?.id || '');
        setEditIsActive(user.isActive);
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditName('');
        setEditUsername('');
        setEditPassword('');
    };

    const handleSaveEdit = () => {
        if (!editingUser) return;

        if (!editName.trim() || !editUsername.trim()) {
            addToast('Por favor completa todos los campos requeridos', 'error');
            return;
        }

        // Check if username already exists (excluding current user)
        if (users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === editUsername.toLowerCase())) {
            addToast('El nombre de usuario ya existe', 'error');
            return;
        }

        // If password is being changed, validate it
        if (editPassword && editPassword.length < 6) {
            addToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        const updatedUser: User = {
            ...editingUser,
            name: editName,
            username: editUsername,
            password: editPassword || editingUser.password, // Keep old password if not changed
            role: editRole,
            assignedCities: [editCityId],
            isActive: editIsActive
        };

        onUpdateUser(updatedUser);
        handleCancelEdit();
    };

    // Active users shown in full, inactive shown with reduced opacity so admins can still manage them
    const activeUsers = users.filter(u => u.isActive !== false);
    const inactiveUsers = users.filter(u => u.isActive === false);
    const sortedUsers = [...activeUsers, ...inactiveUsers];

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Gestión de Usuarios</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Administre los empleados y sus roles en el sistema.</p>

            {/* Add User Form */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-500" /> Agregar Nuevo Empleado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Ej. Roberto Martinez"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuario</label>
                        <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Ej. rmartinez"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rol</label>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as UserRole)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ciudad Asignada</label>
                        <select
                            value={newCityId}
                            onChange={(e) => setNewCityId(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {cities.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newIsActive}
                                onChange={(e) => setNewIsActive(e.target.checked)}
                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activo</span>
                        </label>
                    </div>
                    <div className="lg:col-span-2 flex items-end">
                        <Button onClick={handleAdd} disabled={!newName || !newUsername || !newPassword} className="w-full">
                            <Plus className="w-4 h-4 mr-1" /> Agregar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Users List - Desktop Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contraseña</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ciudad Principal</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sortedUsers.map(u => (
                                editingUser?.id === u.id ? (
                                    // Edit Row
                                    <tr key={u.id} className="bg-brand-50 dark:bg-brand-900/10">
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editUsername}
                                                onChange={(e) => setEditUsername(e.target.value)}
                                                className="w-full p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editPassword}
                                                onChange={(e) => setEditPassword(e.target.value)}
                                                className="w-full p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                placeholder="Dejar vacío para no cambiar"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value as UserRole)}
                                                className="w-full p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            >
                                                {Object.values(UserRole).map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={editCityId}
                                                onChange={(e) => setEditCityId(e.target.value)}
                                                className="w-full p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            >
                                                {cities.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editIsActive}
                                                    onChange={(e) => setEditIsActive(e.target.checked)}
                                                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                                />
                                                <span className="text-xs">{editIsActive ? 'Activo' : 'Inactivo'}</span>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 p-2 rounded-lg transition-colors"
                                                    title="Guardar"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    // View Row
                                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!u.isActive ? 'opacity-50' : ''}`}>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.name}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{u.username}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono text-sm">{u.password}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border dark:border-gray-700">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            {u.assignedCities.map(cid => cities.find(c => c.id === cid)?.name).join(', ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive
                                                ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                                                : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                                                }`}>
                                                {u.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleStartEdit(u)}
                                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors"
                                                    title="Editar usuario"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteUser(u.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                                    title="Eliminar usuario"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {sortedUsers.map(u => (
                        <div key={u.id} className={`p-4 flex flex-col gap-3 ${!u.isActive && editingUser?.id !== u.id ? 'opacity-50' : ''}`}>
                            {editingUser?.id === u.id ? (
                                // Mobile Edit Mode
                                <div className="space-y-3 bg-brand-50 dark:bg-brand-900/10 -m-4 p-4 rounded-lg border border-brand-200 dark:border-brand-800/30">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Usuario</label>
                                        <input
                                            type="text"
                                            value={editUsername}
                                            onChange={(e) => setEditUsername(e.target.value)}
                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Contraseña</label>
                                        <input
                                            type="text"
                                            value={editPassword}
                                            onChange={(e) => setEditPassword(e.target.value)}
                                            placeholder="Nueva contraseña (opcional)"
                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Rol</label>
                                            <select
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value as UserRole)}
                                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            >
                                                {Object.values(UserRole).map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Ciudad</label>
                                            <select
                                                value={editCityId}
                                                onChange={(e) => setEditCityId(e.target.value)}
                                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            >
                                                {cities.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={editIsActive}
                                                onChange={(e) => setEditIsActive(e.target.checked)}
                                                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                            />
                                            <span className="text-sm font-medium">Activo</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveEdit}
                                                className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                                            >
                                                <Check className="w-4 h-4" /> Guardar
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium"
                                            >
                                                <X className="w-4 h-4" /> Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Mobile View Mode
                                <>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white">{u.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleStartEdit(u)}
                                                className="text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteUser(u.id)}
                                                className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm flex-wrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                                            {u.role}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {u.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {u.assignedCities.map(cid => cities.find(c => c.id === cid)?.name).join(', ')}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
