/**
 * API Endpoint CONSOLIDADO: /api/onlymonster/chatter-metrics
 * 
 * Obtiene métricas REALES por chatter usando /api/v0/users/metrics de OnlyMonster.
 * Incluye: reply time, messages (total/AI/media/PPV), revenue real, fans, chargebacks, etc.
 * 
 * Modos:
 *   GET ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD           → Todos los chatters
 *   GET ?start_date=...&end_date=...&user_id=XXX              → Un chatter específico
 *   GET ?user_id=XXX&history=true&days=30                     → Historial diario (transactions-based)
 */

const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY = process.env.ONLYMONSTER_API_KEY || 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

// ═══════════════════════════════════════════
// CONFIGURACIÓN: Chatters y sus cuentas asignadas
// ═══════════════════════════════════════════

const CHATTERS = [
  { id: '25140', name: 'Nico', accountNames: ['Bellarey', 'Vicky'], assignedAccounts: ['296183678', '436482929'] },
  { id: '66986', name: 'Alfonso', accountNames: ['Bellarey', 'Vicky'], assignedAccounts: ['296183678', '436482929'] },
  { id: '125226', name: 'Yaye', accountNames: ['Carmen', 'Lucy', 'Lexi'], assignedAccounts: ['85825874', '314027187', '326911669'] },
  { id: '121434', name: 'Diego', accountNames: ['Nessa', 'Ariana'], assignedAccounts: ['412328657', '489272079'] },
  { id: '124700', name: 'Kari', accountNames: ['Bellarey', 'Vicky'], assignedAccounts: ['296183678', '436482929'] },
  { id: '139826', name: 'Emely', accountNames: ['Carmen', 'Lucy', 'Lexi'], assignedAccounts: ['85825874', '314027187', '326911669'] },
  { id: '145754', name: 'Carlo', accountNames: ['Carmen', 'Lucy', 'Lexi'], assignedAccounts: ['85825874', '314027187', '326911669'] }
];

const ACCOUNTS = [
  { id: '85825874', name: 'Carmen' },
  { id: '314027187', name: 'Lucy' },
  { id: '296183678', name: 'Bellarey' },
  { id: '326911669', name: 'Lexi' },
  { id: '436482929', name: 'Vicky' },
  { id: '489272079', name: 'Ariana' },
  { id: '412328657', name: 'Nessa' }
];

const round2 = (n) => Math.round(n * 100) / 100;

// Para historial diario (usa transactions, no metrics)
function getChattersPerAccount() {
  const map = {};
  ACCOUNTS.forEach(a => { map[a.id] = []; });
  CHATTERS.forEach(c => {
    c.assignedAccounts.forEach(accId => {
      if (map[accId]) map[accId].push(c.id);
    });
  });
  return map;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { start_date, end_date, user_id, history, days, account_id } = req.query;

  try {
    // ─── MODO HISTORIAL: transactions-based daily breakdown ───
    if (user_id && history === 'true') {
      const chatter = CHATTERS.find(c => c.id === user_id);
      if (!chatter) return res.status(404).json({ success: false, error: 'Chatter not found' });
      const daysNum = parseInt(days) || 30;
      const historyData = await fetchChatterHistory(chatter, daysNum);
      return res.status(200).json({
        success: true,
        data: historyData,
        chatter: chatter.name,
        timestamp: new Date().toISOString()
      });
    }

    // ─── MODO MÉTRICAS REALES: /users/metrics endpoint ───
    const now = new Date();
    const startDate = start_date
      ? new Date(start_date + 'T00:00:00.000Z')
      : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
    const endDate = end_date
      ? new Date(end_date + 'T23:59:59.999Z')
      : now;

    // ✅ Si se especifica account_id, intentar obtener métricas PER-ACCOUNT
    let metricsData;
    if (account_id) {
      console.log(`📊 Fetching per-account metrics for account: ${account_id}`);
      metricsData = await fetchPerAccountMetrics(startDate, endDate, account_id);
    } else {
      metricsData = await fetchUserMetrics(startDate, endDate);
    }

    // Filtrar por user_id si se especifica
    if (user_id) {
      const filtered = metricsData.filter(m => m.user_id === user_id);
      return res.status(200).json({
        success: true,
        data: filtered,
        filtered_by: { user_id, account_id: account_id || null },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      data: metricsData,
      total: metricsData.length,
      filtered_by: { account_id: account_id || null },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in chatter-metrics endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// ═══════════════════════════════════════════
// FETCH MÉTRICAS REALES DE /users/metrics
// ═══════════════════════════════════════════

async function fetchUserMetrics(startDate, endDate) {
  const from = startDate.toISOString();
  const to = endDate.toISOString();

  const url = `${ONLYMONSTER_BASE_URL}/api/v0/users/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&offset=0&limit=100`;
  console.log('📊 Fetching /users/metrics:', url);

  const MAX_RETRIES = 3;
  let responseData = null;

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
        responseData = await response.json();
        break;
      }

      if (response.status === 429 || response.status >= 500) {
        const waitMs = attempt * 2000;
        console.warn(`⚠️ /users/metrics attempt ${attempt}/${MAX_RETRIES}: HTTP ${response.status}, waiting ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      throw new Error(`OnlyMonster /users/metrics HTTP ${response.status}`);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const waitMs = attempt * 2000;
      console.warn(`⚠️ /users/metrics attempt ${attempt}: ${err.message}, waiting ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  if (!responseData || !responseData.items) {
    throw new Error('No data returned from /users/metrics');
  }

  const items = responseData.items;
  console.log(`📊 Got ${items.length} user metrics items`);

  // Filter to known chatters only
  const knownIds = new Set(CHATTERS.map(c => c.id));
  const chatterItems = items.filter(i => knownIds.has(String(i.user_id)));
  console.log(`📊 Filtered to ${chatterItems.length} known chatters`);

  // Map to enriched format
  const results = chatterItems.map(item => mapMetricsItem(item, from, to));

  // Calculate impact percentage
  const totalRevenue = results.reduce((sum, c) => sum + c.revenue.total_net, 0);
  results.forEach(c => {
    c.revenue.impact_percentage = totalRevenue > 0
      ? round2((c.revenue.total_net / totalRevenue) * 100)
      : 0;
  });

  // Sort by revenue descending
  results.sort((a, b) => b.revenue.total_net - a.revenue.total_net);

  return results;
}

function mapMetricsItem(item, from, to) {
  const chatter = CHATTERS.find(c => c.id === String(item.user_id));

  // Revenue calculation: NET = (sold_messages + tips + sold_posts) × 0.8
  const soldMsgsGross = item.sold_messages_price_sum || 0;
  const tipsGross = item.tips_amount_sum || 0;
  const soldPostsGross = item.sold_posts_price_sum || 0;
  const totalNet = (soldMsgsGross + tipsGross + soldPostsGross) * 0.8;

  const totalMsgs = item.messages_count || 0;
  const paidSent = item.paid_messages_count || 0;
  const sold = item.sold_messages_count || 0;

  return {
    user_id: String(item.user_id),
    user_name: chatter?.name || `User ${item.user_id}`,
    accounts: chatter?.accountNames || [],
    period: { start: from, end: to },
    revenue: {
      total_net: round2(totalNet),
      sold_messages_gross: round2(soldMsgsGross),
      tips_gross: round2(tipsGross),
      sold_posts_gross: round2(soldPostsGross),
      paid_messages_price: round2(item.paid_messages_price_sum || 0),
      impact_percentage: 0
    },
    messages: {
      total: totalMsgs,
      ai_generated: item.ai_generated_messages_count || 0,
      copied: item.copied_messages_count || 0,
      media: item.media_messages_count || 0,
      paid_sent: paidSent,
      sold: sold,
      unsent: item.unsent_messages_count || 0,
      templates_used: item.internal_templates_count || 0,
      words_count: item.words_count_sum || 0
    },
    performance: {
      reply_time_avg_seconds: round2(item.reply_time_avg || 0),
      reply_time_avg_minutes: round2((item.reply_time_avg || 0) / 60),
      purchase_interval_avg_seconds: round2(item.purchase_interval_avg || 0),
      purchase_interval_avg_minutes: round2((item.purchase_interval_avg || 0) / 60),
      revenue_per_message: totalMsgs > 0 ? round2(totalNet / totalMsgs) : 0,
      conversion_rate: paidSent > 0 ? round2((sold / paidSent) * 100) : 0
    },
    fans_count: item.fans_count || 0,
    posts_count: item.posts_count || 0,
    deleted_posts_count: item.deleted_posts_count || 0,
    chargebacks: {
      tips: round2(item.chargedback_tips_amount_sum || 0),
      messages_price: round2(item.chargedback_messages_price_sum || 0),
      messages_count: item.chargedback_messages_count || 0,
      posts_price: round2(item.chargedback_posts_price_sum || 0),
      posts_count: item.chargedback_posts_count || 0
    },
    lastUpdated: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════
// FETCH PER-ACCOUNT METRICS (filtered by account_id)
// ═══════════════════════════════════════════

async function fetchPerAccountMetrics(startDate, endDate, accountId) {
  const from = startDate.toISOString();
  const to = endDate.toISOString();
  const account = ACCOUNTS.find(a => a.id === accountId);
  const accountName = account?.name || 'Unknown';

  // Only chatters assigned to this account
  const assignedChatters = CHATTERS.filter(c => c.assignedAccounts.includes(accountId));
  if (assignedChatters.length === 0) {
    console.log(`📊 No chatters assigned to account ${accountId} (${accountName})`);
    return [];
  }

  console.log(`📊 Fetching per-account metrics for ${accountName} (${accountId}), ${assignedChatters.length} chatters assigned`);

  // Try account-specific endpoint first
  const url = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/users/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&offset=0&limit=100`;
  console.log('📊 Trying per-account endpoint:', url);

  const MAX_RETRIES = 3;
  let responseData = null;
  let usedPerAccount = false;

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
        responseData = await response.json();
        usedPerAccount = true;
        console.log(`✅ Per-account endpoint worked for ${accountName}! Got ${responseData.items?.length || 0} items`);
        break;
      }

      if (response.status === 404) {
        console.log(`⚠️ Per-account endpoint not available (404), falling back to global`);
        break;
      }

      if (response.status === 429 || response.status >= 500) {
        const waitMs = attempt * 2000;
        console.warn(`⚠️ Per-account attempt ${attempt}/${MAX_RETRIES}: HTTP ${response.status}, waiting ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      console.log(`⚠️ Per-account returned HTTP ${response.status}, falling back to global`);
      break;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.warn(`⚠️ Per-account failed after ${MAX_RETRIES} attempts, falling back to global`);
        break;
      }
      const waitMs = attempt * 2000;
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  // If per-account endpoint worked, use its data
  if (usedPerAccount && responseData?.items) {
    const items = responseData.items;
    const knownIds = new Set(assignedChatters.map(c => c.id));
    const chatterItems = items.filter(i => knownIds.has(String(i.user_id)));
    console.log(`📊 Per-account: ${chatterItems.length} chatters with data on ${accountName}`);

    const results = chatterItems.map(item => {
      const mapped = mapMetricsItem(item, from, to);
      mapped._filteredAccount = accountName;
      mapped._filteredAccountId = accountId;
      return mapped;
    });

    // Calculate impact percentage within this account
    const totalRevenue = results.reduce((sum, c) => sum + c.revenue.total_net, 0);
    results.forEach(c => {
      c.revenue.impact_percentage = totalRevenue > 0 ? round2((c.revenue.total_net / totalRevenue) * 100) : 0;
    });
    results.sort((a, b) => b.revenue.total_net - a.revenue.total_net);

    return results;
  }

  // Fallback: fetch global metrics and filter to assigned chatters
  console.log(`📊 Fallback: using global metrics filtered to ${accountName} chatters`);
  const globalData = await fetchUserMetrics(startDate, endDate);
  const assignedIds = new Set(assignedChatters.map(c => c.id));
  const filtered = globalData.filter(c => assignedIds.has(c.user_id));

  // Mark as filtered (but metrics are global, not per-account)
  filtered.forEach(c => {
    c._filteredAccount = accountName;
    c._filteredAccountId = accountId;
    c._isGlobalFallback = true;
  });

  return filtered;
}

// ═══════════════════════════════════════════
// HISTORIAL DIARIO (transactions-based, para gráficos)
// ═══════════════════════════════════════════

async function fetchAllTransactions(accountId, startDate, endDate) {
  let allItems = [];
  let cursor = null;
  const MAX_RETRIES = 3;

  do {
    let url = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/transactions?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=1000`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

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
          allItems = allItems.concat(result.items || []);
          cursor = result.cursor || null;
          success = true;
          break;
        }

        if (response.status === 429 || response.status >= 500) {
          const waitMs = attempt * 2000;
          console.warn(`⚠️ ${accountId} attempt ${attempt}/${MAX_RETRIES}: HTTP ${response.status}, waiting ${waitMs}ms`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        console.error(`❌ OnlyMonster API Error for ${accountId}: ${response.status}`);
        cursor = null;
        success = true;
        break;
      } catch (err) {
        const waitMs = attempt * 2000;
        console.warn(`⚠️ ${accountId} attempt ${attempt}: ${err.message}, waiting ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    if (!success) {
      console.error(`❌ ${accountId}: All retries failed`);
      break;
    }
  } while (cursor);

  return allItems;
}

async function fetchChatterHistory(chatter, days) {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0));
  const endDate = now;
  const chattersPerAccount = getChattersPerAccount();

  // Fetch all assigned accounts
  const accountTransactions = {};
  for (let i = 0; i < chatter.assignedAccounts.length; i++) {
    const accId = chatter.assignedAccounts[i];
    accountTransactions[accId] = await fetchAllTransactions(accId, startDate, endDate);
    if (i < chatter.assignedAccounts.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Build daily data
  const dailyMap = {};
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { sales: 0, messages: 0, fans: new Set() };
  }

  chatter.assignedAccounts.forEach(accId => {
    const txs = accountTransactions[accId] || [];
    const numChatters = chattersPerAccount[accId]?.length || 1;
    const share = 1 / numChatters;

    txs.forEach(tx => {
      if (tx.status !== 'done' && tx.status !== 'loading') return;
      const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) return;

      dailyMap[dateKey].sales += tx.amount * 0.8 * share;

      const type = (tx.type || '').toLowerCase();
      if (type.includes('message') || type.includes('payment for message')) {
        dailyMap[dateKey].messages += Math.round(share);
      }
      if (tx.fan?.id) dailyMap[dateKey].fans.add(tx.fan.id);
    });
  });

  return Object.entries(dailyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({
      date,
      sales: Math.round(data.sales * 100) / 100,
      messages: data.messages,
      fans: data.fans.size,
      conversion: data.fans.size > 0 ? Math.round((data.messages / data.fans.size) * 100 * 10) / 10 : 0
    }));
}
