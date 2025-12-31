import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ACCOUNT_COLORS, ACCOUNTS } from '../types';
import { supervisionAPI } from '../api-service';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type FanType = 'WHALE' | 'LOYALTY';

interface VipFan {
  id: string;
  name: string;
  account: string;
  type: FanType;
  chatLink?: string; 
}

enum VipStatus {
  EMPTY = '',
  CONTACTED = 'CONTACTED',
  SALE = 'SALE',
  MISSED = 'MISSED',
  NA = 'NA'
}

const VIP_STATUS_CONFIG = {
  [VipStatus.EMPTY]: { label: '', color: 'bg-white dark:bg-gray-800', icon: '' },
  [VipStatus.CONTACTED]: { label: 'Contactado', color: 'bg-[#DCFCE7] dark:bg-green-900 text-green-800 dark:text-green-100', icon: '✅' },
  [VipStatus.SALE]: { label: 'Venta', color: 'bg-[#FEF9C3] dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100', icon: '💲' },
  [VipStatus.MISSED]: { label: 'Sin Contacto', color: 'bg-[#FEE2E2] dark:bg-red-900 text-red-800 dark:text-red-100', icon: '❌' },
  [VipStatus.NA]: { label: 'N/A', color: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300', icon: '➖' },
};

interface Props {
  archivedData?: any;
  isReadOnly?: boolean;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const VipRepasoMes: React.FC<Props> = ({ archivedData, isReadOnly = false, onShowToast }) => {
  const [fans, setFans] = useState<VipFan[]>([]);
  const [dailyStatus, setDailyStatus] = useState<Record<string, VipStatus>>({});
  
  // Inputs
  const [newFanName, setNewFanName] = useState('');
  const [newFanAccount, setNewFanAccount] = useState(ACCOUNTS[0]);
  const [newFanType, setNewFanType] = useState<FanType>('WHALE');
  const [newFanLink, setNewFanLink] = useState('');
  
  const [filterAccount, setFilterAccount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const isFirstRun = useRef(true);
  const todayDate = new Date().getDate();

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      if (archivedData) {
        setFans(archivedData.vip || []);
        setDailyStatus(archivedData.vipStatus || {});
        setIsLoading(false);
      } else {
        // 1. Load Status
        const statusData = await supervisionAPI.getVipRepaso();
        setDailyStatus(statusData);

        // 2. Load Fans
        const fansData = await supervisionAPI.getVipFans();
        setFans(fansData);
        
        setIsLoading(false);
      }
      initialized.current = true;
    };
    loadData();
  }, [archivedData]);

  // Save Data (Only Status here, Fans are saved on action)
  useEffect(() => {
    const saveData = async () => {
      if (isLoading) return;
      
      if (isFirstRun.current) {
        isFirstRun.current = false;
        return;
      }

      if (initialized.current && !isReadOnly) {
        const success = await supervisionAPI.saveVipRepaso(dailyStatus);
        if (!success && onShowToast) onShowToast('Error al guardar estado VIP', 'error');
      }
    };
    saveData();
  }, [fans, dailyStatus, isReadOnly, isLoading]);

  const addFan = async () => {
    if (isReadOnly) return;
    if (!newFanName.trim()) return;
    
    const newFan: VipFan = {
      id: Date.now().toString() + Math.random().toString().slice(2),
      name: newFanName.trim(),
      account: newFanAccount,
      type: newFanType,
      chatLink: newFanLink.trim()
    };

    // Optimistic Update
    setFans(prev => [...prev, newFan]);
    setNewFanName('');
    setNewFanLink('');

    // API Call
    const success = await supervisionAPI.saveVipFan(newFan);
    if (success) {
        if (onShowToast) onShowToast('Fan agregado correctamente', 'success');
    } else {
        if (onShowToast) onShowToast('Error al guardar fan', 'error');
    }
  };

  const removeFan = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (isReadOnly) return;
    if (confirm('⚠️ ¿Eliminar permanentemente a este fan del seguimiento?')) {
      // Optimistic Update
      setFans(prevFans => prevFans.filter(f => f.id !== id));

      // API Call
      await supervisionAPI.deleteVipFan(id);
    }
  };

  const changeFanType = async (e: React.MouseEvent, id: string, newType: FanType) => {
      e.stopPropagation();
      if (isReadOnly) return;
      
      const fan = fans.find(f => f.id === id);
      if (!fan) return;

      const updatedFan = { ...fan, type: newType };

      // Optimistic Update
      setFans(prev => prev.map(f => f.id === id ? updatedFan : f));

      // API Call
      await supervisionAPI.saveVipFan(updatedFan);
  };

  const toggleStatus = (fanId: string, day: number) => {
    if (isReadOnly) return;
    const key = `${fanId}-${day}`;
    const current = dailyStatus[key] || VipStatus.EMPTY;
    
    // Cycle logic
    let next = VipStatus.EMPTY;
    if (current === VipStatus.EMPTY) next = VipStatus.CONTACTED;
    else if (current === VipStatus.CONTACTED) next = VipStatus.SALE;
    else if (current === VipStatus.SALE) next = VipStatus.MISSED;
    else if (current === VipStatus.MISSED) next = VipStatus.NA;
    else next = VipStatus.EMPTY;

    setDailyStatus(prev => ({ ...prev, [key]: next }));
  };

  // Scroll to today
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollPos = (todayDate - 1) * 48; 
      scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [todayDate]);

  const filteredFans = useMemo(() => {
    let result = fans;
    if (filterAccount) {
        result = result.filter(f => f.account === filterAccount);
    }
    return result;
  }, [fans, filterAccount]);

  const whales = filteredFans.filter(f => f.type === 'WHALE');
  const loyalty = filteredFans.filter(f => f.type === 'LOYALTY');

  const exportCSV = () => {
      const headerRow = ['Type', 'Fan Name', 'Link', 'Cuenta', ...DAYS.map(d => `Dia ${d}`)];
      const csvRows = [headerRow.join(',')];
      const sorted = [...fans].sort((a,b) => a.type.localeCompare(b.type));

      sorted.forEach(fan => {
          const rowData = [fan.type, `"${fan.name}"`, fan.chatLink || '', fan.account];
          DAYS.forEach(day => {
              const key = `${fan.id}-${day}`;
              const status = dailyStatus[key] || '';
              const label = VIP_STATUS_CONFIG[status as VipStatus]?.label || '';
              rowData.push(label);
          });
          csvRows.push(rowData.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `vip_tracking_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const copyLink = (e: React.MouseEvent, link: string) => {
      e.stopPropagation();
      if (!link) return;
      navigator.clipboard.writeText(link);
      if (onShowToast) onShowToast('Link copiado al portapapeles', 'info');
  };

  const renderTableSection = (title: string, icon: string, data: VipFan[], headerColor: string) => (
    <>
        <tr className="sticky z-20 top-12">
            <td className={`sticky left-0 z-30 px-4 py-3 font-black text-sm uppercase tracking-widest ${headerColor} border-b border-gray-300 dark:border-gray-700 border-r`}>
                <span className="mr-2 text-lg">{icon}</span> {title} ({data.length})
            </td>
            <td colSpan={31} className={`px-4 py-3 ${headerColor} border-b border-gray-300 dark:border-gray-700`}></td>
        </tr>
        {data.length === 0 && (
            <tr>
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 text-xs italic">
                    Sin fans
                </td>
                <td colSpan={31} className="bg-gray-50/50 dark:bg-gray-800/50"></td>
            </tr>
        )}
        {data.map((fan) => {
            const accountColor = ACCOUNT_COLORS[fan.account] || ACCOUNT_COLORS['default'];
            return (
            <tr key={fan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 p-2 font-bold text-gray-800 dark:text-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-64 min-w-[250px]">
                    <div className="flex justify-between items-center group/cell pl-2">
                    <div className="flex flex-col w-full pr-2">
                         <div className="flex items-center justify-between w-full">
                             <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[140px]" title={fan.name}>{fan.name}</span>
                             {fan.chatLink && (
                                <button 
                                    onClick={(e) => copyLink(e, fan.chatLink!)}
                                    className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded transition-colors"
                                    title="Copiar Link"
                                >
                                    📋
                                </button>
                             )}
                         </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border w-fit mt-1 ${accountColor}`}>
                        {fan.account}
                        </span>
                    </div>
                    
                    {/* Actions */}
                    {!isReadOnly && (
                    <div className="flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                        {fan.type === 'LOYALTY' && (
                            <button 
                                onClick={(e) => changeFanType(e, fan.id, 'WHALE')}
                                className="p-1 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 rounded" 
                                title="Promover a Ballena"
                            >
                                ⬆️
                            </button>
                        )}
                        {fan.type === 'WHALE' && (
                            <button 
                                onClick={(e) => changeFanType(e, fan.id, 'LOYALTY')}
                                className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900 text-yellow-600 rounded" 
                                title="Mover a Fidelizar"
                            >
                                ⬇️
                            </button>
                        )}
                        <button 
                            onClick={(e) => removeFan(e, fan.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-500 rounded"
                            title="Eliminar"
                        >
                            🗑️
                        </button>
                    </div>
                    )}
                    </div>
                </td>
                {DAYS.map(day => {
                const key = `${fan.id}-${day}`;
                const currentStatus = dailyStatus[key] || VipStatus.EMPTY;
                const config = VIP_STATUS_CONFIG[currentStatus];
                const isToday = day === todayDate;

                return (
                    <td 
                    key={key} 
                    onClick={() => toggleStatus(fan.id, day)}
                    className={`
                        border-b border-r p-0 h-14 cursor-pointer text-center select-none transition-all hover:brightness-95 active:scale-95
                        ${isToday ? 'border-blue-200 dark:border-blue-800 border-x-2 bg-blue-50/10 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}
                        ${config.color}
                    `}
                    title={config.label}
                    >
                    <span className="text-lg">{config.icon}</span>
                    </td>
                );
                })}
            </tr>
            )})}
    </>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      
      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex flex-col xl:flex-row gap-4 justify-between items-center shadow-sm z-30 relative">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold text-[#111827] dark:text-white flex items-center gap-2">
            TRACKER VIPS
          </h2>
          <p className="text-xs text-gray-400">Gestión de Ballenas y Fidelización.</p>
        </div>

        {/* Add Fan Form */}
        {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
          <select
            value={newFanType}
            onChange={(e) => setNewFanType(e.target.value as FanType)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs font-bold outline-none cursor-pointer"
          >
              <option value="WHALE">🐳 Ballena</option>
              <option value="LOYALTY">🌱 Fidelizar</option>
          </select>
          <input 
            type="text" 
            placeholder="Nombre..." 
            value={newFanName}
            onChange={(e) => setNewFanName(e.target.value)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm w-28 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input 
            type="text" 
            placeholder="Link del chat (opcional)..." 
            value={newFanLink}
            onChange={(e) => setNewFanLink(e.target.value)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm w-36 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select 
            value={newFanAccount}
            onChange={(e) => setNewFanAccount(e.target.value)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm outline-none cursor-pointer w-24"
          >
            {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button 
            onClick={addFan}
            disabled={!newFanName}
            className="bg-[#111827] dark:bg-black text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
          >
            +
          </button>
        </div>
        )}

        {/* Filter & Actions */}
        <div className="flex items-center gap-3">
          <select 
             value={filterAccount}
             onChange={(e) => setFilterAccount(e.target.value)}
             className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold outline-none cursor-pointer"
          >
            <option value="">👁️ Ver Todas</option>
            {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          
          <button 
            onClick={exportCSV}
            className="text-gray-500 dark:text-gray-400 hover:text-[#111827] dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold"
            title="Exportar a CSV"
          >
            📥
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto relative bg-white dark:bg-gray-800" ref={scrollContainerRef}>
        <table className="border-collapse w-max text-sm">
          <thead className="sticky top-0 z-30 shadow-md">
            <tr>
              <th className="sticky left-0 z-40 bg-[#111827] dark:bg-black text-white border-r border-gray-600 p-3 w-64 text-left font-bold shadow-lg pl-6 h-12">
                👤 Fan / Cuenta
              </th>
              {DAYS.map(day => {
                const isToday = day === todayDate;
                return (
                  <th 
                    key={day} 
                    className={`
                      border-r border-gray-600 text-center font-bold px-1 min-w-[48px] w-12 h-12
                      ${isToday ? 'bg-blue-600 text-white border-b-4 border-b-blue-800' : 'bg-[#111827] dark:bg-black text-white'}
                    `}
                  >
                    <span className="text-xs">{day}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
             {renderTableSection('BALLENAS (High Value)', '🐳', whales, 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100')}
             {renderTableSection('FIDELIZAR (Potenciales)', '🌱', loyalty, 'bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100')}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 flex gap-4 justify-center text-xs overflow-x-auto">
         {Object.entries(VIP_STATUS_CONFIG).map(([key, conf]) => {
           if (key === VipStatus.EMPTY) return null;
           return (
             <div key={key} className="flex items-center gap-1.5">
               <span className="text-sm">{conf.icon}</span>
               <span className="font-medium text-gray-600 dark:text-gray-300">{conf.label}</span>
             </div>
           )
         })}
      </div>
    </div>
  );
};

export default VipRepasoMes;