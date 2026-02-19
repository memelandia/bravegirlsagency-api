/**
 * API Endpoint CONSOLIDADO: /api/onlymonster/models-stats
 * 
 * Usa la MISMA API de OnlyMonster que dashboard-modelo.js (api/accounts.js)
 * Base URL: https://omapi.onlymonster.ai/api/v0/
 * Auth: x-om-auth-token
 * 
 * Modos de uso:
 *   GET /api/onlymonster/models-stats              → Stats de TODAS las modelos (mes actual)
 *   GET /api/onlymonster/models-stats?modelId=XXX   → Detalle de UNA modelo
 *   GET /api/onlymonster/models-stats?modelId=XXX&billing=true&days=30 → Histórico facturación diario
 */

const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY = process.env.ONLYMONSTER_API_KEY || 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { modelId, billing, days, start_date, end_date } = req.query;

  // ─── PARSEAR RANGO DE FECHAS (si se proveen) ───
  let dateRange = null;
  if (start_date && end_date) {
    dateRange = {
      start: new Date(start_date + 'T00:00:00Z'),
      end: new Date(end_date + 'T23:59:59.999Z')
    };
    console.log(`📅 Rango de fechas: ${start_date} → ${end_date}`);
  }

  try {
    // ─── MODO 1: Billing history (revenue diario) ───
    if (modelId && billing === 'true') {
      const model = MODELS.find(m => m.id === modelId);
      if (!model) {
        return res.status(404).json({ success: false, error: 'Model not found' });
      }
      const daysNum = parseInt(days) || 30;
      const billingData = await fetchDailyBilling(modelId, daysNum);
      return res.status(200).json({
        success: true,
        data: billingData,
        model: model.name,
        timestamp: new Date().toISOString()
      });
    }

    // ─── MODO 2: Detalle individual ───
    if (modelId) {
      const model = MODELS.find(m => m.id === modelId);
      if (!model) {
        return res.status(404).json({ success: false, error: 'Model not found' });
      }
      const stats = await fetchModelStats(model, dateRange);
      return res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    }

    // ─── MODO 3: Todas las modelos (en lotes para evitar rate-limit) ───
    const BATCH_SIZE = 2;
    const BATCH_DELAY_MS = 1500; // 1.5s entre lotes
    const validResults = [];

    for (let i = 0; i < MODELS.length; i += BATCH_SIZE) {
      const batch = MODELS.slice(i, i + BATCH_SIZE);
      console.log(`📦 Lote ${Math.floor(i/BATCH_SIZE)+1}: ${batch.map(m => m.name).join(', ')}`);
      
      const batchResults = await Promise.all(batch.map(model => fetchModelStats(model, dateRange)));
      batchResults.forEach(r => { if (r) validResults.push(r); });

      // Esperar entre lotes (excepto el último)
      if (i + BATCH_SIZE < MODELS.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`✅ Modelos con datos: ${validResults.length}/${MODELS.length}`);

    return res.status(200).json({
      success: true,
      data: validResults,
      total: validResults.length,
      period: dateRange ? { start: start_date, end: end_date } : 'current_month',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in models-stats endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// ═══════════════════════════════════════════
// CONFIGURACIÓN DE MODELOS (IDs reales de OnlyMonster)
// ═══════════════════════════════════════════

const MODELS = [
  { id: '85825874', name: 'Carmen', username: '@carmencitax' },
  { id: '314027187', name: 'Lucy', username: '@lucygarcia' },
  { id: '296183678', name: 'Bellarey', username: '@bellarey1' },
  { id: '326911669', name: 'Lexi', username: '@lexiflix' },
  { id: '436482929', name: 'Vicky', username: '@xvickyluna' },
  { id: '489272079', name: 'Ariana', username: '@arianacruzz' },
  { id: '412328657', name: 'Nessa', username: '@nessaplay' }
];

// ═══════════════════════════════════════════
// FETCH CON PAGINACIÓN (igual que api/accounts.js)
// ═══════════════════════════════════════════

async function fetchAllTransactions(accountId, startDate, endDate) {
  let allItems = [];
  let cursor = null;
  const MAX_RETRIES = 3;

  do {
    let url = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/transactions?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=1000`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    let success = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-om-auth-token': ONLYMONSTER_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const items = result.items || [];
          allItems = allItems.concat(items);
          cursor = result.cursor || null;
          success = true;
          break;
        }

        // Rate limit (429) o server error (5xx) → retry con backoff
        if (response.status === 429 || response.status >= 500) {
          const waitMs = attempt * 2000; // 2s, 4s, 6s
          console.warn(`⚠️ ${accountId} attempt ${attempt}/${MAX_RETRIES}: HTTP ${response.status}, waiting ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        // Otro error (4xx) → no reintentar
        console.error(`❌ OnlyMonster API Error for ${accountId}: ${response.status}`);
        cursor = null;
        success = true; // salir del retry loop sin más intentos
        break;

      } catch (fetchError) {
        const waitMs = attempt * 2000;
        console.warn(`⚠️ ${accountId} attempt ${attempt}/${MAX_RETRIES}: ${fetchError.message}, waiting ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    if (!success) {
      console.error(`❌ ${accountId}: All ${MAX_RETRIES} retries failed, returning partial data (${allItems.length} items)`);
      break;
    }

  } while (cursor);

  return allItems;
}

// ═══════════════════════════════════════════
// CALCULAR STATS DE UNA MODELO (mes actual)
// ═══════════════════════════════════════════

async function fetchModelStats(model, dateRange) {
  try {
    const now = new Date();

    // Si hay dateRange personalizado, usar esas fechas; sino, mes actual
    const rangeStart = dateRange ? dateRange.start : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
    const rangeEnd = dateRange ? dateRange.end : now;

    // Calcular días transcurridos en el rango para proyección
    const rangeDays = Math.max(1, Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)));

    // Hoy (siempre relativo a ahora, pero solo tiene sentido si el rango incluye hoy)
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
    const todayIncluded = rangeEnd >= todayStart && rangeStart <= rangeEnd;

    // Semana (últimos 7 días desde hoy)
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const transactions = await fetchAllTransactions(model.id, rangeStart, rangeEnd);

    // Calcular métricas
    let totalRevenue = 0;
    let todayRevenue = 0;
    let weekRevenue = 0;
    let subscriptionRevenue = 0;
    let ppvRevenue = 0;
    let tipRevenue = 0;
    let messageCount = 0;
    let messageRevenue = 0;
    let uniqueFans = new Set();
    let fansToday = new Set();
    let fansThisWeek = new Set();
    let fansInRange = new Set();
    let dailyRevenue = {};

    transactions.forEach(tx => {
      // Incluir done, loading y pending_return para coincidir con OF
      if (tx.status === 'failed' || tx.status === 'rejected') return;

      const netAmount = tx.amount * 0.8; // Después del 20% de OF
      totalRevenue += netAmount;

      const txDate = new Date(tx.timestamp);
      const dateKey = txDate.toISOString().split('T')[0];

      // Revenue diario
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + netAmount;

      // Revenue hoy
      if (todayIncluded && txDate >= todayStart) {
        todayRevenue += netAmount;
      }

      // Revenue semana
      if (txDate >= weekStart) {
        weekRevenue += netAmount;
      }

      // Fans
      const fanId = tx.fan?.id;
      if (fanId) {
        uniqueFans.add(fanId);
        fansInRange.add(fanId);
        if (todayIncluded && txDate >= todayStart) fansToday.add(fanId);
        if (txDate >= weekStart) fansThisWeek.add(fanId);
      }

      // Categorizar tipo
      const type = (tx.type || '').toLowerCase();
      if (type.includes('subscription') || type.includes('recurring')) {
        subscriptionRevenue += netAmount;
      } else if (type.includes('tip')) {
        tipRevenue += netAmount;
      } else if (type.includes('message') || type.includes('payment for message')) {
        ppvRevenue += netAmount;
        messageRevenue += netAmount;
        messageCount++;
      } else {
        ppvRevenue += netAmount;
      }
    });

    // Proyección mensual
    // Si es el mes actual, proyectar basado en días transcurridos del mes
    const isCurrentMonth = !dateRange || (
      rangeStart.getUTCMonth() === now.getMonth() && rangeStart.getUTCFullYear() === now.getFullYear()
    );
    let projection = 0;
    if (isCurrentMonth) {
      const currentDay = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      projection = currentDay > 0 ? (totalRevenue / currentDay) * daysInMonth : 0;
    } else {
      // Para rangos pasados, la proyección no aplica tanto pero podemos extrapolar a 30 días
      projection = rangeDays > 0 ? (totalRevenue / rangeDays) * 30 : 0;
    }

    return {
      id: model.id,
      name: model.name,
      onlyFansUsername: model.username,
      onlyMonsterId: model.id,

      // Facturación (NET después del 20% OF)
      earningsToday: Math.round(todayRevenue * 100) / 100,
      earningsThisWeek: Math.round(weekRevenue * 100) / 100,
      earningsThisMonth: Math.round(totalRevenue * 100) / 100,
      earningsTotal: Math.round(totalRevenue * 100) / 100,
      projection: Math.round(projection * 100) / 100,

      // Desglose
      subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
      ppvRevenue: Math.round(ppvRevenue * 100) / 100,
      tipRevenue: Math.round(tipRevenue * 100) / 100,

      // Suscriptores/Fans activos
      totalSubscribers: uniqueFans.size,
      activeSubscribers: fansInRange.size,
      newSubscribersToday: fansToday.size,
      newSubscribersThisWeek: fansThisWeek.size,
      newSubscribersThisMonth: fansInRange.size,

      // Mensajes
      messagesReceived: 0,
      messagesSent: messageCount,
      responseRate: 0,
      averageResponseTime: 0,
      avgMessagePrice: messageCount > 0 ? Math.round((messageRevenue / messageCount) * 100) / 100 : 0,

      // Contenido
      postsThisMonth: 0,
      storiesThisMonth: 0,

      // Transacciones
      transactionCount: transactions.length,

      // Metadata
      lastUpdated: new Date().toISOString(),
      period: dateRange ? {
        start: rangeStart.toISOString().split('T')[0],
        end: rangeEnd.toISOString().split('T')[0]
      } : 'current_month'
    };
  } catch (error) {
    console.error(`Error processing ${model.name}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════
// BILLING HISTORY (revenue por día)
// ═══════════════════════════════════════════

async function fetchDailyBilling(modelId, days) {
  try {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0));
    const endDate = now;

    const transactions = await fetchAllTransactions(modelId, startDate, endDate);

    // Agrupar por día
    const dailyMap = {};
    const dailyFans = {};

    transactions.forEach(tx => {
      // Incluir done, loading y pending_return para coincidir con OF
      if (tx.status === 'failed' || tx.status === 'rejected') return;

      const netAmount = tx.amount * 0.8;
      const txDate = new Date(tx.timestamp);
      const dateKey = txDate.toISOString().split('T')[0];

      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + netAmount;

      if (!dailyFans[dateKey]) dailyFans[dateKey] = new Set();
      if (tx.fan?.id) dailyFans[dateKey].add(tx.fan.id);
    });

    // Generar array ordenado
    const result = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      result.push({
        date: key,
        earnings: Math.round((dailyMap[key] || 0) * 100) / 100,
        newSubs: dailyFans[key] ? dailyFans[key].size : 0,
        activeSubs: 0
      });
    }

    return result;
  } catch (error) {
    console.error(`Error fetching billing for ${modelId}:`, error);
    return [];
  }
}
