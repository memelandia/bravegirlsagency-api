
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
  { chatter: 'Nico', cuenta: 'xvickyluna' },
  { chatter: 'Nico', cuenta: 'lilymontero' },
  { chatter: 'Alfonso', cuenta: 'xvickyluna' },
  { chatter: 'Alfonso', cuenta: 'lilymontero' },
  { chatter: 'Kari', cuenta: 'xvickyluna' },
  { chatter: 'Kari', cuenta: 'lilymontero' },
  { chatter: 'Yaye', cuenta: 'Lexi' },
  { chatter: 'Yaye', cuenta: 'Carmen' },
  { chatter: 'Yaye', cuenta: 'KatieRose' },
  { chatter: 'Camila', cuenta: 'Carmen' },
  { chatter: 'Camila', cuenta: 'Lexi' },
  { chatter: 'Camila', cuenta: 'KatieRose' },
  { chatter: 'Camila', cuenta: 'Redcarmyn' },
  { chatter: 'Mauricio', cuenta: 'KatieRose' },
  { chatter: 'Mauricio', cuenta: 'Sarah' },
  { chatter: 'Mauricio', cuenta: 'Carmen' },
  { chatter: 'Mauricio', cuenta: 'Lexi' },
  { chatter: 'Antonio', cuenta: 'KatieRose' },
  { chatter: 'Antonio', cuenta: 'Carmen' },
  { chatter: 'Antonio', cuenta: 'Lexi' },
  { chatter: 'Antonio', cuenta: 'xvickyluna' },
  { chatter: 'Antonio', cuenta: 'lilymontero' },
];

export const VIP_ROWS = [
  'Carmen',
  'Lexi',
  'KatieRose',
  'xvickyluna',
  'lilymontero',
  'LilyJane',
  'Sarah',
  // Lucy = alias interno para SweetBallerina
  'Lucy'
];

export const CHATTERS = ['Nico', 'Alfonso', 'Kari', 'Yaye', 'Camila', 'Mauricio', 'Antonio'];
export const ACCOUNTS = ['Carmen', 'Redcarmyn', 'Lexi', 'KatieRose', 'xvickyluna', 'lilymontero', 'LilyJane', 'Sarah', 'Lucy'];

// Color Mappings for Dropdowns/Badges (Light & Dark compatible)
export const CHATTER_COLORS: Record<string, string> = {
  'Nico': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Alfonso': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Yaye': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Kari': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'Camila': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
  'Mauricio': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'Antonio': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'default': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export const ACCOUNT_COLORS: Record<string, string> = {
  'Carmen': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  'Redcarmyn': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-900',
  'Lexi': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900',
  'KatieRose': 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-900',
  'xvickyluna': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  'lilymontero': 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-900',
  'LilyJane': 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900',
  'Sarah': 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-900',
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

// ═══════════════════════════════════════════
// TIPOS PARA DASHBOARD DE MODELOS
// ═══════════════════════════════════════════

export interface ModelStats {
  id: string;
  name: string;
  onlyFansUsername: string;
  onlyMonsterId: string;

  // Métricas actuales
  totalSubscribers: number;
  activeSubscribers: number;
  newSubscribersToday: number;
  newSubscribersThisWeek: number;
  newSubscribersThisMonth: number;

  // Facturación (NET después del 20% OF)
  earningsToday: number;
  earningsThisWeek: number;
  earningsThisMonth: number;
  earningsTotal: number;
  projection: number;

  // Desglose
  subscriptionRevenue: number;
  ppvRevenue: number;
  tipRevenue: number;

  // Engagement
  messagesReceived: number;
  messagesSent: number;
  responseRate: number;
  averageResponseTime: number;
  avgMessagePrice: number;

  // Contenido
  postsThisMonth: number;
  storiesThisMonth: number;

  // Transacciones
  transactionCount: number;

  // Metadata
  lastUpdated: string;
  isPlaceholder?: boolean;
}

export interface DailyBilling {
  date: string;
  earnings: number;
  newSubs: number;
  activeSubs: number;
}

// ==========================================
// CHATTER PERFORMANCE TYPES (Real /users/metrics data)
// ==========================================

export interface ChatterRevenue {
  total_net: number;            // (sold_messages + tips + sold_posts) × 0.8
  sold_messages_gross: number;  // sold_messages_price_sum
  tips_gross: number;           // tips_amount_sum
  sold_posts_gross: number;     // sold_posts_price_sum
  paid_messages_price: number;  // paid_messages_price_sum (total price of paid msgs sent)
  impact_percentage: number;    // % of team total
}

export interface ChatterMessages {
  total: number;             // messages_count
  ai_generated: number;      // ai_generated_messages_count
  copied: number;            // copied_messages_count
  media: number;             // media_messages_count
  paid_sent: number;         // paid_messages_count
  sold: number;              // sold_messages_count
  unsent: number;            // unsent_messages_count
  templates_used: number;    // internal_templates_count
  words_count: number;       // words_count_sum
}

export interface ChatterPerformance {
  reply_time_avg_seconds: number;
  reply_time_avg_minutes: number;
  purchase_interval_avg_seconds: number;
  purchase_interval_avg_minutes: number;
  revenue_per_message: number;    // total_net / messages_count
  conversion_rate: number;        // sold / paid_sent × 100
}

export interface ChatterChargebacks {
  tips: number;
  messages_price: number;
  messages_count: number;
  posts_price: number;
  posts_count: number;
}

export interface ChatterMetrics {
  user_id: string;
  user_name: string;
  creator_ids?: number[];
  accounts: string[];
  period: { start: string; end: string };
  revenue: ChatterRevenue;
  messages: ChatterMessages;
  performance: ChatterPerformance;
  fans_count: number;
  posts_count: number;
  deleted_posts_count: number;
  chargebacks: ChatterChargebacks;
  lastUpdated: string;
}

export interface ChatterWithKPIs extends ChatterMetrics {
  rank: number;
  performance_rating: 1 | 2 | 3 | 4 | 5;
}

export enum TimePeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  CUSTOM = 'custom'
}

export const RATING_COLORS: Record<number, string> = {
  5: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  4: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  3: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  2: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  1: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300'
};

// ═══════════════════════════════════════════
// ONLYMONSTER CONFIG TYPES (dynamic from API)
// ═══════════════════════════════════════════

export interface OMAccount {
  id: number;
  platform_account_id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface OMMember {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

// IDs de miembros de OnlyMonster que NO son chatters.
// 24792 = Admin operativo, 25135 = jonatan benitez, 56895 = Aldi sanchez
// 139826 = existe en chattersData pero no en members (no-chatter)
// Actualizar manualmente cuando cambie el equipo no-chatter.
export const EXCLUDED_MEMBER_IDS: number[] = [
  24792, 25135, 56895, 139826
];

// ═══════════════════════════════════════════
// ORGANIGRAMA (asignaciones chatter × cuenta × turno)
// ═══════════════════════════════════════════

export enum Shift {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT'
}

export const SHIFT_LABELS: Record<Shift, string> = {
  [Shift.MORNING]: '🌅 Mañana',
  [Shift.AFTERNOON]: '☀️ Tarde',
  [Shift.NIGHT]: '🌙 Noche'
};

export const SHIFT_HOURS: Record<Shift, string> = {
  [Shift.MORNING]: '7:00 — 14:00',
  [Shift.AFTERNOON]: '14:00 — 21:00',
  [Shift.NIGHT]: '21:00 — 04:00'
};

// Paletas Tailwind por turno (claro / oscuro). Pensadas para fondos suaves de drop zone.
export const SHIFT_STYLES: Record<Shift, { bg: string; border: string; text: string; ring: string }> = {
  [Shift.MORNING]:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-300 dark:border-amber-700',   text: 'text-amber-800 dark:text-amber-200',   ring: 'ring-amber-400' },
  [Shift.AFTERNOON]: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-200', ring: 'ring-orange-400' },
  [Shift.NIGHT]:     { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-800 dark:text-indigo-200', ring: 'ring-indigo-400' }
};

export interface Assignment {
  shift: Shift;
  accountId: number;
  chatterId: number;
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATIZACIÓN / ALERTAS
// ═══════════════════════════════════════════════════════════════

export type AlertLevel = 'critical' | 'warning' | 'info';
export type AlertCategory = 'S1' | 'S2' | 'S3' | 'S4' | 'D5' | 'D6' | 'D7';

export interface Alert {
  id: number;
  level: AlertLevel;
  category: AlertCategory;
  accountId: number | null;
  userId: number | null;
  title: string;
  body: string | null;
  metadata: Record<string, any> | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

export const ALERT_LEVEL_STYLES: Record<AlertLevel, { bg: string; border: string; text: string; emoji: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-300 dark:border-red-700',     text: 'text-red-800 dark:text-red-200',     emoji: '🔴' },
  warning:  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-200', emoji: '🟡' },
  info:     { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-300 dark:border-blue-700',   text: 'text-blue-800 dark:text-blue-200',   emoji: '🔵' }
};

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  S1: 'Caída chatter/cuenta semanal',
  S2: 'Caída subs nuevos semanal',
  S3: 'Caída facturación cuenta semanal',
  S4: 'Chargeback',
  D5: 'Chatter sin PPV',
  D6: 'Reply time alto',
  D7: 'Baja conversión PPV'
};

export interface WeeklyReportAccount {
  accountId: number;
  thisRevenue: number;
  prevRevenue: number;
  thisNewSubs: number;
  prevNewSubs: number;
}
export interface WeeklyReportChatter {
  userId: number;
  accountId: number;
  thisRevenue: number;
  prevRevenue: number;
  thisPaid: number;
  thisSold: number;
}
export interface WeeklyReportChargeback {
  id: string;
  accountId: number;
  userId: number | null;
  fanId: string | null;
  chatId: string | null;
  amount: number;
  occurredAt: string;
}

/**
 * Construye la URL de OnlyFans para abrir un chat con un fan.
 * IMPORTANTE: el link solo funciona si el supervisor está logueado en la
 * cuenta de OnlyFans correspondiente a la modelo. Mostrar el nombre de la
 * modelo en el UI para que sepa en qué cuenta debe estar logueado.
 */
export function buildOnlyFansChatLink(chatId: string | number | null, fanId?: string | number | null): string | null {
  const id = chatId ?? fanId;
  if (!id) return null;
  return `https://onlyfans.com/my/chats/chat/${id}/`;
}
export interface WeeklyReport {
  weekStart: string;
  previousWeekStart: string;
  accounts: WeeklyReportAccount[];
  chatters: WeeklyReportChatter[];
  chargebacks: WeeklyReportChargeback[];
}
