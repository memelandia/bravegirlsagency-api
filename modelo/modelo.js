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

    // Agency message
    var agencyMsg = window.CONFIG.modelDashboardMessage || '';
    if (agencyMsg) {
      agencyMsgContainer.innerHTML =
        '<div class="card agency-msg-card">' +
        '<div class="dash-section-title">💬 Mensaje de tu agencia</div>' +
        '<div class="agency-msg-text">' + esc(agencyMsg) + '</div></div>';
      agencyMsgContainer.classList.remove('hidden');
    } else {
      agencyMsgContainer.classList.add('hidden');
    }

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
  // RENDER FULL STATS
  // ═══════════════════════════════════════════════════════════
  function renderFullStats(container, current, lastSame, lastFull, period) {
    var periodLabel = period.lastMonthName + ' 1-' + period.currentDay;

    // --- Motivational message ---
    var motivHtml = renderMotivational(current, lastSame, lastFull, period);

    // --- Progress bar ---
    var progressHtml = renderProgressBar(current, lastFull, period);

    // --- Main stats grid ---
    var html = motivHtml + progressHtml + '<div class="stats-grid">';

    // 1. Monthly revenue
    html += '<div class="card card-highlight">' +
      '<div class="stat-label">💰 Ingresos del mes</div>' +
      '<div class="stat-big">' + fmtCur(current.totalRevenue) + '</div>' +
      '<div style="margin-top:0.5rem">' +
        growthBadge(current.totalRevenue, lastSame.totalRevenue, fmtCur(lastSame.totalRevenue) + ' en ' + periodLabel) +
      '</div></div>';

    // 2. Subscribers
    html += '<div class="card">' +
      '<div class="stat-label">👥 Suscriptores activos</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-top:0.5rem">' +
        fanBlock(current.fansToday, 'Hoy') +
        fanBlock(current.fansThisWeek, 'Semana') +
        fanBlock(current.fansThisMonth, 'Este mes') +
      '</div>' +
      '<div style="margin-top:0.5rem">' +
        growthBadge(current.fansThisMonth, lastSame.fansThisMonth, lastSame.fansThisMonth + ' en ' + periodLabel) +
      '</div></div>';

    // 3. Subscriptions
    html += '<div class="card">' +
      '<div class="stat-label">💎 Suscripciones</div>' +
      '<div class="stat-medium">' + fmtCur(current.subscriptionRevenue) + '</div>' +
      '<div style="margin-top:0.5rem">' +
        growthBadge(current.subscriptionRevenue, lastSame.subscriptionRevenue, fmtCur(lastSame.subscriptionRevenue) + ' en ' + periodLabel) +
      '</div></div>';

    // 4. PPV & Tips
    html += '<div class="card">' +
      '<div class="stat-label">💎 PPV & Tips</div>' +
      '<div class="stat-medium">' + fmtCur(current.ppvRevenue + current.tipRevenue) + '</div>' +
      '<div style="margin-top:0.5rem">' +
        growthBadge(current.ppvRevenue + current.tipRevenue, lastSame.ppvRevenue + lastSame.tipRevenue,
          fmtCur(lastSame.ppvRevenue + lastSame.tipRevenue) + ' en ' + periodLabel) +
      '</div></div>';

    // 5. Messages sold
    html += '<div class="card">' +
      '<div class="stat-label">✉️ Mensajes vendidos</div>' +
      '<div class="stat-medium">' + current.messageCount.toLocaleString() + '</div>' +
      '<div style="margin-top:0.5rem">' +
        growthBadge(current.messageCount, lastSame.messageCount, lastSame.messageCount + ' en ' + periodLabel) +
      '</div>' +
      '<div class="stat-sub">Promedio: ' + fmtCur(current.avgMessagePrice) + '/msg</div>' +
      '</div>';

    // 6. Projection
    html += '<div class="card">' +
      '<div class="stat-label">🎯 Proyección</div>' +
      '<div class="stat-medium" style="color:var(--accent-light)">' + fmtCur(current.projection) + '</div>' +
      '<div style="margin-top:0.5rem">' +
        growthBadge(current.projection, lastFull.totalRevenue,
          'vs ' + fmtCur(lastFull.totalRevenue) + ' ' + period.lastMonthName + ' completo') +
      '</div>' +
      '<div class="stat-sub">Si continúa este ritmo</div>' +
      '</div>';

    html += '</div>'; // close stats-grid

    // --- Second row: smaller stats ---
    html += '<div class="stats-grid" style="margin-top:1rem">';

    // Avg per fan
    html += '<div class="card" style="text-align:center">' +
      '<div class="stat-label">💰 Promedio/Fan</div>' +
      '<div class="stat-medium">' + fmtCur(current.averagePerFan) + '</div></div>';

    // Recent activity
    html += '<div class="card" style="text-align:center">' +
      '<div class="stat-label">⚡ Actividad 24h</div>' +
      '<div class="stat-medium">' + current.recentActivity + ' <span style="font-size:0.8rem;color:var(--text-muted)">ventas</span></div></div>';

    // Best day
    if (current.bestDay.date) {
      var bestDate = new Date(current.bestDay.date);
      html += '<div class="card" style="text-align:center">' +
        '<div class="stat-label">🌟 Mejor día</div>' +
        '<div class="stat-medium" style="color:var(--gold)">' +
          bestDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
        '</div>' +
        '<div class="stat-sub">' + fmtCur(current.bestDay.amount) + '</div></div>';
    }

    html += '</div>'; // close second stats-grid

    // --- Comparison table ---
    html += renderComparison(current, lastSame, lastFull, period);

    // --- Income distribution ---
    html += renderIncomeDistribution(current);

    // --- Last update ---
    html += '<div style="text-align:center;margin-top:1.5rem;color:var(--text-muted);font-size:0.75rem">' +
      '🔄 Actualizado: ' + new Date().toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + '</div>';

    container.innerHTML = html;
  }

  // ═══ MOTIVATIONAL MESSAGE ═══
  function renderMotivational(current, lastSame, lastFull, period) {
    var revGrowth = calcGrowth(current.totalRevenue, lastSame.totalRevenue);
    var daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    var monthPct = ((period.currentDay / daysInMonth) * 100).toFixed(0);
    var revPctOfLastFull = lastFull.totalRevenue > 0 ? ((current.totalRevenue / lastFull.totalRevenue) * 100).toFixed(0) : 100;

    var emoji, headline, message;
    if (revGrowth >= 20) {
      emoji = '🚀'; headline = '¡Estás volando este mes!';
      message = 'Tus ingresos están un <strong style="color:var(--success)">+' + revGrowth.toFixed(0) + '%</strong> por encima del mismo período de ' + period.lastMonthName + '. ¡Increíble trabajo!';
    } else if (revGrowth >= 0) {
      emoji = '💪'; headline = '¡Vas por buen camino!';
      message = 'Ya superaste lo que facturaste en los primeros ' + period.currentDay + ' días de ' + period.lastMonthName + '. ¡Sigue así!';
    } else if (revGrowth >= -15) {
      emoji = '✨'; headline = '¡Cada día cuenta, sigue así!';
      message = 'Estás muy cerca del ritmo de ' + period.lastMonthName + '. Con un poco más de impulso puedes superarlo.';
    } else {
      emoji = '💫'; headline = '¡El mes apenas empieza!';
      message = 'Llevas el <strong style="color:var(--info)">' + revPctOfLastFull + '%</strong> de lo que se facturó en todo ' + period.lastMonthName + ' y solo ha pasado el <strong style="color:var(--info)">' + monthPct + '%</strong> del mes.';
    }

    var fansMsg = current.fansThisMonth > 0
      ? '<br>Este mes han ingresado <strong style="color:var(--accent-light)">' + current.fansThisMonth + ' suscriptores</strong>' + (current.fansToday > 0 ? ' (' + current.fansToday + ' solo hoy)' : '') + '.'
      : '';

    var projMsg = current.projection > 0
      ? '<div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted)">🎯 A este ritmo, podrías cerrar el mes en <strong style="color:var(--success)">' + fmtCur(current.projection) + '</strong></div>'
      : '';

    return '<div class="card" style="margin-bottom:1rem;background:linear-gradient(135deg,rgba(52,211,153,0.08),rgba(255,107,179,0.06));border-color:rgba(52,211,153,0.2)">' +
      '<div style="display:flex;align-items:flex-start;gap:14px">' +
        '<div style="font-size:2.5rem;line-height:1">' + emoji + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:1.15rem;font-weight:800;color:#fff;margin-bottom:6px">' + headline + '</div>' +
          '<div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6">' + message + fansMsg +
            ' <span style="color:var(--text-muted)">Cuantos más reels subas y mejor sea su calidad, más suscriptores llegarán.</span>' +
          '</div>' + projMsg +
        '</div>' +
      '</div></div>';
  }

  // ═══ PROGRESS BAR ═══
  function renderProgressBar(current, lastFull, period) {
    var goal = lastFull.totalRevenue > 0 ? lastFull.totalRevenue : (current.projection || 1);
    var pct = Math.min((current.totalRevenue / goal) * 100, 100);
    var daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    var monthPct = ((period.currentDay / daysInMonth) * 100).toFixed(0);

    var insight;
    if (pct >= parseFloat(monthPct)) {
      insight = '<span style="color:var(--success)">⚡ Vas al ' + pct.toFixed(0) + '% de ' + period.lastMonthName + ' con solo el ' + monthPct + '% del mes — ¡ritmo excelente!</span>';
    } else if (pct >= parseFloat(monthPct) * 0.7) {
      insight = '<span style="color:var(--gold)">📈 Ya alcanzaste el ' + pct.toFixed(0) + '% de ' + period.lastMonthName + '. Con ' + (daysInMonth - period.currentDay) + ' días por delante, tienes mucho margen.</span>';
    } else {
      insight = '<span style="color:var(--info)">💡 Llevas el ' + pct.toFixed(0) + '% y faltan ' + (daysInMonth - period.currentDay) + ' días. ¡Tú puedes!</span>';
    }

    return '<div class="card" style="margin-bottom:1rem">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">' +
        '<span class="stat-label" style="margin:0">📊 Meta vs ' + period.lastMonthName + '</span>' +
        '<span style="font-size:1.25rem;font-weight:800;color:var(--accent-light)">' + pct.toFixed(0) + '%</span>' +
      '</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.max(pct, 3) + '%">' + pct.toFixed(0) + '%</div></div>' +
      '<div class="stat-sub" style="margin-top:0.5rem">Llevas ' + fmtCur(current.totalRevenue) + ' de ' + fmtCur(goal) + ' de ' + period.lastMonthName + '</div>' +
      '<div style="margin-top:0.5rem;font-size:0.8rem">' + insight + '</div>' +
      '</div>';
  }

  // ═══ COMPARISON TABLE ═══
  function renderComparison(current, lastSame, lastFull, period) {
    var currentLabel = period.currentMonthName + ' 1-' + period.currentDay;
    var lastSameLabel = period.lastMonthName + ' 1-' + period.currentDay;
    var lastFullLabel = period.lastMonthName + ' (completo)';

    var metrics = [
      { label: 'Facturación Total', c: current.totalRevenue, ls: lastSame.totalRevenue, lf: lastFull.totalRevenue, cur: true },
      { label: 'Suscripciones', c: current.subscriptionRevenue, ls: lastSame.subscriptionRevenue, lf: lastFull.subscriptionRevenue, cur: true },
      { label: 'PPV & Tips', c: current.ppvRevenue + current.tipRevenue, ls: lastSame.ppvRevenue + lastSame.tipRevenue, lf: lastFull.ppvRevenue + lastFull.tipRevenue, cur: true },
      { label: 'Fans Activos', c: current.fansThisMonth, ls: lastSame.fansThisMonth, lf: lastFull.fansThisMonth, cur: false },
      { label: 'Mensajes Vendidos', c: current.messageCount, ls: lastSame.messageCount, lf: lastFull.messageCount, cur: false },
      { label: 'Promedio/Fan', c: current.averagePerFan, ls: lastSame.averagePerFan, lf: lastFull.averagePerFan, cur: true }
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
        '<td style="padding:10px 4px;text-align:right;color:var(--text-muted);font-size:0.75rem">' + val(m.lf) + '</td>' +
        '</tr>';
    }).join('');

    var summaryEmoji = positiveCount >= metrics.length ? '🏆' : positiveCount >= 3 ? '🔥' : positiveCount > 0 ? '💡' : '📈';
    var summaryColor = positiveCount >= 3 ? 'var(--success)' : 'var(--info)';
    var summaryMsg = positiveCount >= metrics.length ? '¡Todas las métricas por encima del mes pasado!'
      : '<strong>' + positiveCount + ' de ' + metrics.length + '</strong> métricas por encima del mes pasado';

    return '<div class="card" style="margin-top:1.5rem;overflow-x:auto">' +
      '<div class="stat-label">📐 Comparativa con el mes anterior</div>' +
      '<div style="font-size:0.7rem;color:var(--info);margin:0.5rem 0;background:rgba(59,130,246,0.15);padding:2px 8px;border-radius:4px;display:inline-block">Comparación justa: mismos ' + period.currentDay + ' días</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">' +
      '<thead><tr style="border-bottom:2px solid rgba(255,255,255,0.1)">' +
        '<th style="text-align:left;padding:8px;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase">Métrica</th>' +
        '<th style="text-align:right;padding:8px;color:var(--accent-light);font-size:0.7rem;text-transform:uppercase">' + currentLabel + '</th>' +
        '<th style="text-align:right;padding:8px;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase">' + lastSameLabel + '</th>' +
        '<th style="text-align:center;padding:8px;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase">vs Mismo</th>' +
        '<th style="text-align:right;padding:8px;color:var(--text-muted);font-size:0.65rem;text-transform:uppercase">' + lastFullLabel + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="margin-top:12px;padding:10px 14px;border-radius:12px;background:' + (positiveCount >= 3 ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)') + ';display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:1.5rem">' + summaryEmoji + '</span>' +
        '<span style="color:' + summaryColor + ';font-size:0.9rem;font-weight:600">' + summaryMsg + '</span>' +
      '</div></div>';
  }

  // ═══ INCOME DISTRIBUTION ═══
  function renderIncomeDistribution(stats) {
    var total = stats.totalRevenue;
    if (total === 0) return '';

    var subsPct = (stats.subscriptionRevenue / total * 100).toFixed(1);
    var ppvPct = (stats.ppvRevenue / total * 100).toFixed(1);
    var tipsPct = (stats.tipRevenue / total * 100).toFixed(1);

    function bar(label, pct, amount, color) {
      return '<div style="margin-bottom:0.75rem">' +
        '<div class="income-row"><span class="label">' + label + '</span>' +
        '<span class="value">' + pct + '% — ' + fmtCur(amount) + '</span></div>' +
        '<div class="income-bar-track"><div class="income-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div></div>';
    }

    return '<div class="card" style="margin-top:1rem">' +
      '<div class="stat-label">📊 Distribución de ingresos</div>' +
      bar('Suscripciones', subsPct, stats.subscriptionRevenue, '#3B82F6') +
      bar('PPV (Mensajes + Posts)', ppvPct, stats.ppvRevenue, '#FF6BB3') +
      bar('Tips', tipsPct, stats.tipRevenue, '#FFD700') +
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
      '<div class="card">' +
        '<div class="dash-section-title">📹 Tus reels pendientes</div>' +
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
