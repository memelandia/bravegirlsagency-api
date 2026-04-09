/* ============================================
   BraveGirls Marketing Pipeline — App Logic
   v3 — Parallel load + client-side computed resumen
   ============================================ */

(function () {
  'use strict';

  // --- CONFIG ---
  
  const API_URL = 'https://script.google.com/macros/s/AKfycbzuT0PNN1l52QcuHgPdGGezvrSh1FzGOo3bR1gxZzuw9-R1z8aM1dvtyiBJQ8bP37XO9A/exec';
  const API_KEY = 'BG-Franco2025-Pipeline';
  const TIMEOUT_MS = 90000;
  const DRIVE_TIMEOUT_MS = 200000; // Drive needs ~130s, give it 200s
  const CACHE_KEY = 'bg-marketing-v3';
  const PUBLISH_RATE = 2.5; // reels/day average for dias de contenido calc

  // Endpoints that actually work (alertas is computed client-side)
  const ENDPOINTS = [
    { action: 'stock', label: 'Stock / Calendario' },
    { action: 'produccion', label: 'Pipeline' },
    { action: 'drive', label: 'Drive' },
  ];

  let loadingTimer = null;
  let loadingStartTime = null;

  // --- DOM REFS ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    loadingOverlay: $('#loading-overlay'),
    errorOverlay: $('#error-overlay'),
    errorMessage: $('#error-message'),
    errorRetryBtn: $('#error-retry-btn'),
    dashboard: $('#dashboard'),
    connectionStatus: $('#connection-status'),
    lastUpdate: $('#last-update'),
    cacheInfo: $('#cache-info'),
    refreshBtn: $('#refresh-btn'),
    alertsSection: $('#alerts-section'),
    summaryBar: $('#summary-bar'),
    modelsTbody: $('#models-tbody'),
    modal: $('#model-modal'),
    modalTitle: $('#modal-title'),
    modalClose: $('#modal-close'),
    loadingStatus: $('#loading-status'),
  };

  let currentData = null;

  // ============================================
  // HELPERS
  // ============================================

  function timeAgo(dateStr) {
    if (!dateStr) return 'Sin datos';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const diffMs = Date.now() - date;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return 'hace ' + mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return 'hace ' + hours + 'h';
    const days = Math.floor(hours / 24);
    return 'hace ' + days + ' día' + (days !== 1 ? 's' : '');
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    var m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
  }

  function daysAgoText(days) {
    if (days == null) return 'Sin datos';
    if (days === 0) return 'Hoy';
    if (days === 1) return 'hace 1 día';
    return 'hace ' + days + ' días';
  }

  function statusOrder(s) {
    return s === 'critico' ? 0 : s === 'bajo' ? 1 : s === 'ok' ? 2 : 3;
  }

  function alertIcon(t) {
    return t === 'critico' ? '🚨' : t === 'bajo' ? '⚠️' : t === 'warning' ? '⚡' : t === 'info' ? '💡' : 'ℹ️';
  }

  function driveLabel(s) {
    return { activa:'Activa', normal:'Normal', inactiva:'Inactiva', sin_datos:'Sin datos', error:'Error' }[s] || s || 'Sin datos';
  }

  function esc(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // ============================================
  // CACHE
  // ============================================

  function saveCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data, ts: Date.now() })); } catch(e) {}
  }

  function loadCache() {
    try {
      var r = localStorage.getItem(CACHE_KEY);
      return r ? JSON.parse(r) : null;
    } catch(e) { return null; }
  }

  // ============================================
  // LOADING UI
  // ============================================

  function showLoading(fullOverlay) {
    if (fullOverlay) {
      dom.loadingOverlay.classList.remove('hidden');
      dom.errorOverlay.classList.add('hidden');
      dom.dashboard.classList.add('hidden');
    }
    loadingStartTime = Date.now();
    var t = document.querySelector('.loading-timer');
    if (t) t.textContent = '0s';
    clearInterval(loadingTimer);
    loadingTimer = setInterval(function() {
      var s = Math.floor((Date.now() - loadingStartTime) / 1000);
      if (t) t.textContent = s + 's';
    }, 1000);
  }

  function hideLoading() {
    dom.loadingOverlay.classList.add('hidden');
    clearInterval(loadingTimer);
  }

  function showError(msg) {
    hideLoading();
    if (!dom.dashboard.classList.contains('hidden')) {
      showToast('⚠️ ' + msg);
      return;
    }
    dom.errorOverlay.classList.remove('hidden');
    dom.errorMessage.textContent = msg;
  }

  function showDashboard() {
    hideLoading();
    dom.errorOverlay.classList.add('hidden');
    dom.dashboard.classList.remove('hidden');
  }

  function setStep(text) {
    var el = dom.loadingStatus;
    if (el) el.textContent = text;
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;bottom:2rem;right:2rem;padding:0.8rem 1.4rem;background:#78350f;color:#fbbf24;border:1px solid #f59e0b;border-radius:8px;font-size:0.88rem;font-weight:600;z-index:9000;opacity:0;transition:opacity 0.3s;max-width:420px';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(function() { t.style.opacity = '0'; }, 6000);
  }

  // ============================================
  // BUILD RESUMEN CLIENT-SIDE from calendario + produccion + drive
  // ============================================

  function findModelData(obj, key) {
    if (!obj) return {};
    // 1. Exact match
    if (obj[key]) return obj[key];
    // 2. Case insensitive + partial match
    var lower = key.toLowerCase();
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.toLowerCase() === lower) return obj[k];
      if (k.toLowerCase().indexOf(lower) === 0) return obj[k];
      if (lower.indexOf(k.toLowerCase()) === 0) return obj[k];
    }
    return {};
  }

  function buildFullData(calendario, produccion, drive) {
    var MODELS = ['ARIANA','LUCY','VICKY','BELLA','CARMEN','LEXI'];
    var modelos = {};
    var totalEditados = 0;
    var totalPipeline = 0;
    var totalProduccionActiva = 0;
    var totalEjemplosPrep = 0;
    var totalDias = 0;
    var countDias = 0;
    var criticos = 0, bajos = 0, ok = 0, inactivos = 0;

    MODELS.forEach(function(key) {
      var cal = findModelData(calendario, key);
      var prod = findModelData(produccion, key);
      var drv = findModelData(drive, key);

      var stockEditados = cal.editados || 0;
      var stockStatus = cal.stockStatus || (stockEditados <= 3 ? 'critico' : stockEditados <= 6 ? 'bajo' : 'ok');
      var diasDeContenido = cal.diasDeContenido != null ? cal.diasDeContenido : (stockEditados / PUBLISH_RATE);
      var enPipeline = (prod.enPreparacion || 0) + (prod.listoParaEditar || 0) + (prod.enEdicion || 0);
      var enProduccion = (prod.listoParaEditar || 0) + (prod.enEdicion || 0);
      var actDrive = drv.actividadStatus || 'sin_datos';

      totalEditados += stockEditados;
      totalPipeline += enPipeline;
      totalProduccionActiva += enProduccion;
      totalEjemplosPrep += (prod.enPreparacion || 0);
      if (diasDeContenido != null) { totalDias += diasDeContenido; countDias++; }
      if (stockStatus === 'critico') criticos++;
      else if (stockStatus === 'bajo') bajos++;
      else ok++;
      if (actDrive === 'inactiva') inactivos++;

      modelos[key] = {
        nombre: cal.nombre || prod.nombre || drv.nombre || key,
        stockEditados: stockEditados,
        stockStatus: stockStatus,
        diasDeContenido: diasDeContenido,
        enPipeline: enPipeline,
        publicadosRecientes: cal.publicados || 0,
        actividadDrive: actDrive,
        diasDesdeUltimaSubida: drv.diasDesdeUltimaSubida,
        diasDesdeUltimoEjemplo: prod.diasDesdeUltimoEjemplo,
        ultimoEjemploEnviado: prod.ultimoEjemploEnviado,
        crudosRecientes: drv.archivosUltimos7Dias || 0,
        tieneEjemplosNotion: cal.tieneEjemplosNotion != null
          ? cal.tieneEjemplosNotion
          : (prod.tieneEjemplosNotion != null
            ? prod.tieneEjemplosNotion
            : true),
      };
    });

    var resumen = {
      totalEditadosDisponibles: totalEditados,
      totalEnPipeline: totalPipeline,
      totalProduccionActiva: totalProduccionActiva,
      totalEjemplosPrep: totalEjemplosPrep,
      totalPublicadosRecientes: 0,
      diasDeContenidoPromedio: countDias > 0 ? +(totalDias / countDias).toFixed(1) : 0,
      modelosCriticos: criticos,
      modelosBajos: bajos,
      modelosOk: ok,
      modelosInactivos: inactivos,
      totalModelos: MODELS.length,
      modelos: modelos,
    };

    // Build alertas client-side
    var alertas = [];
    MODELS.forEach(function(key) {
      var m = modelos[key];
      if (m.stockStatus === 'critico') {
        alertas.push({
          tipo: 'critico', categoria: 'stock', modelo: m.nombre, modeloKey: key,
          mensaje: m.nombre + ': Solo ' + m.stockEditados + ' reel(es) listos para publicar',
          detalle: 'Contenido para ' + (m.diasDeContenido != null ? m.diasDeContenido.toFixed(1) : '?') + ' día(s)',
          valor: m.stockEditados,
        });
      } else if (m.stockStatus === 'bajo') {
        alertas.push({
          tipo: 'bajo', categoria: 'stock', modelo: m.nombre, modeloKey: key,
          mensaje: m.nombre + ': ' + m.stockEditados + ' reels disponibles — menos de 3 días',
          detalle: 'Contenido para ' + (m.diasDeContenido != null ? m.diasDeContenido.toFixed(1) : '?') + ' día(s)',
          valor: m.stockEditados,
        });
      }
      if (m.diasDesdeUltimaSubida != null && m.diasDesdeUltimaSubida >= 10) {
        alertas.push({
          tipo: 'warning', categoria: 'drive', modelo: m.nombre, modeloKey: key,
          mensaje: m.nombre + ': Sin subir crudos hace ' + m.diasDesdeUltimaSubida + ' días',
          detalle: 'Última subida: ' + formatDateShort(((drive || {})[key] || {}).ultimaSubida),
          valor: m.diasDesdeUltimaSubida,
        });
      }
      if (m.diasDesdeUltimoEjemplo != null && m.diasDesdeUltimoEjemplo >= 5) {
        alertas.push({
          tipo: 'info', categoria: 'ejemplos', modelo: m.nombre, modeloKey: key,
          mensaje: m.nombre + ': No envías ejemplos hace ' + m.diasDesdeUltimoEjemplo + ' días',
          detalle: 'Último ejemplo: ' + formatDateShort(m.ultimoEjemploEnviado),
          valor: m.diasDesdeUltimoEjemplo,
        });
      }
    });

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      resumen: resumen,
      calendario: calendario || {},
      produccion: produccion || {},
      drive: drive || {},
      alertas: alertas,
    };
  }

  // ============================================
  // DATA LOADING — 3 parallel requests
  // ============================================

  function fetchEndpoint(action, timeout) {
    var ctrl = new AbortController();
    var tid = setTimeout(function() { ctrl.abort(); }, timeout || TIMEOUT_MS);
    var url = API_URL + '?key=' + encodeURIComponent(API_KEY) + '&action=' + action;
    return fetch(url, { signal: ctrl.signal })
      .then(function(resp) {
        clearTimeout(tid);
        return resp.json();
      })
      .catch(function(err) {
        clearTimeout(tid);
        throw err;
      });
  }

  function loadData() {
    // 1) Show cached data INSTANTLY if available
    var cached = loadCache();
    var hasCache = cached && cached.data && cached.data.resumen;
    if (hasCache) {
      var ageMin = Math.round((Date.now() - cached.ts) / 60000);
      currentData = cached.data;
      renderDashboard(currentData);
      showDashboard();
      dom.lastUpdate.textContent = 'caché de hace ' + ageMin + ' min — actualizando...';
      dom.connectionStatus.className = 'status-dot status-ok';
    }

    // 2) Show loading overlay only if no cache
    showLoading(!hasCache);
    dom.refreshBtn.classList.add('loading');

    // 3) Fire 3 requests in parallel (stock + produccion + drive)
    //    Drive gets extra timeout + 1 retry because it's slowest
    setStep('Consultando stock, pipeline y drive en paralelo...');

    var raw = {};
    var done = 0;
    var errs = 0;
    var total = ENDPOINTS.length;

    function fetchWithRetry(action, label, timeout, retries) {
      return fetchEndpoint(action, timeout)
        .then(function(json) {
          if (json && json.ok !== false) {
            raw[action] = json;
            done++;
            setStep(done + '/' + total + ' — ' + label + ' ✓');
          } else {
            throw new Error('API returned ok=false');
          }
        })
        .catch(function(err) {
          if (retries > 0) {
            setStep('Reintentando ' + label + '...');
            return fetchWithRetry(action, label, timeout, retries - 1);
          }
          done++;
          errs++;
          console.warn('[' + action + '] error:', err.message);
          setStep(done + '/' + total + ' (error en ' + label + ')');
        });
    }

    // --- Fast path: load stock + produccion first, render immediately ---
    var fastEndpoints = ENDPOINTS.filter(function(ep) { return ep.action !== 'drive'; });
    var fastPromises = fastEndpoints.map(function(ep) {
      return fetchWithRetry(ep.action, ep.label, TIMEOUT_MS, 0);
    });

    Promise.all(fastPromises).then(function() {
      // 4) Did we get at least stock?
      if (!raw.stock) {
        if (!hasCache) {
          showError('No se pudo cargar el stock de reels. Verifica tu conexión e intenta de nuevo.');
        } else {
          showToast('No se pudieron actualizar los datos. Mostrando caché.');
        }
        dom.refreshBtn.classList.remove('loading');
        return;
      }

      // 5) Build and render with stock+produccion immediately (drive=null for now)
      var calendario = raw.stock.calendario;
      var produccion = raw.produccion ? raw.produccion.produccion : null;

      // Use cached drive data as placeholder while we wait for fresh drive
      var tempDrive = null;
      if (cached && cached.data && cached.data.drive && Object.keys(cached.data.drive).length > 0) {
        tempDrive = cached.data.drive;
      }

      currentData = buildFullData(calendario, produccion, tempDrive);
      saveCache(currentData);
      renderDashboard(currentData);
      showDashboard();

      if (tempDrive) {
        dom.lastUpdate.textContent = 'Stock y pipeline actualizados — Drive cargando...';
      } else {
        dom.lastUpdate.textContent = 'Stock y pipeline listos — Esperando Drive (~2 min)...';
      }

      // 6) Now load Drive in background with generous timeout + retry
      setStep('Cargando datos de Drive (puede tardar ~2 min)...');
      fetchWithRetry('drive', 'Drive', DRIVE_TIMEOUT_MS, 1).then(function() {
        dom.refreshBtn.classList.remove('loading');
        var driveData = raw.drive ? raw.drive.drive : null;

        if (driveData) {
          // Re-build with real drive data
          currentData = buildFullData(calendario, produccion, driveData);
          if (raw.drive.drive && raw.drive.drive._cacheAgeMinutes != null) {
            currentData._driveCacheAge = raw.drive.drive._cacheAgeMinutes;
          }
          saveCache(currentData);
          renderDashboard(currentData);
          dom.lastUpdate.textContent = 'Actualizado: ' + new Date().toLocaleTimeString();
          dom.connectionStatus.className = 'status-dot status-ok';
          showToast('✅ Datos de Drive cargados correctamente');
        } else if (tempDrive) {
          showToast('⚡ Drive tardó mucho — mostrando datos de caché');
          dom.lastUpdate.textContent = 'Actualizado (Drive desde caché)';
        } else {
          showToast('⚠️ Drive no respondió — datos de Drive no disponibles');
          dom.lastUpdate.textContent = 'Actualizado (sin datos de Drive)';
        }
      });
    });
  }

  // ============================================
  // RENDER: DASHBOARD
  // ============================================

  function renderDashboard(data) {
    renderHeader(data);
    renderAlerts(data.alertas);
    renderSummaryBar(data.resumen);
    renderModelsTable(data);
  }

  function renderHeader(data) {
    dom.connectionStatus.className = 'status-dot status-ok';
    dom.connectionStatus.title = 'Conectado';
    dom.lastUpdate.textContent = timeAgo(data.timestamp);

    var cacheAge = data._driveCacheAge;
    dom.cacheInfo.textContent = cacheAge != null ? 'Drive cache: hace ' + Math.round(cacheAge) + ' min' : '';
  }

  // ============================================
  // RENDER: ALERTS — Collapsible banner
  // ============================================

  function renderAlerts(alertas) {
    if (!alertas || alertas.length === 0) {
      dom.alertsSection.innerHTML = '';
      return;
    }

    // Sort by severity
    var order = { critico: 0, bajo: 1, warning: 2, info: 3 };
    var sorted = alertas.slice().sort(function(a, b) {
      return (order[a.tipo] || 9) - (order[b.tipo] || 9);
    });

    // Determine banner color from worst severity
    var worst = sorted[0].tipo;
    var bannerClass = worst === 'critico' || worst === 'bajo' ? 'alert-banner-red' : 'alert-banner-yellow';

    // Unique model names
    var modelNames = [];
    sorted.forEach(function(a) {
      if (modelNames.indexOf(a.modelo) === -1) modelNames.push(a.modelo);
    });

    // Build alert rows
    var rowsHtml = sorted.map(function(a) {
      var icon = a.tipo === 'critico' ? '🔴' : a.tipo === 'bajo' ? '🟡' : a.tipo === 'warning' ? '⚡' : '💡';
      return '<div class="alert-flat-row">' +
        '<span class="alert-flat-icon">' + icon + '</span>' +
        '<span class="alert-flat-model">' + esc(a.modelo) + '</span>' +
        '<span class="alert-flat-msg">' + esc(a.detalle || a.mensaje) + '</span>' +
      '</div>';
    }).join('');

    dom.alertsSection.innerHTML =
      '<div class="alert-banner ' + bannerClass + '" id="alert-banner">' +
        '<div class="alert-banner-header" id="alert-banner-toggle">' +
          '<span>⚠️ ' + sorted.length + ' alerta' + (sorted.length !== 1 ? 's' : '') + ' — ' + modelNames.join(', ') + '</span>' +
          '<svg class="alerts-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
        '</div>' +
        '<div class="alert-banner-body" id="alert-banner-body">' +
          rowsHtml +
        '</div>' +
      '</div>';

    // Wire toggle
    var banner = document.getElementById('alert-banner');
    document.getElementById('alert-banner-toggle').addEventListener('click', function() {
      banner.classList.toggle('collapsed');
    });
    // Start collapsed
    banner.classList.add('collapsed');
  }

  // ============================================
  // RENDER: SUMMARY BAR
  // ============================================

  function renderSummaryBar(resumen) {
    if (!resumen) return;
    var criticos = resumen.modelosCriticos || 0;
    var bajos = resumen.modelosBajos || 0;
    var okCount = resumen.modelosOk || 0;

    // Count models without examples data
    var modelos = resumen.modelos || {};
    var sinEjemplos = 0;
    Object.keys(modelos).forEach(function(key) {
      var m = modelos[key];
      if (m.tieneEjemplosNotion === false) return;
      if (m.diasDesdeUltimoEjemplo == null) sinEjemplos++;
    });

    dom.summaryBar.innerHTML =
      (criticos > 0 ? '<span class="summary-pill pill-red">🔴 ' + criticos + ' crítica' + (criticos !== 1 ? 's' : '') + '</span>' : '') +
      (bajos > 0 ? '<span class="summary-pill pill-yellow">🟡 ' + bajos + ' baja' + (bajos !== 1 ? 's' : '') + '</span>' : '') +
      (okCount > 0 ? '<span class="summary-pill pill-green">🟢 ' + okCount + ' ok</span>' : '') +
      (sinEjemplos > 0 ? '<span class="summary-pill pill-gray">📤 ' + sinEjemplos + ' sin ejemplos</span>' : '');
  }

  // ============================================
  // RENDER: MODELS TABLE
  // ============================================

  function computeAction(m) {
    var stockCrit = m.stockStatus === 'critico';
    var ejDias = m.tieneEjemplosNotion !== false
      ? m.diasDesdeUltimoEjemplo
      : null;
    var drvDays = m.diasDesdeUltimaSubida;
    var drvInactiva = m.actividadDrive === 'inactiva' || (drvDays != null && drvDays > 14);

    if (stockCrit && ejDias != null && ejDias >= 10)
      return { label: 'ENVIAR EJEMPLOS YA', cls: 'action-red' };
    if (stockCrit && drvInactiva)
      return { label: 'DRIVE MUERTA · ESCRIBIRLE', cls: 'action-red' };
    if (stockCrit)
      return { label: 'SIN STOCK · ACTUAR', cls: 'action-red' };
    if (ejDias != null && ejDias >= 10)
      return { label: 'ENVIAR EJEMPLOS', cls: 'action-yellow' };
    if (drvInactiva)
      return { label: 'DRIVE INACTIVA · ESCRIBIRLE', cls: 'action-yellow' };
    if (ejDias != null && ejDias >= 5)
      return { label: 'RENOVAR EJEMPLOS', cls: 'action-blue' };
    return { label: 'TODO OK', cls: 'action-green' };
  }

  function renderModelsTable(data) {
    var modelos = data.resumen ? data.resumen.modelos || {} : {};
    var drive = data.drive || {};

    var entries = Object.keys(modelos).map(function(key) {
      var m = modelos[key];
      return {
        key: key,
        nombre: m.nombre || key,
        stockEditados: m.stockEditados != null ? m.stockEditados : 0,
        stockStatus: m.stockStatus || 'ok',
        diasDeContenido: m.diasDeContenido,
        actividadDrive: m.actividadDrive || 'sin_datos',
        diasDesdeUltimaSubida: m.diasDesdeUltimaSubida,
        diasDesdeUltimoEjemplo: m.diasDesdeUltimoEjemplo,
        tieneEjemplosNotion: m.tieneEjemplosNotion,
      };
    });
    entries.sort(function(a, b) {
      var d = statusOrder(a.stockStatus) - statusOrder(b.stockStatus);
      return d !== 0 ? d : (a.stockEditados || 0) - (b.stockEditados || 0);
    });

    dom.modelsTbody.innerHTML = entries.map(function(m, i) {
      var st = m.stockStatus || 'ok';
      var drvDays = m.diasDesdeUltimaSubida;
      var drvStatus = m.actividadDrive;
      var ejDias = m.diasDesdeUltimoEjemplo;
      var tieneEjemplos = m.tieneEjemplosNotion !== false;
      var action = computeAction(m);
      var bgClass = i % 2 === 0 ? 'row-even' : 'row-odd';

      // Stock column
      var stockColor = st === 'critico' ? 'stock-red' : st === 'bajo' ? 'stock-yellow' : 'stock-green';
      var diasText = typeof m.diasDeContenido === 'number' ? '≈ ' + m.diasDeContenido.toFixed(1) + ' días' : '';

      // Drive pill
      var drvPill;
      if (drvStatus === 'sin_datos' || drvStatus === 'error') {
        drvPill = '<span class="status-pill pill-gray">⚪ Sin datos</span>';
      } else if (drvDays != null && drvDays > 14) {
        drvPill = '<span class="status-pill pill-red">🔴 Inactiva · ' + drvDays + 'd</span>';
      } else if (drvDays != null && drvDays >= 7) {
        drvPill = '<span class="status-pill pill-yellow">🟡 ' + drvDays + 'd sin subir</span>';
      } else if (drvDays != null) {
        drvPill = '<span class="status-pill pill-green">🟢 Activa · ' + drvDays + 'd</span>';
      } else {
        drvPill = '<span class="status-pill pill-gray">⚪ Sin datos</span>';
      }

      // Ejemplos pill
      var ejPill;
      if (!tieneEjemplos) {
        ejPill = '<span class="status-pill pill-gray">— No aplica</span>';
      } else if (ejDias == null) {
        ejPill = '<span class="status-pill pill-gray">⚪ Sin historial</span>';
      } else if (ejDias >= 10) {
        ejPill = '<span class="status-pill pill-red">🔴 ' + ejDias + 'd — URGENTE</span>';
      } else if (ejDias >= 5) {
        ejPill = '<span class="status-pill pill-yellow">🟡 ' + ejDias + 'd — pendiente</span>';
      } else {
        ejPill = '<span class="status-pill pill-green">🟢 hace ' + ejDias + 'd</span>';
      }

      return '<tr class="model-row ' + bgClass + ' border-' + st + '" data-model="' + m.key + '">' +
        '<td class="col-modelo"><strong>' + esc(m.nombre) + '</strong></td>' +
        '<td class="col-stock">' +
          '<div class="stock-number ' + stockColor + '">' + m.stockEditados + ' <span class="stock-unit">reels</span></div>' +
          '<div class="stock-dias">' + diasText + '</div>' +
        '</td>' +
        '<td class="col-drive">' + drvPill + '</td>' +
        '<td class="col-ejemplos">' + ejPill + '</td>' +
        '<td class="col-hoy"><span class="action-tag ' + action.cls + '">' + action.label + '</span></td>' +
      '</tr>';
    }).join('');

    // Click handlers
    dom.modelsTbody.querySelectorAll('.model-row').forEach(function(row) {
      row.addEventListener('click', function() { openModelModal(row.dataset.model, data); });
    });
  }

  // ============================================
  // MODAL
  // ============================================

  function openModelModal(modelKey, data) {
    var resumen = (data.resumen && data.resumen.modelos || {})[modelKey] || {};
    var calendario = findModelData(data.calendario, modelKey);
    var produccion = findModelData(data.produccion, modelKey);
    var driveInfo = findModelData(data.drive, modelKey);

    dom.modalTitle.textContent = resumen.nombre || modelKey;
    renderModalContent(calendario, produccion, driveInfo);

    dom.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    dom.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderModalContent(cal, prod, driveInfo) {
    var content = $('#modal-content');
    var tieneEjemplosNotion = prod.tieneEjemplosNotion !== false;
    var reelCount = (cal.reelsEditados || []).length;
    var drvDays = driveInfo ? driveInfo.diasDesdeUltimaSubida : null;
    var ejDias = tieneEjemplosNotion ? (prod ? prod.diasDesdeUltimoEjemplo : null) : null;

    // Drive days color
    var drvColor = drvDays == null ? 'rgba(255,255,255,0.3)' : drvDays < 7 ? '#34d399' : drvDays <= 14 ? '#fbbf24' : '#f87171';
    var drvDaysLabel = drvDays != null ? 'hace ' + drvDays + 'd' : 'sin datos';

    // Ejemplos days color
    var ejColor = ejDias == null ? 'rgba(255,255,255,0.3)' : ejDias < 5 ? '#34d399' : ejDias < 10 ? '#fbbf24' : '#f87171';
    var ejDaysLabel = ejDias != null ? 'hace ' + ejDias + 'd' : 'sin datos';

    var html = '<div class="modal-grid">';

    // ─── COLUMNA 1: Stock ───
    html += '<div class="modal-col">';
    html += '<div class="modal-col-header"><span>📦 Stock</span><span>' + reelCount + ' reels</span></div>';
    html += '<div class="modal-col-body">';
    var reels = (cal.reelsEditados || []).slice();
    if (reels.length === 0) {
      html += '<div class="modal-empty"><span class="modal-empty-icon">📭</span>Sin reels editados</div>';
    } else {
      reels.sort(function(a, b) { return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0); });
      reels.slice(0, 10).forEach(function(r) {
        html += '<div class="modal-col-item">' +
          '<div>' +
            '<div class="modal-item-num">#' + esc(r.numReel) + '</div>' +
            '<div class="modal-item-sub">' + esc(r.subcuenta || '') + '</div>' +
            '<div class="modal-item-date">' + formatDateShort(r.updatedAt || r.createdAt) + '</div>' +
          '</div>' +
          (r.linkDrive ? '<a href="' + esc(r.linkDrive) + '" target="_blank" rel="noopener" class="modal-item-link">↗</a>' : '') +
        '</div>';
      });
    }
    html += '</div></div>';

    // ─── COLUMNA 2: Drive ───
    html += '<div class="modal-col">';
    html += '<div class="modal-col-header"><span>📁 Drive</span><span style="color:' + drvColor + '">' + drvDaysLabel + '</span></div>';
    if (!driveInfo || !driveInfo.nombre) {
      html += '<div class="modal-col-body"><div class="modal-empty"><span class="modal-empty-icon">📡</span>Sin datos de Drive</div></div>';
    } else {
      html += '<div class="modal-col-summary">Última subida: ' + (driveInfo.ultimaSubida ? formatDateShort(driveInfo.ultimaSubida) : '—') + '</div>';
      html += '<div class="modal-col-body">';
      var archivos = (driveInfo.archivosRecientes || []).slice(0, 10);
      if (archivos.length === 0) {
        html += '<div class="modal-empty"><span class="modal-empty-icon">📂</span>Sin detalle de archivos disponible</div>';
      } else {
        archivos.forEach(function(f) {
          var nombre = f.nombre || '';
          var truncated = nombre.length > 28 ? nombre.substring(0, 28) + '…' : nombre;
          html += '<div class="modal-col-item">' +
            '<div>' +
              '<div class="reel-item-title" title="' + esc(nombre) + '">' + esc(truncated) + '</div>' +
              '<div class="modal-item-sub">📁 ' + esc(f.carpetaPadre || '—') + '</div>' +
              '<div class="modal-item-date">' + formatDateShort(f.fecha) + '</div>' +
            '</div>' +
          '</div>';
        });
      }
      html += '</div>';
    }
    html += '</div>';

    // ─── COLUMNA 3: Ejemplos ───
    html += '<div class="modal-col">';
    html += '<div class="modal-col-header"><span>📋 Ejemplos</span><span style="color:' + ejColor + '">' + ejDaysLabel + '</span></div>';
    var ejemplos = (prod.ejemplosEnviados || []).slice();
    if (!tieneEjemplosNotion) {
      html += '<div class="modal-col-body"><div class="modal-empty"><span class="modal-empty-icon">—</span><span>Ejemplos gestionados fuera de Notion</span></div></div>';
    } else if (ejemplos.length === 0) {
      html += '<div class="modal-col-body"><div class="modal-empty"><span class="modal-empty-icon">📭</span>Sin historial de ejemplos</div></div>';
    } else {
      ejemplos.sort(function(a, b) { return new Date(b.fecha || b.createdAt || 0) - new Date(a.fecha || a.createdAt || 0); });
      var top10ej = ejemplos.slice(0, 10);
      html += '<div class="modal-col-summary">Último: ' + formatDateShort(top10ej[0].fecha || top10ej[0].createdAt) + '</div>';
      html += '<div class="modal-col-body">';
      top10ej.forEach(function(e) {
        html += '<div class="modal-col-item">' +
          '<div style="min-width:0">' +
            '<div class="modal-item-num">#' + esc(e.numReel) + '</div>' +
            '<div class="modal-item-sub">' + esc(e.subcuenta || '') + '</div>' +
            '<div class="modal-item-date">' + formatDateShort(e.fecha || e.createdAt) + '</div>' +
            (e.indicaciones ? '<div class="modal-item-note" title="' + esc(e.indicaciones) + '">' + esc(e.indicaciones) + '</div>' : '') +
          '</div>' +
          (e.ejemplo ? '<a href="' + esc(e.ejemplo) + '" target="_blank" rel="noopener" class="modal-item-link">↗</a>' : '') +
        '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    html += '</div>'; // close modal-grid
    content.innerHTML = html;
  }



  // ============================================
  // EVENT HANDLERS
  // ============================================

  dom.refreshBtn.addEventListener('click', function() { loadData(); });
  dom.errorRetryBtn.addEventListener('click', function() { loadData(); });
  dom.modalClose.addEventListener('click', closeModal);
  dom.modal.addEventListener('click', function(e) { if (e.target === dom.modal) closeModal(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !dom.modal.classList.contains('hidden')) closeModal(); });

  // ============================================
  // INIT
  // ============================================
  loadData();

})();
