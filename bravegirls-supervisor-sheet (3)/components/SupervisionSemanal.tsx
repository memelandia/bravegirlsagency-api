import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WeeklySupervisionRow, WEEKS, GoalStatus, GOAL_COLORS, CHECKLIST_ROWS, CHATTER_COLORS, ACCOUNT_COLORS, CHATTERS, ACCOUNTS } from '../types';

const API_URL = 'https://bravegirlsagency-api.vercel.app/api/supervision/semanal';

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SupervisionSemanal: React.FC<Props> = ({ archivedData, isReadOnly = false, onShowToast }) => {
  const [rows, setRows] = useState<WeeklySupervisionRow[]>([]);
  const [filterChatter, setFilterChatter] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

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
          const response = await fetch(API_URL);
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            // If data exists in backend, use it
            setRows(result.data);
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
      if (initialized.current && !isReadOnly && !isLoading) {
        // Backup localStorage
        localStorage.setItem('supervision_semanal_data', JSON.stringify(rows));
        
        // Save to backend
        try {
          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: rows })
          });
          // if (onShowToast) onShowToast('Datos semanales guardados', 'success'); // Too frequent
        } catch (error) {
          console.error('Error saving to API:', error);
          if (onShowToast) onShowToast('Error al guardar datos semanales', 'error');
        }
      }
    };
    saveData();
  }, [rows, isReadOnly, isLoading]);

  // Calculations & Filtering
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchChatter = filterChatter ? row.chatter === filterChatter : true;
      const matchAccount = filterAccount ? row.cuenta === filterAccount : true;
      return matchChatter && matchAccount;
    });
  }, [rows, filterChatter, filterAccount]);

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
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
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
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
          <table className="w-full text-sm border-collapse min-w-[1000px]">
              <thead className="sticky top-0 z-10 shadow-md">
                  <tr className="bg-[#111827] dark:bg-black text-white text-[10px] uppercase tracking-wider font-bold">
                      <th className="p-3 text-left w-24 border-r border-gray-700">Semana</th>
                      <th className="p-3 text-left w-32 border-r border-gray-700">Chatter</th>
                      <th className="p-3 text-left w-32 border-r border-gray-700">Cuenta</th>
                      <th className="p-3 text-right w-32 border-r border-gray-700">Facturación ($)</th>
                      <th className="p-3 text-right w-32 border-r border-gray-700">Meta Fact. ($)</th>
                      <th className="p-3 text-right w-32 border-r border-gray-700">Fact. Mens. Obj. ($)</th>
                      <th className="p-3 text-right w-24 border-r border-gray-700">Fans</th>
                      <th className="p-3 text-center w-36 border-r border-gray-700">Estado Meta</th>
                      <th className="p-3 text-center w-20 border-r border-gray-700">Posts</th>
                      <th className="p-3 text-center w-20 border-r border-gray-700">Stories</th>
                      <th className="p-3 text-left border-r border-gray-700 min-w-[200px]">Pendientes</th>
                      <th className="p-3 text-center w-20">OK?</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRows.map(row => {
                      const weekColor = row.weekIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50';
                      return (
                          <tr key={row.id} className={`${weekColor} hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors`}>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700 font-bold text-gray-500 dark:text-gray-400 text-xs">{row.semana}</td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CHATTER_COLORS[row.chatter] || 'bg-gray-100'}`}>{row.chatter}</span>
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ACCOUNT_COLORS[row.cuenta] || 'border-gray-200'}`}>{row.cuenta}</span>
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
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
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                  <input 
                                      type="text" 
                                      value={row.metaFacturacion}
                                      disabled={isReadOnly}
                                      onChange={(e) => updateRow(row.id, 'metaFacturacion', e.target.value)}
                                      onBlur={() => handleCurrencyBlur(row.id, 'metaFacturacion')}
                                      placeholder="$0"
                                      className="w-full text-right bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs font-bold"
                                  />
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                  <input 
                                      type="text" 
                                      value={row.facturacionMensualObjetivo}
                                      disabled={isReadOnly}
                                      onChange={(e) => updateRow(row.id, 'facturacionMensualObjetivo', e.target.value)}
                                      onBlur={() => handleCurrencyBlur(row.id, 'facturacionMensualObjetivo')}
                                      placeholder="$0"
                                      className="w-full text-right bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs font-bold"
                                  />
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                   <input 
                                      type="text" 
                                      value={row.nuevosFans}
                                      disabled={isReadOnly}
                                      onChange={(e) => updateRow(row.id, 'nuevosFans', e.target.value)}
                                      placeholder="0"
                                      className="w-full text-right bg-transparent outline-none font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 text-xs"
                                  />
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                  <select
                                      value={row.estadoObjetivo}
                                      disabled={isReadOnly}
                                      onChange={(e) => updateRow(row.id, 'estadoObjetivo', e.target.value)}
                                      className={`w-full text-[10px] font-bold p-1 rounded border cursor-pointer outline-none appearance-none text-center ${GOAL_COLORS[row.estadoObjetivo] || 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
                                  >
                                      <option value="">- Seleccionar -</option>
                                      {Object.values(GoalStatus).map(s => s && <option key={s} value={s}>{s}</option>)}
                                  </select>
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700 text-center">
                                  <input 
                                     type="checkbox" 
                                     checked={row.posteos === 'Sí'}
                                     disabled={isReadOnly}
                                     onChange={(e) => updateRow(row.id, 'posteos', e.target.checked ? 'Sí' : 'No')}
                                     className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700 text-center">
                                   <input 
                                     type="checkbox" 
                                     checked={row.historias === 'Sí'}
                                     disabled={isReadOnly}
                                     onChange={(e) => updateRow(row.id, 'historias', e.target.checked ? 'Sí' : 'No')}
                                     className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                              </td>
                              <td className="p-2 border-r border-gray-100 dark:border-gray-700">
                                  <input 
                                      type="text" 
                                      value={row.pendientes}
                                      disabled={isReadOnly}
                                      onChange={(e) => updateRow(row.id, 'pendientes', e.target.value)}
                                      placeholder="Escribir..."
                                      className="w-full bg-transparent outline-none text-gray-600 dark:text-gray-300 text-xs placeholder-gray-300"
                                  />
                              </td>
                              <td className="p-2 text-center">
                                   <input 
                                     type="checkbox" 
                                     checked={row.resueltos === 'Sí'}
                                     disabled={isReadOnly}
                                     onChange={(e) => updateRow(row.id, 'resueltos', e.target.checked ? 'Sí' : 'No')}
                                     className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                                  />
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
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
