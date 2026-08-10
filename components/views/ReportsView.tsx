import { FC, useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Order, OrderStatus, OrderType } from '../../types';
import { OrderFilters } from '../../hooks/useOrders';
import { TrendingUp, MapPin, Calendar, Download, Package, CalendarDays } from 'lucide-react';
import { ChartSkeleton } from '../common';
import { exportToExcel } from '../../utils/excelExport';

interface ReportsViewProps {
    fetchOrdersForExport: (filters: OrderFilters) => Promise<Order[]>;
    isDark: boolean;
}

type ReportTab = 'cities' | 'period' | 'yearly' | 'products' | 'weekly';
type PeriodType = 'weekly' | 'monthly' | 'quarterly';
type MetricType = 'orders' | 'units';

const CITY_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];
const PRODUCT_BAR_COLOR = '#f97316';
const TOP_PRODUCTS_LIMIT = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getOrderUnits(order: Order): number {
    return order.items.reduce((s, i) => s + i.quantity, 0);
}

function isActive(order: Order): boolean {
    return order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.DRAFT;
}

export const ReportsView: FC<ReportsViewProps> = ({ fetchOrdersForExport, isDark }) => {
    // Reports need the full historical dataset, not the paginated `orders`
    // used elsewhere — otherwise older data silently drops out of the charts.
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoadingOrders(true);
        fetchOrdersForExport({})
            .then(data => { if (!cancelled) setOrders(data); })
            .finally(() => { if (!cancelled) setLoadingOrders(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [activeTab, setActiveTab] = useState<ReportTab>('cities');
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [metric, setMetric] = useState<MetricType>('orders');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'delivered'>('all');
    const [filterCity, setFilterCity] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>(OrderType.SALE); // por defecto solo Ventas
    const currentYear = new Date().getFullYear();
    const [compareYears, setCompareYears] = useState<number[]>([currentYear - 1]);
    // Año vs Año
    const [yearFilterCity, setYearFilterCity] = useState<string>('all');
    // Por Semana
    const [weeklyYear, setWeeklyYear] = useState<number>(currentYear);
    const [weeklyGranularity, setWeeklyGranularity] = useState<'week' | 'month'>('week');
    const [weeklyFilterCity, setWeeklyFilterCity] = useState<string>('all');

    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    const gridColor = isDark ? '#374151' : '#E5E7EB';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: '8px',
        color: isDark ? '#FFFFFF' : '#111827',
    };

    // Apply common filters
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (filterType !== 'all' && o.orderType !== filterType) return false;
            if (filterStatus === 'active' && !isActive(o)) return false;
            if (filterStatus === 'delivered' && o.status !== OrderStatus.DELIVERED) return false;
            if (filterCity !== 'all' && o.destinationName !== filterCity) return false;
            if (dateStart) {
                if (new Date(o.createdAt).setHours(0, 0, 0, 0) < new Date(dateStart).setHours(0, 0, 0, 0)) return false;
            }
            if (dateEnd) {
                if (new Date(o.createdAt).setHours(0, 0, 0, 0) > new Date(dateEnd).setHours(0, 0, 0, 0)) return false;
            }
            return true;
        });
    }, [orders, filterType, filterStatus, filterCity, dateStart, dateEnd]);

    // ── Tab 1: Por Ciudad (destino de entrega) ─────────────────────────────────
    const cityData = useMemo(() => {
        const map: Record<string, { pedidos: number; unidades: number }> = {};
        filteredOrders.forEach(o => {
            const city = o.destinationName || 'Sin destino';
            if (!map[city]) map[city] = { pedidos: 0, unidades: 0 };
            map[city].pedidos += 1;
            map[city].unidades += getOrderUnits(o);
        });
        return Object.entries(map)
            .map(([ciudad, v]) => ({ ciudad, ...v }))
            .sort((a, b) => b[metric === 'orders' ? 'pedidos' : 'unidades'] - a[metric === 'orders' ? 'pedidos' : 'unidades']);
    }, [filteredOrders, metric]);

    // ── Tab 4: Por Producto ─────────────────────────────────────────────────
    const productData = useMemo(() => {
        const map: Record<string, { pedidos: number; unidades: number }> = {};
        filteredOrders.forEach(o => {
            o.items.forEach(item => {
                const key = item.productName;
                if (!map[key]) map[key] = { pedidos: 0, unidades: 0 };
                map[key].pedidos += 1;
                map[key].unidades += item.quantity;
            });
        });
        return Object.entries(map)
            .map(([producto, v]) => ({ producto, ...v }))
            .sort((a, b) => b[metric === 'orders' ? 'pedidos' : 'unidades'] - a[metric === 'orders' ? 'pedidos' : 'unidades'])
            .slice(0, TOP_PRODUCTS_LIMIT);
    }, [filteredOrders, metric]);

    // Mismo periodo inmediatamente anterior (misma duración, corrido hacia
    // atrás), calculado sobre el dataset completo ya cargado en memoria —
    // solo aplica cuando hay un rango de fechas seleccionado.
    const previousPeriodProductMap = useMemo(() => {
        if (!dateStart || !dateEnd) return null;

        const start = new Date(dateStart).setHours(0, 0, 0, 0);
        const end = new Date(dateEnd).setHours(0, 0, 0, 0);
        const durationMs = end - start;
        const prevEnd = start - MS_PER_DAY;
        const prevStart = prevEnd - durationMs;

        const map: Record<string, number> = {};
        orders.forEach(o => {
            if (filterType !== 'all' && o.orderType !== filterType) return;
            if (filterStatus === 'active' && !isActive(o)) return;
            if (filterStatus === 'delivered' && o.status !== OrderStatus.DELIVERED) return;
            if (filterCity !== 'all' && o.destinationName !== filterCity) return;
            const t = new Date(o.createdAt).setHours(0, 0, 0, 0);
            if (t < prevStart || t > prevEnd) return;

            o.items.forEach(item => {
                map[item.productName] = (map[item.productName] || 0) + (metric === 'orders' ? 1 : item.quantity);
            });
        });
        return map;
    }, [orders, dateStart, dateEnd, filterType, filterStatus, filterCity, metric]);

    // ── Tab 2: Por Periodo ──────────────────────────────────────────────────
    const periodData = useMemo(() => {
        if (periodType === 'monthly') {
            const map: Record<string, { pedidos: number; unidades: number }> = {};
            filteredOrders.forEach(o => {
                const d = new Date(o.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!map[key]) map[key] = { pedidos: 0, unidades: 0 };
                map[key].pedidos += 1;
                map[key].unidades += getOrderUnits(o);
            });
            return Object.entries(map)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, v]) => ({
                    periodo: MONTHS[parseInt(key.split('-')[1]) - 1] + ' ' + key.split('-')[0],
                    ...v
                }));
        }
        if (periodType === 'weekly') {
            const map: Record<string, { pedidos: number; unidades: number }> = {};
            filteredOrders.forEach(o => {
                const d = new Date(o.createdAt);
                const startOfYear = new Date(d.getFullYear(), 0, 1);
                const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
                const key = `${d.getFullYear()}-S${String(week).padStart(2, '0')}`;
                if (!map[key]) map[key] = { pedidos: 0, unidades: 0 };
                map[key].pedidos += 1;
                map[key].unidades += getOrderUnits(o);
            });
            return Object.entries(map)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, v]) => ({ periodo: key, ...v }));
        }
        // quarterly
        const map: Record<string, { pedidos: number; unidades: number }> = {};
        filteredOrders.forEach(o => {
            const d = new Date(o.createdAt);
            const q = Math.ceil((d.getMonth() + 1) / 3);
            const key = `${d.getFullYear()}-Q${q}`;
            if (!map[key]) map[key] = { pedidos: 0, unidades: 0 };
            map[key].pedidos += 1;
            map[key].unidades += getOrderUnits(o);
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, v]) => ({ periodo: key, ...v }));
    }, [filteredOrders, periodType]);

    // ── Tab 3: Año vs Año ───────────────────────────────────────────────────
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        orders.forEach(o => years.add(new Date(o.createdAt).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [orders]);

    // Destinos disponibles (de pedidos reales)
    const availableDestinations = useMemo(() => {
        const names = new Set<string>();
        orders.forEach(o => { if (o.destinationName) names.add(o.destinationName); });
        return Array.from(names).sort();
    }, [orders]);

    // Pedidos del tab año (filtrado por ciudad + tipo)
    const yearBaseOrders = useMemo(() => {
        return orders.filter(o => {
            if (filterType !== 'all' && o.orderType !== filterType) return false;
            if (yearFilterCity !== 'all' && o.destinationName !== yearFilterCity) return false;
            return true;
        });
    }, [orders, filterType, yearFilterCity]);

    const yearlyData = useMemo(() => {
        const allYears = [currentYear, ...compareYears];
        return MONTHS.map((month, idx) => {
            const row: Record<string, string | number> = { mes: month };
            allYears.forEach(year => {
                const yearOrders = yearBaseOrders.filter(o => {
                    const d = new Date(o.createdAt);
                    return d.getFullYear() === year && d.getMonth() === idx;
                });
                row[String(year)] = metric === 'orders'
                    ? yearOrders.length
                    : yearOrders.reduce((s, o) => s + getOrderUnits(o), 0);
            });
            return row;
        });
    }, [yearBaseOrders, currentYear, compareYears, metric]);

    // Tabla resumen por ciudad para año actual + comparados
    const cityYearSummary = useMemo(() => {
        const allYears = [currentYear, ...compareYears];
        const map = new Map<string, Record<number, number>>();
        yearBaseOrders.forEach(o => {
            const year = new Date(o.createdAt).getFullYear();
            if (!allYears.includes(year)) return;
            const dest = o.destinationName || 'Sin destino';
            if (!map.has(dest)) map.set(dest, {});
            const entry = map.get(dest)!;
            entry[year] = (entry[year] || 0) + (metric === 'orders' ? 1 : getOrderUnits(o));
        });
        return Array.from(map.entries())
            .map(([ciudad, years]) => ({ ciudad, years }))
            .sort((a, b) => (b.years[currentYear] || 0) - (a.years[currentYear] || 0));
    }, [yearBaseOrders, currentYear, compareYears, metric]);

    const yearColors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

    const toggleYear = (year: number) => {
        setCompareYears(prev =>
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    // ── Tab 5: Por Semana ────────────────────────────────────────────────────
    // Ventas por ciudad desglosadas por semana dentro de cada mes de un año
    // (o colapsadas a nivel mensual). No reutiliza `filteredOrders` porque
    // esta pestaña tiene su propio selector de año (no rango de fechas) y la
    // ciudad es una columna, no un filtro.
    const weeklyBaseOrders = useMemo(() => {
        return orders.filter(o => {
            if (filterType !== 'all' && o.orderType !== filterType) return false;
            if (filterStatus === 'active' && !isActive(o)) return false;
            if (filterStatus === 'delivered' && o.status !== OrderStatus.DELIVERED) return false;
            return new Date(o.createdAt).getFullYear() === weeklyYear;
        });
    }, [orders, filterType, filterStatus, weeklyYear]);

    interface WeeklyCityRow {
        mesLabel: string;
        semana: number | null; // null en modo "mes" (fila ya colapsada)
        porCiudad: Record<string, number>;
        total: number;
    }

    // Ciudades que se muestran como columnas — todas, o solo una si el
    // usuario filtró por ciudad.
    const weeklyColumnCities = useMemo(() => {
        return weeklyFilterCity === 'all' ? availableDestinations : [weeklyFilterCity];
    }, [availableDestinations, weeklyFilterCity]);

    const weeklyCityData = useMemo(() => {
        // Bloques de 7 días de calendario: día 1-7 = Semana 1, ... 29-31 = Semana 5.
        const buckets = new Map<string, number>(); // key `${mes}|${semana}|${ciudad}`
        weeklyBaseOrders.forEach(o => {
            const d = new Date(o.createdAt);
            const mes = d.getMonth();
            const semana = weeklyGranularity === 'week' ? Math.ceil(d.getDate() / 7) : 0;
            const ciudad = o.destinationName || 'Sin destino';
            const val = metric === 'orders' ? 1 : getOrderUnits(o);
            const key = `${mes}|${semana}|${ciudad}`;
            buckets.set(key, (buckets.get(key) || 0) + val);
        });

        const rows: WeeklyCityRow[] = [];
        for (let mes = 0; mes < 12; mes++) {
            const semanas = weeklyGranularity === 'week' ? [1, 2, 3, 4, 5] : [0];
            semanas.forEach(semana => {
                const porCiudad: Record<string, number> = {};
                let total = 0;
                let hasAny = false;
                weeklyColumnCities.forEach(ciudad => {
                    const val = buckets.get(`${mes}|${semana}|${ciudad}`) || 0;
                    porCiudad[ciudad] = val;
                    total += val;
                    if (val > 0) hasAny = true;
                });
                // Semana 5 no siempre existe (no todos los meses llegan al día 29+) —
                // se omite si no tiene ningún dato, para no ensuciar la tabla.
                if (weeklyGranularity === 'week' && semana === 5 && !hasAny) return;
                rows.push({ mesLabel: MONTHS[mes], semana: weeklyGranularity === 'week' ? semana : null, porCiudad, total });
            });
        }
        return rows;
    }, [weeklyBaseOrders, weeklyGranularity, weeklyColumnCities, metric]);

    const weeklyTotals = useMemo(() => {
        const porCiudad: Record<string, number> = {};
        weeklyColumnCities.forEach(c => { porCiudad[c] = 0; });
        let total = 0;
        weeklyCityData.forEach(row => {
            weeklyColumnCities.forEach(c => { porCiudad[c] += row.porCiudad[c] || 0; });
            total += row.total;
        });
        return { porCiudad, total };
    }, [weeklyCityData, weeklyColumnCities]);

    // ── Shared filter bar ───────────────────────────────────────────────────
    const FilterBar = ({ showCity = true }: { showCity?: boolean }) => (
        <div className="flex flex-wrap gap-3 items-end mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            {/* Tipo de pedido — lo más importante, va primero */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo de pedido</label>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="p-2 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white"
                >
                    <option value={OrderType.SALE}>Solo Ventas ★</option>
                    <option value="all">Todos los tipos</option>
                    {Object.values(OrderType).filter(t => t !== OrderType.SALE).map(t =>
                        <option key={t} value={t}>{t}</option>
                    )}
                </select>
            </div>
            {/* Ciudad — filtrar por destino */}
            {showCity && (
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ciudad</label>
                    <select
                        value={filterCity}
                        onChange={e => setFilterCity(e.target.value)}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white min-w-[140px]"
                    >
                        <option value="all">Todas las ciudades</option>
                        {availableDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</label>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                >
                    <option value="all">Todos</option>
                    <option value="active">Solo Activos</option>
                    <option value="delivered">Solo Entregados</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Métrica</label>
                <select
                    value={metric}
                    onChange={e => setMetric(e.target.value as MetricType)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                >
                    <option value="orders">Pedidos</option>
                    <option value="units">Unidades</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Desde</label>
                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white" />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Hasta</label>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white" />
            </div>
            {(dateStart || dateEnd || filterStatus !== 'all' || filterCity !== 'all' || filterType !== OrderType.SALE) && (
                <button
                    onClick={() => { setDateStart(''); setDateEnd(''); setFilterStatus('all'); setFilterCity('all'); setFilterType(OrderType.SALE); }}
                    className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
                >
                    Limpiar filtros
                </button>
            )}
            <div className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-end pb-2">
                {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} en el periodo
            </div>
        </div>
    );


    if (loadingOrders) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                <ChartSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Reportes Comparativos</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis de ventas por ciudad, período y comparación anual</p>
            </div>

            {/* Tab selector */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl w-fit">
                {([
                    { id: 'cities', label: 'Por Ciudad', icon: MapPin },
                    { id: 'period', label: 'Por Periodo', icon: Calendar },
                    { id: 'yearly', label: 'Año vs Año', icon: TrendingUp },
                    { id: 'products', label: 'Por Producto', icon: Package },
                    { id: 'weekly', label: 'Por Semana', icon: CalendarDays },
                ] as { id: ReportTab; label: string; icon: any }[]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Tab: Por Ciudad ─────────────────────────────────────────── */}
            {activeTab === 'cities' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-amber-500" /> Comparación por Ciudad
                        </h2>
                        <button
                            onClick={() => exportToExcel(
                                cityData.map(r => {
                                    const total = cityData.reduce((s, x) => s + x.pedidos, 0);
                                    return { Ciudad: r.ciudad, Pedidos: r.pedidos, Unidades: r.unidades, 'Porcentaje': total ? `${Math.round(r.pedidos / total * 100)}%` : '0%' };
                                }),
                                'reporte_ciudades'
                            )}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> Exportar Excel
                        </button>
                    </div>
                    <FilterBar />

                    {cityData.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">No hay datos para el período seleccionado.</div>
                    ) : (
                        <>
                            <div style={{ height: Math.max(300, cityData.length * 52) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={cityData}
                                        margin={{ top: 5, right: 40, left: 8, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12 }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="ciudad"
                                            width={140}
                                            tick={{ fill: isDark ? '#E5E7EB' : '#111827', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(v, name) => [v, name === 'pedidos' ? 'Pedidos' : 'Unidades']}
                                        />
                                        <Bar
                                            dataKey={metric === 'orders' ? 'pedidos' : 'unidades'}
                                            name={metric === 'orders' ? 'pedidos' : 'unidades'}
                                            radius={[0, 6, 6, 0]}
                                            label={{ position: 'right', fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12, fontWeight: 600 }}
                                        >
                                            {cityData.map((_, idx) => (
                                                <Cell key={idx} fill={CITY_COLORS[idx % CITY_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Summary table */}
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ciudad</th>
                                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pedidos</th>
                                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Unidades</th>
                                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">% del total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cityData.map((row, idx) => {
                                            const totalPedidos = cityData.reduce((s, r) => s + r.pedidos, 0);
                                            return (
                                                <tr key={row.ciudad} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="py-3 px-4 flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: CITY_COLORS[idx % CITY_COLORS.length] }} />
                                                        <span className="font-medium text-gray-900 dark:text-white">{row.ciudad}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.pedidos}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.unidades}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                                                <div className="h-1.5 rounded-full"
                                                                    style={{ width: `${totalPedidos ? (row.pedidos / totalPedidos * 100) : 0}%`, backgroundColor: CITY_COLORS[idx % CITY_COLORS.length] }} />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 w-10 text-right">
                                                                {totalPedidos ? Math.round(row.pedidos / totalPedidos * 100) : 0}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Tab: Por Periodo ─────────────────────────────────────────── */}
            {activeTab === 'period' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6">
                    <div className="flex flex-wrap gap-4 items-start justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" /> Tendencia por Periodo
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => exportToExcel(
                                    periodData.map(r => ({ Periodo: r.periodo, Pedidos: r.pedidos, Unidades: r.unidades })),
                                    'reporte_periodo'
                                )}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Exportar Excel
                            </button>
                            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                {(['weekly', 'monthly', 'quarterly'] as PeriodType[]).map(p => (
                                    <button key={p} onClick={() => setPeriodType(p)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${periodType === p
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                        {p === 'weekly' ? '📅 Semana' : p === 'monthly' ? '🗓 Mes' : '📊 Trimestre'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <FilterBar />

                    {periodData.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">No hay datos para el período seleccionado.</div>
                    ) : (() => {
                        const dataKey = metric === 'orders' ? 'pedidos' : 'unidades';
                        const values = periodData.map(d => d[dataKey] as number);
                        const maxVal = Math.max(...values);
                        const minVal = Math.min(...values);
                        const avgVal = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                        const barColor = metric === 'orders' ? '#f59e0b' : '#3b82f6';
                        const barColorEnd = metric === 'orders' ? '#d97706' : '#2563eb';
                        const needsRotation = periodType === 'weekly' && periodData.length > 10;

                        return (
                            <>
                                {/* KPI rápidos */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Mejor Período', value: maxVal, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                                        { label: 'Promedio', value: avgVal, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                        { label: 'Menor Período', value: minVal, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                                    ].map(kpi => (
                                        <div key={kpi.label} className={`${kpi.bg} rounded-xl p-3 text-center`}>
                                            <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Gráfico */}
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={periodData} margin={{ top: 10, right: 20, left: 0, bottom: needsRotation ? 60 : 30 }}>
                                            <defs>
                                                <linearGradient id="gradPeriod" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={barColor} stopOpacity={1} />
                                                    <stop offset="100%" stopColor={barColorEnd} stopOpacity={0.7} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis
                                                dataKey="periodo"
                                                tick={{ fill: isDark ? '#D1D5DB' : '#374151', fontSize: needsRotation ? 10 : 12, fontWeight: 500 }}
                                                angle={needsRotation ? -35 : 0}
                                                textAnchor={needsRotation ? 'end' : 'middle'}
                                                interval={0}
                                            />
                                            <YAxis tick={{ fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={tooltipStyle}
                                                formatter={(v) => [v, metric === 'orders' ? 'Pedidos' : 'Unidades']}
                                                labelStyle={{ color: isDark ? '#F9FAFB' : '#111827', fontWeight: 600 }}
                                            />
                                            <Bar dataKey={dataKey} name={dataKey} fill="url(#gradPeriod)" radius={[6, 6, 0, 0]}
                                                label={{ position: 'top', fill: isDark ? '#D1D5DB' : '#6B7280', fontSize: 11, fontWeight: 600 }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Tabla de periodos */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-800">
                                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Período</th>
                                                <th className="text-right py-2 px-3 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Pedidos</th>
                                                <th className="text-right py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Unidades</th>
                                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">vs Promedio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {periodData.map(row => {
                                                const val = row[dataKey] as number;
                                                const diff = val - avgVal;
                                                const isAbove = diff >= 0;
                                                return (
                                                    <tr key={row.periodo as string} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                        <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{row.periodo as string}</td>
                                                        <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{(row.pedidos as number).toLocaleString()}</td>
                                                        <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{(row.unidades as number).toLocaleString()}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isAbove
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                                                {isAbove ? '+' : ''}{diff}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* ── Tab: Año vs Año ──────────────────────────────────────────── */}
            {activeTab === 'yearly' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" /> Comparación Año vs Año por Ciudad
                        </h2>
                        <button
                            onClick={() => {
                                const allYears = [currentYear, ...compareYears];
                                exportToExcel(
                                    cityYearSummary.map(r => {
                                        const base: Record<string, string | number> = { Ciudad: r.ciudad };
                                        allYears.forEach(y => { base[String(y)] = r.years[y] || 0; });
                                        if (compareYears.length > 0) {
                                            const curr = r.years[currentYear] || 0;
                                            const prev = r.years[compareYears[0]] || 0;
                                            base['Variacion %'] = prev > 0 ? `${Math.round((curr - prev) / prev * 100)}%` : '-';
                                        }
                                        return base;
                                    }),
                                    'reporte_anio_vs_anio'
                                );
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> Exportar Excel
                        </button>
                    </div>

                    {/* Filtros: tipo + ciudad + métrica + años a comparar */}
                    <div className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        {/* Tipo de pedido */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo de pedido</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="p-2 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white">
                                <option value={OrderType.SALE}>Solo Ventas ★</option>
                                <option value="all">Todos los tipos</option>
                                {Object.values(OrderType).filter(t => t !== OrderType.SALE).map(t =>
                                    <option key={t} value={t}>{t}</option>
                                )}
                            </select>
                        </div>

                        {/* Ciudad */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ciudad / Destino</label>
                            <select value={yearFilterCity}
                                onChange={e => setYearFilterCity(e.target.value)}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white min-w-[160px]">
                                <option value="all">Todas las ciudades</option>
                                {availableDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* Métrica */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Métrica</label>
                            <select value={metric} onChange={e => setMetric(e.target.value as MetricType)}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
                                <option value="orders">Pedidos</option>
                                <option value="units">Unidades</option>
                            </select>
                        </div>

                        {/* Limpiar */}
                        {yearFilterCity !== 'all' && (
                            <button onClick={() => setYearFilterCity('all')}
                                className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors">
                                Ver todas las ciudades
                            </button>
                        )}

                        {/* Años a comparar */}
                        <div className="ml-auto flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Comparar con año</label>
                            <div className="flex flex-wrap gap-1">
                                {availableYears.filter(y => y !== currentYear).map((year, idx) => (
                                    <button key={year} onClick={() => toggleYear(year)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${compareYears.includes(year)
                                            ? 'text-white border-transparent'
                                            : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}
                                        style={compareYears.includes(year) ? { backgroundColor: yearColors[(idx + 1) % yearColors.length] } : {}}>
                                        {year}
                                    </button>
                                ))}
                                {availableYears.filter(y => y !== currentYear).length === 0 && (
                                    <span className="text-sm text-gray-400 italic">Sin años anteriores</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Leyenda de años + filtro activo */}
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full text-white" style={{ backgroundColor: yearColors[0] }}>
                            {currentYear} (actual)
                        </span>
                        {compareYears.map((year, idx) => (
                            <span key={year} className="px-3 py-1 text-xs font-semibold rounded-full text-white"
                                style={{ backgroundColor: yearColors[(idx + 1) % yearColors.length] }}>
                                {year}
                            </span>
                        ))}
                        {yearFilterCity !== 'all' && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                📍 {yearFilterCity}
                            </span>
                        )}
                    </div>

                    {/* Gráfico de líneas */}
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={yearlyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="mes" tick={{ fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12 }} />
                                <YAxis tick={{ fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12 }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
                                {[currentYear, ...compareYears].map((year, idx) => (
                                    <Line key={year} type="monotone" dataKey={String(year)}
                                        stroke={yearColors[idx % yearColors.length]}
                                        strokeWidth={idx === 0 ? 3 : 2}
                                        dot={{ r: 4 }} activeDot={{ r: 6 }}
                                        strokeDasharray={idx === 0 ? undefined : '5 3'} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* KPI totales por año */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[currentYear, ...compareYears].map((year, idx) => {
                            const total = yearBaseOrders.filter(o => new Date(o.createdAt).getFullYear() === year)
                                .reduce((s, o) => s + (metric === 'orders' ? 1 : getOrderUnits(o)), 0);
                            return (
                                <div key={year} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: yearColors[idx % yearColors.length] }}>
                                        {year}{idx === 0 ? ' (actual)' : ''}
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{metric === 'orders' ? 'pedidos' : 'unidades'} totales</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tabla de ciudades */}
                    {cityYearSummary.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                📍 Desglose por Ciudad / Destino
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ciudad</th>
                                            {[currentYear, ...compareYears].map((year, idx) => (
                                                <th key={year} className="text-right py-2 px-3 text-xs font-semibold uppercase"
                                                    style={{ color: yearColors[idx % yearColors.length] }}>
                                                    {year}{idx === 0 ? ' ★' : ''}
                                                </th>
                                            ))}
                                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Var %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cityYearSummary.map((row, ridx) => {
                                            const curr = row.years[currentYear] || 0;
                                            const prev = compareYears.length > 0 ? (row.years[compareYears[0]] || 0) : 0;
                                            const varPct = prev > 0 ? Math.round((curr - prev) / prev * 100) : null;
                                            return (
                                                <tr key={row.ciudad} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                                                            style={{ backgroundColor: CITY_COLORS[ridx % CITY_COLORS.length] }} />
                                                        {row.ciudad}
                                                    </td>
                                                    {[currentYear, ...compareYears].map(year => (
                                                        <td key={year} className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300">
                                                            {(row.years[year] || 0).toLocaleString()}
                                                        </td>
                                                    ))}
                                                    <td className="py-2.5 px-3 text-right">
                                                        {varPct !== null ? (
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${varPct >= 0
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                                                {varPct >= 0 ? '+' : ''}{varPct}%
                                                            </span>
                                                        ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Por Producto ───────────────────────────────────────── */}
            {activeTab === 'products' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-orange-500" /> Demanda por Producto
                        </h2>
                        <button
                            onClick={() => exportToExcel(
                                productData.map(r => {
                                    const val = metric === 'orders' ? r.pedidos : r.unidades;
                                    const prevVal = previousPeriodProductMap?.[r.producto] ?? null;
                                    const row: Record<string, string | number> = { Producto: r.producto, Pedidos: r.pedidos, Unidades: r.unidades };
                                    if (prevVal !== null) {
                                        row['vs Periodo Anterior'] = prevVal > 0 ? `${Math.round((val - prevVal) / prevVal * 100)}%` : (val > 0 ? '+100%' : '0%');
                                    }
                                    return row;
                                }),
                                'reporte_productos'
                            )}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> Exportar Excel
                        </button>
                    </div>
                    <FilterBar />

                    {productData.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">No hay datos para el período seleccionado.</div>
                    ) : (
                        <>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                                Mostrando el top {TOP_PRODUCTS_LIMIT} de productos por {metric === 'orders' ? 'pedidos' : 'unidades'}.
                            </div>
                            <div style={{ height: Math.max(300, productData.length * 40) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={productData}
                                        margin={{ top: 5, right: 40, left: 8, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12 }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="producto"
                                            width={160}
                                            tick={{ fill: isDark ? '#E5E7EB' : '#111827', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(v, name) => [v, name === 'pedidos' ? 'Pedidos' : 'Unidades']}
                                        />
                                        <Bar
                                            dataKey={metric === 'orders' ? 'pedidos' : 'unidades'}
                                            name={metric === 'orders' ? 'pedidos' : 'unidades'}
                                            fill={PRODUCT_BAR_COLOR}
                                            radius={[0, 6, 6, 0]}
                                            label={{ position: 'right', fill: isDark ? '#D1D5DB' : '#374151', fontSize: 12, fontWeight: 600 }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Tabla de productos */}
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pedidos</th>
                                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Unidades</th>
                                            {previousPeriodProductMap && (
                                                <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">vs Periodo Anterior</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productData.map(row => {
                                            const currVal = metric === 'orders' ? row.pedidos : row.unidades;
                                            const prevVal = previousPeriodProductMap?.[row.producto] ?? null;
                                            const pct = prevVal !== null
                                                ? (prevVal > 0 ? Math.round((currVal - prevVal) / prevVal * 100) : (currVal > 0 ? 100 : 0))
                                                : null;
                                            return (
                                                <tr key={row.producto} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{row.producto}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.pedidos}</td>
                                                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.unidades}</td>
                                                    {previousPeriodProductMap && (
                                                        <td className="py-3 px-4 text-right">
                                                            {pct !== null ? (
                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 0
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                                                    {pct >= 0 ? '+' : ''}{pct}%
                                                                </span>
                                                            ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Tab: Por Semana ─────────────────────────────────────────── */}
            {activeTab === 'weekly' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-purple-500" /> Ventas por Ciudad — Semana / Mes
                        </h2>
                        <button
                            onClick={() => {
                                const rows = weeklyCityData.map(row => {
                                    const base: Record<string, string | number> = { Año: weeklyYear, Mes: row.mesLabel };
                                    if (row.semana !== null) base['Semana'] = `Semana ${row.semana}`;
                                    weeklyColumnCities.forEach(c => { base[c] = row.porCiudad[c] || 0; });
                                    base['Total'] = row.total;
                                    return base;
                                });
                                exportToExcel(rows, `reporte_ventas_${weeklyGranularity === 'week' ? 'semanal' : 'mensual'}_${weeklyYear}`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> Exportar Excel
                        </button>
                    </div>

                    {/* Filtros propios: año, granularidad, tipo, estado, métrica */}
                    <div className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Año</label>
                            <div className="flex flex-wrap gap-1">
                                {(availableYears.length > 0 ? availableYears : [currentYear]).map(year => (
                                    <button key={year} onClick={() => setWeeklyYear(year)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${weeklyYear === year
                                            ? 'bg-purple-600 border-purple-600 text-white'
                                            : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}>
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vista</label>
                            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                {(['week', 'month'] as const).map(g => (
                                    <button key={g} onClick={() => setWeeklyGranularity(g)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${weeklyGranularity === g
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                        {g === 'week' ? '📅 Semana' : '🗓 Mes'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ciudad</label>
                            <select value={weeklyFilterCity} onChange={e => setWeeklyFilterCity(e.target.value)}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white min-w-[140px]">
                                <option value="all">Todas las ciudades</option>
                                {availableDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo de pedido</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="p-2 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white">
                                <option value={OrderType.SALE}>Solo Ventas ★</option>
                                <option value="all">Todos los tipos</option>
                                {Object.values(OrderType).filter(t => t !== OrderType.SALE).map(t =>
                                    <option key={t} value={t}>{t}</option>
                                )}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
                                <option value="all">Todos</option>
                                <option value="active">Solo Activos</option>
                                <option value="delivered">Solo Entregados</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Métrica</label>
                            <select value={metric} onChange={e => setMetric(e.target.value as MetricType)}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
                                <option value="orders">Pedidos</option>
                                <option value="units">Unidades</option>
                            </select>
                        </div>
                    </div>

                    {weeklyColumnCities.length === 0 || weeklyTotals.total === 0 ? (
                        <div className="py-16 text-center text-gray-400">No hay datos para el año seleccionado.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800">
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase sticky left-0 bg-white dark:bg-gray-900">Mes</th>
                                        {weeklyGranularity === 'week' && (
                                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Semana</th>
                                        )}
                                        {weeklyColumnCities.map((ciudad, idx) => (
                                            <th key={ciudad} className="text-right py-2 px-3 text-xs font-semibold uppercase whitespace-nowrap"
                                                style={{ color: CITY_COLORS[idx % CITY_COLORS.length] }}>
                                                {ciudad}
                                            </th>
                                        ))}
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyCityData.map((row, ridx) => (
                                        <tr key={ridx} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="py-2 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900">{row.mesLabel}</td>
                                            {weeklyGranularity === 'week' && (
                                                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Semana {row.semana}</td>
                                            )}
                                            {weeklyColumnCities.map(ciudad => (
                                                <td key={ciudad} className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                                                    {(row.porCiudad[ciudad] || 0).toLocaleString()}
                                                </td>
                                            ))}
                                            <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">{row.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 dark:border-gray-700 font-bold">
                                        <td className="py-2 px-3 text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900">Total {weeklyYear}</td>
                                        {weeklyGranularity === 'week' && <td className="py-2 px-3" />}
                                        {weeklyColumnCities.map(ciudad => (
                                            <td key={ciudad} className="py-2 px-3 text-right text-gray-900 dark:text-white">
                                                {(weeklyTotals.porCiudad[ciudad] || 0).toLocaleString()}
                                            </td>
                                        ))}
                                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">{weeklyTotals.total.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
