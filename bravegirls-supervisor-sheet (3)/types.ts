
export enum Status {
  EMPTY = '',
  OK = 'OK',
  OBS = 'OBS',
  CRIT = 'CRIT',
  NA = 'N/A'
}

export interface ChecklistRow {
  chatter: string;
  cuenta: string;
}

export const CHECKLIST_ROWS: ChecklistRow[] = [
  { chatter: 'Nico', cuenta: 'Carmen' },
  { chatter: 'Nico', cuenta: 'Bellarey' },
  { chatter: 'Nico', cuenta: 'Vicky' },
  { chatter: 'Alfonso', cuenta: 'Carmen' },
  { chatter: 'Alfonso', cuenta: 'Bellarey' },
  { chatter: 'Yaye', cuenta: 'Lexi' },
  { chatter: 'Yaye', cuenta: 'Lucy' },
  { chatter: 'Diego', cuenta: 'Lexi' },
  { chatter: 'Diego', cuenta: 'Lucy' },
  { chatter: 'Kari', cuenta: 'Vicky' },
  { chatter: 'Emely', cuenta: 'Vicky' },
];

export const VIP_ROWS = [
  'Carmen',
  'Bellarey',
  'Vicky',
  'Lexi',
  'Lucy'
];

export const CHATTERS = ['Nico', 'Alfonso', 'Yaye', 'Diego', 'Kari', 'Emely'];
export const ACCOUNTS = ['Carmen', 'Bellarey', 'Vicky', 'Lexi', 'Lucy'];

// Color Mappings for Dropdowns/Badges (Light & Dark compatible)
export const CHATTER_COLORS: Record<string, string> = {
  'Nico': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Alfonso': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Yaye': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Diego': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Kari': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'Emely': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'default': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export const ACCOUNT_COLORS: Record<string, string> = {
  'Carmen': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  'Bellarey': 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-900',
  'Vicky': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  'Lexi': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900',
  'Lucy': 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-900',
  'default': 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'
};

export enum ErrorType {
  SCRIPT = 'Script',
  PRECIO = 'Precio irregular',
  TIEMPO = 'Tiempo de respuesta',
  DESARROLLO = 'Desarrollo de conversación',
  OTRO = 'Otro'
}

export enum Severity {
  MINIMO = 'Mínimo',
  MEDIO = 'Medio',
  GRAVE = 'Grave'
}

export enum ErrorStatus {
  ABIERTO = 'Abierto',
  CORREGIDO = 'Corregido'
}

export interface ErrorLogEntry {
  id: string;
  fecha: string;
  cuenta: string;
  chatter: string;
  tipo: ErrorType | '';
  gravedad: Severity | '';
  detalle: string;
  traslado: 'Sí' | 'No' | '';
  estado: ErrorStatus | '';
  link?: string;
}

// --- NEW TYPES FOR WEEKLY SUPERVISION ---

export enum GoalStatus {
  CUMPLIDO = 'Cumplido',
  CERCA = 'Cerca',
  FALLIDO = 'Fallido',
  EMPTY = ''
}

export const WEEKS = [
  'Semana 1',
  'Semana 2',
  'Semana 3',
  'Semana 4',
  'Semana 5'
];

export interface WeeklySupervisionRow {
  id: string;
  mes: string;
  semana: string; // "Semana 1", etc
  weekIndex: number; // 0-4, for sorting/logic
  chatter: string;
  cuenta: string;
  facturacion: string;
  nuevosFans: string;
  metaSemanal: string;
  metaMensual: string;
  metaFacturacion: string;       // NUEVO
  facturacionMensualObjetivo: string;  // NUEVO
  posteos: 'Sí' | 'No' | '';
  historias: 'Sí' | 'No' | '';
  pendientes: string;
  resueltos: 'Sí' | 'No' | '';
  impacto: string; // %
  tiempoRespuesta: string;
  estadoObjetivo: GoalStatus;
}

export const COL_WIDTHS = {
  CHECKLIST_FIXED: 'w-32',
  CHECKLIST_CELL: 'w-24',
};

// Color mapping (Light & Dark)
export const STATUS_COLORS = {
  [Status.OK]: 'bg-[#DCFCE7] text-green-800 dark:bg-green-900 dark:text-green-200',
  [Status.OBS]: 'bg-[#FEF9C3] text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [Status.CRIT]: 'bg-[#FEE2E2] text-red-800 dark:bg-red-900 dark:text-red-200',
  [Status.NA]: 'bg-[#E5E7EB] text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  [Status.EMPTY]: 'bg-white dark:bg-gray-800'
};

export const SEVERITY_COLORS = {
  [Severity.GRAVE]: 'bg-[#FEE2E2] dark:bg-red-900/50',
  [Severity.MEDIO]: 'bg-[#FEF9C3] dark:bg-yellow-900/50',
  [Severity.MINIMO]: 'bg-[#F3F4F6] dark:bg-gray-700/50', 
  '': 'bg-white dark:bg-gray-800'
};

export const GOAL_COLORS = {
  [GoalStatus.CUMPLIDO]: 'bg-[#DCFCE7] text-green-900 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800',
  [GoalStatus.CERCA]: 'bg-[#FEF9C3] text-yellow-900 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800',
  [GoalStatus.FALLIDO]: 'bg-[#FEE2E2] text-red-900 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800',
  [GoalStatus.EMPTY]: 'bg-white text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
};
