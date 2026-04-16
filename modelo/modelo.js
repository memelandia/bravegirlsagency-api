/* ============================================
   BraveGirls — Model Dashboard Logic
   Reads slug from window.MODEL_SLUG
   ============================================ */

(function () {
  'use strict';

  // ═══ INIT ═══
  const slug = window.MODEL_SLUG;
  if (!slug) {
    console.error('MODEL_SLUG not defined');
    return;
  }

  const SESSION_KEY = 'bg-model-session';

  // Wait for config.js to load
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

    // Set greeting
    document.getElementById('login-greeting').textContent = 'Hola, ' + modelCfg.name + ' 👋';
    document.getElementById('dash-model-name').textContent = modelCfg.name;

    // Check existing session
    var session = getSession();
    if (session && session.slug === slug) {
      showDashboard(modelCfg);
      return;
    }

    // Login form
    var form = document.getElementById('login-form');
    var input = document.getElementById('login-password');
    var errorEl = document.getElementById('login-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = input.value.trim();
      if (pw === modelCfg.dashboardPassword) {
        saveSession(modelCfg);
        showDashboard(modelCfg);
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

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ═══ SHOW DASHBOARD ═══
  function showDashboard(cfg) {
    document.getElementById('login-screen').style.display = 'none';
    var dash = document.getElementById('dashboard-screen');
    dash.classList.add('active');

    // Logout
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

    // Show skeletons
    statsContainer.innerHTML = renderSkeletons(4);
    recordingContainer.innerHTML = renderSkeletons(1);

    // Agency message
    var agencyMsg = window.CONFIG.modelDashboardMessage || '';
    if (agencyMsg) {
      agencyMsgContainer.innerHTML =
        '<div class="card agency-msg-card">' +
        '<div class="dash-section-title">💬 Mensaje de tu agencia</div>' +
        '<div class="agency-msg-text">' + escapeHtml(agencyMsg) + '</div>' +
        '</div>';
      agencyMsgContainer.classList.remove('hidden');
    } else {
      agencyMsgContainer.classList.add('hidden');
    }

    // Load OnlyFans stats (only if OnlyMonster ID is valid)
    var hasOM = cfg.onlyMonsterId && cfg.onlyMonsterId !== 'PENDING' && cfg.onlyMonsterId !== 'MODELO_ID_AQUI';
    if (hasOM) {
      loadOnlyFansStats(cfg, statsContainer);
    } else {
      statsContainer.innerHTML =
        '<div class="error-state"><div class="icon">📊</div>' +
        '<div class="msg">Estadísticas de OnlyFans no disponibles aún.<br>Tu cuenta se está configurando.</div></div>';
    }

    // Load recording data (always attempt)
    if (cfg.driveKey) {
      loadRecordingData(cfg, recordingContainer);
    } else {
      recordingContainer.innerHTML =
        '<div class="error-state"><div class="icon">📹</div>' +
        '<div class="msg">Sin datos de grabación disponibles.</div></div>';
    }
  }

  // ═══ ONLYFANS STATS ═══
  async function loadOnlyFansStats(cfg, container) {
    try {
      var omId = cfg.onlyMonsterId;
      var now = new Date();
      var currentDay = now.getDate();

      var currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
      var currentMonthEnd = now;
      var lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0));
      var lastMonthSamePeriodEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, currentDay, 23, 59, 59, 999));

      var results = await Promise.all([
        fetchAllTransactions(omId, currentMonthStart, currentMonthEnd),
        fetchAllTransactions(omId, lastMonthStart, lastMonthSamePeriodEnd)
      ]);

      var currentStats = calculateStats(results[0], 'current');
      var lastStats = calculateStats(results[1], 'last');

      var monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      var periodInfo = {
        currentDay: currentDay,
        currentMonthName: monthNames[now.getMonth()],
        lastMonthName: monthNames[now.getMonth() === 0 ? 11 : now.getMonth() - 1]
      };

      renderStats(container, currentStats, lastStats, periodInfo);
    } catch (err) {
      console.error('Stats error:', err);
      container.innerHTML =
        '<div class="error-state"><div class="icon">⚠️</div>' +
        '<div class="msg">No se pudieron cargar tus stats. Intenta en unos minutos.</div></div>';
    }
  }

  // ═══ FETCH TRANSACTIONS (from dashboard-modelo.js) ═══
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

  // ═══ CALCULATE STATS (from dashboard-modelo.js) ═══
  function calculateStats(transactions, period) {
    var totalRevenue = 0, subscriptionRevenue = 0, ppvRevenue = 0, tipRevenue = 0;
    var messageRevenue = 0, messageCount = 0;
    var uniqueFans = new Set();
    var fansThisMonth = new Set();
    var now = new Date();

    transactions.forEach(function (tx) {
      if (tx.status !== 'done' && tx.status !== 'loading') return;

      var netAmount = tx.amount * 0.8;
      totalRevenue += netAmount;

      var fanId = tx.fan && tx.fan.id;
      if (fanId) {
        uniqueFans.add(fanId);
        fansThisMonth.add(fanId);
      }

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
      fansThisMonth: fansThisMonth.size,
      averagePerFan: uniqueFans.size > 0 ? (totalRevenue / uniqueFans.size) : 0,
      projection: projection
    };
  }

  // ═══ RENDER STATS ═══
  function renderStats(container, current, last, period) {
    var periodLabel = period.lastMonthName + ' 1-' + period.currentDay;

    function growthHtml(curr, prev, label) {
      if (!prev || prev === 0) return curr > 0
        ? '<span class="growth-badge growth-up">▲ +100%</span>'
        : '<span class="growth-badge growth-neutral">— 0%</span>';
      var pct = ((curr - prev) / prev * 100).toFixed(1);
      var isUp = pct > 0;
      var cls = isUp ? 'growth-up' : (pct == 0 ? 'growth-neutral' : 'growth-down');
      var arrow = isUp ? '▲' : (pct == 0 ? '—' : '▼');
      return '<span class="growth-badge ' + cls + '">' + arrow + ' ' +
        (isUp ? '+' : '') + pct + '%</span>' +
        '<span class="stat-sub">' + escapeHtml(label) + '</span>';
    }

    container.innerHTML =
      '<div class="stats-grid">' +

      // Revenue
      '<div class="card card-highlight">' +
        '<div class="stat-label">💰 Ingresos del mes</div>' +
        '<div class="stat-big">' + formatCurrency(current.totalRevenue) + '</div>' +
        '<div style="margin-top:0.5rem">' +
          growthHtml(current.totalRevenue, last.totalRevenue, formatCurrency(last.totalRevenue) + ' en ' + periodLabel) +
        '</div>' +
        (current.projection > 0
          ? '<div class="stat-sub" style="margin-top:0.5rem">🎯 Proyección: ' + formatCurrency(current.projection) + '</div>'
          : '') +
      '</div>' +

      // Subscribers
      '<div class="card">' +
        '<div class="stat-label">👥 Suscriptores activos</div>' +
        '<div class="stat-medium">' + current.fansThisMonth.toLocaleString() + '</div>' +
        '<div style="margin-top:0.5rem">' +
          growthHtml(current.fansThisMonth, last.fansThisMonth, last.fansThisMonth + ' en ' + periodLabel) +
        '</div>' +
      '</div>' +

      // Messages
      '<div class="card">' +
        '<div class="stat-label">✉️ Mensajes vendidos</div>' +
        '<div class="stat-medium">' + current.messageCount.toLocaleString() + '</div>' +
        '<div style="margin-top:0.5rem">' +
          growthHtml(current.messageCount, last.messageCount, last.messageCount + ' en ' + periodLabel) +
        '</div>' +
      '</div>' +

      // Income breakdown
      '<div class="card" style="grid-column: 1 / -1;">' +
        '<div class="stat-label">📊 Desglose de ingresos</div>' +
        renderIncomeBreakdown(current) +
      '</div>' +

      '</div>';
  }

  function renderIncomeBreakdown(stats) {
    var total = stats.totalRevenue;
    if (total === 0) return '<div style="color:var(--text-muted);font-size:0.85rem">Sin datos aún</div>';

    var subsPct = (stats.subscriptionRevenue / total * 100).toFixed(1);
    var ppvPct = (stats.ppvRevenue / total * 100).toFixed(1);
    var tipsPct = (stats.tipRevenue / total * 100).toFixed(1);

    function bar(label, pct, amount, color) {
      return '<div style="margin-bottom:0.75rem">' +
        '<div class="income-row"><span class="label">' + label + '</span>' +
        '<span class="value">' + pct + '% — ' + formatCurrency(amount) + '</span></div>' +
        '<div class="income-bar-track"><div class="income-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '</div>';
    }

    return bar('Suscripciones', subsPct, stats.subscriptionRevenue, '#3B82F6') +
           bar('PPV (Mensajes + Posts)', ppvPct, stats.ppvRevenue, '#FF6BB3') +
           bar('Tips', tipsPct, stats.tipRevenue, '#FFD700');
  }

  // ═══ RECORDING TRACKER ═══
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

      // Parse production + drive data
      var produccion = data.produccion || {};
      var drive = data.drive || {};

      var modelProd = findModelData(produccion, driveKey);
      var modelDrive = findModelData(drive, driveKey);

      // Compute recording status
      var ejemplosEnviados = modelProd.ejemplosEnviados || [];
      var carpetasGrabadas = modelDrive.carpetasGrabadas || [];

      // Extract reel numbers from ejemplosEnviados
      var enviadosNums = [];
      ejemplosEnviados.forEach(function (e) {
        var num = typeof e === 'number' ? e : parseInt(String(e).replace(/\D/g, ''), 10);
        if (!isNaN(num)) enviadosNums.push(num);
      });

      // Extract reel numbers from carpetasGrabadas
      var grabadosNums = [];
      carpetasGrabadas.forEach(function (c) {
        var num = typeof c === 'number' ? c : parseInt(String(c).replace(/\D/g, ''), 10);
        if (!isNaN(num)) grabadosNums.push(num);
      });

      var grabadosSet = new Set(grabadosNums);
      var totalEnviados = enviadosNums.length;
      var totalGrabados = enviadosNums.filter(function (n) { return grabadosSet.has(n); }).length;
      var pendientes = enviadosNums.filter(function (n) { return !grabadosSet.has(n); });
      var totalPendientes = pendientes.length;
      var pct = totalEnviados > 0 ? Math.round((totalGrabados / totalEnviados) * 100) : 0;

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
  function formatCurrency(n) {
    return '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function escapeHtml(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function renderSkeletons(count) {
    var html = '<div class="stats-grid">';
    for (var i = 0; i < count; i++) {
      html += '<div class="card skeleton skeleton-card"></div>';
    }
    html += '</div>';
    return html;
  }

})();
