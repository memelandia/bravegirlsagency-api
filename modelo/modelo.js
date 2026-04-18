/* ============================================
   BraveGirls — Model Dashboard Logic v2
   Reads slug from window.MODEL_SLUG
   Full stats from OnlyMonster + recording tracker
   ============================================ */

(function () {
  'use strict';

  // ═══ INIT ═══
  var slug = window.MODEL_SLUG;
  if (!slug) { console.error('MODEL_SLUG not defined'); return; }

  var SESSION_KEY = 'bg-model-session';
  var STATS_CACHE_KEY = 'bg-model-stats-' + slug;

  function getCustomGoal() {
    var cfg = getModelConfig();
    return (cfg && cfg.monthlyGoal) ? cfg.monthlyGoal : null;
  }

  function getModelConfig() {
    if (!window.CONFIG || !window.CONFIG.users) return null;
    return window.CONFIG.users.models.find(function (m) { return m.slug === slug; });
  }

  // ═══ DOM READY ═══
  document.addEventListener('DOMContentLoaded', function () {
    var modelCfg = getModelConfig();
    if (!modelCfg) {
      document.getElementById('login-greeting').textContent = 'Modelo no encontrada';
      return;
    }

    document.getElementById('login-greeting').textContent = 'Hola, ' + modelCfg.name + ' 👋';
    document.getElementById('dash-model-name').textContent = modelCfg.name;

    var session = getSession();
    if (session && session.slug === slug) {
      showDashboardScreen(modelCfg);
      return;
    }

    var form = document.getElementById('login-form');
    var input = document.getElementById('login-password');
    var errorEl = document.getElementById('login-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = input.value.trim();
      if (pw === modelCfg.dashboardPassword) {
        saveSession(modelCfg);
        showDashboardScreen(modelCfg);
      } else {
        errorEl.textContent = 'Contraseña incorrecta';
        input.classList.add('shake');
        setTimeout(function () { input.classList.remove('shake'); }, 500);
      }
    });
  });

  // ═══ SESSION ═══
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function saveSession(cfg) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ modelId: cfg.id, slug: cfg.slug }));
  }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  // ═══ SHOW DASHBOARD ═══
  function showDashboardScreen(cfg) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').classList.add('active');
    document.getElementById('logout-btn').addEventListener('click', function () {
      clearSession();
      location.reload();
    });

    // Inject refresh FAB
    var fab = document.createElement('button');
    fab.id = 'refresh-fab';
    fab.className = 'refresh-fab';
    fab.innerHTML = '🔄';
    fab.title = 'Actualizar datos';
    fab.addEventListener('click', function () {
      fab.classList.add('spinning');
      loadAllData(cfg).then(function () {
        fab.classList.remove('spinning');
      }).catch(function () {
        fab.classList.remove('spinning');
      });
    });
    document.getElementById('dashboard-screen').appendChild(fab);

    // Load cached stats instantly, then fresh data
    var cached = loadStatsCache();
    if (cached) {
      var statsContainer = document.getElementById('stats-section');
      renderFullStats(statsContainer, cached.current, cached.lastSame, cached.lastFull, cached.period);
      updateHeaderTimestamp(cached.ts);
    }

    loadAllData(cfg);
  }

  // ═══ STATS CACHE ═══
  function saveStatsCache(current, lastSame, lastFull, period) {
    try {
      localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
        current: current, lastSame: lastSame, lastFull: lastFull, period: period, ts: Date.now()
      }));
    } catch(e) {}
  }
  function loadStatsCache() {
    try {
      var raw = localStorage.getItem(STATS_CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      // Expire after 6 hours
      if (Date.now() - cached.ts > 6 * 60 * 60 * 1000) return null;
      return cached;
    } catch(e) { return null; }
  }

  function updateHeaderTimestamp(ts) {
    var el = document.getElementById('header-timestamp');
    if (!el) return;
    if (!ts) { el.textContent = ''; return; }
    var d = typeof ts === 'number' ? new Date(ts) : new Date();
    el.textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  // ═══ DATA LOADING ═══
  async function loadAllData(cfg) {
    var statsContainer = document.getElementById('stats-section');
    var recordingContainer = document.getElementById('recording-section');
    var agencyMsgContainer = document.getElementById('agency-msg-section');

    statsContainer.innerHTML = renderSkeletons('stats');
    recordingContainer.innerHTML = renderSkeletons('recording');

    // Agency message — removed by design
    agencyMsgContainer.classList.add('hidden');

    // OnlyFans stats
    var hasOM = cfg.onlyMonsterId && cfg.onlyMonsterId !== 'PENDING' && cfg.onlyMonsterId !== 'MODELO_ID_AQUI';
    if (hasOM) {
      loadOnlyFansStats(cfg, statsContainer);
    } else {
      statsContainer.innerHTML =
        '<div class="error-state"><div class="icon">📊</div>' +
        '<div class="msg">Estadísticas de OnlyFans no disponibles aún.<br>Tu cuenta se está configurando.</div></div>';
    }

    // Recording data
    if (cfg.driveKey) {
      loadRecordingData(cfg, recordingContainer);
    } else {
      recordingContainer.innerHTML =
        '<div class="error-state"><div class="icon">📹</div>' +
        '<div class="msg">Sin datos de grabación disponibles.</div></div>';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ONLYFANS STATS — FULL (from dashboard-modelo.js)
  // ═══════════════════════════════════════════════════════════
  async function loadOnlyFansStats(cfg, container) {
    try {
      var omId = cfg.onlyMonsterId;
      var now = new Date();
      var currentDay = now.getDate();

      var currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
      var currentMonthEnd = now;
      var lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0));
      var lastMonthSamePeriodEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, currentDay, 23, 59, 59, 999));
      var lastMonthFullEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));

      var results = await Promise.all([
        fetchAllTransactions(omId, currentMonthStart, currentMonthEnd),
        fetchAllTransactions(omId, lastMonthStart, lastMonthSamePeriodEnd),
        fetchAllTransactions(omId, lastMonthStart, lastMonthFullEnd)
      ]);

      var currentStats = calculateStats(results[0], 'current');
      currentStats._rawTransactions = results[0]; // keep for today timeline
      var lastSameStats = calculateStats(results[1], 'last');
      var lastFullStats = calculateStats(results[2], 'last');

      var monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      var periodInfo = {
        currentDay: currentDay,
        currentMonthName: capitalize(monthNames[now.getMonth()]),
        lastMonthName: capitalize(monthNames[now.getMonth() === 0 ? 11 : now.getMonth() - 1]),
        lastMonthTotalDays: lastMonthFullEnd.getDate()
      };

      renderFullStats(container, currentStats, lastSameStats, lastFullStats, periodInfo);
      saveStatsCache(currentStats, lastSameStats, lastFullStats, periodInfo);
      updateHeaderTimestamp(Date.now());
    } catch (err) {
      console.error('Stats error:', err);
      var errMsg = err.message || 'Error desconocido';
      var isApiDown = errMsg.indexOf('503') !== -1 || errMsg.indexOf('502') !== -1 || errMsg.indexOf('504') !== -1;
      var displayMsg = isApiDown
        ? 'El servicio de estadísticas está temporalmente fuera de línea. Suele resolverse en minutos.'
        : 'No se pudieron cargar tus stats (' + esc(errMsg) + ')';
      container.innerHTML =
        '<div class="error-state"><div class="icon">' + (isApiDown ? '🔧' : '⚠️') + '</div>' +
        '<div class="msg">' + displayMsg + '</div>' +
        '<button onclick="location.reload()" style="margin-top:1rem;padding:0.6rem 1.5rem;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">🔄 Reintentar</button></div>';
    }
  }

  // ═══ FETCH TRANSACTIONS ═══
  async function fetchAllTransactions(accountId, startDate, endDate) {
    var baseUrl = window.CONFIG.onlyMonsterApiUrl;
    var allItems = [];
    var cursor = null;
    do {
      var url = baseUrl + '/accounts?accountId=' + accountId +
        '&start=' + startDate.toISOString() +
        '&end=' + endDate.toISOString() + '&limit=1000';
      if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
      var response = await fetch(url);
      if (!response.ok) {
        var errData = await response.json().catch(function () { return {}; });
        throw new Error(errData.error || 'API Error: ' + response.status);
      }
      var result = await response.json();
      var items = result.items || [];
      allItems = allItems.concat(items);
      cursor = result.cursor || null;
    } while (cursor);
    return allItems;
  }

  // ═══ CALCULATE STATS (full version) ═══
  function calculateStats(transactions, period) {
    var totalRevenue = 0, subscriptionRevenue = 0, ppvRevenue = 0, tipRevenue = 0;
    var messageRevenue = 0, messageCount = 0;
    var uniqueFans = new Set();
    var fansToday = new Set();
    var fansThisWeek = new Set();
    var fansThisMonth = new Set();
    var recentActivity = 0;
    var bestDay = { date: null, amount: 0 };
    var dailyRevenue = {};
    var fanSpend = {}; // { fanId: { total, purchases, lastDate } }

    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    var weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    transactions.forEach(function (tx) {
      if (tx.status !== 'done' && tx.status !== 'loading') return;
      var netAmount = tx.amount * 0.8;
      totalRevenue += netAmount;

      var txDate = new Date(tx.timestamp);
      var dateKey = txDate.toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + netAmount;

      var fanId = tx.fan && tx.fan.id;
      if (fanId) {
        uniqueFans.add(fanId);
        fansThisMonth.add(fanId);
        if (txDate >= todayStart) fansToday.add(fanId);
        if (txDate >= weekStart) fansThisWeek.add(fanId);
        // Track per-fan spending
        if (!fanSpend[fanId]) fanSpend[fanId] = { total: 0, purchases: 0, lastDate: txDate };
        fanSpend[fanId].total += netAmount;
        fanSpend[fanId].purchases++;
        if (txDate > fanSpend[fanId].lastDate) fanSpend[fanId].lastDate = txDate;
      }

      var hoursSince = (now - txDate) / (1000 * 60 * 60);
      if (hoursSince <= 24) recentActivity++;

      var type = (tx.type || '').toLowerCase();
      if (type.includes('subscription') || type.includes('recurring')) {
        subscriptionRevenue += netAmount;
      } else if (type.includes('tip')) {
        tipRevenue += netAmount;
      } else if (type.includes('message') || type.includes('payment for message')) {
        ppvRevenue += netAmount;
        messageRevenue += netAmount;
        messageCount++;
      } else if (type.includes('post') || type.includes('purchase')) {
        ppvRevenue += netAmount;
      } else {
        ppvRevenue += netAmount;
      }
    });

    // Best day
    for (var date in dailyRevenue) {
      if (dailyRevenue[date] > bestDay.amount) {
        bestDay = { date: date, amount: dailyRevenue[date] };
      }
    }

    // Projection
    var projection = 0;
    if (period === 'current') {
      var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      var currentDay = now.getDate();
      if (currentDay > 0) projection = (totalRevenue / currentDay) * daysInMonth;
    }

    // Compute today/week revenue
    var todayRevenue = 0, weekRevenue = 0;
    var todayMsgCount = 0, weekMsgCount = 0;
    var todaySubRev = 0, weekSubRev = 0;
    var todayPpvRev = 0, weekPpvRev = 0;
    var todayTipRev = 0, weekTipRev = 0;
    transactions.forEach(function (tx) {
      if (tx.status !== 'done' && tx.status !== 'loading') return;
      var netAmt = tx.amount * 0.8;
      var txD = new Date(tx.timestamp);
      var txType = (tx.type || '').toLowerCase();
      var isSub = txType.includes('subscription') || txType.includes('recurring');
      var isTip = txType.includes('tip');
      var isMsg = txType.includes('message') || txType.includes('payment for message');
      if (txD >= todayStart) {
        todayRevenue += netAmt;
        if (isMsg) todayMsgCount++;
        if (isSub) todaySubRev += netAmt;
        else if (isTip) todayTipRev += netAmt;
        else todayPpvRev += netAmt;
      }
      if (txD >= weekStart) {
        weekRevenue += netAmt;
        if (isMsg) weekMsgCount++;
        if (isSub) weekSubRev += netAmt;
        else if (isTip) weekTipRev += netAmt;
        else weekPpvRev += netAmt;
      }
    });

    return {
      totalRevenue: totalRevenue,
      subscriptionRevenue: subscriptionRevenue,
      ppvRevenue: ppvRevenue,
      tipRevenue: tipRevenue,
      messageRevenue: messageRevenue,
      messageCount: messageCount,
      uniqueFans: uniqueFans.size,
      fansToday: fansToday.size,
      fansThisWeek: fansThisWeek.size,
      fansThisMonth: fansThisMonth.size,
      averagePerFan: uniqueFans.size > 0 ? (totalRevenue / uniqueFans.size) : 0,
      avgMessagePrice: messageCount > 0 ? (messageRevenue / messageCount) : 0,
      recentActivity: recentActivity,
      bestDay: bestDay,
      projection: projection,
      transactionCount: transactions.length,
      dailyRevenue: dailyRevenue,
      todayRevenue: todayRevenue,
      weekRevenue: weekRevenue,
      todayFans: fansToday.size,
      weekFans: fansThisWeek.size,
      todayMsgCount: todayMsgCount,
      weekMsgCount: weekMsgCount,
      todaySubRev: todaySubRev, todayPpvRev: todayPpvRev, todayTipRev: todayTipRev,
      weekSubRev: weekSubRev, weekPpvRev: weekPpvRev, weekTipRev: weekTipRev,
      topFans: buildTopFans(fanSpend, 5)
    };
  }

  function buildTopFans(fanSpend, limit) {
    return Object.keys(fanSpend).map(function(id) {
      return { id: id, total: fanSpend[id].total, purchases: fanSpend[id].purchases, lastDate: fanSpend[id].lastDate };
    }).sort(function(a, b) { return b.total - a.total; }).slice(0, limit);
  }

  function buildSnapshotText(tab, current, lastSame) {
    var parts = [];
    if (tab === 'today') {
      if (current.todayRevenue > 0) parts.push(fmtCur(current.todayRevenue));
      if (current.todayFans > 0) parts.push(current.todayFans + ' fans');
      if (current.todayMsgCount > 0) parts.push(current.todayMsgCount + ' msgs');
      if (parts.length === 0) parts.push('Sin actividad hoy aún');
    } else if (tab === 'week') {
      if (current.weekRevenue > 0) parts.push(fmtCur(current.weekRevenue));
      if (current.weekFans > 0) parts.push(current.weekFans + ' fans');
      if (current.weekMsgCount > 0) parts.push(current.weekMsgCount + ' msgs');
      if (parts.length === 0) parts.push('Sin actividad esta semana');
    } else {
      if (current.totalRevenue > 0) parts.push(fmtCur(current.totalRevenue));
      var revG = calcGrowth(current.totalRevenue, lastSame.totalRevenue);
      if (revG !== 0) parts.push((revG > 0 ? '+' : '') + revG.toFixed(0) + '%');
      if (current.fansThisMonth > 0) parts.push(current.fansThisMonth + ' fans');
    }
    return parts.join(' · ');
  }

  function buildMiniSparkline(dailyRevenue) {
    if (!dailyRevenue) return '';
    var now = new Date();
    var data = [];
    for (var d = 1; d <= now.getDate(); d++) {
      var key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      data.push(dailyRevenue[key] || 0);
    }
    if (data.length < 2) return '';
    var max = Math.max.apply(null, data) || 1;
    var W = 120, H = 50, pad = 2;
    var step = (W - pad * 2) / Math.max(data.length - 1, 1);
    var pts = data.map(function(v, i) {
      return (pad + i * step).toFixed(1) + ',' + (H - pad - ((v / max) * (H - pad * 2))).toFixed(1);
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none">' +
      '<defs><linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#FF1F8E" stop-opacity="0.4"/>' +
        '<stop offset="100%" stop-color="#FF1F8E" stop-opacity="0.02"/>' +
      '</linearGradient></defs>' +
      '<path d="M' + pad + ',' + H + ' L' + pts.join(' L') + ' L' + (pad + (data.length - 1) * step) + ',' + H + ' Z" fill="url(#spkGrad)"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#FF1F8E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  }

  function renderTodayTimeline(rawTx) {
    if (!rawTx || rawTx.length === 0) return '<div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.85rem">Sin transacciones hoy</div>';
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    var todayTx = rawTx.filter(function(tx) {
      return (tx.status === 'done' || tx.status === 'loading') && new Date(tx.timestamp) >= todayStart;
    }).sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    if (todayTx.length === 0) return '<div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.85rem">Sin transacciones hoy todavía</div>';

    var typeInfo = function(type) {
      var t = (type || '').toLowerCase();
      if (t.includes('subscription') || t.includes('recurring')) return { label: 'Suscripción', color: '#22d3ee', icon: 'fans' };
      if (t.includes('tip')) return { label: 'Propina', color: '#fbbf24', icon: 'dollar' };
      if (t.includes('message')) return { label: 'Mensaje', color: '#e879f9', icon: 'mail' };
      return { label: 'PPV', color: '#e879f9', icon: 'chat' };
    };

    var html = '<div class="card today-timeline-card" style="margin-top:1rem">' +
      '<div class="section-title">' + svgIcon('dollar', 18, '#FF1F8E') + ' Actividad de hoy <span style=\"font-size:0.7rem;color:var(--text-muted);font-weight:500\">(' + todayTx.length + ' tx)</span></div>' +
      '<div class="timeline-list">';
    todayTx.slice(0, 20).forEach(function(tx) {
      var d = new Date(tx.timestamp);
      var time = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      var net = (tx.amount * 0.8);
      var info = typeInfo(tx.type);
      html += '<div class="timeline-item">' +
        '<div class="timeline-time">' + time + '</div>' +
        '<div class="timeline-dot" style="background:' + info.color + '"></div>' +
        '<div class="timeline-body">' +
          '<span class="timeline-label">' + info.label + '</span>' +
          '<span class="timeline-amount" style="color:' + info.color + '">' + fmtCur(net) + '</span>' +
        '</div>' +
      '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderTopFans(topFans) {
    if (!topFans || topFans.length === 0) return '';
    var html = '<div style="margin-top:1rem">';
    html += '<div class="section-title" style="margin-bottom:0.5rem">👑 Top Fans del Mes</div>';
    html += '<div class="top-fans-grid">';
    var medals = ['🥇','🥈','🥉','4°','5°'];
    topFans.forEach(function(fan, i) {
      html += '<div class="top-fan-card">' +
        '<span class="top-fan-rank">' + medals[i] + '</span>' +
        '<span class="top-fan-amount">' + fmtCur(fan.total) + '</span>' +
        '<span class="top-fan-meta">' + fan.purchases + ' compras</span>' +
      '</div>';
    });
    html += '</div></div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER FULL STATS — v4 sparkline + best day + tabs
  // ═══════════════════════════════════════════════════════════

  // Store stats globally for tab switching
  var _statsCache = {};

  function renderFullStats(container, current, lastSame, lastFull, period) {
    _statsCache = { current: current, lastSame: lastSame, lastFull: lastFull, period: period };
    var html = '';

    // 0. PERIOD TABS
    html += '<div class="period-tabs" id="period-tabs" role="tablist" aria-label="Período de tiempo">' +
      '<button class="period-tab" data-period="today" role="tab" aria-selected="false">Hoy</button>' +
      '<button class="period-tab" data-period="week" role="tab" aria-selected="false">Semana</button>' +
      '<button class="period-tab active" data-period="month" role="tab" aria-selected="true">Este Mes</button>' +
    '</div>';

    // 0a. MOTIVATIONAL (above hero, contextual)
    html += '<div id="motivational-slot">' + renderMotivational(current, lastSame, lastFull, period, 'month') + '</div>';

    // 1. HERO CARD — revenue big + sparkline right + snapshot integrated
    html += '<div class="card card-hero animate-in" id="hero-card">' +
      '<div class="hero-layout">' +
        '<div class="hero-left">' +
          '<div class="hero-label" id="hero-label">' + svgIcon('dollar', 18, '#FF1F8E') + ' Ingresos ' + period.currentMonthName + '</div>' +
          '<div class="stat-hero" id="hero-amount">' + fmtCur(current.totalRevenue) + '</div>' +
          '<div class="hero-growth" id="hero-growth">' +
            growthBadge(current.totalRevenue, lastSame.totalRevenue, '') +
            '<span class="hero-vs">vs primeros ' + period.currentDay + ' días de ' + period.lastMonthName + '</span>' +
          '</div>' +
          '<div class="hero-snapshot" id="hero-snapshot">' + buildSnapshotText('month', current, lastSame) + '</div>' +
          '<div class="hero-projection" id="hero-projection"' + (current.projection > 0 ? '' : ' style="display:none"') + '>' +
            '<span class="hero-proj-label">🎯 Previsión:</span>' +
            '<span class="hero-proj-value">' + fmtCur(current.projection) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="hero-right" id="hero-sparkline">' + buildMiniSparkline(current.dailyRevenue) + '</div>' +
      '</div>' +
    '</div>';

    // 1b. BEST DAY CARD (glow) — rendered with id for tab reactivity
    html += '<div id="best-day-slot">' + renderBestDay(current, 'month') + '</div>';

    // 2. MINI-STATS ROW (4 cards with avg msg price)
    html += '<div class="grid-4col animate-in" id="mini-stats-row">' +
      miniStatCard('👥', current.fansThisMonth, 'Fans que pagaron', '#22d3ee') +
      miniStatCard('✉️', current.messageCount.toLocaleString(), 'Mensajes vendidos', '#e879f9') +
      miniStatCard('💵', fmtCur(current.averagePerFan), 'Por fan de media', '#34d399') +
      miniStatCard('💬', fmtCur(current.avgMessagePrice), 'Precio medio msg', '#fbbf24') +
    '</div>';

    // 3 + 4. PROGRESS RING + DONUT side by side (month only)
    html += '<div class="grid-2col" id="charts-row">' +
      renderProgressRing(current, lastFull, period) +
      renderIncomeDistribution(current) +
    '</div>';

    // 4b. DAILY REVENUE LINE CHART (before comparison for visual flow)
    html += '<div id="daily-chart-slot">' + renderDailyChart(current.dailyRevenue, period) + '</div>';

    // 5. COMPARISON CARDS (month only)
    html += '<div id="comparison-slot">' + renderComparison(current, lastSame, lastFull, period) + '</div>';

    // 5b. TOP FANS
    html += '<div id="top-fans-slot">' + renderTopFans(current.topFans) + '</div>';

    // 5c. TODAY TIMELINE (hidden until Hoy tab active)
    html += '<div id="today-timeline-slot" style="display:none"></div>';

    // 6. Last update (now shown in header too)
    html += '<div style="text-align:center;margin-top:1.5rem;color:var(--text-muted);font-size:0.7rem;opacity:0.6">' +
      'Datos de ' + new Date().toLocaleString('es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      }) + '</div>';

    container.innerHTML = html;

    // Wire up tab switching
    wireTabSwitching(container);

    // Animate numbers
    animateCounters(container);

    // Detect chart scroll overflow for gradient indicator
    wireChartScroll(container);
  }

  // Reusable chart scroll detection (avoids resize listener leak)
  var _resizeHandler = null;
  function wireChartScroll(container) {
    if (_resizeHandler) window.removeEventListener('resize', _resizeHandler);
    var chartWrap = container.querySelector('.daily-chart-wrap');
    if (!chartWrap) { _resizeHandler = null; return; }
    var checkScroll = function() {
      if (chartWrap.scrollWidth > chartWrap.clientWidth + 2) {
        chartWrap.classList.add('has-scroll');
      } else {
        chartWrap.classList.remove('has-scroll');
      }
    };
    checkScroll();
    chartWrap.addEventListener('scroll', function() {
      if (chartWrap.scrollLeft + chartWrap.clientWidth >= chartWrap.scrollWidth - 4) {
        chartWrap.classList.remove('has-scroll');
      } else {
        chartWrap.classList.add('has-scroll');
      }
    });
    _resizeHandler = checkScroll;
    window.addEventListener('resize', _resizeHandler);
  }

  // Best day card renderer (reactive to tab)
  function renderBestDay(stats, activeTab) {
    // Hide best day for 'today' tab
    if (activeTab === 'today') return '';
    var bestDay = stats.bestDay;
    if (!bestDay || bestDay.amount <= 0) return '';

    // For week tab, compute best day from last 7 days only
    if (activeTab === 'week') {
      var now = new Date();
      var weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      var weekBest = { date: null, amount: 0 };
      var daily = stats.dailyRevenue || {};
      for (var dk in daily) {
        if (new Date(dk) >= weekStart && daily[dk] > weekBest.amount) {
          weekBest = { date: dk, amount: daily[dk] };
        }
      }
      if (weekBest.amount <= 0) return '';
      bestDay = weekBest;
    }

    var bdDate = new Date(bestDay.date);
    var isToday = bdDate.toDateString() === new Date().toDateString();
    var bdFormatted = bdDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    var label = activeTab === 'week' ? 'Mejor día de la semana' : (isToday ? '¡Tu mejor día es HOY!' : 'Tu mejor día');
    return '<div class="card best-day-card' + (isToday ? ' best-day-today' : '') + '">' +
      '<div class="best-day-trophy">🏆</div>' +
      '<div class="best-day-info">' +
        '<div class="best-day-label">' + label + '</div>' +
        '<div class="best-day-value">' + fmtCur(bestDay.amount) + '</div>' +
        '<div class="best-day-date">' + bdFormatted + '</div>' +
      '</div>' +
      (stats.recentActivity > 0 ?
        '<div class="live-dot-wrap">' +
          '<span class="live-dot"></span>' +
          '<span class="live-text">' + stats.recentActivity + ' tx últimas 24h</span>' +
        '</div>' : '') +
    '</div>';
  }

  // SVG icon helper — replaces emojis for cross-device consistency
  function svgIcon(name, size, color) {
    var s = size || 20, c = color || '#fff';
    var paths = {
      fans: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="' + c + '"/>',
      mail: '<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="' + c + '"/>',
      dollar: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="' + c + '"/>',
      chat: '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="' + c + '"/>'
    };
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" style="vertical-align:middle">' + (paths[name] || '') + '</svg>';
  }

  function miniStatCard(icon, value, label, accentColor) {
    var color = accentColor || '#fff';
    // Map old emoji icons to SVG names
    var iconMap = { '👥': 'fans', '✉️': 'mail', '💵': 'dollar', '💬': 'chat' };
    var svgName = iconMap[icon];
    var iconHtml = svgName ? svgIcon(svgName, 28, color) : icon;
    return '<div class="card mini-stat-card" style="border-top:3px solid ' + color + ';background:linear-gradient(180deg,' + color + '08 0%,transparent 40%)">' +
      '<div class="mini-stat-icon">' + iconHtml + '</div>' +
      '<div class="mini-stat-value" style="color:' + color + '">' + value + '</div>' +
      '<div class="mini-stat-label">' + label + '</div>' +
    '</div>';
  }

  // ═══ COUNTER ANIMATION ═══
  function animateCounters(container) {
    var heroEl = container.querySelector('#hero-amount');
    if (heroEl) animateValue(heroEl, heroEl.textContent);
    container.querySelectorAll('.mini-stat-value').forEach(function(el) {
      animateValue(el, el.textContent);
    });
    container.querySelectorAll('.best-day-value').forEach(function(el) {
      animateValue(el, el.textContent);
    });
  }
  function animateValue(el, finalText) {
    var isCurrency = finalText.indexOf('$') === 0;
    var numStr = finalText.replace(/[^0-9.]/g, '');
    var target = parseFloat(numStr);
    if (isNaN(target) || target === 0) return;
    var duration = 1200;
    var start = performance.now();
    var origColor = el.style.color;
    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      var t = 1 - Math.pow(1 - progress, 3);
      var current = target * t;
      if (isCurrency) {
        el.textContent = '$' + current.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      } else {
        el.textContent = Math.round(current).toLocaleString();
      }
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = finalText;
    }
    el.textContent = isCurrency ? '$0.00' : '0';
    requestAnimationFrame(tick);
  }

  // ═══ DAILY REVENUE LINE CHART ═══
  function renderDailyChart(dailyRevenue, period) {
    if (!dailyRevenue) return '';
    var now = new Date();
    var currentDay = now.getDate();
    var data = [];
    var maxVal = 0;
    for (var d = 1; d <= currentDay; d++) {
      var key = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');
      var val = dailyRevenue[key] || 0;
      data.push(val);
      if (val > maxVal) maxVal = val;
    }
    if (maxVal === 0 || data.length < 2) {
      return '<div class="card daily-chart-card">' +
        '<div class="section-title">📈 Ingresos por día — ' + period.currentMonthName + '</div>' +
        '<div style="text-align:center;padding:2rem 1rem;color:var(--text-muted)">' +
          '<div style="font-size:2rem;margin-bottom:0.5rem">📊</div>' +
          '<div style="font-size:0.85rem">Aún no hay suficientes datos para mostrar el gráfico.<br>Vuelve mañana.</div>' +
        '</div></div>';
    }

    var W = 700, H = 280, padX = 48, padY = 24;
    var plotW = W - padX * 2;
    var plotH = H - padY * 2 - 16;
    var stepX = plotW / Math.max(data.length - 1, 1);

    var points = data.map(function(v, i) {
      var x = padX + i * stepX;
      var y = padY + plotH - (v / maxVal) * plotH;
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    var polyline = points.join(' ');
    // Area fill path
    var areaPath = 'M' + padX + ',' + (padY + plotH) + ' ' +
      points.map(function(p) { return 'L' + p; }).join(' ') +
      ' L' + (padX + (data.length - 1) * stepX) + ',' + (padY + plotH) + ' Z';

    // Grid lines (3)
    var gridLines = '';
    for (var g = 0; g <= 3; g++) {
      var gy = padY + (plotH / 3) * g;
      var gVal = maxVal - (maxVal / 3) * g;
      gridLines += '<line x1="' + padX + '" y1="' + gy + '" x2="' + (W - padX) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4,4"/>';
      gridLines += '<text x="' + (padX - 8) + '" y="' + (gy + 4) + '" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="11" font-weight="600">$' + Math.round(gVal) + '</text>';
    }

    // Day labels (show every few days)
    var dayLabels = '';
    var labelEvery = data.length > 20 ? 5 : data.length > 10 ? 3 : 2;
    for (var dl = 0; dl < data.length; dl++) {
      if (dl === 0 || dl === data.length - 1 || dl % labelEvery === 0) {
        var dlx = padX + dl * stepX;
        dayLabels += '<text x="' + dlx + '" y="' + (H - 4) + '" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="11" font-weight="600">' + (dl + 1) + '</text>';
      }
    }

    // Dots on data points + hover hit areas
    var dots = '';
    var hitAreas = '';
    data.forEach(function(v, i) {
      var x = padX + i * stepX;
      var y = padY + plotH - (v / maxVal) * plotH;
      var isLast = i === data.length - 1;
      if (isLast || data.length <= 15 || i % 2 === 0) {
        dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (isLast ? 6 : 3.5) + '" fill="' + (isLast ? '#FF1F8E' : 'rgba(255,107,179,0.6)') + '"' + (isLast ? ' style="filter:drop-shadow(0 0 8px #FF1F8E80)"' : '') + '/>';
      }
      // Invisible hit area for hover tooltip on every point
      hitAreas += '<g class="chart-hover-point" style="pointer-events:all">' +
        '<rect x="' + (x - 18).toFixed(1) + '" y="' + (padY - 4) + '" width="36" height="' + (plotH + 28) + '" fill="transparent" />' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="8" fill="transparent" class="chart-hover-dot" />' +
        '<g class="chart-hover-tip" style="opacity:0;pointer-events:none;transition:opacity .15s">' +
          '<rect x="' + (x - 38).toFixed(1) + '" y="' + (y - 34).toFixed(1) + '" width="76" height="26" rx="8" fill="rgba(255,31,142,0.35)" stroke="rgba(255,31,142,0.5)" stroke-width="1"/>' +
          '<text x="' + x.toFixed(1) + '" y="' + (y - 16).toFixed(1) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">Día ' + (i + 1) + ': $' + Math.round(v) + '</text>' +
        '</g>' +
      '</g>';
    });

    // Tooltip for last day (always visible)
    var lastVal = data[data.length - 1];
    var lastX = padX + (data.length - 1) * stepX;
    var lastY = padY + plotH - (lastVal / maxVal) * plotH;
    var tooltip = '<rect x="' + (lastX - 34) + '" y="' + (lastY - 32) + '" width="68" height="24" rx="8" fill="rgba(255,31,142,0.3)" stroke="rgba(255,31,142,0.5)" stroke-width="1"/>' +
      '<text x="' + lastX + '" y="' + (lastY - 15) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">$' + Math.round(lastVal) + '</text>';

    return '<div class="card daily-chart-card">' +
      '<div class="section-title">📈 Ingresos por día — ' + period.currentMonthName + '</div>' +
      '<div class="daily-chart-wrap">' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" width="100%">' +
          '<defs>' +
            '<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#FF1F8E" stop-opacity="0.25"/>' +
              '<stop offset="100%" stop-color="#FF1F8E" stop-opacity="0.02"/>' +
            '</linearGradient>' +
            '<linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
              '<stop offset="0%" stop-color="#c026d3"/>' +
              '<stop offset="100%" stop-color="#FF1F8E"/>' +
            '</linearGradient>' +
          '</defs>' +
          gridLines +
          '<path d="' + areaPath + '" fill="url(#areaGrad)"/>' +
          '<polyline points="' + polyline + '" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #FF1F8E40)"/>' +
          dots +
          tooltip +
          hitAreas +
          dayLabels +
        '</svg>' +
      '</div>' +
    '</div>';
  }

  // ═══ PERIOD TAB SWITCHING ═══
  function wireTabSwitching(container) {
    var tabs = container.querySelectorAll('.period-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        var p = tab.dataset.period;
        updatePeriodView(container, p);
      });
    });
    // Keyboard navigation: left/right arrows
    var tabList = container.querySelector('#period-tabs');
    if (tabList) {
      tabList.addEventListener('keydown', function(e) {
        var tabArr = Array.prototype.slice.call(tabs);
        var idx = tabArr.indexOf(document.activeElement);
        if (idx === -1) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = e.key === 'ArrowRight' ? (idx + 1) % tabArr.length : (idx - 1 + tabArr.length) % tabArr.length;
          tabArr[next].focus();
          tabArr[next].click();
        }
      });
    }
  }

  function updatePeriodView(container, period) {
    var s = _statsCache;
    if (!s.current) return;
    var c = s.current;
    var heroAmount = container.querySelector('#hero-amount');
    var heroLabel = container.querySelector('#hero-label');
    var heroGrowth = container.querySelector('#hero-growth');
    var heroProjection = container.querySelector('#hero-projection');
    var miniRow = container.querySelector('#mini-stats-row');
    var motivSlot = container.querySelector('#motivational-slot');
    var dailySlot = container.querySelector('#daily-chart-slot');
    var chartsRow = container.querySelector('#charts-row');
    var cmpSlot = container.querySelector('#comparison-slot');
    var bestDaySlot = container.querySelector('#best-day-slot');
    if (!heroAmount) return;

    // Update snapshot inside hero
    var heroSnap = container.querySelector('#hero-snapshot');
    if (heroSnap) heroSnap.innerHTML = buildSnapshotText(period, s.current, s.lastSame);

    // Update sparkline visibility
    var heroSparkline = container.querySelector('#hero-sparkline');
    if (heroSparkline) heroSparkline.style.display = period === 'month' ? '' : 'none';

    // Today timeline
    var timelineSlot = container.querySelector('#today-timeline-slot');
    if (timelineSlot) timelineSlot.style.display = period === 'today' ? '' : 'none';
    if (period === 'today' && timelineSlot && timelineSlot.innerHTML === '') {
      timelineSlot.innerHTML = renderTodayTimeline(c._rawTransactions || []);
    }

    // Update top fans visibility
    var topFansSlot = container.querySelector('#top-fans-slot');
    if (topFansSlot) topFansSlot.style.display = period === 'month' ? '' : 'none';

    if (period === 'today') {
      heroAmount.textContent = fmtCur(c.todayRevenue);
      if (heroLabel) heroLabel.innerHTML = svgIcon('dollar', 18, '#FF1F8E') + ' Ingresos de Hoy';
      if (heroGrowth) heroGrowth.innerHTML = '<span class="hero-vs">Actualizado en tiempo real</span>';
      if (heroProjection) heroProjection.style.display = 'none';
      if (miniRow) miniRow.innerHTML =
        miniStatCard('👥', c.todayFans, 'Fans hoy', '#22d3ee') +
        miniStatCard('✉️', c.todayMsgCount.toLocaleString(), 'Msgs hoy', '#e879f9') +
        miniStatCard('💵', c.todayFans > 0 ? fmtCur(c.todayRevenue / c.todayFans) : '$0.00', 'Por fan hoy', '#34d399') +
        miniStatCard('💬', fmtCur(c.avgMessagePrice), 'Precio medio msg', '#fbbf24');
    } else if (period === 'week') {
      heroAmount.textContent = fmtCur(c.weekRevenue);
      if (heroLabel) heroLabel.innerHTML = svgIcon('dollar', 18, '#FF1F8E') + ' Ingresos Semana';
      if (heroGrowth) heroGrowth.innerHTML = '<span class="hero-vs">Últimos 7 días</span>';
      if (heroProjection) heroProjection.style.display = 'none';
      if (miniRow) miniRow.innerHTML =
        miniStatCard('👥', c.weekFans, 'Fans semana', '#22d3ee') +
        miniStatCard('✉️', c.weekMsgCount.toLocaleString(), 'Msgs semana', '#e879f9') +
        miniStatCard('💵', c.weekFans > 0 ? fmtCur(c.weekRevenue / c.weekFans) : '$0.00', 'Por fan semana', '#34d399') +
        miniStatCard('💬', fmtCur(c.avgMessagePrice), 'Precio medio msg', '#fbbf24');
    } else {
      heroAmount.textContent = fmtCur(c.totalRevenue);
      if (heroLabel) heroLabel.innerHTML = svgIcon('dollar', 18, '#FF1F8E') + ' Ingresos ' + s.period.currentMonthName;
      if (heroGrowth) heroGrowth.innerHTML =
        growthBadge(c.totalRevenue, s.lastSame.totalRevenue, '') +
        '<span class="hero-vs">vs primeros ' + s.period.currentDay + ' días de ' + s.period.lastMonthName + '</span>';
      if (heroProjection) heroProjection.style.display = c.projection > 0 ? '' : 'none';
      if (miniRow) miniRow.innerHTML =
        miniStatCard('👥', c.fansThisMonth, 'Fans que pagaron', '#22d3ee') +
        miniStatCard('✉️', c.messageCount.toLocaleString(), 'Mensajes vendidos', '#e879f9') +
        miniStatCard('💵', fmtCur(c.averagePerFan), 'Por fan de media', '#34d399') +
        miniStatCard('💬', fmtCur(c.avgMessagePrice), 'Precio medio msg', '#fbbf24');
    }

    // Charts/ring/donut: only show for month
    if (chartsRow) {
      chartsRow.style.display = period === 'month' ? '' : 'none';
      // Re-trigger ring animation when returning to month tab
      if (period === 'month') {
        var ringEl = chartsRow.querySelector('.ring-animated');
        if (ringEl) {
          var finalOffset = ringEl.style.getPropertyValue('--final-offset') || ringEl.getAttribute('stroke-dashoffset');
          var circ = ringEl.style.getPropertyValue('--circ');
          ringEl.style.strokeDashoffset = circ;
          requestAnimationFrame(function() { ringEl.style.strokeDashoffset = finalOffset; });
        }
      }
    }

    // Daily chart: show for month only
    if (dailySlot) {
      if (period === 'month') {
        dailySlot.innerHTML = renderDailyChart(c.dailyRevenue, s.period);
        wireChartScroll(container);
      } else {
        dailySlot.innerHTML = '';
      }
    }

    // Comparison: show for month only
    if (cmpSlot) cmpSlot.style.display = period === 'month' ? '' : 'none';

    // Best day: reactive
    if (bestDaySlot) bestDaySlot.innerHTML = renderBestDay(c, period);

    // Update motivational contextual to tab
    if (motivSlot) {
      motivSlot.innerHTML = renderMotivational(s.current, s.lastSame, s.lastFull, s.period, period);
    }

    // Re-animate counters on tab change
    animateCounters(container);
  }

  // ═══ MOTIVATIONAL MESSAGE (above hero, contextual to tab) ═══
  function renderMotivational(current, lastSame, lastFull, period, activeTab) {
    var emoji, headline, message;

    if (activeTab === 'today') {
      var todayRev = current.todayRevenue || 0;
      var avgDaily = current.totalRevenue / Math.max(period.currentDay, 1);
      if (todayRev >= avgDaily * 1.2) {
        emoji = '🔥'; headline = '¡Hoy estás on fire!';
        message = 'Llevas <strong style="color:var(--success)">' + fmtCur(todayRev) + '</strong> — por encima de tu promedio diario.';
      } else if (todayRev > 0) {
        emoji = '⚡'; headline = '¡Buen día hasta ahora!';
        message = 'Llevas ' + fmtCur(todayRev) + ' hoy. Tu promedio diario es ' + fmtCur(avgDaily) + '.';
      } else {
        emoji = '☀️'; headline = '¡El día recién empieza!';
        message = 'Tu promedio diario este mes es ' + fmtCur(avgDaily) + '. ¡A por él!';
      }
    } else if (activeTab === 'week') {
      var weekRev = current.weekRevenue || 0;
      var avgDaily = current.totalRevenue / Math.max(period.currentDay, 1);
      var weekTarget = avgDaily * 7;
      if (weekRev >= weekTarget) {
        emoji = '💪'; headline = '¡Semana fuerte!';
        message = 'Llevas <strong style="color:var(--success)">' + fmtCur(weekRev) + '</strong> en 7 días — por encima del ritmo.';
      } else {
        emoji = '✨'; headline = '¡La semana sigue!';
        message = 'Llevas ' + fmtCur(weekRev) + ' esta semana. Objetivo semanal: ' + fmtCur(weekTarget) + '.';
      }
    } else {
      var revGrowth = calcGrowth(current.totalRevenue, lastSame.totalRevenue);
      if (revGrowth >= 20) {
        emoji = '🚀'; headline = '¡Estás volando este mes!';
        message = 'Vas un <strong style="color:var(--success)">+' + revGrowth.toFixed(0) + '%</strong> por encima de ' + period.lastMonthName + '. ¡Increíble!';
      } else if (revGrowth >= 0) {
        emoji = '💪'; headline = '¡Vas por buen camino!';
        message = 'Ya superaste los primeros ' + period.currentDay + ' días de ' + period.lastMonthName + '. ¡Sigue así!';
      } else if (revGrowth >= -15) {
        emoji = '✨'; headline = '¡Cada día cuenta!';
        message = 'Estás cerca del ritmo de ' + period.lastMonthName + '. Un poco más y lo superas.';
      } else {
        emoji = '💫'; headline = '¡El mes apenas empieza!';
        message = 'Cuantos más reels subas, más suscriptores llegarán. ¡Tú puedes!';
      }
    }

    return '<div class="motivational-banner">' +
      '<span class="motivational-emoji">' + emoji + '</span>' +
      '<div class="motivational-text">' +
        '<strong>' + headline + '</strong> ' + message +
      '</div>' +
    '</div>';
  }

  // ═══ PROGRESS RING (SVG circle — integrated, gradient, big) ═══
  function renderProgressRing(current, lastFull, period) {
    var lastMonthRev = lastFull.totalRevenue;
    var customGoal = getCustomGoal();
    var goal = customGoal || (lastMonthRev > 0 ? Math.round(lastMonthRev * 1.15) : (current.projection || 1));
    var goalSource = customGoal ? 'Meta personalizada' : 'Meta = ' + period.lastMonthName + ' + 15%';
    var pct = Math.min((current.totalRevenue / goal) * 100, 100);
    var remaining = Math.max(goal - current.totalRevenue, 0);

    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var daysLeft = daysInMonth - now.getDate();
    var perDayNeeded = daysLeft > 0 ? remaining / daysLeft : 0;

    var svgSize = 260, cx = 130, cy = 130, r = 100;
    var circumference = 2 * Math.PI * r;
    var dashOffset = circumference - (pct / 100 * circumference);
    var gradId = 'ringGrad';
    var gradColors = pct >= 100 ? ['#10b981','#34d399'] : pct >= 60 ? ['#FF1F8E','#c026d3'] : ['#f59e0b','#FF1F8E'];
    var borderColor = pct >= 70 ? 'rgba(16,185,129,0.25)' : 'rgba(255,31,142,0.18)';

    var perDayHtml = '';
    if (pct >= 100) {
      perDayHtml = '<div class="ring-perday ring-perday-done">🎉 ¡Meta superada!</div>';
    } else if (daysLeft > 0) {
      perDayHtml = '<div class="ring-perday">' +
        '<span class="ring-perday-label">Quedan ' + daysLeft + ' día' + (daysLeft !== 1 ? 's' : '') + ' —</span> ' +
        '<span class="ring-perday-value">necesitas ' + fmtCur(perDayNeeded) + '/día</span>' +
      '</div>';
    }

    return '<div class="card chart-card-unified" style="border-color:' + borderColor + '">' +
      '<div class="section-title" style="text-align:center;width:100%">🎯 Meta del mes</div>' +
      '<div class="chart-svg-center">' +
        '<svg width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '">' +
          '<defs><linearGradient id="' + gradId + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="' + gradColors[0] + '"/>' +
            '<stop offset="100%" stop-color="' + gradColors[1] + '"/>' +
          '</linearGradient></defs>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="16"/>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#' + gradId + ')" stroke-width="16" ' +
            'stroke-linecap="round" stroke-dasharray="' + circumference.toFixed(2) + '" ' +
            'class="ring-animated" style="--circ:' + circumference.toFixed(2) + ';--final-offset:' + dashOffset.toFixed(2) + ';stroke-dashoffset:' + dashOffset.toFixed(2) + ';filter:drop-shadow(0 0 8px ' + gradColors[0] + '40)" ' +
            'transform="rotate(-90 ' + cx + ' ' + cy + ')"/>' +
          '<text x="' + cx + '" y="' + (cy - 12) + '" text-anchor="middle" fill="#fff" font-size="40" font-weight="900">' + pct.toFixed(0) + '%</text>' +
          '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="13" font-weight="700">' + fmtCur(current.totalRevenue) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="11">de ' + fmtCur(goal) + '</text>' +
        '</svg>' +
      '</div>' +
      perDayHtml +
      '<div class="ring-meta">' + goalSource + '</div>' +
    '</div>';
  }

  // ═══ COMPARISON — HORIZONTAL CARDS ═══
  function renderComparison(current, lastSame, lastFull, period) {
    var metrics = [
      { icon: '💰', label: 'Total', c: current.totalRevenue, ls: lastSame.totalRevenue, cur: true },
      { icon: '👥', label: 'Fans', c: current.fansThisMonth, ls: lastSame.fansThisMonth, cur: false },
      { icon: '✉️', label: 'PPV + Tips', c: current.ppvRevenue + current.tipRevenue, ls: lastSame.ppvRevenue + lastSame.tipRevenue, cur: true },
      { icon: '💎', label: 'Suscripciones', c: current.subscriptionRevenue, ls: lastSame.subscriptionRevenue, cur: true }
    ];

    var positiveCount = 0;
    metrics.forEach(function (m) { if (calcGrowth(m.c, m.ls) > 0) positiveCount++; });

    var cards = metrics.map(function (m) {
      var g = calcGrowth(m.c, m.ls);
      var isUp = g > 0; var isZero = g === 0;
      var arrow = isUp ? '▲' : (isZero ? '—' : '▼');
      var pillCls = isUp ? 'cmp-pill-up' : (isZero ? 'cmp-pill-zero' : 'cmp-pill-down');
      var val = function (v) { return m.cur ? fmtCur(v) : v.toLocaleString(); };

      return '<div class="cmp-card">' +
        '<div class="cmp-icon">' + m.icon + '</div>' +
        '<div class="cmp-body">' +
          '<div class="cmp-label">' + m.label + '</div>' +
          '<div class="cmp-value">' + val(m.c) + '</div>' +
          '<div class="cmp-prev">' + period.lastMonthName + ': <strong>' + val(m.ls) + '</strong></div>' +
        '</div>' +
        '<div class="cmp-pill ' + pillCls + '">' + arrow + ' ' + (isZero ? '0' : (isUp ? '+' : '') + g.toFixed(1)) + '%</div>' +
      '</div>';
    }).join('');

    var summaryEmoji = positiveCount >= metrics.length ? '🏆' : positiveCount >= 2 ? '🔥' : positiveCount > 0 ? '💡' : '�';
    var summaryColor = positiveCount >= 2 ? 'var(--success)' : positiveCount > 0 ? 'var(--info)' : 'var(--gold)';
    var summaryMsg = positiveCount >= metrics.length ? '¡Todo por encima del mes pasado!'
      : positiveCount === 0 ? '¡Cada día es una nueva oportunidad! 🚀'
      : '<strong>' + positiveCount + ' de ' + metrics.length + '</strong> métricas mejorando';

    return '<div style="margin-top:1rem">' +
      '<div class="section-title" style="margin-bottom:0.5rem">📊 vs ' + period.lastMonthName + ' <span style="font-size:0.7rem;color:var(--info);font-weight:500">(mismos ' + period.currentDay + ' días)</span></div>' +
      '<div class="cmp-grid">' + cards + '</div>' +
      '<div class="cmp-summary" style="background:' + (positiveCount >= 2 ? 'rgba(52,211,153,0.1)' : positiveCount > 0 ? 'rgba(96,165,250,0.1)' : 'rgba(251,191,36,0.1)') + '">' +
        '<span style="font-size:1.3rem">' + summaryEmoji + '</span>' +
        '<span style="color:' + summaryColor + ';font-size:0.85rem;font-weight:600">' + summaryMsg + '</span>' +
      '</div></div>';
  }

  // ═══ INCOME DISTRIBUTION — SVG DONUT (dominant % inside, progress bars legend) ═══
  function renderIncomeDistribution(stats) {
    var total = stats.totalRevenue;
    if (total === 0) return '';

    var subs = stats.subscriptionRevenue;
    var ppv  = stats.ppvRevenue;
    var tips = stats.tipRevenue;

    // Find dominant category
    var categories = [
      { label: 'PPV + Msgs', amount: ppv, colors: ['#c026d3','#e879f9'], color: '#e879f9' },
      { label: 'Suscripciones', amount: subs, colors: ['#06b6d4','#22d3ee'], color: '#22d3ee' },
      { label: 'Propinas', amount: tips, colors: ['#f59e0b','#fbbf24'], color: '#fbbf24' }
    ];
    categories.sort(function(a,b) { return b.amount - a.amount; });
    var dominant = categories[0];
    var domPct = total > 0 ? (dominant.amount / total * 100).toFixed(0) : 0;

    var svgSize = 260, cx = 130, cy = 130, r = 100;
    var circ = 2 * Math.PI * r;

    // Shared defs for all arcs
    var defsHtml = '<defs>' +
      '<linearGradient id="dS2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient>' +
      '<linearGradient id="dP2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c026d3"/><stop offset="100%" stop-color="#e879f9"/></linearGradient>' +
      '<linearGradient id="dT2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient>' +
    '</defs>';

    // Simple arc function (uses shared gradients)
    function arcPiece(value, offsetFrac, gradId, colors) {
      var pct = total > 0 ? value / total : 0;
      var dash = pct * circ;
      if (dash < 2) return '';
      var gapSize = 4;
      var arcLen = Math.max(dash - gapSize, 2);
      var gapLen = circ - arcLen;
      var offset = -(offsetFrac * circ + gapSize / 2);
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' +
        'fill="none" stroke="url(#' + gradId + ')" stroke-width="22" ' +
        'class="donut-arc" ' +
        'stroke-dasharray="' + arcLen.toFixed(2) + ' ' + gapLen.toFixed(2) + '" ' +
        'stroke-dashoffset="' + offset.toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')" ' +
        'style="filter:drop-shadow(0 0 8px ' + colors[0] + '40)"/>';
    }

    var subsFrac = total > 0 ? subs / total : 0;
    var ppvFrac  = total > 0 ? ppv / total : 0;

    var svgDonut =
      '<svg width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '">' +
        defsHtml +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="22"/>' +
        arcPiece(subs, 0, 'dS2', ['#06b6d4','#22d3ee']) +
        arcPiece(ppv, subsFrac, 'dP2', ['#c026d3','#e879f9']) +
        arcPiece(tips, subsFrac + ppvFrac, 'dT2', ['#f59e0b','#fbbf24']) +
        '<text x="' + cx + '" y="' + (cy - 10) + '" text-anchor="middle" fill="' + dominant.color + '" font-size="42" font-weight="900">' + domPct + '%</text>' +
        '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-weight="600">' + dominant.label + '</text>' +
      '</svg>';

    // Progress bar legend items
    function legendBar(label, amount, color) {
      var pctVal = total > 0 ? (amount / total * 100) : 0;
      return '<div class="donut-bar-item">' +
        '<div class="donut-bar-header">' +
          '<span class="donut-bar-dot" style="background:' + color + '"></span>' +
          '<span class="donut-bar-label">' + label + '</span>' +
          '<span class="donut-bar-amount">' + fmtCur(amount) + '</span>' +
          '<span class="donut-bar-pct">' + pctVal.toFixed(0) + '%</span>' +
        '</div>' +
        '<div class="donut-bar-track">' +
          '<div class="donut-bar-fill" style="width:' + Math.max(pctVal, 2) + '%;background:' + color + '"></div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="card chart-card-unified" style="flex-direction:column">' +
      '<div class="section-title" style="width:100%;text-align:center">💎 De dónde viene tu dinero</div>' +
      '<div class="chart-svg-center">' + svgDonut + '</div>' +
      '<div class="donut-bars-wrap">' +
        legendBar('Suscripciones', subs, '#22d3ee') +
        legendBar('PPV + Mensajes', ppv, '#e879f9') +
        legendBar('Propinas', tips, '#fbbf24') +
      '</div>' +
    '</div>';
  }

  // ═══════════════════════════════════════════════════════════
  // RECORDING TRACKER — FIXED
  // ═══════════════════════════════════════════════════════════
  async function loadRecordingData(cfg, container) {
    try {
      var apiUrl = window.CONFIG.marketingApi.url;
      var apiKey = window.CONFIG.marketingApi.key;
      var driveKey = cfg.driveKey;

      var url = apiUrl + '?key=' + encodeURIComponent(apiKey) + '&action=full&modelo=' + encodeURIComponent(driveKey);
      var ctrl = new AbortController();
      var tid = setTimeout(function () { ctrl.abort(); }, 120000);

      var resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!resp.ok) throw new Error('API ' + resp.status);
      var data = await resp.json();

      var produccion = data.produccion || {};
      var drive = data.drive || {};

      var modelProd = findModelData(produccion, driveKey);
      var modelDrive = findModelData(drive, driveKey);

      // FIX: ejemplosEnviados is array of OBJECTS {numReel, subcuenta, ...}
      var ejemplosEnviados = modelProd.ejemplosEnviados || [];
      var carpetasGrabadas = modelDrive.carpetasGrabadas || [];

      console.log('📹 Recording data:', driveKey, 'ejemplos:', ejemplosEnviados.length, 'carpetas:', carpetasGrabadas.length);

      // Extract reel numbers AND dates from ejemplosEnviados
      var enviadosNums = [];
      var reelFechaMap = {};
      var seenNums = new Set();
      ejemplosEnviados.forEach(function (e) {
        var raw = (typeof e === 'object' && e !== null) ? (e.numReel || '') : String(e);
        var num = parseInt(String(raw).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0 && !seenNums.has(num)) {
          seenNums.add(num);
          enviadosNums.push(num);
          var fecha = (typeof e === 'object' && e !== null) ? (e.fecha || e.createdAt || '') : '';
          if (fecha) reelFechaMap[num] = fecha;
        }
      });

      // carpetasGrabadas is already array of numbers from backend
      var grabadosSet = new Set();
      carpetasGrabadas.forEach(function (c) {
        var num = typeof c === 'number' ? c : parseInt(String(c).replace(/\D/g, ''), 10);
        if (!isNaN(num)) grabadosSet.add(num);
      });

      var totalEnviados = enviadosNums.length;
      var totalGrabados = enviadosNums.filter(function (n) { return grabadosSet.has(n); }).length;
      var pendientes = enviadosNums.filter(function (n) { return !grabadosSet.has(n); });
      var pendientesWithDates = pendientes.map(function(n) {
        return { num: n, fecha: reelFechaMap[n] || '' };
      });
      var totalPendientes = pendientes.length;
      var pct = totalEnviados > 0 ? Math.round((totalGrabados / totalEnviados) * 100) : 0;

      console.log('📹 Parsed:', totalEnviados, 'enviados,', totalGrabados, 'grabados,', totalPendientes, 'pendientes');

      renderRecording(container, totalGrabados, totalPendientes, totalEnviados, pct, pendientesWithDates);
    } catch (err) {
      console.error('Recording error:', err);
      container.innerHTML =
        '<div class="error-state"><div class="icon">📹</div>' +
        '<div class="msg">Sin datos de grabación disponibles.</div></div>';
    }
  }

  function findModelData(obj, key) {
    if (!obj) return {};
    if (obj[key]) return obj[key];
    var lower = key.toLowerCase();
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lower) return obj[keys[i]];
    }
    return {};
  }

  function renderRecording(container, grabados, pendientesCount, enviados, pct, pendientesArr) {
    // Dynamic colors based on progress
    var borderColor, bgGrad, titleText, emoji;
    if (pct >= 100) {
      borderColor = 'rgba(16,185,129,0.4)';
      bgGrad = 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))';
      titleText = '¡Todo grabado!';
      emoji = '🎉';
    } else if (pct >= 70) {
      borderColor = 'rgba(251,191,36,0.3)';
      bgGrad = 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(255,215,0,0.03))';
      titleText = 'Casi completo';
      emoji = '📹';
    } else {
      borderColor = 'rgba(255,31,142,0.25)';
      bgGrad = 'linear-gradient(135deg, rgba(255,31,142,0.06), rgba(192,38,211,0.03))';
      titleText = 'Tus reels pendientes';
      emoji = '📹';
    }

    var html = '<div class="card rec-card" style="border-color:' + borderColor + ';background:' + bgGrad + '">';

    // Section title (outside card)
    html = '<div class="section-title" style="margin-bottom:0.75rem">📹 Seguimiento de Grabaciones</div>' + html;

    // Header with refresh button
    html += '<div class="rec-header">' +
      '<div class="rec-title">' + emoji + ' ' + titleText + '</div>' +
      '<button class="rec-refresh-btn" id="rec-refresh-btn">' +
        '<span class="rec-refresh-icon">🔄</span> Actualizar reels' +
      '</button>' +
    '</div>';

    // 3 big stat blocks
    html += '<div class="rec-stats-row">' +
      '<div class="rec-stat">' +
        '<div class="rec-stat-num" style="color:var(--success)">' + grabados + '</div>' +
        '<div class="rec-stat-label">Grabados</div>' +
      '</div>' +
      '<div class="rec-stat">' +
        '<div class="rec-stat-num" style="color:var(--gold)">' + pendientesCount + '</div>' +
        '<div class="rec-stat-label">Pendientes</div>' +
      '</div>' +
      '<div class="rec-stat">' +
        '<div class="rec-stat-num" style="color:var(--text-secondary)">' + enviados + '</div>' +
        '<div class="rec-stat-label">Enviados</div>' +
      '</div>' +
    '</div>';

    // Big progress bar
    html += '<div class="rec-progress-wrap">' +
      '<div class="rec-progress-track">' +
        '<div class="rec-progress-fill" style="width:' + Math.max(pct, 3) + '%"></div>' +
      '</div>' +
      '<div class="rec-progress-label">' + pct + '% completado</div>' +
    '</div>';

    // Pending reels as big cards
    if (pendientesArr.length > 0) {
      html += '<div class="rec-pending-section">' +
        '<div class="rec-pending-title">⏳ Faltan grabar (' + pendientesArr.length + ')</div>' +
        '<div class="rec-pending-grid">';
      pendientesArr.sort(function (a, b) { return (a.num || a) - (b.num || b); }).forEach(function (item) {
        var num = item.num || item;
        var fecha = item.fecha || '';
        var fechaShort = '';
        var urgencyClass = 'rec-urgency-new';
        if (fecha) {
          var d = new Date(fecha);
          if (!isNaN(d.getTime())) {
            fechaShort = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
            var daysDiff = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
            if (daysDiff > 30) urgencyClass = 'rec-urgency-old';
            else if (daysDiff > 14) urgencyClass = 'rec-urgency-mid';
            else urgencyClass = 'rec-urgency-new';
          }
        }
        html += '<div class="rec-pending-item ' + urgencyClass + '">' +
          '<span class="rec-pending-num">#' + num + '</span>' +
          (fechaShort ? '<span class="rec-pending-date">' + fechaShort + '</span>' : '') +
        '</div>';
      });
      html += '</div></div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // Wire refresh button
    var refreshBtn = container.querySelector('#rec-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        var cfg = getModelConfig();
        if (!cfg || !cfg.driveKey) return;
        refreshBtn.classList.add('rec-refresh-loading');
        refreshBtn.querySelector('.rec-refresh-icon').textContent = '⏳';
        loadRecordingData(cfg, container).finally(function () {
          // Button re-renders with container
        });
      });
    }
  }

  // ═══ HELPERS ═══
  function fmtCur(n) {
    return '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function esc(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function calcGrowth(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  function growthBadge(curr, prev, subtext) {
    var g = calcGrowth(curr, prev);
    var isUp = g > 0; var isZero = g === 0;
    var cls = isUp ? 'growth-up' : (isZero ? 'growth-neutral' : 'growth-down');
    var arrow = isUp ? '▲' : (isZero ? '—' : '▼');
    return '<span class="growth-badge ' + cls + '">' + arrow + ' ' +
      (isZero ? '0' : (isUp ? '+' : '') + g.toFixed(1)) + '%</span>' +
      '<span class="stat-sub" style="margin-left:6px">' + esc(subtext) + '</span>';
  }

  function renderSkeletons(type) {
    if (type === 'stats') {
      return '<div class="skeleton-group">' +
        '<div class="skeleton skeleton-tabs"></div>' +
        '<div class="skeleton skeleton-hero"></div>' +
        '<div class="skeleton skeleton-bestday"></div>' +
        '<div class="grid-4col">' +
          '<div class="skeleton skeleton-mini"></div>' +
          '<div class="skeleton skeleton-mini"></div>' +
          '<div class="skeleton skeleton-mini"></div>' +
          '<div class="skeleton skeleton-mini"></div>' +
        '</div>' +
        '<div class="grid-2col">' +
          '<div class="skeleton skeleton-chart"></div>' +
          '<div class="skeleton skeleton-chart"></div>' +
        '</div>' +
        '<div class="skeleton skeleton-table"></div>' +
      '</div>';
    }
    if (type === 'recording') {
      return '<div class="skeleton-group">' +
        '<div class="skeleton skeleton-recording"></div>' +
      '</div>';
    }
    // fallback
    var html = '<div class="stats-grid">';
    for (var i = 0; i < 4; i++) {
      html += '<div class="card skeleton skeleton-card"></div>';
    }
    return html + '</div>';
  }

})();
