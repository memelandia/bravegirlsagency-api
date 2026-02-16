/* ============================================
   BraveGirls Marketing Pipeline — App Logic
   ============================================ */

(function () {
  'use strict';

  // --- CONFIG ---
  const API_URL = 'https://script.google.com/macros/s/AKfycbxEXzWFQqb24DMKmvDOmnaslLD-P1qPiptpl9rn7AiaQLuLiBng2uvu85YfnwhyxnxKCw/exec';
  const API_KEY = 'BG-Franco2025-Pipeline';
  const TIMEOUT_MS = 90000;

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
    kpiStockNum: $('#kpi-stock-num'),
    kpiPipelineNum: $('#kpi-pipeline-num'),
    kpiDiasNum: $('#kpi-dias-num'),
    kpiCriticos: $('#kpi-criticos'),
    kpiBajos: $('#kpi-bajos'),
    kpiOk: $('#kpi-ok'),
    kpiInactivosLabel: $('#kpi-inactivos-label'),
    modelsGrid: $('#models-grid'),
    actividadToggle: $('#mi-actividad-toggle'),
    miActividad: $('#mi-actividad'),
    actividadTbody: $('#actividad-tbody'),
    modal: $('#model-modal'),
    modalTitle: $('#modal-title'),
    modalClose: $('#modal-close'),
    modalTabs: $$('.modal-tab'),
    tabStock: $('#tab-stock'),
    tabPipeline: $('#tab-pipeline'),
    tabDrive: $('#tab-drive'),
  };

  // Global data store
  let currentData = null;

  // --- HELPERS ---

  function timeAgo(dateStr) {
    if (!dateStr) return 'Sin datos';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} día${days !== 1 ? 's' : ''}`;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function daysAgoText(days) {
    if (days === null || days === undefined) return 'Sin datos';
    if (days === 0) return 'Hoy';
    if (days === 1) return 'hace 1 día';
    return `hace ${days} días`;
  }

  function statusColor(status) {
    switch (status) {
      case 'critico': return 'var(--color-critico)';
      case 'bajo': return 'var(--color-bajo)';
      case 'ok': return 'var(--color-ok)';
      default: return 'var(--color-gray)';
    }
  }

  function statusOrder(status) {
    switch (status) {
      case 'critico': return 0;
      case 'bajo': return 1;
      case 'ok': return 2;
      default: return 3;
    }
  }

  function alertIcon(tipo) {
    switch (tipo) {
      case 'critico': return '🚨';
      case 'bajo': return '⚠️';
      case 'warning': return '⚡';
      case 'info': return '💡';
      default: return 'ℹ️';
    }
  }

  function driveStatusLabel(status) {
    switch (status) {
      case 'activa': return 'Activa';
      case 'normal': return 'Normal';
      case 'inactiva': return 'Inactiva';
      case 'sin_datos': return 'Sin datos';
      case 'error': return 'Error';
      default: return status || 'Sin datos';
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- SHOW / HIDE ---

  function showLoading() {
    dom.loadingOverlay.classList.remove('hidden');
    dom.errorOverlay.classList.add('hidden');
    dom.dashboard.classList.add('hidden');
  }

  function hideLoading() {
    dom.loadingOverlay.classList.add('hidden');
  }

  function showError(msg) {
    dom.loadingOverlay.classList.add('hidden');
    dom.dashboard.classList.add('hidden');
    dom.errorOverlay.classList.remove('hidden');
    dom.errorMessage.textContent = msg;
  }

  function showDashboard() {
    dom.loadingOverlay.classList.add('hidden');
    dom.errorOverlay.classList.add('hidden');
    dom.dashboard.classList.remove('hidden');
  }

  // --- DATA LOADING ---

  async function loadData() {
    showLoading();
    dom.refreshBtn.classList.add('loading');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `${API_URL}?key=${encodeURIComponent(API_KEY)}&action=full`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.ok) {
        currentData = data;
        renderDashboard(data);
        showDashboard();
      } else {
        showError(data.error || 'La API respondió con un error desconocido.');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        showError('La consulta tardó más de 90 segundos. Intenta de nuevo más tarde.');
      } else {
        showError('Error de conexión: ' + err.message);
      }
    } finally {
      dom.refreshBtn.classList.remove('loading');
    }
  }

  // --- RENDER: DASHBOARD ---

  function renderDashboard(data) {
    renderHeader(data);
    renderAlerts(data.alertas);
    renderKPIs(data.resumen);
    renderModelsGrid(data);
    renderMiActividad(data);
  }

  // --- RENDER: HEADER ---

  function renderHeader(data) {
    dom.connectionStatus.className = 'status-dot status-ok';
    dom.connectionStatus.title = 'Conectado';
    dom.lastUpdate.textContent = timeAgo(data.timestamp);

    // Drive cache info
    const driveData = data.drive || {};
    const cacheAge = driveData._cacheAgeMinutes;
    if (cacheAge !== undefined && cacheAge !== null) {
      dom.cacheInfo.textContent = `Drive: hace ${Math.round(cacheAge)} min`;
    } else {
      dom.cacheInfo.textContent = '';
    }
  }

  // --- RENDER: ALERTS ---

  function renderAlerts(alertas) {
    if (!alertas || alertas.length === 0) {
      dom.alertsSection.innerHTML = '<div class="alert-all-ok">✅ Todo en orden — sin alertas activas</div>';
      return;
    }

    // Sort: critico first, then bajo, warning, info
    const order = { critico: 0, bajo: 1, warning: 2, info: 3 };
    const sorted = [...alertas].sort((a, b) => (order[a.tipo] ?? 4) - (order[b.tipo] ?? 4));

    dom.alertsSection.innerHTML = sorted.map(a => `
      <div class="alert-chip ${escapeHtml(a.tipo)}">
        <span class="alert-icon">${alertIcon(a.tipo)}</span>
        <div class="alert-body">
          <span class="alert-msg">${escapeHtml(a.mensaje)}</span>
          ${a.detalle ? `<span class="alert-detail">${escapeHtml(a.detalle)}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  // --- RENDER: KPIs ---

  function renderKPIs(resumen) {
    // Stock total
    const stock = resumen.totalEditadosDisponibles;
    const avgPerModel = resumen.totalModelos > 0 ? stock / resumen.totalModelos : 0;
    dom.kpiStockNum.textContent = stock;
    dom.kpiStockNum.className = 'kpi-number ' + (avgPerModel > 8 ? 'color-green' : avgPerModel > 3 ? 'color-yellow' : 'color-red');

    // Pipeline
    dom.kpiPipelineNum.textContent = resumen.totalEnPipeline;
    dom.kpiPipelineNum.className = 'kpi-number color-yellow';

    // Dias de contenido
    const dias = resumen.diasDeContenidoPromedio;
    dom.kpiDiasNum.textContent = typeof dias === 'number' ? dias.toFixed(1) : dias;
    dom.kpiDiasNum.className = 'kpi-number ' + (dias > 3 ? 'color-green' : dias > 1.5 ? 'color-yellow' : 'color-red');

    // Estado general
    dom.kpiCriticos.textContent = resumen.modelosCriticos;
    dom.kpiBajos.textContent = resumen.modelosBajos;
    dom.kpiOk.textContent = resumen.modelosOk;

    if (resumen.modelosInactivos > 0) {
      dom.kpiInactivosLabel.textContent = `${resumen.modelosInactivos} inactiva${resumen.modelosInactivos !== 1 ? 's' : ''} en Drive`;
    } else {
      dom.kpiInactivosLabel.textContent = '';
    }
  }

  // --- RENDER: MODELS GRID ---

  function renderModelsGrid(data) {
    const resumen = data.resumen;
    const modelos = resumen.modelos || {};
    const produccion = data.produccion || {};
    const calendario = data.calendario || {};
    const drive = data.drive || {};

    // Build array and sort by urgency then by stock ascending
    const modelEntries = Object.entries(modelos).map(([key, m]) => ({ key, ...m }));
    modelEntries.sort((a, b) => {
      const orderDiff = statusOrder(a.stockStatus) - statusOrder(b.stockStatus);
      if (orderDiff !== 0) return orderDiff;
      return (a.stockEditados || 0) - (b.stockEditados || 0);
    });

    dom.modelsGrid.innerHTML = modelEntries.map(m => {
      const key = m.key;
      const prod = produccion[key] || {};
      const cal = calendario[key] || {};
      const drv = drive[key] || {};
      const status = m.stockStatus || 'ok';

      // Drive activity
      const driveStatus = drv.actividadStatus || m.actividadDrive || 'sin_datos';
      const driveDays = drv.diasDesdeUltimaSubida ?? m.diasDesdeUltimaSubida;

      // Ejemplo
      const ejemploDias = m.diasDesdeUltimoEjemplo;

      return `
        <div class="model-card status-${status}" data-model="${key}">
          <div class="model-card-inner">
            <div class="model-card-head">
              <span class="model-name">${escapeHtml(m.nombre || key)}</span>
              <span class="status-badge ${status}">${status.toUpperCase()}</span>
            </div>

            <div class="model-stock-number ${status}">${m.stockEditados ?? 0}</div>
            <div class="model-stock-label">reels disponibles</div>
            <div class="model-stock-dias">≈ ${typeof m.diasDeContenido === 'number' ? m.diasDeContenido.toFixed(1) : '—'} días</div>

            <div class="mini-pipeline">
              <div class="pipe-stage">
                <div class="pipe-dot prep">${prod.enPreparacion ?? 0}</div>
                <span class="pipe-label">Prep</span>
              </div>
              <span class="pipe-arrow">→</span>
              <div class="pipe-stage">
                <div class="pipe-dot editor">${prod.listoParaEditar ?? 0}</div>
                <span class="pipe-label">Editor</span>
              </div>
              <span class="pipe-arrow">→</span>
              <div class="pipe-stage">
                <div class="pipe-dot editando">${prod.enEdicion ?? 0}</div>
                <span class="pipe-label">Editando</span>
              </div>
              <span class="pipe-arrow">→</span>
              <div class="pipe-stage">
                <div class="pipe-dot listo">${cal.editados ?? m.stockEditados ?? 0}</div>
                <span class="pipe-label">Listo</span>
              </div>
            </div>

            <div class="model-info-row">
              <span class="drive-status-dot ${driveStatus}"></span>
              <span>Drive: ${driveStatus === 'inactiva' && driveDays != null ? `Inactiva (${driveDays}d)` : driveStatusLabel(driveStatus)}</span>
              ${driveDays != null && driveStatus !== 'inactiva' ? `<span style="color:var(--text-muted)">· ${daysAgoText(driveDays)}</span>` : ''}
            </div>

            <div class="model-info-row ${ejemploDias != null && ejemploDias >= 5 ? 'text-warning' : ''}">
              <span class="info-icon">📋</span>
              <span>Último ejemplo: ${ejemploDias != null ? daysAgoText(ejemploDias) : 'Sin datos'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    dom.modelsGrid.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.model;
        openModelModal(key, data);
      });
    });
  }

  // --- RENDER: MI ACTIVIDAD ---

  function renderMiActividad(data) {
    const resumen = data.resumen;
    const modelos = resumen.modelos || {};
    const produccion = data.produccion || {};

    const rows = Object.entries(modelos).map(([key, m]) => {
      const prod = produccion[key] || {};
      return {
        nombre: m.nombre || key,
        ultimoEjemplo: prod.ultimoEjemploEnviado || m.ultimoEjemploEnviado,
        dias: m.diasDesdeUltimoEjemplo ?? prod.diasDesdeUltimoEjemplo,
        enPreparacion: prod.enPreparacion ?? 0,
      };
    });

    // Sort by dias descending (most urgent first)
    rows.sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));

    dom.actividadTbody.innerHTML = rows.map(r => {
      let rowClass = '';
      let diasClass = 'text-green';
      if (r.dias != null) {
        if (r.dias >= 5) { rowClass = 'urgente'; diasClass = 'text-red'; }
        else if (r.dias >= 3) { rowClass = 'atencion'; diasClass = 'text-yellow'; }
      }
      return `
        <tr class="${rowClass}">
          <td><strong>${escapeHtml(r.nombre)}</strong></td>
          <td>${r.ultimoEjemplo ? formatDateShort(r.ultimoEjemplo) : '—'}</td>
          <td><span class="actividad-dias ${diasClass}">${r.dias != null ? r.dias + ' día' + (r.dias !== 1 ? 's' : '') : '—'}</span></td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600">${r.enPreparacion}</td>
        </tr>
      `;
    }).join('');
  }

  // --- MODAL ---

  function openModelModal(modelKey, data) {
    const resumen = (data.resumen.modelos || {})[modelKey] || {};
    const calendario = (data.calendario || {})[modelKey] || {};
    const produccion = (data.produccion || {})[modelKey] || {};
    const driveInfo = (data.drive || {})[modelKey] || {};

    dom.modalTitle.textContent = resumen.nombre || modelKey;

    // Tab: Stock
    renderTabStock(calendario);

    // Tab: Pipeline
    renderTabPipeline(produccion);

    // Tab: Drive
    renderTabDrive(driveInfo);

    // Show modal
    dom.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Activate first tab
    activateTab('stock');
  }

  function closeModal() {
    dom.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function activateTab(tabName) {
    dom.modalTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabName));
  }

  function renderTabStock(calendario) {
    const reels = calendario.reelsEditados || [];
    if (reels.length === 0) {
      dom.tabStock.innerHTML = '<div class="empty-state">No hay reels editados disponibles</div>';
      return;
    }

    // Sort by date descending
    const sorted = [...reels].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    dom.tabStock.innerHTML = `
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem">
        ${calendario.editados ?? sorted.length} reel${(calendario.editados ?? sorted.length) !== 1 ? 's' : ''} editados — ${calendario.totalReels ?? '?'} total
        <span style="color:var(--text-muted);font-size:0.78rem"> · últimos 14 días de publicaciones</span>
      </p>
      <div class="reel-list">
        ${sorted.map(r => `
          <div class="reel-item">
            <div>
              <div class="reel-item-title">#${escapeHtml(r.numReel)} — ${escapeHtml(r.subcuenta || '')}</div>
              <div class="reel-item-meta">
                <span class="reel-item-badge" style="background:var(--bg-elevated);color:var(--text-secondary)">${escapeHtml(r.tipoReel || 'Reel')}</span>
                <span>${formatDateShort(r.updatedAt || r.createdAt)}</span>
              </div>
            </div>
            ${r.linkDrive ? `<a href="${escapeHtml(r.linkDrive)}" target="_blank" rel="noopener" class="reel-link">Abrir en Drive ↗</a>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTabPipeline(produccion) {
    // Group by state
    const groups = [
      { key: 'enPreparacion', label: 'En Preparación', color: 'var(--pipe-prep)' },
      { key: 'listoParaEditar', label: 'Listo para Editar', color: 'var(--pipe-editor)' },
      { key: 'enEdicion', label: 'En Edición', color: 'var(--pipe-editando)' },
    ];

    const ejemplos = produccion.ejemplosEnviados || [];
    const totalItems = produccion.totalItems || 0;

    if (totalItems === 0 && ejemplos.length === 0) {
      dom.tabPipeline.innerHTML = '<div class="empty-state">No hay items en el pipeline</div>';
      return;
    }

    // Group ejemplos by estado
    const byEstado = {};
    ejemplos.forEach(e => {
      const estado = (e.estado || 'EN PREPARACIÓN').toUpperCase();
      if (!byEstado[estado]) byEstado[estado] = [];
      byEstado[estado].push(e);
    });

    let html = `
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem">
        ${totalItems} items en pipeline
        ${produccion.ultimoEjemploEnviado ? ` · Último ejemplo: ${formatDateShort(produccion.ultimoEjemploEnviado)}` : ''}
      </p>
    `;

    // EN PREPARACIÓN items
    const prepItems = byEstado['EN PREPARACIÓN'] || [];
    if (prepItems.length > 0) {
      html += `
        <div class="pipeline-group">
          <div class="pipeline-group-title" style="color:var(--pipe-prep)">
            En Preparación (${produccion.enPreparacion ?? prepItems.length})
          </div>
          <div class="reel-list">
            ${prepItems.map(e => `
              <div class="reel-item">
                <div>
                  <div class="reel-item-title">#${escapeHtml(e.numReel)} — ${escapeHtml(e.subcuenta || '')}</div>
                  <div class="reel-item-meta">
                    <span>${formatDateShort(e.fecha || e.createdAt)}</span>
                  </div>
                  ${e.indicaciones ? `<div class="ejemplo-indicaciones">📝 ${escapeHtml(e.indicaciones)}</div>` : ''}
                </div>
                ${e.ejemplo ? `<a href="${escapeHtml(e.ejemplo)}" target="_blank" rel="noopener" class="reel-link">Ver ejemplo ↗</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if ((produccion.enPreparacion ?? 0) > 0) {
      html += `
        <div class="pipeline-group">
          <div class="pipeline-group-title" style="color:var(--pipe-prep)">
            En Preparación (${produccion.enPreparacion})
          </div>
          <div class="empty-state" style="padding:0.75rem">Sin detalles individuales disponibles</div>
        </div>
      `;
    }

    // LISTO PARA EDITAR
    const listoItems = byEstado['LISTO PARA EDITAR'] || [];
    if (listoItems.length > 0 || (produccion.listoParaEditar ?? 0) > 0) {
      html += `
        <div class="pipeline-group">
          <div class="pipeline-group-title" style="color:var(--pipe-editor)">
            Listo para Editar (${produccion.listoParaEditar ?? listoItems.length})
          </div>
          ${listoItems.length > 0 ? `
            <div class="reel-list">
              ${listoItems.map(e => `
                <div class="reel-item">
                  <div>
                    <div class="reel-item-title">#${escapeHtml(e.numReel)} — ${escapeHtml(e.subcuenta || '')}</div>
                  </div>
                  ${e.linkDrive ? `<a href="${escapeHtml(e.linkDrive)}" target="_blank" rel="noopener" class="reel-link">Drive ↗</a>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `<div class="empty-state" style="padding:0.75rem">${produccion.listoParaEditar ?? 0} items</div>`}
        </div>
      `;
    }

    // EN EDICIÓN
    const edicionItems = byEstado['EN EDICIÓN'] || byEstado['EN EDICION'] || [];
    if (edicionItems.length > 0 || (produccion.enEdicion ?? 0) > 0) {
      html += `
        <div class="pipeline-group">
          <div class="pipeline-group-title" style="color:var(--pipe-editando)">
            En Edición (${produccion.enEdicion ?? edicionItems.length})
          </div>
          ${edicionItems.length > 0 ? `
            <div class="reel-list">
              ${edicionItems.map(e => `
                <div class="reel-item">
                  <div>
                    <div class="reel-item-title">#${escapeHtml(e.numReel)} — ${escapeHtml(e.subcuenta || '')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `<div class="empty-state" style="padding:0.75rem">${produccion.enEdicion ?? 0} items</div>`}
        </div>
      `;
    }

    dom.tabPipeline.innerHTML = html;
  }

  function renderTabDrive(driveInfo) {
    if (!driveInfo || !driveInfo.nombre) {
      dom.tabDrive.innerHTML = '<div class="empty-state">Sin datos de Drive disponibles</div>';
      return;
    }

    const archivos = driveInfo.archivosRecientes || [];

    dom.tabDrive.innerHTML = `
      <div class="drive-stats-grid">
        <div class="drive-stat-card">
          <div class="drive-stat-number">${driveInfo.totalArchivos ?? '—'}</div>
          <div class="drive-stat-label">Total archivos</div>
        </div>
        <div class="drive-stat-card">
          <div class="drive-stat-number">${driveInfo.archivosUltimos7Dias ?? '—'}</div>
          <div class="drive-stat-label">Últimos 7 días</div>
        </div>
        <div class="drive-stat-card">
          <div class="drive-stat-number">${driveInfo.archivosUltimos14Dias ?? '—'}</div>
          <div class="drive-stat-label">Últimos 14 días</div>
        </div>
        <div class="drive-stat-card">
          <div class="drive-stat-number">${driveInfo.archivosUltimos30Dias ?? '—'}</div>
          <div class="drive-stat-label">Últimos 30 días</div>
        </div>
        <div class="drive-stat-card">
          <div class="drive-stat-number">${driveInfo.promedioSemanalReciente != null ? driveInfo.promedioSemanalReciente.toFixed(1) : '—'}</div>
          <div class="drive-stat-label">Prom. semanal</div>
        </div>
        <div class="drive-stat-card">
          <div class="drive-stat-number">${driveInfo.diasDesdeUltimaSubida ?? '—'}</div>
          <div class="drive-stat-label">Días sin subir</div>
        </div>
      </div>

      <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:0.75rem">
        Última subida: ${driveInfo.ultimaSubida ? formatDateShort(driveInfo.ultimaSubida) + ' (' + timeAgo(driveInfo.ultimaSubida) + ')' : '—'}
      </p>

      ${archivos.length > 0 ? `
        <div class="drive-files-title">Archivos recientes</div>
        <div class="reel-list">
          ${archivos.map(f => `
            <div class="reel-item">
              <div>
                <div class="reel-item-title">${escapeHtml(f.nombre)}</div>
                <div class="reel-item-meta">
                  <span>📁 ${escapeHtml(f.carpetaPadre || '—')}</span>
                  <span>${formatDateShort(f.fecha)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state">Sin archivos recientes</div>'}
    `;
  }

  // --- EVENT HANDLERS ---

  // Refresh button
  dom.refreshBtn.addEventListener('click', () => {
    loadData();
  });

  // Error retry
  dom.errorRetryBtn.addEventListener('click', () => {
    loadData();
  });

  // Modal close
  dom.modalClose.addEventListener('click', closeModal);
  dom.modal.addEventListener('click', (e) => {
    if (e.target === dom.modal) closeModal();
  });

  // Modal tabs
  dom.modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.tab);
    });
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Mi Actividad toggle
  let actividadCollapsed = false;
  dom.actividadToggle.addEventListener('click', () => {
    actividadCollapsed = !actividadCollapsed;
    dom.miActividad.classList.toggle('collapsed', actividadCollapsed);
    dom.actividadToggle.querySelector('.toggle-chevron').classList.toggle('collapsed', actividadCollapsed);
  });

  // --- INIT ---
  loadData();

})();
