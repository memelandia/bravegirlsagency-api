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

    loadAllData(cfg);
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
      weekSubRev: weekSubRev, weekPpvRev: weekPpvRev, weekTipRev: weekTipRev
    };
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
    html += '<div class="period-tabs" id="period-tabs">' +
      '<button class="period-tab" data-period="today">Hoy</button>' +
      '<button class="period-tab" data-period="week">Semana</button>' +
      '<button class="period-tab active" data-period="month">Este Mes</button>' +
    '</div>';

    // 0b. MOTIVATIONAL (above hero, contextual)
    html += '<div id="motivational-slot">' + renderMotivational(current, lastSame, lastFull, period, 'month') + '</div>';

    // 1. HERO CARD — revenue big (no sparkline)
    html += '<div class="card card-hero" id="hero-card">' +
      '<div class="hero-label">💰 Ingresos ' + period.currentMonthName + '</div>' +
      '<div class="stat-hero" id="hero-amount">' + fmtCur(current.totalRevenue) + '</div>' +
      '<div class="hero-growth" id="hero-growth">' +
        growthBadge(current.totalRevenue, lastSame.totalRevenue, '') +
        '<span class="hero-vs">vs primeros ' + period.currentDay + ' días de ' + period.lastMonthName + '</span>' +
      '</div>' +
      (current.projection > 0 ?
        '<div class="hero-projection">' +
        '<span class="hero-proj-label">🎯 Previsión:</span>' +
        '<span class="hero-proj-value">' + fmtCur(current.projection) + '</span>' +
        '</div>' : '') +
    '</div>';

    // 1b. BEST DAY CARD (glow)
    if (current.bestDay && current.bestDay.amount > 0) {
      var bdDate = new Date(current.bestDay.date);
      var isToday = bdDate.toDateString() === new Date().toDateString();
      var bdFormatted = bdDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      html += '<div class="card best-day-card' + (isToday ? ' best-day-today' : '') + '">' +
        '<div class="best-day-trophy">🏆</div>' +
        '<div class="best-day-info">' +
          '<div class="best-day-label">' + (isToday ? '¡Tu mejor día es HOY!' : 'Tu mejor día') + '</div>' +
          '<div class="best-day-value">' + fmtCur(current.bestDay.amount) + '</div>' +
          '<div class="best-day-date">' + bdFormatted + '</div>' +
        '</div>' +
        (current.recentActivity > 0 ?
          '<div class="live-dot-wrap">' +
            '<span class="live-dot"></span>' +
            '<span class="live-text">' + current.recentActivity + ' tx últimas 24h</span>' +
          '</div>' : '') +
      '</div>';
    }

    // 2. MINI-STATS ROW (4 cards with avg msg price)
    html += '<div class="grid-4col" id="mini-stats-row">' +
      miniStatCard('👥', current.fansThisMonth, 'Fans que pagaron') +
      miniStatCard('✉️', current.messageCount.toLocaleString(), 'Mensajes vendidos') +
      miniStatCard('💵', fmtCur(current.averagePerFan), 'Por fan de media') +
      miniStatCard('💬', fmtCur(current.avgMessagePrice), 'Precio medio msg') +
    '</div>';

    // 3 + 4. PROGRESS RING + DONUT side by side
    html += '<div class="grid-2col">' +
      renderProgressRing(current, lastFull, period) +
      renderIncomeDistribution(current) +
    '</div>';

    // 5. COMPARISON CARDS
    html += renderComparison(current, lastSame, lastFull, period);

    // 6. Last update
    html += '<div style="text-align:center;margin-top:1.5rem;color:var(--text-muted);font-size:0.75rem">' +
      '🔄 Actualizado: ' + new Date().toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + '</div>';

    container.innerHTML = html;

    // Wire up tab switching
    wireTabSwitching(container);
  }

  function miniStatCard(icon, value, label) {
    return '<div class="card mini-stat-card">' +
      '<div class="mini-stat-icon">' + icon + '</div>' +
      '<div class="mini-stat-value">' + value + '</div>' +
      '<div class="mini-stat-label">' + label + '</div>' +
    '</div>';
  }

  // ═══ SPARKLINE — SVG bar chart of daily revenue ═══
  function renderSparkline(dailyRevenue, period) {
    if (!dailyRevenue) return '';
    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var bars = [];
    var maxVal = 0;
    for (var d = 1; d <= now.getDate(); d++) {
      var key = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');
      var val = dailyRevenue[key] || 0;
      bars.push(val);
      if (val > maxVal) maxVal = val;
    }
    if (maxVal === 0) return '';

    var svgW = 180, svgH = 60;
    var barW = Math.max(2, Math.floor((svgW - bars.length) / bars.length));
    var gap = 1;
    var totalW = bars.length * (barW + gap);

    var rects = bars.map(function(val, i) {
      var h = Math.max(2, (val / maxVal) * (svgH - 4));
      var x = i * (barW + gap);
      var isToday = (i === bars.length - 1);
      var color = isToday ? 'var(--accent)' : 'rgba(255,107,179,0.4)';
      return '<rect x="' + x + '" y="' + (svgH - h) + '" width="' + barW + '" height="' + h + '" rx="1" fill="' + color + '"/>';
    }).join('');

    return '<svg width="' + totalW + '" height="' + svgH + '" viewBox="0 0 ' + totalW + ' ' + svgH + '" style="max-width:100%">' +
      rects + '</svg>';
  }

  // ═══ PERIOD TAB SWITCHING ═══
  function wireTabSwitching(container) {
    var tabs = container.querySelectorAll('.period-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var p = tab.dataset.period;
        updatePeriodView(container, p);
      });
    });
  }

  function updatePeriodView(container, period) {
    var s = _statsCache;
    if (!s.current) return;
    var c = s.current;
    var heroAmount = container.querySelector('#hero-amount');
    var miniRow = container.querySelector('#mini-stats-row');
    var motivSlot = container.querySelector('#motivational-slot');
    if (!heroAmount) return;

    if (period === 'today') {
      heroAmount.textContent = fmtCur(c.todayRevenue);
      if (miniRow) miniRow.innerHTML =
        miniStatCard('👥', c.todayFans, 'Fans hoy') +
        miniStatCard('✉️', c.todayMsgCount.toLocaleString(), 'Msgs hoy') +
        miniStatCard('💵', c.todayFans > 0 ? fmtCur(c.todayRevenue / c.todayFans) : '$0.00', 'Por fan hoy') +
        miniStatCard('💬', fmtCur(c.avgMessagePrice), 'Precio medio msg');
    } else if (period === 'week') {
      heroAmount.textContent = fmtCur(c.weekRevenue);
      if (miniRow) miniRow.innerHTML =
        miniStatCard('👥', c.weekFans, 'Fans semana') +
        miniStatCard('✉️', c.weekMsgCount.toLocaleString(), 'Msgs semana') +
        miniStatCard('💵', c.weekFans > 0 ? fmtCur(c.weekRevenue / c.weekFans) : '$0.00', 'Por fan semana') +
        miniStatCard('💬', fmtCur(c.avgMessagePrice), 'Precio medio msg');
    } else {
      heroAmount.textContent = fmtCur(c.totalRevenue);
      if (miniRow) miniRow.innerHTML =
        miniStatCard('👥', c.fansThisMonth, 'Fans que pagaron') +
        miniStatCard('✉️', c.messageCount.toLocaleString(), 'Mensajes vendidos') +
        miniStatCard('💵', fmtCur(c.averagePerFan), 'Por fan de media') +
        miniStatCard('💬', fmtCur(c.avgMessagePrice), 'Precio medio msg');
    }

    // Update motivational contextual to tab
    if (motivSlot) {
      motivSlot.innerHTML = renderMotivational(s.current, s.lastSame, s.lastFull, s.period, period);
    }
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
      var weekAvg = avgDaily * 7;
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

  // ═══ PROGRESS RING (SVG circle — integrated layout) ═══
  function renderProgressRing(current, lastFull, period) {
    // Goal = last month + 15% (beat it, don't just match it)
    var lastMonthRev = lastFull.totalRevenue;
    var goal = lastMonthRev > 0 ? Math.round(lastMonthRev * 1.15) : (current.projection || 1);
    var pct = Math.min((current.totalRevenue / goal) * 100, 100);
    var remaining = Math.max(goal - current.totalRevenue, 0);

    // Days left in month for $/día calc
    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var daysLeft = daysInMonth - now.getDate();
    var perDayNeeded = daysLeft > 0 ? remaining / daysLeft : 0;

    var r = 80, circumference = 2 * Math.PI * r;
    var dashOffset = circumference - (pct / 100 * circumference);
    var ringColor = pct >= 100 ? '#10b981' : pct >= 70 ? '#FF1F8E' : pct >= 40 ? '#f59e0b' : '#f87171';
    var borderColor = pct >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(255,31,142,0.2)';
    var svgSize = 220;

    // Build the per-day message
    var perDayHtml = '';
    if (pct >= 100) {
      perDayHtml = '<div class="ring-perday ring-perday-done">🎉 ¡Meta superada!</div>';
    } else if (daysLeft > 0) {
      perDayHtml = '<div class="ring-perday">' +
        '<span class="ring-perday-label">Quedan ' + daysLeft + ' día' + (daysLeft !== 1 ? 's' : '') + ' —</span> ' +
        '<span class="ring-perday-value">necesitas ' + fmtCur(perDayNeeded) + '/día</span>' +
      '</div>';
    }

    return '<div class="card ring-card-v2" style="border-color:' + borderColor + '">' +
      '<div class="section-title" style="text-align:center;width:100%">🎯 Meta del mes</div>' +
      '<div class="ring-integrated">' +
        '<div class="ring-svg-wrap">' +
          '<svg width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '" style="max-width:100%">' +
            '<circle cx="110" cy="110" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14"/>' +
            '<circle cx="110" cy="110" r="' + r + '" fill="none" stroke="' + ringColor + '" stroke-width="14" ' +
              'stroke-linecap="round" stroke-dasharray="' + circumference.toFixed(2) + '" stroke-dashoffset="' + dashOffset.toFixed(2) + '" ' +
              'transform="rotate(-90 110 110)" style="transition:stroke-dashoffset 1s ease"/>' +
            '<text x="110" y="96" text-anchor="middle" fill="' + ringColor + '" font-size="34" font-weight="900">' + pct.toFixed(0) + '%</text>' +
            '<text x="110" y="118" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12">' + fmtCur(current.totalRevenue) + '</text>' +
            '<text x="110" y="136" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="11">de ' + fmtCur(goal) + '</text>' +
          '</svg>' +
        '</div>' +
      '</div>' +
      perDayHtml +
      '<div class="ring-meta">Meta = ' + period.lastMonthName + ' + 15%</div>' +
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
          '<div class="cmp-prev">' + period.lastMonthName + ': ' + val(m.ls) + '</div>' +
        '</div>' +
        '<div class="cmp-pill ' + pillCls + '">' + arrow + ' ' + (isZero ? '0' : (isUp ? '+' : '') + g.toFixed(1)) + '%</div>' +
      '</div>';
    }).join('');

    var summaryEmoji = positiveCount >= metrics.length ? '🏆' : positiveCount >= 2 ? '🔥' : positiveCount > 0 ? '💡' : '📈';
    var summaryColor = positiveCount >= 2 ? 'var(--success)' : 'var(--info)';
    var summaryMsg = positiveCount >= metrics.length ? '¡Todo por encima del mes pasado!'
      : '<strong>' + positiveCount + ' de ' + metrics.length + '</strong> métricas mejorando';

    return '<div style="margin-top:1rem">' +
      '<div class="section-title" style="margin-bottom:0.5rem">📊 vs ' + period.lastMonthName + ' <span style="font-size:0.7rem;color:var(--info);font-weight:500">(mismos ' + period.currentDay + ' días)</span></div>' +
      '<div class="cmp-grid">' + cards + '</div>' +
      '<div class="cmp-summary" style="background:' + (positiveCount >= 2 ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)') + '">' +
        '<span style="font-size:1.3rem">' + summaryEmoji + '</span>' +
        '<span style="color:' + summaryColor + ';font-size:0.85rem;font-weight:600">' + summaryMsg + '</span>' +
      '</div></div>';
  }

  // ═══ INCOME DISTRIBUTION — SVG DONUT ═══
  function renderIncomeDistribution(stats) {
    var total = stats.totalRevenue;
    if (total === 0) return '';

    var subs = stats.subscriptionRevenue;
    var ppv  = stats.ppvRevenue;
    var tips = stats.tipRevenue;

    var r = 70, circ = 2 * Math.PI * r, cx = 100, cy = 100;
    var svgW = 200;

    function arc(value, offset, color) {
      var pct = total > 0 ? value / total : 0;
      var dash = pct * circ;
      var gap  = circ - dash;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' +
        'fill="none" stroke="' + color + '" stroke-width="22" ' +
        'stroke-dasharray="' + dash.toFixed(2) + ' ' + gap.toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-(offset * circ)).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt"/>';
    }

    var subsOffset = 0;
    var ppvOffset  = total > 0 ? subs / total : 0;
    var tipsOffset = total > 0 ? (subs + ppv) / total : 0;

    var svgDonut =
      '<svg width="' + svgW + '" height="' + svgW + '" viewBox="0 0 ' + svgW + ' ' + svgW + '" style="max-width:100%">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="22"/>' +
        arc(subs, subsOffset, 'var(--color-subs)') +
        arc(ppv,  ppvOffset,  'var(--color-ppv)') +
        arc(tips, tipsOffset, 'var(--color-tips)') +
        '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="18" font-weight="900">' + fmtCur(total) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-size="11">total</text>' +
      '</svg>';

    function legendItem(label, amount, color) {
      var pct = total > 0 ? (amount / total * 100).toFixed(0) : 0;
      return '<div class="donut-legend-item">' +
        '<div class="donut-legend-dot" style="background:' + color + '"></div>' +
        '<div style="flex:1">' +
          '<div style="font-size:0.8rem;color:var(--text-secondary);font-weight:600">' + label + '</div>' +
          '<div style="font-size:0.95rem;font-weight:800;color:#fff">' + fmtCur(amount) +
            '<span style="font-size:0.7rem;color:var(--text-muted);margin-left:4px">' + pct + '%</span>' +
          '</div>' +
        '</div></div>';
    }

    return '<div class="card donut-card" style="flex-direction:column">' +
      '<div class="section-title" style="width:100%;text-align:center">💎 De dónde viene tu dinero</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:2.5rem;flex-wrap:wrap">' +
        svgDonut +
        '<div>' +
          legendItem('Suscripciones', subs, 'var(--color-subs)') +
          legendItem('Mensajes y Vídeos', ppv, 'var(--color-ppv)') +
          legendItem('Propinas', tips, 'var(--color-tips)') +
        '</div>' +
      '</div></div>';
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

      // Extract reel numbers from ejemplosEnviados (objects with numReel)
      var enviadosNums = [];
      var seenNums = new Set();
      ejemplosEnviados.forEach(function (e) {
        // e is an object like {numReel: "10", subcuenta: "VICKYLUNA", ...}
        var raw = (typeof e === 'object' && e !== null) ? (e.numReel || '') : String(e);
        var num = parseInt(String(raw).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0 && !seenNums.has(num)) {
          seenNums.add(num);
          enviadosNums.push(num);
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
      var totalPendientes = pendientes.length;
      var pct = totalEnviados > 0 ? Math.round((totalGrabados / totalEnviados) * 100) : 0;

      console.log('📹 Parsed:', totalEnviados, 'enviados,', totalGrabados, 'grabados,', totalPendientes, 'pendientes');

      renderRecording(container, totalGrabados, totalPendientes, totalEnviados, pct, pendientes);
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
      pendientesArr.sort(function (a, b) { return a - b; }).forEach(function (n) {
        html += '<div class="rec-pending-item">' +
          '<span class="rec-pending-num">#' + n + '</span>' +
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

  function fanBlock(num, label) {
    return '<div style="text-align:center;padding:0.5rem;border-radius:10px;background:rgba(255,255,255,0.03)">' +
      '<div style="font-size:1.5rem;font-weight:800;color:#fff">' + num + '</div>' +
      '<div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;margin-top:4px">' + label + '</div></div>';
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
