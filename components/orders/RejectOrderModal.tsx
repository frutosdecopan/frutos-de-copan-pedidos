import { FC } from 'react';

interface RejectOrderModalProps {
    reason: string;
    onReasonChange: (reason: string) => void;
    onConfirm: () => void;
    onClose: () => void;
}

export const RejectOrderModal: FC<RejectOrderModalProps> = ({ reason, onReasonChange, onConfirm, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Cancelar Pedido
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        ¿Estás seguro que deseas cancelar este pedido? Esta acción no se puede deshacer.
                        Por favor ingresa un motivo.
                    </p>

                    <textarea
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder="Motivo de la cancelación..."
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[100px] text-sm mb-4"
                        autoFocus
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Regresar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!reason.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirmar Cancelación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
