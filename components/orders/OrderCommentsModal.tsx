import { FC } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Order } from '../../types';
import { OrderComments } from './OrderComments';

interface OrderCommentsModalProps {
    order: Order;
    onAddComment: (content: string) => Promise<void>;
    onClose: () => void;
    isDark: boolean;
}

export const OrderCommentsModal: FC<OrderCommentsModalProps> = ({ order, onAddComment, onClose, isDark }) => {
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
                    <OrderComments
                        comments={order.comments || []}
                        onAddComment={onAddComment}
                        isDark={isDark}
                    />
                </div>
            </div>
        </div>
    );
};
