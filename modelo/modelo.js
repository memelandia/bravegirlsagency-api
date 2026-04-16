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
    loadAllData(cfg);
  }

  // ═══ DATA LOADING ═══
  async function loadAllData(cfg) {
    var statsContainer = document.getElementById('stats-section');
    var recordingContainer = document.getElementById('recording-section');
    var agencyMsgContainer = document.getElementById('agency-msg-section');

    statsContainer.innerHTML = renderSkeletons(6);
    recordingContainer.innerHTML = renderSkeletons(1);

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
      transactionCount: transactions.length
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER FULL STATS — v3 visual redesign
  // ═══════════════════════════════════════════════════════════
  function renderFullStats(container, current, lastSame, lastFull, period) {
    var html = '';

    // 1. HERO CARD — revenue big
    html += '<div class="card card-hero">' +
      '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;' +
        'letter-spacing:0.1em;color:rgba(255,107,179,0.7);margin-bottom:0.5rem">' +
        '💰 Ingresos ' + period.currentMonthName +
      '</div>' +
      '<div class="stat-hero">' + fmtCur(current.totalRevenue) + '</div>' +
      '<div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">' +
        growthBadge(current.totalRevenue, lastSame.totalRevenue, '') +
        '<span style="color:var(--text-muted);font-size:0.8rem">' +
          'vs primeros ' + period.currentDay + ' días de ' + period.lastMonthName +
        '</span>' +
      '</div>' +
      (current.projection > 0 ?
        '<div style="margin-top:0.75rem;padding:0.6rem 0.9rem;border-radius:10px;' +
        'background:rgba(255,255,255,0.04);display:inline-flex;align-items:center;gap:0.5rem">' +
        '<span style="font-size:0.75rem;color:var(--text-muted)">🎯 Previsión:</span>' +
        '<span style="font-size:0.9rem;font-weight:700;color:var(--success)">' +
        fmtCur(current.projection) + '</span>' +
        '</div>' : '') +
    '</div>';

    // 2. MINI-STATS ROW (3 cards)
    html += '<div class="grid-3col">' +
      '<div class="card mini-stat-card">' +
        '<div class="mini-stat-icon">👥</div>' +
        '<div class="mini-stat-value">' + current.fansThisMonth + '</div>' +
        '<div class="mini-stat-label">Fans que pagaron</div>' +
      '</div>' +
      '<div class="card mini-stat-card">' +
        '<div class="mini-stat-icon">✉️</div>' +
        '<div class="mini-stat-value">' + current.messageCount.toLocaleString() + '</div>' +
        '<div class="mini-stat-label">Mensajes vendidos</div>' +
      '</div>' +
      '<div class="card mini-stat-card">' +
        '<div class="mini-stat-icon">💵</div>' +
        '<div class="mini-stat-value">' + fmtCur(current.averagePerFan) + '</div>' +
        '<div class="mini-stat-label">Por fan de media</div>' +
      '</div>' +
    '</div>';

    // 3 + 4. PROGRESS RING + DONUT side by side
    html += '<div class="grid-2col">' +
      renderProgressRing(current, lastFull, period) +
      renderIncomeDistribution(current) +
    '</div>';

    // 5. COMPARISON TABLE (simplified)
    html += renderComparison(current, lastSame, lastFull, period);

    // 6. MOTIVATIONAL (at the end)
    html += renderMotivational(current, lastSame, lastFull, period);

    // 7. Last update
    html += '<div style="text-align:center;margin-top:1.5rem;color:var(--text-muted);font-size:0.75rem">' +
      '🔄 Actualizado: ' + new Date().toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + '</div>';

    container.innerHTML = html;
  }

  // ═══ MOTIVATIONAL MESSAGE (at end, shorter) ═══
  function renderMotivational(current, lastSame, lastFull, period) {
    var revGrowth = calcGrowth(current.totalRevenue, lastSame.totalRevenue);

    var emoji, headline, message;
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

    return '<div class="card" style="margin-top:1rem;background:linear-gradient(135deg,rgba(52,211,153,0.06),rgba(255,107,179,0.04));border-color:rgba(52,211,153,0.15)">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:2rem;line-height:1">' + emoji + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:1rem;font-weight:800;color:#fff;margin-bottom:4px">' + headline + '</div>' +
          '<div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">' + message + '</div>' +
        '</div>' +
      '</div></div>';
  }

  // ═══ PROGRESS RING (SVG circle) ═══
  function renderProgressRing(current, lastFull, period) {
    var goal = lastFull.totalRevenue > 0 ? lastFull.totalRevenue : (current.projection || 1);
    var pct = Math.min((current.totalRevenue / goal) * 100, 100);

    var r = 80, circumference = 2 * Math.PI * r;
    var dashOffset = circumference - (pct / 100 * circumference);
    var ringColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#FF1F8E' : '#f59e0b';
    var borderColor = pct >= 80 ? 'rgba(16,185,129,0.3)' : 'rgba(255,31,142,0.2)';
    var svgSize = 200;

    return '<div class="card ring-card" style="border-color:' + borderColor + '">' +
      '<div style="text-align:center">' +
        '<div class="section-title">🎯 Meta del mes</div>' +
        '<svg width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '" style="max-width:100%">' +
          '<circle cx="100" cy="100" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14"/>' +
          '<circle cx="100" cy="100" r="' + r + '" fill="none" stroke="' + ringColor + '" stroke-width="14" ' +
            'stroke-linecap="round" stroke-dasharray="' + circumference.toFixed(2) + '" stroke-dashoffset="' + dashOffset.toFixed(2) + '" ' +
            'transform="rotate(-90 100 100)" style="transition:stroke-dashoffset 1s ease"/>' +
          '<text x="100" y="92" text-anchor="middle" fill="' + ringColor + '" font-size="36" font-weight="900">' + pct.toFixed(0) + '%</text>' +
          '<text x="100" y="118" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="13">completado</text>' +
        '</svg>' +
      '</div>' +
      '<div class="ring-info">' +
        '<div class="ring-label">Llevas</div>' +
        '<div class="ring-value">' + fmtCur(current.totalRevenue) + '</div>' +
        '<div class="ring-label" style="margin-top:12px">Meta</div>' +
        '<div class="ring-value-secondary">' + fmtCur(goal) + '</div>' +
        '<div class="ring-note">(' + period.lastMonthName + ' completo)</div>' +
      '</div>' +
    '</div>';
  }

  // ═══ COMPARISON TABLE (simplified) ═══
  function renderComparison(current, lastSame, lastFull, period) {
    var currentLabel = period.currentMonthName;
    var lastSameLabel = period.lastMonthName;

    var metrics = [
      { label: '💰 Total del mes', c: current.totalRevenue, ls: lastSame.totalRevenue, cur: true },
      { label: '👥 Fans que pagaron', c: current.fansThisMonth, ls: lastSame.fansThisMonth, cur: false },
      { label: '✉️ Mensajes y Vídeos', c: current.ppvRevenue + current.tipRevenue, ls: lastSame.ppvRevenue + lastSame.tipRevenue, cur: true },
      { label: '💎 Suscripciones', c: current.subscriptionRevenue, ls: lastSame.subscriptionRevenue, cur: true }
    ];

    var positiveCount = 0;
    metrics.forEach(function (m) { if (calcGrowth(m.c, m.ls) > 0) positiveCount++; });

    var rows = metrics.map(function (m) {
      var g = calcGrowth(m.c, m.ls);
      var isUp = g > 0; var isZero = g === 0;
      var color = isUp ? 'var(--success)' : (isZero ? 'var(--text-muted)' : 'var(--danger)');
      var arrow = isUp ? '▲' : (isZero ? '—' : '▼');
      var bg = isUp ? 'rgba(52,211,153,0.08)' : (isZero ? 'transparent' : 'rgba(248,113,113,0.08)');
      var val = function (v) { return m.cur ? fmtCur(v) : v.toLocaleString(); };

      return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">' +
        '<td style="padding:10px 8px;color:#E5E7EB;font-size:0.85rem">' + m.label + '</td>' +
        '<td style="padding:10px 8px;text-align:right;color:#fff;font-weight:700">' + val(m.c) + '</td>' +
        '<td style="padding:10px 8px;text-align:right;color:var(--text-muted);font-size:0.85rem">' + val(m.ls) + '</td>' +
        '<td style="padding:10px 8px;text-align:center"><span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:' + bg + ';color:' + color + ';font-weight:700;font-size:0.8rem">' +
          arrow + ' ' + (isZero ? '0' : (isUp ? '+' : '') + g.toFixed(1)) + '%</span></td>' +
        '</tr>';
    }).join('');

    var summaryEmoji = positiveCount >= metrics.length ? '🏆' : positiveCount >= 2 ? '🔥' : positiveCount > 0 ? '💡' : '📈';
    var summaryColor = positiveCount >= 2 ? 'var(--success)' : 'var(--info)';
    var summaryMsg = positiveCount >= metrics.length ? '¡Todo por encima del mes pasado!'
      : '<strong>' + positiveCount + ' de ' + metrics.length + '</strong> métricas mejorando';

    return '<div class="card" style="margin-top:1rem;overflow-x:auto">' +
      '<div class="section-title">📊 Tu progreso vs el mes pasado</div>' +
      '<div style="font-size:0.7rem;color:var(--info);margin:0.5rem 0;background:rgba(59,130,246,0.15);padding:2px 8px;border-radius:4px;display:inline-block">Comparación justa: mismos ' + period.currentDay + ' días</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">' +
      '<thead><tr style="border-bottom:2px solid rgba(255,255,255,0.1)">' +
        '<th style="text-align:left;padding:8px;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase">Métrica</th>' +
        '<th style="text-align:right;padding:8px;color:var(--accent-light);font-size:0.7rem;text-transform:uppercase">' + currentLabel + '</th>' +
        '<th style="text-align:right;padding:8px;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase">' + lastSameLabel + '</th>' +
        '<th style="text-align:center;padding:8px;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase">Cambio</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="margin-top:12px;padding:10px 14px;border-radius:12px;background:' + (positiveCount >= 2 ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)') + ';display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:1.5rem">' + summaryEmoji + '</span>' +
        '<span style="color:' + summaryColor + ';font-size:0.9rem;font-weight:600">' + summaryMsg + '</span>' +
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
    var borderColor, bgStyle, titleText;
    if (pct >= 100) {
      borderColor = 'rgba(16,185,129,0.4)';
      bgStyle = 'background:rgba(16,185,129,0.06);';
      titleText = '🎉 ¡Todo grabado!';
    } else if (pct >= 70) {
      borderColor = 'rgba(251,191,36,0.3)';
      bgStyle = '';
      titleText = '📹 Tus reels pendientes';
    } else {
      borderColor = 'rgba(255,31,142,0.2)';
      bgStyle = '';
      titleText = '📹 Tus reels pendientes';
    }

    var chipsHtml = '';
    if (pendientesArr.length > 0) {
      chipsHtml = '<div style="margin-top:0.75rem"><div class="stat-sub" style="margin-bottom:0.4rem">⏳ Faltan grabar:</div>' +
        '<div class="pending-chips">';
      pendientesArr.sort(function (a, b) { return a - b; }).forEach(function (n) {
        chipsHtml += '<span class="chip">#' + n + '</span>';
      });
      chipsHtml += '</div></div>';
    }

    container.innerHTML =
      '<div class="card" style="border-color:' + borderColor + ';' + bgStyle + '">' +
        '<div class="dash-section-title">' + titleText + '</div>' +
        '<div class="recording-summary">' +
          '<div class="recording-stat" style="color:var(--success)"><span class="num">' + grabados + '</span> grabados</div>' +
          '<div class="recording-stat" style="color:var(--gold)"><span class="num">' + pendientesCount + '</span> pendientes</div>' +
          '<div class="recording-stat" style="color:var(--text-muted)">de ' + enviados + ' enviados</div>' +
        '</div>' +
        '<div class="progress-track">' +
          '<div class="progress-fill" style="width:' + Math.max(pct, 3) + '%">' + pct + '%</div>' +
        '</div>' +
        chipsHtml +
      '</div>';
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

  function renderSkeletons(count) {
    var html = '<div class="stats-grid">';
    for (var i = 0; i < count; i++) {
      html += '<div class="card skeleton skeleton-card"></div>';
    }
    return html + '</div>';
  }

})();
