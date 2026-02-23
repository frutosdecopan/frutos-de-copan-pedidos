import { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { generateAiReport } from '../../services/geminiService';
import { useToast } from '../../ToastContext';
import { Button } from '../common';
import { SalesChart } from '../analytics/SalesChart';
import { StatusChart } from '../analytics/StatusChart';
import { KPICards } from '../analytics/KPICards';
import { TopClientsChart } from '../analytics/TopClientsChart';
import { TopProductsChart } from '../analytics/TopProductsChart';
import { KPISkeleton, ChartSkeleton } from '../common';

interface AdminDashboardProps {
    orders: Order[];
    isDark: boolean;
    loading?: boolean;
}

export const AdminDashboard = ({ orders, isDark, loading = false }: AdminDashboardProps) => {
    const { addToast } = useToast();
    const [report, setReport] = useState<string | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const theme = isDark ? 'dark' : 'light';

    // ── ALL HOOKS MUST BE BEFORE ANY EARLY RETURN ──────────────────────────
    // Colors for charts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // --- KPI Calculations ---
    const kpis = useMemo(() => {
        const totalOrders = orders.length;
        const activeOrders = orders.filter(o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DRAFT);
        const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
        const pendingOrders = orders.filter(o => [OrderStatus.SENT, OrderStatus.REVIEW, OrderStatus.PRODUCTION, OrderStatus.DISPATCH].includes(o.status));

        const totalVolume = activeOrders.reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);

        const successRate = totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const createdToday = orders.filter(o => o.createdAt.startsWith(todayStr)).length;

        return { totalOrders, totalVolume, activeCount: activeOrders.length, pendingCount: pendingOrders.length, successRate, createdToday };
    }, [orders]);

    // 1. Sales Trend (Last 7 days)
    const trendData = useMemo(() => {
        const days = 7;
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const ordersOnDate = orders.filter(o => o.createdAt.startsWith(dateStr));
            const volumeOnDate = ordersOnDate.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
            data.push({
                date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
                orders: ordersOnDate.length,
                volume: volumeOnDate
            });
        }
        return data;
    }, [orders]);

    // 2. Product Mix (Top 5 Products)
    const productMixData = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(o => {
            if (o.status === OrderStatus.CANCELLED || o.status === OrderStatus.DRAFT) return;
            o.items.forEach(item => { counts[item.productName] = (counts[item.productName] || 0) + item.quantity; });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [orders]);

    // 3. Status Distribution
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
        return Object.values(OrderStatus).map(s => ({ name: s, value: counts[s] || 0 })).filter(d => d.value > 0);
    }, [orders]);
    // ── END HOOKS ───────────────────────────────────────────────────────────

    // Early return AFTER all hooks
    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <KPISkeleton count={4} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
            </div>
        );
    }

    const handleGenerateReport = async () => {
        setLoadingReport(true);
        try {
            const result = await generateAiReport(orders);
            setReport(result ?? null);
        } catch (error) {
            console.error(error);
            addToast("Error generating AI report", 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Dashboard Ejecutivo
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Actualizado en tiempo real
                    </p>
                </div>
                <Button onClick={handleGenerateReport} disabled={loadingReport} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-none text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
                    {loadingReport ? <span className="animate-spin mr-2">⏳</span> : <Sparkles className="w-5 h-5 mr-2" />}
                    {loadingReport ? 'Analizando datos...' : 'Generar Análisis IA'}
                </Button>
            </div>

            {/* AI Report Card (Conditional) */}
            {report && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs tracking-wider">
                        <Sparkles className="w-4 h-4" /> Reporte de Inteligencia
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-line leading-relaxed">
                        {report}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="ghost" onClick={() => setReport(null)} className="text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">Cerrar Análisis</Button>
                    </div>
                </div>
            )}

            {/* Modular KPI Cards */}
            <KPICards
                totalOrders={kpis.totalOrders}
                completedOrders={orders.filter(o => o.status === OrderStatus.DELIVERED).length}
                pendingOrders={kpis.pendingCount}
                totalRevenue={0}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SalesChart orders={orders} isDark={isDark} />
                <StatusChart orders={orders} isDark={isDark} />
            </div>

            {/* Strategic Analytics */}
            <div className="mt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    📊 Analytics Estratégicos
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TopClientsChart orders={orders} isDark={isDark} />
                    <TopProductsChart orders={orders} isDark={isDark} />
                </div>
            </div>


        </div>
    );
};
