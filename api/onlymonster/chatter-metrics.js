/**
 * API Endpoint CONSOLIDADO: /api/onlymonster/chatter-metrics
 *
 * Obtiene metricas REALES por chatter usando /api/v0/users/metrics de OnlyMonster.
 * Incluye: reply time, messages (total/AI/media/PPV), revenue real, fans, chargebacks, etc.
 *
 * Modos:
 *   GET ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD                        -> Todos los chatters
 *   GET ?start_date=...&end_date=...&user_id=XXX                          -> Un chatter especifico
 *   GET ?start_date=...&end_date=...&account_id=XXX                       -> Filtrado por cuenta (creator_ids)
 *   GET ?user_id=XXX&history=true&days=30                                  -> Historial diario (/users/metrics-based)
 *   GET ?fans_only=true&om_account_id=XXX                                  -> Lista de fan IDs activos
 *   GET ?messages=true&om_account_id=XXX&chat_id=YYY                      -> Mensajes de un chat
 */

const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY =
  process.env.ONLYMONSTER_API_KEY ||
  'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

const round2 = (n) => Math.round(n * 100) / 100;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { start_date, end_date, user_id, creator_id, history, days, account_id, fans_only, messages, om_account_id, chat_id } = req.query;

  try {
    // --- MODO FANS: GET /api/v0/accounts/{id}/fans ---
    if (fans_only === 'true' && om_account_id) {
      const fansData = await fetchAccountFans(om_account_id);
      return res.status(200).json({
        success: true,
        data: { fan_ids: fansData },
        timestamp: new Date().toISOString()
      });
    }

    // --- MODO MENSAJES: GET /api/v0/accounts/{id}/chats/{chat_id}/messages ---
    if (messages === 'true' && om_account_id && chat_id) {
      const messagesData = await fetchChatMessages(om_account_id, chat_id);
      return res.status(200).json({
        success: true,
        data: { items: messagesData },
        timestamp: new Date().toISOString()
      });
    }

    // --- MODO HISTORIAL: daily /users/metrics breakdown ---
    if (user_id && history === 'true') {
      const daysNum = parseInt(days) || 30;
      const historyData = await fetchChatterHistory(user_id, daysNum);
      return res.status(200).json({
        success: true,
        data: historyData,
        user_id,
        timestamp: new Date().toISOString()
      });
    }

    // --- MODO METRICAS: /users/metrics endpoint ---
    const now = new Date();
    const startDate = start_date
      ? new Date(start_date + 'T00:00:00.000Z')
      : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
    const endDate = end_date
      ? new Date(end_date + 'T23:59:59.999Z')
      : now;

    // Pasar creator_ids[] cuando hay account_id o creator_id para filtrado server-side
    const creatorIds = creator_id ? [creator_id] : account_id ? [account_id] : null;
    // Pasar user_ids[] cuando hay user_id (usado junto con creator_id para desglose por modelo)
    const userIds = user_id ? [user_id] : null;
    const metricsData = await fetchUserMetrics(startDate, endDate, creatorIds, userIds);

    // Filtrar por user_id si se especifica (sin creator_id, filtrado client-side fallback)
    if (user_id && !creator_id) {
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

// =============================================
// FETCH METRICAS REALES DE /users/metrics
// =============================================

/**
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string[]|null} creatorIds - Si se pasa, filtra por creator_ids[] en la API
 * @param {string[]|null} userIds - Si se pasa, filtra por user_ids[] en la API
 */
async function fetchUserMetrics(startDate, endDate, creatorIds, userIds) {
  const from = startDate.toISOString();
  const to = endDate.toISOString();

  let url = `${ONLYMONSTER_BASE_URL}/api/v0/users/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&offset=0&limit=100`;

  // Append creator_ids[] when filtering by account
  if (creatorIds && creatorIds.length > 0) {
    creatorIds.forEach(id => {
      url += `&creator_ids[]=${encodeURIComponent(id)}`;
    });
    console.log('Fetching /users/metrics with creator_ids:', creatorIds);
  }

  // Append user_ids[] when filtering by specific user (used for per-model breakdown)
  if (userIds && userIds.length > 0) {
    userIds.forEach(id => {
      url += `&user_ids[]=${encodeURIComponent(id)}`;
    });
    console.log('Fetching /users/metrics with user_ids:', userIds);
  }

  console.log('Fetching /users/metrics:', url);

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
        console.warn(`/users/metrics attempt ${attempt}/${MAX_RETRIES}: HTTP ${response.status}, waiting ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      throw new Error(`OnlyMonster /users/metrics HTTP ${response.status}`);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const waitMs = attempt * 2000;
      console.warn(`/users/metrics attempt ${attempt}: ${err.message}, waiting ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  if (!responseData || !responseData.items) {
    throw new Error('No data returned from /users/metrics');
  }

  const items = responseData.items;
  console.log(`Got ${items.length} user metrics items`);

  // Map all items to enriched format (no hardcoded filter)
  const results = items.map(item => mapMetricsItem(item, from, to));

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

// =============================================
// MAP RAW METRICS ITEM -> ENRICHED FORMAT
// =============================================

function mapMetricsItem(item, from, to) {
  // Revenue calculation: NET = (sold_messages + tips + sold_posts) x 0.8
  const soldMsgsGross = item.sold_messages_price_sum || 0;
  const tipsGross = item.tips_amount_sum || 0;
  const soldPostsGross = item.sold_posts_price_sum || 0;
  const totalNet = (soldMsgsGross + tipsGross + soldPostsGross) * 0.8;

  const totalMsgs = item.messages_count || 0;
  const paidSent = item.paid_messages_count || 0;
  const sold = item.sold_messages_count || 0;

  // creator_ids from the API response - lets the frontend resolve names
  const creatorIds = item.creator_ids || [];

  return {
    user_id: String(item.user_id),
    user_name: item.user_name || item.name || `User ${item.user_id}`,
    creator_ids: creatorIds,
    accounts: [],   // frontend resolves names via useOMConfig
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

// =============================================
// HISTORIAL DIARIO (/users/metrics por dia, en batches de 7)
// =============================================

async function fetchChatterHistory(userId, days) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // Build array of day ranges
  const dayRanges = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setUTCDate(dayStart.getUTCDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);
    dayRanges.push({ date: dayStart.toISOString().split('T')[0], from: dayStart, to: dayEnd });
  }

  const results = [];
  const BATCH_SIZE = 7;

  for (let b = 0; b < dayRanges.length; b += BATCH_SIZE) {
    const batch = dayRanges.slice(b, b + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ({ date, from, to }) => {
        try {
          const url = `${ONLYMONSTER_BASE_URL}/api/v0/users/metrics?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&user_ids[]=${userId}&offset=0&limit=10`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'x-om-auth-token': ONLYMONSTER_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) return { date, sales: 0, messages: 0, fans: 0, conversion: 0 };

          const data = await response.json();
          const item = (data.items || []).find(i => String(i.user_id) === userId);

          if (!item) return { date, sales: 0, messages: 0, fans: 0, conversion: 0 };

          const gross = (item.sold_messages_price_sum || 0) + (item.tips_amount_sum || 0) + (item.sold_posts_price_sum || 0);
          const net = round2(gross * 0.8);
          const msgs = item.messages_count || 0;
          const fans = item.fans_count || 0;
          const paidSent = item.paid_messages_count || 0;
          const sold = item.sold_messages_count || 0;
          const conversion = paidSent > 0 ? round2((sold / paidSent) * 100) : 0;

          return { date, sales: net, messages: msgs, fans, conversion };
        } catch (err) {
          return { date, sales: 0, messages: 0, fans: 0, conversion: 0 };
        }
      })
    );

    results.push(...batchResults);

    // Wait between batches to respect rate limits
    if (b + BATCH_SIZE < dayRanges.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Return newest first
  return results.reverse();
}

// =============================================
// FETCH FANS DE UNA CUENTA /accounts/{id}/fans
// =============================================

async function fetchAccountFans(omAccountId) {
  const url = `${ONLYMONSTER_BASE_URL}/api/v0/accounts/${encodeURIComponent(omAccountId)}/fans?limit=10000`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-om-auth-token': ONLYMONSTER_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`OnlyMonster /accounts/${omAccountId}/fans HTTP ${response.status}`);
  }

  const data = await response.json();
  // OM API returns { fan_ids: ["id1", "id2", ...] }
  if (data.fan_ids && Array.isArray(data.fan_ids)) {
    return data.fan_ids;
  }
  // Fallback for other possible structures
  const items = data.items || data.data || [];
  return items.map(item => String(item.id || item.fan_id || item.user_id || item));
}

// =============================================
// FETCH MENSAJES DE UN CHAT /accounts/{id}/chats/{chat_id}/messages
// =============================================

async function fetchChatMessages(omAccountId, chatId) {
  const url = `${ONLYMONSTER_BASE_URL}/api/v0/accounts/${encodeURIComponent(omAccountId)}/chats/${encodeURIComponent(chatId)}/messages?limit=50&order=desc`;
  console.log('Fetching /accounts/chats/messages:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-om-auth-token': ONLYMONSTER_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`OnlyMonster /accounts/${omAccountId}/chats/${chatId}/messages HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.items || data.data || [];
}
