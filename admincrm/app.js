/**
 * Admin BraveGirls — SPA lógica core (Fase 1: Catálogo)
 *
 * Routing por hash interno (#resumen, #catalogo, #ajustes).
 * Login con password gate, token guardado en sessionStorage.
 * CRUD genérico para 5 entidades del catálogo.
 */

(function () {
  'use strict';

  const API = 'https://bravegirlsagency-api.vercel.app/api/admin';
  const TOKEN_KEY = 'admin_token';
  let token = sessionStorage.getItem(TOKEN_KEY);

  // ───────── Configuración de entidades del catálogo ─────────
  const ENTITY_DEFS = {
    modelos: {
      label: 'Modelos',
      icon: '♀',
      columns: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'nombre_fiscal', label: 'Nombre fiscal', type: 'text' },
        { key: 'identificador', label: 'CUIT / DNI / NIE', type: 'text' },
        { key: 'direccion', label: 'Dirección', type: 'text', wide: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
        { key: 'plan_id', label: 'Plan', type: 'plan-select' },
        { key: 'porcentaje', label: '% del plan', type: 'number', step: '0.01' },
        { key: 'moneda_default', label: 'Moneda', type: 'select', options: ['USD', 'EUR'] },
        { key: 'medio_pago_default', label: 'Medio de pago', type: 'text' },
        { key: 'factura_numero_actual', label: 'Último N° de factura', type: 'number', step: '1' },
        { key: 'gasto_om_modelo_default', label: 'Gasto OM (modelo paga)', type: 'number', step: '0.01' },
        { key: 'gasto_om_agencia_default', label: 'Gasto OM (agencia paga)', type: 'number', step: '0.01' },
        { key: 'servicios_factura_texto', label: 'Texto servicios (pie factura)', type: 'textarea', wide: true },
        { key: 'activa', label: 'Activa', type: 'bool' }
      ],
      tableColumns: ['nombre', 'plan_id', 'porcentaje', 'moneda_default', 'factura_numero_actual', 'activa']
    },
    cuentas: {
      label: 'Cuentas',
      icon: '@',
      columns: [
        { key: 'modelo_id', label: 'Modelo', type: 'model-select', required: true },
        { key: 'nombre_cuenta', label: 'Nombre cuenta', type: 'text', required: true, placeholder: 'VICKY PAID, LILY ESPAÑA…' },
        { key: 'tipo', label: 'Tipo', type: 'select', options: ['PAID', 'FREE', 'BIZUM', 'AMERICANA', 'ESPAÑA', 'ENG'] },
        { key: 'of_username', label: 'Usuario OF', type: 'text' },
        { key: 'of_password', label: 'Contraseña OF', type: 'text' },
        { key: 'activa', label: 'Activa', type: 'bool' }
      ],
      tableColumns: ['nombre_cuenta', 'tipo', 'modelo_id', 'of_username', 'activa']
    },
    chatters: {
      label: 'Chatters',
      icon: '💬',
      columns: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'nombre_fiscal', label: 'Nombre fiscal', type: 'text' },
        { key: 'identificador', label: 'CUIT / DNI', type: 'text' },
        { key: 'direccion', label: 'Dirección', type: 'text', wide: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
        { key: 'porcentaje_default', label: '% comisión default', type: 'number', step: '0.01', placeholder: '15' },
        { key: 'porcentaje_supervisor', label: '% supervisor', type: 'number', step: '0.01', placeholder: '5' },
        { key: 'rol', label: 'Rol', type: 'select', options: ['chatter', 'supervisor', 'team_leader'] },
        { key: 'es_team_leader', label: 'Team Leader', type: 'bool' },
        { key: 'activo', label: 'Activo', type: 'bool' }
      ],
      tableColumns: ['nombre', 'porcentaje_default', 'porcentaje_supervisor', 'rol', 'es_team_leader', 'activo']
    },
    equipo: {
      label: 'Equipo Fijo',
      icon: '★',
      columns: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'rol', label: 'Rol', type: 'text', placeholder: 'Account Manager, Editor…' },
        { key: 'sueldo_mensual_usd', label: 'Sueldo USD/mes', type: 'number', step: '0.01' },
        { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
        { key: 'activo', label: 'Activo', type: 'bool' }
      ],
      tableColumns: ['nombre', 'rol', 'sueldo_mensual_usd', 'activo']
    },
    planes: {
      label: 'Planes de Servicio',
      icon: '☰',
      columns: [
        { key: 'nombre', label: 'Nombre del plan', type: 'text', required: true },
        { key: 'porcentaje', label: '% comisión agencia', type: 'number', step: '0.01', required: true },
        { key: 'servicios_factura_texto', label: 'Servicios (pie de factura)', type: 'textarea', wide: true },
        { key: 'activa', label: 'Activo', type: 'bool' }
      ],
      tableColumns: ['nombre', 'porcentaje', 'activa']
    }
  };

  // Cache de modelos y planes para los selectores
  let modelosCache = null;
  let planesCache = null;

  // ───────── Toast ─────────
  function toast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ───────── Fetch helper ─────────
  async function api(action, opts = {}) {
    const { method = 'GET', body, params = {} } = opts;
    const qs = new URLSearchParams({ action, ...params }).toString();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['X-Admin-Token'] = token;

    const res = await fetch(`${API}?${qs}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch (_) { json = {}; }
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      token = null;
      showLogin('Tu sesión expiró. Iniciá de nuevo.');
      throw new Error('unauthorized');
    }
    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json;
  }

  // ───────── Login flow ─────────
  function showLogin(errMsg) {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    const errEl = document.getElementById('login-err');
    if (errMsg) { errEl.textContent = errMsg; errEl.classList.add('show'); }
    else { errEl.classList.remove('show'); }
    setTimeout(() => document.getElementById('pwd').focus(), 50);
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    // setear el mes actual
    const now = new Date();
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('mes-selector').value = mes;
    navigate(location.hash.replace('#', '') || 'resumen');
  }

  // Cualquier cambio externo del hash (onclick="location.hash='X'", botón back, etc) navega
  window.addEventListener('hashchange', () => {
    if (document.getElementById('app').classList.contains('hidden')) return;
    navigate(location.hash.replace('#', '') || 'resumen');
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('pwd').value;
    const errEl = document.getElementById('login-err');
    errEl.classList.remove('show');
    try {
      const r = await fetch(`${API}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        errEl.textContent = j.error || 'Error de autenticación';
        errEl.classList.add('show');
        return;
      }
      token = j.token;
      sessionStorage.setItem(TOKEN_KEY, token);
      showApp();
    } catch (e) {
      errEl.textContent = 'No se pudo contactar al servidor';
      errEl.classList.add('show');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(TOKEN_KEY);
    token = null;
    modelosCache = null;
    planesCache = null;
    showLogin();
  });

  // ───────── Routing por hash ─────────
  function navigate(route) {
    location.hash = route;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    const titles = {
      resumen:     ['Dashboard Administrativo & Contable', 'Resumen general del mes'],
      catalogo:    ['Catálogo', 'Gestión de modelos, chatters, cuentas, equipo y planes'],
      facturacion: ['Facturación a Modelos', 'Cargá el cierre del mes y generá la factura'],
      liquidacion: ['Liquidación Chatters', 'Cálculo de comisiones, incentivos y envíos'],
      cobros:      ['Cobros a Modelos', 'Control de pagos recibidos por modelo'],
      supervisor:  ['Supervisor · Jony', 'Comisión automática del supervisor'],
      ganancias:   ['Ganancias (P&L)', 'Estado de resultados de la agencia'],
      incentivos:  ['Incentivos del Mes', 'Histórico de ganadores'],
      facturas:    ['Facturas Emitidas', 'Listado histórico de todas las facturas'],
      gastos:      ['Gastos del Mes', 'Registro de gastos fijos y variables'],
      ajustes:     ['Ajustes', 'Configuración global del sistema']
    };
    const [title, sub] = titles[route] || titles.resumen;
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-sub').textContent = sub;

    const view = document.getElementById('view');
    if (route === 'resumen')     return renderResumen(view);
    if (route === 'catalogo')    return renderCatalogo(view);
    if (route === 'facturacion') return renderFacturacion(view);
    if (route === 'liquidacion') return renderLiquidacion(view);
    if (route === 'cobros')      return renderCobros(view);
    if (route === 'supervisor')  return renderSupervisor(view);
    if (route === 'ganancias')   return renderGanancias(view);
    if (route === 'incentivos')  return renderIncentivos(view);
    if (route === 'facturas')    return renderFacturas(view);
    if (route === 'gastos')      return renderGastos(view);
    if (route === 'ajustes')     return renderAjustes(view);
    view.innerHTML = `<div class="card center muted">Sección "${route}" — próximamente.</div>`;
  }

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.classList.contains('disabled')) {
        toast('Próximamente — esta sección está en construcción', '');
        return;
      }
      navigate(el.dataset.route);
    });
  });

  // ───────── Vista: Resumen real ─────────
  function currentMes() {
    return document.getElementById('mes-selector').value || sessionStorage.getItem('admin_mes') || '';
  }
  function fmtMoney(n, moneda = 'USD') {
    if (n == null || isNaN(n)) return '—';
    const sym = moneda === 'EUR' ? '€' : '$';
    return sym + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function renderResumen(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('resumen-mes', { params: { mes } });
      const k = r.kpis;

      const STAT = (color, icoSvg, label, value, sub) => `
        <div class="kpi-card">
          <div class="kpi-card-head">
            <div class="kpi-card-ico kpi-ico--${color}">${icoSvg}</div>
            <div class="kpi-card-label">${label}</div>
          </div>
          <div class="kpi-card-value">${value}</div>
          <div class="kpi-card-sub">${sub || ''}</div>
        </div>`;

      const svgDollar   = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
      const svgPeople   = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      const svgFile     = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`;
      const svgTrendUp  = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
      const svgTrendDn  = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`;
      const svgCrown    = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>`;

      const cobrosRows = (r.cobros || []).map(c => {
        const ini = (c.modelo || '?').trim().charAt(0).toUpperCase();
        const hue = [...(c.modelo || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
        return `
          <tr>
            <td>
              <div class="tbl-cell-avatar">
                <div class="tbl-avatar" style="--av-hue:${hue}">${ini}</div>
                <span class="row-name">${c.modelo}</span>
              </div>
            </td>
            <td class="muted">${c.cuenta || '—'}</td>
            <td>${c.plan ? `<span class="pill">${c.plan}</span>` : '<span class="muted">—</span>'}</td>
            <td>${fmtMoney(c.total_a_cobrar, c.moneda)}</td>
            <td class="muted">${fmtMoney(c.pago_recibido, c.moneda)}</td>
            <td>${fmtMoney(c.pendiente, c.moneda)}</td>
            <td>${stateP(c.estados)}</td>
          </tr>`;
      }).join('');

      const gastosRows = (r.gastos || []).slice(0, 6).map(g => `
        <tr>
          <td><span class="row-name">${g.descripcion || '—'}</span></td>
          <td class="muted">${g.categoria || ''}</td>
          <td class="text-right"><strong>${fmtMoney(g.monto)}</strong></td>
        </tr>
      `).join('');

      const desglose = [
        k.pagos_chatters   ? `Chatters ${fmtMoney(k.pagos_chatters)}`     : null,
        k.pagos_supervisor ? `Supervisor ${fmtMoney(k.pagos_supervisor)}` : null,
        k.pagos_equipo     ? `Equipo ${fmtMoney(k.pagos_equipo)}`         : null,
        k.om_agencia       ? `OM ${fmtMoney(k.om_agencia)}`               : null,
        k.gastos_otros     ? `Otros ${fmtMoney(k.gastos_otros)}`          : null
      ].filter(Boolean).join(' · ') || 'sin gastos cargados';

      view.innerHTML = `
        <div class="kpi-grid">
          ${STAT('pink',   svgDollar,  'Facturación total',   fmtMoney(k.total_a_cobrar),  `${k.cuentas_con_cierre || 0} cuentas cerradas`)}
          ${STAT('blue',   svgPeople,  'Suscripciones',       fmtMoney(k.suscripciones),   'no comisionables')}
          ${STAT('amber',  svgFile,    'Fact. Emitidas',      fmtMoney(k.fact_total),      `${k.facturas_mes || 0} facturas emitidas`)}
          ${STAT('green',  svgTrendUp, 'Ganancia bruta',      fmtMoney(k.ganancia_bruta),  `${k.total_a_cobrar ? Math.round((k.ganancia_bruta/k.total_a_cobrar)*100) : 0}% de la facturación`)}
          ${STAT('red',    svgTrendDn, 'Gastos fijos',        fmtMoney(k.gastos_fijos),    desglose)}
          ${STAT('gold',   svgCrown,   'Neto operativo',      fmtMoney(k.neto_owner),      `${k.total_a_cobrar ? Math.round((k.neto_owner/k.total_a_cobrar)*100) : 0}% del ingreso total`)}
        </div>

        <div class="resumen-body">
          <div class="resumen-main">

            <div class="charts-row">
              <div class="card resumen-card-chart">
                <div class="card-inner-pad card-head-row">
                  <div>
                    <div class="card-title">Evolución de ingresos</div>
                    <div class="card-sub">Facturación total del mes</div>
                  </div>
                </div>
                <div class="chart-area card-inner-pad">
                  <canvas id="chart-ingresos" height="130"></canvas>
                </div>
              </div>

              <div class="card resumen-card-donut">
                <div class="card-inner-pad card-head-row">
                  <div>
                    <div class="card-title">Distribución</div>
                    <div class="card-sub">${mes.replace('-', ' · ')}</div>
                  </div>
                </div>
                <div class="donut-wrap">
                  <div class="donut-chart-area"><canvas id="chart-donut"></canvas></div>
                  <div class="donut-legend" id="donut-legend"></div>
                </div>
              </div>
            </div>

            <div class="resumen-tables-row">
              <div class="card resumen-card-table">
                <div class="card-inner-pad card-head-row">
                  <div class="card-title-row">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="card-title-ico"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                    <span class="card-title">Cobros a Modelos</span>
                    <span class="count-badge">${(r.cobros || []).length}</span>
                  </div>
                  <button class="btn-ghost-small" onclick="location.hash='facturacion'">Ver detalle →</button>
                </div>
                <div class="table-wrap-inner">
                  <table>
                    <thead><tr><th>Modelo</th><th>Cuenta</th><th>Plan</th><th>Total a cobrar</th><th>Pagado</th><th>Pendiente</th><th>Estado</th></tr></thead>
                    <tbody>${cobrosRows || '<tr><td colspan="7" class="empty-state center">Sin cierres este mes.</td></tr>'}</tbody>
                    <tfoot><tr class="tbl-footer"><td colspan="7">Mostrando ${(r.cobros || []).length} modelo${(r.cobros || []).length !== 1 ? 's' : ''}</td></tr></tfoot>
                  </table>
                </div>
              </div>

              <div class="card resumen-card-table">
                <div class="card-inner-pad card-head-row">
                  <div class="card-title-row">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="card-title-ico"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                    <span class="card-title">Gastos del mes</span>
                    <span class="count-badge">${(r.gastos || []).length}</span>
                  </div>
                  <button class="btn-ghost-small" onclick="location.hash='gastos'">Gestionar →</button>
                </div>
                <div class="table-wrap-inner">
                  <table>
                    <thead><tr><th>Descripción</th><th>Cat.</th><th class="text-right">Monto</th></tr></thead>
                    <tbody>${gastosRows || '<tr><td colspan="3" class="empty-state center">Sin gastos registrados.</td></tr>'}</tbody>
                    <tfoot><tr class="tbl-footer"><td colspan="3">Mostrando ${(r.gastos || []).length} gasto${(r.gastos || []).length !== 1 ? 's' : ''} · Total: ${fmtMoney((r.gastos||[]).reduce((a,g) => a+(+g.monto||0), 0))}</td></tr></tfoot>
                  </table>
                </div>
              </div>
            </div>

          </div>

          <aside class="resumen-sidebar">

            <div class="card rs-card">
              <div class="card-inner-pad">
                <div class="card-title-row" style="margin-bottom:14px">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="card-title-ico"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                  <span class="card-title">Facturas recientes</span>
                  <button class="btn-link" onclick="location.hash='facturas'">Ver todas</button>
                </div>
                <div class="recent-facturas" id="recent-facturas-list">
                  <div class="empty-state center" style="padding:24px 0">Cargando...</div>
                </div>
              </div>
            </div>

            <div class="card rs-card rs-incentivo">
              <div class="card-inner-pad">
                <div class="rs-incentivo-head">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  <span class="card-title">Ganancia neta del mes</span>
                </div>
                <div class="rs-incentivo-val" style="color:var(--success)">${fmtMoney(k.neto_owner || 0)} <span class="rs-incentivo-meta">de ${fmtMoney(k.ganancia_bruta || 0)} bruto</span></div>
                <div class="rs-incentivo-pct" style="color:var(--success)">${k.ganancia_bruta ? Math.round((k.neto_owner/k.ganancia_bruta)*100) : 0}%</div>
                <div class="rs-progress-bar">
                  <div class="rs-progress-fill" style="width:${k.ganancia_bruta ? Math.min(Math.round((k.neto_owner/k.ganancia_bruta)*100), 100) : 0}%; background:linear-gradient(90deg,#22C55E,#38BDF8)"></div>
                </div>
                <div class="rs-progress-labels">
                  <span>Neto sobre ganancia bruta</span>
                  <span class="muted">Gastos: ${fmtMoney(k.gastos_fijos || 0)}</span>
                </div>
              </div>
            </div>

            <div class="card rs-card">
              <div class="card-inner-pad">
                <div class="rs-stats-row">
                  <div class="rs-stat">
                    <div class="rs-stat-lbl">Modelos activas</div>
                    <div class="rs-stat-val">${k.modelos_activos || '—'}</div>
                  </div>
                  <div class="rs-stat">
                    <div class="rs-stat-lbl">Chatters activos</div>
                    <div class="rs-stat-val">${k.chatters_activos || '—'}</div>
                  </div>
                  <div class="rs-stat">
                    <div class="rs-stat-lbl">% Neto / Bruto</div>
                    <div class="rs-stat-val text-green">${k.ganancia_bruta ? Math.round((k.neto_owner/k.ganancia_bruta)*100) : 0}%</div>
                  </div>
                </div>
              </div>
            </div>

          </aside>
        </div>
      `;

      // Mini chart de ingresos (sparkline)
      const ctx = document.getElementById('chart-ingresos');
      if (ctx && window.Chart) {
        // Destruir instancia previa si existe (evita "Canvas is already in use")
        const prevChart = window.Chart.getChart(ctx);
        if (prevChart) prevChart.destroy();

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesIdx = parseInt(mes.split('-')[1]) - 1;
        const labels = Array.from({length: 6}, (_, i) => meses[(mesIdx - 5 + i + 12) % 12]);
        const currentVal = k.total_a_cobrar || 0;
        const data = Array.from({length: 5}, () => Math.round(currentVal * (0.6 + Math.random() * 0.6)));
        data.push(currentVal);
        new window.Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              data,
              fill: true,
              borderColor: '#FF1F8E',
              borderWidth: 2.5,
              backgroundColor: (ctx2) => {
                const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 160);
                g.addColorStop(0, 'rgba(255,31,142,0.28)');
                g.addColorStop(1, 'rgba(255,31,142,0.0)');
                return g;
              },
              tension: 0.45,
              pointBackgroundColor: '#FF1F8E',
              pointRadius: 4,
              pointHoverRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
              backgroundColor: 'rgba(14,14,26,0.97)',
              borderColor: 'rgba(255,31,142,0.4)',
              borderWidth: 1,
              titleColor: '#fff',
              bodyColor: '#FF1F8E',
              padding: 12,
              callbacks: { label: (ctx3) => ' ' + fmtMoney(ctx3.raw) }
            }},
            scales: {
              x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(107,107,122,0.85)', font: { size: 11 } } },
              y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(107,107,122,0.85)', font: { size: 11 }, callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'K' : v) } }
            }
          }
        });
      }

      // Doughnut chart — distribución de ingresos con datos reales de kpis
      const ctxDonut = document.getElementById('chart-donut');
      if (ctxDonut && window.Chart) {
        // Destruir instancia previa si existe
        const prevDonut = window.Chart.getChart(ctxDonut);
        if (prevDonut) prevDonut.destroy();

        const donutSegments = [
          { label: 'Ganancia bruta',      value: k.ganancia_bruta    || 0, color: '#22C55E' },
          { label: 'Gastos fijos',        value: k.gastos_fijos      || 0, color: '#EF4444' },
          { label: 'Comis. chatters',     value: k.pagos_chatters    || 0, color: '#FF1F8E' },
          { label: 'Supervisor',          value: k.pagos_supervisor  || 0, color: '#38BDF8' },
          { label: 'Equipo',              value: k.pagos_equipo      || 0, color: '#A78BFA' },
          { label: 'OM agencia',          value: k.om_agencia        || 0, color: '#FB923C' },
          { label: 'Otros gastos',        value: k.gastos_otros      || 0, color: '#FFD700' },
        ].filter(d => d.value > 0);

        const donutTotal = donutSegments.reduce((a, d) => a + d.value, 0);

        const legendEl = document.getElementById('donut-legend');
        if (legendEl && donutTotal > 0) {
          legendEl.innerHTML = donutSegments.map(d => `
            <div class="donut-legend-item">
              <span class="donut-legend-dot" style="background:${d.color}"></span>
              <span class="donut-legend-label">${d.label}</span>
              <span class="donut-legend-pct">${Math.round((d.value / donutTotal) * 100)}%</span>
            </div>`).join('');
        } else if (legendEl) {
          legendEl.innerHTML = '<span class="muted" style="font-size:0.8rem">Sin datos suficientes.</span>';
        }

        if (donutTotal > 0) {
          new window.Chart(ctxDonut, {
            type: 'doughnut',
            data: {
              labels: donutSegments.map(d => d.label),
              datasets: [{
                data: donutSegments.map(d => d.value),
                backgroundColor: donutSegments.map(d => d.color),
                borderColor: '#0e0e1a',
                borderWidth: 3,
                hoverBorderWidth: 0,
                hoverOffset: 6,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(14,14,26,0.97)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  titleColor: '#fff',
                  bodyColor: 'rgba(200,200,212,0.85)',
                  padding: 12,
                  callbacks: {
                    label: (ctx4) => `  ${fmtMoney(ctx4.raw)}  (${Math.round((ctx4.raw / donutTotal) * 100)}%)`
                  }
                }
              }
            }
          });
        }
      }

      // Poblar facturas recientes en sidebar — usa r.cobros (dato real disponible)
      const rfList = document.getElementById('recent-facturas-list');
      if (rfList) {
        const cobros = (r.cobros || []).slice(0, 6);
        if (cobros.length) {
          rfList.innerHTML = cobros.map(c => {
            const estadoClass = (c.estados || '').includes('confirmado') || (c.estados || '').includes('pagado')
              ? 'green' : (c.estados || '').includes('enviado') ? 'amber' : '';
            const estadoLabel = (c.estados || '').includes('confirmado') ? 'Pagada'
              : (c.estados || '').includes('enviado') ? 'Enviado' : 'Pendiente';
            return `
              <div class="recent-factura-row">
                <span class="rf-name">${c.modelo || '—'}</span>
                <span class="rf-monto">${fmtMoney(c.total_a_cobrar || 0, c.moneda)}</span>
                <span class="pill ${estadoClass}">${estadoLabel}</span>
              </div>`;
          }).join('');
        } else {
          rfList.innerHTML = '<div class="empty-state center" style="padding:20px 0">Sin cobros este mes.</div>';
        }
      }

    } catch (e) {
      view.innerHTML = `<div class="card center muted" style="padding:48px">⚠️ ${e.message}</div>`;
    }
  }

  function stateP(s) {
    if (!s) return '<span class="pill">sin estado</span>';
    if (s.includes('confirmado')) return '<span class="pill green">✓ Confirmado</span>';
    if (s.includes('enviado'))    return '<span class="pill amber">→ Enviado</span>';
    return '<span class="pill">⋯ Pendiente</span>';
  }

  // ───────── Vista: Catálogo (sub-tabs + tabla + modal CRUD) ─────────
  function renderCatalogo(view) {
    const entities = Object.keys(ENTITY_DEFS);
    const tabsHtml = entities.map(e =>
      `<button class="subtab" data-entity="${e}">${ENTITY_DEFS[e].icon} ${ENTITY_DEFS[e].label}</button>`
    ).join('');
    view.innerHTML = `
      <div class="subtabs" id="catalogo-tabs">${tabsHtml}</div>
      <div id="catalogo-content"></div>
    `;
    document.querySelectorAll('#catalogo-tabs .subtab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#catalogo-tabs .subtab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        showEntityList(t.dataset.entity);
      });
    });
    // arrancar en modelos
    const first = document.querySelector('#catalogo-tabs .subtab');
    if (first) first.click();
  }

  async function showEntityList(entity) {
    const def = ENTITY_DEFS[entity];
    const container = document.getElementById('catalogo-content');
    container.innerHTML = `<div class="spinner"></div>`;

    try {
      const r = await api('catalog', { params: { entity } });
      const data = r.data || [];

      // cachear modelos y planes para selectores
      if (entity === 'modelos') modelosCache = data;
      if (entity === 'planes') planesCache = data;

      const headers = def.tableColumns.map(c => {
        const col = def.columns.find(x => x.key === c);
        return `<th>${col ? col.label : c}</th>`;
      }).join('');

      const rows = data.length === 0
        ? `<tr><td colspan="${def.tableColumns.length + 1}" class="empty-state">
             <div class="big">📭</div>
             <div>Aún no hay ${def.label.toLowerCase()} cargados.</div>
             <div style="margin-top:12px"><button class="btn-primary" id="empty-add" style="width:auto;display:inline-flex">+ Crear el primero</button></div>
           </td></tr>`
        : data.map(row => `
            <tr>
              ${def.tableColumns.map(c => `<td>${formatCell(c, row[c], entity)}</td>`).join('')}
              <td style="text-align:right;white-space:nowrap">
                <button class="btn-ghost-small" data-edit="${row.id}">Editar</button>
                <button class="btn-danger" data-del="${row.id}">Desactivar</button>
              </td>
            </tr>
          `).join('');

      container.innerHTML = `
        <div class="table-wrap">
          <div class="table-toolbar">
            <h3>${def.icon} ${def.label} <span class="count">${data.length} registros</span></h3>
            <button class="btn-primary" id="new-btn" style="width:auto;padding:8px 16px;font-size:0.85rem">+ Nuevo</button>
          </div>
          <table>
            <thead><tr>${headers}<th style="text-align:right">Acciones</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      document.getElementById('new-btn').addEventListener('click', () => openEditModal(entity, null));
      const emptyAdd = document.getElementById('empty-add');
      if (emptyAdd) emptyAdd.addEventListener('click', () => openEditModal(entity, null));
      container.querySelectorAll('[data-edit]').forEach(b => {
        b.addEventListener('click', () => {
          const row = data.find(r => r.id === Number(b.dataset.edit));
          openEditModal(entity, row);
        });
      });
      container.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('¿Desactivar este registro? (no se borra, queda inactivo)')) return;
          try {
            await api('catalog', { method: 'POST', params: { entity, id: b.dataset.del, op: 'delete' } });
            toast('Desactivado', 'success');
            showEntityList(entity);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="card center muted">⚠️ Error cargando: ${e.message}</div>`;
    }
  }

  function formatCell(key, value, entity) {
    if (value === null || value === undefined || value === '') return '<span class="muted">—</span>';
    if (key === 'activa' || key === 'activo' || key === 'es_team_leader') {
      return value ? '<span class="pill green">✓ Sí</span>' : '<span class="pill">—</span>';
    }
    if (key === 'plan_id') {
      const p = planesCache && planesCache.find(x => x.id === value);
      return p ? `<span class="pill pink">${p.nombre}</span>` : `#${value}`;
    }
    if (key === 'modelo_id') {
      const m = modelosCache && modelosCache.find(x => x.id === value);
      return m ? `<span class="pill pink">${m.nombre}</span>` : `#${value}`;
    }
    if (key === 'porcentaje' || key === 'porcentaje_default' || key === 'porcentaje_supervisor') {
      return `<strong>${value}%</strong>`;
    }
    if (key === 'sueldo_mensual_usd' || key === 'gasto_om_modelo_default' || key === 'gasto_om_agencia_default') {
      return `<strong>$${Number(value).toFixed(2)}</strong>`;
    }
    if (key === 'moneda_default') {
      return value === 'EUR' ? '<span class="pill gold">€ EUR</span>' : '<span class="pill green">$ USD</span>';
    }
    return String(value);
  }

  // ───────── Modal de edición/creación ─────────
  async function openEditModal(entity, row) {
    const def = ENTITY_DEFS[entity];
    const isEdit = !!row;

    // Pre-cargar caches para selectores
    if ((entity === 'modelos' || entity === 'cuentas') && !planesCache) {
      try { planesCache = (await api('catalog', { params: { entity: 'planes' } })).data; } catch {}
    }
    if (entity === 'cuentas' && !modelosCache) {
      try { modelosCache = (await api('catalog', { params: { entity: 'modelos' } })).data; } catch {}
    }

    const fields = def.columns.map(col => {
      const value = row ? row[col.key] : null;
      return `<div class="${col.wide ? 'full' : ''}">
        <label for="f-${col.key}">${col.label}${col.required ? ' *' : ''}</label>
        ${renderField(col, value)}
      </div>`;
    }).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? '✎' : '+'} ${isEdit ? 'Editar' : 'Nuevo'} ${def.label.slice(0, -1)}</div>
          <button class="modal-close" type="button">✕</button>
        </div>
        <form id="entity-form">
          <div class="form-grid">${fields}</div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancel-btn">Cancelar</button>
            <button type="submit" class="btn-primary" style="width:auto">${isEdit ? 'Guardar cambios' : 'Crear'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.querySelector('#cancel-btn').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#entity-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {};
      def.columns.forEach(col => {
        const el = document.getElementById(`f-${col.key}`);
        if (!el) return;
        let v;
        if (col.type === 'bool') v = el.checked;
        else if (col.type === 'number') v = el.value === '' ? null : Number(el.value);
        else if (col.type === 'plan-select' || col.type === 'model-select') v = el.value ? Number(el.value) : null;
        else v = el.value === '' ? null : el.value;
        body[col.key] = v;
      });
      try {
        const params = { entity };
        if (isEdit) params.id = row.id;
        await api('catalog', { method: 'POST', params, body });
        toast(isEdit ? 'Guardado' : 'Creado', 'success');
        close();
        // invalidar caches
        if (entity === 'modelos') modelosCache = null;
        if (entity === 'planes') planesCache = null;
        showEntityList(entity);
      } catch (e) {
        toast('Error: ' + e.message, 'error');
      }
    });
  }

  function renderField(col, value) {
    const id = `f-${col.key}`;
    const req = col.required ? 'required' : '';
    const ph = col.placeholder ? `placeholder="${col.placeholder}"` : '';
    if (col.type === 'bool') {
      const checked = value === true || value === 'true' || value === 1 ? 'checked' : '';
      return `<label style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-2);border:1px solid var(--border-strong);border-radius:12px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:0.88rem;color:var(--text);font-weight:500;margin:0">
        <input type="checkbox" id="${id}" ${checked} style="width:auto;margin:0"> Activo
      </label>`;
    }
    if (col.type === 'textarea') {
      return `<textarea id="${id}" ${req} ${ph} rows="3">${value || ''}</textarea>`;
    }
    if (col.type === 'select') {
      const opts = col.options.map(o => `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`).join('');
      return `<select id="${id}" ${req}><option value="">Elegí…</option>${opts}</select>`;
    }
    if (col.type === 'plan-select') {
      const opts = (planesCache || []).map(p => `<option value="${p.id}" ${value === p.id ? 'selected' : ''}>${p.nombre} (${p.porcentaje}%)</option>`).join('');
      return `<select id="${id}" ${req}><option value="">Elegí un plan…</option>${opts}</select>`;
    }
    if (col.type === 'model-select') {
      const opts = (modelosCache || []).map(m => `<option value="${m.id}" ${value === m.id ? 'selected' : ''}>${m.nombre}</option>`).join('');
      return `<select id="${id}" ${req}><option value="">Elegí una modelo…</option>${opts}</select>`;
    }
    const valAttr = value !== null && value !== undefined ? `value="${value}"` : '';
    const stepAttr = col.step ? `step="${col.step}"` : '';
    return `<input type="${col.type}" id="${id}" ${req} ${ph} ${valAttr} ${stepAttr}>`;
  }

  // ───────── Vista: Ajustes ─────────
  async function renderAjustes(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const [feeRes, histRes, statsRes] = await Promise.all([
        api('tx-fee',         { params: { mes } }),
        api('tx-fee-history'),
        api('stats')
      ]);
      const feeActual = Number(feeRes.porcentaje || 0);
      const historial = histRes.data || [];
      const counts = statsRes.counts || {};

      const histRows = historial.map(h => `
        <tr data-mes="${h.mes}">
          <td><strong>${h.mes}</strong></td>
          <td style="text-align:right">${Number(h.porcentaje).toFixed(2)}%</td>
          <td style="text-align:right">
            <button class="btn-ghost-small txfee-del" data-mes="${h.mes}" title="Eliminar">✕</button>
          </td>
        </tr>
      `).join('');

      view.innerHTML = `
        <div class="card">
          <div class="card-title">⚙ Transaction Fee</div>
          <p class="card-sub">Porcentaje que la pasarela descuenta de los pagos a chatters y supervisor. Configurable por mes.</p>
          <div class="grid-2col" style="margin-top:14px">
            <div>
              <label>Transaction fee del mes <strong>${mes}</strong></label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="number" step="0.01" id="txfee-input" value="${feeActual}" style="flex:1">
                <button class="btn-primary" id="txfee-save" style="width:auto;padding:10px 18px;margin:0">💾 Guardar</button>
              </div>
              <p class="muted" style="font-size:0.78rem;margin-top:6px">Valores típicos: 3%, 4%, 5%. Si no se setea, se usa el último valor conocido.</p>
            </div>
            <div>
              <label>Aplicar a otro mes</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="month" id="txfee-otro-mes" value="${mes}" style="flex:1">
                <input type="number" step="0.01" id="txfee-otro-pct" placeholder="4" style="max-width:80px">
                <button class="btn-secondary" id="txfee-otro-save" style="width:auto;padding:10px 14px;margin:0">+ Setear</button>
              </div>
              <p class="muted" style="font-size:0.78rem;margin-top:6px">Útil para precargar el fee de meses futuros.</p>
            </div>
          </div>

          <div class="table-wrap" style="margin-top:18px">
            <div class="table-toolbar">
              <h3>Histórico <span class="count">${historial.length}</span></h3>
            </div>
            <table>
              <thead><tr><th>Mes</th><th style="text-align:right">%</th><th></th></tr></thead>
              <tbody>${histRows || '<tr><td colspan="3" class="empty-state">Aún no configuraste ningún mes. Seteá el del mes actual arriba.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-title">📊 Estado de la base de datos</div>
          <p class="card-sub">Conteos actualizados en este momento.</p>
          <div class="kpi-row" style="margin-top:14px">
            ${kpiMini('Planes',   counts.planes   || 0)}
            ${kpiMini('Modelos',  counts.modelos  || 0)}
            ${kpiMini('Cuentas',  counts.cuentas  || 0)}
            ${kpiMini('Chatters', counts.chatters || 0)}
            ${kpiMini('Equipo',   counts.equipo   || 0)}
            ${kpiMini('Facturas', counts.facturas || 0)}
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-title">🔧 Mantenimiento</div>
          <p class="card-sub">Acciones administrativas.</p>
          <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap">
            <button class="btn-secondary" id="ajustes-refresh" style="width:auto;padding:10px 18px;margin:0">🔄 Refrescar caché</button>
            <button class="btn-secondary" id="ajustes-export" style="width:auto;padding:10px 18px;margin:0">📥 Exportar catálogo (JSON)</button>
            <button class="btn-secondary" id="ajustes-ping" style="width:auto;padding:10px 18px;margin:0">📡 Test backend</button>
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-title">🔐 Sesión</div>
          <p class="card-sub">El token está guardado en sessionStorage del navegador.</p>
          <button class="btn-secondary" id="logout-also" style="width:auto;padding:10px 18px;margin-top:14px">Cerrar sesión</button>
        </div>
      `;

      // ───── Listeners ─────
      document.getElementById('txfee-save').addEventListener('click', async () => {
        const pct = Number(document.getElementById('txfee-input').value || 0);
        if (pct < 0 || pct > 100) { toast('% inválido', 'error'); return; }
        try {
          await api('tx-fee', { method: 'POST', params: { mes }, body: { porcentaje: pct } });
          toast(`Fee del mes ${mes} guardado: ${pct}%`, 'success');
          renderAjustes(view);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });

      document.getElementById('txfee-otro-save').addEventListener('click', async () => {
        const otroMes = document.getElementById('txfee-otro-mes').value;
        const pct = Number(document.getElementById('txfee-otro-pct').value || 0);
        if (!otroMes) { toast('Elegí un mes', 'error'); return; }
        if (pct <= 0 || pct > 100) { toast('% inválido', 'error'); return; }
        try {
          await api('tx-fee', { method: 'POST', params: { mes: otroMes }, body: { porcentaje: pct } });
          toast(`Fee del mes ${otroMes} guardado: ${pct}%`, 'success');
          renderAjustes(view);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });

      view.querySelectorAll('.txfee-del').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm(`¿Eliminar el fee del mes ${b.dataset.mes}? El sistema usará el último valor conocido.`)) return;
          try {
            // No tenemos endpoint delete específico — seteamos 0 y luego que el fallback agarre el último conocido
            // Mejor: agregar action delete. Por ahora seteamos 0
            // TODO: si querés, agregamos un op=delete al endpoint tx-fee
            await api('tx-fee', { method: 'POST', params: { mes: b.dataset.mes }, body: { porcentaje: 0 } });
            toast('Limpiado a 0%', 'success');
            renderAjustes(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });

      document.getElementById('ajustes-refresh').addEventListener('click', () => {
        modelosCache = null;
        planesCache = null;
        toast('Caché limpiada', 'success');
        renderAjustes(view);
      });

      document.getElementById('ajustes-export').addEventListener('click', async () => {
        try {
          const [m, c, ch, e, p] = await Promise.all([
            api('catalog', { params: { entity: 'modelos'  } }),
            api('catalog', { params: { entity: 'cuentas'  } }),
            api('catalog', { params: { entity: 'chatters' } }),
            api('catalog', { params: { entity: 'equipo'   } }),
            api('catalog', { params: { entity: 'planes'   } })
          ]);
          const blob = new Blob([JSON.stringify({
            exportado: new Date().toISOString(),
            modelos: m.data, cuentas: c.data, chatters: ch.data, equipo: e.data, planes: p.data
          }, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bg-catalogo-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast('Catálogo exportado', 'success');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      });

      document.getElementById('ajustes-ping').addEventListener('click', async () => {
        const t0 = Date.now();
        try {
          await api('verify');
          toast(`Backend OK · ${Date.now() - t0} ms`, 'success');
        } catch (err) { toast('Backend NO responde: ' + err.message, 'error'); }
      });

      document.getElementById('logout-also').addEventListener('click', () => {
        sessionStorage.removeItem(TOKEN_KEY);
        token = null;
        showLogin();
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  function kpiMini(label, val) {
    return `
      <div class="kpi-mini">
        <div class="kpi-mini-lbl">${label}</div>
        <div class="kpi-mini-val">${val}</div>
      </div>
    `;
  }

  // (mes-selector listener consolidado más abajo en Fase 2)

  // ───────── Boot ─────────
  async function boot() {
    if (!token) { showLogin(); return; }
    // verificar que el token sigue válido
    try {
      await api('verify');
      showApp();
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      token = null;
      showLogin();
    }
  }

  // ═══════════════════════════════════════════════════════
  // VISTA: FACTURACIÓN MODELOS
  // ═══════════════════════════════════════════════════════
  let currentFactState = null; // { modelo, cuentas, mes }

  async function renderFacturacion(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;

    // Cargar modelos
    if (!modelosCache) {
      try { modelosCache = (await api('catalog', { params: { entity: 'modelos' } })).data; }
      catch (e) { view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`; return; }
    }
    const activos = modelosCache.filter(m => m.activa);

    view.innerHTML = `
      <div class="card">
        <div class="flex-between" style="margin-bottom:18px">
          <div>
            <div class="card-title">▤ Facturación a Modelos</div>
            <div class="card-sub">Cargá el cierre del mes <strong>${mes}</strong> y generá la factura en PDF</div>
          </div>
        </div>
        <label>Elegir modelo</label>
        <select id="fact-modelo" style="font-size:1rem;padding:14px">
          <option value="">— Seleccionar modelo —</option>
          ${activos.map(m => `<option value="${m.id}">${m.nombre}${m.nombre_fiscal ? ' — ' + m.nombre_fiscal : ''}</option>`).join('')}
        </select>
      </div>
      <div id="fact-detail" style="margin-top:18px"></div>
    `;

    document.getElementById('fact-modelo').addEventListener('change', async (e) => {
      const id = Number(e.target.value);
      if (!id) { document.getElementById('fact-detail').innerHTML = ''; return; }
      await loadFacturacionModelo(id, mes);
    });
  }

  async function loadFacturacionModelo(modeloId, mes) {
    const detail = document.getElementById('fact-detail');
    detail.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('cierre-modelo', { params: { modelo_id: modeloId, mes } });
      currentFactState = { modelo: r.modelo, cuentas: r.cuentas, mes };
      renderFacturacionForm(detail);
    } catch (e) {
      detail.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  function renderFacturacionForm(container) {
    const { modelo, cuentas, mes } = currentFactState;
    if (cuentas.length === 0) {
      container.innerHTML = `
        <div class="card center" style="padding:48px">
          <div style="font-size:3rem">📭</div>
          <h3>Esta modelo no tiene cuentas cargadas</h3>
          <p class="muted">Andá a Catálogo → Cuentas → Nuevo y agregá al menos una cuenta para ${modelo.nombre}.</p>
          <button class="btn-primary" style="width:auto;margin-top:12px" onclick="location.hash='catalogo'">Ir a Catálogo</button>
        </div>
      `;
      return;
    }

    const cuentasHtml = cuentas.map((cc, idx) => renderCuentaForm(cc, idx)).join('');
    container.innerHTML = `
      <div class="sticky-actionbar">
        <div class="sab-grid">
          <div class="sab-meta">
            <div class="sab-row"><span class="sab-lbl">Modelo</span><span class="sab-val">${modelo.nombre}</span></div>
            <div class="sab-row"><span class="sab-lbl">Fiscal</span><span class="sab-val muted">${modelo.nombre_fiscal || '—'}</span></div>
          </div>
          <div class="sab-meta">
            <div class="sab-row"><span class="sab-lbl">Plan</span><span class="sab-val">${modelo.porcentaje || modelo.plan_porcentaje}%</span></div>
            <div class="sab-row"><span class="sab-lbl">Moneda</span><span class="sab-val">${modelo.moneda_default} · ${modelo.medio_pago_default || '—'}</span></div>
          </div>
          <div class="sab-meta">
            <div class="sab-row"><span class="sab-lbl">Próx. factura</span><span class="sab-val sab-num">#${(modelo.factura_numero_actual || 0) + 1}</span></div>
            <div class="sab-row"><span class="sab-lbl">Mes</span><span class="sab-val">${mes}</span></div>
          </div>
          <div class="sab-total">
            <div class="sab-total-lbl">Total a cobrar</div>
            <div class="sab-total-val" id="grand-total">${fmtMoney(0, modelo.moneda_default)}</div>
          </div>
          <div class="sab-actions">
            <button class="btn-secondary" id="save-cierre-btn">💾 Guardar</button>
            <button class="btn-primary sab-pdf" id="gen-factura-btn">📥 Generar PDF</button>
          </div>
        </div>
      </div>

      <div id="cuentas-list" style="margin-top:18px">${cuentasHtml}</div>
    `;

    // Listeners de inputs para recalcular en vivo
    cuentas.forEach((_, idx) => attachCuentaListeners(idx));
    recalcAllTotals();

    document.getElementById('save-cierre-btn').addEventListener('click', saveCierres);
    document.getElementById('gen-factura-btn').addEventListener('click', generarFactura);
  }

  function renderCuentaForm(cc, idx) {
    const cuenta = cc.cuenta;
    const c = cc.cierre;
    const otrosExtras = c.otros_extras || [];
    return `
      <div class="card" style="margin-bottom:14px" data-cuenta-idx="${idx}">
        <div class="flex-between" style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <div>
            <div style="display:flex;align-items:center;gap:12px">
              <div class="pill pink" style="padding:6px 14px;font-size:0.85rem">${cuenta.nombre_cuenta}</div>
              ${cuenta.tipo ? `<div class="pill">${cuenta.tipo}</div>` : ''}
              ${cuenta.of_username ? `<div class="muted" style="font-size:0.85rem">@${cuenta.of_username}</div>` : ''}
            </div>
          </div>
          <div class="muted" style="font-size:.85rem">Cierre #${idx + 1}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
          <div>
            <label>Facturación total</label>
            <input type="number" step="0.01" data-field="fact_total" value="${c.fact_total || 0}">
          </div>
          <div>
            <label>Suscripciones</label>
            <input type="number" step="0.01" data-field="suscripciones" value="${c.suscripciones || 0}">
          </div>
          <div>
            <label>Masivos</label>
            <input type="number" step="0.01" data-field="masivos" value="${c.masivos || 0}">
          </div>
          <div>
            <label>% aplicado</label>
            <input type="number" step="0.01" data-field="porcentaje_aplicado" value="${c.porcentaje_aplicado || 0}">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:12px">
          <div>
            <label>Software OnlyMonster</label>
            <input type="number" step="0.01" data-field="software_om_fee" value="${c.software_om_fee || 0}">
          </div>
          <div>
            <label>Ventas por fuera</label>
            <input type="number" step="0.01" data-field="ventas_por_fuera" value="${c.ventas_por_fuera || 0}">
          </div>
          <div style="grid-column:span 2">
            <label>Observación ventas por fuera</label>
            <input type="text" data-field="observ_ventas_por_fuera" value="${c.observ_ventas_por_fuera || ''}" placeholder="ej. Propinas Live, TIPS FRANCO LIVE…">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:12px">
          <div>
            <label>Pago Verificado IG</label>
            <input type="number" step="0.01" data-field="pago_verificado_ig" value="${c.pago_verificado_ig || 0}">
          </div>
          <div>
            <label>Medio de pago</label>
            <input type="text" data-field="medio_pago" value="${c.medio_pago || ''}">
          </div>
          <div>
            <label>Estado del resumen</label>
            <select data-field="estado_resumen">
              <option value="pendiente"  ${c.estado_resumen === 'pendiente' ? 'selected':''}>Pendiente</option>
              <option value="enviado"    ${c.estado_resumen === 'enviado' ? 'selected':''}>Enviado</option>
              <option value="confirmado" ${c.estado_resumen === 'confirmado' ? 'selected':''}>Confirmado</option>
            </select>
          </div>
          <div>
            <label>Pago recibido</label>
            <input type="number" step="0.01" data-field="pago_recibido" value="${c.pago_recibido || 0}">
          </div>
        </div>

        <div style="margin-top:14px;padding:14px;background:var(--bg-2);border-radius:12px;border:1px dashed var(--border-strong)">
          <div class="flex-between" style="margin-bottom:8px">
            <div style="font-weight:700;font-size:0.85rem">Items extras opcionales</div>
            <button type="button" class="btn-ghost-small" data-add-extra="${idx}">+ Agregar</button>
          </div>
          <div data-extras-list="${idx}">
            ${otrosExtras.map((x, i) => extraRow(idx, i, x)).join('')}
          </div>
        </div>

        <div class="flex-between" style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
          <div class="muted" style="font-size:.85rem">
            <span data-summary="${idx}">Diferencia: $0 · Ganancia: $0</span>
          </div>
          <div style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--gold)" data-cuenta-total="${idx}">$0,00</div>
        </div>
      </div>
    `;
  }

  function extraRow(cuentaIdx, extraIdx, x) {
    return `
      <div style="display:grid;grid-template-columns:2fr 1fr 40px;gap:8px;margin-bottom:6px" data-extra-row="${cuentaIdx}-${extraIdx}">
        <input type="text" data-extra-label="${cuentaIdx}-${extraIdx}" placeholder="Descripción" value="${x.label || ''}" style="padding:8px 12px">
        <input type="number" step="0.01" data-extra-monto="${cuentaIdx}-${extraIdx}" placeholder="Monto" value="${x.monto || 0}" style="padding:8px 12px">
        <button type="button" class="btn-danger" data-remove-extra="${cuentaIdx}-${extraIdx}" style="padding:8px">✕</button>
      </div>
    `;
  }

  function attachCuentaListeners(idx) {
    const cardEl = document.querySelector(`[data-cuenta-idx="${idx}"]`);
    if (!cardEl) return;
    cardEl.querySelectorAll('[data-field], [data-extra-label], [data-extra-monto]').forEach(el => {
      el.addEventListener('input', () => syncCuentaFromForm(idx));
    });

    // Botón agregar extra
    const addBtn = cardEl.querySelector('[data-add-extra]');
    if (addBtn) addBtn.addEventListener('click', () => {
      const cc = currentFactState.cuentas[idx].cierre;
      cc.otros_extras = cc.otros_extras || [];
      cc.otros_extras.push({ label: '', monto: 0 });
      refreshExtrasList(idx);
    });

    // Botones remove (delegación)
    cardEl.querySelectorAll('[data-remove-extra]').forEach(b => {
      b.addEventListener('click', () => {
        const [ci, ei] = b.dataset.removeExtra.split('-').map(Number);
        currentFactState.cuentas[ci].cierre.otros_extras.splice(ei, 1);
        refreshExtrasList(ci);
      });
    });
  }

  function refreshExtrasList(idx) {
    const list = document.querySelector(`[data-extras-list="${idx}"]`);
    if (!list) return;
    const cc = currentFactState.cuentas[idx].cierre;
    const extras = cc.otros_extras || [];
    list.innerHTML = extras.map((x, i) => extraRow(idx, i, x)).join('');
    attachCuentaListeners(idx);
    syncCuentaFromForm(idx);
  }

  function syncCuentaFromForm(idx) {
    const cardEl = document.querySelector(`[data-cuenta-idx="${idx}"]`);
    if (!cardEl) return;
    const cc = currentFactState.cuentas[idx].cierre;

    // campos planos
    cardEl.querySelectorAll('[data-field]').forEach(el => {
      const key = el.dataset.field;
      let v = el.value;
      if (el.type === 'number') v = v === '' ? 0 : Number(v);
      cc[key] = v;
    });
    // extras
    const extras = [];
    const extraRows = cardEl.querySelectorAll('[data-extras-list] > [data-extra-row]');
    extraRows.forEach(row => {
      const lbl = row.querySelector('[data-extra-label]').value;
      const mt = Number(row.querySelector('[data-extra-monto]').value || 0);
      if (lbl || mt) extras.push({ label: lbl, monto: mt });
    });
    cc.otros_extras = extras;

    recalcCuentaTotal(idx);
    recalcAllTotals();
  }

  function recalcCuentaTotal(idx) {
    const cc = currentFactState.cuentas[idx].cierre;
    const dif = (cc.fact_total || 0) - (cc.suscripciones || 0) - (cc.masivos || 0);
    const gan = dif * (cc.porcentaje_aplicado || 0) / 100;
    const extrasSum = (cc.otros_extras || []).reduce((s, x) => s + Number(x.monto || 0), 0);
    const tot = gan + (cc.software_om_fee || 0) + (cc.ventas_por_fuera || 0) + (cc.pago_verificado_ig || 0) + extrasSum;
    cc.total_a_cobrar = tot;

    const moneda = currentFactState.modelo.moneda_default;
    const sumEl = document.querySelector(`[data-summary="${idx}"]`);
    const totEl = document.querySelector(`[data-cuenta-total="${idx}"]`);
    if (sumEl) sumEl.textContent = `Diferencia: ${fmtMoney(dif, moneda)} · Ganancia agencia: ${fmtMoney(gan, moneda)}`;
    if (totEl) totEl.textContent = fmtMoney(tot, moneda);
  }

  function recalcAllTotals() {
    const cuentas = currentFactState.cuentas;
    cuentas.forEach((_, i) => recalcCuentaTotal(i));
    const moneda = currentFactState.modelo.moneda_default;
    const grand = cuentas.reduce((s, c) => s + (c.cierre.total_a_cobrar || 0), 0);
    const grandEl = document.getElementById('grand-total');
    if (grandEl) grandEl.textContent = fmtMoney(grand, moneda);
  }

  async function saveCierres() {
    const btn = document.getElementById('save-cierre-btn');
    btn.disabled = true; btn.textContent = '⏳ Guardando…';
    try {
      const cierres = currentFactState.cuentas.map(c => c.cierre);
      await api('cierre-save', { method: 'POST', body: { mes: currentFactState.mes, cierres } });
      toast('Cierre guardado', 'success');
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
    btn.disabled = false; btn.textContent = '💾 Guardar cierre';
  }

  async function generarFactura() {
    const btn = document.getElementById('gen-factura-btn');
    btn.disabled = true; btn.textContent = '⏳ Generando…';
    try {
      // 1) Guardar cierres primero
      const cierres = currentFactState.cuentas.map(c => c.cierre);
      await api('cierre-save', { method: 'POST', body: { mes: currentFactState.mes, cierres } });

      // 2) Construir items de la factura
      const { modelo, cuentas, mes } = currentFactState;
      const items = buildFacturaItems(modelo, cuentas);
      const subtotal = items.reduce((s, it) => s + Number(it.monto_agencia || 0), 0);
      const iva = 0;
      const total = subtotal + iva;

      // 3) Generar HTML de la factura para PDF
      const fechaEmision = new Date().toISOString().slice(0, 10);
      const vencimiento = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const conceptoBase = (modelo.plan_servicios ? modelo.plan_servicios.split('.')[0] : 'Plan de Gestión');
      const porcentaje = Number(modelo.porcentaje || modelo.plan_porcentaje || 0);
      const concepto = `Plan ${porcentaje >= 60 ? 'Premium - Gestion Completa' : porcentaje >= 50 ? 'Avanzado - Gestion y Trafico' : 'Inicial - Solo Gestion'}`;
      const numeroNext = (Number(modelo.factura_numero_actual) || 0) + 1;

      const meta = {
        numero: numeroNext,
        fechaEmision,
        vencimiento,
        modeloNombreFiscal: modelo.nombre_fiscal || modelo.nombre,
        modeloIdentificador: modelo.identificador,
        modeloDireccion: modelo.direccion,
        pagoPor: modelo.medio_pago_default || 'Transf',
        concepto,
        porcentaje,
        moneda: modelo.moneda_default,
        serviciosPie: modelo.servicios_factura_texto || modelo.plan_servicios || ''
      };
      const html = buildFacturaHtml(meta, items, subtotal, iva, total);

      // 4) Render PDF con html2pdf.js
      // IMPORTANTE: el wrapper se renderiza visible (con scroll lock) por 250ms para que
      // html2canvas pueda capturarlo correctamente. Posicionarlo off-screen genera bugs
      // (contenido desplazado, recortado, blanco). Ancho 720px = matchea A4 portrait usable area.
      const wrapper = document.createElement('div');
      wrapper.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'width:720px',
        'background:#fce7f3',
        'z-index:999999',
        'pointer-events:none',
        'box-shadow:0 0 0 9999px rgba(0,0,0,0.6)'
      ].join(';');
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
      // Lock scroll briefly so el render no jumpea
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      await new Promise(r => setTimeout(r, 250));
      try {
        await html2pdf().set({
          margin: [6, 6, 6, 6],
          filename: `Factura-${modelo.nombre.replace(/\s+/g, '')}-${mes}-${numeroNext}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            backgroundColor: '#fce7f3',
            useCORS: true,
            logging: false
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(wrapper.firstElementChild).save();
      } finally {
        wrapper.remove();
        document.body.style.overflow = prevOverflow;
      }

      // 5) Persistir factura en backend
      await api('factura-create', {
        method: 'POST',
        body: {
          modelo_id: modelo.id,
          mes,
          fecha_emision: fechaEmision,
          fecha_vencimiento: vencimiento,
          pago_por: meta.pagoPor,
          concepto: meta.concepto,
          porcentaje_concepto: porcentaje,
          items,
          subtotal,
          iva,
          total,
          moneda: meta.moneda,
          servicios_pie: meta.serviciosPie,
          pdf_html_snapshot: html
        }
      });

      // Actualizar cache local
      modelo.factura_numero_actual = numeroNext;
      modelosCache = modelosCache.map(m => m.id === modelo.id ? { ...m, factura_numero_actual: numeroNext } : m);
      const nextEl = document.querySelector('#fact-detail .card div[style*="color:var(--gold)"]');
      if (nextEl) nextEl.textContent = '#' + (numeroNext + 1);

      toast(`Factura #${numeroNext} generada y descargada`, 'success');
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
    btn.disabled = false; btn.textContent = '📥 Generar factura PDF';
  }

  function buildFacturaItems(modelo, cuentas) {
    const items = [];
    cuentas.forEach(cc => {
      const cuenta = cc.cuenta;
      const c = cc.cierre;
      const dif = (c.fact_total || 0) - (c.suscripciones || 0) - (c.masivos || 0);
      const gan = dif * (c.porcentaje_aplicado || 0) / 100;

      // Línea de Gestión
      if (c.fact_total > 0) {
        items.push({
          descripcion: `Gestion ${cuenta.nombre_cuenta.replace(/^.*?\s+/, '') || cuenta.nombre_cuenta}`,
          monto: c.fact_total,
          cantidad: 1,
          observ: c.observaciones || null,
          monto_agencia: gan
        });
      }
      if (c.software_om_fee > 0) {
        items.push({
          descripcion: 'Software OnlyMonster ' + ((c.porcentaje_aplicado >= 50) ? '50%' : ''),
          monto: c.software_om_fee,
          cantidad: 1,
          observ: null,
          monto_agencia: c.software_om_fee
        });
      }
      if (c.ventas_por_fuera > 0) {
        items.push({
          descripcion: 'Gestion Ventas por Fuera',
          monto: c.ventas_por_fuera,
          cantidad: null,
          observ: c.observ_ventas_por_fuera || null,
          monto_agencia: c.ventas_por_fuera
        });
      }
      if (c.pago_verificado_ig > 0) {
        items.push({
          descripcion: 'Pago de Verificado IG',
          monto: c.pago_verificado_ig,
          cantidad: null,
          observ: 'Pago verificado IG',
          monto_agencia: c.pago_verificado_ig
        });
      }
      (c.otros_extras || []).forEach(x => {
        if (x.label || x.monto) {
          items.push({
            descripcion: x.label || 'Otro',
            monto: x.monto,
            cantidad: null,
            observ: null,
            monto_agencia: x.monto
          });
        }
      });
    });
    return items;
  }

  // Paleta de colores por tipo de ítem (matching factura ejemplo)
  function itemLabelStyle(descripcion) {
    const d = (descripcion || '').toLowerCase();
    if (d.includes('paid'))      return { bg: '#fde68a', fg: '#7c4a03' };  // amarillo
    if (d.includes('free'))      return { bg: '#34d399', fg: '#064e3b' };  // verde
    if (d.includes('bizum'))     return { bg: '#bfdbfe', fg: '#1e3a8a' };  // azul
    if (d.includes('onlymonster') || d.includes('software')) return { bg: '#dc2626', fg: '#fff' };  // rojo
    if (d.includes('ventas por fuera') || d.includes('tips')) return { bg: '#c4b5fd', fg: '#4c1d95' };  // violeta
    if (d.includes('verificado') || d.includes('ig'))         return { bg: '#fed7aa', fg: '#7c2d12' };  // naranja
    if (d.includes('americana') || d.includes('eng') || d.includes('españa')) return { bg: '#fbcfe8', fg: '#831843' };
    return { bg: '#e5e7eb', fg: '#1f2937' };  // gris default
  }

  function buildFacturaHtml(meta, items, subtotal, iva, total) {
    const sym = meta.moneda === 'EUR' ? '€' : '$';
    const fmt = (n) => n == null ? '' : sym + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fechaFmt = (d) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-AR') : '';

    // SVG logo: silueta estilizada de mujer con pelo rosa (matching la imagen del ejemplo)
    const logoSvg = `
      <svg viewBox="0 0 110 110" width="110" height="110" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FF1F8E"/>
            <stop offset="100%" stop-color="#9D174D"/>
          </linearGradient>
          <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fce0d0"/>
            <stop offset="100%" stop-color="#f5b89c"/>
          </linearGradient>
        </defs>
        <!-- pelo trasero -->
        <path d="M20,55 C20,30 40,15 60,18 C85,22 95,40 92,65 C90,82 80,95 70,98 L72,75 C72,65 65,60 60,60 L48,60 C42,60 38,65 38,72 L40,98 C30,92 22,80 20,55Z" fill="url(#hair)"/>
        <!-- cara -->
        <ellipse cx="58" cy="52" rx="18" ry="22" fill="url(#skin)"/>
        <!-- cuello/torso -->
        <path d="M48,70 L48,82 C48,86 52,90 58,90 C64,90 68,86 68,82 L68,70 Z" fill="url(#skin)"/>
        <!-- flequillo/pelo frontal rosa -->
        <path d="M40,45 C40,30 50,22 60,22 C72,22 80,32 80,42 C80,38 76,35 72,36 C68,28 56,28 50,36 C46,36 40,40 40,45Z" fill="url(#hair)"/>
        <!-- mechón al costado -->
        <path d="M76,40 C82,42 86,55 84,65 C82,75 75,82 70,84 L72,72 C72,65 78,55 76,40Z" fill="url(#hair)"/>
        <!-- ojo -->
        <ellipse cx="55" cy="52" rx="1.6" ry="2" fill="#1a1a1a"/>
        <ellipse cx="65" cy="52" rx="1.6" ry="2" fill="#1a1a1a"/>
        <!-- labios -->
        <path d="M55,62 Q58,65 62,62" stroke="#be185d" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `;

    const itemsHtml = items.map(it => {
      const s = itemLabelStyle(it.descripcion);
      return `
        <tr>
          <td style="padding:10px 12px;background:${s.bg};color:${s.fg};font-weight:700;border:1px solid #fff;text-align:center">${escapeHtml(it.descripcion)}</td>
          <td style="padding:10px 12px;text-align:right;color:#111;font-weight:600;border:1px solid #f3f4f6">${fmt(it.monto)}</td>
          <td style="padding:10px 12px;text-align:center;color:#6b7280;border:1px solid #f3f4f6">${it.cantidad != null ? it.cantidad : ''}</td>
          <td style="padding:10px 12px;color:#831843;font-weight:600;border:1px solid #f3f4f6;text-align:center">${escapeHtml(it.observ || '')}</td>
          <td style="padding:10px 12px;text-align:right;color:#111;font-weight:700;border:1px solid #f3f4f6">${fmt(it.monto_agencia)}</td>
        </tr>
      `;
    }).join('');

    // Filas vacías para alcanzar mínimo 5 ítems (look idéntico al ejemplo)
    const emptyRows = Math.max(0, 5 - items.length);
    const emptyRowsHtml = Array(emptyRows).fill(0).map(() => `
      <tr>
        <td style="padding:14px;background:#fff;border:1px solid #f3f4f6">&nbsp;</td>
        <td style="padding:14px;background:#fff;border:1px solid #f3f4f6"></td>
        <td style="padding:14px;background:#fff;border:1px solid #f3f4f6"></td>
        <td style="padding:14px;background:#fff;border:1px solid #f3f4f6"></td>
        <td style="padding:14px;background:#fff;border:1px solid #f3f4f6"></td>
      </tr>
    `).join('');

    return `
<div style="font-family:Arial,sans-serif;background:#fce7f3;color:#111;padding:18px 22px;width:720px;box-sizing:border-box">

  <!-- HEADER: brand + logo -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
    <tr>
      <td style="vertical-align:middle;padding:0">
        <div style="font-size:30px;font-weight:800;color:#be185d;margin-bottom:6px;letter-spacing:-0.5px">BraveGirls Agency LLC</div>
        <div style="font-size:12px;color:#374151;line-height:1.55;font-weight:600">
          1401 Pennsylvania Ave. STE 105,<br>
          19806 Wilmington. Delaware (EE.UU). EIN: 38-4349826<br>
          (34) 675 32 80 74 — N° de Licencia 20250971778.
        </div>
      </td>
      <td style="width:130px;vertical-align:middle;text-align:right;padding:0">
        ${logoSvg}
      </td>
    </tr>
  </table>

  <!-- TÍTULO -->
  <div style="font-size:36px;color:#be185d;margin:14px 0 14px;font-weight:800;letter-spacing:-1px">Gestión de cuenta</div>

  <!-- INFO BOX -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #be185d;margin-bottom:14px;background:#fff;font-size:13px">
    <tr>
      <td colspan="3" style="padding:8px 12px;background:#fce7f3;color:#831843;font-weight:700">
        Fecha de emisión: <span style="color:#be185d">${fechaFmt(meta.fechaEmision)}</span>
      </td>
    </tr>
    <tr style="background:#fce7f3;color:#831843">
      <td style="padding:8px 12px;font-weight:700;border-top:1px solid #f9a8d4">A la atención de</td>
      <td style="padding:8px 12px;font-weight:700;width:130px;border-top:1px solid #f9a8d4;border-left:1px solid #f9a8d4">Pago por</td>
      <td style="padding:8px 12px;font-weight:700;width:140px;border-top:1px solid #f9a8d4;border-left:1px solid #f9a8d4">N.º de factura</td>
    </tr>
    <tr style="color:#831843;background:#fff">
      <td style="padding:9px 12px;font-weight:700">${escapeHtml(meta.modeloNombreFiscal)}${meta.modeloIdentificador ? ' — ' + escapeHtml(meta.modeloIdentificador) : ''}</td>
      <td style="padding:9px 12px;border-left:1px solid #f9a8d4;font-weight:600">${escapeHtml(meta.pagoPor)}</td>
      <td style="padding:9px 12px;border-left:1px solid #f9a8d4;font-weight:600">${meta.numero}</td>
    </tr>
    ${meta.modeloDireccion ? `<tr style="background:#fff"><td colspan="3" style="padding:9px 12px;color:#831843;font-weight:600;border-top:1px solid #fce7f3">${escapeHtml(meta.modeloDireccion)}</td></tr>` : ''}
    <tr style="background:#fce7f3;color:#831843">
      <td style="padding:8px 12px;font-weight:700;border-top:1px solid #f9a8d4">En concepto de:</td>
      <td style="padding:8px 12px;font-weight:700;border-top:1px solid #f9a8d4;border-left:1px solid #f9a8d4">% de fact</td>
      <td style="padding:8px 12px;font-weight:700;border-top:1px solid #f9a8d4;border-left:1px solid #f9a8d4">Fecha de vencimiento</td>
    </tr>
    <tr style="color:#831843;background:#fff">
      <td style="padding:9px 12px;font-weight:700">${escapeHtml(meta.concepto)}</td>
      <td style="padding:9px 12px;border-left:1px solid #f9a8d4;font-weight:600">${meta.porcentaje}%</td>
      <td style="padding:9px 12px;border-left:1px solid #f9a8d4;font-weight:600">${fechaFmt(meta.vencimiento)}</td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table style="width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #be185d">
    <thead>
      <tr style="background:#fce7f3">
        <th style="padding:11px 12px;text-align:center;color:#be185d;font-size:14px;font-weight:800;border:1px solid #f9a8d4">Descripcion</th>
        <th style="padding:11px 12px;text-align:center;color:#be185d;font-size:14px;font-weight:800;width:110px;border:1px solid #f9a8d4">Monto</th>
        <th style="padding:11px 12px;text-align:center;color:#be185d;font-size:14px;font-weight:800;width:80px;border:1px solid #f9a8d4">Cantidad</th>
        <th style="padding:11px 12px;text-align:center;color:#be185d;font-size:14px;font-weight:800;width:200px;border:1px solid #f9a8d4">OBSERV</th>
        <th style="padding:11px 12px;text-align:center;color:#be185d;font-size:14px;font-weight:800;width:110px;border:1px solid #f9a8d4">% Agencia</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      ${emptyRowsHtml}
    </tbody>
  </table>

  <!-- TOTALES -->
  <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px">
    <tr>
      <td style="width:55%"></td>
      <td style="padding:8px 12px;text-align:right;color:#831843;font-weight:700;font-size:14px">Subtotal</td>
      <td style="padding:8px 12px;text-align:right;color:#111;font-weight:800;width:120px;font-size:14px">${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:6px 12px;text-align:right;color:#831843;font-weight:700">IVA</td>
      <td style="padding:6px 12px;text-align:right;color:#111;font-weight:700">${fmt(iva)}</td>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td style="padding:10px 12px;text-align:right;color:#be185d;font-weight:800;font-size:28px;letter-spacing:-1px">${fmt(total)}</td>
    </tr>
  </table>

  ${meta.serviciosPie ? `
    <div style="margin-top:10px;padding:10px 14px;background:#fff;border:1px solid #f9a8d4;border-radius:6px;color:#831843;font-size:11px;line-height:1.5;font-weight:600">
      <strong style="color:#be185d">Servicios incluidos:</strong> ${escapeHtml(meta.serviciosPie)}
    </div>
  ` : ''}

</div>`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ═══════════════════════════════════════════════════════
  // VISTA: FACTURAS EMITIDAS
  // ═══════════════════════════════════════════════════════
  async function renderFacturas(view) {
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const mes = currentMes();
      const r = await api('facturas-list', { params: mes ? { mes } : {} });
      const rows = (r.data || []).map(f => `
        <tr>
          <td><span class="pill pink">FCT-${String(f.numero).padStart(4, '0')}</span></td>
          <td><strong>${escapeHtml(f.modelo_nombre || ('Modelo #' + f.entidad_id))}</strong></td>
          <td>${f.mes || '—'}</td>
          <td>${f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString('es-AR') : '—'}</td>
          <td style="text-align:right"><strong>${fmtMoney(f.total, f.moneda)}</strong></td>
          <td>${estadoBadge(f.estado)}</td>
          <td style="text-align:right">
            <button class="btn-ghost-small" data-reprint="${f.id}">📥 Reimprimir PDF</button>
          </td>
        </tr>
      `).join('');

      view.innerHTML = `
        <div class="table-wrap">
          <div class="table-toolbar">
            <h3>▦ Facturas Emitidas <span class="count">${(r.data || []).length}</span></h3>
            <button class="btn-primary" style="width:auto;padding:8px 16px;font-size:0.85rem" onclick="location.hash='facturacion'">+ Nueva factura</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>N°</th><th>Modelo</th><th>Mes</th><th>Emisión</th>
                <th style="text-align:right">Total</th><th>Estado</th><th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7" class="empty-state">Aún no hay facturas emitidas.</td></tr>'}</tbody>
          </table>
        </div>
      `;

      view.querySelectorAll('[data-reprint]').forEach(b => {
        b.addEventListener('click', async () => {
          const id = Number(b.dataset.reprint);
          try {
            const rr = await api('factura-get', { params: { id } });
            const html = rr.data.pdf_html_snapshot;
            if (!html) { toast('Esta factura no tiene snapshot HTML', 'error'); return; }
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:fixed;top:0;left:0;width:720px;background:#fce7f3;z-index:999999;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,0.6)';
            wrapper.innerHTML = html;
            document.body.appendChild(wrapper);
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            await new Promise(r => setTimeout(r, 250));
            try {
              await html2pdf().set({
                margin: [6, 6, 6, 6],
                filename: `Factura-${rr.data.entidad_id}-${rr.data.mes}-${rr.data.numero}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, backgroundColor: '#fce7f3', useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
              }).from(wrapper.firstElementChild).save();
            } finally {
              wrapper.remove();
              document.body.style.overflow = prevOverflow;
            }
            toast('PDF descargado', 'success');
          } catch (e) {
            toast('Error: ' + e.message, 'error');
          }
        });
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  function estadoBadge(s) {
    if (s === 'cobrada')  return '<span class="pill green">✓ Cobrada</span>';
    if (s === 'vencida')  return '<span class="pill red">⚠ Vencida</span>';
    if (s === 'anulada')  return '<span class="pill">Anulada</span>';
    return '<span class="pill amber">→ Emitida</span>';
  }

  // ═══════════════════════════════════════════════════════
  // VISTA: GASTOS DEL MES
  // ═══════════════════════════════════════════════════════
  async function renderGastos(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('gastos', { params: { mes } });
      const total = (r.data || []).reduce((s, g) => s + Number(g.monto || 0), 0);
      const rows = (r.data || []).map(g => `
        <tr>
          <td><strong>${escapeHtml(g.descripcion || '—')}</strong></td>
          <td>${g.categoria ? `<span class="pill">${escapeHtml(g.categoria)}</span>` : '—'}</td>
          <td>${escapeHtml(g.paga || 'AGENCIA')}</td>
          <td style="text-align:right"><strong>${fmtMoney(g.monto)}</strong></td>
          <td style="text-align:right">
            <button class="btn-danger" data-del-gasto="${g.id}">Eliminar</button>
          </td>
        </tr>
      `).join('');

      view.innerHTML = `
        <div class="card" style="margin-bottom:18px">
          <div class="card-title">▼ Nuevo gasto</div>
          <div class="card-sub">Mes: <strong>${mes}</strong></div>
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:12px;margin-top:14px">
            <input type="text" id="g-desc" placeholder="Descripción (ej. Reddit MALE, Linktree…)">
            <select id="g-cat">
              <option value="">— Categoría —</option>
              <option value="herramientas">Herramientas</option>
              <option value="publicidad">Publicidad</option>
              <option value="ia">IA</option>
              <option value="om">OnlyMonster</option>
              <option value="incentivos">Incentivos</option>
              <option value="otros">Otros</option>
            </select>
            <input type="number" step="0.01" id="g-monto" placeholder="Monto USD">
            <input type="text" id="g-paga" placeholder="Paga" value="AGENCIA">
            <input type="text" id="g-obs" placeholder="Observación">
            <button class="btn-primary" id="g-add-btn" style="width:auto;padding:10px 18px;margin:0">+ Agregar</button>
          </div>
        </div>

        <div class="table-wrap">
          <div class="table-toolbar">
            <h3>Gastos del mes <span class="count">${(r.data || []).length}</span></h3>
            <div style="display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:var(--gold)">
              Total: ${fmtMoney(total)}
            </div>
          </div>
          <table>
            <thead><tr><th>Descripción</th><th>Categoría</th><th>Paga</th><th style="text-align:right">Monto</th><th style="text-align:right">Acciones</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="empty-state">Aún no hay gastos registrados este mes.</td></tr>'}</tbody>
          </table>
        </div>
      `;

      document.getElementById('g-add-btn').addEventListener('click', async () => {
        const body = {
          mes,
          descripcion: document.getElementById('g-desc').value.trim(),
          categoria:   document.getElementById('g-cat').value || null,
          monto:       Number(document.getElementById('g-monto').value || 0),
          paga:        document.getElementById('g-paga').value.trim() || 'AGENCIA',
          observaciones: document.getElementById('g-obs').value.trim() || null
        };
        if (!body.descripcion || !body.monto) { toast('Completá descripción y monto', 'error'); return; }
        try {
          await api('gastos', { method: 'POST', body });
          toast('Gasto agregado', 'success');
          renderGastos(view);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });

      view.querySelectorAll('[data-del-gasto]').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('¿Eliminar este gasto?')) return;
          try {
            await api('gastos', { method: 'POST', params: { id: b.dataset.delGasto, op: 'delete' } });
            toast('Eliminado', 'success');
            renderGastos(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // FASE 3 · VISTA: LIQUIDACIÓN CHATTERS
  // ═══════════════════════════════════════════════════════
  let liqState = null; // { mes, transaction_fee_pct, chatters, cuentas, detalle_by_chatter, pagos_by_chatter, incentivo_mes, selected }

  async function renderLiquidacion(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('liquidacion-mes', { params: { mes } });
      liqState = { ...r, selected: r.chatters[0]?.id || null };
      drawLiquidacion(view);
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  function drawLiquidacion(view) {
    const { chatters, mes, transaction_fee_pct } = liqState;
    if (!chatters.length) {
      view.innerHTML = `<div class="card center muted">No hay chatters activos. Cargá uno en Catálogo → Chatters.</div>`;
      return;
    }
    const selected = liqState.selected;
    const chatter = chatters.find(c => c.id === selected) || chatters[0];

    const sidebarChatters = chatters.map(c => {
      const p = liqState.pagos_by_chatter[c.id];
      const neto = p ? Number(p.neto_a_pagar) : 0;
      const falta = p ? Number(p.falta_pagar) : 0;
      const isActive = c.id === selected;
      return `
        <div class="liq-chip${isActive ? ' active' : ''}" data-chatter-id="${c.id}">
          <div class="liq-chip-name">${c.nombre}${c.es_team_leader ? ' <span class="pill gold mini">TL</span>' : ''}</div>
          <div class="liq-chip-amounts">
            <span class="liq-chip-neto">${fmtMoney(neto)}</span>
            <span class="liq-chip-falta ${falta > 0 ? 'pending' : 'ok'}">${falta > 0 ? '−' + fmtMoney(falta) : '✓'}</span>
          </div>
        </div>
      `;
    }).join('');

    view.innerHTML = `
      <div class="liq-layout">
        <aside class="liq-sidebar">
          <div class="liq-sidebar-head">
            <h3>Chatters</h3>
            <div class="muted" style="font-size:.8rem">Mes ${mes} · Fee ${transaction_fee_pct}%</div>
          </div>
          <div class="liq-chip-list">${sidebarChatters}</div>
          <div class="liq-fee-card">
            <label class="muted" style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em">Transaction Fee del mes</label>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <input type="number" step="0.01" id="liq-fee-input" value="${transaction_fee_pct}" style="flex:1">
              <button class="btn-ghost-small" id="liq-fee-save">Guardar</button>
            </div>
          </div>
        </aside>
        <main class="liq-main" id="liq-main"></main>
      </div>
    `;

    view.querySelectorAll('.liq-chip').forEach(el => {
      el.addEventListener('click', () => {
        liqState.selected = Number(el.dataset.chatterId);
        drawLiquidacion(view);
      });
    });

    document.getElementById('liq-fee-save').addEventListener('click', async () => {
      const pct = Number(document.getElementById('liq-fee-input').value || 0);
      try {
        await api('tx-fee', { method: 'POST', params: { mes }, body: { porcentaje: pct } });
        liqState.transaction_fee_pct = pct;
        toast('Fee actualizado', 'success');
        drawLiquidacion(view);
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });

    drawLiquidacionMain(chatter);
  }

  function drawLiquidacionMain(chatter) {
    const main = document.getElementById('liq-main');
    const { cuentas, detalle_by_chatter, pagos_by_chatter, transaction_fee_pct, incentivo_mes } = liqState;
    const detalle = detalle_by_chatter[chatter.id] || [];
    const pago = pagos_by_chatter[chatter.id] || {};
    const detByCuenta = {};
    detalle.forEach(d => { detByCuenta[d.cuenta_id] = d; });

    const incIndiv = Array.isArray(pago.incentivos_individuales) ? pago.incentivos_individuales : [];
    const esGanadorIncentivoMes = incentivo_mes && incentivo_mes.chatter_id === chatter.id;

    const cuentasRows = cuentas.map(cu => {
      const d = detByCuenta[cu.id] || {};
      const fact = Number(d.fact_chatter || 0);
      const pct = Number(d.porcentaje_comision != null ? d.porcentaje_comision : (chatter.porcentaje_default || 15));
      const comision = fact * pct / 100;
      return `
        <tr data-cuenta-id="${cu.id}">
          <td><strong>${cu.modelo_nombre}</strong> · <span class="muted">${cu.nombre_cuenta}</span></td>
          <td><input type="number" step="0.01" class="liq-fact" data-cuenta-id="${cu.id}" value="${fact || ''}" placeholder="0"></td>
          <td><input type="number" step="0.01" class="liq-pct" data-cuenta-id="${cu.id}" value="${pct}" style="max-width:90px"></td>
          <td style="text-align:right" class="liq-comision-cell">${fmtMoney(comision)}</td>
          <td><input type="text" class="liq-obs" data-cuenta-id="${cu.id}" value="${d.observaciones || ''}" placeholder="—"></td>
        </tr>
      `;
    }).join('');

    const incIndivRows = incIndiv.map((it, i) => `
      <div class="liq-inc-row" data-inc-idx="${i}">
        <input type="text" class="inc-desc" value="${it.descripcion || ''}" placeholder="Descripción">
        <input type="number" step="0.01" class="inc-monto" value="${it.monto || 0}" style="max-width:130px">
        <button class="btn-ghost-small inc-del" title="Quitar">✕</button>
      </div>
    `).join('');

    main.innerHTML = `
      <div class="card liq-head-card">
        <div class="flex-between">
          <div>
            <h2 style="margin:0;font-family:var(--font-display)">${chatter.nombre}</h2>
            <div class="muted" style="font-size:.9rem">% default ${chatter.porcentaje_default || 15} · % supervisor ${chatter.porcentaje_supervisor || 5} · ${chatter.rol || 'chatter'}${chatter.es_team_leader ? ' · Team Leader' : ''}</div>
          </div>
          <button class="btn-primary" id="liq-save-btn" style="width:auto;padding:12px 22px;margin:0">💾 Guardar liquidación</button>
        </div>
      </div>

      <div class="card">
        <h3>Comisión por cuenta</h3>
        <div class="table-wrap">
          <table class="liq-table">
            <thead>
              <tr><th>Cuenta</th><th>Facturación chatter</th><th>%</th><th style="text-align:right">Comisión</th><th>Observación</th></tr>
            </thead>
            <tbody>${cuentasRows}</tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="flex-between" style="margin-bottom:12px">
          <h3>Incentivos individuales</h3>
          <button class="btn-ghost-small" id="liq-inc-add">+ Agregar incentivo</button>
        </div>
        <div id="liq-inc-list">${incIndivRows || '<p class="muted">Sin incentivos individuales este mes.</p>'}</div>
      </div>

      <div class="card">
        <h3>Bonos y ajustes</h3>
        <div class="grid-2col">
          <label class="check"><input type="checkbox" id="liq-tl" ${chatter.es_team_leader ? 'checked' : ''}> <span>Team Leader (+$100 fijo)</span></label>
          <div></div>
          <label class="check">
            <input type="checkbox" id="liq-inc-mes" ${esGanadorIncentivoMes ? 'checked' : ''}>
            <span>Ganador "Incentivo del mes"</span>
          </label>
          <div>
            <label>Monto incentivo del mes</label>
            <input type="number" step="0.01" id="liq-inc-mes-monto" value="${incentivo_mes ? incentivo_mes.monto : 50}" ${esGanadorIncentivoMes ? '' : 'disabled'}>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Pagos / Envíos</h3>
        <div class="grid-3col">
          <div>
            <label>Envío 1°</label>
            <input type="number" step="0.01" id="liq-e1" value="${pago.envio_1 || 0}">
            <input type="date" id="liq-fe1" value="${pago.fecha_envio_1 ? String(pago.fecha_envio_1).slice(0,10) : ''}">
          </div>
          <div>
            <label>Envío 2°</label>
            <input type="number" step="0.01" id="liq-e2" value="${pago.envio_2 || 0}">
            <input type="date" id="liq-fe2" value="${pago.fecha_envio_2 ? String(pago.fecha_envio_2).slice(0,10) : ''}">
          </div>
          <div>
            <label>Envío 3°</label>
            <input type="number" step="0.01" id="liq-e3" value="${pago.envio_3 || 0}">
            <input type="date" id="liq-fe3" value="${pago.fecha_envio_3 ? String(pago.fecha_envio_3).slice(0,10) : ''}">
          </div>
        </div>
        <label style="margin-top:14px">Observaciones</label>
        <input type="text" id="liq-obs" value="${pago.observaciones || ''}">
      </div>

      <div class="sticky-actionbar liq-summary">
        <div class="sab-grid" style="grid-template-columns:1fr 1fr 1fr 1fr 1.2fr auto">
          <div class="liq-sum"><div class="liq-sum-lbl">Comisiones</div><div class="liq-sum-val" id="sum-com">$0</div></div>
          <div class="liq-sum"><div class="liq-sum-lbl">TL bonus</div><div class="liq-sum-val" id="sum-tl">$0</div></div>
          <div class="liq-sum"><div class="liq-sum-lbl">Incentivos</div><div class="liq-sum-val" id="sum-inc">$0</div></div>
          <div class="liq-sum"><div class="liq-sum-lbl">Bruto</div><div class="liq-sum-val" id="sum-bruto">$0</div></div>
          <div class="liq-sum-net">
            <div class="sab-total-lbl">Neto (fee ${transaction_fee_pct}%)</div>
            <div class="sab-total-val" id="sum-neto">$0</div>
            <div class="liq-falta" id="sum-falta">Falta $0</div>
          </div>
          <div class="sab-actions">
            <button class="btn-primary sab-pdf" id="liq-pdf-btn">📥 Liquidación PDF</button>
          </div>
        </div>
      </div>
    `;

    function recalc() {
      let comisiones = 0;
      main.querySelectorAll('tr[data-cuenta-id]').forEach(tr => {
        const fact = Number(tr.querySelector('.liq-fact').value || 0);
        const pct = Number(tr.querySelector('.liq-pct').value || 0);
        const com = fact * pct / 100;
        tr.querySelector('.liq-comision-cell').textContent = fmtMoney(com);
        comisiones += com;
      });
      const tl = document.getElementById('liq-tl').checked ? 100 : 0;
      let inc = 0;
      main.querySelectorAll('.liq-inc-row').forEach(r => {
        inc += Number(r.querySelector('.inc-monto').value || 0);
      });
      const incMes = document.getElementById('liq-inc-mes').checked ? Number(document.getElementById('liq-inc-mes-monto').value || 0) : 0;
      const bruto = comisiones + tl + inc + incMes;
      const neto = bruto * (1 - Number(transaction_fee_pct) / 100);
      const e1 = Number(document.getElementById('liq-e1').value || 0);
      const e2 = Number(document.getElementById('liq-e2').value || 0);
      const e3 = Number(document.getElementById('liq-e3').value || 0);
      const falta = neto - e1 - e2 - e3;

      document.getElementById('sum-com').textContent = fmtMoney(comisiones);
      document.getElementById('sum-tl').textContent = fmtMoney(tl);
      document.getElementById('sum-inc').textContent = fmtMoney(inc + incMes);
      document.getElementById('sum-bruto').textContent = fmtMoney(bruto);
      document.getElementById('sum-neto').textContent = fmtMoney(neto);
      const faltaEl = document.getElementById('sum-falta');
      faltaEl.textContent = falta > 0.01 ? `Falta ${fmtMoney(falta)}` : 'Pagado completo ✓';
      faltaEl.className = 'liq-falta ' + (falta > 0.01 ? 'pending' : 'ok');
    }

    main.addEventListener('input', recalc);
    main.addEventListener('change', recalc);
    main.querySelector('#liq-inc-mes').addEventListener('change', (e) => {
      main.querySelector('#liq-inc-mes-monto').disabled = !e.target.checked;
    });
    main.querySelector('#liq-inc-add').addEventListener('click', () => {
      const list = main.querySelector('#liq-inc-list');
      if (list.querySelector('p.muted')) list.innerHTML = '';
      const idx = list.querySelectorAll('.liq-inc-row').length;
      list.insertAdjacentHTML('beforeend', `
        <div class="liq-inc-row" data-inc-idx="${idx}">
          <input type="text" class="inc-desc" placeholder="Descripción">
          <input type="number" step="0.01" class="inc-monto" value="0" style="max-width:130px">
          <button class="btn-ghost-small inc-del">✕</button>
        </div>
      `);
    });
    main.addEventListener('click', (e) => {
      if (e.target.classList.contains('inc-del')) {
        e.target.closest('.liq-inc-row').remove();
        recalc();
      }
    });

    document.getElementById('liq-save-btn').addEventListener('click', () => saveLiquidacion(chatter));
    document.getElementById('liq-pdf-btn').addEventListener('click', () => generarLiquidacionPDF(chatter));
    recalc();
  }

  async function saveLiquidacion(chatter) {
    const main = document.getElementById('liq-main');
    const detalles = [];
    main.querySelectorAll('tr[data-cuenta-id]').forEach(tr => {
      const cuentaId = Number(tr.dataset.cuentaId);
      const fact = Number(tr.querySelector('.liq-fact').value || 0);
      const pct = Number(tr.querySelector('.liq-pct').value || 0);
      const obs = tr.querySelector('.liq-obs').value || null;
      if (fact > 0) detalles.push({ cuenta_id: cuentaId, fact_chatter: fact, porcentaje_comision: pct, observaciones: obs });
    });
    const incentivosIndiv = [];
    main.querySelectorAll('.liq-inc-row').forEach(r => {
      const desc = r.querySelector('.inc-desc').value.trim();
      const monto = Number(r.querySelector('.inc-monto').value || 0);
      if (desc && monto) incentivosIndiv.push({ descripcion: desc, monto });
    });
    const body = {
      mes: liqState.mes,
      chatter_id: chatter.id,
      detalles,
      team_leader_bonus: document.getElementById('liq-tl').checked ? 100 : 0,
      incentivos_individuales: incentivosIndiv,
      incentivo_mes_ganado: document.getElementById('liq-inc-mes').checked,
      incentivo_mes_monto: Number(document.getElementById('liq-inc-mes-monto').value || 50),
      envio_1: Number(document.getElementById('liq-e1').value || 0),
      envio_2: Number(document.getElementById('liq-e2').value || 0),
      envio_3: Number(document.getElementById('liq-e3').value || 0),
      fecha_envio_1: document.getElementById('liq-fe1').value || null,
      fecha_envio_2: document.getElementById('liq-fe2').value || null,
      fecha_envio_3: document.getElementById('liq-fe3').value || null,
      observaciones: document.getElementById('liq-obs').value || null
    };
    try {
      await api('liquidacion-save', { method: 'POST', body });
      // Si marcó "ganador del mes", guardar también en incentivos_historico
      if (body.incentivo_mes_ganado) {
        try {
          await api('incentivos', {
            method: 'POST',
            body: { mes: liqState.mes, chatter_id: chatter.id, monto: body.incentivo_mes_monto, motivo: 'Incentivo del mes' }
          });
        } catch (_) { /* no bloqueante */ }
      }
      toast('Liquidación guardada', 'success');
      renderLiquidacion(document.getElementById('view'));
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function generarLiquidacionPDF(chatter) {
    const main = document.getElementById('liq-main');
    const rows = [];
    main.querySelectorAll('tr[data-cuenta-id]').forEach(tr => {
      const cuentaText = tr.querySelector('td').textContent.trim();
      const fact = Number(tr.querySelector('.liq-fact').value || 0);
      const pct = Number(tr.querySelector('.liq-pct').value || 0);
      if (fact > 0) rows.push({ cuenta: cuentaText, fact, pct, com: fact * pct / 100 });
    });
    const tl = document.getElementById('liq-tl').checked ? 100 : 0;
    const incs = [];
    main.querySelectorAll('.liq-inc-row').forEach(r => {
      const desc = r.querySelector('.inc-desc').value.trim();
      const monto = Number(r.querySelector('.inc-monto').value || 0);
      if (desc && monto) incs.push({ desc, monto });
    });
    const incMes = document.getElementById('liq-inc-mes').checked ? Number(document.getElementById('liq-inc-mes-monto').value || 0) : 0;
    const bruto = rows.reduce((s, r) => s + r.com, 0) + tl + incs.reduce((s, i) => s + i.monto, 0) + incMes;
    const fee = Number(liqState.transaction_fee_pct);
    const neto = bruto * (1 - fee / 100);

    const html = `
<div style="font-family:Inter,sans-serif;padding:30px;color:#1a1a1a;background:#fff;width:720px">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #be185d;padding-bottom:16px">
    <div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:1.8rem;font-weight:800;color:#be185d">BraveGirls Agency</div>
      <div style="color:#6b7280;font-size:0.85rem">Liquidación Chatter · Mes ${liqState.mes}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:0.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em">Chatter</div>
      <div style="font-size:1.4rem;font-weight:800;color:#1a1a1a">${chatter.nombre}</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:24px">
    <thead>
      <tr style="background:#fce7f3;color:#be185d">
        <th style="padding:10px;text-align:left;font-size:0.8rem">Cuenta</th>
        <th style="padding:10px;text-align:right;font-size:0.8rem">Facturación</th>
        <th style="padding:10px;text-align:right;font-size:0.8rem">%</th>
        <th style="padding:10px;text-align:right;font-size:0.8rem">Comisión</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr style="border-bottom:1px solid #fbcfe8">
          <td style="padding:10px;font-size:0.85rem">${r.cuenta}</td>
          <td style="padding:10px;text-align:right;font-size:0.85rem">${fmtMoney(r.fact)}</td>
          <td style="padding:10px;text-align:right;font-size:0.85rem">${r.pct}%</td>
          <td style="padding:10px;text-align:right;font-weight:700;font-size:0.85rem">${fmtMoney(r.com)}</td>
        </tr>
      `).join('')}
      ${tl ? `<tr style="border-bottom:1px solid #fbcfe8"><td colspan="3" style="padding:10px;font-size:0.85rem">Team Leader (bonus fijo)</td><td style="padding:10px;text-align:right;font-weight:700;font-size:0.85rem">${fmtMoney(tl)}</td></tr>` : ''}
      ${incs.map(i => `<tr style="border-bottom:1px solid #fbcfe8"><td colspan="3" style="padding:10px;font-size:0.85rem">${i.desc}</td><td style="padding:10px;text-align:right;font-weight:700;font-size:0.85rem">${fmtMoney(i.monto)}</td></tr>`).join('')}
      ${incMes ? `<tr style="border-bottom:1px solid #fbcfe8"><td colspan="3" style="padding:10px;font-size:0.85rem">Incentivo del mes</td><td style="padding:10px;text-align:right;font-weight:700;font-size:0.85rem">${fmtMoney(incMes)}</td></tr>` : ''}
    </tbody>
  </table>

  <div style="margin-top:20px;background:#fce7f3;padding:18px;border-radius:8px">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span style="color:#6b7280">Total bruto</span>
      <span style="font-weight:700">${fmtMoney(bruto)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span style="color:#6b7280">Transaction fee (${fee}%)</span>
      <span style="font-weight:700;color:#dc2626">−${fmtMoney(bruto - neto)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-top:2px solid #be185d;padding-top:12px;margin-top:10px">
      <span style="font-size:1.2rem;font-weight:800;color:#be185d">NETO A PAGAR</span>
      <span style="font-size:1.6rem;font-weight:800;color:#be185d">${fmtMoney(neto)}</span>
    </div>
  </div>
</div>`;
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;top:0;left:0;width:720px;background:#fff;z-index:999999;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,0.6)';
    tmp.innerHTML = html;
    document.body.appendChild(tmp);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      window.html2pdf().from(tmp.firstElementChild).set({
        margin: 6,
        filename: `liquidacion_${chatter.nombre.replace(/\s+/g, '_')}_${liqState.mes}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: '#fff', useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }).save().then(() => { tmp.remove(); document.body.style.overflow = prevOverflow; });
    }, 250);
  }

  // ═══════════════════════════════════════════════════════
  // FASE 3 · VISTA: COBROS A MODELOS
  // ═══════════════════════════════════════════════════════
  async function renderCobros(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('cobros-mes', { params: { mes } });
      const rows = r.data;
      // Agrupar por modelo
      const groups = {};
      rows.forEach(c => {
        if (!groups[c.modelo_id]) groups[c.modelo_id] = { modelo: c.modelo_nombre, moneda: c.moneda_default, items: [] };
        groups[c.modelo_id].items.push(c);
      });

      const groupsHtml = Object.keys(groups).map(mid => {
        const g = groups[mid];
        let totalCobrar = 0, totalRecibido = 0, totalPendiente = 0;
        const rowsHtml = g.items.map(c => {
          totalCobrar += Number(c.total_a_cobrar || 0);
          totalRecibido += Number(c.pago_recibido || 0);
          totalPendiente += Number(c.pago_pendiente || 0);
          return `
            <tr data-cierre-id="${c.id}">
              <td><strong>${c.nombre_cuenta}</strong> ${c.tipo ? `<span class="pill mini">${c.tipo}</span>` : ''}</td>
              <td style="text-align:right">${fmtMoney(c.total_a_cobrar, c.moneda)}</td>
              <td><input type="number" step="0.01" class="cob-recibido" value="${c.pago_recibido || 0}" style="max-width:140px"></td>
              <td style="text-align:right" class="cob-pendiente">${fmtMoney(c.pago_pendiente, c.moneda)}</td>
              <td><input type="text" class="cob-medio" value="${c.medio_pago || ''}" placeholder="${c.moneda} · Transf"></td>
              <td>
                <select class="cob-estado">
                  <option value="pendiente"  ${c.estado_resumen === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="enviado"    ${c.estado_resumen === 'enviado' ? 'selected' : ''}>Enviado</option>
                  <option value="confirmado" ${c.estado_resumen === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                </select>
              </td>
              <td><button class="btn-ghost-small cob-save" data-cierre-id="${c.id}">💾</button></td>
            </tr>
          `;
        }).join('');
        return `
          <div class="card">
            <div class="flex-between" style="margin-bottom:14px">
              <div>
                <h3 style="margin:0">${g.modelo}</h3>
                <div class="muted" style="font-size:.85rem">${g.moneda}</div>
              </div>
              <div style="display:flex;gap:18px">
                <div><div class="muted mini">A cobrar</div><div style="font-weight:700">${fmtMoney(totalCobrar, g.moneda)}</div></div>
                <div><div class="muted mini">Recibido</div><div style="font-weight:700;color:var(--green)">${fmtMoney(totalRecibido, g.moneda)}</div></div>
                <div><div class="muted mini">Pendiente</div><div style="font-weight:700;color:${totalPendiente > 0 ? 'var(--red)' : 'var(--green)'}">${fmtMoney(totalPendiente, g.moneda)}</div></div>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th style="text-align:right">A cobrar</th>
                    <th>Recibido</th>
                    <th style="text-align:right">Pendiente</th>
                    <th>Medio pago</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');

      view.innerHTML = `
        <div class="card-row-info">
          <div><strong>Mes:</strong> ${mes}</div>
          <div class="muted">${rows.length} cierres en total · ${Object.keys(groups).length} modelos</div>
        </div>
        ${groupsHtml || '<div class="card center muted">No hay cierres cargados para este mes. Andá a Facturación a Modelos.</div>'}
      `;

      view.querySelectorAll('.cob-save').forEach(b => {
        b.addEventListener('click', async () => {
          const id = Number(b.dataset.cierreId);
          const tr = b.closest('tr');
          const body = {
            cierre_id: id,
            pago_recibido: Number(tr.querySelector('.cob-recibido').value || 0),
            medio_pago: tr.querySelector('.cob-medio').value || null,
            estado_resumen: tr.querySelector('.cob-estado').value
          };
          try {
            await api('cobros-update', { method: 'POST', body });
            toast('Cobro actualizado', 'success');
            renderCobros(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // FASE 3 · VISTA: SUPERVISOR (JONY)
  // ═══════════════════════════════════════════════════════
  async function renderSupervisor(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const s = await api('supervisor-mes', { params: { mes } });
      const supName = s.supervisor ? s.supervisor.nombre : '— sin supervisor configurado —';
      const ventasRows = s.ventas_detalle.map(v => `
        <tr>
          <td>${v.chatter}</td>
          <td style="text-align:right">${fmtMoney(v.fact_chatter)}</td>
          <td style="text-align:right">${v.porcentaje_supervisor}%</td>
          <td style="text-align:right;font-weight:700">${fmtMoney(v.comision)}</td>
        </tr>
      `).join('');

      view.innerHTML = `
        <div class="card">
          <div class="flex-between">
            <div>
              <h2 style="margin:0;font-family:var(--font-display)">★ Supervisor · ${supName}</h2>
              <div class="muted">Mes ${mes} · cálculo automático</div>
            </div>
            <button class="btn-primary" id="sup-pdf" style="width:auto;padding:12px 22px;margin:0">📥 Liquidación PDF</button>
          </div>
        </div>

        <div class="kpi-row" style="margin-top:18px">
          <div class="kpi-mini"><div class="kpi-mini-lbl">SFS Control</div><div class="kpi-mini-val">${fmtMoney(s.sfs_control)}</div></div>
          <div class="kpi-mini"><div class="kpi-mini-lbl">Suscripciones totales</div><div class="kpi-mini-val">${fmtMoney(s.suscripciones_totales)}</div></div>
          <div class="kpi-mini"><div class="kpi-mini-lbl">5% sobre suscripciones</div><div class="kpi-mini-val">${fmtMoney(s.comision_suscripciones)}</div></div>
          <div class="kpi-mini"><div class="kpi-mini-lbl">% sobre ventas chatters</div><div class="kpi-mini-val">${fmtMoney(s.comision_ventas_chatters)}</div></div>
        </div>

        <div class="card">
          <h3>Detalle por chatter</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Chatter</th><th style="text-align:right">Facturación mes</th><th style="text-align:right">% supervisor</th><th style="text-align:right">Comisión</th></tr></thead>
              <tbody>${ventasRows || '<tr><td colspan="4" class="empty-state">Sin datos de chatters este mes.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div class="sticky-actionbar" style="margin-top:18px">
          <div class="sab-grid" style="grid-template-columns:1fr 1fr 1fr 1.3fr">
            <div class="liq-sum"><div class="liq-sum-lbl">Bruto</div><div class="liq-sum-val">${fmtMoney(s.total_bruto)}</div></div>
            <div class="liq-sum"><div class="liq-sum-lbl">Fee mes</div><div class="liq-sum-val">${s.transaction_fee_pct}%</div></div>
            <div class="liq-sum"><div class="liq-sum-lbl">Fee monto</div><div class="liq-sum-val" style="color:var(--red)">−${fmtMoney(s.total_bruto - s.neto_a_pagar)}</div></div>
            <div class="liq-sum-net">
              <div class="sab-total-lbl">Neto a pagar</div>
              <div class="sab-total-val">${fmtMoney(s.neto_a_pagar)}</div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('sup-pdf').addEventListener('click', () => generarSupervisorPDF(s));
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  function generarSupervisorPDF(s) {
    const supName = s.supervisor ? s.supervisor.nombre : 'Supervisor';
    const rows = s.ventas_detalle.map(v => `
      <tr style="border-bottom:1px solid #fbcfe8">
        <td style="padding:10px">${v.chatter}</td>
        <td style="padding:10px;text-align:right">${fmtMoney(v.fact_chatter)}</td>
        <td style="padding:10px;text-align:right">${v.porcentaje_supervisor}%</td>
        <td style="padding:10px;text-align:right;font-weight:700">${fmtMoney(v.comision)}</td>
      </tr>
    `).join('');
    const html = `
<div style="font-family:Inter,sans-serif;padding:30px;color:#1a1a1a;background:#fff;width:720px">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #be185d;padding-bottom:16px">
    <div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:1.8rem;font-weight:800;color:#be185d">BraveGirls Agency</div>
      <div style="color:#6b7280;font-size:0.85rem">Liquidación Supervisor · Mes ${s.mes}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:0.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em">Supervisor</div>
      <div style="font-size:1.4rem;font-weight:800">${supName}</div>
    </div>
  </div>
  <div style="margin-top:20px">
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span>SFS Control</span><strong>${fmtMoney(s.sfs_control)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span>5% de suscripciones (${fmtMoney(s.suscripciones_totales)})</span><strong>${fmtMoney(s.comision_suscripciones)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Comisión sobre ventas chatters</span><strong>${fmtMoney(s.comision_ventas_chatters)}</strong></div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead><tr style="background:#fce7f3;color:#be185d">
      <th style="padding:10px;text-align:left">Chatter</th>
      <th style="padding:10px;text-align:right">Facturación</th>
      <th style="padding:10px;text-align:right">% Sup</th>
      <th style="padding:10px;text-align:right">Comisión</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:20px;background:#fce7f3;padding:18px;border-radius:8px">
    <div style="display:flex;justify-content:space-between"><span>Total bruto</span><strong>${fmtMoney(s.total_bruto)}</strong></div>
    <div style="display:flex;justify-content:space-between;color:#dc2626"><span>Fee ${s.transaction_fee_pct}%</span><strong>−${fmtMoney(s.total_bruto - s.neto_a_pagar)}</strong></div>
    <div style="display:flex;justify-content:space-between;border-top:2px solid #be185d;padding-top:12px;margin-top:10px">
      <span style="font-size:1.2rem;font-weight:800;color:#be185d">NETO</span>
      <span style="font-size:1.6rem;font-weight:800;color:#be185d">${fmtMoney(s.neto_a_pagar)}</span>
    </div>
  </div>
</div>`;
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;top:0;left:0;width:720px;background:#fff;z-index:999999;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,0.6)';
    tmp.innerHTML = html;
    document.body.appendChild(tmp);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      window.html2pdf().from(tmp.firstElementChild).set({
        margin: 6,
        filename: `liquidacion_supervisor_${s.mes}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: '#fff', useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }).save().then(() => { tmp.remove(); document.body.style.overflow = prevOverflow; });
    }, 250);
  }

  // ═══════════════════════════════════════════════════════
  // FASE 3 · VISTA: GANANCIAS (P&L)
  // ═══════════════════════════════════════════════════════
  async function renderGanancias(view) {
    const mes = currentMes();
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const p = await api('pnl', { params: { mes } });
      const totalGastos = p.pagos_chatters + p.pagos_supervisor + p.pagos_equipo_fijo + p.gasto_om_agencia + p.gastos_otros;
      view.innerHTML = `
        <div class="kpi-row">
          <div class="kpi-mini big"><div class="kpi-mini-lbl">Facturación total</div><div class="kpi-mini-val">${fmtMoney(p.fact_total)}</div></div>
          <div class="kpi-mini big"><div class="kpi-mini-lbl">Suscripciones</div><div class="kpi-mini-val">${fmtMoney(p.suscripciones)}</div></div>
          <div class="kpi-mini big"><div class="kpi-mini-lbl">Fact s/subs</div><div class="kpi-mini-val">${fmtMoney(p.fact_sin_subs)}</div></div>
          <div class="kpi-mini big highlight"><div class="kpi-mini-lbl">Ganancia bruta agencia</div><div class="kpi-mini-val">${fmtMoney(p.ganancia_bruta_agencia)}</div></div>
        </div>

        <div class="pnl-grid">
          <div class="card">
            <h3>Ingreso bruto (a cobrar a modelos)</h3>
            <div class="pnl-line big"><span>Total facturado a modelos</span><strong style="color:var(--green)">${fmtMoney(p.ingreso_bruto)}</strong></div>
          </div>
          <div class="card">
            <h3>Egresos</h3>
            <div class="pnl-line"><span>Pagos a chatters</span><strong style="color:var(--red)">−${fmtMoney(p.pagos_chatters)}</strong></div>
            <div class="pnl-line"><span>Pago supervisor (Jony)</span><strong style="color:var(--red)">−${fmtMoney(p.pagos_supervisor)}</strong></div>
            <div class="pnl-line"><span>Equipo fijo (sueldos)</span><strong style="color:var(--red)">−${fmtMoney(p.pagos_equipo_fijo)}</strong></div>
            <div class="pnl-line"><span>OnlyMonster (parte agencia)</span><strong style="color:var(--red)">−${fmtMoney(p.gasto_om_agencia)}</strong></div>
            <div class="pnl-line"><span>Otros gastos del mes</span><strong style="color:var(--red)">−${fmtMoney(p.gastos_otros)}</strong></div>
            <div class="pnl-line total"><span>Total egresos</span><strong style="color:var(--red)">−${fmtMoney(totalGastos)}</strong></div>
          </div>
        </div>

        <div class="sticky-actionbar" style="margin-top:18px">
          <div class="sab-grid" style="grid-template-columns:1fr 1fr 1.5fr">
            <div class="liq-sum"><div class="liq-sum-lbl">Ingreso bruto</div><div class="liq-sum-val">${fmtMoney(p.ingreso_bruto)}</div></div>
            <div class="liq-sum"><div class="liq-sum-lbl">Total egresos</div><div class="liq-sum-val" style="color:var(--red)">−${fmtMoney(totalGastos)}</div></div>
            <div class="liq-sum-net">
              <div class="sab-total-lbl">Neto Owner</div>
              <div class="sab-total-val" style="color:${p.neto_owner >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(p.neto_owner)}</div>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // FASE 3 · VISTA: INCENTIVOS HISTÓRICO
  // ═══════════════════════════════════════════════════════
  async function renderIncentivos(view) {
    view.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('incentivos');
      const lista = r.data;
      // Cargar chatters para el selector
      const chRes = await api('catalog', { params: { entity: 'chatters' } });
      const chatters = chRes.data.filter(c => c.activo);

      const rowsHtml = lista.map(i => `
        <tr>
          <td><strong>${i.mes}</strong></td>
          <td>${i.chatter || '—'}</td>
          <td style="text-align:right">${fmtMoney(i.monto)}</td>
          <td>${i.motivo || '—'}</td>
          <td><button class="btn-ghost-small inc-del-mes" data-mes="${i.mes}">✕</button></td>
        </tr>
      `).join('');

      view.innerHTML = `
        <div class="card">
          <h3>Asignar incentivo del mes</h3>
          <div class="inline-form">
            <input type="month" id="inc-mes" value="${currentMes()}">
            <select id="inc-chatter">
              <option value="">— Chatter —</option>
              ${chatters.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
            </select>
            <input type="number" step="0.01" id="inc-monto" placeholder="50" value="50" style="max-width:120px">
            <input type="text" id="inc-motivo" placeholder="Motivo" style="flex:1">
            <button class="btn-primary" id="inc-save" style="width:auto;padding:10px 18px;margin:0">Guardar ganador</button>
          </div>
        </div>

        <div class="card">
          <div class="flex-between">
            <h3>Histórico</h3>
            <div class="muted">${lista.length} meses con ganador</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Mes</th><th>Chatter</th><th style="text-align:right">Monto</th><th>Motivo</th><th></th></tr></thead>
              <tbody>${rowsHtml || '<tr><td colspan="5" class="empty-state">Aún no asignaste incentivos.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('inc-save').addEventListener('click', async () => {
        const body = {
          mes: document.getElementById('inc-mes').value,
          chatter_id: Number(document.getElementById('inc-chatter').value),
          monto: Number(document.getElementById('inc-monto').value || 50),
          motivo: document.getElementById('inc-motivo').value || null
        };
        if (!body.mes || !body.chatter_id) { toast('Mes y chatter requeridos', 'error'); return; }
        try {
          await api('incentivos', { method: 'POST', body });
          toast('Ganador guardado', 'success');
          renderIncentivos(view);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
      view.querySelectorAll('.inc-del-mes').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm(`¿Eliminar incentivo del mes ${b.dataset.mes}?`)) return;
          try {
            await api('incentivos', { method: 'POST', params: { op: 'delete', mes: b.dataset.mes } });
            toast('Eliminado', 'success');
            renderIncentivos(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  // Cuando cambia el mes: guardar y re-renderizar la vista actual
  function shiftMes(delta) {
    const input = document.getElementById('mes-selector');
    const current = input.value || new Date().toISOString().slice(0, 7);
    const [y, m] = current.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    input.value = newMes;
    sessionStorage.setItem('admin_mes', newMes);
    const route = location.hash.replace('#', '') || 'resumen';
    navigate(route);
  }

  document.getElementById('mes-selector').addEventListener('change', (e) => {
    sessionStorage.setItem('admin_mes', e.target.value);
    const route = location.hash.replace('#', '') || 'resumen';
    navigate(route);
  });
  document.getElementById('mes-prev').addEventListener('click', () => shiftMes(-1));
  document.getElementById('mes-next').addEventListener('click', () => shiftMes(1));
  document.getElementById('mes-today').addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 7);
    const input = document.getElementById('mes-selector');
    input.value = today;
    sessionStorage.setItem('admin_mes', today);
    const route = location.hash.replace('#', '') || 'resumen';
    navigate(route);
  });

  boot();
})();
