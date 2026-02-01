import { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Trash2, Users } from 'lucide-react';
import { User, UserRole } from '../../types';
import { useCities } from '../../hooks/useCities';
import { Button, CardSkeleton } from '../common';

interface AvailabilityViewProps {
    users: User[];
    onUpdateUser: (u: User) => void;
}

export const AvailabilityView = ({ users, onUpdateUser }: AvailabilityViewProps) => {
    const { cities, loading: citiesLoading } = useCities();
    const deliveryUsers = useMemo(() => users.filter(u => u.role === UserRole.DELIVERY), [users]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [dateInput, setDateInput] = useState('');

    useEffect(() => {
        if (!selectedUserId && deliveryUsers.length > 0) {
            setSelectedUserId(deliveryUsers[0].id);
        }
    }, [deliveryUsers, selectedUserId]);

    const selectedUser = users.find(u => u.id === selectedUserId);

    const handleAddDate = () => {
        if (!selectedUser || !dateInput) return;
        if (selectedUser.unavailableDates?.includes(dateInput)) return;

        const updatedUser = {
            ...selectedUser,
            unavailableDates: [...(selectedUser.unavailableDates || []), dateInput].sort()
        };
        onUpdateUser(updatedUser);
        setDateInput('');
    };

    const handleRemoveDate = (dateToRemove: string) => {
        if (!selectedUser) return;
        const updatedUser = {
            ...selectedUser,
            unavailableDates: (selectedUser.unavailableDates || []).filter(d => d !== dateToRemove)
        };
        onUpdateUser(updatedUser);
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Disponibilidad de Personal</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Gestione las fechas de vacaciones o bajas de los repartidores.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Repartidores</h3>
                    <div className="space-y-2">
                        {deliveryUsers.length === 0 ? (
                            <p className="text-gray-500 text-sm">No hay repartidores registrados.</p>
                        ) : (
                            deliveryUsers.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUserId(u.id)}
                                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${selectedUserId === u.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                                >
                                    <span className="font-medium text-sm">{u.name}</span>
                                    {selectedUserId === u.id && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    {selectedUser ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.name}</h2>
                                    <p className="text-sm text-gray-500">{selectedUser.assignedCities.map(cid => cities.find(c => c.id === cid)?.name).join(', ')}</p>
                                </div>
                                <span className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                    {selectedUser.unavailableDates?.length || 0} fechas no disponibles
                                </span>
                            </div>

                            <div className="flex gap-4 mb-8 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Agregar fecha de baja/vacaciones</label>
                                    <input
                                        type="date"
                                        value={dateInput}
                                        onChange={(e) => setDateInput(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <Button onClick={handleAddDate} disabled={!dateInput}>
                                    <Plus className="w-4 h-4 mr-1" /> Agregar
                                </Button>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Fechas Marcadas
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(selectedUser.unavailableDates || []).map(date => (
                                        <div key={date} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded border border-red-100 dark:border-red-800">
                                            <span className="text-sm font-medium">{date}</span>
                                            <button onClick={() => handleRemoveDate(date)} className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded transition-colors">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!selectedUser.unavailableDates || selectedUser.unavailableDates.length === 0) && (
                                        <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">Este usuario está disponible todos los días.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                            <Users className="w-12 h-12 mb-4 opacity-50" />
                            <p>Seleccione un usuario para gestionar su disponibilidad</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
