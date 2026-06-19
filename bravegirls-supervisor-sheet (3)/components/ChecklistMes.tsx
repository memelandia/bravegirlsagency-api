import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CHECKLIST_ROWS, ChecklistRow, Status, STATUS_COLORS, CHATTER_COLORS, ACCOUNT_COLORS } from '../types';
import { supervisionAPI } from '../api-service';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const SUB_HEADERS = ['Tiempos', 'Script/PPV', 'Precios', 'Masivos'];

// Un color distintivo por categoría (mismo orden que SUB_HEADERS) para que el
// supervisor diferencie las columnas de un vistazo en la grilla de 31 días.
const SUB_HEADER_STYLES = [
  'bg-sky-600 text-white border-sky-700',       // Tiempos
  'bg-violet-600 text-white border-violet-700', // Script/PPV
  'bg-emerald-600 text-white border-emerald-700', // Precios
  'bg-amber-500 text-gray-900 border-amber-600',  // Masivos
];

// Clave estable por identidad (chatter + cuenta), NO por posición de fila.
// Así reordenar / agregar / quitar chatters no desalinea los datos guardados.
const cellKey = (row: ChecklistRow, day: number, colIdx: number) =>
  `${row.chatter}|${row.cuenta}|${day}|${colIdx}`;

// Símbolo grande por estado: más legible que texto en una grilla densa de 31 días.
const STATUS_SYMBOLS: Record<string, string> = {
  [Status.OK]: '✓',
  [Status.OBS]: '!',
  [Status.CRIT]: '✕',
  [Status.NA]: '–',
  [Status.EMPTY]: '',
};

// Opciones del selector de 1 clic (popover) para fijar el estado directo.
const STATUS_OPTIONS: { value: Status; label: string; symbol: string; cls: string }[] = [
  { value: Status.OK,   label: 'OK',          symbol: '✓', cls: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200' },
  { value: Status.OBS,  label: 'Observación', symbol: '!', cls: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200' },
  { value: Status.CRIT, label: 'Crítico',     symbol: '✕', cls: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200' },
  { value: Status.NA,   label: 'No aplica',   symbol: '–', cls: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300' },
];

// Bloques de chatter: el nombre se muestra una sola vez por grupo (celda con rowSpan).
// CHECKLIST_ROWS viene agrupado por chatter, así que los bloques son contiguos.
const CHATTER_BLOCKS = CHECKLIST_ROWS.map((row, i) => {
  const isFirst = i === 0 || CHECKLIST_ROWS[i - 1].chatter !== row.chatter;
  let span = 0;
  if (isFirst) {
    span = 1;
    for (let j = i + 1; j < CHECKLIST_ROWS.length && CHECKLIST_ROWS[j].chatter === row.chatter; j++) span++;
  }
  return { isFirst, span };
});

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ChecklistMes: React.FC<Props> = ({ archivedData, isReadOnly = false, onShowToast }) => {
  const [data, setData] = useState<Record<string, Status>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const isFirstRun = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const todayDate = new Date().getDate();

  useEffect(() => {
    const loadData = async () => {
      if (archivedData && archivedData.checklist) {
        setData(archivedData.checklist);
        setIsLoading(false);
      } else {
        const result = await supervisionAPI.getChecklist();
        // Si result está vacío o es null, inicializar como objeto vacío
        if (!result || Object.keys(result).length === 0) {
          setData({});
        } else {
          setData(result);
        }
        setIsLoading(false);
      }
      initialized.current = true;
    };
    loadData();
  }, [archivedData]);

  useEffect(() => {
    const saveData = async () => {
      if (isLoading) return;

      if (isFirstRun.current) {
        isFirstRun.current = false;
        return;
      }

      if (initialized.current && !isReadOnly) {
        const success = await supervisionAPI.saveChecklist(data);
        if (!success && onShowToast) {
             onShowToast('Error al guardar checklist', 'error');
        }
      }
    };
    saveData();
  }, [data, isReadOnly, isLoading]);

  // Selector de 1 clic: clic en una celda abre un popover junto al cursor
  // para fijar el estado directo (sin tener que ciclar Vacío→OK→OBS→CRIT→N/A).
  const [picker, setPicker] = useState<{ key: string; top: number; left: number } | null>(null);

  const openPicker = (e: React.MouseEvent, key: string) => {
    if (isReadOnly) return;
    const PW = 180, PH = 250; // tamaño aprox del popover, para no desbordar la ventana
    const left = Math.min(e.clientX, window.innerWidth - PW - 12);
    const top = Math.min(e.clientY, window.innerHeight - PH - 12);
    setPicker({ key, top: Math.max(8, top), left: Math.max(8, left) });
  };

  const setCellStatus = (value: Status) => {
    if (isReadOnly || !picker) return;
    const key = picker.key;
    setData(prev => ({ ...prev, [key]: value }));
    setPicker(null);
  };

  // Cerrar el selector con Escape.
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  const batchFillDay = (day: number) => {
      if(isReadOnly) return;
      if (!confirm(`¿Llenar todas las celdas vacías del Día ${day} con 'OK'?`)) return;

      const updates: Record<string, Status> = {};
      CHECKLIST_ROWS.forEach((row) => {
          SUB_HEADERS.forEach((_, colIdx) => {
              const key = cellKey(row, day, colIdx);
              if (!data[key]) {
                  updates[key] = Status.OK;
              }
          });
      });
      setData(prev => ({ ...prev, ...updates }));
  };

  // SCORE CALCULATION
  const getDailyScore = (day: number) => {
    let total = 0;
    let score = 0;
    CHECKLIST_ROWS.forEach((row) => {
        SUB_HEADERS.forEach((_, colIdx) => {
            const key = cellKey(row, day, colIdx);
            const val = data[key];
            if (val && val !== Status.NA) {
                total++;
                if (val === Status.OK) score++;
                else if (val === Status.OBS) score += 0.5;
            }
        });
    });
    if (total === 0) return null;
    return Math.round((score / total) * 100);
  };

  const getCellColor = (status: Status) => STATUS_COLORS[status] || 'bg-white dark:bg-gray-800';

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollPos = (todayDate - 1) * 384;
      scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [todayDate]);

  const scrollToToday = () => {
     if (scrollContainerRef.current) {
      const scrollPos = (todayDate - 1) * 384;
      scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  };

  const exportCSV = () => {
      const headerRow = ['Chatter', 'Cuenta', ...DAYS.flatMap(d => SUB_HEADERS.map(s => `Dia ${d} - ${s}`))];
      const csvRows = [headerRow.join(',')];

      CHECKLIST_ROWS.forEach((row) => {
          const rowData = [row.chatter, row.cuenta];
          DAYS.forEach(day => {
              SUB_HEADERS.forEach((_, colIdx) => {
                  const key = cellKey(row, day, colIdx);
                  rowData.push(data[key] || '');
              });
          });
          csvRows.push(rowData.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `supervision_diaria_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };


  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 relative transition-colors">
      
      {/* Footer Controls */}
      <div className="absolute bottom-6 right-6 z-50 flex gap-2">
        <button 
          onClick={exportCSV}
          className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all text-sm font-bold flex items-center gap-2 border border-gray-200 dark:border-gray-600"
        >
          <span>📥</span> CSV
        </button>
        <button 
          onClick={scrollToToday}
          className="bg-[#111827] dark:bg-black text-white px-4 py-2 rounded-full shadow-lg hover:bg-[#374151] transition-all text-sm font-bold flex items-center gap-2 border border-gray-700 hover:scale-105 active:scale-95"
        >
          <span>📅</span> Ir al Día {todayDate}
        </button>
      </div>

      <div className="flex-1 overflow-auto relative" ref={scrollContainerRef}>
        <table className="border-collapse w-max text-sm select-none">
          <thead className="sticky top-0 z-20 shadow-lg">
            <tr>
              <th className="sticky left-0 z-30 bg-[#111827] dark:bg-black text-white border-r-4 border-gray-800 p-2 w-32 min-w-[128px] h-12 text-left font-bold pl-4">👤 Chatter</th>
              <th className="sticky left-32 z-30 bg-[#111827] dark:bg-black text-white border-r-4 border-gray-800 p-2 w-32 min-w-[128px] h-12 text-left font-bold pl-4">💎 Cuenta</th>
              {DAYS.map(day => {
                const isToday = day === todayDate;
                const dailyScore = getDailyScore(day);
                return (
                  <th 
                    key={day} 
                    colSpan={4} 
                    className={`
                      border-r-4 border-gray-800 text-center font-bold px-2 transition-colors relative group cursor-pointer
                      ${isToday ? 'bg-blue-600 text-white' : 'bg-[#111827] dark:bg-black text-white'}
                    `}
                    onClick={() => isToday && !isReadOnly && batchFillDay(day)}
                    title={!isReadOnly ? "Clic para llenar todo OK (Solo disponible hoy)" : ""}
                  >
                    <div className="flex flex-col justify-center items-center h-full py-1">
                        <div>
                            {isToday && <span className="mr-2 text-[10px] bg-white text-blue-900 px-1 rounded uppercase tracking-tighter">HOY</span>}
                            Día {day}
                        </div>
                        {dailyScore !== null && (
                            <div className={`text-[10px] mt-1 px-1.5 rounded ${dailyScore >= 90 ? 'bg-green-500 text-white' : dailyScore >= 70 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>
                                Score: {dailyScore}%
                            </div>
                        )}
                        {!isReadOnly && isToday && (
                             <span className="absolute top-1 right-1 text-[8px] opacity-0 group-hover:opacity-100 bg-white/20 px-1 rounded">LLENAR</span>
                        )}
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr>
              <th className="sticky left-0 z-30 bg-[#1F2937] dark:bg-gray-900 h-10 border-r-4 border-gray-800 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.3)]"></th>
              <th className="sticky left-32 z-30 bg-[#1F2937] dark:bg-gray-900 h-10 border-r-4 border-gray-800 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.3)]"></th>
              {DAYS.map(day => {
                const isToday = day === todayDate;
                return (
                  <React.Fragment key={day}>
                    {SUB_HEADERS.map((sub, idx) => (
                      <th
                        key={`${day}-${idx}`}
                        className={`
                          font-bold text-[11px] px-1 py-1.5 h-9 border-b border-r min-w-[74px] w-24 uppercase tracking-tight overflow-hidden text-ellipsis whitespace-nowrap
                          ${SUB_HEADER_STYLES[idx]}
                          ${idx === 3 ? 'border-r-4 border-r-gray-800' : ''}
                          ${isToday ? 'ring-2 ring-inset ring-blue-300 dark:ring-blue-200 brightness-110' : ''}
                        `}
                      >
                        {sub}
                      </th>
                    ))}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {CHECKLIST_ROWS.map((row, rowIdx) => {
              const chatterColor = CHATTER_COLORS[row.chatter] || CHATTER_COLORS['default'];
              const accountColor = ACCOUNT_COLORS[row.cuenta] || ACCOUNT_COLORS['default'];
              const block = CHATTER_BLOCKS[rowIdx];
              const isBlockStart = block.isFirst && rowIdx !== 0; // divisor entre chatters (no en la 1ra fila)
              const blockTop = isBlockStart ? 'border-t-4 border-t-gray-300 dark:border-t-gray-600' : '';
              return (
              <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {block.isFirst && (
                  <td
                    rowSpan={block.span}
                    className={`sticky left-0 z-10 bg-white dark:bg-gray-800 border-r-4 border-gray-200 dark:border-gray-700 p-2 align-middle ${blockTop}`}
                  >
                    <div className={`py-1.5 px-2 rounded-md ${chatterColor} text-center font-bold text-xs uppercase tracking-wide`}>
                      {row.chatter}
                    </div>
                  </td>
                )}
                <td className={`sticky left-32 z-10 bg-white dark:bg-gray-800 border-b border-r-4 border-gray-200 dark:border-gray-700 p-2 font-medium text-gray-600 dark:text-gray-400 truncate shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] text-xs ${blockTop}`}>
                   <div className={`py-1 px-2 rounded-md border ${accountColor} text-center`}>
                    {row.cuenta}
                  </div>
                </td>
                {DAYS.map(day => {
                  const isToday = day === todayDate;
                  return (
                    <React.Fragment key={day}>
                      {SUB_HEADERS.map((_, colIdx) => {
                        const key = cellKey(row, day, colIdx);
                        const currentStatus = data[key] || Status.EMPTY;

                        const topBorder = isBlockStart
                          ? blockTop
                          : (isToday ? 'border-t-2 border-t-blue-100 dark:border-t-blue-900' : '');
                        const cellBaseClass = isToday
                          ? `${topBorder} border-b-2 border-b-blue-100 dark:border-b-blue-900 bg-blue-50/30 dark:bg-blue-900/20`
                          : `${topBorder} border-b border-gray-200 dark:border-gray-700`;

                        const rightBorderClass = colIdx === 3
                          ? (isToday ? 'border-r-4 border-r-blue-300 dark:border-r-blue-700' : 'border-r-4 border-r-gray-300 dark:border-r-gray-600')
                          : (isToday ? 'border-r border-blue-100 dark:border-blue-800' : 'border-r border-gray-200 dark:border-gray-700');

                        return (
                          <td
                            key={key}
                            onClick={(e) => openPicker(e, key)}
                            className={`${cellBaseClass} ${rightBorderClass} p-0 h-10 cursor-pointer hover:brightness-95 active:scale-95 transition-all text-center`}
                          >
                            <div className={`
                                w-full h-full flex items-center justify-center font-black text-base leading-none
                                ${getCellColor(currentStatus)}
                                ${currentStatus === Status.EMPTY && isToday ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''}
                            `}>
                                {STATUS_SYMBOLS[currentStatus] || ''}
                            </div>
                          </td>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tr>
            )})}
            
            {/* Daily Score Footer Row */}
            <tr className="bg-gray-100 dark:bg-gray-900 font-bold text-xs border-t-4 border-gray-300 dark:border-gray-600">
                <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-900 border-r-4 border-gray-300 dark:border-gray-600 p-2 text-right" colSpan={2}>
                    CALIDAD DIARIA:
                </td>
                {DAYS.map(day => {
                    const score = getDailyScore(day);
                    return (
                        <td key={day} colSpan={4} className="border-r-4 border-gray-300 dark:border-gray-600 text-center py-2">
                             {score !== null ? (
                                <span className={`px-2 py-0.5 rounded ${score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {score}%
                                </span>
                             ) : '-'}
                        </td>
                    )
                })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Selector de estado de 1 clic */}
      {picker && (
        <div className="fixed inset-0 z-[60]" onClick={() => setPicker(null)}>
          <div
            className="absolute w-44 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 flex flex-col gap-1"
            style={{ top: picker.top, left: picker.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Marcar estado</div>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCellStatus(opt.value)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${opt.cls}`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/60 dark:bg-black/20 font-black">{opt.symbol}</span>
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setCellStatus(Status.EMPTY)}
              className="flex items-center gap-2 px-2 py-1.5 mt-0.5 pt-2 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
            >
              <span className="w-5 h-5 flex items-center justify-center">🧹</span>
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistMes;