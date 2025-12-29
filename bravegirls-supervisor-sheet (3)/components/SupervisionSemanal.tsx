import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WeeklySupervisionRow, WEEKS, GoalStatus, GOAL_COLORS, CHECKLIST_ROWS, CHATTER_COLORS, ACCOUNT_COLORS, CHATTERS, ACCOUNTS } from '../types';
import { supervisionAPI } from '../api-service';

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SupervisionSemanal: React.FC<Props> = ({ archivedData, isReadOnly = false, onShowToast }) => {
  const [rows, setRows] = useState<WeeklySupervisionRow[]>([]);
  const [filterChatter, setFilterChatter] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);
  const isFirstRun = useRef(true);

  // Initialize Data
  useEffect(() => {
    const loadData = async () => {
      if (archivedData && archivedData.weekly) {
        setRows(archivedData.weekly);
        setIsLoading(false);
      } else {
        // Initialize empty rows first (before API call)
        const initialRows: WeeklySupervisionRow[] = [];
        WEEKS.forEach((weekName, index) => {
          CHECKLIST_ROWS.forEach(pair => {
            initialRows.push({
              id: `${weekName}-${pair.chatter}-${pair.cuenta}-${Date.now()}-${Math.random()}`,
              mes: '',
              semana: weekName,
              weekIndex: index,
              chatter: pair.chatter,
              cuenta: pair.cuenta,
              facturacion: '',
              nuevosFans: '',
              metaSemanal: '',
              metaMensual: '',
              metaFacturacion: '',
              facturacionMensualObjetivo: '',
              posteos: '',
              historias: '',
              pendientes: '',
              resueltos: '',
              impacto: '',
              tiempoRespuesta: '',
              estadoObjetivo: GoalStatus.EMPTY
            });
          });
        });
        
        try {
          const result = await supervisionAPI.getSemanal();
          if (result && result.length > 0) {
            // If data exists in backend, use it
            setRows(result);
          } else {
            // Use initial empty rows
            setRows(initialRows);
          }
        } catch (error) {
          console.error('Error loading from API, using localStorage or initial rows:', error);
          const savedData = localStorage.getItem('supervision_semanal_data');
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setRows(parsed.length > 0 ? parsed : initialRows);
            } catch (e) {
              console.error("Failed to parse weekly data", e);
              setRows(initialRows);
            }
          } else {
            setRows(initialRows);
          }
        } finally {
          setIsLoading(false);
        }
      }
      initialized.current = true;
    };
    loadData();
  }, [archivedData]);

  // Persistence
  useEffect(() => {
    const saveData = async () => {
      if (isLoading) return;

      if (isFirstRun.current) {
        isFirstRun.current = false;
        return;
      }

      if (initialized.current && !isReadOnly) {
        const success = await supervisionAPI.saveSemanal(rows);
        if (!success && onShowToast) onShowToast('Error al guardar datos semanales', 'error');
      }
    };
    saveData();
  }, [rows, isReadOnly, isLoading]);

  // Calculations & Filtering
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchChatter = filterChatter ? row.chatter === filterChatter : true;
      const matchAccount = filterAccount ? row.cuenta === filterAccount : true;
      const matchWeek = filterWeek ? row.semana === filterWeek : true;
      return matchChatter && matchAccount && matchWeek;
    });
  }, [rows, filterChatter, filterAccount, filterWeek]);

  const summary = useMemo(() => {
    let totalFacturacion = 0;
    let totalFans = 0;
    let completedGoals = 0;

    filteredRows.forEach(row => {
      const fact = parseFloat(row.facturacion.replace(/[^0-9.-]+/g,""));
      const fans = parseFloat(row.nuevosFans.replace(/[^0-9.-]+/g,""));
      
      if (!isNaN(fact)) totalFacturacion += fact;
      if (!isNaN(fans)) totalFans += fans;
      if (row.estadoObjetivo === GoalStatus.CUMPLIDO) completedGoals++;
    });

    return { totalFacturacion, totalFans, completedGoals };
  }, [filteredRows]);

  // --- HELPER FUNCTIONS ---
  
  const formatCurrency = (value: string) => {
    if (!value) return '';
    const number = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(number)) return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
  };

  const handleCurrencyBlur = (id: string, field: keyof WeeklySupervisionRow) => {
    if (isReadOnly) return;
    setRows(prev => prev.map(r => {
        if (r.id === id) {
           const rawVal = r[field] as string;
           return { ...r, [field]: formatCurrency(rawVal) };
        }
        return r;
    }));
  };

  const updateRow = (id: string, field: keyof WeeklySupervisionRow, value: any) => {
    if (isReadOnly) return;
    
    setRows(prev => {
      const targetRow = prev.find(r => r.id === id);
      if (!targetRow) return prev;

      // Logic for Fans Syncing (Same Account, Same Week)
      if (field === 'nuevosFans') {
        return prev.map(r => {
          if (r.semana === targetRow.semana && r.cuenta === targetRow.cuenta) {
            return { ...r, [field]: value };
          }
          return r;
        });
      }

      // Logic for Meta Facturacion Calculation
      if (field === 'facturacionMensualObjetivo') {
         const monthlyGoal = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
         const weeklyGoal = monthlyGoal > 0 ? monthlyGoal / WEEKS.length : 0;
         const formattedWeekly = weeklyGoal > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(weeklyGoal) : '';
         
         return prev.map(r => {
             if (r.id === id) {
                 return { 
                     ...r, 
                     [field]: value,
                     metaFacturacion: formattedWeekly
                 };
             }
             return r;
         });
      }

      return prev.map(r => r.id === id ? { ...r, [field]: value } : r);
    });
  };

  const getFansChange = (currentFans: string, weekIndex: number, account: string) => {
      if (weekIndex === 0) return null;
      const currentVal = parseFloat(currentFans.replace(/[^0-9.]/g, '')) || 0;
      
      // Find previous week row for same account (any chatter)
      const prevWeekName = WEEKS[weekIndex - 1];
      const prevRow = rows.find(r => r.semana === prevWeekName && r.cuenta === account);
      
      if (!prevRow) return null;
      
      const prevVal = parseFloat(prevRow.nuevosFans.replace(/[^0-9.]/g, '')) || 0;
      if (prevVal === 0) return null;

      const diff = currentVal - prevVal;
      const percent = (diff / prevVal) * 100;
      
      return {
          percent: Math.round(percent),
          isPositive: diff >= 0
      };
  };

  const handleNewMonth = () => {
    if (isReadOnly) return;
    if (!window.confirm('⚠️ ¿Estás seguro de iniciar un NUEVO MES?\n\nEsto limpiará visualmente la planilla para que ingreses nuevos datos.\nLos datos anteriores NO se borran de la base de datos, pero esta vista quedará vacía.')) {
      return;
    }

    setRows(prev => prev.map(r => ({
      ...r,
      facturacion: '',
      nuevosFans: '',
      metaSemanal: '',
      metaMensual: '',
      metaFacturacion: '',
      facturacionMensualObjetivo: '',
      posteos: '',
      historias: '',
      pendientes: '',
      resueltos: '',
      impacto: '',
      tiempoRespuesta: '',
      estadoObjetivo: GoalStatus.EMPTY
    })));
  };

  const copyWeekStats = (week: string, chatter: string) => {
      const weekRows = rows.filter(r => r.semana === week && r.chatter === chatter);
      if (weekRows.length === 0) return;

      const lines = weekRows.map(r => {
          return `${r.cuenta}: Fact: ${r.facturacion || '$0'} | Fans: ${r.nuevosFans || '0'} | Meta: ${r.estadoObjetivo || '-'}`;
      });

      const text = `📊 Reporte ${chatter} - ${week}\n${lines.join('\n')}`;
      navigator.clipboard.writeText(text);
      if (onShowToast) onShowToast('Reporte copiado al portapapeles', 'info');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      
      {/* Filters & Summary */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm z-20">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-extrabold text-[#111827] dark:text-white">Supervisión Semanal</h2>
                <p className="text-xs text-gray-400">Control de KPIs y Metas por Semana.</p>
            </div>
            
            <div className="flex gap-2">
                <button
                    onClick={handleNewMonth}
                    disabled={isReadOnly}
                    className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold px-3 py-2 transition-colors flex items-center gap-1"
                    title="Limpiar planilla para nuevo mes"
                >
                    🗑️ Nuevo Mes
                </button>
                <select 
                    value={filterWeek} 
                    onChange={(e) => setFilterWeek(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold p-2 outline-none text-gray-700 dark:text-gray-200"
                >
                    <option value="">📅 Todas Semanas</option>
                    {WEEKS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <select 
                    value={filterChatter} 
                    onChange={(e) => setFilterChatter(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold p-2 outline-none text-gray-700 dark:text-gray-200"
                >
                    <option value="">👤 Todos Chatters</option>
                    {CHATTERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                    value={filterAccount} 
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold p-2 outline-none text-gray-700 dark:text-gray-200"
                >
                    <option value="">💎 Todas Cuentas</option>
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center">
                <span className="text-xs text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">Facturación</span>
                <span className="text-lg font-black text-blue-900 dark:text-blue-100">${summary.totalFacturacion.toLocaleString()}</span>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col items-center">
                <span className="text-xs text-purple-800 dark:text-purple-300 font-bold uppercase tracking-wider">Nuevos Fans</span>
                <span className="text-lg font-black text-purple-900 dark:text-purple-100">{summary.totalFans.toLocaleString()}</span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800 flex flex-col items-center">
                <span className="text-xs text-green-800 dark:text-green-300 font-bold uppercase tracking-wider">Metas Cumplidas</span>
                <span className="text-lg font-black text-green-900 dark:text-green-100">{summary.completedGoals}</span>
            </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 p-4">
          {/* Group by Week */}
          {WEEKS.map((week, wIdx) => {
              // Filter rows for this week
              const weekRows = filteredRows.filter(r => r.semana === week);
              if (weekRows.length === 0) return null;

              // Group by Chatter within Week
              const chattersInWeek = Array.from(new Set(weekRows.map(r => r.chatter)));

              return (
                  <div key={week} className="mb-8 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-100 dark:bg-gray-900 p-3 border-b border-gray-200 dark:border-gray-700 font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest text-xs flex justify-between items-center">
                          <span>📅 {week}</span>
                      </div>
                      
                      {chattersInWeek.map(chatter => {
                          const chatterRows = weekRows.filter(r => r.chatter === chatter);
                          if (chatterRows.length === 0) return null;

                          return (
                              <div key={`${week}-${chatter}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                  {/* Chatter Header with Copy Button */}
                                  <div className="bg-gray-50 dark:bg-gray-800/50 p-2 px-4 flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CHATTER_COLORS[chatter]}`}>{chatter}</span>
                                      </div>
                                      <button 
                                        onClick={() => copyWeekStats(week, chatter)}
                                        className="text-[10px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-300 flex items-center gap-1 transition-colors"
                                        title="Copiar reporte"
                                      >
                                          📋 Copiar
                                      </button>
                                  </div>

                                  <table className="w-full text-sm border-collapse">
                                      <thead className="bg-white dark:bg-gray-800 text-[10px] text-gray-400 uppercase font-medium border-b border-gray-100 dark:border-gray-700">
                                          <tr>
                                              <th className="p-2 text-left w-32 pl-4">Cuenta</th>
                                              <th className="p-2 text-right w-28">Facturación</th>
                                              <th className="p-2 text-right w-28">Meta Fact.</th>
                                              <th className="p-2 text-right w-28">Obj. Mensual</th>
                                              <th className="p-2 text-right w-24">Fans</th>
                                              <th className="p-2 text-center w-28">Estado Meta</th>
                                              <th className="p-2 text-center w-16">Posts</th>
                                              <th className="p-2 text-center w-16">Stories</th>
                                              <th className="p-2 text-center w-24">T. Resp (min)</th>
                                              <th className="p-2 text-center w-16">Impacto %</th>
                                              <th className="p-2 text-left">Observación</th>
                                              <th className="p-2 text-center w-16">OK?</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                          {chatterRows.map(row => {
                                              const fansChange = getFansChange(row.nuevosFans, row.weekIndex, row.cuenta);
                                              return (
                                                  <tr key={row.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                                      <td className="p-2 pl-4">
                                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ACCOUNT_COLORS[row.cuenta]}`}>{row.cuenta}</span>
                                                      </td>
                                                      <td className="p-2">
                                                          <input 
                                                              type="text" 
                                                              value={row.facturacion}
                                                              disabled={isReadOnly}
                                                              onChange={(e) => updateRow(row.id, 'facturacion', e.target.value)}
                                                              onBlur={() => handleCurrencyBlur(row.id, 'facturacion')}
                                                              placeholder="$0"
                                                              className="w-full text-right bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs font-bold"
                                                          />
                                                      </td>
                                                      <td className="p-2">
                                                          <input 
                                                              type="text" 
                                                              value={row.metaFacturacion}
                                                              disabled={true} // Calculated automatically
                                                              placeholder="$0"
                                                              className="w-full text-right bg-transparent outline-none font-mono text-gray-500 dark:text-gray-400 text-xs"
                                                          />
                                                      </td>
                                                      <td className="p-2">
                                                          <input 
                                                              type="text" 
                                                              value={row.facturacionMensualObjetivo}
                                                              disabled={isReadOnly}
                                                              onChange={(e) => updateRow(row.id, 'facturacionMensualObjetivo', e.target.value)}
                                                              onBlur={() => handleCurrencyBlur(row.id, 'facturacionMensualObjetivo')}
                                                              placeholder="$0"
                                                              className="w-full text-right bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs"
                                                          />
                                                      </td>
                                                      <td className="p-2 relative group">
                                                           <div className="flex items-center justify-end gap-2">
                                                               {fansChange && (
                                                                   <span className={`text-[9px] font-bold ${fansChange.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                                                       {fansChange.isPositive ? '▲' : '▼'} {Math.abs(fansChange.percent)}%
                                                                   </span>
                                                               )}
                                                               <input 
                                                                  type="text" 
                                                                  value={row.nuevosFans}
                                                                  disabled={isReadOnly}
                                                                  onChange={(e) => updateRow(row.id, 'nuevosFans', e.target.value)}
                                                                  placeholder="0"
                                                                  className="w-12 text-right bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs"
                                                              />
                                                           </div>
                                                      </td>
                                                      <td className="p-2">
                                                          <select
                                                              value={row.estadoObjetivo}
                                                              disabled={isReadOnly}
                                                              onChange={(e) => updateRow(row.id, 'estadoObjetivo', e.target.value)}
                                                              className={`w-full text-[10px] font-bold p-1 rounded border cursor-pointer outline-none appearance-none text-center ${GOAL_COLORS[row.estadoObjetivo] || 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
                                                          >
                                                              <option value="">-</option>
                                                              {Object.values(GoalStatus).map(s => s && <option key={s} value={s}>{s}</option>)}
                                                          </select>
                                                      </td>
                                                      <td className="p-2 text-center">
                                                          <input 
                                                             type="checkbox" 
                                                             checked={row.posteos === 'Sí'}
                                                             disabled={isReadOnly}
                                                             onChange={(e) => updateRow(row.id, 'posteos', e.target.checked ? 'Sí' : 'No')}
                                                             className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                          />
                                                      </td>
                                                      <td className="p-2 text-center">
                                                           <input 
                                                             type="checkbox" 
                                                             checked={row.historias === 'Sí'}
                                                             disabled={isReadOnly}
                                                             onChange={(e) => updateRow(row.id, 'historias', e.target.checked ? 'Sí' : 'No')}
                                                             className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                          />
                                                      </td>
                                                      <td className="p-2">
                                                          <input 
                                                              type="text" 
                                                              value={row.tiempoRespuesta}
                                                              disabled={isReadOnly}
                                                              onChange={(e) => updateRow(row.id, 'tiempoRespuesta', e.target.value)}
                                                              placeholder="min"
                                                              className="w-full text-center bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs"
                                                          />
                                                      </td>
                                                      <td className="p-2 text-center">
                                                          <input 
                                                              type="text" 
                                                              value={row.impacto}
                                                              disabled={isReadOnly}
                                                              onChange={(e) => updateRow(row.id, 'impacto', e.target.value)}
                                                              placeholder="%"
                                                              className="w-full text-center bg-transparent outline-none text-gray-700 dark:text-gray-200 text-xs font-bold"
                                                          />
                                                      </td>
                                                      <td className="p-2">
                                                          <input 
                                                              type="text" 
                                                              value={row.pendientes}
                                                              disabled={isReadOnly}
                                                              onChange={(e) => updateRow(row.id, 'pendientes', e.target.value)}
                                                              placeholder="..."
                                                              className="w-full bg-transparent outline-none text-gray-600 dark:text-gray-300 text-xs placeholder-gray-300"
                                                          />
                                                      </td>
                                                      <td className="p-2 text-center">
                                                           <input 
                                                             type="checkbox" 
                                                             checked={row.resueltos === 'Sí'}
                                                             disabled={isReadOnly}
                                                             onChange={(e) => updateRow(row.id, 'resueltos', e.target.checked ? 'Sí' : 'No')}
                                                             className="w-3 h-3 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                                                          />
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          );
                      })}
                  </div>
              );
          })}
          
          {filteredRows.length === 0 && (
              <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                  <span className="text-2xl mb-2">🔍</span>
                  <p>No se encontraron datos.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default SupervisionSemanal;
