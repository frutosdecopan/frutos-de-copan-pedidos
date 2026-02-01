import { FC, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { OrderComment } from '../../types';

interface OrderCommentsProps {
    comments: OrderComment[];
    onAddComment: (content: string) => Promise<void>;
    isDark: boolean;
}

export const OrderComments: FC<OrderCommentsProps> = ({ comments, onAddComment, isDark }) => {
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await onAddComment(newComment);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Comentarios y Notas</h4>
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {comments.length}
                </span>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
                {comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm italic">
                        No hay comentarios aún.
                        <br />
                        Agrega notas importantes sobre este pedido.
                    </div>
                ) : (
                    comments.map((comment) => (
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

            {/* Input Form */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario..."
                        className="flex-1 text-sm p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={submitting}
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || submitting}
                        className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? <span className="animate-spin text-xs">⏳</span> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
};
