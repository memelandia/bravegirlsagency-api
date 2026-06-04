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
  // Token vive en localStorage (sesión persistente 60 días, el server lo revoca al expirar).
  // Migración: leer sessionStorage si existe (sesión vieja) y promoverlo.
  let token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (token && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
  }

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
      tableColumns: ['nombre', 'email', 'porcentaje_default', 'porcentaje_supervisor', 'rol', 'es_team_leader', 'activo']
    },
    equipo: {
      label: 'Equipo Fijo',
      icon: '★',
      columns: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'rol', label: 'Rol', type: 'text', placeholder: 'Account Manager, Editor…' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'sueldo_mensual_usd', label: 'Sueldo USD/mes', type: 'number', step: '0.01' },
        { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
        { key: 'activo', label: 'Activo', type: 'bool' }
      ],
      tableColumns: ['nombre', 'rol', 'email', 'sueldo_mensual_usd', 'activo']
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

  // ───────── Logger de errores del frontend ─────────
  // Envía a /api/admin?action=log-error y se ve en Ajustes → "Errores recientes".
  const ERR_REPORT_THROTTLE_MS = 5000;
  let _lastErrSentAt = 0;
  function reportError(err, extra = {}) {
    const now = Date.now();
    if (now - _lastErrSentAt < ERR_REPORT_THROTTLE_MS) return; // throttle
    _lastErrSentAt = now;
    const body = {
      message: String(err?.message || err || 'unknown').slice(0, 2000),
      stack: err?.stack ? String(err.stack).slice(0, 8000) : null,
      url: String(location.href).slice(0, 500),
      route: location.hash.replace('#', '') || 'resumen',
      user_agent: navigator.userAgent.slice(0, 500),
      ...extra
    };
    fetch(`${API}?action=log-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(() => {});
  }
  window.addEventListener('error', (e) => {
    if (e.error) reportError(e.error);
    else reportError(e.message || 'window error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason || 'unhandled rejection');
  });

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
      localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
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
    const savedMes = sessionStorage.getItem('admin_mes') || mes;
    document.getElementById('mes-selector').value = savedMes;
    const t = document.getElementById('mes-display-text');
    if (t) t.textContent = fmtMesNice(savedMes);
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
      localStorage.setItem(TOKEN_KEY, token);
      showApp();
    } catch (e) {
      errEl.textContent = 'No se pudo contactar al servidor';
      errEl.classList.add('show');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    // Revoca el token en el server (best-effort)
    if (token) {
      try { await fetch(`${API}?action=logout`, { method: 'POST', headers: { 'X-Admin-Token': token } }); } catch (_) {}
    }
    localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
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

  function parseMoneyInput(raw) {
    if (raw == null) return null;
    const txt = String(raw).trim();
    if (!txt) return null;
    const normalized = txt.replace(/\./g, '').replace(',', '.');
    const val = Number(normalized);
    if (!Number.isFinite(val) || val < 0) return null;
    return val;
  }

  function formatMesLabel(yyyyMm) {
    if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm || '';
    const [y, m] = yyyyMm.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const idx = Number(m) - 1;
    return `${meses[idx] || m} ${String(y).slice(2)}`;
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
        const hue = [...(c.modelo || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
        const pendiente = Number(c.pendiente || 0);
        const recibido = Number(c.pago_recibido || 0);
        const pendColor = pendiente > 0.01 ? '#FCA5A5' : '#34D399';
        return `
          <tr>
            <td><span class="pill-entity" style="--ent-hue:${hue}"><strong>${escapeHtml(c.modelo)}</strong></span></td>
            <td class="text-right" style="color:#FDE047;font-weight:700">${fmtMoney(c.total_a_cobrar, c.moneda)}</td>
            <td class="text-right" style="color:#34D399;font-weight:700">${fmtMoney(recibido, c.moneda)}</td>
            <td class="text-right" style="color:${pendColor};font-weight:700">${fmtMoney(pendiente, c.moneda)}</td>
          </tr>`;
      }).join('');

      const gastosRows = (r.gastos || []).slice(0, 6).map(g => `
        <tr>
          <td><span class="row-name">${g.descripcion || '—'}</span></td>
          <td>${g.categoria ? `<span class="pill cat-${g.categoria}">${g.categoria}</span>` : '<span class="muted">—</span>'}</td>
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
                  <div class="card-title-row">
                    <div class="section-ico section-ico--pink">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div>
                      <div class="card-title">Evolución de ingresos</div>
                      <div class="card-sub">Total Fact. Emitidas hasta el mes anterior</div>
                    </div>
                  </div>
                </div>
                <div class="chart-area card-inner-pad">
                  <canvas id="chart-ingresos" height="130"></canvas>
                </div>
              </div>

              <div class="card resumen-card-donut">
                <div class="card-inner-pad card-head-row">
                  <div class="card-title-row">
                    <div class="section-ico section-ico--violet">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l5.5 5.5"/></svg>
                    </div>
                    <div>
                      <div class="card-title">Distribución</div>
                      <div class="card-sub">${mes.replace('-', ' · ')}</div>
                    </div>
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
                    <div class="section-ico section-ico--green">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <span class="card-title">Cobros a Modelos</span>
                    <span class="count-badge">${(r.cobros || []).length}</span>
                  </div>
                  <button class="btn-ghost-small" onclick="location.hash='facturacion'">Ver detalle →</button>
                </div>
                <div class="table-wrap-inner">
                  <table>
                    <thead><tr><th>Modelo</th><th class="text-right">Total</th><th class="text-right">Pagado</th><th class="text-right">Pendiente</th></tr></thead>
                    <tbody>${cobrosRows || '<tr><td colspan="4" class="empty-state center">Sin cierres este mes.</td></tr>'}</tbody>
                    <tfoot><tr class="tbl-footer"><td colspan="4">Mostrando ${(r.cobros || []).length} modelo${(r.cobros || []).length !== 1 ? 's' : ''}</td></tr></tfoot>
                  </table>
                </div>
              </div>

              <div class="card resumen-card-table">
                <div class="card-inner-pad card-head-row">
                  <div class="card-title-row">
                    <div class="section-ico section-ico--red">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                    </div>
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
              <div class="card-inner-pad card-head-row">
                <div class="card-title-row">
                  <div class="section-ico section-ico--amber">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <span class="card-title">Facturas recientes</span>
                </div>
                <button class="btn-ghost-small" onclick="location.hash='facturas'">Ver todas →</button>
              </div>
              <div class="card-inner-pad" style="padding-top:0">
                <div class="recent-facturas" id="recent-facturas-list">
                  <div class="empty-state center" style="padding:24px 0">Cargando...</div>
                </div>
              </div>
            </div>

            <div class="card rs-card rs-incentivo">
              <div class="card-inner-pad">
                <div class="rs-incentivo-head" style="gap:10px">
                  <div class="section-ico section-ico--green">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </div>
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

        const historialFull = Array.isArray(r.fact_emitidas_historial) ? r.fact_emitidas_historial : [];
        // Excluir el mes corriente del gráfico (suele estar incompleto y muestra falsa caída a 0)
        const nowMes = new Date().toISOString().slice(0, 7);
        const historial = historialFull.filter(h => h.mes < nowMes);
        const labels = historial.map(h => formatMesLabel(h.mes));
        const data = historial.map(h => Number(h.total || 0));
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
            const estado = (c.estados || '').includes('confirmado') ? 'pagada'
              : (c.estados || '').includes('enviado') ? 'enviada' : 'pendiente';
            const estadoClass = estado === 'pagada' ? 'green' : estado === 'enviada' ? 'amber' : 'red';
            const estadoLabel = estado === 'pagada' ? '✓ Pagada' : estado === 'enviada' ? '→ Enviado' : '○ Pendiente';
            const hue = [...(c.modelo || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
            return `
              <div class="recent-factura-row">
                <span class="rf-name"><span class="pill-entity" style="--ent-hue:${hue}">${c.modelo || '—'}</span></span>
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
      const pct = p ? Number(p.porcentaje || 0) : 0;
      const cls = pct >= 60 ? 'plan-premium' : pct >= 50 ? 'plan-avanzado' : pct >= 40 ? 'plan-inicial' : '';
      return p ? `<span class="pill pill-plan ${cls}">${p.nombre}</span>` : `#${value}`;
    }
    if (key === 'modelo_id') {
      const m = modelosCache && modelosCache.find(x => x.id === value);
      if (!m) return `#${value}`;
      return `<span class="pill-entity" style="--ent-hue:${hueOfName(m.nombre)}">${escapeHtml(m.nombre)}</span>`;
    }
    if (key === 'tipo') {
      return `<span class="pill tipo-${String(value).toLowerCase()}">${value}</span>`;
    }
    if (key === 'rol') {
      // Slug del rol para mapear a CSS (Account Manager → "account-manager", etc.)
      const slug = String(value).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return `<span class="pill pill-rol rol-${slug}">${value}</span>`;
    }
    if (key === 'email') {
      return `<a href="mailto:${escapeHtml(value)}" style="color:var(--text);text-decoration:none;border-bottom:1px dashed rgba(255,255,255,0.2)">${escapeHtml(value)}</a>`;
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
    if (key === 'nombre' && (entity === 'modelos' || entity === 'chatters')) {
      return `<span class="pill-entity" style="--ent-hue:${hueOfName(value)}"><strong>${escapeHtml(value)}</strong></span>`;
    }
    return String(value);
  }
  function hueOfName(n) { return [...(String(n) || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360; }

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
        // Re-renderizar la vista actual (catalogo, facturacion, etc.)
        const route = location.hash.replace('#', '') || 'resumen';
        if (route === 'catalogo') showEntityList(entity);
        else navigate(route);
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
      const [feeRes, histRes, statsRes, overrideRes, errorsRes, trashRes] = await Promise.all([
        api('tx-fee',         { params: { mes } }),
        api('tx-fee-history'),
        api('stats'),
        api('resumen-override', { params: { mes } }),
        api('log-error').catch(() => ({ data: [] })),
        api('gastos', { params: { op: 'trash' } }).catch(() => ({ data: [] }))
      ]);
      const feeActual = Number(feeRes.porcentaje || 0);
      const historial = histRes.data || [];
      const counts = statsRes.counts || {};
      const ov = overrideRes.data || {};
      const errores = errorsRes.data || [];
      const papelera = trashRes.data || [];
      const factManualInput = ov.facturacion_total_manual != null
        ? Number(ov.facturacion_total_manual).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
      const subsManualInput = ov.suscripciones_manual != null
        ? Number(ov.suscripciones_manual).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
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
          <div class="card-title">🧮 Ajustes de facturación y suscripciones</div>
          <p class="card-sub">Control manual centralizado fuera de Resumen. Facturación manual solo para meses anteriores a mayo 2026.</p>

          <div class="grid-2col" style="margin-top:14px">
            <div>
              <label>Mes para ajuste manual</label>
              <input type="month" id="ajustes-ov-mes" value="${mes}">
            </div>
            <div class="muted" style="font-size:0.82rem;display:flex;align-items:end">
              ${ov.facturacion_manual_habilitada ? 'Este mes permite facturación manual.' : 'Este mes NO permite facturación manual (mayo 2026 en adelante = automático).'}
            </div>
          </div>

          <div class="grid-2col" style="margin-top:12px">
            <div>
              <label>Facturación total final (manual)</label>
              <input type="text" id="ajustes-ov-fact" placeholder="ej: 29.538,46" value="${factManualInput}" ${ov.facturacion_manual_habilitada ? '' : 'disabled'}>
              <p class="muted" style="font-size:0.78rem;margin-top:6px">Se guarda en SQL y solo impacta meses anteriores a mayo 2026.</p>
            </div>
            <div>
              <label>Suscripciones no comisionables (manual)</label>
              <input type="text" id="ajustes-ov-subs" placeholder="ej: 3.800,00" value="${subsManualInput}">
              <p class="muted" style="font-size:0.78rem;margin-top:6px">Sobrescribe el total de suscripciones del mes en Resumen.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
            <button class="btn-primary" id="ajustes-ov-save" style="width:auto;padding:10px 18px;margin:0">💾 Guardar ajustes del mes</button>
            <button class="btn-secondary" id="ajustes-ov-clear" style="width:auto;padding:10px 18px;margin:0">🧹 Limpiar valores manuales</button>
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-title">🖼️ Logo de la agencia</div>
          <p class="card-sub">Imagen que aparece en TODAS las facturas y liquidaciones PDF. Subí un PNG o JPG (max 500KB). Se guarda en el navegador.</p>
          <div style="display:flex;gap:20px;align-items:center;margin-top:18px">
            <div style="width:120px;height:120px;border-radius:14px;background:#fff;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
              ${window.AGENCY_LOGO_DATA_URI
                ? `<img src="${window.AGENCY_LOGO_DATA_URI}" alt="Logo actual" style="max-width:100%;max-height:100%;object-fit:contain"/>`
                : `<div style="font-size:0.8rem;color:var(--text-mute);text-align:center;padding:10px">Sin logo<br>(SVG default)</div>`}
            </div>
            <div style="flex:1">
              <label style="font-size:0.78rem;color:var(--text-mute);text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:8px;display:block">Subir nuevo logo</label>
              <input type="file" id="logo-input" accept="image/png,image/jpeg,image/svg+xml" style="width:100%;padding:10px 12px">
              <p class="muted" style="font-size:0.78rem;margin-top:8px">Recomendado: cuadrado, fondo transparente o rosa pálido, ~500x500px.</p>
              <div style="display:flex;gap:8px;margin-top:10px">
                ${window.AGENCY_LOGO_DATA_URI
                  ? `<button class="btn-secondary" id="logo-remove" style="width:auto;padding:8px 14px;margin:0;font-size:0.85rem">🗑️ Quitar logo (volver al SVG default)</button>`
                  : ''}
              </div>
            </div>
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
          <div class="card-title">🗑 Papelera de gastos <span class="count">${papelera.length}</span></div>
          <p class="card-sub">Gastos borrados en los últimos 30 días. Se purgan automáticamente luego de ese plazo.</p>
          ${papelera.length === 0
            ? `<div class="empty-state" style="padding:20px 0">Sin gastos en papelera.</div>`
            : `<div class="table-wrap" style="margin-top:14px">
                 <table>
                   <thead><tr><th>Mes</th><th>Descripción</th><th style="text-align:right">Monto</th><th>Borrado</th><th></th></tr></thead>
                   <tbody>
                     ${papelera.map(g => `
                       <tr>
                         <td><strong>${g.mes}</strong></td>
                         <td>${(g.descripcion || '').replace(/[<>]/g, '')}</td>
                         <td style="text-align:right">${fmtMoney(g.monto)}</td>
                         <td><span class="muted" style="font-size:0.78rem">hace ${g.dias_en_papelera ?? 0} d</span></td>
                         <td style="text-align:right;white-space:nowrap">
                           <button class="btn-ghost-small gasto-restore" data-id="${g.id}" title="Restaurar">↩ Restaurar</button>
                           <button class="btn-danger" data-purge="${g.id}" title="Borrar definitivamente">✕</button>
                         </td>
                       </tr>
                     `).join('')}
                   </tbody>
                 </table>
               </div>`}
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-title">⚠️ Errores recientes del frontend <span class="count">${errores.length}</span></div>
          <p class="card-sub">Últimos errores capturados automáticamente. Se purgan a los 60 días.</p>
          <div style="display:flex;gap:10px;margin-top:10px">
            <button class="btn-secondary" id="errors-refresh" style="width:auto;padding:8px 14px;margin:0">🔄 Refrescar</button>
            ${errores.length ? `<button class="btn-danger" id="errors-clear" style="width:auto;padding:8px 14px;margin:0">🧹 Vaciar log</button>` : ''}
          </div>
          ${errores.length === 0
            ? `<div class="empty-state" style="padding:20px 0;margin-top:10px">Sin errores recientes. ✅</div>`
            : `<div class="table-wrap" style="margin-top:14px">
                 <table>
                   <thead><tr><th>Cuándo</th><th>Ruta</th><th>Mensaje</th></tr></thead>
                   <tbody>
                     ${errores.slice(0, 30).map(e => {
                       const when = new Date(e.created_at).toLocaleString('es-AR');
                       const safeMsg = String(e.message || '').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
                       const safeRoute = String(e.route || '—').replace(/[<>]/g, '');
                       const stackHint = e.stack ? `<details style="margin-top:4px"><summary style="cursor:pointer;font-size:0.75rem;color:var(--text-mute)">stack</summary><pre style="font-size:0.7rem;white-space:pre-wrap;margin:6px 0 0;color:var(--text-mute);max-height:200px;overflow:auto">${String(e.stack).replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;')}</pre></details>` : '';
                       return `<tr><td style="white-space:nowrap;font-size:0.78rem">${when}</td><td><span class="muted" style="font-size:0.78rem">${safeRoute}</span></td><td><div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.78rem">${safeMsg}</div>${stackHint}</td></tr>`;
                     }).join('')}
                   </tbody>
                 </table>
               </div>`}
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-title">🔐 Sesión</div>
          <p class="card-sub">Sesión persistente de 60 días. El token es opaco (no es la contraseña) y se puede revocar cerrando sesión.</p>
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

      // Logo upload
      const logoInput = document.getElementById('logo-input');
      if (logoInput) {
        logoInput.addEventListener('change', (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 500_000) { toast('Imagen muy grande (max 500KB)', 'error'); return; }
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUri = ev.target.result;
            saveAgencyLogo(dataUri);
            toast(`Logo guardado (${(f.size / 1024).toFixed(0)} KB) — aparecerá en próximas facturas`, 'success');
            renderAjustes(view);
          };
          reader.onerror = () => toast('Error leyendo el archivo', 'error');
          reader.readAsDataURL(f);
        });
      }
      const logoRemove = document.getElementById('logo-remove');
      if (logoRemove) {
        logoRemove.addEventListener('click', () => {
          if (!confirm('¿Quitar el logo custom? Las facturas volverán a usar el SVG default.')) return;
          saveAgencyLogo('');
          toast('Logo eliminado', 'success');
          renderAjustes(view);
        });
      }

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

      document.getElementById('logout-also').addEventListener('click', async () => {
        if (token) {
          try { await fetch(`${API}?action=logout`, { method: 'POST', headers: { 'X-Admin-Token': token } }); } catch (_) {}
        }
        localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
        token = null;
        showLogin();
      });

      // Errores recientes
      document.getElementById('errors-refresh')?.addEventListener('click', () => renderAjustes(view));
      document.getElementById('errors-clear')?.addEventListener('click', async () => {
        if (!confirm('¿Vaciar el log de errores del frontend?')) return;
        try {
          await api('log-error', { method: 'POST', params: { op: 'clear' } });
          toast('Log de errores vaciado', 'success');
          renderAjustes(view);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });

      // Papelera de gastos
      view.querySelectorAll('.gasto-restore').forEach(b => {
        b.addEventListener('click', async () => {
          try {
            await api('gastos', { method: 'POST', params: { id: b.dataset.id, op: 'restore' } });
            toast('Gasto restaurado', 'success');
            renderAjustes(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
      view.querySelectorAll('[data-purge]').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('¿Borrar definitivamente este gasto? No se puede recuperar.')) return;
          try {
            await api('gastos', { method: 'POST', params: { id: b.dataset.purge, op: 'purge' } });
            toast('Gasto borrado definitivamente', 'success');
            renderAjustes(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });

      document.getElementById('ajustes-ov-mes').addEventListener('change', () => {
        const newMes = document.getElementById('ajustes-ov-mes').value;
        if (!newMes) return;
        document.getElementById('mes-selector').value = newMes;
        sessionStorage.setItem('admin_mes', newMes);
        renderAjustes(view);
      });

      document.getElementById('ajustes-ov-save').addEventListener('click', async () => {
        const mesOv = document.getElementById('ajustes-ov-mes').value;
        const inFact = document.getElementById('ajustes-ov-fact');
        const inSubs = document.getElementById('ajustes-ov-subs');
        const fact = parseMoneyInput(inFact ? inFact.value : null);
        const subs = parseMoneyInput(inSubs ? inSubs.value : null);
        const hasFact = inFact && String(inFact.value || '').trim() !== '';
        const hasSubs = inSubs && String(inSubs.value || '').trim() !== '';

        if (hasFact && fact == null) {
          toast('Facturación manual inválida. Formato sugerido: 29.538,46', 'error');
          return;
        }
        if (hasSubs && subs == null) {
          toast('Suscripciones manuales inválidas. Formato sugerido: 3.800,00', 'error');
          return;
        }

        try {
          await api('resumen-override', {
            method: 'POST',
            body: {
              mes: mesOv,
              facturacion_total_manual: hasFact ? fact : null,
              suscripciones_manual: hasSubs ? subs : null
            }
          });
          toast('Ajustes manuales guardados', 'success');
          renderAjustes(view);
        } catch (err) {
          toast('Error: ' + (err.message || 'No se pudo guardar'), 'error');
        }
      });

      document.getElementById('ajustes-ov-clear').addEventListener('click', async () => {
        const mesOv = document.getElementById('ajustes-ov-mes').value;
        try {
          await api('resumen-override', {
            method: 'POST',
            body: {
              mes: mesOv,
              facturacion_total_manual: null,
              suscripciones_manual: null
            }
          });
          toast('Ajustes manuales limpiados', 'success');
          renderAjustes(view);
        } catch (err) {
          toast('Error: ' + (err.message || 'No se pudo limpiar'), 'error');
        }
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

  // ───────── Logo de agencia (custom upload, persistido en localStorage) ─────────
  const AGENCY_LOGO_KEY = 'admin_agency_logo';
  function loadAgencyLogo() {
    try { window.AGENCY_LOGO_DATA_URI = localStorage.getItem(AGENCY_LOGO_KEY) || ''; }
    catch (_) { window.AGENCY_LOGO_DATA_URI = ''; }
  }
  function saveAgencyLogo(dataUri) {
    try {
      if (dataUri) localStorage.setItem(AGENCY_LOGO_KEY, dataUri);
      else         localStorage.removeItem(AGENCY_LOGO_KEY);
      window.AGENCY_LOGO_DATA_URI = dataUri || '';
    } catch (e) { console.error(e); }
  }
  loadAgencyLogo();

  // ───────── Boot ─────────
  async function boot() {
    if (!token) { showLogin(); return; }
    // verificar que el token sigue válido
    try {
      await api('verify');
      showApp();
    } catch {
      localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
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

    if (!modelosCache) {
      try { modelosCache = (await api('catalog', { params: { entity: 'modelos' } })).data; }
      catch (e) { view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`; return; }
    }
    const activos = modelosCache.filter(m => m.activa);

    const planClass = (p) => {
      const pct = Number(p) || 0;
      if (pct >= 60) return 'plan-premium';
      if (pct >= 50) return 'plan-avanzado';
      if (pct >= 40) return 'plan-inicial';
      return 'plan-otro';
    };
    const planLabel = (p) => {
      const pct = Number(p) || 0;
      if (pct >= 60) return `GESTIÓN ${pct}%`;
      if (pct >= 50) return `GESTIÓN ${pct}%`;
      if (pct >= 40) return `GESTIÓN ${pct}%`;
      return `${pct}%`;
    };
    const initialOf = (n) => (n || '?').trim().charAt(0).toUpperCase();
    const hueOf = (n) => [...(n || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;

    const cardsHtml = activos.map(m => {
      const pct = Number(m.porcentaje || m.plan_porcentaje || 0);
      const cls = planClass(pct);
      const lbl = planLabel(pct);
      const ult = Number(m.factura_numero_actual || 0);
      const nxt = ult + 1;
      const mHue = hueOf(m.nombre);
      return `
        <div class="modelo-card ${cls}" data-modelo-id="${m.id}" tabindex="0" role="button" aria-label="Seleccionar ${m.nombre}" style="--ent-hue:${mHue}">
          <div class="mc-head">
            <div class="mc-avatar" style="--av-hue:${mHue}">${initialOf(m.nombre)}</div>
            <div class="mc-meta">
              <div class="mc-name"><span class="pill-entity" style="--ent-hue:${mHue};font-size:0.95rem;padding:4px 12px"><strong>${escapeHtml(m.nombre)}</strong></span></div>
              <span class="mc-plan-pill">${lbl}</span>
            </div>
          </div>
          <div class="mc-stats">
            <div class="mc-stat">
              <div class="mc-stat-lbl">Última factura</div>
              <div class="mc-stat-val">${ult ? '#' + String(ult).padStart(4, '0') : '<span class="muted">sin emitir</span>'}</div>
            </div>
            <div class="mc-stat">
              <div class="mc-stat-lbl">N° próxima</div>
              <div class="mc-stat-val mc-num-next">#${String(nxt).padStart(4, '0')}</div>
            </div>
          </div>
          ${m.nombre_fiscal ? `<div class="mc-fiscal" title="${escapeHtml(m.nombre_fiscal)}">${escapeHtml(m.nombre_fiscal)}</div>` : `<div class="mc-fiscal muted">Sin datos fiscales</div>`}
          <button class="btn-primary mc-action" data-modelo-id="${m.id}">📥 Generar factura</button>
        </div>
      `;
    }).join('');

    view.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="flex-between">
          <div>
            <div class="card-title">▤ Facturación a Modelos</div>
            <div class="card-sub">Elegí una modelo para generar la factura del mes <strong>${mes}</strong></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="fact-search" type="search" placeholder="Buscar modelo…" style="min-width:240px">
            <button class="btn-ghost-small" id="fact-back" style="display:none">← Volver al listado</button>
          </div>
        </div>
      </div>

      <div id="fact-grid-wrap">
        <div class="modelos-grid" id="modelos-grid">${cardsHtml || '<div class="empty-state center">No hay modelos activas. Andá a Catálogo → Modelos.</div>'}</div>
      </div>

      <div id="fact-detail" style="margin-top:18px;display:none"></div>
    `;

    const grid = document.getElementById('modelos-grid');
    const detail = document.getElementById('fact-detail');
    const gridWrap = document.getElementById('fact-grid-wrap');
    const backBtn = document.getElementById('fact-back');
    const search = document.getElementById('fact-search');

    const openModelo = async (id) => {
      gridWrap.style.display = 'none';
      detail.style.display = '';
      backBtn.style.display = '';
      await loadFacturacionModelo(id, mes);
      detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    grid?.querySelectorAll('.modelo-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.mc-action')) return;
        openModelo(Number(card.dataset.modeloId));
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModelo(Number(card.dataset.modeloId)); }
      });
    });
    grid?.querySelectorAll('.mc-action').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openModelo(Number(btn.dataset.modeloId)); });
    });

    backBtn.addEventListener('click', () => {
      detail.style.display = 'none';
      detail.innerHTML = '';
      gridWrap.style.display = '';
      backBtn.style.display = 'none';
    });

    search?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      grid.querySelectorAll('.modelo-card').forEach(card => {
        const name = card.querySelector('.mc-name')?.textContent.toLowerCase() || '';
        const fiscal = card.querySelector('.mc-fiscal')?.textContent.toLowerCase() || '';
        card.style.display = (!q || name.includes(q) || fiscal.includes(q)) ? '' : 'none';
      });
    });
  }

  async function loadFacturacionModelo(modeloId, mes) {
    const detail = document.getElementById('fact-detail');
    detail.innerHTML = `<div class="spinner"></div>`;
    try {
      const r = await api('cierre-modelo', { params: { modelo_id: modeloId, mes } });
      currentFactState = { modelo: r.modelo, cuentas: r.cuentas, mes, facturaRef: r.factura_ref || {} };
      renderFacturacionForm(detail);
    } catch (e) {
      detail.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  function renderFacturacionForm(container) {
    const { modelo, cuentas, mes, facturaRef } = currentFactState;
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
    const mHue = hueOfName(modelo.nombre);
    container.innerHTML = `
      <div class="sticky-actionbar fact-bar">
        <div class="fact-bar-top">
          <div class="fact-bar-title">
            <span class="pill-entity" style="--ent-hue:${mHue};font-size:1rem;padding:5px 14px"><strong>${escapeHtml(modelo.nombre)}</strong></span>
            <span class="muted" style="font-size:.82rem;margin-left:6px">${mes}</span>
          </div>
          <div class="fact-bar-actions">
            <button class="btn-secondary" id="save-cierre-btn">💾 Guardar</button>
            <button class="btn-primary sab-pdf" id="gen-factura-btn">📥 Generar PDF</button>
          </div>
        </div>
        <div class="fact-bar-grid">
          <div class="fact-bar-cell">
            <div class="fact-bar-lbl">Fiscal</div>
            <div class="fact-bar-val" style="display:flex;align-items:center;gap:6px">
              ${modelo.nombre_fiscal ? escapeHtml(modelo.nombre_fiscal) : '<span style="color:#FB923C">⚠ falta cargar</span>'}
              <button id="edit-fiscal-btn" class="btn-ghost-small" title="Editar datos fiscales" style="padding:2px 8px;font-size:.7rem;height:auto">✎</button>
            </div>
          </div>
          ${modelo.identificador ? `<div class="fact-bar-cell"><div class="fact-bar-lbl">ID Fiscal</div><div class="fact-bar-val">${escapeHtml(modelo.identificador)}</div></div>` : ''}
          <div class="fact-bar-cell"><div class="fact-bar-lbl">Plan</div><div class="fact-bar-val">${modelo.porcentaje || modelo.plan_porcentaje}%</div></div>
          <div class="fact-bar-cell"><div class="fact-bar-lbl">Moneda</div><div class="fact-bar-val">${modelo.moneda_default} · ${modelo.medio_pago_default || '—'}</div></div>
          <div class="fact-bar-cell"><div class="fact-bar-lbl">Última factura</div><div class="fact-bar-val sab-num">${facturaRef?.ultimo_numero_mes_anterior ? '#' + facturaRef.ultimo_numero_mes_anterior : '—'}</div></div>
          <div class="fact-bar-cell">
            <div class="fact-bar-lbl">N° factura</div>
            <input type="number" step="1" min="1" id="fact-num-manual" value="${(modelo.factura_numero_actual || 0) + 1}" style="padding:7px 10px;font-size:0.92rem;font-weight:700;color:#FF1F8E">
            <div class="muted" style="font-size:.65rem;margin-top:4px">Sugerido <span id="fact-num-sugerido">#${(modelo.factura_numero_actual || 0) + 1}</span></div>
          </div>
          <div class="fact-bar-cell fact-bar-total">
            <div class="fact-bar-lbl">Total a cobrar</div>
            <div class="fact-bar-total-val" id="grand-total">${fmtMoney(0, modelo.moneda_default)}</div>
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
    const editFiscalBtn = document.getElementById('edit-fiscal-btn');
    if (editFiscalBtn) {
      editFiscalBtn.addEventListener('click', async () => {
        try {
          // Asegurar cache de planes para el selector
          if (!planesCache) {
            try { planesCache = (await api('catalog', { params: { entity: 'planes' } })).data; } catch {}
          }
          openEditModal('modelos', modelo);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    }
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
              ${cuenta.tipo ? `<div class="pill tipo-${String(cuenta.tipo).toLowerCase()}">${cuenta.tipo}</div>` : ''}
              ${cuenta.of_username ? `<div class="muted" style="font-size:0.85rem">@${cuenta.of_username}</div>` : ''}
            </div>
          </div>
          <div class="muted" style="font-size:.85rem">Cierre #${idx + 1}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          <div>
            <label>Facturación total</label>
            <input type="number" step="0.01" data-field="fact_total" value="${c.fact_total || 0}">
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
    const base = (cc.fact_total || 0);
    const gan = base * (cc.porcentaje_aplicado || 0) / 100;
    const extrasSum = (cc.otros_extras || []).reduce((s, x) => s + Number(x.monto || 0), 0);
    const tot = gan + (cc.software_om_fee || 0) + (cc.ventas_por_fuera || 0) + (cc.pago_verificado_ig || 0) + extrasSum;
    cc.total_a_cobrar = tot;

    const moneda = currentFactState.modelo.moneda_default;
    const sumEl = document.querySelector(`[data-summary="${idx}"]`);
    const totEl = document.querySelector(`[data-cuenta-total="${idx}"]`);
    if (sumEl) sumEl.textContent = `Base comisión: ${fmtMoney(base, moneda)} · Ganancia agencia: ${fmtMoney(gan, moneda)}`;
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
      const numInput = document.getElementById('fact-num-manual');
      const numeroManual = Number(numInput ? numInput.value : 0);
      if (!Number.isInteger(numeroManual) || numeroManual <= 0) {
        throw new Error('Número de factura manual inválido');
      }

      const meta = {
        numero: numeroManual,
        mes,
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

      // 4) Render PDF con html2pdf.js (helper unificado)
      await renderHtmlToPdf(html, `Factura-${modelo.nombre.replace(/\s+/g, '')}-${mes}-${numeroManual}.pdf`);

      // 5) Persistir factura en backend
      await api('factura-create', {
        method: 'POST',
        body: {
          modelo_id: modelo.id,
          numero: numeroManual,
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
      modelo.factura_numero_actual = Math.max(Number(modelo.factura_numero_actual || 0), numeroManual);
      modelosCache = modelosCache.map(m => m.id === modelo.id ? { ...m, factura_numero_actual: Math.max(Number(m.factura_numero_actual || 0), numeroManual) } : m);
      const nextEl = document.getElementById('fact-num-sugerido');
      if (nextEl) nextEl.textContent = '#' + (Number(modelo.factura_numero_actual || 0) + 1);
      if (numInput) numInput.value = String(Number(modelo.factura_numero_actual || 0) + 1);

      toast(`Factura #${numeroManual} generada y descargada`, 'success');
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
      const base = (c.fact_total || 0);
      const gan = base * (c.porcentaje_aplicado || 0) / 100;

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

  // Helper unificado: toma HTML string + filename, genera PDF descargado.
  // - Wrapper visible en pantalla (top-left, z-index alto) por 300ms para que el browser
  //   complete el layout antes que html2canvas capture.
  // - Limpia el DOM en try/finally incluso si falla la captura.
  // - Útil para los 3 tipos de PDF: factura modelo, liquidación chatter, liquidación supervisor.
  // Helper bulletproof: html2canvas + jsPDF directos (sin la capa html2pdf que
  // mete su propio sizing y a veces shiftea el contenido cuando hay scroll
  // horizontal en el dashboard). Paginación manual A4.
  async function renderHtmlToPdf(html, filename, opts = {}) {
    // Stage off-screen pero visible para que el browser renderice.
    // Lo metemos en un container fixed que tape la pantalla y ponemos el
    // wrapper dentro en position:static con un width fijo. Sin scroll issues.
    const stage = document.createElement('div');
    stage.setAttribute('data-pdf-stage', '1');
    stage.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'background:rgba(0,0,0,0.78)',
      'z-index:2147483600',
      'overflow:auto',
      'display:block'
    ].join(';');

    const wrapper = document.createElement('div');
    // 760px de ancho → entra cómodo en A4 con margen 10mm de cada lado.
    wrapper.style.cssText = [
      'box-sizing:border-box',
      'width:760px',
      'margin:24px auto',
      'background:#fff',
      'color:#0f172a',
      'font-family:Arial,Helvetica,sans-serif',
      'box-shadow:0 8px 40px rgba(0,0,0,0.5)'
    ].join(';');
    wrapper.innerHTML = html;
    stage.appendChild(wrapper);
    document.body.appendChild(stage);

    const prevBodyOverflow = document.body.style.overflow;
    const prevScrollX = window.scrollX || window.pageXOffset || 0;
    const prevScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    try {
      // Esperar layout + paint + fonts.
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) {}
      }
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 250));

      const target = wrapper.firstElementChild || wrapper;
      const rect = target.getBoundingClientRect();
      const targetWidth = Math.ceil(rect.width) || 760;
      const targetHeight = Math.ceil(rect.height) || target.scrollHeight || 1000;

      // Render con html2canvas (incluido en bundle html2pdf).
      const canvas = await window.html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        letterRendering: true,
        width: targetWidth,
        height: targetHeight,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      });

      // jsPDF (también incluido en bundle).
      const JsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!JsPDFCtor) throw new Error('jsPDF no disponible');
      const pdf = new JsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

      const pageW = pdf.internal.pageSize.getWidth();   // 210
      const pageH = pdf.internal.pageSize.getHeight();  // 297
      const margin = 8;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      // Alto total de la imagen escalada al ancho útil.
      const imgFullH = (canvas.height * usableW) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (imgFullH <= usableH + 0.5) {
        // Entra en una sola página.
        pdf.addImage(imgData, 'JPEG', margin, margin, usableW, imgFullH, undefined, 'FAST');
      } else {
        // Paginación: pintar la misma imagen "completa" con offset negativo
        // por página. Funciona aunque haya cortes en el medio de un párrafo.
        let positionY = margin;
        let heightLeft = imgFullH;
        pdf.addImage(imgData, 'JPEG', margin, positionY, usableW, imgFullH, undefined, 'FAST');
        heightLeft -= usableH;
        while (heightLeft > 0) {
          pdf.addPage();
          positionY = margin - (imgFullH - heightLeft);
          pdf.addImage(imgData, 'JPEG', margin, positionY, usableW, imgFullH, undefined, 'FAST');
          heightLeft -= usableH;
        }
      }

      pdf.save(filename);
    } catch (err) {
      console.error('PDF render error', err);
      toast('Error generando PDF: ' + (err && err.message ? err.message : err), 'error');
    } finally {
      stage.remove();
      document.body.style.overflow = prevBodyOverflow;
      window.scrollTo(prevScrollX, prevScrollY);
    }
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

    const periodoTexto = (() => {
      if (!meta.mes) return '';
      const [y, m] = meta.mes.split('-').map(Number);
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const lastDay = new Date(y, m, 0).getDate();
      return `01 al ${lastDay} de ${meses[m-1]} ${y}`;
    })();

    const customLogo = (window.AGENCY_LOGO_DATA_URI || '').trim();
    const logoHtml = customLogo
      ? `<img src="${customLogo}" alt="BraveGirls" width="78" height="78" style="display:block;object-fit:contain;border-radius:10px"/>`
      : `<div style="width:78px;height:78px;border-radius:14px;background:#be185d;color:#fff;text-align:center;line-height:78px;font-weight:900;font-size:22px;font-family:Arial,sans-serif;letter-spacing:0.04em">BG</div>`;

    const LABEL = '#6b1c4a';
    const VALUE = '#0f172a';
    const ACCENT = '#be185d';
    const PINK_BG = '#fdf2f8';
    const PINK_LINE = '#f9a8d4';

    const itemsHtml = items.map(it => {
      const s = itemLabelStyle(it.descripcion);
      return `
        <tr>
          <td style="padding:7px 9px;background:${s.bg};color:${s.fg};font-weight:800;border:1px solid #fff;text-align:center;font-size:11.5px;line-height:1.3">${escapeHtml(it.descripcion)}</td>
          <td style="padding:7px 9px;text-align:right;color:${VALUE};font-weight:700;border:1px solid #e5e7eb;font-size:11.5px;background:#fff">${fmt(it.monto)}</td>
          <td style="padding:7px 9px;text-align:center;color:${VALUE};border:1px solid #e5e7eb;font-size:11.5px;background:#fff">${it.cantidad != null ? it.cantidad : ''}</td>
          <td style="padding:7px 9px;color:${ACCENT};font-weight:700;border:1px solid #e5e7eb;text-align:center;font-size:10.5px;background:#fff">${escapeHtml(it.observ || '')}</td>
          <td style="padding:7px 9px;text-align:right;color:${VALUE};font-weight:800;border:1px solid #e5e7eb;font-size:11.5px;background:#fff">${fmt(it.monto_agencia)}</td>
        </tr>
      `;
    }).join('');

    return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:${VALUE};padding:18px 22px;width:100%;box-sizing:border-box">

  <table style="width:100%;border-collapse:collapse;margin-bottom:12px;background:${PINK_BG};border:2px solid ${ACCENT};border-radius:8px">
    <tr>
      <td style="vertical-align:middle;padding:12px 16px;width:60%">
        <div style="font-size:21px;font-weight:900;color:${ACCENT};margin-bottom:4px;letter-spacing:-0.5px;line-height:1.1;font-family:Arial,sans-serif">BraveGirls Agency LLC</div>
        <div style="font-size:10px;color:#374151;line-height:1.5;font-weight:600">
          1401 Pennsylvania Ave. STE 105, 19806 Wilmington. Delaware (EE.UU).<br>
          EIN: 38-4349826 · (34) 675 32 80 74 · N° de Licencia 20250971778.
        </div>
      </td>
      <td style="vertical-align:middle;text-align:right;padding:10px 16px 10px 0;width:90px">
        ${logoHtml}
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <tr>
      <td style="vertical-align:bottom">
        <div style="font-size:26px;color:${ACCENT};font-weight:900;letter-spacing:-1px;line-height:1;font-family:Arial,sans-serif">Gestión de cuenta</div>
      </td>
      <td style="vertical-align:bottom;text-align:right;padding-bottom:2px">
        ${periodoTexto ? `<div style="display:inline-block;background:${ACCENT};color:#fff;padding:5px 12px;border-radius:5px;font-size:10.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-family:Arial,sans-serif">Período facturado · ${periodoTexto}</div>` : ''}
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;border:1.5px solid ${ACCENT};margin-bottom:10px;background:#fff;font-size:11.5px">
    <tr style="background:#fce7f3">
      <td colspan="3" style="padding:7px 12px;color:${LABEL};font-weight:800;font-size:11.5px;border-bottom:1px solid ${PINK_LINE}">Fecha de emisión: <span style="color:${ACCENT}">${fechaFmt(meta.fechaEmision)}</span></td>
    </tr>
    <tr style="background:#fce7f3">
      <td style="padding:6px 12px;font-weight:800;color:${LABEL};border-bottom:1px solid ${PINK_LINE}">A la atención de</td>
      <td style="padding:6px 12px;font-weight:800;color:${LABEL};width:130px;border-bottom:1px solid ${PINK_LINE};border-left:1px solid ${PINK_LINE}">Pago por</td>
      <td style="padding:6px 12px;font-weight:800;color:${LABEL};width:130px;border-bottom:1px solid ${PINK_LINE};border-left:1px solid ${PINK_LINE}">N.º de factura</td>
    </tr>
    <tr style="background:#fff">
      <td style="padding:7px 12px;font-weight:700;color:${VALUE};border-bottom:1px solid #fce7f3">${escapeHtml(meta.modeloNombreFiscal)}${meta.modeloIdentificador ? ' &mdash; ' + escapeHtml(meta.modeloIdentificador) : ''}</td>
      <td style="padding:7px 12px;border-left:1px solid ${PINK_LINE};font-weight:700;color:${VALUE};border-bottom:1px solid #fce7f3">${escapeHtml(meta.pagoPor)}</td>
      <td style="padding:7px 12px;border-left:1px solid ${PINK_LINE};font-weight:800;color:${ACCENT};border-bottom:1px solid #fce7f3;font-size:13px">${meta.numero}</td>
    </tr>
    ${meta.modeloDireccion ? `<tr style="background:#fff"><td colspan="3" style="padding:6px 12px;color:${VALUE};font-weight:600;border-bottom:1px solid #fce7f3">${escapeHtml(meta.modeloDireccion)}</td></tr>` : ''}
    <tr style="background:#fce7f3">
      <td style="padding:6px 12px;font-weight:800;color:${LABEL};border-bottom:1px solid ${PINK_LINE}">En concepto de</td>
      <td style="padding:6px 12px;font-weight:800;color:${LABEL};border-bottom:1px solid ${PINK_LINE};border-left:1px solid ${PINK_LINE}">% de fact</td>
      <td style="padding:6px 12px;font-weight:800;color:${LABEL};border-bottom:1px solid ${PINK_LINE};border-left:1px solid ${PINK_LINE}">Vencimiento</td>
    </tr>
    <tr style="background:#fff">
      <td style="padding:7px 12px;font-weight:700;color:${VALUE}">${escapeHtml(meta.concepto)}</td>
      <td style="padding:7px 12px;border-left:1px solid ${PINK_LINE};font-weight:800;color:${ACCENT}">${meta.porcentaje}%</td>
      <td style="padding:7px 12px;border-left:1px solid ${PINK_LINE};font-weight:700;color:${VALUE}">${fechaFmt(meta.vencimiento)}</td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;background:#fff;font-size:11.5px;border:1.5px solid ${ACCENT}">
    <thead>
      <tr style="background:${ACCENT}">
        <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase">Descripción</th>
        <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:800;width:90px;letter-spacing:0.04em;text-transform:uppercase">Monto</th>
        <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:800;width:55px;letter-spacing:0.04em;text-transform:uppercase">Cant.</th>
        <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:800;width:170px;letter-spacing:0.04em;text-transform:uppercase">Observ.</th>
        <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:800;width:100px;letter-spacing:0.04em;text-transform:uppercase">% Agencia</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || `<tr><td colspan="5" style="padding:18px;text-align:center;color:#9ca3af;background:#fafafa;font-size:11px">Sin ítems para facturar este período.</td></tr>`}
    </tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:11.5px">
    <tr>
      <td style="width:60%"></td>
      <td style="padding:6px 12px;text-align:right;color:${LABEL};font-weight:800;font-size:12px;border-bottom:1px solid #fce7f3">Subtotal</td>
      <td style="padding:6px 12px;text-align:right;color:${VALUE};font-weight:800;width:120px;font-size:12px;border-bottom:1px solid #fce7f3">${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:5px 12px;text-align:right;color:${LABEL};font-weight:700;border-bottom:1px solid #fce7f3">IVA</td>
      <td style="padding:5px 12px;text-align:right;color:${VALUE};font-weight:700;border-bottom:1px solid #fce7f3">${fmt(iva)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:10px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:14px;letter-spacing:0.02em;text-transform:uppercase">Total a pagar</td>
      <td style="padding:10px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:22px;letter-spacing:-0.5px;line-height:1">${fmt(total)}</td>
    </tr>
  </table>

  ${meta.serviciosPie ? `
    <div style="margin-top:12px;padding:10px 13px;background:${PINK_BG};border-left:4px solid ${ACCENT};color:${LABEL};font-size:10px;line-height:1.5;font-weight:600">
      <strong style="color:${ACCENT};text-transform:uppercase;letter-spacing:0.06em;font-size:9.5px">Servicios incluidos:</strong><br>
      ${escapeHtml(meta.serviciosPie)}
    </div>
  ` : ''}

  <div style="margin-top:10px;text-align:center;color:#9ca3af;font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
    BraveGirls Agency LLC · Delaware · ${new Date().getFullYear()}
  </div>

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
            await renderHtmlToPdf(html, `Factura-${rr.data.entidad_id}-${rr.data.mes}-${rr.data.numero}.pdf`);
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
          <td>${g.categoria ? `<span class="pill cat-${escapeHtml(g.categoria)}">${escapeHtml(g.categoria)}</span>` : '<span class="muted">—</span>'}</td>
          <td>${escapeHtml(g.paga || 'AGENCIA')}</td>
          <td class="muted" style="max-width:280px;white-space:normal">${escapeHtml(g.observaciones || '—')}</td>
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
            <thead><tr><th>Descripción</th><th>Categoría</th><th>Paga</th><th>Observación</th><th style="text-align:right">Monto</th><th style="text-align:right">Acciones</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty-state">Aún no hay gastos registrados este mes.</td></tr>'}</tbody>
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
      const chHue = hueOfName(c.nombre);
      return `
        <div class="liq-chip${isActive ? ' active' : ''}" data-chatter-id="${c.id}" style="--ent-hue:${chHue}">
          <div class="liq-chip-name"><span class="pill-entity" style="--ent-hue:${chHue}">${c.nombre}</span>${c.es_team_leader ? ' <span class="pill gold mini">TL</span>' : ''}</div>
          <div class="liq-chip-amounts">
            <span class="liq-chip-neto">${fmtMoney(neto)}</span>
            <span class="liq-chip-falta ${falta > 0 ? 'pending' : 'ok'}">${falta > 0 ? '−' + fmtMoney(falta) : '✓'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Constructor de fila genérico: tipo + entity_id + nombre + monto + envíos.
    const buildSumRow = (cfg) => {
      const e1 = Number(cfg.e1 || 0), e2 = Number(cfg.e2 || 0), e3 = Number(cfg.e3 || 0);
      const neto = Number(cfg.neto || 0);
      const falta = neto - e1 - e2 - e3;
      const pagadoTotal = e1 + e2 + e3;
      const estado = neto <= 0 ? 'sin-datos' : (falta <= 0.01 ? 'pagado' : (pagadoTotal > 0 ? 'parcial' : 'pendiente'));
      const estadoLbl = { 'sin-datos': '—', 'pagado': '✓ Pagado', 'parcial': '◐ Parcial', 'pendiente': '○ Pendiente' }[estado];
      const estadoClass = { 'sin-datos': 'muted', 'pagado': 'pill green', 'parcial': 'pill amber', 'pendiente': 'pill red' }[estado];
      const tag = cfg.tag ? ` ${cfg.tag}` : '';
      const detailBtn = cfg.detail ? `<button class="btn-ghost-small sum-detail" type="button" title="Abrir detalle">→</button>` : '';
      const emailHtml = cfg.email
        ? `<button class="btn-ghost-small email-copy" type="button" data-email="${escapeHtml(cfg.email)}" title="Copiar ${escapeHtml(cfg.email)}" style="padding:3px 10px;font-size:.7rem;margin-left:4px">✉ copiar</button>`
        : '<span class="muted mini" style="margin-left:4px;font-size:.7rem">sin email</span>';
      const hue = hueOf(cfg.nombre);
      return `
        <tr data-sum-kind="${cfg.kind}" data-sum-id="${cfg.entityId || ''}">
          <td>
            <span class="pill-entity" style="--ent-hue:${hue}">${escapeHtml(cfg.nombre)}</span>${tag}
            ${emailHtml}
          </td>
          <td style="text-align:right;font-weight:700;color:var(--gold)">${fmtMoney(neto)}</td>
          <td><input type="number" step="0.01" class="sum-e1" value="${e1 || ''}" placeholder="0" style="max-width:110px;text-align:right"></td>
          <td><input type="number" step="0.01" class="sum-e2" value="${e2 || ''}" placeholder="0" style="max-width:110px;text-align:right"></td>
          <td><input type="number" step="0.01" class="sum-e3" value="${e3 || ''}" placeholder="0" style="max-width:110px;text-align:right"></td>
          <td style="text-align:right;font-weight:700" class="sum-falta-cell">${fmtMoney(falta)}</td>
          <td><span class="${estadoClass}">${estadoLbl}</span></td>
          <td style="text-align:right">
            <button class="btn-ghost-small sum-save" type="button" title="Guardar envíos">💾</button>
            ${detailBtn}
          </td>
        </tr>
      `;
    };
    const hueOf = (n) => [...(n || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;

    // Chatters
    const chatterRows = chatters.map(c => {
      const p = liqState.pagos_by_chatter[c.id] || {};
      return buildSumRow({
        kind: 'chatter',
        entityId: c.id,
        nombre: c.nombre,
        email: c.email,
        tag: c.es_team_leader ? '<span class="pill gold mini">TL</span>' : '',
        neto: p.neto_a_pagar,
        e1: p.envio_1, e2: p.envio_2, e3: p.envio_3,
        detail: true
      });
    }).join('');

    // Supervisor (si existe)
    const sup = liqState.supervisor;
    const supPago = liqState.supervisor_pago || {};
    const supRow = sup ? buildSumRow({
      kind: 'supervisor',
      entityId: sup.id,
      nombre: sup.nombre,
      email: sup.email,
      tag: '<span class="pill pink mini">SUP</span>',
      neto: supPago.neto_a_pagar,
      e1: supPago.envio_1, e2: supPago.envio_2, e3: supPago.envio_3,
      detail: false
    }) : '';

    // Equipo fijo
    const rolSlug = (r) => String(r || 'equipo').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const equipoRows = (liqState.equipo || []).map(e => {
      const p = (liqState.pagos_by_equipo || {})[e.id] || {};
      const monto = Number(p.monto != null ? p.monto : e.sueldo_mensual_usd || 0);
      return buildSumRow({
        kind: 'equipo',
        entityId: e.id,
        nombre: e.nombre,
        email: e.email,
        tag: `<span class="pill pill-rol mini rol-${rolSlug(e.rol)}">${escapeHtml(e.rol || 'Equipo')}</span>`,
        neto: monto,
        e1: p.envio_1, e2: p.envio_2, e3: p.envio_3,
        detail: false
      });
    }).join('');

    // Totales globales
    const sumEnv = (p) => Number(p?.envio_1 || 0) + Number(p?.envio_2 || 0) + Number(p?.envio_3 || 0);
    let totalNeto = chatters.reduce((s, c) => s + Number(liqState.pagos_by_chatter[c.id]?.neto_a_pagar || 0), 0);
    let totalEnviado = chatters.reduce((s, c) => s + sumEnv(liqState.pagos_by_chatter[c.id]), 0);
    if (sup) { totalNeto += Number(supPago.neto_a_pagar || 0); totalEnviado += sumEnv(supPago); }
    (liqState.equipo || []).forEach(e => {
      const p = (liqState.pagos_by_equipo || {})[e.id] || {};
      const monto = Number(p.monto != null ? p.monto : e.sueldo_mensual_usd || 0);
      totalNeto += monto;
      totalEnviado += sumEnv(p);
    });
    const totalFalta = totalNeto - totalEnviado;

    const sectionHead = (txt) => `<tr class="sum-section-head"><td colspan="8"><span class="muted" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:800">${txt}</span></td></tr>`;
    const sumRows = chatterRows
      + (supRow ? sectionHead('Supervisor') + supRow : '')
      + (equipoRows ? sectionHead('Equipo fijo') + equipoRows : '');

    view.innerHTML = `
      <div class="card" style="margin-bottom:18px">
        <div class="card-head-row">
          <div class="card-title-row">
            <span class="card-title">▣ Resumen de envíos · ${mes}</span>
            <span class="count-badge">${chatters.length}</span>
          </div>
          <div style="display:flex;gap:18px;align-items:center">
            <div><span class="muted mini">Neto total</span> <strong style="color:var(--gold);font-family:var(--font-display);font-size:1.05rem;margin-left:6px">${fmtMoney(totalNeto)}</strong></div>
            <div><span class="muted mini">Enviado</span> <strong style="color:var(--green);font-family:var(--font-display);font-size:1.05rem;margin-left:6px">${fmtMoney(totalEnviado)}</strong></div>
            <div><span class="muted mini">Falta</span> <strong style="color:${totalFalta > 0.01 ? 'var(--red)' : 'var(--green)'};font-family:var(--font-display);font-size:1.05rem;margin-left:6px">${fmtMoney(totalFalta)}</strong></div>
          </div>
        </div>
        <div class="table-wrap-inner" style="margin-top:10px">
          <table id="liq-sum-table" class="liq-sum-table">
            <thead>
              <tr>
                <th>Chatter</th>
                <th style="text-align:right">Total a pagar</th>
                <th>1° envío</th>
                <th>2° envío</th>
                <th>3° envío</th>
                <th style="text-align:right">Falta pagar</th>
                <th>Estado</th>
                <th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>${sumRows}</tbody>
          </table>
        </div>
      </div>

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

    // Handlers tabla resumen: guardar envíos + abrir detalle
    view.querySelectorAll('.sum-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const kind = tr.dataset.sumKind;
        const entityId = Number(tr.dataset.sumId);
        const e1 = Number(tr.querySelector('.sum-e1').value || 0);
        const e2 = Number(tr.querySelector('.sum-e2').value || 0);
        const e3 = Number(tr.querySelector('.sum-e3').value || 0);
        const body = { mes, kind, envio_1: e1, envio_2: e2, envio_3: e3 };
        if (kind === 'chatter') body.chatter_id = entityId;
        else if (kind === 'equipo') body.equipo_id = entityId;
        try {
          const r = await api('envios-update', { method: 'POST', body });
          // Reflejar en liqState para que la próxima render quede coherente
          if (kind === 'chatter') {
            const p = liqState.pagos_by_chatter[entityId] || {};
            p.envio_1 = e1; p.envio_2 = e2; p.envio_3 = e3; p.falta_pagar = r.falta;
            liqState.pagos_by_chatter[entityId] = p;
          } else if (kind === 'supervisor') {
            const p = liqState.supervisor_pago || {};
            p.envio_1 = e1; p.envio_2 = e2; p.envio_3 = e3; p.falta_pagar = r.falta;
            liqState.supervisor_pago = p;
          } else if (kind === 'equipo') {
            const p = (liqState.pagos_by_equipo[entityId] || {});
            p.envio_1 = e1; p.envio_2 = e2; p.envio_3 = e3; p.falta_pagar = r.falta;
            liqState.pagos_by_equipo[entityId] = p;
          }
          tr.querySelector('.sum-falta-cell').textContent = fmtMoney(r.falta);
          toast('Envíos actualizados', 'success');
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    });
    view.querySelectorAll('.sum-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const chId = Number(btn.closest('tr').dataset.sumId);
        liqState.selected = chId;
        drawLiquidacion(view);
        document.getElementById('liq-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    // Copiar email al clipboard
    view.querySelectorAll('.email-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const email = btn.dataset.email;
        try {
          await navigator.clipboard.writeText(email);
          toast(`✉ ${email} copiado`, 'success');
        } catch (err) {
          toast('No se pudo copiar', 'error');
        }
      });
    });

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
    const { cuentas, detalle_by_chatter, pagos_by_chatter, transaction_fee_pct, incentivo_mes, asignaciones_by_chatter } = liqState;
    const detalle = detalle_by_chatter[chatter.id] || [];
    const pago = pagos_by_chatter[chatter.id] || {};
    const detByCuenta = {};
    detalle.forEach(d => { detByCuenta[d.cuenta_id] = d; });

    const incIndiv = Array.isArray(pago.incentivos_individuales) ? pago.incentivos_individuales : [];
    const esGanadorIncentivoMes = incentivo_mes && incentivo_mes.chatter_id === chatter.id;

    // Filtro por asignación del chatter. Si no hay asignaciones → mostrar todas (backward compat)
    const asignSet = new Set(asignaciones_by_chatter?.[chatter.id] || []);
    const cuentasFiltradas = asignSet.size > 0
      ? cuentas.filter(c => asignSet.has(c.id))
      : cuentas;

    const cuentasRows = cuentasFiltradas.map(cu => {
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
            ${chatter.email ? `<div style="margin-top:8px;display:flex;align-items:center;gap:8px;font-size:.85rem"><span class="muted">📧</span><code style="background:rgba(255,255,255,0.05);padding:3px 8px;border-radius:6px;color:var(--text)">${escapeHtml(chatter.email)}</code><button class="btn-ghost-small email-copy-detail" data-email="${escapeHtml(chatter.email)}" style="padding:3px 10px;font-size:.7rem">✉ copiar</button></div>` : '<div class="muted" style="font-size:.78rem;margin-top:6px;color:rgba(251,146,60,0.7)">⚠️ Email no cargado · editá el chatter en Catálogo</div>'}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary" id="liq-assign-btn" style="width:auto;padding:12px 18px;margin:0" title="Elegir qué cuentas trabaja este chatter">⚙ Cuentas asignadas (${asignSet.size || 'todas'})</button>
            <button class="btn-primary" id="liq-save-btn" style="width:auto;padding:12px 22px;margin:0">💾 Guardar liquidación</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Comisión por cuenta · <span class="muted" style="font-size:0.85rem;font-weight:400">${cuentasFiltradas.length} cuenta${cuentasFiltradas.length === 1 ? '' : 's'}</span></h3>
        <div class="table-wrap">
          <table class="liq-table">
            <thead>
              <tr><th>Cuenta</th><th>Facturación chatter</th><th>%</th><th style="text-align:right">Comisión</th><th>Observación</th></tr>
            </thead>
            <tbody>${cuentasRows || '<tr><td colspan="5" class="empty-state">Sin cuentas asignadas. Tocá "⚙ Cuentas asignadas" arriba para configurar.</td></tr>'}</tbody>
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
    document.getElementById('liq-assign-btn').addEventListener('click', () => openAsignacionModal(chatter));
    main.querySelectorAll('.email-copy-detail').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        try { await navigator.clipboard.writeText(email); toast(`✉ ${email} copiado`, 'success'); }
        catch (_) { toast('No se pudo copiar', 'error'); }
      });
    });
    recalc();
  }

  // Modal para asignar cuentas a un chatter
  function openAsignacionModal(chatter) {
    const { cuentas, asignaciones_by_chatter } = liqState;
    const asignActuales = new Set(asignaciones_by_chatter?.[chatter.id] || []);
    const hayAsignaciones = asignActuales.size > 0;

    // Agrupar cuentas por modelo
    const porModelo = {};
    cuentas.forEach(c => {
      if (!porModelo[c.modelo_nombre]) porModelo[c.modelo_nombre] = [];
      porModelo[c.modelo_nombre].push(c);
    });

    const gruposHtml = Object.keys(porModelo).sort().map(modelo => {
      const cuentasMod = porModelo[modelo];
      const checkboxes = cuentasMod.map(c => {
        const checked = asignActuales.has(c.id) || !hayAsignaciones ? 'checked' : '';
        return `
          <label class="asign-row">
            <input type="checkbox" class="asign-chk" value="${c.id}" ${checked}>
            <span class="asign-cuenta">${c.nombre_cuenta}${c.tipo ? ` <span class="pill mini tipo-${String(c.tipo).toLowerCase()}">${c.tipo}</span>` : ''}</span>
          </label>
        `;
      }).join('');
      return `
        <div class="asign-grupo">
          <div class="asign-modelo">${modelo}</div>
          ${checkboxes}
        </div>
      `;
    }).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:680px">
        <div class="modal-header">
          <div class="modal-title">⚙ Cuentas asignadas · ${chatter.nombre}</div>
          <button class="modal-close" id="asign-close" type="button">✕</button>
        </div>
        <div style="padding:18px 22px 22px">
          <p class="muted" style="font-size:0.9rem;margin:0 0 12px">
            Tildá solo las cuentas en las que este chatter trabaja. Las desmarcadas no van a aparecer en su liquidación.
            ${!hayAsignaciones ? '<br><strong style="color:var(--gold)">Hoy todas están activas por default.</strong>' : ''}
          </p>

          <div style="display:flex;gap:8px;margin:14px 0">
            <button class="btn-ghost-small" id="asign-all" type="button">Tildar todas</button>
            <button class="btn-ghost-small" id="asign-none" type="button">Destildar todas</button>
          </div>

          <div class="asign-list">${gruposHtml}</div>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
            <button class="btn-secondary" id="asign-cancel" type="button" style="width:auto;padding:10px 18px;margin:0">Cancelar</button>
            <button class="btn-primary" id="asign-save" type="button" style="width:auto;padding:10px 20px;margin:0">💾 Guardar asignaciones</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#asign-close').addEventListener('click', close);
    backdrop.querySelector('#asign-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#asign-all').addEventListener('click', () => {
      backdrop.querySelectorAll('.asign-chk').forEach(c => c.checked = true);
    });
    backdrop.querySelector('#asign-none').addEventListener('click', () => {
      backdrop.querySelectorAll('.asign-chk').forEach(c => c.checked = false);
    });

    backdrop.querySelector('#asign-save').addEventListener('click', async () => {
      const cuenta_ids = Array.from(backdrop.querySelectorAll('.asign-chk:checked')).map(c => Number(c.value));
      try {
        await api('chatter-cuentas', { method: 'POST', body: { chatter_id: chatter.id, cuenta_ids } });
        toast(`${cuenta_ids.length} cuenta${cuenta_ids.length === 1 ? '' : 's'} asignada${cuenta_ids.length === 1 ? '' : 's'} a ${chatter.nombre}`, 'success');
        close();
        renderLiquidacion(document.getElementById('view'));
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
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
    const btn = document.getElementById('liq-save-btn');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando…'; }
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
    } catch (e) {
      toast('Error: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
    }
  }

  async function generarLiquidacionPDF(chatter) {
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
    const fee = Number(liqState.transaction_fee_pct) || 0;
    const neto = bruto * (1 - fee / 100);

    const [py, pm] = (liqState.mes || '').split('-').map(Number);
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const periodoTxt = py && pm ? `${meses[pm-1]} ${py}` : (liqState.mes || '');
    const lastDay = py && pm ? new Date(py, pm, 0).getDate() : 31;
    const periodoFull = py && pm ? `01 al ${lastDay} de ${meses[pm-1]} ${py}` : '';

    const fechaHoy = new Date().toLocaleDateString('es-AR');

    const customLogo = (window.AGENCY_LOGO_DATA_URI || '').trim();
    const logoHtml = customLogo
      ? `<img src="${customLogo}" alt="BraveGirls" width="78" height="78" style="display:block;object-fit:contain;border-radius:10px"/>`
      : `<div style="width:78px;height:78px;border-radius:14px;background:#be185d;color:#fff;text-align:center;line-height:78px;font-weight:900;font-size:22px;font-family:Arial,sans-serif;letter-spacing:0.04em">BG</div>`;

    const ACCENT = '#be185d';
    const LABEL = '#6b1c4a';
    const VALUE = '#0f172a';
    const PINK_BG = '#fdf2f8';
    const PINK_LINE = '#f9a8d4';

    const bodyRows = [];
    rows.forEach(r => {
      bodyRows.push(`
        <tr style="background:#fff">
          <td style="padding:8px 10px;font-size:11.5px;color:${VALUE};font-weight:600;border-bottom:1px solid #fce7f3">${escapeHtml(r.cuenta)}</td>
          <td style="padding:8px 10px;text-align:right;font-size:11.5px;color:${VALUE};border-bottom:1px solid #fce7f3">${fmtMoney(r.fact)}</td>
          <td style="padding:8px 10px;text-align:right;font-size:11.5px;color:${VALUE};border-bottom:1px solid #fce7f3">${r.pct}%</td>
          <td style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px;color:${VALUE};border-bottom:1px solid #fce7f3">${fmtMoney(r.com)}</td>
        </tr>`);
    });
    if (tl) bodyRows.push(`
      <tr style="background:#fffbeb">
        <td colspan="3" style="padding:8px 10px;font-size:11.5px;color:#92400e;font-weight:700;border-bottom:1px solid #fde68a">Team Leader (bonus fijo)</td>
        <td style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px;color:#92400e;border-bottom:1px solid #fde68a">${fmtMoney(tl)}</td>
      </tr>`);
    incs.forEach(i => bodyRows.push(`
      <tr style="background:#f5f3ff">
        <td colspan="3" style="padding:8px 10px;font-size:11.5px;color:#4c1d95;font-weight:700;border-bottom:1px solid #ddd6fe">${escapeHtml(i.desc)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px;color:#4c1d95;border-bottom:1px solid #ddd6fe">${fmtMoney(i.monto)}</td>
      </tr>`));
    if (incMes) bodyRows.push(`
      <tr style="background:#ecfdf5">
        <td colspan="3" style="padding:8px 10px;font-size:11.5px;color:#064e3b;font-weight:700;border-bottom:1px solid #a7f3d0">Incentivo del mes</td>
        <td style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px;color:#064e3b;border-bottom:1px solid #a7f3d0">${fmtMoney(incMes)}</td>
      </tr>`);
    if (bodyRows.length === 0) bodyRows.push(`
      <tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;font-size:11px;background:#fafafa">Sin ítems facturables este período.</td></tr>`);

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;padding:20px 24px;color:${VALUE};background:#fff;width:100%;box-sizing:border-box">

  <table style="width:100%;border-collapse:collapse;margin-bottom:12px;background:${PINK_BG};border:2px solid ${ACCENT};border-radius:8px">
    <tr>
      <td style="vertical-align:middle;padding:12px 16px;width:60%">
        <div style="font-size:21px;font-weight:900;color:${ACCENT};letter-spacing:-0.5px;line-height:1.1;font-family:Arial,sans-serif">BraveGirls Agency LLC</div>
        <div style="font-size:10px;color:#374151;margin-top:3px;font-weight:600">Liquidación de Chatter &middot; Documento interno</div>
        <div style="font-size:9.5px;color:${LABEL};text-transform:uppercase;letter-spacing:0.08em;font-weight:800;margin-top:6px">Emisión: <span style="color:${VALUE}">${fechaHoy}</span></div>
      </td>
      <td style="vertical-align:middle;text-align:right;padding:10px 16px 10px 0;width:90px">
        ${logoHtml}
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <tr>
      <td style="vertical-align:bottom">
        <div style="font-size:26px;color:${ACCENT};font-weight:900;letter-spacing:-1px;line-height:1;font-family:Arial,sans-serif">Liquidación</div>
        <div style="font-size:12px;color:${VALUE};font-weight:700;margin-top:4px">Chatter: <strong style="color:${ACCENT}">${escapeHtml(chatter.nombre)}</strong></div>
      </td>
      <td style="vertical-align:bottom;text-align:right">
        <div style="display:inline-block;background:${ACCENT};color:#fff;padding:5px 12px;border-radius:5px;font-size:10.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-family:Arial,sans-serif">Período &middot; ${periodoFull || periodoTxt}</div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;background:#fff;font-size:11.5px;border:1.5px solid ${ACCENT};margin-top:6px">
    <thead>
      <tr style="background:${ACCENT}">
        <th style="padding:9px;text-align:left;color:#fff;font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase">Cuenta</th>
        <th style="padding:9px;text-align:right;color:#fff;font-size:11px;font-weight:800;width:110px;letter-spacing:0.04em;text-transform:uppercase">Facturación</th>
        <th style="padding:9px;text-align:right;color:#fff;font-size:11px;font-weight:800;width:60px;letter-spacing:0.04em;text-transform:uppercase">%</th>
        <th style="padding:9px;text-align:right;color:#fff;font-size:11px;font-weight:800;width:120px;letter-spacing:0.04em;text-transform:uppercase">Comisión</th>
      </tr>
    </thead>
    <tbody>${bodyRows.join('')}</tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12px">
    <tr>
      <td style="width:55%"></td>
      <td style="padding:7px 12px;text-align:right;color:${LABEL};font-weight:800;font-size:12px;border-bottom:1px solid #fce7f3">Total bruto</td>
      <td style="padding:7px 12px;text-align:right;color:${VALUE};font-weight:800;width:130px;font-size:12px;border-bottom:1px solid #fce7f3">${fmtMoney(bruto)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:5px 12px;text-align:right;color:${LABEL};font-weight:700;border-bottom:1px solid #fce7f3">Transaction fee (${fee}%)</td>
      <td style="padding:5px 12px;text-align:right;color:#dc2626;font-weight:800;border-bottom:1px solid #fce7f3">&minus;${fmtMoney(bruto - neto)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:12px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:14px;letter-spacing:0.02em;text-transform:uppercase">Neto a pagar</td>
      <td style="padding:12px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:24px;letter-spacing:-0.5px;line-height:1">${fmtMoney(neto)}</td>
    </tr>
  </table>

  <div style="margin-top:14px;text-align:center;color:#9ca3af;font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
    Documento interno &middot; BraveGirls Agency LLC &middot; ${new Date().getFullYear()}
  </div>

</div>`;
    await renderHtmlToPdf(html, `liquidacion_${chatter.nombre.replace(/\s+/g, '_')}_${liqState.mes}.pdf`);
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
        const modeloHue = hueOfName(g.modelo);
        let totalCobrar = 0, totalRecibido = 0, totalComision = 0, totalPendiente = 0;
        const rowsHtml = g.items.map(c => {
          const recibido = Number(c.pago_recibido || 0);
          const comision = Number(c.comision_transaccion || 0);
          const totalC = Number(c.total_a_cobrar || 0);
          const pendiente = totalC - recibido - comision;
          const pctComision = totalC > 0 ? (comision / totalC) * 100 : 0;
          totalCobrar += totalC;
          totalRecibido += recibido;
          totalComision += comision;
          totalPendiente += pendiente;
          return `
            <tr data-cierre-id="${c.id}">
              <td><strong>${c.nombre_cuenta}</strong> ${c.tipo ? `<span class="pill mini tipo-${String(c.tipo).toLowerCase()}">${c.tipo}</span>` : ''}</td>
              <td style="text-align:right">${fmtMoney(totalC, c.moneda)}</td>
              <td><input type="number" step="0.01" class="cob-recibido" value="${recibido || 0}" style="max-width:130px"></td>
              <td>
                <div style="display:flex;gap:4px;align-items:center">
                  <input type="number" step="0.01" class="cob-comision" value="${comision || 0}" style="max-width:100px" title="Fee de la transacción (Paxum/Binance/etc)">
                  <button type="button" class="btn-ghost-small cob-comision-auto" title="Marcar diferencia como comisión" style="padding:4px 8px;font-size:.7rem">= dif</button>
                </div>
                <div class="cob-comision-pct muted mini" style="margin-top:2px;font-size:.7rem">${comision > 0 ? pctComision.toFixed(2) + '%' : ''}</div>
              </td>
              <td style="text-align:right" class="cob-pendiente">${fmtMoney(pendiente, c.moneda)}</td>
              <td><input type="text" class="cob-medio" value="${c.medio_pago || ''}" placeholder="${c.moneda} · Transf"></td>
              <td>
                <select class="cob-estado state-${c.estado_resumen || 'pendiente'}" data-state="${c.estado_resumen || 'pendiente'}">
                  <option value="pendiente"  ${c.estado_resumen === 'pendiente' ? 'selected' : ''}>○ Pendiente</option>
                  <option value="enviado"    ${c.estado_resumen === 'enviado' ? 'selected' : ''}>◐ Enviado</option>
                  <option value="confirmado" ${c.estado_resumen === 'confirmado' ? 'selected' : ''}>✓ Confirmado</option>
                </select>
              </td>
              <td><button class="btn-ghost-small cob-save" data-cierre-id="${c.id}">💾</button></td>
            </tr>
          `;
        }).join('');
        const pctTotalCom = totalCobrar > 0 ? (totalComision / totalCobrar) * 100 : 0;
        return `
          <div class="card" style="border-left:3px solid hsl(${modeloHue},70%,55%)">
            <div class="flex-between" style="margin-bottom:14px">
              <div>
                <span class="pill-entity" style="--ent-hue:${modeloHue};font-size:.95rem;padding:5px 14px"><strong>${g.modelo}</strong></span>
                <div class="muted" style="font-size:.85rem;margin-top:4px">${g.moneda}</div>
              </div>
              <div style="display:flex;gap:18px;flex-wrap:wrap">
                <div><div class="muted mini">A cobrar</div><div style="font-weight:700">${fmtMoney(totalCobrar, g.moneda)}</div></div>
                <div><div class="muted mini">Recibido</div><div style="font-weight:700;color:var(--green)">${fmtMoney(totalRecibido, g.moneda)}</div></div>
                <div><div class="muted mini">Comisión ${totalComision > 0 ? `(${pctTotalCom.toFixed(1)}%)` : ''}</div><div style="font-weight:700;color:var(--gold)">${fmtMoney(totalComision, g.moneda)}</div></div>
                <div><div class="muted mini">Pendiente</div><div style="font-weight:700;color:${totalPendiente > 0.01 ? 'var(--red)' : 'var(--green)'}">${fmtMoney(totalPendiente, g.moneda)}</div></div>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th style="text-align:right">A cobrar</th>
                    <th>Recibido</th>
                    <th>Comisión transacción</th>
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

      // Recalculo inline de Pendiente al editar Recibido o Comisión
      const recalcRow = (tr) => {
        const cob = Number(tr.querySelector('.cob-recibido').value || 0);
        const com = Number(tr.querySelector('.cob-comision').value || 0);
        // total_a_cobrar está en la 2da celda; lo extraigo de los datos del row original
        const cierreId = tr.dataset.cierreId;
        const data = rows.find(x => String(x.id) === String(cierreId));
        const total = data ? Number(data.total_a_cobrar || 0) : 0;
        const pendiente = total - cob - com;
        const pctCell = tr.querySelector('.cob-comision-pct');
        if (pctCell) pctCell.textContent = com > 0 && total > 0 ? ((com / total) * 100).toFixed(2) + '%' : '';
        const pendCell = tr.querySelector('.cob-pendiente');
        if (pendCell) {
          pendCell.textContent = fmtMoney(pendiente, data?.moneda);
          pendCell.style.color = Math.abs(pendiente) < 0.01 ? 'var(--green)' : (pendiente > 0 ? 'var(--red)' : 'var(--gold)');
        }
      };
      view.querySelectorAll('tr[data-cierre-id]').forEach(tr => {
        tr.querySelector('.cob-recibido')?.addEventListener('input', () => recalcRow(tr));
        tr.querySelector('.cob-comision')?.addEventListener('input', () => recalcRow(tr));
      });
      // Sincronizar color del select de estado al cambiar
      view.querySelectorAll('.cob-estado').forEach(sel => {
        sel.addEventListener('change', () => {
          sel.classList.remove('state-pendiente','state-enviado','state-confirmado');
          sel.classList.add('state-' + sel.value);
          sel.dataset.state = sel.value;
        });
      });

      // "= dif" → comision = total - recibido (cierra el cobro marcando todo el faltante como fee)
      view.querySelectorAll('.cob-comision-auto').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = btn.closest('tr');
          const cierreId = tr.dataset.cierreId;
          const data = rows.find(x => String(x.id) === String(cierreId));
          const total = data ? Number(data.total_a_cobrar || 0) : 0;
          const cob = Number(tr.querySelector('.cob-recibido').value || 0);
          const dif = Math.max(0, total - cob);
          tr.querySelector('.cob-comision').value = dif.toFixed(2);
          recalcRow(tr);
        });
      });

      view.querySelectorAll('.cob-save').forEach(b => {
        b.addEventListener('click', async () => {
          const id = Number(b.dataset.cierreId);
          const tr = b.closest('tr');
          const body = {
            cierre_id: id,
            pago_recibido: Number(tr.querySelector('.cob-recibido').value || 0),
            comision_transaccion: Number(tr.querySelector('.cob-comision').value || 0),
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
      const subsSource = s.suscripciones_origen === 'manual' ? 'manual' : 'automatico';
      const supHue = hueOfName(supName);
      const ventasRows = s.ventas_detalle.map(v => {
        const chHue = hueOfName(v.chatter);
        return `
        <tr>
          <td><span class="pill-entity" style="--ent-hue:${chHue}">${v.chatter}</span></td>
          <td style="text-align:right;color:#FDE047;font-weight:700">${fmtMoney(v.fact_chatter)}</td>
          <td style="text-align:right;color:var(--text-mute)">${v.porcentaje_supervisor}%</td>
          <td style="text-align:right;font-weight:800;color:#34D399">${fmtMoney(v.comision)}</td>
        </tr>`;
      }).join('');

      view.innerHTML = `
        <div class="sup-head card">
          <div class="sup-head-left">
            <span class="pill-entity" style="--ent-hue:${supHue};font-size:1rem;padding:6px 14px"><strong>★ ${supName}</strong></span>
            <div class="muted" style="font-size:0.82rem;margin-top:6px">Supervisor del mes · suscripciones <strong>${subsSource}</strong></div>
          </div>
          <div class="sup-head-stats">
            <div class="sup-stat">
              <div class="sup-stat-lbl">SFS Control</div>
              <div class="sup-stat-val" style="color:#7DD3FC">${fmtMoney(s.sfs_control)}</div>
            </div>
            <div class="sup-stat sup-stat-input">
              <div class="sup-stat-lbl">Suscripciones</div>
              <div class="sup-stat-input-wrap">
                <input type="number" step="0.01" min="0" id="sup-subs-input" value="${Number(s.suscripciones_totales || 0).toFixed(2)}">
                <button class="btn-ghost-small" id="sup-subs-save" title="Guardar suscripciones manuales">💾</button>
              </div>
            </div>
            <div class="sup-stat">
              <div class="sup-stat-lbl">5% s/ subs</div>
              <div class="sup-stat-val" style="color:#FDE047">${fmtMoney(s.comision_suscripciones)}</div>
            </div>
            <div class="sup-stat">
              <div class="sup-stat-lbl">% s/ ventas chatters</div>
              <div class="sup-stat-val" style="color:#34D399">${fmtMoney(s.comision_ventas_chatters)}</div>
            </div>
          </div>
          <div class="sup-head-actions">
            <button class="btn-primary" id="sup-pdf">📥 Liquidación PDF</button>
          </div>
        </div>

        <div class="card sup-detail-card">
          <div class="flex-between" style="margin-bottom:10px">
            <h3 style="margin:0">Detalle por chatter <span class="muted" style="font-weight:400;font-size:0.9rem">· ${s.ventas_detalle.length} chatters</span></h3>
          </div>
          <div class="table-wrap">
            <table class="sup-table">
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
      document.getElementById('sup-subs-save').addEventListener('click', async () => {
        const val = Number(document.getElementById('sup-subs-input').value || 0);
        if (Number.isNaN(val) || val < 0) {
          toast('Suscripciones inválidas', 'error');
          return;
        }
        try {
          await api('supervisor-mes', {
            method: 'POST',
            body: { mes, suscripciones_totales: val }
          });
          toast('Suscripciones manuales guardadas', 'success');
          renderSupervisor(view);
        } catch (e) {
          toast('Error: ' + e.message, 'error');
        }
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  async function generarSupervisorPDF(s) {
    const supName = s.supervisor ? s.supervisor.nombre : 'Supervisor';
    const subsTag = s.suscripciones_origen === 'manual' ? 'manual' : 'automatico';

    const customLogo = (window.AGENCY_LOGO_DATA_URI || '').trim();
    const logoHtml = customLogo
      ? `<img src="${customLogo}" alt="BraveGirls" width="78" height="78" style="display:block;object-fit:contain;border-radius:10px"/>`
      : `<div style="width:78px;height:78px;border-radius:14px;background:#be185d;color:#fff;text-align:center;line-height:78px;font-weight:900;font-size:22px;font-family:Arial,sans-serif;letter-spacing:0.04em">BG</div>`;

    const ACCENT = '#be185d';
    const LABEL = '#6b1c4a';
    const VALUE = '#0f172a';
    const PINK_BG = '#fdf2f8';

    const [py, pm] = (s.mes || '').split('-').map(Number);
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const periodoTxt = py && pm ? `${meses[pm-1]} ${py}` : (s.mes || '');

    const ventasRows = (s.ventas_detalle || []).map(v => `
      <tr style="background:#fff">
        <td style="padding:8px 10px;font-size:11.5px;color:${VALUE};font-weight:600;border-bottom:1px solid #fce7f3">${escapeHtml(v.chatter || '')}</td>
        <td style="padding:8px 10px;text-align:right;font-size:11.5px;color:${VALUE};border-bottom:1px solid #fce7f3">${fmtMoney(v.fact_chatter)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:11.5px;color:${VALUE};border-bottom:1px solid #fce7f3">${v.porcentaje_supervisor}%</td>
        <td style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px;color:${VALUE};border-bottom:1px solid #fce7f3">${fmtMoney(v.comision)}</td>
      </tr>`).join('');

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;padding:20px 24px;color:${VALUE};background:#fff;width:100%;box-sizing:border-box">

  <table style="width:100%;border-collapse:collapse;margin-bottom:12px;background:${PINK_BG};border:2px solid ${ACCENT};border-radius:8px">
    <tr>
      <td style="vertical-align:middle;padding:12px 16px;width:60%">
        <div style="font-size:21px;font-weight:900;color:${ACCENT};letter-spacing:-0.5px;line-height:1.1;font-family:Arial,sans-serif">BraveGirls Agency LLC</div>
        <div style="font-size:10px;color:#374151;margin-top:3px;font-weight:600">Liquidación Supervisor &middot; Documento interno</div>
        <div style="font-size:9.5px;color:${LABEL};text-transform:uppercase;letter-spacing:0.08em;font-weight:800;margin-top:6px">Período: <span style="color:${VALUE}">${periodoTxt}</span></div>
      </td>
      <td style="vertical-align:middle;text-align:right;padding:10px 16px 10px 0;width:90px">
        ${logoHtml}
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <tr>
      <td style="vertical-align:bottom">
        <div style="font-size:26px;color:${ACCENT};font-weight:900;letter-spacing:-1px;line-height:1;font-family:Arial,sans-serif">Liquidación</div>
        <div style="font-size:12px;color:${VALUE};font-weight:700;margin-top:4px">Supervisor: <strong style="color:${ACCENT}">${escapeHtml(supName)}</strong></div>
      </td>
      <td style="vertical-align:bottom;text-align:right">
        <div style="display:inline-block;background:${ACCENT};color:#fff;padding:5px 12px;border-radius:5px;font-size:10.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-family:Arial,sans-serif">Período &middot; ${periodoTxt}</div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;background:#fff;font-size:11.5px;border:1.5px solid ${ACCENT};margin-top:6px;margin-bottom:10px">
    <tbody>
      <tr style="background:#fff">
        <td style="padding:8px 12px;font-size:11.5px;color:${VALUE};font-weight:600;border-bottom:1px solid #fce7f3">SFS Control</td>
        <td style="padding:8px 12px;text-align:right;font-weight:800;font-size:12px;color:${VALUE};border-bottom:1px solid #fce7f3;width:140px">${fmtMoney(s.sfs_control)}</td>
      </tr>
      <tr style="background:#fff">
        <td style="padding:8px 12px;font-size:11.5px;color:${VALUE};font-weight:600;border-bottom:1px solid #fce7f3">5% de suscripciones (${fmtMoney(s.suscripciones_totales)}) &middot; ${subsTag}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:800;font-size:12px;color:${VALUE};border-bottom:1px solid #fce7f3">${fmtMoney(s.comision_suscripciones)}</td>
      </tr>
      <tr style="background:#fff">
        <td style="padding:8px 12px;font-size:11.5px;color:${VALUE};font-weight:600">Comisión sobre ventas chatters</td>
        <td style="padding:8px 12px;text-align:right;font-weight:800;font-size:12px;color:${VALUE}">${fmtMoney(s.comision_ventas_chatters)}</td>
      </tr>
    </tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;background:#fff;font-size:11.5px;border:1.5px solid ${ACCENT}">
    <thead>
      <tr style="background:${ACCENT}">
        <th style="padding:9px;text-align:left;color:#fff;font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase">Chatter</th>
        <th style="padding:9px;text-align:right;color:#fff;font-size:11px;font-weight:800;width:130px;letter-spacing:0.04em;text-transform:uppercase">Facturación</th>
        <th style="padding:9px;text-align:right;color:#fff;font-size:11px;font-weight:800;width:80px;letter-spacing:0.04em;text-transform:uppercase">% Sup</th>
        <th style="padding:9px;text-align:right;color:#fff;font-size:11px;font-weight:800;width:130px;letter-spacing:0.04em;text-transform:uppercase">Comisión</th>
      </tr>
    </thead>
    <tbody>${ventasRows || `<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;font-size:11px;background:#fafafa">Sin datos de chatters este mes.</td></tr>`}</tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12px">
    <tr>
      <td style="width:55%"></td>
      <td style="padding:7px 12px;text-align:right;color:${LABEL};font-weight:800;font-size:12px;border-bottom:1px solid #fce7f3">Total bruto</td>
      <td style="padding:7px 12px;text-align:right;color:${VALUE};font-weight:800;width:130px;font-size:12px;border-bottom:1px solid #fce7f3">${fmtMoney(s.total_bruto)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:5px 12px;text-align:right;color:${LABEL};font-weight:700;border-bottom:1px solid #fce7f3">Transaction fee (${s.transaction_fee_pct}%)</td>
      <td style="padding:5px 12px;text-align:right;color:#dc2626;font-weight:800;border-bottom:1px solid #fce7f3">&minus;${fmtMoney(s.total_bruto - s.neto_a_pagar)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="padding:12px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:14px;letter-spacing:0.02em;text-transform:uppercase">Neto a pagar</td>
      <td style="padding:12px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:24px;letter-spacing:-0.5px;line-height:1">${fmtMoney(s.neto_a_pagar)}</td>
    </tr>
  </table>

  <div style="margin-top:14px;text-align:center;color:#9ca3af;font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
    Documento interno &middot; BraveGirls Agency LLC &middot; ${new Date().getFullYear()}
  </div>

</div>`;
    await renderHtmlToPdf(html, `liquidacion_supervisor_${s.mes}.pdf`);
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

      // KPIs: total entregado, ganador del mes actual, monto promedio
      const totalEntregado = lista.reduce((s, i) => s + Number(i.monto || 0), 0);
      const curMes = currentMes();
      const ganadorActual = lista.find(i => i.mes === curMes);
      const promedio = lista.length ? totalEntregado / lista.length : 0;

      const rowsHtml = lista.map(i => {
        const chHue = hueOfName(i.chatter || '');
        return `
        <tr>
          <td><span class="pill" style="background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.32);color:#7DD3FC">${i.mes}</span></td>
          <td>${i.chatter ? `<span class="pill-entity" style="--ent-hue:${chHue}"><strong>${i.chatter}</strong></span>` : '<span class="muted">—</span>'}</td>
          <td style="text-align:right;color:#34D399;font-weight:800;font-family:var(--font-display);font-size:1rem">${fmtMoney(i.monto)}</td>
          <td class="muted">${i.motivo || '—'}</td>
          <td style="text-align:right"><button class="btn-ghost-small inc-del-mes" data-mes="${i.mes}" title="Eliminar">✕</button></td>
        </tr>`;
      }).join('');

      view.innerHTML = `
        <div class="kpi-row" style="margin-bottom:18px">
          <div class="kpi-mini ${ganadorActual ? 'highlight' : ''}">
            <div class="kpi-mini-lbl">Ganador este mes</div>
            <div class="kpi-mini-val" style="font-size:1.05rem">${ganadorActual ? `<span class="pill-entity" style="--ent-hue:${hueOfName(ganadorActual.chatter)};font-size:0.85rem;padding:3px 10px"><strong>${ganadorActual.chatter}</strong></span>` : '<span class="muted" style="font-size:0.95rem">Sin asignar</span>'}</div>
          </div>
          <div class="kpi-mini">
            <div class="kpi-mini-lbl">Total entregado</div>
            <div class="kpi-mini-val" style="color:#34D399">${fmtMoney(totalEntregado)}</div>
          </div>
          <div class="kpi-mini">
            <div class="kpi-mini-lbl">Promedio por mes</div>
            <div class="kpi-mini-val" style="color:#FDE047">${fmtMoney(promedio)}</div>
          </div>
          <div class="kpi-mini">
            <div class="kpi-mini-lbl">Meses con ganador</div>
            <div class="kpi-mini-val" style="color:#7DD3FC">${lista.length}</div>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:14px">🏆 Asignar incentivo del mes</h3>
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
            <h3 style="margin:0">Histórico de ganadores</h3>
            <div class="muted">${lista.length} meses</div>
          </div>
          <div class="table-wrap" style="margin-top:12px">
            <table>
              <thead><tr><th>Mes</th><th>Ganador</th><th style="text-align:right">Monto</th><th>Motivo</th><th></th></tr></thead>
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

  const MESES_FULL  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MESES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function fmtMesNice(value) {
    if (!value) return '—';
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return value;
    return `${MESES_FULL[m-1]} ${y}`;
  }
  function refreshMesDisplay() {
    const v = document.getElementById('mes-selector').value;
    const t = document.getElementById('mes-display-text');
    if (t) t.textContent = fmtMesNice(v);
  }
  // Custom month picker
  let pickerYearState = null;
  function getPickerYearState() {
    if (pickerYearState != null) return pickerYearState;
    const v = document.getElementById('mes-selector').value;
    pickerYearState = v ? Number(v.split('-')[0]) : new Date().getFullYear();
    return pickerYearState;
  }
  function renderPickerGrid() {
    const grid = document.getElementById('mes-picker-grid');
    const yrLbl = document.getElementById('mes-picker-year');
    const year = getPickerYearState();
    yrLbl.textContent = year;
    const sel = document.getElementById('mes-selector').value;
    const [selY, selM] = sel ? sel.split('-').map(Number) : [null, null];
    const now = new Date();
    const curY = now.getFullYear(), curM = now.getMonth() + 1;
    grid.innerHTML = MESES_SHORT.map((lbl, i) => {
      const m = i + 1;
      const classes = ['mes-picker-cell'];
      if (selY === year && selM === m) classes.push('selected');
      if (curY === year && curM === m) classes.push('current');
      return `<div class="${classes.join(' ')}" data-month="${m}">${lbl}</div>`;
    }).join('');
    grid.querySelectorAll('.mes-picker-cell').forEach(c => {
      c.addEventListener('click', () => {
        const m = Number(c.dataset.month);
        const newMes = `${year}-${String(m).padStart(2, '0')}`;
        document.getElementById('mes-selector').value = newMes;
        sessionStorage.setItem('admin_mes', newMes);
        refreshMesDisplay();
        closePicker();
        const route = location.hash.replace('#', '') || 'resumen';
        navigate(route);
      });
    });
  }
  function openPicker() {
    const p = document.getElementById('mes-picker');
    pickerYearState = null;
    renderPickerGrid();
    p.classList.add('open');
    p.setAttribute('aria-hidden', 'false');
    document.getElementById('mes-display').setAttribute('aria-expanded', 'true');
  }
  function closePicker() {
    const p = document.getElementById('mes-picker');
    p.classList.remove('open');
    p.setAttribute('aria-hidden', 'true');
    document.getElementById('mes-display').setAttribute('aria-expanded', 'false');
  }
  document.getElementById('mes-display')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = document.getElementById('mes-picker');
    p.classList.contains('open') ? closePicker() : openPicker();
  });
  document.addEventListener('click', (e) => {
    const p = document.getElementById('mes-picker');
    if (p?.classList.contains('open') && !p.contains(e.target) && !e.target.closest('#mes-display')) closePicker();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePicker(); });
  document.querySelectorAll('.mes-picker-nav').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      pickerYearState = (pickerYearState ?? getPickerYearState()) + Number(b.dataset.yr);
      renderPickerGrid();
    });
  });
  // Sincroniza el grid del picker con el mes actualmente seleccionado.
  // Resetea el año mostrado en el picker para que coincida con el mes activo.
  function syncPickerToSelected() {
    pickerYearState = null;
    const p = document.getElementById('mes-picker');
    if (p?.classList.contains('open')) renderPickerGrid();
  }
  document.getElementById('mes-prev').addEventListener('click', () => { shiftMes(-1); refreshMesDisplay(); syncPickerToSelected(); });
  document.getElementById('mes-next').addEventListener('click', () => { shiftMes(1); refreshMesDisplay(); syncPickerToSelected(); });
  document.getElementById('mes-today').addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 7);
    document.getElementById('mes-selector').value = today;
    sessionStorage.setItem('admin_mes', today);
    refreshMesDisplay();
    syncPickerToSelected();
    const route = location.hash.replace('#', '') || 'resumen';
    navigate(route);
  });
  setTimeout(refreshMesDisplay, 0);

  boot();
})();
