import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { chatterMetricsAPI } from '../api-service';
import { useOMConfig } from '../hooks/useOMConfig';
import {
  ChatterMetrics, ChatterWithKPIs, TimePeriod,
  CHATTER_COLORS, ACCOUNT_COLORS, RATING_COLORS,
  OMAccount, EXCLUDED_MEMBER_IDS
} from '../types';

type SortOption = 'revenue' | 'messages' | 'reply_time' | 'conversion' | 'fans';

interface DailyHistory {
  date: string;
  sales: number;
  messages: number;
  fans: number;
  conversion: number;
}

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
}

// ═══════════════════════════════════════════
// UTILIDADES DE FECHA
// ═══════════════════════════════════════════

function calculateDaysDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (start === end) {
    return startDate.toLocaleDateString('es-ES', { ...options, year: 'numeric' });
  }
  const startStr = startDate.toLocaleDateString('es-ES', options);
  const endStr = endDate.toLocaleDateString('es-ES', { ...options, year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function getDateRange(
  period: TimePeriod,
  customStart?: string,
  customEnd?: string
): { start: string; end: string } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (period === TimePeriod.CUSTOM) {
    if (customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return { start: fmt(thirtyDaysAgo), end: fmt(today) };
  }

  switch (period) {
    case TimePeriod.TODAY:
      return { start: fmt(today), end: fmt(today) };
    case TimePeriod.YESTERDAY: {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case TimePeriod.LAST_7_DAYS: {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: fmt(today) };
    }
    case TimePeriod.THIS_WEEK: {
      const dow = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      return { start: fmt(mon), end: fmt(today) };
    }
    case TimePeriod.THIS_MONTH: {
      const first = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      return { start: fmt(first), end: fmt(today) };
    }
    default:
      return { start: fmt(today), end: fmt(today) };
  }
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  [TimePeriod.TODAY]: 'Hoy',
  [TimePeriod.YESTERDAY]: 'Ayer',
  [TimePeriod.LAST_7_DAYS]: 'Últimos 7 días',
  [TimePeriod.THIS_WEEK]: 'Esta Semana',
  [TimePeriod.THIS_MONTH]: 'Este Mes',
  [TimePeriod.CUSTOM]: 'Personalizado'
};

// ═══════════════════════════════════════════
// CÁLCULO DE KPIs
// ═══════════════════════════════════════════

function calculateKPIs(chattersData: ChatterMetrics[]): ChatterWithKPIs[] {
  if (!chattersData?.length) return [];

  // Rank by total NET revenue (already sorted from backend)
  const withKPIs: ChatterWithKPIs[] = chattersData.map((c, idx) => ({
    ...c,
    rank: idx + 1,
    performance_rating: 3 as 1 | 2 | 3 | 4 | 5
  }));

  // Performance rating based on revenue relative to top earner
  const maxRevenue = Math.max(...withKPIs.map(c => c.revenue.total_net), 1);
  withKPIs.forEach(c => {
    const pct = (c.revenue.total_net / maxRevenue) * 100;
    if (pct >= 80) c.performance_rating = 5;
    else if (pct >= 60) c.performance_rating = 4;
    else if (pct >= 40) c.performance_rating = 3;
    else if (pct >= 20) c.performance_rating = 2;
    else c.performance_rating = 1;
  });

  return withKPIs;
}

// Format helpers
const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString('en-US');
const fmtTime = (seconds: number) => {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════

const DashboardChatters: React.FC<Props> = ({ archivedData, isReadOnly = false }) => {
  const { accounts: omAccounts, members: omMembers, isLoading: configLoading, error: configError } = useOMConfig();
  const [chattersData, setChattersData] = useState<ChatterWithKPIs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Filters
  const [period, setPeriod] = useState<TimePeriod>(TimePeriod.THIS_MONTH);
  const [filterChatter, setFilterChatter] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('revenue');

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Modal
  const [selectedChatter, setSelectedChatter] = useState<string | null>(null);

  // View mode toggle
  type ViewMode = 'cards' | 'billing';
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Quick range helper
  const setQuickRange = (days: number) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    setCustomStartDate(startDate.toISOString().split('T')[0]);
    setCustomEndDate(today.toISOString().split('T')[0]);
  };

  // Load saved custom dates
  useEffect(() => {
    const savedStart = localStorage.getItem('chatters_customStartDate');
    const savedEnd = localStorage.getItem('chatters_customEndDate');
    if (savedStart && savedEnd) {
      setCustomStartDate(savedStart);
      setCustomEndDate(savedEnd);
    }
  }, []);

  // Save custom dates
  useEffect(() => {
    if (customStartDate && customEndDate) {
      localStorage.setItem('chatters_customStartDate', customStartDate);
      localStorage.setItem('chatters_customEndDate', customEndDate);
    }
  }, [customStartDate, customEndDate]);

  // ─── FILTERED MEMBERS (exclude non-chatters) ───
  const filteredMembers = useMemo(() =>
    omMembers.filter(m => !EXCLUDED_MEMBER_IDS.includes(m.id)),
    [omMembers]
  );

  const chatterMembers = useMemo(() => {
    if (chattersData.length === 0) return filteredMembers;
    const activeIds = new Set(chattersData.map(c => Number(c.user_id)));
    return filteredMembers.filter(m => activeIds.has(m.id));
  }, [filteredMembers, chattersData]);

  // Helper: resolve creator_ids to account names using dynamic config
  const resolveAccountNames = useCallback((creatorIds: number[]): string[] => {
    if (!creatorIds?.length || !omAccounts.length) return [];
    return creatorIds.map(id => omAccounts.find(a => a.id === id)?.name ?? `#${id}`);
  }, [omAccounts]);

  // ─── DATA LOADING ───
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange(period, customStartDate, customEndDate);

      // Pass account_id when filtering by model — backend handles creator_ids
      const accountId = filterModel !== 'all' ? filterModel : undefined;
      const data = await chatterMetricsAPI.getAllChatterMetrics(start, end, accountId);

      if (data && Array.isArray(data)) {
        // Enrich: resolve creator_ids to account names + resolve user_name from omMembers
        const enriched = data.map(c => ({
          ...c,
          user_name: omMembers.find(m => m.id === Number(c.user_id))?.name ?? c.user_name ?? `User ${c.user_id}`,
          accounts: c.accounts?.length ? c.accounts : resolveAccountNames(c.creator_ids ?? [])
        }));
        const withKPIs = calculateKPIs(enriched);
        setChattersData(withKPIs);
        setLastUpdate(new Date());
      } else {
        setError('No se pudieron cargar las métricas de chatters.');
      }
    } catch (e) {
      setError('Error de conexión con la API de chatters.');
      console.error('Load error:', e);
    }
    setIsLoading(false);
  }, [period, customStartDate, customEndDate, filterModel, resolveAccountNames, omMembers]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── FILTERED & SORTED DATA ───
  const displayData = useMemo(() => {
    let result = [...chattersData];

    if (filterChatter !== 'all') {
      result = result.filter(c => c.user_id === filterChatter);
    }

    // No client-side account filtering — backend already filtered via creator_ids

    result.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.revenue.total_net - a.revenue.total_net;
        case 'messages': return b.messages.total - a.messages.total;
        case 'reply_time':
          const aTime = a.performance.reply_time_avg_seconds || Infinity;
          const bTime = b.performance.reply_time_avg_seconds || Infinity;
          return aTime - bTime;
        case 'conversion': return b.performance.conversion_rate - a.performance.conversion_rate;
        case 'fans': return b.fans_count - a.fans_count;
        default: return 0;
      }
    });

    return result;
  }, [chattersData, filterChatter, filterModel, sortBy]);

  // ─── TOTALS (basados en datos filtrados) ───
  // Helper to find account name from dynamic config
  const getAccountName = useCallback((id: string) => {
    return omAccounts.find(a => String(a.id) === id)?.name ?? id;
  }, [omAccounts]);

  const totals = useMemo(() => {
    const data = displayData;
    const activeWithReply = data.filter(c => c.performance.reply_time_avg_seconds > 0);
    return {
      totalRevenue: data.reduce((s, c) => s + c.revenue.total_net, 0),
      totalMessages: data.reduce((s, c) => s + c.messages.total, 0),
      totalFans: data.reduce((s, c) => s + c.fans_count, 0),
      avgReplyTime: activeWithReply.length > 0
        ? activeWithReply.reduce((s, c) => s + c.performance.reply_time_avg_seconds, 0) / activeWithReply.length
        : 0,
      totalSold: data.reduce((s, c) => s + c.messages.sold, 0),
      activeChatters: data.filter(c => c.messages.total > 0).length
    };
  }, [displayData]);

  // Show skeleton while OM config is loading
  if (configLoading && omAccounts.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">💬 Dashboard de Chatters</h1>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  // Show error if config failed and we have no cached data
  if (configError && omAccounts.length === 0 && omMembers.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors">
        <div className="max-w-7xl mx-auto text-center py-16">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Error cargando configuración</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{configError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* ═══ HEADER ═══ */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                💬 Dashboard de Chatters
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Última act: {lastUpdate.toLocaleTimeString('es-ES')} · Auto-refresh 5 min · Datos reales de OnlyMonster /users/metrics · Revenue NET (-20% OF)
              </p>
              {period === TimePeriod.CUSTOM && customStartDate && customEndDate && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-full">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    📅 {formatDateRange(customStartDate, customEndDate)}
                  </span>
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    ({calculateDaysDifference(customStartDate, customEndDate)} días)
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
            >
              <span className={isLoading ? 'animate-spin inline-block' : ''}>🔄</span>
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* ═══ FILTROS ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Período</label>
              <select value={period} onChange={e => {
                const newPeriod = e.target.value as TimePeriod;
                setPeriod(newPeriod);
                if (newPeriod === TimePeriod.CUSTOM) {
                  setShowCustomDatePicker(true);
                  if (!customStartDate || !customEndDate) {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setCustomEndDate(today.toISOString().split('T')[0]);
                    setCustomStartDate(weekAgo.toISOString().split('T')[0]);
                  }
                } else {
                  setShowCustomDatePicker(false);
                }
              }}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              {/* Custom Date Picker */}
              {showCustomDatePicker && (
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold mb-1 text-purple-700 dark:text-purple-300 uppercase tracking-wide">Fecha Inicio</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      max={customEndDate || undefined}
                      className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1 text-purple-700 dark:text-purple-300 uppercase tracking-wide">Fecha Fin</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      min={customStartDate || undefined}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {customStartDate && customEndDate && (
                    <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-2 py-1.5 rounded">
                      📊 {calculateDaysDifference(customStartDate, customEndDate)} días seleccionados
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        loadData();
                      } else {
                        alert('⚠️ Selecciona fechas de inicio y fin');
                      }
                    }}
                    disabled={!customStartDate || !customEndDate}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    ✅ Aplicar Rango
                  </button>
                  <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                    <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">⚡ Atajos:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[{l:'7 días',d:7},{l:'15 días',d:15},{l:'30 días',d:30},{l:'90 días',d:90}].map(p => (
                        <button key={p.d} onClick={() => setQuickRange(p.d)}
                          className="px-2 py-1.5 text-[11px] bg-white dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-700 rounded text-purple-700 dark:text-purple-300 transition-colors">
                          📅 Últimos {p.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Chatter</label>
              <select value={filterChatter} onChange={e => setFilterChatter(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="all">Todos</option>
                {chatterMembers.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Modelo</label>
              <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="all">Todas</option>
                {omAccounts.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Ordenar por</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="revenue">💰 Revenue</option>
                <option value="messages">💬 Mensajes</option>
                <option value="reply_time">⏱️ Tiempo Respuesta</option>
                <option value="conversion">📈 Conversión</option>
                <option value="fans">👥 Fans</option>
              </select>
            </div>
          </div>

          {/* ═══ FILTROS ACTIVOS INDICATOR ═══ */}
          {(filterModel !== 'all' || filterChatter !== 'all' || period === TimePeriod.CUSTOM) && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  🔍 Filtros activos:
                </span>
                {filterModel !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 rounded-full text-xs font-medium text-purple-800 dark:text-purple-200">
                    📊 {getAccountName(filterModel)}
                    <button onClick={() => setFilterModel('all')} className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors">✕</button>
                  </span>
                )}
                {filterChatter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 rounded-full text-xs font-medium text-green-800 dark:text-green-200">
                    💬 {chatterMembers.find(c => String(c.id) === filterChatter)?.name || 'Chatter'}
                    <button onClick={() => setFilterChatter('all')} className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors">✕</button>
                  </span>
                )}
                {period === TimePeriod.CUSTOM && customStartDate && customEndDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-full text-xs font-medium text-orange-800 dark:text-orange-200">
                    📅 {formatDateRange(customStartDate, customEndDate)}
                    <button onClick={() => { setPeriod(TimePeriod.THIS_MONTH); setShowCustomDatePicker(false); }} className="hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full p-0.5 transition-colors">✕</button>
                  </span>
                )}
                <button
                  onClick={() => { setFilterModel('all'); setFilterChatter('all'); setPeriod(TimePeriod.THIS_MONTH); setShowCustomDatePicker(false); }}
                  className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full font-medium transition-colors"
                >
                  🗑️ Limpiar todos
                </button>
              </div>
            </div>
          )}

          {/* ═══ STAT CARDS ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title={filterModel !== 'all' || filterChatter !== 'all' ? 'Revenue (Filtrado)' : 'Revenue NET'}
              value={fmtMoney(totals.totalRevenue)}
              icon="💰"
              color="green"
              subtitle={filterModel !== 'all' ? `Solo ${getAccountName(filterModel)}` : undefined}
            />
            <StatCard
              title={filterModel !== 'all' || filterChatter !== 'all' ? 'Mensajes (Filtrado)' : 'Mensajes'}
              value={fmtNum(totals.totalMessages)}
              icon="💬"
              color="blue"
              subtitle={filterModel !== 'all' ? `Solo ${getAccountName(filterModel)}` : undefined}
            />
            <StatCard
              title={filterModel !== 'all' || filterChatter !== 'all' ? 'Fans (Filtrado)' : 'Fans'}
              value={fmtNum(totals.totalFans)}
              icon="👥"
              color="purple"
              subtitle={filterModel !== 'all' ? `Solo ${getAccountName(filterModel)}` : undefined}
            />
            <StatCard title="Avg Reply Time" value={fmtTime(totals.avgReplyTime)} icon="⏱️" color="orange" />
            <StatCard title="PPV Vendidos" value={fmtNum(totals.totalSold)} icon="📩" color="pink" />
            <StatCard title="Chatters Activos" value={`${totals.activeChatters}/${displayData.length > 0 ? displayData.length : chatterMembers.length}`} icon="🟢" color="yellow" />
          </div>
        </div>

        {/* ═══ VIEW MODE TOGGLE ═══ */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            📊 Vista Cards
          </button>
          <button
            onClick={() => setViewMode('billing')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              viewMode === 'billing'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            💰 Billing Desglose
          </button>
        </div>

        {/* ═══ CHATTER GRID (Cards view) ═══ */}
        {viewMode === 'cards' && (isLoading && chattersData.length === 0 ? (
          <LoadingSkeleton />
        ) : displayData.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No hay datos disponibles</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filterChatter !== 'all' || filterModel !== 'all' ? 'Prueba ajustando los filtros' : 'Verifica la conexión con OnlyMonster API'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {displayData.map(chatter => (
              <ChatterCard key={chatter.user_id} chatter={chatter} onClick={() => setSelectedChatter(chatter.user_id)} />
            ))}
          </div>
        ))}

        {/* ═══ BILLING MATRIX (Billing view) ═══ */}
        {viewMode === 'billing' && (
          <BillingMatrixView
            chattersData={chattersData}
            omAccounts={omAccounts}
            period={period}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        )}

        {/* ═══ MODAL DETALLE ═══ */}
        {selectedChatter && (
          <ChatterDetailModal chatterId={selectedChatter} chattersData={chattersData} onClose={() => setSelectedChatter(null)} />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// BILLING MATRIX VIEW
// ═══════════════════════════════════════════

interface MatrixCell {
  revenue: number;
  messages: number;
  hasChargebacks: boolean;
}

const BillingMatrixView: React.FC<{
  chattersData: ChatterWithKPIs[];
  omAccounts: OMAccount[];
  period: TimePeriod;
  customStartDate: string;
  customEndDate: string;
}> = ({ chattersData, omAccounts, period, customStartDate, customEndDate }) => {
  const [matrix, setMatrix] = useState<Map<string, Map<string, MatrixCell>>>(new Map());
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });

  // Determine which accounts each chatter works on
  const chatterAccountPairs = useMemo(() => {
    const pairs: { userId: string; userName: string; creatorId: number }[] = [];
    chattersData.forEach(chatter => {
      (chatter.creator_ids || []).forEach(cid => {
        pairs.push({ userId: chatter.user_id, userName: chatter.user_name, creatorId: cid });
      });
    });
    return pairs;
  }, [chattersData]);

  // Unique accounts that appear in current data
  const activeAccountIds = useMemo(() => {
    const ids = new Set<number>();
    chattersData.forEach(c => (c.creator_ids || []).forEach(id => ids.add(id)));
    return Array.from(ids).sort((a, b) => a - b);
  }, [chattersData]);

  const getAccountName = useCallback((id: number) => {
    return omAccounts.find(a => a.id === id)?.name ?? `#${id}`;
  }, [omAccounts]);

  // Fetch per-chatter-per-model breakdown
  const loadMatrix = useCallback(async () => {
    if (chatterAccountPairs.length === 0) return;
    setIsLoadingMatrix(true);
    const { start, end } = getDateRange(period, customStartDate, customEndDate);
    const newMatrix = new Map<string, Map<string, MatrixCell>>();
    const BATCH_SIZE = 10;
    const total = chatterAccountPairs.length;
    setLoadProgress({ done: 0, total });

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = chatterAccountPairs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async ({ userId, creatorId }) => {
          try {
            const data = await chatterMetricsAPI.getChatterMetricsByModel(
              userId, String(creatorId), start, end
            );
            return { userId, creatorId, data };
          } catch {
            return { userId, creatorId, data: null };
          }
        })
      );

      results.forEach(({ userId, creatorId, data }) => {
        if (!newMatrix.has(userId)) newMatrix.set(userId, new Map());
        const row = newMatrix.get(userId)!;
        const cid = String(creatorId);
        if (data) {
          const hasChargebacks = (data.chargebacks?.tips || 0) > 0 ||
            (data.chargebacks?.messages_price || 0) > 0 ||
            (data.chargebacks?.posts_price || 0) > 0;
          row.set(cid, {
            revenue: data.revenue?.total_net ?? 0,
            messages: data.messages?.total ?? 0,
            hasChargebacks
          });
        } else {
          row.set(cid, { revenue: 0, messages: 0, hasChargebacks: false });
        }
      });

      setLoadProgress({ done: Math.min(i + BATCH_SIZE, total), total });
    }

    setMatrix(newMatrix);
    setIsLoadingMatrix(false);
  }, [chatterAccountPairs, period, customStartDate, customEndDate]);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  // Compute totals
  const rowTotals = useMemo(() => {
    const totals = new Map<string, number>();
    matrix.forEach((row, userId) => {
      let sum = 0;
      row.forEach(cell => { sum += cell.revenue; });
      totals.set(userId, sum);
    });
    return totals;
  }, [matrix]);

  const colTotals = useMemo(() => {
    const totals = new Map<string, number>();
    activeAccountIds.forEach(accId => {
      let sum = 0;
      matrix.forEach(row => {
        const cell = row.get(String(accId));
        if (cell) sum += cell.revenue;
      });
      totals.set(String(accId), sum);
    });
    return totals;
  }, [matrix, activeAccountIds]);

  const grandTotal = useMemo(() => {
    let sum = 0;
    rowTotals.forEach(v => { sum += v; });
    return sum;
  }, [rowTotals]);

  // Only show chatters that have at least one creator assigned (filters out non-chatters)
  const activeChatters = useMemo(() => {
    return chattersData.filter(c =>
      (c.creator_ids || []).length > 0 &&
      !EXCLUDED_MEMBER_IDS.includes(Number(c.user_id))
    );
  }, [chattersData]);

  // CSV export
  const exportCSV = useCallback(() => {
    const headers = ['Chatter', ...activeAccountIds.map(id => getAccountName(id)), 'TOTAL'];
    const rows: string[][] = [];
    activeChatters.forEach(chatter => {
      const row = [chatter.user_name];
      activeAccountIds.forEach(accId => {
        const cell = matrix.get(chatter.user_id)?.get(String(accId));
        row.push(cell ? cell.revenue.toFixed(2) : '0.00');
      });
      row.push((rowTotals.get(chatter.user_id) ?? 0).toFixed(2));
      rows.push(row);
    });
    // TOTAL row
    const totalRow = ['TOTAL'];
    activeAccountIds.forEach(accId => {
      totalRow.push((colTotals.get(String(accId)) ?? 0).toFixed(2));
    });
    totalRow.push(grandTotal.toFixed(2));
    rows.push(totalRow);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-desglose-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [matrix, activeChatters, activeAccountIds, rowTotals, colTotals, grandTotal, getAccountName]);

  if (chattersData.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📭</div>
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No hay datos para el desglose</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Carga datos en la vista Cards primero</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with export */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">💰 Billing Desglose por Modelo</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Revenue NET por chatter × cuenta (datos reales OnlyMonster)</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={isLoadingMatrix}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* Loading progress */}
      {isLoadingMatrix && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="animate-spin text-lg">🔄</span>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Cargando desglose... {loadProgress.done}/{loadProgress.total} combinaciones
            </span>
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
            <div
              className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadProgress.total > 0 ? (loadProgress.done / loadProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                Chatter
              </th>
              {activeAccountIds.map(accId => {
                const accColor = ACCOUNT_COLORS[getAccountName(accId)] || ACCOUNT_COLORS['default'] || '';
                return (
                  <th key={accId} className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300 min-w-[120px]">
                    <span className={`${accColor} border text-[10px] px-1.5 py-0.5 rounded font-medium`}>
                      {getAccountName(accId)}
                    </span>
                  </th>
                );
              })}
              <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100 border-l-2 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {activeChatters.map(chatter => {
              const chatterColor = CHATTER_COLORS[chatter.user_name] || CHATTER_COLORS['default'];
              const rowTotal = rowTotals.get(chatter.user_id) ?? 0;
              return (
                <tr key={chatter.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-200 dark:border-gray-700">
                    <span className={`${chatterColor} px-2 py-0.5 rounded-full text-xs font-bold`}>{chatter.user_name}</span>
                  </td>
                  {activeAccountIds.map(accId => {
                    const cell = matrix.get(chatter.user_id)?.get(String(accId));
                    const revenue = cell?.revenue ?? 0;
                    const hasChargebacks = cell?.hasChargebacks ?? false;
                    return (
                      <td key={accId} className="px-4 py-3 text-right">
                        {isLoadingMatrix ? (
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 ml-auto" />
                        ) : revenue > 0 ? (
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {fmtMoney(revenue)}
                            {hasChargebacks && <span className="ml-1 text-red-500" title="Tiene chargebacks">⚠️</span>}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100 border-l-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    {fmtMoney(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 dark:bg-gray-700 font-bold border-t-2 border-gray-300 dark:border-gray-600">
              <td className="px-4 py-3 sticky left-0 bg-gray-200 dark:bg-gray-700 z-10 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                TOTAL
              </td>
              {activeAccountIds.map(accId => (
                <td key={accId} className="px-4 py-3 text-right text-green-700 dark:text-green-300">
                  {fmtMoney(colTotals.get(String(accId)) ?? 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-green-700 dark:text-green-300 border-l-2 border-gray-300 dark:border-gray-600 bg-gray-300 dark:bg-gray-600">
                {fmtMoney(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════

const StatCard: React.FC<{
  title: string; value: string | number; icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'yellow' | 'pink';
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => {
  const cls: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800'
  };
  return (
    <div className={`${cls[color]} border rounded-xl p-3 md:p-4 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium truncate">{title}</p>
          <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 italic truncate">{subtitle}</p>
          )}
        </div>
        <div className="text-2xl ml-2 shrink-0">{icon}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// CHATTER CARD
// ═══════════════════════════════════════════

const ChatterCard: React.FC<{
  chatter: ChatterWithKPIs; onClick: () => void;
}> = ({ chatter, onClick }) => {
  const chatterColor = CHATTER_COLORS[chatter.user_name] || CHATTER_COLORS['default'];
  const ratingColor = RATING_COLORS[chatter.performance_rating] || '';
  const stars = '⭐'.repeat(chatter.performance_rating);

  return (
    <div onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer">

      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`${chatterColor} px-2.5 py-0.5 rounded-full text-xs font-bold`}>{chatter.user_name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">#{chatter.rank}</span>
          </div>
          <span className={`${ratingColor} border px-2 py-0.5 rounded-full text-[10px] font-bold`}>{stars}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {chatter.accounts.length > 0 ? chatter.accounts.map(name => {
            const accColor = ACCOUNT_COLORS[name] || ACCOUNT_COLORS['default'];
            return <span key={name} className={`${accColor} border text-[10px] px-1.5 py-0.5 rounded font-medium`}>{name}</span>;
          }) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Sin cuentas asignadas</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 md:p-4 space-y-2 text-sm">
        {/* Revenue & Reply Time - Main KPIs */}
        <MetricRow icon="💰" label="Revenue NET" value={fmtMoney(chatter.revenue.total_net)} color="text-green-600 dark:text-green-400" bold />
        <MetricRow icon="⏱️" label="Tiempo Respuesta" value={fmtTime(chatter.performance.reply_time_avg_seconds)} color="text-orange-600 dark:text-orange-400" bold />

        <div className="border-t border-gray-100 dark:border-gray-700 pt-2"></div>

        {/* Ventas */}
        <MetricRow icon="📩" label="PPV Vendidos" value={`${fmtNum(chatter.messages.sold)} (${fmtMoney(chatter.revenue.sold_messages_gross)})`} color="text-pink-600 dark:text-pink-400" />
        <MetricRow icon="💎" label="Tips" value={fmtMoney(chatter.revenue.tips_gross)} color="text-yellow-600 dark:text-yellow-400" />
        <MetricRow icon="📈" label="Conversión" value={fmtPct(chatter.performance.conversion_rate)} color="text-indigo-600 dark:text-indigo-400" />

        <div className="border-t border-gray-100 dark:border-gray-700 pt-2"></div>

        {/* Actividad */}
        <MetricRow icon="💬" label="Mensajes Total" value={fmtNum(chatter.messages.total)} color="text-gray-900 dark:text-gray-100" />
        <MetricRow icon="🤖" label="AI Generados" value={fmtNum(chatter.messages.ai_generated)} color="text-cyan-600 dark:text-cyan-400" />
        <MetricRow icon="🖼️" label="Media Env." value={fmtNum(chatter.messages.media)} color="text-purple-600 dark:text-purple-400" />
        <MetricRow icon="👥" label="Fans" value={fmtNum(chatter.fans_count)} color="text-blue-600 dark:text-blue-400" />
        <MetricRow icon="📊" label="Impacto" value={fmtPct(chatter.revenue.impact_percentage)} color="text-gray-700 dark:text-gray-300" />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
        Click para ver detalles →
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// METRIC ROW
// ═══════════════════════════════════════════

const MetricRow: React.FC<{
  icon: string; label: string; value: string;
  color?: string; bold?: boolean;
}> = ({ icon, label, value, color = 'text-gray-900 dark:text-gray-100', bold }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-600 dark:text-gray-400 text-xs">{icon} {label}</span>
    <span className={`${bold ? 'font-bold' : 'font-medium'} ${color} text-sm`}>{value}</span>
  </div>
);

// ═══════════════════════════════════════════
// DETAIL MODAL
// ═══════════════════════════════════════════

const ChatterDetailModal: React.FC<{
  chatterId: string; chattersData: ChatterWithKPIs[]; onClose: () => void;
}> = ({ chatterId, chattersData, onClose }) => {
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const chatter = chattersData.find(c => c.user_id === chatterId) || null;

  useEffect(() => { loadHistory(); }, [chatterId]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await chatterMetricsAPI.getChatterHistory(chatterId, 30);
      if (data && Array.isArray(data)) setHistory(data);
    } catch (e) { console.error('Error loading chatter history:', e); }
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!chatter) return null;

  const chatterColor = CHATTER_COLORS[chatter.user_name] || CHATTER_COLORS['default'];
  const stars = '⭐'.repeat(chatter.performance_rating);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 p-5 flex justify-between items-center border-b border-gray-200 dark:border-gray-600 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">💬 {chatter.user_name}</h2>
              <span className={`${chatterColor} px-2.5 py-0.5 rounded-full text-xs font-bold`}>#{chatter.rank}</span>
              <span className="text-sm">{stars}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {chatter.user_id} · Cuentas: {chatter.accounts.join(', ') || 'Ninguna'}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-2xl bg-white/50 dark:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">

          {/* Revenue KPIs */}
          <div>
            <h3 className="font-bold text-sm mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">💰 Revenue</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Revenue NET" value={fmtMoney(chatter.revenue.total_net)} color="text-green-600 dark:text-green-400" />
              <MiniStat label="Sold Msgs (gross)" value={fmtMoney(chatter.revenue.sold_messages_gross)} color="text-pink-600 dark:text-pink-400" />
              <MiniStat label="Tips (gross)" value={fmtMoney(chatter.revenue.tips_gross)} color="text-yellow-600 dark:text-yellow-400" />
              <MiniStat label="Impacto Equipo" value={fmtPct(chatter.revenue.impact_percentage)} color="text-gray-700 dark:text-gray-300" />
            </div>
          </div>

          {/* Performance KPIs */}
          <div>
            <h3 className="font-bold text-sm mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">⚡ Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="⏱️ Reply Time Avg" value={fmtTime(chatter.performance.reply_time_avg_seconds)} color="text-orange-600 dark:text-orange-400" />
              <MiniStat label="📈 Conversión" value={fmtPct(chatter.performance.conversion_rate)} color="text-indigo-600 dark:text-indigo-400" />
              <MiniStat label="⚡ $/Mensaje" value={fmtMoney(chatter.performance.revenue_per_message)} color="text-blue-600 dark:text-blue-400" />
              <MiniStat label="🔄 Interval Compra" value={fmtTime(chatter.performance.purchase_interval_avg_seconds)} color="text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Messages Breakdown */}
          <div>
            <h3 className="font-bold text-sm mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">💬 Mensajes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Total Enviados" value={fmtNum(chatter.messages.total)} color="text-gray-900 dark:text-gray-100" />
              <MiniStat label="🤖 AI Generados" value={fmtNum(chatter.messages.ai_generated)} color="text-cyan-600 dark:text-cyan-400" />
              <MiniStat label="🖼️ Media" value={fmtNum(chatter.messages.media)} color="text-purple-600 dark:text-purple-400" />
              <MiniStat label="📩 PPV Enviados" value={fmtNum(chatter.messages.paid_sent)} color="text-pink-600 dark:text-pink-400" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <MiniStat label="✅ PPV Vendidos" value={fmtNum(chatter.messages.sold)} color="text-green-600 dark:text-green-400" />
              <MiniStat label="📋 Templates" value={fmtNum(chatter.messages.templates_used)} color="text-gray-600 dark:text-gray-400" />
              <MiniStat label="📝 Palabras" value={fmtNum(chatter.messages.words_count)} color="text-gray-700 dark:text-gray-300" />
              <MiniStat label="🚫 No Enviados" value={fmtNum(chatter.messages.unsent)} color="text-red-500 dark:text-red-400" />
            </div>
          </div>

          {/* Fans & Other */}
          <div>
            <h3 className="font-bold text-sm mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">👥 Fans & Posts</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Fans Contactados" value={fmtNum(chatter.fans_count)} color="text-blue-600 dark:text-blue-400" />
              <MiniStat label="Posts" value={fmtNum(chatter.posts_count)} color="text-gray-700 dark:text-gray-300" />
              <MiniStat label="Posts Eliminados" value={fmtNum(chatter.deleted_posts_count)} color="text-red-500 dark:text-red-400" />
              <MiniStat label="Paid Msgs Price" value={fmtMoney(chatter.revenue.paid_messages_price)} color="text-gray-600 dark:text-gray-400" />
            </div>
          </div>

          {/* Chargebacks */}
          {(chatter.chargebacks.tips > 0 || chatter.chargebacks.messages_price > 0 || chatter.chargebacks.posts_price > 0) && (
            <div>
              <h3 className="font-bold text-sm mb-2 text-red-500 dark:text-red-400 uppercase tracking-wide">⚠️ Chargebacks</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MiniStat label="Tips CB" value={fmtMoney(chatter.chargebacks.tips)} color="text-red-600 dark:text-red-400" />
                <MiniStat label="Msgs CB" value={`${fmtMoney(chatter.chargebacks.messages_price)} (${chatter.chargebacks.messages_count})`} color="text-red-600 dark:text-red-400" />
                <MiniStat label="Posts CB" value={`${fmtMoney(chatter.chargebacks.posts_price)} (${chatter.chargebacks.posts_count})`} color="text-red-600 dark:text-red-400" />
              </div>
            </div>
          )}

          {/* History Chart */}
          {history.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">📊 Revenue Últimos {history.length} Días</h3>
              <HistoryChart data={history} />
            </div>
          )}

          {/* History Table */}
          <div>
            <h3 className="font-bold text-sm mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">📅 Historial Diario</h3>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <span className="animate-spin mr-2">🔄</span> Cargando historial...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No hay datos de historial disponibles</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Ventas (NET)</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Msgs</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Fans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{day.date}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-600 dark:text-green-400">{fmtMoney(day.sales)}</td>
                        <td className="px-4 py-2 text-right text-purple-600 dark:text-purple-400">{day.messages}</td>
                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{day.fans}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// MINI COMPONENTS
// ═══════════════════════════════════════════

const MiniStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
    <p className={`text-base md:text-lg font-bold mt-0.5 ${color}`}>{value}</p>
  </div>
);

const HistoryChart: React.FC<{ data: DailyHistory[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const sorted = [...data].reverse();
  const maxSales = Math.max(...sorted.map(d => d.sales || 0), 1);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-end gap-[2px] h-40">
        {sorted.map((day, i) => {
          const height = ((day.sales || 0) / maxSales) * 100;
          return (
            <div key={i} className="flex-1 group relative"
              title={`${day.date}: ${fmtMoney(day.sales)}`}>
              <div className="bg-purple-500 dark:bg-purple-400 rounded-t-sm hover:bg-purple-600 dark:hover:bg-purple-300 transition-colors mx-[0.5px]"
                style={{ height: `${Math.max(height, 2)}%` }} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{fmtMoney(day.sales)}</div>
                  <div className="opacity-70">{day.date}</div>
                  <div className="opacity-70">{day.messages} msgs · {day.fans} fans</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-500 dark:text-gray-400">
        <span>{sorted[0]?.date || ''}</span>
        <span>{sorted[sorted.length - 1]?.date || ''}</span>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
    {[1, 2, 3, 4, 5, 6, 7].map(i => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-16 bg-gray-200 dark:bg-gray-700"></div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
);

export default DashboardChatters;
