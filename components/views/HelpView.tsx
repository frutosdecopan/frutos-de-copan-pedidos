import { FC, useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Lightbulb, AlertTriangle } from 'lucide-react';
import { User } from '../../types';
import { MANUALS, ManualSection } from './manuals';

interface HelpViewProps {
    user: User;
}

const SectionCard: FC<{ section: ManualSection }> = ({ section }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{section.icon}</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{section.title}</span>
                </div>
                {open
                    ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                }
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {section.steps.map((step, idx) => (
                        <div key={idx} className="px-5 py-4">
                            <div className="flex gap-3">
                                {/* Step number badge */}
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{step.title}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                        {step.description}
                                    </p>
                                    {step.tip && (
                                        <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700 dark:text-blue-300">{step.tip}</p>
                                        </div>
                                    )}
                                    {step.warning && (
                                        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-700 dark:text-amber-300">{step.warning}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const HelpView: FC<HelpViewProps> = ({ user }) => {
    const manual = MANUALS[user.role];

    if (!manual) {
        return (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No hay manual disponible para este rol.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Manual de Usuario
                        </h1>
                        <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">
                            Rol: {user.role}
                        </p>
                    </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {manual.description}
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                    Secciones — toca para expandir
                </h2>
                {manual.sections.map(section => (
                    <SectionCard key={section.id} section={section} />
                ))}
            </div>

            {/* Footer */}
            <div className="text-center py-4">
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    Frutos de Copán · Sistema de Pedidos Internos
                </p>
            </div>
        </div>
    );
};
