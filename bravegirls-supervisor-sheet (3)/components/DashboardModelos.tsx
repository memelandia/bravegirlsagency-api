import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onlyMonsterAPI } from '../api-service';
import { useOMConfig } from '../hooks/useOMConfig';
import { ModelStats, DailyBilling, ACCOUNT_COLORS, TimePeriod } from '../types';

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
}

// ═══════════════════════════════════════════

type SortOption = 'revenue' | 'fans' | 'projection' | 'name';

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

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════

const DashboardModelos: React.FC<Props> = ({ archivedData, isReadOnly = false }) => {
  const { accounts: omAccounts, isLoading: configLoading } = useOMConfig();
  const [modelsData, setModelsData] = useState<ModelStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Filtros
  const [period, setPeriod] = useState<TimePeriod>(TimePeriod.THIS_MONTH);
  const [filterModel, setFilterModel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('revenue');

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

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
    const savedStart = localStorage.getItem('modelos_customStartDate');
    const savedEnd = localStorage.getItem('modelos_customEndDate');
    if (savedStart && savedEnd) {
      setCustomStartDate(savedStart);
      setCustomEndDate(savedEnd);
    }
  }, []);

  // Save custom dates
  useEffect(() => {
    if (customStartDate && customEndDate) {
      localStorage.setItem('modelos_customStartDate', customStartDate);
      localStorage.setItem('modelos_customEndDate', customEndDate);
    }
  }, [customStartDate, customEndDate]);

  // ─── DATA LOADING ───
  const loadModelsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange(period, customStartDate, customEndDate);
      console.log(`💎 [MODELOS] Cargando datos período: ${start} → ${end}`);
      
      const data = await onlyMonsterAPI.getAllModelsStats(start, end);
      if (data && Array.isArray(data)) {
        setModelsData(data);
        setLastUpdate(new Date());
      } else {
        setError('No se pudieron cargar los datos. Usando caché si está disponible.');
      }
    } catch (e) {
      setError('Error de conexión con la API.');
      console.error('Load error:', e);
    }
    setIsLoading(false);
  }, [period, customStartDate, customEndDate]);

  useEffect(() => { loadModelsData(); }, [loadModelsData]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(loadModelsData, 300000);
    return () => clearInterval(interval);
  }, [loadModelsData]);

  // ─── FILTERED & SORTED DATA ───
  const displayData = useMemo(() => {
    let result = [...modelsData];

    if (filterModel !== 'all') {
      result = result.filter(m => m.id === filterModel);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return (b.earningsThisMonth || 0) - (a.earningsThisMonth || 0);
        case 'fans': return (b.activeSubscribers || 0) - (a.activeSubscribers || 0);
        case 'projection': return (b.projection || 0) - (a.projection || 0);
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return result;
  }, [modelsData, filterModel, sortBy]);

  // CALCULAR TOTALES (basados en datos filtrados)
  const totals = useMemo(() => {
    const realModels = displayData.filter(m => !m.isPlaceholder);
    return {
      totalEarnings: realModels.reduce((sum, m) => sum + (m.earningsThisMonth || 0), 0),
      totalEarningsToday: realModels.reduce((sum, m) => sum + (m.earningsToday || 0), 0),
      totalNewSubsToday: realModels.reduce((sum, m) => sum + (m.newSubscribersToday || 0), 0),
      totalProjection: realModels.reduce((sum, m) => sum + (m.projection || 0), 0),
      totalFans: realModels.reduce((sum, m) => sum + (m.activeSubscribers || 0), 0),
      totalTransactions: realModels.reduce((sum, m) => sum + (m.transactionCount || 0), 0),
    };
  }, [displayData]);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        
        {/* ═══ HEADER ═══ */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                💎 Dashboard de Modelos
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Última act: {lastUpdate.toLocaleTimeString('es-ES')} · Auto-refresh 5 min · Datos reales de OnlyMonster · Revenue NET (-20% OF)
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
              onClick={loadModelsData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
            >
              <span className={isLoading ? 'animate-spin inline-block' : ''}>🔄</span>
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* ═══ FILTROS ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
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
                        loadModelsData();
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
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Modelo</label>
              <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="all">Todas</option>
                {omAccounts.map(a => <option key={a.platform_account_id} value={a.platform_account_id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">Ordenar por</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                <option value="revenue">💰 Revenue</option>
                <option value="fans">👥 Fans</option>
                <option value="projection">🎯 Proyección</option>
                <option value="name">🔤 Nombre</option>
              </select>
            </div>
          </div>

          {/* ═══ FILTROS ACTIVOS INDICATOR ═══ */}
          {(filterModel !== 'all' || period === TimePeriod.CUSTOM) && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  🔍 Filtros activos:
                </span>
                {filterModel !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 rounded-full text-xs font-medium text-purple-800 dark:text-purple-200">
                    💎 {omAccounts.find(a => a.platform_account_id === filterModel)?.name || 'Modelo'}
                    <button onClick={() => setFilterModel('all')} className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors">✕</button>
                  </span>
                )}
                {period === TimePeriod.CUSTOM && customStartDate && customEndDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-full text-xs font-medium text-orange-800 dark:text-orange-200">
                    📅 {formatDateRange(customStartDate, customEndDate)}
                    <button onClick={() => { setPeriod(TimePeriod.THIS_MONTH); setShowCustomDatePicker(false); }} className="hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full p-0.5 transition-colors">✕</button>
                  </span>
                )}
                <button
                  onClick={() => { setFilterModel('all'); setPeriod(TimePeriod.THIS_MONTH); setShowCustomDatePicker(false); }}
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
              title={period === TimePeriod.TODAY ? 'Facturación Hoy' : 'Facturación Período'} 
              value={fmtMoney(period === TimePeriod.TODAY ? totals.totalEarningsToday : totals.totalEarnings)} 
              icon="💰" color="green" 
            />
            <StatCard 
              title="Fact. Hoy" 
              value={fmtMoney(totals.totalEarningsToday)} 
              icon="📊" color="blue" 
            />
            <StatCard title="Fans Activos" value={totals.totalFans.toLocaleString()} icon="👥" color="purple" />
            <StatCard title="Nuevos Fans Hoy" value={`+${totals.totalNewSubsToday}`} icon="🆕" color="orange" />
            <StatCard title="Proyección Mes" value={fmtMoney(totals.totalProjection)} icon="🎯" color="yellow" />
            <StatCard title="Transacciones" value={totals.totalTransactions.toLocaleString()} icon="🧾" color="pink" />
          </div>
        </div>

        {/* ═══ GRID DE MODELOS ═══ */}
        {isLoading && modelsData.length === 0 ? (
          <LoadingSkeleton />
        ) : displayData.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No hay datos disponibles</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filterModel !== 'all' ? 'Prueba ajustando los filtros' : 'Verifica la conexión con OnlyMonster API'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {displayData.map(model => (
              <ModelCard 
                key={model.id}
                model={model}
                onClick={() => !model.isPlaceholder && setSelectedModel(model.id)}
                periodLabel={PERIOD_LABELS[period]}
              />
            ))}
          </div>
        )}

        {/* MODAL DE DETALLE */}
        {selectedModel && (
          <ModelDetailModal 
            modelId={selectedModel}
            modelsData={modelsData}
            onClose={() => setSelectedModel(null)}
          />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'yellow' | 'pink';
}> = ({ title, value, icon, color }) => {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-3 md:p-4 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium truncate">{title}</p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
        </div>
        <div className="text-2xl md:text-3xl ml-2 shrink-0">{icon}</div>
      </div>
    </div>
  );
};

const ModelCard: React.FC<{
  model: ModelStats;
  onClick: () => void;
  periodLabel: string;
}> = ({ model, onClick, periodLabel }) => {
  const accountColor = ACCOUNT_COLORS[model.name] || ACCOUNT_COLORS['default'];

  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 overflow-hidden ${
        model.isPlaceholder ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Header */}
      <div className={`${accountColor} p-3 md:p-4 border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base md:text-lg">{model.name}</h3>
            <p className="text-xs opacity-80">{model.onlyFansUsername}</p>
          </div>
          <div className="text-xl md:text-2xl">
            {model.isPlaceholder ? '🔒' : '💎'}
          </div>
        </div>
        {model.isPlaceholder && (
          <p className="text-[10px] mt-1 opacity-60 font-medium">ID de OnlyMonster pendiente</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="p-3 md:p-4 space-y-2.5 text-sm">
        {/* Facturación */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">💰 Hoy</span>
          <span className="font-bold text-green-600 dark:text-green-400">
            ${(model.earningsToday || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">📊 {periodLabel}</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            ${(model.earningsThisMonth || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">🎯 Proyección</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            ${(model.projection || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5"></div>

        {/* Desglose */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">🔄 Subs</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            ${(model.subscriptionRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">📩 PPV/Tips</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            ${((model.ppvRevenue || 0) + (model.tipRevenue || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5"></div>

        {/* Fans */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">👥 Fans Mes</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">
            {(model.activeSubscribers || 0).toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">🆕 Fans Hoy</span>
          <span className="font-bold text-orange-600 dark:text-orange-400">
            +{model.newSubscribersToday || 0}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">💬 Msgs vendidos</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {model.messagesSent || 0} (avg ${(model.avgMessagePrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})})
          </span>
        </div>
      </div>

      {/* Footer */}
      {!model.isPlaceholder && (
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
          Click para ver detalles →
        </div>
      )}
    </div>
  );
};

const ModelDetailModal: React.FC<{
  modelId: string;
  modelsData: ModelStats[];
  onClose: () => void;
}> = ({ modelId, modelsData, onClose }) => {
  const [billingHistory, setBillingHistory] = useState<DailyBilling[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(true);

  // Buscar modelo en los datos ya cargados
  const modelData = modelsData.find(m => m.id === modelId) || null;

  useEffect(() => {
    loadBillingHistory();
  }, [modelId]);

  const loadBillingHistory = async () => {
    setIsLoadingBilling(true);
    const history = await onlyMonsterAPI.getModelBillingHistory(modelId, 30);
    if (history && Array.isArray(history)) {
      setBillingHistory(history);
    }
    setIsLoadingBilling(false);
  };

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!modelData) return null;

  const accountColor = ACCOUNT_COLORS[modelData.name] || ACCOUNT_COLORS['default'];

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className={`${accountColor} p-5 flex justify-between items-center border-b shrink-0`}>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              💎 {modelData.name}
            </h2>
            <p className="text-sm opacity-80">
              {modelData.onlyFansUsername} · ID: {modelData.onlyMonsterId}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-2xl bg-white/30 dark:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Stats Summary Grid - Revenue */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="💰 Hoy (NET)" value={`$${(modelData.earningsToday || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-green-600 dark:text-green-400" />
            <MiniStat label="📊 Mes (NET)" value={`$${(modelData.earningsThisMonth || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-blue-600 dark:text-blue-400" />
            <MiniStat label="📅 Semana (NET)" value={`$${(modelData.earningsThisWeek || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-indigo-600 dark:text-indigo-400" />
            <MiniStat label="🎯 Proyección Mes" value={`$${(modelData.projection || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-orange-600 dark:text-orange-400" />
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="🔄 Suscripciones" value={`$${(modelData.subscriptionRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-purple-600 dark:text-purple-400" />
            <MiniStat label="📩 PPV" value={`$${(modelData.ppvRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-pink-600 dark:text-pink-400" />
            <MiniStat label="💎 Tips" value={`$${(modelData.tipRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-yellow-600 dark:text-yellow-400" />
            <MiniStat label="💬 Avg Msg Price" value={`$${(modelData.avgMessagePrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="text-gray-900 dark:text-gray-100" />
          </div>

          {/* Fans & Activity */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="👥 Fans Mes" value={(modelData.activeSubscribers || 0).toLocaleString()} color="text-purple-600 dark:text-purple-400" />
            <MiniStat label="🆕 Nuevos Hoy" value={`+${modelData.newSubscribersToday || 0}`} color="text-green-600 dark:text-green-400" />
            <MiniStat label="📨 Msgs Enviados" value={(modelData.messagesSent || 0).toLocaleString()} color="text-gray-900 dark:text-gray-100" />
            <MiniStat label="📊 Transacciones" value={(modelData.transactionCount || 0).toLocaleString()} color="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Barra visual de facturación */}
          {billingHistory.length > 0 && (
            <div>
              <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-gray-100">
                📊 Facturación Últimos {billingHistory.length} Días
              </h3>
              <BillingChart data={billingHistory} />
            </div>
          )}

          {/* Tabla de histórico */}
          <div>
            <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-gray-100">
              📅 Histórico Diario
            </h3>
            
            {isLoadingBilling ? (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <span className="animate-spin mr-2">🔄</span> Cargando histórico...
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                No hay datos de facturación disponibles
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Fact. NET</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Fans</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{day.date}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-600 dark:text-green-400">
                          ${(day.earnings || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-2 text-right text-purple-600 dark:text-purple-400">
                          {day.newSubs || 0}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                          {(day.activeSubs || 0).toLocaleString()}
                        </td>
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
// MINI COMPONENTES
// ═══════════════════════════════════════════

const MiniStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
    <p className={`text-base md:text-lg font-bold mt-0.5 ${color}`}>{value}</p>
  </div>
);

const BillingChart: React.FC<{ data: DailyBilling[] }> = ({ data }) => {
  if (data.length === 0) return null;
  
  const maxEarnings = Math.max(...data.map(d => d.earnings || 0), 1);
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-end gap-[2px] h-40">
        {data.map((day, i) => {
          const height = ((day.earnings || 0) / maxEarnings) * 100;
          return (
            <div
              key={i}
              className="flex-1 group relative"
              title={`${day.date}: $${(day.earnings || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            >
              <div
                className="bg-blue-500 dark:bg-blue-400 rounded-t-sm hover:bg-blue-600 dark:hover:bg-blue-300 transition-colors mx-[0.5px]"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  <div className="font-bold">${(day.earnings || 0).toLocaleString()}</div>
                  <div className="opacity-70">{day.date}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-500 dark:text-gray-400">
        <span>{data[0]?.date || ''}</span>
        <span>{data[data.length - 1]?.date || ''}</span>
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
        </div>
      </div>
    ))}
  </div>
);

export default DashboardModelos;
