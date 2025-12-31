
import React, { useState, useEffect, useRef } from 'react';
import { ErrorLogEntry, ErrorType, Severity, ErrorStatus, CHATTERS, ACCOUNTS, CHATTER_COLORS, ACCOUNT_COLORS } from '../types';
import { supervisionAPI } from '../api-service';

const SEVERITY_BORDER_COLORS = {
  [Severity.GRAVE]: 'border-l-red-500',
  [Severity.MEDIO]: 'border-l-yellow-400',
  [Severity.MINIMO]: 'border-l-gray-300',
  '': 'border-l-gray-200'
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  [ErrorType.SCRIPT]: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border-indigo-100 dark:border-indigo-900',
  [ErrorType.PRECIO]: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-100 dark:border-emerald-900',
  [ErrorType.TIEMPO]: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-100 dark:border-orange-900',
  [ErrorType.DESARROLLO]: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-100 dark:border-purple-900',
  [ErrorType.OTRO]: 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-600',
  '': 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
};

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const RegistroErrores: React.FC<Props> = ({ archivedData, isReadOnly = false, onShowToast }) => {
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN'>('OPEN');
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      if (archivedData && archivedData.errors) {
        setEntries(archivedData.errors);
        setIsLoading(false);
      } else {
        const result = await supervisionAPI.getErrores();
        setEntries(result);
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
        const success = await supervisionAPI.saveErrores(entries);
        if (!success && onShowToast) onShowToast('Error al guardar', 'error');
      }
    };
    saveData();
  }, [entries, isReadOnly, isLoading]);

  const addRow = () => {
    if(isReadOnly) return;
    const newEntry: ErrorLogEntry = {
      id: Date.now().toString(),
      fecha: new Date().toISOString().split('T')[0],
      cuenta: '',
      chatter: '',
      tipo: '',
      gravedad: Severity.MEDIO, 
      detalle: '',
      traslado: 'No',
      estado: ErrorStatus.ABIERTO,
      link: ''
    };
    setEntries([newEntry, ...entries]);
    setFilterStatus('OPEN'); 
  };

  const updateEntry = (id: string, field: keyof ErrorLogEntry, value: string) => {
    if(isReadOnly) return;
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };
  
  const toggleStatus = (id: string) => {
    if(isReadOnly) return;
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, estado: entry.estado === ErrorStatus.ABIERTO ? ErrorStatus.CORREGIDO : ErrorStatus.ABIERTO } : entry
    ));
  };
  
  const deleteEntry = (id: string) => {
      if(isReadOnly) return;
      if(window.confirm('¿Eliminar este registro?')) {
          setEntries(entries.filter(e => e.id !== id));
      }
  }

  const copyFeedback = (entry: ErrorLogEntry) => {
    const text = `🚨 *FEEDBACK SUPERVISIÓN*
📅 ${entry.fecha} | 👤 ${entry.chatter} | 💎 ${entry.cuenta}

⚠️ *Error:* ${entry.tipo || 'General'}
🔥 *Nivel:* ${entry.gravedad}
${entry.link ? `🔗 *Link:* ${entry.link}` : ''}

📝 *Detalle:* 
${entry.detalle || '-'}

👉 Por favor corregir.`;

    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const visibleEntries = entries.filter(e => {
    if (filterStatus === 'ALL') return true;
    return e.estado === ErrorStatus.ABIERTO || e.estado === ''; 
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-gray-50/50 to-gray-100/30 dark:from-gray-900 dark:via-gray-900/50 dark:to-black/30 p-8 transition-colors">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="space-y-1">
             <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
               <span className="text-2xl">🚨</span>
               Registro de Incidencias
             </h2>
             <p className="text-gray-500 dark:text-gray-400 text-sm ml-11">Gestiona y comunica errores operativos.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 flex shadow-sm backdrop-blur-sm">
                  <button 
                    onClick={() => setFilterStatus('OPEN')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${filterStatus === 'OPEN' ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 text-red-700 dark:text-red-200 shadow-sm ring-1 ring-red-200 dark:ring-red-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'}`}
                  >
                    Pendientes
                  </button>
                  <button 
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${filterStatus === 'ALL' ? 'bg-gradient-to-br from-gray-100 to-gray-200/50 dark:from-gray-700 dark:to-gray-600/50 text-gray-800 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'}`}
                  >
                    Historial
                  </button>
              </div>

              {!isReadOnly && (
              <button 
                onClick={addRow}
                className="bg-gradient-to-br from-[#111827] to-black dark:from-black dark:to-gray-900 hover:shadow-xl hover:shadow-gray-300/50 dark:hover:shadow-black/50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100 ml-auto md:ml-0 ring-1 ring-gray-800/20"
              >
                <span className="text-xl leading-none">+</span> Nueva Incidencia
              </button>
              )}
          </div>
        </div>

        {/* List View (Table Replacement) */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-20">
            {visibleEntries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm">
                <span className="text-5xl mb-4 opacity-60">✨</span>
                <p className="font-bold text-lg">Sin incidencias pendientes</p>
                <p className="text-sm opacity-60 mt-1">Todo está funcionando correctamente</p>
              </div>
            )}

            {visibleEntries.map((entry) => {
                const borderClass = SEVERITY_BORDER_COLORS[entry.gravedad as Severity] || 'border-l-gray-200 dark:border-l-gray-700';
                const typeColor = ERROR_TYPE_COLORS[entry.tipo] || ERROR_TYPE_COLORS[''];
                
                return (
                <div 
                    key={entry.id} 
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 border-l-[6px] ${borderClass} p-5 transition-all duration-200 hover:shadow-md group`}
                >
                    <div className="flex flex-col gap-4">
                        
                        {/* Top Row: Meta & Status */}
                        <div className="flex flex-wrap justify-between items-start gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <input 
                                    type="date" 
                                    value={entry.fecha}
                                    disabled={isReadOnly}
                                    onChange={(e) => updateEntry(entry.id, 'fecha', e.target.value)}
                                    className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                                <select
                                    value={entry.chatter}
                                    disabled={isReadOnly}
                                    onChange={(e) => updateEntry(entry.id, 'chatter', e.target.value)}
                                    className={`text-xs font-bold border-0 rounded px-2 py-0.5 focus:ring-2 focus:ring-blue-500 cursor-pointer
                                        ${entry.chatter ? CHATTER_COLORS[entry.chatter] : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}
                                    `}
                                >
                                    <option value="">Chatter</option>
                                    {CHATTERS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    value={entry.cuenta}
                                    disabled={isReadOnly}
                                    onChange={(e) => updateEntry(entry.id, 'cuenta', e.target.value)}
                                    className={`text-xs font-bold border-0 rounded px-2 py-0.5 focus:ring-2 focus:ring-blue-500 cursor-pointer
                                        ${entry.cuenta ? ACCOUNT_COLORS[entry.cuenta] : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}
                                    `}
                                >
                                    <option value="">Cuenta</option>
                                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                <button 
                                    onClick={() => toggleStatus(entry.id)}
                                    disabled={isReadOnly}
                                    className={`
                                        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors
                                        ${entry.estado === ErrorStatus.CORREGIDO 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800' 
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}
                                    `}
                                >
                                    {entry.estado || 'PENDIENTE'}
                                </button>
                                {!isReadOnly && (
                                    <button 
                                        onClick={() => deleteEntry(entry.id)}
                                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Middle Row: Type & Severity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipo de Error</label>
                                <select 
                                    value={entry.tipo}
                                    disabled={isReadOnly}
                                    onChange={(e) => updateEntry(entry.id, 'tipo', e.target.value)}
                                    className={`w-full text-xs font-bold border-0 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer ${typeColor}`}
                                >
                                    <option value="">Seleccionar Tipo...</option>
                                    {Object.values(ErrorType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gravedad</label>
                                <select 
                                    value={entry.gravedad}
                                    disabled={isReadOnly}
                                    onChange={(e) => updateEntry(entry.id, 'gravedad', e.target.value)}
                                    className="w-full text-xs font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded px-2 py-1.5 cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-sm"
                                >
                                    <option value="">Seleccionar Nivel...</option>
                                    {Object.values(Severity).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Bottom Row: Details & Link */}
                        <div className="space-y-2">
                             <div className="relative">
                                <textarea 
                                    value={entry.detalle}
                                    disabled={isReadOnly}
                                    onChange={(e) => updateEntry(entry.id, 'detalle', e.target.value)}
                                    placeholder="Describe el error aquí..."
                                    rows={2}
                                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200 resize-none"
                                />
                             </div>
                             
                             <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2 top-1.5 text-xs">🔗</span>
                                    <input 
                                        type="text" 
                                        value={entry.link || ''}
                                        disabled={isReadOnly}
                                        onChange={(e) => updateEntry(entry.id, 'link', e.target.value)}
                                        placeholder="Pegar link del chat..."
                                        className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md pl-7 pr-2 py-1.5 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300"
                                    />
                                </div>
                                {entry.link && (
                                    <a 
                                        href={entry.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                        title="Abrir Link"
                                    >
                                        ↗
                                    </a>
                                )}
                                <button
                                    onClick={() => copyFeedback(entry)}
                                    className={`
                                        flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                                        ${copiedId === entry.id 
                                            ? 'bg-green-500 text-white shadow-lg scale-105' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
                                    `}
                                >
                                    {copiedId === entry.id ? '¡Copiado!' : '📋 Copiar Feedback'}
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            )})}
        </div>
      </div>
    </div>
  );
};

export default RegistroErrores;
