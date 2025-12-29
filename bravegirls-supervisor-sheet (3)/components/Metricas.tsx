
import React, { useMemo, useState, useEffect } from 'react';
import { 
  CHATTERS, 
  ACCOUNTS, 
  WeeklySupervisionRow, 
  Status, 
  CHECKLIST_ROWS,
  ACCOUNT_COLORS,
  CHATTER_COLORS,
  ErrorLogEntry,
  ErrorStatus,
  WEEKS
} from '../types';
import { supervisionAPI } from '../api-service';

interface Props {
  archivedData?: any;
}

interface ChatterPerformance {
  name: string;
  totalBilling: number;
  totalNewFans: number;
  qualityScore: number;
  errorCount: number;
  postingCompliance: number;
  storiesCompliance: number;
  avgResponseTime: number;
}

interface AccountHealth {
  name: string;
  whales: number;
  loyalty: number;
  totalBilling: number;
}

const Metricas: React.FC<Props> = ({ archivedData }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklySupervisionRow[]>([]);
  const [checklistData, setChecklistData] = useState<Record<string, Status>>({});
  const [vipData, setVipData] = useState<any[]>([]);
  const [errorData, setErrorData] = useState<ErrorLogEntry[]>([]);
  
  // Filters & State
  const [filterWeek, setFilterWeek] = useState<string>(''); // '' = All Month
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (archivedData) {
        setWeeklyData(archivedData.weekly || []);
        setChecklistData(archivedData.checklist || {});
        setVipData(archivedData.vip || []);
        setErrorData(archivedData.errors || []);
    } else {
        const loadAllData = async () => {
            try {
                // 1. Weekly Data
                const weeklyData = await supervisionAPI.getSemanal();
                setWeeklyData(weeklyData);

                // 2. Checklist Data
                const checklistData = await supervisionAPI.getChecklist();
                setChecklistData(checklistData);

                // 3. VIP Data (Fans + Status)
                const vipFansData = await supervisionAPI.getVipFans();
                setVipData(vipFansData);

                // 4. Errors Data
                const errorsData = await supervisionAPI.getErrores();
                setErrorData(errorsData);

            } catch (err) {
                console.error("Error loading metrics data from API", err);
                // Fallback to localStorage
                try {
                    const w = localStorage.getItem('supervision_semanal_data');
                    if (w) setWeeklyData(JSON.parse(w));

                    const c = localStorage.getItem('checklist_mes_data');
                    if (c) setChecklistData(JSON.parse(c));

                    const v = localStorage.getItem('vip_fans_list');
                    if (v) setVipData(JSON.parse(v));

                    const e = localStorage.getItem('registro_errores_data');
                    if (e) setErrorData(JSON.parse(e));
                } catch (e) { console.error(e); }
            }
        };
        loadAllData();
    }
  }, [archivedData]);

  const metrics = useMemo(() => {
    // 0. Filter Data based on Week Selection
    const activeWeeklyData = filterWeek 
        ? weeklyData.filter(row => row.semana === filterWeek)
        : weeklyData;

    // 1. Initialize Stats
    const chatterStats: Record<string, ChatterPerformance> = {};
    CHATTERS.forEach(c => chatterStats[c] = { 
        name: c, 
        totalBilling: 0, 
        totalNewFans: 0, 
        qualityScore: 100, // Default start
        errorCount: 0,
        postingCompliance: 0,
        storiesCompliance: 0,
        avgResponseTime: 0
    });

    const responseTimeAccumulator: Record<string, { total: number, count: number }> = {};
    const complianceAccumulator: Record<string, { postYes: number, postTotal: number, storyYes: number, storyTotal: number }> = {};

    // 2. Process Weekly Data (Filtered)
    activeWeeklyData.forEach(row => {
      const billing = parseFloat(row.facturacion.replace(/[^0-9.-]+/g,"")) || 0;
      const respTime = parseFloat(row.tiempoRespuesta.replace(/[^0-9.]/g, ""));

      if (chatterStats[row.chatter]) {
        chatterStats[row.chatter].totalBilling += billing;

        if (!isNaN(respTime) && respTime > 0) {
            if (!responseTimeAccumulator[row.chatter]) responseTimeAccumulator[row.chatter] = { total: 0, count: 0 };
            responseTimeAccumulator[row.chatter].total += respTime;
            responseTimeAccumulator[row.chatter].count += 1;
        }

        if (!complianceAccumulator[row.chatter]) complianceAccumulator[row.chatter] = { postYes: 0, postTotal: 0, storyYes: 0, storyTotal: 0 };
        
        if (row.posteos) {
            complianceAccumulator[row.chatter].postTotal++;
            if (row.posteos === 'Sí') complianceAccumulator[row.chatter].postYes++;
        }
        if (row.historias) {
            complianceAccumulator[row.chatter].storyTotal++;
            if (row.historias === 'Sí') complianceAccumulator[row.chatter].storyYes++;
        }
      }
    });

    // 3. Chatter Averages
    Object.keys(chatterStats).forEach(c => {
        const timeData = responseTimeAccumulator[c];
        if (timeData && timeData.count > 0) {
            chatterStats[c].avgResponseTime = Math.round(timeData.total / timeData.count);
        }

        const compData = complianceAccumulator[c];
        if (compData) {
            chatterStats[c].postingCompliance = compData.postTotal > 0 ? Math.round((compData.postYes / compData.postTotal) * 100) : 0;
            chatterStats[c].storiesCompliance = compData.storyTotal > 0 ? Math.round((compData.storyYes / compData.storyTotal) * 100) : 0;
        }
    });

    // 4. Quality Score (Always Monthly Context - Checklist is daily)
    // Note: Filtering checklist by "Week 1" logic is complex without precise dates. 
    // We keep Quality Score as a global monthly indicator for now, or users can assume it reflects the current state.
    const checklistEntries = Object.entries(checklistData);
    const chatterScoresRaw: Record<string, number[]> = {};

    CHECKLIST_ROWS.forEach((row, idx) => {
        if(!chatterScoresRaw[row.chatter]) chatterScoresRaw[row.chatter] = [];
        const rowEntries = checklistEntries.filter(([key]) => key.startsWith(`${idx}-`));
        rowEntries.forEach(([_, status]) => {
            let val = 100;
            if (status === Status.OK) val = 100;
            if (status === Status.OBS) val = 70;
            if (status === Status.CRIT) val = 0;
            if (status !== Status.EMPTY && status !== Status.NA) {
                chatterScoresRaw[row.chatter].push(val);
            }
        });
    });

    Object.keys(chatterStats).forEach(chatter => {
        const scores = chatterScoresRaw[chatter] || [];
        if (scores.length > 0) {
            const sum = scores.reduce((a, b) => a + b, 0);
            chatterStats[chatter].qualityScore = Math.round(sum / scores.length);
        }
    });

    // 5. Count Errors (Always Cumulative for now)
    errorData.forEach(err => {
        if (err.chatter && chatterStats[err.chatter] && err.estado === ErrorStatus.ABIERTO) {
            chatterStats[err.chatter].errorCount += 1;
        }
    });

    // 6. Account Stats (Filtered by Week)
    const accountStats: Record<string, AccountHealth> = {};
    ACCOUNTS.forEach(a => accountStats[a] = { name: a, whales: 0, loyalty: 0, totalBilling: 0 });
    
    // VIP counts are static (current state), but Billing is filtered
    vipData.forEach((fan: any) => {
        if (fan.account && accountStats[fan.account]) {
            if (fan.type === 'WHALE') accountStats[fan.account].whales += 1;
            else accountStats[fan.account].loyalty += 1;
        }
    });

    let globalFans = 0;
    activeWeeklyData.forEach(row => {
        const billing = parseFloat(row.facturacion.replace(/[^0-9.-]+/g,"")) || 0;
        const fans = parseFloat(row.nuevosFans.replace(/[^0-9.-]+/g,"")) || 0;
        globalFans += fans;

        if (accountStats[row.cuenta]) {
            accountStats[row.cuenta].totalBilling += billing;
        }
    });

    const sortedChatters = Object.values(chatterStats).sort((a,b) => b.totalBilling - a.totalBilling);
    const sortedAccounts = Object.values(accountStats).sort((a,b) => b.totalBilling - a.totalBilling);

    // Projections only make sense if viewing ALL data
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const totalRevenue = Object.values(chatterStats).reduce((acc, curr) => acc + curr.totalBilling, 0);
    
    // Only calculate projection if No Filter is active
    const projection = (!filterWeek && dayOfMonth > 0) ? (totalRevenue / dayOfMonth) * daysInMonth : 0;

    return {
        chatters: sortedChatters,
        accounts: sortedAccounts,
        totalRevenue,
        projectedRevenue: projection,
        totalFans: globalFans,
        avgQuality: Object.values(chatterStats).reduce((acc, curr) => acc + curr.qualityScore, 0) / CHATTERS.length
    };
  }, [weeklyData, checklistData, vipData, errorData, filterWeek]);

  const maxBilling = Math.max(...metrics.chatters.map(c => c.totalBilling), 1000);
  const topBillerName = metrics.chatters[0]?.name;
  const topQualityName = [...metrics.chatters].sort((a,b) => b.qualityScore - a.qualityScore)[0]?.name;

  // 📢 COPY TO CLIPBOARD FUNCTION
  const copyReportToClipboard = () => {
    const periodLabel = filterWeek ? filterWeek.toUpperCase() : 'MES ACTUAL';
    const today = new Date().toLocaleDateString();
    
    let text = `📊 *REPORTE DE RESULTADOS | ${periodLabel}*\n`;
    text += `📅 Fecha de corte: ${today}\n\n`;

    text += `💰 *FACTURACIÓN TOTAL:* $${metrics.totalRevenue.toLocaleString()}\n`;
    if (metrics.projectedRevenue > 0) {
        text += `🔮 *Proyección:* $${Math.round(metrics.projectedRevenue).toLocaleString()}\n`;
    }
    text += `👥 *Nuevos Fans:* ${metrics.totalFans}\n`;
    text += `⭐ *Calidad Operativa:* ${Math.round(metrics.avgQuality)}%\n\n`;
    
    text += `🏆 *TOP PERFORMANCES*\n`;
    text += `🥇 Facturación: ${topBillerName} ($${metrics.chatters[0]?.totalBilling.toLocaleString()})\n`;
    text += `✨ Calidad: ${topQualityName} (${Math.round([...metrics.chatters].sort((a,b)=>b.qualityScore-a.qualityScore)[0]?.qualityScore || 0)}%)\n\n`;
    
    text += `📉 *DETALLE POR CHATTER*\n`;
    metrics.chatters.forEach(c => {
        text += `▪️ *${c.name}*: $${c.totalBilling.toLocaleString()} | Calidad: ${c.qualityScore}%\n`;
    });

    text += `\n🚨 *Incidencias Abiertas:* ${errorData.filter(e => e.estado === ErrorStatus.ABIERTO).length}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 overflow-y-auto p-6 transition-colors flex flex-col">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 relative w-full flex-1">
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Métricas de Rendimiento
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {filterWeek ? `Visualizando datos de: ${filterWeek}` : 'Visualizando acumulado del Mes'}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Week Filter */}
                <div className="relative">
                    <select 
                        value={filterWeek}
                        onChange={(e) => setFilterWeek(e.target.value)}
                        className="appearance-none bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-8 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="">📅 Todo el Mes</option>
                        {WEEKS.map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>

                {/* Copy Button */}
                <button 
                    onClick={copyReportToClipboard}
                    className={`
                        flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-all
                        ${copied 
                            ? 'bg-green-500 text-white transform scale-105' 
                            : 'bg-[#111827] dark:bg-black text-white hover:bg-gray-800'}
                    `}
                >
                    <span>{copied ? '✅' : '📋'}</span>
                    {copied ? '¡Copiado!' : 'Copiar Reporte'}
                </button>
            </div>
        </div>

        {/* HEADER KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Facturacion & Proyeccion */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between group hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start">
                    <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Facturación {filterWeek ? '(Semanal)' : '(Total)'}</div>
                    <span className="text-xl">💰</span>
                </div>
                <div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                        ${metrics.totalRevenue.toLocaleString()}
                    </div>
                    {!filterWeek && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded">
                                Proyección: ${Math.round(metrics.projectedRevenue).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Nuevos Fans {filterWeek ? '(Semanal)' : ''}</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                    {metrics.totalFans}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-2">Suscripciones Nuevas</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Calidad Operativa</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                    {Math.round(metrics.avgQuality)}%
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={`h-full ${metrics.avgQuality > 90 ? 'bg-green-500' : metrics.avgQuality > 75 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{ width: `${metrics.avgQuality}%` }}
                    ></div>
                </div>
            </div>

             <div className="bg-[#111827] dark:bg-black p-6 rounded-2xl shadow-lg border border-gray-900 text-white flex flex-col justify-between">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Incidencias</div>
                <div className="flex justify-between items-end">
                    <div className="text-3xl font-black">
                        {errorData.filter(e => e.estado === ErrorStatus.ABIERTO).length}
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-400">Total Histórico</div>
                        <div className="font-bold">{errorData.length}</div>
                    </div>
                </div>
                <div className="text-xs text-red-400 font-bold mt-2">Pendientes de solución</div>
            </div>
        </div>

        {/* MAIN SECTION: CHATTER LEADERBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* LEFT: FINANCIAL & PERFORMANCE */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <span>🏆</span> Rendimiento por Chatter
                </h3>
                
                <div className="space-y-6">
                    {metrics.chatters.map((chatter, idx) => {
                        const billingPercent = maxBilling > 0 ? (chatter.totalBilling / maxBilling) * 100 : 0;
                        const bgColor = CHATTER_COLORS[chatter.name] || 'bg-gray-100 dark:bg-gray-700';
                        const isTopBiller = chatter.name === topBillerName;
                        const isTopQuality = chatter.name === topQualityName;

                        return (
                            <div key={chatter.name} className="relative bg-gray-50/50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-colors">
                                
                                {/* Header: Name & Money */}
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${bgColor}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                                {chatter.name}
                                                {isTopBiller && <span title="Mayor Facturación">👑</span>}
                                                {isTopQuality && <span title="Mejor Calidad">⭐</span>}
                                            </span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                                                {chatter.errorCount === 0 ? 'Sin Errores' : `${chatter.errorCount} Errores`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-black text-gray-900 dark:text-white block text-lg">
                                            ${chatter.totalBilling.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Billing Bar */}
                                <div className="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full overflow-hidden mb-3">
                                    <div 
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                                        style={{ width: `${billingPercent}%` }}
                                    ></div>
                                </div>

                                {/* Detailed Stats Grid (Reduced: Removed Fans) */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white dark:bg-gray-800 rounded p-1 border border-gray-100 dark:border-gray-600">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Posts</div>
                                        <div className={`font-bold ${chatter.postingCompliance < 80 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                            {chatter.postingCompliance}%
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-1 border border-gray-100 dark:border-gray-600">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Stories</div>
                                        <div className={`font-bold ${chatter.storiesCompliance < 80 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                            {chatter.storiesCompliance}%
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-1 border border-gray-100 dark:border-gray-600">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Resp.</div>
                                        <div className="font-bold text-gray-800 dark:text-gray-200">
                                            {chatter.avgResponseTime > 0 ? `${chatter.avgResponseTime}m` : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: QUALITY & ACCOUNTS */}
            <div className="space-y-8">
                
                {/* QUALITY SCORES */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span>🎯</span> Calidad Operativa (Checklist Mensual)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {metrics.chatters.map(chatter => (
                            <div key={chatter.name} className="border border-gray-100 dark:border-gray-600 rounded-xl p-3 flex items-center justify-between">
                                <span className="font-medium text-sm text-gray-600 dark:text-gray-300">{chatter.name}</span>
                                <div className={`
                                    px-2 py-1 rounded text-xs font-bold min-w-[3rem] text-center
                                    ${chatter.qualityScore >= 95 ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 
                                      chatter.qualityScore >= 80 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' : 
                                      'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'}
                                `}>
                                    {chatter.qualityScore}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACCOUNT HEALTH */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span>💎</span> Salud de Cuentas (VIPs)
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                    <th className="pb-2">Cuenta</th>
                                    <th className="pb-2 text-center">🐳 Ballenas</th>
                                    <th className="pb-2 text-center">🌱 Fidelizar</th>
                                    <th className="pb-2 text-right">Facturación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {metrics.accounts.map(acc => (
                                    <tr key={acc.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 font-bold text-gray-700 dark:text-gray-300">
                                            <span className={`px-2 py-0.5 rounded text-[10px] border mr-2 ${ACCOUNT_COLORS[acc.name]}`}>
                                                {acc.name}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center font-bold text-blue-900 dark:text-blue-300">{acc.whales}</td>
                                        <td className="py-3 text-center text-green-700 dark:text-green-400">{acc.loyalty}</td>
                                        <td className="py-3 text-right font-mono text-gray-600 dark:text-gray-400">${acc.totalBilling.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default Metricas;
