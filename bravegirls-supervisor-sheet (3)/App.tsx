
import React, { useState, useEffect } from 'react';
import SopSupervisor from './components/SopSupervisor';
import ChecklistMes from './components/ChecklistMes';
import VipRepasoMes from './components/VipRepasoMes';
import RegistroErrores from './components/RegistroErrores';
import SupervisionSemanal from './components/SupervisionSemanal';
import Metricas from './components/Metricas';
import { Toast } from './components/ui/Toast';

enum Tab {
  SOP = 'SOP_SUPERVISOR',
  CHECKLIST = 'CHECKLIST_MES',
  VIP = 'TRACKER_VIPS',
  SEMANAL = 'SUPERVISION_SEMANAL',
  METRICAS = 'METRICAS_KPI',
  ERRORES = 'REGISTRO_ERRORES'
}

const TAB_LABELS: Record<Tab, string> = {
  [Tab.SOP]: '📘 SOP SUPERVISOR',
  [Tab.CHECKLIST]: '✅ SUPERVISIÓN DIARIA',
  [Tab.VIP]: '🐳 TRACKER VIPS',
  [Tab.SEMANAL]: '📊 SUPERVISION SEMANAL',
  [Tab.METRICAS]: '📈 MÉTRICAS',
  [Tab.ERRORES]: '🚨 REGISTRO ERRORES'
};

// Archive Interface
interface ArchivedMonth {
  id: string; // "YYYY-MM-TIMESTAMP"
  label: string; // "Marzo 2024"
  timestamp: number;
  data: {
    checklist: any;
    vip: any;
    vipStatus: any;
    errors: any;
    weekly: any;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SOP);
  const [darkMode, setDarkMode] = useState(false);
  const [archives, setArchives] = useState<ArchivedMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current' or ID of archive
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // --- DARK MODE LOGIC ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newVal;
    });
  };

  // --- HISTORY LOGIC ---
  useEffect(() => {
    const savedArchives = localStorage.getItem('history_archive');
    if (savedArchives) {
      try {
        setArchives(JSON.parse(savedArchives));
      } catch (e) {
        console.error("Error loading archives", e);
      }
    }
  }, []);

  const archiveCurrentMonth = () => {
    const today = new Date();
    // Default to current month name. 
    // If user clicks this on April 1st, they likely want to save "March". 
    // Simple logic: Use current real-time month name. User can understand by date.
    const monthLabel = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const timestamp = Date.now();
    const id = `${today.getFullYear()}-${today.getMonth() + 1}-${timestamp}`;

    // Capture Snapshots
    const snapshot = {
      checklist: JSON.parse(localStorage.getItem('checklist_mes_data') || '{}'),
      vip: JSON.parse(localStorage.getItem('vip_fans_list') || '[]'),
      vipStatus: JSON.parse(localStorage.getItem('vip_daily_status') || '{}'),
      errors: JSON.parse(localStorage.getItem('registro_errores_data') || '[]'),
      weekly: JSON.parse(localStorage.getItem('supervision_semanal_data') || '[]'),
    };

    const newArchive: ArchivedMonth = {
      id,
      label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      timestamp,
      data: snapshot
    };

    // Prepend new archive
    const updatedArchives = [newArchive, ...archives];
    setArchives(updatedArchives);
    localStorage.setItem('history_archive', JSON.stringify(updatedArchives));
    return newArchive;
  };

  const handleResetMonth = () => {
    // 1. Confirm Archiving
    const confirmArchive = confirm(
      "📦 CIERRE DE MES\n\n¿Deseas guardar una COPIA HISTÓRICA de todos los datos actuales antes de reiniciar?\n\n(Esto guardará 'Supervisión Diaria', 'VIPs', 'Semanal' y 'Errores' en el Historial)."
    );
    
    if (confirmArchive) {
      archiveCurrentMonth();
      alert("✅ Datos guardados en el Historial (Menú Desplegable 📚).");
    }

    // 2. Confirm Wiping
    const confirmWipe = confirm(
      "⚠️ ATENCIÓN: INICIO DE NUEVO MES\n\n¿Estás seguro de que quieres limpiar la pantalla?\n\n- Se borrará la Supervisión Diaria.\n- Se borrará el estado diario de VIPs (se mantienen los nombres).\n- Se reiniciará la tabla Semanal.\n- Se limpiarán los Errores resueltos."
    );

    if (confirmWipe) {
      // Limpiar TODOS los datos del mes
      localStorage.removeItem('checklist_mes_data');
      localStorage.removeItem('vip_daily_status'); // Keep 'vip_fans_list' (names)
      localStorage.removeItem('supervision_semanal_data');
      localStorage.removeItem('registro_errores_data');
      
      // También limpiar datos del backend/API si existen
      try {
        // Limpiar indexedDB o cualquier otro storage
        if (window.indexedDB) {
          const deleteRequest = indexedDB.deleteDatabase('supervisionDB');
          deleteRequest.onsuccess = () => console.log('DB limpiada');
        }
      } catch (e) {
        console.warn('Error limpiando DB:', e);
      }
      
      // Forzar limpieza completa
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  // Get current data based on selection
  const getCurrentDataProps = () => {
    if (selectedMonth === 'current') return {}; 
    const archive = archives.find(a => a.id === selectedMonth);
    return archive ? { archivedData: archive.data, isReadOnly: true } : {};
  };

  const dataProps = getCurrentDataProps();

  const renderContent = () => {
    switch (activeTab) {
      case Tab.SOP:
        return <SopSupervisor />;
      case Tab.CHECKLIST:
        return <ChecklistMes {...dataProps} onShowToast={showToast} />;
      case Tab.VIP:
        return <VipRepasoMes {...dataProps} onShowToast={showToast} />;
      case Tab.SEMANAL:
        return <SupervisionSemanal {...dataProps} onShowToast={showToast} />;
      case Tab.METRICAS:
        return <Metricas {...dataProps} />;
      case Tab.ERRORES:
        return <RegistroErrores {...dataProps} onShowToast={showToast} />;
      default:
        return <SopSupervisor />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Banner de Histórico */}
      {selectedMonth !== 'current' && (
        <div className="bg-yellow-500 text-black font-bold text-center text-xs py-1 px-4 z-50">
           🔒 ESTÁS VIENDO UN ARCHIVO HISTÓRICO ({archives.find(a => a.id === selectedMonth)?.label}) - MODO LECTURA
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-[#111827] dark:bg-[#030712] text-white shadow-lg z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <h1 className="text-xs font-bold tracking-wider opacity-60 uppercase text-gray-400">BraveGirls Agency</h1>
                <h2 className="text-lg font-bold leading-none">Supervisor Dashboard</h2>
              </div>
            </div>

            {/* Month Selector */}
            <div className="hidden md:flex items-center ml-6 bg-gray-800 rounded-lg p-1 border border-gray-700 hover:border-blue-500 transition-colors">
               <span className="pl-2 text-gray-400 text-xs mr-1">Viendo:</span>
               <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer px-1 pr-3"
               >
                  <option value="current" className="bg-gray-800">🟢 Mes Actual (Editable)</option>
                  {archives.map(arch => (
                    <option key={arch.id} value={arch.id} className="bg-gray-800">
                        📚 {arch.label} ({new Date(arch.timestamp).toLocaleDateString()})
                    </option>
                  ))}
               </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors text-lg"
              title={darkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {selectedMonth === 'current' ? (
              <button 
                  onClick={handleResetMonth}
                  className="bg-red-900/50 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded-md text-xs font-bold border border-red-800 transition-colors flex items-center gap-2 shadow-sm"
                  title="Archivar mes actual y limpiar datos"
              >
                  <span>🗑️</span> Nuevo Mes
              </button>
            ) : (
               <button 
                 onClick={() => setSelectedMonth('current')}
                 className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md shadow-sm"
               >
                 🔙 Volver al Presente
               </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex px-4 pt-2 gap-1 overflow-x-auto scrollbar-hide bg-[#111827] dark:bg-[#030712]">
          {Object.values(Tab).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-5 py-3 rounded-t-lg font-bold text-xs md:text-sm tracking-wide transition-all duration-200 whitespace-nowrap flex items-center gap-2
                ${activeTab === tab 
                  ? 'bg-white dark:bg-gray-800 text-[#111827] dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] translate-y-[1px] border-t-2 border-blue-500' 
                  : 'bg-[#1F2937] dark:bg-gray-900 text-gray-400 hover:bg-[#374151] hover:text-white border-t-2 border-transparent'}
              `}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-white dark:bg-gray-800 transition-colors duration-200">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
