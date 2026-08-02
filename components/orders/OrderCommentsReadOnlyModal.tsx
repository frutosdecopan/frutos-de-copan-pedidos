import { FC } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Order } from '../../types';

interface OrderCommentsReadOnlyModalProps {
    order: Order;
    onClose: () => void;
}

export const OrderCommentsReadOnlyModal: FC<OrderCommentsReadOnlyModalProps> = ({ order, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        Comentarios - Pedido #{order.id}
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                    {/* Read-only comments view */}
                    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Comentarios de Bodega</h4>
                            <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {order.comments?.length || 0}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                            {!order.comments || order.comments.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm italic">
                                    No hay comentarios aún.
                                </div>
                            ) : (
                                order.comments.map((comment) => (
                                    <div key={comment.id} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{comment.userName}</span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(comment.createdAt).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-600">
                                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-b-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">
                                Solo lectura - Los comentarios son agregados por el equipo de Bodega
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
