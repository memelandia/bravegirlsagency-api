
import React, { useState, useEffect } from 'react';
import { ErrorLogEntry, ErrorStatus } from '../types';

interface Task {
  id: string;
  title: string;
  details: string[];
  icon: string;
  isHeader?: boolean;
}

const TASKS: Task[] = [
  {
    id: 'header_1',
    title: 'FASE 1: CALIDAD OPERATIVA',
    details: [],
    icon: '1️⃣',
    isHeader: true
  },
  {
    id: 'step_1',
    title: 'Scan Inicial',
    details: ['Abrir OnlyMonster.', 'Revisar Message Tracker (Buscar abandonos).'],
    icon: '🔍'
  },
  {
    id: 'step_2',
    title: 'Lectura de Muestreo',
    details: [
      'Entra a 3-5 chats por modelo.',
      '¿Ofreció Script? ¿Precio correcto?',
      '¿Intentó Venta (Custom/Video)?'
    ],
    icon: '👁️'
  },
  {
    id: 'step_3',
    title: 'Supervisión Ágil (NUEVO)',
    details: [
      'Ve a la pestaña SUPERVISIÓN DIARIA.',
      '🖱️ CLIC en celda para cambiar: ⬜ → 🟩 OK → 🟨 OBS → 🟥 CRIT.',
      '🚀 CLIC en "Día X" (arriba) para llenar todo el día con OK.',
    ],
    icon: '⚡'
  },
  {
    id: 'step_4',
    title: 'Score y Errores',
    details: [
      'Revisa el "Score" (%) al final de la columna del día.',
      'Si hay error grave: Pestaña REGISTRO ERRORES (+ Nuevo Error).',
    ],
    icon: '📊'
  },
  {
    id: 'header_2',
    title: 'FASE 2: GESTIÓN COMERCIAL',
    details: [],
    icon: '2️⃣',
    isHeader: true
  },
  {
    id: 'step_5',
    title: 'Tracker VIPs',
    details: [
      'Ve a la pestaña TRACKER VIPS.',
      'Verifica contacto con Ballenas y Fidelizados.',
      'Marca: ✅ Contacto, 💲 Venta o ❌ Sin contacto.',
      'Usa el botón 🗑️ para eliminar fans que ya no apliquen.'
    ],
    icon: '🐳'
  },
  {
    id: 'step_6',
    title: 'Cierre de Mes / Historial',
    details: [
      'El día 1 del mes siguiente: clic en botón "🗑️ Nuevo Mes" (arriba).',
      'El sistema guardará una COPIA exacta de este mes.',
      'Podrás consultar meses pasados en el menú desplegable "📚".'
    ],
    icon: '💾'
  }
];

const SopSupervisor: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);
  const [openErrors, setOpenErrors] = useState(0);

  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // Check for open errors in localStorage
  useEffect(() => {
    try {
      const savedErrors = localStorage.getItem('registro_errores_data');
      if (savedErrors) {
        const parsed: ErrorLogEntry[] = JSON.parse(savedErrors);
        const openCount = parsed.filter(e => e.estado === ErrorStatus.ABIERTO).length;
        setOpenErrors(openCount);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load state from local storage and handle daily reset
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    const storageKey = 'sop_daily_state';
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) {
          setCheckedItems(parsed.items);
        } else {
          localStorage.setItem(storageKey, JSON.stringify({ date: today, items: {} }));
          setCheckedItems({});
        }
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ date: today, items: {} }));
      }
    } catch (e) {
      console.error("Error accessing localStorage", e);
    }
  }, []);

  // Update progress and save on change
  useEffect(() => {
    const totalTasks = TASKS.filter(t => !t.isHeader).length;
    const completedTasks = Object.values(checkedItems).filter(Boolean).length;
    const newProgress = Math.round((completedTasks / totalTasks) * 100);
    setProgress(newProgress);

    const today = new Date().toLocaleDateString();
    localStorage.setItem('sop_daily_state', JSON.stringify({ date: today, items: checkedItems }));
  }, [checkedItems]);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 transition-colors">
      <div className="max-w-4xl mx-auto pb-20">
        
        {/* Hero Card */}
        <div className="bg-[#111827] dark:bg-black text-white rounded-2xl p-8 mb-8 shadow-xl relative overflow-hidden border border-gray-800">
          <div className="relative z-10 flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold">{getGreeting()}, Supervisor.</h1>
                <p className="text-gray-400 mt-1">Sigue el flujo para completar tu día con excelencia.</p>
             </div>
             <div className="text-right">
                <div className="text-4xl font-black">{progress}%</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Completado</div>
             </div>
          </div>
          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-1.5 bg-gray-700 w-full">
             <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Timeline Flow */}
        <div className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-700 space-y-8 ml-4">
          
          {TASKS.map((task, index) => {
            if (task.isHeader) {
              return (
                <div key={task.id} className="relative pt-4 first:pt-0">
                  <div className="absolute -left-[41px] bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm">
                    {task.icon}
                  </div>
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-2 mt-1 ml-2">
                    {task.title}
                  </h2>
                </div>
              );
            }

            const isChecked = checkedItems[task.id] || false;

            return (
              <div 
                key={task.id}
                onClick={() => toggleCheck(task.id)}
                className={`
                  relative group cursor-pointer transition-all duration-300 transform
                  ${isChecked ? 'opacity-50' : 'hover:translate-x-1'}
                `}
              >
                {/* Timeline Dot */}
                <div className={`
                    absolute -left-[43px] top-6 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 shadow-sm transition-colors duration-300
                    ${isChecked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500'}
                `}></div>

                <div className={`
                    bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm transition-all duration-300
                    ${isChecked ? 'border-green-200 dark:border-green-900 bg-green-50/20 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900'}
                `}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className={`text-2xl p-2 rounded-lg ${isChecked ? 'grayscale opacity-50' : 'bg-gray-50 dark:bg-gray-700'}`}>
                            {task.icon}
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg ${isChecked ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                {task.title}
                            </h3>
                            <ul className="mt-2 space-y-1">
                                {task.details.map((detail, idx) => (
                                    <li key={idx} className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
                                        <span className="text-gray-300 dark:text-gray-600 mt-1">•</span> {detail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    
                    <div className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center transition-all
                        ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}
                    `}>
                        {isChecked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Error Alert */}
        {openErrors > 0 && (
            <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-bounce cursor-pointer hover:bg-red-700">
                <span className="text-2xl">🚨</span>
                <div>
                    <div className="font-bold">¡Atención!</div>
                    <div className="text-sm">{openErrors} Incidencias Abiertas</div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default SopSupervisor;
