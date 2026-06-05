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

  // ───────── Datos legales de la LLC (aparecen en TODAS las facturas/liquidaciones) ─────────
  const LLC_INFO = {
    nombre: 'BraveGirls Agency LLC',
    direccion: '1401 Pennsylvania Ave. STE 105, 19806 Wilmington, Delaware (EE.UU.)',
    ein: '38-4349826',
    telefono: '(34) 675 32 80 74',
    licencia: '20250971778',
    estado_registro: 'Delaware'
  };
  window.LLC_INFO = LLC_INFO;

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
        { key: 'tma_signed_date', label: 'Fecha firma TMA', shortLabel: 'TMA', type: 'date' },
        { key: 'activa', label: 'Activa', type: 'bool' }
      ],
      tableColumns: ['nombre', 'plan_id', 'porcentaje', 'moneda_default', 'factura_numero_actual', 'tma_signed_date', 'activa']
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
        { key: 'nombre_fiscal', label: 'Nombre fiscal completo', type: 'text' },
        { key: 'identificador', label: 'DNI / Pasaporte / ID local', type: 'text' },
        { key: 'direccion', label: 'Dirección', type: 'text', wide: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
        { key: 'porcentaje_default', label: '% comisión default', shortLabel: '% Com.', type: 'number', step: '0.01', placeholder: '15' },
        { key: 'porcentaje_supervisor', label: '% supervisor', shortLabel: '% Sup.', type: 'number', step: '0.01', placeholder: '5' },
        { key: 'rol', label: 'Rol', type: 'select', options: ['chatter', 'supervisor', 'team_leader'] },
        { key: 'es_team_leader', label: 'Team Leader', shortLabel: 'TL', type: 'bool' },
        { key: 'tax_residency_country', label: 'País residencia fiscal', type: 'text', placeholder: 'AR / ES / US / MX...' },
        { key: 'tax_id_type', label: 'Tipo Tax ID', type: 'select', options: ['', 'W-9 (US)', 'W-8BEN (Foreign)', 'DNI', 'Pasaporte', 'CUIT/CUIL', 'NIE/NIF', 'RFC', 'Otro'] },
        { key: 'tax_id_number', label: 'N° Tax ID', type: 'text' },
        { key: 'w8_w9_on_file', label: 'W-8BEN/W-9 firmado en archivo', shortLabel: 'W-8/W-9', type: 'bool' },
        { key: 'w8_w9_signed_date', label: 'Fecha firma W-8/W-9', type: 'date' },
        { key: 'ica_signed_date', label: 'Fecha firma ICA (contrato)', shortLabel: 'ICA', type: 'date' },
        { key: 'factura_numero_actual', label: 'Último N° de liquidación', shortLabel: 'Últ. N°', type: 'number', step: '1' },
        { key: 'activo', label: 'Activo', type: 'bool' }
      ],
      tableColumns: ['nombre', 'rol', 'porcentaje_default', 'porcentaje_supervisor', 'es_team_leader', 'ica_signed_date', 'w8_w9_on_file', 'activo']
    },
    equipo: {
      label: 'Equipo Fijo',
      icon: '★',
      columns: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'nombre_fiscal', label: 'Nombre fiscal completo', type: 'text' },
        { key: 'identificador', label: 'DNI / Pasaporte / ID local', type: 'text' },
        { key: 'rol', label: 'Rol', type: 'text', placeholder: 'Account Manager, Editor…' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'direccion', label: 'Dirección', type: 'text', wide: true },
        { key: 'sueldo_mensual_usd', label: 'Sueldo USD/mes', type: 'number', step: '0.01' },
        { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
        { key: 'tax_residency_country', label: 'País residencia fiscal', type: 'text', placeholder: 'AR / ES / US / MX...' },
        { key: 'tax_id_type', label: 'Tipo Tax ID', type: 'select', options: ['', 'W-9 (US)', 'W-8BEN (Foreign)', 'DNI', 'Pasaporte', 'CUIT/CUIL', 'NIE/NIF', 'RFC', 'Otro'] },
        { key: 'tax_id_number', label: 'N° Tax ID', type: 'text' },
        { key: 'w8_w9_on_file', label: 'W-8BEN/W-9 firmado en archivo', shortLabel: 'W-8/W-9', type: 'bool' },
        { key: 'w8_w9_signed_date', label: 'Fecha firma W-8/W-9', type: 'date' },
        { key: 'ica_signed_date', label: 'Fecha firma ICA (contrato)', shortLabel: 'ICA', type: 'date' },
        { key: 'factura_numero_actual', label: 'Último N° de liquidación', shortLabel: 'Últ. N°', type: 'number', step: '1' },
        { key: 'activo', label: 'Activo', type: 'bool' }
      ],
      tableColumns: ['nombre', 'rol', 'sueldo_mensual_usd', 'ica_signed_date', 'w8_w9_on_file', 'activo']
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

  // ───────── Skeleton loaders (no afectan estructura visual final) ─────────
  // Reemplazo del <div class="spinner"></div> con bloques shimmer.
  // Devuelve string HTML. Cada vista decide qué layout usar.
  const Skel = {
    kpiRow(n = 4) {
      const cells = Array.from({ length: n }, () =>
        `<div class="skeleton skeleton-kpi"></div>`).join('');
      return `<div class="skeleton-grid">${cells}</div>`;
    },
    card(opts = {}) {
      const lines = opts.lines || 3;
      const ls = Array.from({ length: lines }, (_, i) =>
        `<div class="skeleton skeleton-line ${i === 0 ? 'lg' : ''}" style="width:${100 - i * 8}%"></div>`).join('');
      return `<div class="card">${ls}</div>`;
    },
    table(rows = 6) {
      const rs = Array.from({ length: rows }, () => `
        <div class="skel-row">
          <div class="skeleton skeleton-line" style="width:24px;height:24px;border-radius:6px"></div>
          <div class="skeleton skeleton-line grow"></div>
          <div class="skeleton skeleton-line" style="width:80px"></div>
          <div class="skeleton skeleton-line" style="width:60px"></div>
        </div>`).join('');
      return `<div class="card">
        <div class="skeleton skeleton-line lg" style="width:30%;margin-bottom:14px"></div>
        ${rs}
      </div>`;
    },
    resumen() {
      return `
        ${this.kpiRow(4)}
        <div style="height:16px"></div>
        <div class="grid-2col" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          ${this.card({ lines: 5 })}
          ${this.card({ lines: 5 })}
        </div>
        <div style="height:16px"></div>
        ${this.card({ lines: 3 })}
      `;
    },
    full() {
      return `
        ${this.kpiRow(4)}
        <div style="height:16px"></div>
        ${this.card({ lines: 4 })}
      `;
    }
  };
  window.Skel = Skel;

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
      contabilidad:['Contabilidad · Libro Mayor', 'Movimientos cronológicos del mes (ingresos, egresos, neto)'],
      incentivos:  ['Incentivos del Mes', 'Histórico de ganadores'],
      facturas:    ['Facturas Emitidas', 'Listado histórico de todas las facturas'],
      archivos:    ['Archivos', 'Facturas recibidas, comprobantes, extractos y contratos'],
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
    if (route === 'contabilidad')return renderContabilidad(view);
    if (route === 'incentivos')  return renderIncentivos(view);
    if (route === 'facturas')    return renderFacturas(view);
    if (route === 'archivos')    return renderArchivos(view);
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
    view.innerHTML = Skel.resumen();
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
    container.innerHTML = Skel.table(8);

    try {
      const r = await api('catalog', { params: { entity } });
      const data = r.data || [];

      // cachear modelos y planes para selectores
      if (entity === 'modelos') modelosCache = data;
      if (entity === 'planes') planesCache = data;

      const headers = def.tableColumns.map(c => {
        const col = def.columns.find(x => x.key === c);
        const label = col ? (col.shortLabel || col.label) : c;
        return `<th>${label}</th>`;
      }).join('');

      const rows = data.length === 0
        ? `<tr><td colspan="${def.tableColumns.length + 1}" class="empty-state">
             <div class="big">📭</div>
             <div>Aún no hay ${def.label.toLowerCase()} cargados.</div>
             <div style="margin-top:12px"><button class="btn-primary" id="empty-add" style="width:auto;display:inline-flex">+ Crear el primero</button></div>
           </td></tr>`
        : data.map(row => {
            const showIca = entity === 'chatters' || entity === 'equipo';
            const showTma = entity === 'modelos';
            const icaBtn = showIca
              ? `<button class="btn-ghost-small btn-row-ica" data-ica="${row.id}" data-ica-rol="${row.rol || ''}" title="Generar ICA (contrato de servicios)">📜</button>`
              : '';
            const tmaBtn = showTma
              ? `<button class="btn-ghost-small btn-row-tma" data-tma="${row.id}" title="${row.tma_url ? 'Ver / Reemplazar TMA' : 'Subir TMA (Talent Management Agreement)'}">📜</button>`
              : '';
            return `
            <tr>
              ${def.tableColumns.map(c => `<td>${formatCell(c, row[c], entity)}</td>`).join('')}
              <td class="action-col" style="text-align:right;white-space:nowrap">
                ${icaBtn}
                ${tmaBtn}
                <button class="btn-ghost-small btn-row-edit" data-edit="${row.id}" title="Editar">✎</button>
                <button class="btn-danger btn-row-del" data-del="${row.id}" title="Desactivar">✕</button>
              </td>
            </tr>
          `;}).join('');

      container.innerHTML = `
        <div class="table-wrap catalog-table">
          <div class="table-toolbar">
            <h3>${def.icon} ${def.label} <span class="count">${data.length} registros</span></h3>
            <button class="btn-primary" id="new-btn" style="width:auto;padding:8px 16px;font-size:0.85rem">+ Nuevo</button>
          </div>
          <table class="compact-table">
            <thead><tr>${headers}<th class="action-col" style="text-align:right">Acciones</th></tr></thead>
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
      container.querySelectorAll('[data-ica]').forEach(b => {
        b.addEventListener('click', async () => {
          const row = data.find(r => r.id === Number(b.dataset.ica));
          if (!row) return;
          const kind = entity === 'equipo'
            ? 'equipo'
            : (String(row.rol || '').toLowerCase() === 'supervisor' ? 'supervisor' : 'chatter');
          const original = b.innerHTML;
          b.disabled = true; b.innerHTML = '⏳';
          try {
            await generarICA(kind, row);
            // refresh to update ica badge
            showEntityList(entity);
          } catch (e) {
            toast('Error: ' + e.message, 'error');
          } finally {
            b.disabled = false; b.innerHTML = original;
          }
        });
      });
      container.querySelectorAll('[data-tma]').forEach(b => {
        b.addEventListener('click', () => {
          const row = data.find(r => r.id === Number(b.dataset.tma));
          if (!row) return;
          openTMAUploadModal(row, () => showEntityList(entity));
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="card center muted">⚠️ Error cargando: ${e.message}</div>`;
    }
  }

  function formatCell(key, value, entity) {
    if (value === null || value === undefined || value === '') return '<span class="muted">—</span>';
    // Booleanos: cualquier campo que llega como true/false (incluye w8_w9_on_file y todos los bool nuevos)
    if (typeof value === 'boolean' || key === 'activa' || key === 'activo' || key === 'es_team_leader' || key === 'w8_w9_on_file') {
      const isTrue = value === true || value === 'true' || value === 1;
      if (key === 'w8_w9_on_file') {
        return isTrue
          ? '<span class="pill green" title="Formulario firmado">✓</span>'
          : '<span class="pill red" title="Pendiente de firma">✕</span>';
      }
      return isTrue ? '<span class="pill green">✓ Sí</span>' : '<span class="pill">—</span>';
    }
    if (key === 'ica_signed_date') {
      return value
        ? `<span class="pill green" title="ICA firmado el ${value}">✓</span>`
        : '<span class="pill red" title="ICA pendiente de firma">✕</span>';
    }
    if (key === 'tma_signed_date') {
      return value
        ? `<span class="pill green" title="TMA firmado el ${value}">✓</span>`
        : '<span class="pill red" title="TMA pendiente / no cargado">✕</span>';
    }
    if (key === 'w8_w9_signed_date' && value) {
      return `<span class="muted" style="font-size:0.78rem">${value}</span>`;
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
      const display = value.length > 24 ? value.slice(0, 22) + '…' : value;
      return `<a href="mailto:${escapeHtml(value)}" title="${escapeHtml(value)}" style="color:var(--text);text-decoration:none;border-bottom:1px dashed rgba(255,255,255,0.18);font-size:0.82rem">${escapeHtml(display)}</a>`;
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
    view.innerHTML = Skel.full();
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
    view.innerHTML = Skel.full();

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
    detail.innerHTML = Skel.full();
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
    view.innerHTML = Skel.full();
    try {
      const mes = currentMes();
      const filtroTipo = sessionStorage.getItem('facturas_filtro_tipo') || '';
      const params = {};
      if (mes) params.mes = mes;
      if (filtroTipo) params.tipo = filtroTipo;
      const r = await api('facturas-list', { params });

      const tipoLabel = {
        factura_modelo:        { txt: 'Modelo',     color: 'pink',  prefix: 'FCT' },
        liquidacion_chatter:   { txt: 'Chatter',    color: 'blue',  prefix: 'LIQ' },
        liquidacion_supervisor:{ txt: 'Supervisor', color: 'gold',  prefix: 'LIQ' },
        liquidacion_equipo:    { txt: 'Equipo',     color: 'green', prefix: 'LIQ' }
      };

      const rows = (r.data || []).map(f => {
        const t = tipoLabel[f.tipo] || { txt: f.tipo || '—', color: '', prefix: 'DOC' };
        return `
        <tr>
          <td><span class="pill pink">${t.prefix}-${String(f.numero).padStart(4, '0')}</span></td>
          <td><span class="pill ${t.color}">${t.txt}</span></td>
          <td><strong>${escapeHtml(f.modelo_nombre || ('#' + f.entidad_id))}</strong></td>
          <td>${f.mes || '—'}</td>
          <td>${f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString('es-AR') : '—'}</td>
          <td style="text-align:right"><strong>${fmtMoney(f.total, f.moneda)}</strong></td>
          <td>${estadoBadge(f.estado)}</td>
          <td style="text-align:right">
            <button class="btn-ghost-small" data-reprint="${f.id}">📥 PDF</button>
          </td>
        </tr>
      `;}).join('');

      view.innerHTML = `
        <div class="table-wrap">
          <div class="table-toolbar" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <h3>▦ Documentos emitidos <span class="count">${(r.data || []).length}</span></h3>
            <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
              <label style="margin:0;font-size:0.7rem">Tipo:</label>
              <select id="facturas-filtro-tipo" style="min-width:170px;padding:6px 32px 6px 12px;font-size:0.82rem">
                <option value="" ${filtroTipo===''?'selected':''}>Todos</option>
                <option value="factura_modelo" ${filtroTipo==='factura_modelo'?'selected':''}>Facturas a modelos</option>
                <option value="liquidacion_chatter" ${filtroTipo==='liquidacion_chatter'?'selected':''}>Liquidaciones chatters</option>
                <option value="liquidacion_supervisor" ${filtroTipo==='liquidacion_supervisor'?'selected':''}>Liquidación supervisor</option>
                <option value="liquidacion_equipo" ${filtroTipo==='liquidacion_equipo'?'selected':''}>Liquidaciones equipo</option>
              </select>
              <button class="btn-primary" style="width:auto;padding:8px 16px;font-size:0.85rem" onclick="location.hash='facturacion'">+ Nueva factura</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>N°</th><th>Tipo</th><th>Receptor</th><th>Mes</th><th>Emisión</th>
                <th style="text-align:right">Total</th><th>Estado</th><th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="8" class="empty-state">Aún no hay documentos emitidos.</td></tr>'}</tbody>
          </table>
        </div>
      `;

      document.getElementById('facturas-filtro-tipo')?.addEventListener('change', (e) => {
        sessionStorage.setItem('facturas_filtro_tipo', e.target.value);
        renderFacturas(view);
      });

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
    view.innerHTML = Skel.full();
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
    view.innerHTML = Skel.full();
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
          <td style="text-align:right;white-space:nowrap">
            <button class="btn-ghost-small sum-save" type="button" title="Guardar envíos">💾</button>
            ${detailBtn}
            <button class="btn-ghost-small sum-factura" type="button" title="Generar factura/liquidación legal" ${neto <= 0 ? 'disabled' : ''}>📄</button>
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

    view.querySelectorAll('.sum-factura').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const kind = tr.dataset.sumKind; // chatter | supervisor | equipo
        const entityId = Number(tr.dataset.sumId);
        const originalHtml = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '⏳';
        try {
          await generarFacturaLegal(kind, entityId);
        } catch (e) {
          toast('Error: ' + e.message, 'error');
        } finally {
          btn.disabled = false; btn.innerHTML = originalHtml;
        }
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
  // FACTURA / LIQUIDACIÓN LEGAL (US LLC compliant)
  //   - Para chatter/supervisor: usa data de liqState (pagos_by_chatter)
  //   - Para equipo: usa pagos_by_equipo + sueldo del catálogo
  //   - Incluye header con datos LLC, receptor con tax data, footer legal
  //   - Persiste en facturas_emitidas con numero secuencial por entidad
  // ═══════════════════════════════════════════════════════
  async function generarFacturaLegal(kind, entityId) {
    const mes = liqState.mes;
    if (!mes) { toast('Mes no definido', 'error'); return; }

    // 1) Resolver datos del receptor y monto del mes
    let receptor = null, items = [], bruto = 0, neto = 0, fee = 0, conceptoCorto = '';

    if (kind === 'chatter' || kind === 'supervisor') {
      const chList = kind === 'supervisor'
        ? [liqState.supervisor].filter(Boolean)
        : (liqState.chatters || []);
      receptor = chList.find(c => c && c.id === entityId);
      if (!receptor) {
        // fallback: traer del catálogo
        const r = await api('catalog', { params: { entity: 'chatters', id: entityId } });
        receptor = r.data;
      }
      const pago = kind === 'supervisor'
        ? (liqState.supervisor_pago || {})
        : ((liqState.pagos_by_chatter || {})[entityId] || {});
      bruto = Number(pago.total_bruto || 0);
      neto  = Number(pago.neto_a_pagar || 0);
      fee   = Number(pago.transaction_fee_pct || liqState.transaction_fee_pct || 0);
      // Items: detalle de comisiones del mes desde liquidacion_mes
      const cuentaById = {};
      (liqState.cuentas || []).forEach(c => { cuentaById[c.id] = c; });
      const detalles = kind === 'supervisor'
        ? [{ descripcion: `SFS Control + comisiones supervisión · ${fmtMesNice(mes)}`, monto: bruto }]
        : ((liqState.detalle_by_chatter || {})[entityId] || [])
            .filter(d => Number(d.comision_calculada || 0) > 0)
            .map(d => {
              const cu = cuentaById[d.cuenta_id];
              const cuentaTxt = cu ? `${cu.modelo_nombre} ${cu.tipo || ''}`.trim() : `Cuenta #${d.cuenta_id}`;
              return {
                descripcion: `${cuentaTxt} · ${d.porcentaje_comision}%`,
                monto: Number(d.comision_calculada || 0)
              };
            });
      // Sumar bonus (TL, incentivos, incentivo del mes) que están en pagos
      if (kind === 'chatter') {
        if (Number(pago.team_leader_bonus || 0) > 0) {
          detalles.push({ descripcion: 'Team Leader Bonus', monto: Number(pago.team_leader_bonus) });
        }
        const incIndiv = Array.isArray(pago.incentivos_individuales) ? pago.incentivos_individuales : [];
        incIndiv.forEach(i => detalles.push({ descripcion: i.descripcion || 'Incentivo', monto: Number(i.monto || 0) }));
        if (pago.incentivo_mes_ganado) {
          detalles.push({ descripcion: 'Incentivo del Mes (Ganador)', monto: Number(pago.incentivo_mes_monto || 0) });
        }
      }
      items = detalles.length ? detalles : [{ descripcion: kind === 'supervisor' ? 'Liquidación supervisor' : 'Liquidación de chatting', monto: bruto }];
      conceptoCorto = kind === 'supervisor' ? 'Liquidación Supervisor' : 'Liquidación Chatter';
    } else if (kind === 'equipo') {
      const eqList = liqState.equipo || [];
      receptor = eqList.find(e => e && e.id === entityId);
      if (!receptor) {
        const r = await api('catalog', { params: { entity: 'equipo', id: entityId } });
        receptor = r.data;
      }
      const pago = (liqState.pagos_by_equipo || {})[entityId] || {};
      const monto = Number(pago.monto != null ? pago.monto : (receptor?.sueldo_mensual_usd || 0));
      bruto = monto; neto = monto; fee = 0;
      items = [{ descripcion: `${receptor?.rol || 'Servicios'} · Sueldo mensual`, monto }];
      conceptoCorto = `Liquidación ${receptor?.rol || 'Equipo'}`;
    }

    if (!receptor) { toast('No se pudo encontrar el receptor', 'error'); return; }
    if (neto <= 0) { toast('No hay monto a pagar este mes', 'error'); return; }

    // 2) Confirmación rápida (sin modal pesado por ahora)
    const nombreCorto = receptor.nombre || receptor.nombre_fiscal || '—';
    if (!confirm(`Generar liquidación legal para ${nombreCorto}\nPeríodo: ${fmtMesNice(mes)}\nNeto: ${fmtMoney(neto)}\n\nSe registra en "Facturas" con N° secuencial.\n\n¿Continuar?`)) {
      return;
    }

    // 3) Persistir en backend (numerador + snapshot)
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const [yy, mm] = mes.split('-').map(Number);
    const lastDay = new Date(yy, mm, 0).getDate();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const periodoFull = `01 al ${lastDay} de ${meses[mm-1]} ${yy}`;

    const html = buildFacturaLegalHtml({ kind, receptor, items, bruto, neto, fee, mes, periodoFull, fechaHoy, numero: null });

    let numero = null;
    try {
      const r = await api('factura-create', {
        method: 'POST',
        body: {
          entidad_tipo: kind,
          entidad_id: entityId,
          mes,
          fecha_emision: fechaHoy,
          concepto: conceptoCorto,
          items,
          subtotal: bruto,
          iva: 0,
          total: neto,
          moneda: 'USD',
          servicios_pie: items.map(i => i.descripcion).join(' · '),
          pdf_html_snapshot: html
        }
      });
      numero = r.data?.numero;
    } catch (e) {
      toast('Error al registrar la factura: ' + e.message, 'error');
      return;
    }

    // 4) Re-render con el N° asignado y emitir PDF
    const finalHtml = buildFacturaLegalHtml({ kind, receptor, items, bruto, neto, fee, mes, periodoFull, fechaHoy, numero });
    const filename = `liquidacion_${kind}_${(nombreCorto || 'recv').replace(/\s+/g, '_')}_${mes}_${numero || ''}.pdf`;
    await renderHtmlToPdf(finalHtml, filename);
    toast(`Liquidación #${numero} emitida para ${nombreCorto}`, 'success');
  }

  // Builder reusable del HTML de la factura/liquidación legal
  function buildFacturaLegalHtml({ kind, receptor, items, bruto, neto, fee, mes, periodoFull, fechaHoy, numero }) {
    const customLogo = (window.AGENCY_LOGO_DATA_URI || '').trim();
    const logoHtml = customLogo
      ? `<img src="${customLogo}" alt="BraveGirls" width="68" height="68" style="display:block;object-fit:contain;border-radius:10px"/>`
      : `<div style="width:68px;height:68px;border-radius:12px;background:#be185d;color:#fff;text-align:center;line-height:68px;font-weight:900;font-size:20px;font-family:Arial,sans-serif">BG</div>`;

    const ACCENT = '#be185d';
    const LABEL = '#6b1c4a';
    const VALUE = '#0f172a';
    const MUTED = '#6b7280';

    const tipoLabel = {
      chatter:    'Liquidación de Servicios · Chatter',
      supervisor: 'Liquidación de Servicios · Supervisor',
      equipo:     'Liquidación de Servicios · Equipo Fijo'
    }[kind] || 'Liquidación';

    const taxBlock = receptor.tax_id_number || receptor.tax_residency_country
      ? `<div style="font-size:9.5px;color:${MUTED};margin-top:3px">
           ${receptor.tax_id_type ? `${escapeHtml(receptor.tax_id_type)}: ` : 'Tax ID: '}<strong style="color:${VALUE}">${escapeHtml(receptor.tax_id_number || '—')}</strong>
           ${receptor.tax_residency_country ? ` · País fiscal: <strong style="color:${VALUE}">${escapeHtml(receptor.tax_residency_country)}</strong>` : ''}
         </div>`
      : `<div style="font-size:9px;color:#dc2626;margin-top:3px;font-weight:600">⚠ Tax ID no registrado en el catálogo</div>`;

    const w8Block = receptor.w8_w9_on_file
      ? `<div style="font-size:9px;color:#15803d;margin-top:2px;font-weight:600">✓ W-8BEN/W-9 en archivo${receptor.w8_w9_signed_date ? ` (${receptor.w8_w9_signed_date})` : ''}</div>`
      : `<div style="font-size:9px;color:#b45309;margin-top:2px;font-weight:600">⚠ W-8BEN/W-9 pendiente de firma</div>`;

    const itemRows = items.map(it => `
      <tr>
        <td style="padding:9px 12px;font-size:11.5px;color:${VALUE};border-bottom:1px solid #fce7f3">${escapeHtml(it.descripcion)}</td>
        <td style="padding:9px 12px;text-align:right;font-weight:700;font-size:11.5px;color:${VALUE};border-bottom:1px solid #fce7f3">${fmtMoney(it.monto)}</td>
      </tr>
    `).join('');

    const feeAmount = bruto - neto;
    const numeroLbl = numero ? `N° ${numero}` : 'PREVIEW';

    return `
<div style="font-family:Arial,Helvetica,sans-serif;padding:18px 22px;color:${VALUE};background:#fff;width:100%;box-sizing:border-box">

  <!-- HEADER LLC + N° -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
    <tr>
      <td style="vertical-align:top;width:62%">
        <div style="display:flex;align-items:center;gap:12px">
          ${logoHtml}
          <div>
            <div style="font-size:18px;font-weight:900;color:${ACCENT};letter-spacing:-0.4px;line-height:1.1">${LLC_INFO.nombre}</div>
            <div style="font-size:9.5px;color:${MUTED};margin-top:3px;line-height:1.4">${LLC_INFO.direccion}</div>
            <div style="font-size:9.5px;color:${MUTED};margin-top:2px"><strong style="color:${VALUE}">EIN:</strong> ${LLC_INFO.ein} · <strong style="color:${VALUE}">Lic.:</strong> ${LLC_INFO.licencia}</div>
            <div style="font-size:9.5px;color:${MUTED}"><strong style="color:${VALUE}">Tel:</strong> ${LLC_INFO.telefono}</div>
          </div>
        </div>
      </td>
      <td style="vertical-align:top;text-align:right">
        <div style="display:inline-block;background:${ACCENT};color:#fff;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.06em">${numeroLbl}</div>
        <div style="font-size:9.5px;color:${MUTED};margin-top:6px">Emisión: <strong style="color:${VALUE}">${fechaHoy}</strong></div>
        <div style="font-size:9.5px;color:${MUTED}">Período: <strong style="color:${VALUE}">${periodoFull}</strong></div>
      </td>
    </tr>
  </table>

  <!-- TITULO -->
  <div style="font-size:22px;color:${ACCENT};font-weight:900;letter-spacing:-0.5px;line-height:1;margin:6px 0 4px">${tipoLabel}</div>

  <!-- RECEPTOR -->
  <table style="width:100%;border-collapse:collapse;margin-top:10px;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:6px">
    <tr>
      <td style="padding:12px 16px;vertical-align:top">
        <div style="font-size:9px;color:${LABEL};text-transform:uppercase;letter-spacing:0.1em;font-weight:800;margin-bottom:4px">Pago a / Bill to</div>
        <div style="font-size:14px;font-weight:800;color:${VALUE}">${escapeHtml(receptor.nombre_fiscal || receptor.nombre || '—')}</div>
        ${receptor.nombre_fiscal && receptor.nombre && receptor.nombre !== receptor.nombre_fiscal ? `<div style="font-size:10px;color:${MUTED}">a/k/a "${escapeHtml(receptor.nombre)}"</div>` : ''}
        ${receptor.direccion ? `<div style="font-size:10px;color:${MUTED};margin-top:3px">${escapeHtml(receptor.direccion)}</div>` : ''}
        ${receptor.email ? `<div style="font-size:10px;color:${MUTED}">${escapeHtml(receptor.email)}</div>` : ''}
        ${taxBlock}
        ${w8Block}
      </td>
    </tr>
  </table>

  <!-- ITEMS -->
  <table style="width:100%;border-collapse:collapse;background:#fff;font-size:11.5px;border:1.5px solid ${ACCENT};margin-top:12px">
    <thead>
      <tr style="background:${ACCENT}">
        <th style="padding:9px 12px;text-align:left;color:#fff;font-size:10.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase">Descripción del servicio</th>
        <th style="padding:9px 12px;text-align:right;color:#fff;font-size:10.5px;font-weight:800;width:140px;letter-spacing:0.04em;text-transform:uppercase">Monto USD</th>
      </tr>
    </thead>
    <tbody>${itemRows || '<tr><td colspan="2" style="padding:20px;text-align:center;color:#9ca3af">Sin ítems</td></tr>'}</tbody>
  </table>

  <!-- TOTALES -->
  <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12px">
    <tr>
      <td style="width:55%"></td>
      <td style="padding:6px 12px;text-align:right;color:${LABEL};font-weight:800;border-bottom:1px solid #fce7f3">Subtotal bruto</td>
      <td style="padding:6px 12px;text-align:right;color:${VALUE};font-weight:800;width:130px;border-bottom:1px solid #fce7f3">${fmtMoney(bruto)}</td>
    </tr>
    ${fee > 0 ? `
    <tr>
      <td></td>
      <td style="padding:5px 12px;text-align:right;color:${LABEL};font-weight:700;border-bottom:1px solid #fce7f3">Transaction fee (${fee}%)</td>
      <td style="padding:5px 12px;text-align:right;color:#dc2626;font-weight:800;border-bottom:1px solid #fce7f3">−${fmtMoney(feeAmount)}</td>
    </tr>` : ''}
    <tr>
      <td></td>
      <td style="padding:12px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:13px;letter-spacing:0.02em;text-transform:uppercase">Total neto a pagar</td>
      <td style="padding:12px 12px 4px;text-align:right;color:${ACCENT};font-weight:900;font-size:22px;letter-spacing:-0.5px;line-height:1">${fmtMoney(neto)}</td>
    </tr>
  </table>

  <!-- FOOTER LEGAL -->
  <div style="margin-top:22px;padding:11px 14px;background:#f9fafb;border-left:3px solid ${ACCENT};font-size:9px;color:${MUTED};line-height:1.5">
    <strong style="color:${VALUE};text-transform:uppercase;letter-spacing:0.06em;font-size:8.5px">Notice · IRS Compliance</strong><br>
    This statement reflects payments made to an independent contractor for services rendered. The recipient is solely responsible for declaring and paying applicable taxes in their jurisdiction of residence. BraveGirls Agency LLC, a Delaware registered company (EIN ${LLC_INFO.ein}), complies with IRS Form W-8BEN / W-9 / 1099-NEC reporting requirements where applicable. Records of this transaction are retained for a minimum of 7 years.
  </div>
  <div style="margin-top:10px;text-align:center;color:#9ca3af;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">
    ${LLC_INFO.nombre} · ${new Date().getFullYear()} · Documento generado electrónicamente
  </div>

</div>`;
  }

  // ═══════════════════════════════════════════════════════
  // INDEPENDENT CONTRACTOR AGREEMENT (ICA) — 3 plantillas ES
  //   chatter / supervisor / equipo
  //   - Persistencia con snapshot inmutable en contratos_ica
  //   - PDF descargable
  // ═══════════════════════════════════════════════════════
  async function generarICA(kind, receptor) {
    if (!receptor) { toast('Sin datos del contratista', 'error'); return; }
    // Validaciones mínimas
    const faltantes = [];
    if (!receptor.nombre_fiscal) faltantes.push('nombre fiscal');
    if (!receptor.identificador) faltantes.push('DNI/Pasaporte');
    if (!receptor.direccion)     faltantes.push('dirección');
    if (faltantes.length > 0) {
      if (!confirm(`Faltan datos del contratista: ${faltantes.join(', ')}.\n\nEl PDF se genera igual pero esos campos aparecerán como "[A COMPLETAR]". ¿Continuar?`)) return;
    }

    const fechaHoy = new Date().toISOString().slice(0, 10);
    const html = buildICAHtml({ kind, receptor, fechaHoy });

    // Persistir snapshot en backend
    try {
      const r = await api('ica-generate', {
        method: 'POST',
        body: {
          contratista_tipo: kind,
          contratista_id: receptor.id,
          html_snapshot: html,
          version: 'v1-es'
        }
      });
      const numero = r.data?.numero;
      const filename = `ICA_${kind}_${(receptor.nombre || 'contractor').replace(/\s+/g, '_')}_v${numero || 1}.pdf`;
      await renderHtmlToPdf(html, filename);
      const markSign = confirm(`✓ ICA v${numero} generado para ${receptor.nombre}.\n\n¿Marcar como FIRMADO ahora? (decí "Cancelar" si todavía no lo firmaron, lo marcás después)`);
      if (markSign) {
        await api('ica-mark-signed', {
          method: 'POST',
          body: { contratista_tipo: kind, contratista_id: receptor.id, fecha_firma: fechaHoy }
        });
        toast('Marcado como firmado', 'success');
      } else {
        toast('PDF descargado · Marcalo como firmado cuando recibas el documento', 'success');
      }
    } catch (e) {
      toast('Error al guardar ICA: ' + e.message, 'error');
    }
  }

  // ─── Builder del HTML del ICA por rol ───
  function buildICAHtml({ kind, receptor, fechaHoy }) {
    const ACCENT = '#be185d';
    const VALUE = '#0f172a';
    const MUTED = '#6b7280';
    const PLACE = '<span style="color:#dc2626;font-style:italic">[A COMPLETAR]</span>';

    const fiscal = receptor.nombre_fiscal || PLACE;
    const idDoc  = receptor.identificador || PLACE;
    const direc  = receptor.direccion || PLACE;
    const email  = receptor.email || PLACE;
    const pais   = receptor.tax_residency_country || PLACE;
    const fInicio = receptor.fecha_inicio || fechaHoy;
    const rol    = receptor.rol || (kind === 'equipo' ? 'Miembro del equipo' : 'Chatter');

    // Compensación: variable por chatter/supervisor, fija por equipo
    let compensacion = '';
    if (kind === 'chatter') {
      const pctChat = receptor.porcentaje_default != null ? Number(receptor.porcentaje_default) : 15;
      compensacion = `
        <p>El <strong>CONTRATISTA</strong> percibirá una comisión variable equivalente al <strong>${pctChat}%</strong> sobre las ventas netas que genere en las cuentas que le sean asignadas por la <strong>COMPAÑÍA</strong>, calculada mensualmente. Los pagos se realizarán mediante transferencia bancaria internacional, plataforma de envío de remesas o billetera de criptoactivos, según lo que ambas partes acuerden previamente.</p>
        <p>El porcentaje podrá ser modificado por acuerdo escrito de las partes (incluido correo electrónico). La <strong>COMPAÑÍA</strong> podrá adicionar bonos por desempeño, incentivos del mes y bonificación de Team Leader cuando corresponda.</p>
        <p>De cada pago se descontará el <strong>Transaction Fee</strong> de la plataforma de envío (entre 3% y 5%), por cuenta del <strong>CONTRATISTA</strong>.</p>`;
    } else if (kind === 'supervisor') {
      compensacion = `
        <p>El <strong>SUPERVISOR</strong> percibirá la siguiente compensación mensual:</p>
        <ul style="margin:8px 0 8px 22px;padding:0">
          <li>USD 100 fijos por SFS Control;</li>
          <li>5% de las suscripciones totales del mes (suma de todas las cuentas administradas);</li>
          <li>Comisión variable sobre las ventas del equipo bajo su supervisión, según el porcentaje pactado individualmente con cada chatter (entre 3% y 5%).</li>
        </ul>
        <p>De cada pago se descontará el <strong>Transaction Fee</strong> de la plataforma de envío. La <strong>COMPAÑÍA</strong> podrá ajustar la compensación por acuerdo escrito ante cambios en la estructura del equipo.</p>`;
    } else {
      const sueldo = receptor.sueldo_mensual_usd != null ? Number(receptor.sueldo_mensual_usd) : 0;
      compensacion = `
        <p>El <strong>CONTRATISTA</strong> percibirá una compensación mensual fija de <strong>USD ${sueldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong> por la prestación de los Servicios. El pago se realizará dentro de los primeros 10 días de cada mes, mediante transferencia bancaria internacional (Wise, SWIFT) o billetera de criptoactivos, según lo acordado entre las partes.</p>
        <p>La <strong>COMPAÑÍA</strong> podrá ajustar la compensación por acuerdo escrito (incluido correo electrónico) en caso de modificación de las responsabilidades.</p>`;
    }

    // Servicios por rol
    let serviciosTexto = '';
    if (kind === 'chatter') {
      serviciosTexto = `
        <p>El <strong>CONTRATISTA</strong> prestará a la <strong>COMPAÑÍA</strong> servicios independientes de <em>chatting profesional</em> en las plataformas digitales administradas por la <strong>COMPAÑÍA</strong>, principalmente <em>OnlyFans</em>, en las cuentas que le sean asignadas. Las tareas incluyen, sin limitarse a:</p>
        <ul style="margin:8px 0 8px 22px;padding:0">
          <li>Comunicación profesional con suscriptores y fans;</li>
          <li>Venta de contenido digital (PPV, custom, suscripciones);</li>
          <li>Cumplimiento de los lineamientos editoriales, comerciales y de cumplimiento de la <strong>COMPAÑÍA</strong>;</li>
          <li>Reporte de actividad y producción según los procedimientos internos.</li>
        </ul>
        <p>El <strong>CONTRATISTA</strong> mantendrá la <em>autonomía</em> sobre la organización de su jornada y los medios técnicos para prestar los Servicios.</p>`;
    } else if (kind === 'supervisor') {
      serviciosTexto = `
        <p>El <strong>SUPERVISOR</strong> prestará a la <strong>COMPAÑÍA</strong> servicios independientes de <em>supervisión y coordinación</em> del equipo de chatters, incluyendo:</p>
        <ul style="margin:8px 0 8px 22px;padding:0">
          <li>Control de calidad de los chats (SFS Control);</li>
          <li>Coordinación de turnos, asignaciones y reemplazos;</li>
          <li>Capacitación y onboarding de chatters nuevos;</li>
          <li>Auditoría de cumplimiento de lineamientos editoriales y comerciales;</li>
          <li>Reportes periódicos a la <strong>COMPAÑÍA</strong> sobre desempeño del equipo.</li>
        </ul>
        <p>El <strong>SUPERVISOR</strong> mantendrá la <em>autonomía</em> sobre la organización de su jornada y los medios técnicos para prestar los Servicios.</p>`;
    } else {
      serviciosTexto = `
        <p>El <strong>CONTRATISTA</strong> prestará a la <strong>COMPAÑÍA</strong> servicios independientes en su rol de <strong>${escapeHtml(rol)}</strong>, con las responsabilidades acordadas entre las partes y conforme a los lineamientos operativos vigentes de la <strong>COMPAÑÍA</strong>.</p>
        <p>El <strong>CONTRATISTA</strong> mantendrá la <em>autonomía</em> sobre la organización de su jornada, manteniendo los canales de coordinación habituales para coordinar tareas con la <strong>COMPAÑÍA</strong>.</p>`;
    }

    const tituloDoc = {
      chatter: 'Contrato de Servicios Independientes · Chatter',
      supervisor: 'Contrato de Servicios Independientes · Supervisor',
      equipo: `Contrato de Servicios Independientes · ${escapeHtml(rol)}`
    }[kind];

    const partyLabel = kind === 'supervisor' ? 'SUPERVISOR' : 'CONTRATISTA';

    return `
<div style="font-family:Georgia,'Times New Roman',serif;padding:40px 50px;color:${VALUE};background:#fff;width:100%;box-sizing:border-box;font-size:11.5px;line-height:1.55">

  <div style="text-align:center;border-bottom:2px solid ${ACCENT};padding-bottom:18px;margin-bottom:22px">
    <div style="font-family:Arial,sans-serif;font-size:9px;color:${MUTED};letter-spacing:0.18em;text-transform:uppercase;font-weight:700">${LLC_INFO.nombre}</div>
    <div style="font-family:Arial,sans-serif;font-size:8.5px;color:${MUTED};margin-top:2px">${LLC_INFO.direccion} · EIN ${LLC_INFO.ein}</div>
    <h1 style="font-family:Georgia,serif;font-size:20px;color:${ACCENT};margin:14px 0 4px;font-weight:700;letter-spacing:-0.3px">${tituloDoc}</h1>
    <div style="font-family:Arial,sans-serif;font-size:9.5px;color:${MUTED};letter-spacing:0.14em;text-transform:uppercase;font-weight:600">Independent Contractor Agreement</div>
  </div>

  <p style="margin:0 0 14px"><strong>En Wilmington, Delaware, Estados Unidos de América</strong>, en la fecha <strong>${fechaHoy}</strong>, comparecen:</p>

  <p style="margin:0 0 10px"><strong>I.</strong> <strong>${LLC_INFO.nombre}</strong>, sociedad de responsabilidad limitada registrada en el Estado de Delaware, Estados Unidos de América, con domicilio legal en ${LLC_INFO.direccion}, identificada con Employer Identification Number (EIN) ${LLC_INFO.ein} y N° de Licencia ${LLC_INFO.licencia}, en adelante <strong>"LA COMPAÑÍA"</strong>; y</p>

  <p style="margin:0 0 16px"><strong>II.</strong> <strong>${fiscal}</strong>, con domicilio en ${direc}, identificado con documento ${idDoc}, con residencia fiscal en ${pais}, correo electrónico ${email}, en adelante el <strong>"${partyLabel}"</strong>.</p>

  <p style="margin:0 0 18px;text-align:justify">Las partes celebran el presente <strong>Contrato de Servicios Independientes</strong> (en adelante el "Contrato"), regulado por las siguientes cláusulas:</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">PRIMERA · Objeto y servicios</h3>
  ${serviciosTexto}

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">SEGUNDA · Plazo</h3>
  <p>El presente Contrato entra en vigor el <strong>${fInicio}</strong> y se mantendrá vigente por tiempo indefinido, pudiendo cualquiera de las partes resolverlo sin expresión de causa con un preaviso por escrito (incluido correo electrónico) no menor a <strong>quince (15) días</strong>.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">TERCERA · Compensación</h3>
  ${compensacion}

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">CUARTA · Naturaleza del vínculo (Independent Contractor)</h3>
  <p>Las partes <strong>expresamente reconocen</strong> que el presente vínculo es de naturaleza estrictamente <strong>contractual independiente</strong>, conforme a la figura de <em>"Independent Contractor"</em> reconocida en la legislación de los Estados Unidos de América. <strong>No existe ni se constituye</strong> entre las partes relación laboral, dependencia jerárquica, subordinación económica, ni vínculo societario alguno. El <strong>${partyLabel}</strong> NO es empleado, agente, socio ni representante legal de la <strong>COMPAÑÍA</strong>, y nada en este Contrato puede interpretarse en sentido contrario.</p>
  <p>El <strong>${partyLabel}</strong> presta los Servicios con sus propios medios técnicos y organiza libremente su jornada, sin perjuicio del cumplimiento de los lineamientos operativos acordados.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">QUINTA · Responsabilidad fiscal</h3>
  <p>El <strong>${partyLabel}</strong> es el único y exclusivo responsable de <strong>declarar y pagar todos los impuestos, contribuciones, aportes a la seguridad social y demás obligaciones tributarias</strong> que correspondan en su país de residencia fiscal, derivados de los pagos recibidos en virtud del presente Contrato. La <strong>COMPAÑÍA</strong> no efectuará retención fiscal alguna, salvo que la normativa estadounidense aplicable así lo exigiera (por ejemplo, ante la falta de Form W-8BEN).</p>
  <p>El <strong>${partyLabel}</strong> se obliga a entregar a la <strong>COMPAÑÍA</strong> el formulario <strong>W-8BEN</strong> (o W-9, si correspondiere) debidamente firmado, dentro de los treinta (30) días corridos siguientes a la firma del presente.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">SEXTA · Confidencialidad</h3>
  <p>El <strong>${partyLabel}</strong> se obliga a mantener la <strong>más estricta confidencialidad</strong> sobre toda información a la que acceda con motivo de la prestación de Servicios, incluyendo, sin limitación:</p>
  <ul style="margin:6px 0 8px 22px;padding:0">
    <li>Identidad real, datos personales y de contacto de las <em>modelos representadas</em>;</li>
    <li>Credenciales de acceso a plataformas digitales;</li>
    <li>Datos de suscriptores, conversaciones, contenido producido y bases de datos comerciales;</li>
    <li>Estrategias comerciales, planes de marketing y procedimientos operativos internos.</li>
  </ul>
  <p>La obligación de confidencialidad se mantendrá <strong>indefinidamente</strong>, incluso después de finalizado el Contrato.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">SÉPTIMA · Propiedad Intelectual</h3>
  <p>Todo el material, contenido, mensajes, conversaciones, base de datos de suscriptores y cualquier otra producción intelectual generada por el <strong>${partyLabel}</strong> con motivo de la prestación de los Servicios es y será de <strong>exclusiva propiedad de la COMPAÑÍA</strong>. El <strong>${partyLabel}</strong> cede de forma automática, irrevocable y a título gratuito todos los derechos patrimoniales sobre dicha producción a favor de la <strong>COMPAÑÍA</strong>.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">OCTAVA · No competencia</h3>
  <p>Durante la vigencia del presente Contrato y por un plazo de <strong>seis (6) meses</strong> contados desde su terminación, el <strong>${partyLabel}</strong> se compromete a NO prestar servicios análogos o sustancialmente similares para <strong>agencias competidoras directas</strong> de la <strong>COMPAÑÍA</strong>, ni a establecer relación comercial con las modelos que representó la <strong>COMPAÑÍA</strong> durante su vínculo, sin autorización previa y por escrito.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">NOVENA · Terminación</h3>
  <p>Cualquiera de las partes podrá resolver el Contrato en cualquier momento, con un preaviso por escrito de quince (15) días. Adicionalmente, la <strong>COMPAÑÍA</strong> podrá resolver el Contrato <strong>de manera inmediata y sin preaviso</strong> en caso de incumplimiento grave del <strong>${partyLabel}</strong>, incluyendo (sin limitación): violación de confidencialidad, conducta dolosa, divulgación de credenciales, o incumplimiento reiterado de los lineamientos operativos.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">DÉCIMA · Ley aplicable y jurisdicción</h3>
  <p>El presente Contrato se rige por las <strong>leyes del Estado de Delaware, Estados Unidos de América</strong>. Toda controversia derivada del Contrato será sometida a la jurisdicción de los tribunales competentes del Estado de Delaware, EE.UU., con renuncia expresa a cualquier otro fuero que pudiera corresponder.</p>

  <h3 style="font-family:Georgia,serif;color:${ACCENT};font-size:13px;margin:18px 0 6px">DÉCIMO PRIMERA · Disposiciones finales</h3>
  <p>El presente Contrato constituye el <strong>acuerdo íntegro</strong> entre las partes, prevalece sobre cualquier acuerdo previo verbal o escrito, y solo podrá ser modificado mediante adenda escrita firmada por ambas partes. La invalidez de cualquier cláusula no afectará la validez del resto del Contrato.</p>

  <p style="margin:30px 0 12px;text-align:justify">En conformidad con lo expuesto, las partes firman el presente Contrato en dos ejemplares de igual tenor y valor, en la fecha indicada al inicio.</p>

  <!-- FIRMAS -->
  <table style="width:100%;border-collapse:collapse;margin-top:50px;font-family:Arial,sans-serif">
    <tr>
      <td style="width:48%;vertical-align:top;text-align:center">
        <div style="border-top:1.5px solid ${VALUE};margin:0 12px;padding-top:8px">
          <div style="font-size:11px;font-weight:700;color:${VALUE}">${LLC_INFO.nombre}</div>
          <div style="font-size:9px;color:${MUTED};margin-top:2px">LA COMPAÑÍA</div>
          <div style="font-size:9px;color:${MUTED};margin-top:6px">EIN ${LLC_INFO.ein}</div>
        </div>
      </td>
      <td style="width:4%"></td>
      <td style="width:48%;vertical-align:top;text-align:center">
        <div style="border-top:1.5px solid ${VALUE};margin:0 12px;padding-top:8px">
          <div style="font-size:11px;font-weight:700;color:${VALUE}">${fiscal}</div>
          <div style="font-size:9px;color:${MUTED};margin-top:2px">EL ${partyLabel}</div>
          <div style="font-size:9px;color:${MUTED};margin-top:6px">${idDoc}</div>
        </div>
      </td>
    </tr>
  </table>

  <div style="margin-top:36px;padding:9px 12px;background:#f9fafb;border-left:3px solid ${ACCENT};font-size:8.5px;color:${MUTED};line-height:1.5">
    <strong style="color:${VALUE};text-transform:uppercase;letter-spacing:0.06em;font-size:8px">Nota legal</strong><br>
    Este documento es un Independent Contractor Agreement (ICA) bajo la legislación del Estado de Delaware, EE.UU. Su firma constituye reconocimiento expreso de la naturaleza independiente del vínculo. Cualquier disputa será resuelta en los tribunales de Delaware.
  </div>

  <div style="margin-top:12px;text-align:center;color:#9ca3af;font-size:8.5px;letter-spacing:0.08em;text-transform:uppercase">
    ${LLC_INFO.nombre} · ${new Date().getFullYear()} · ICA v1-es
  </div>

</div>`;
  }

  // ═══════════════════════════════════════════════════════
  // FASE 3 · VISTA: COBROS A MODELOS
  // ═══════════════════════════════════════════════════════
  async function renderCobros(view) {
    const mes = currentMes();
    view.innerHTML = Skel.full();
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
    view.innerHTML = Skel.full();
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
    view.innerHTML = Skel.full();
    try {
      // Mes actual + mes anterior para comparativa
      const [yy, mm] = mes.split('-').map(Number);
      const dPrev = new Date(yy, mm - 2, 1);
      const mesPrev = `${dPrev.getFullYear()}-${String(dPrev.getMonth() + 1).padStart(2, '0')}`;
      const [p, pPrev] = await Promise.all([
        api('pnl', { params: { mes } }),
        api('pnl', { params: { mes: mesPrev } }).catch(() => null)
      ]);
      const totalGastos = p.pagos_chatters + p.pagos_supervisor + p.pagos_equipo_fijo + p.gasto_om_agencia + p.gastos_otros;
      const prevTotalGastos = pPrev ? (pPrev.pagos_chatters + pPrev.pagos_supervisor + pPrev.pagos_equipo_fijo + pPrev.gasto_om_agencia + pPrev.gastos_otros) : 0;

      // Helper para badge de Δ vs mes anterior
      const delta = (curr, prev, opts = {}) => {
        if (!pPrev || prev == null || (prev === 0 && curr === 0)) return '';
        const diff = curr - prev;
        const pct = prev === 0 ? 100 : (diff / Math.abs(prev)) * 100;
        const isPositive = opts.invert ? diff < 0 : diff > 0;
        const cls = Math.abs(diff) < 0.01 ? 'flat' : (isPositive ? 'up' : 'down');
        const arrow = Math.abs(diff) < 0.01 ? '→' : (diff > 0 ? '↑' : '↓');
        return `<span class="pnl-delta pnl-delta-${cls}" title="Mes anterior: ${fmtMoney(prev)}">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
      };

      const pnlLine = (label, valor, valorPrev, opts = {}) => `
        <div class="pnl-line">
          <span class="pnl-line-lbl">${label}</span>
          <div class="pnl-line-vals">
            <strong style="color:${opts.color || 'inherit'}">${opts.minus ? '−' : ''}${fmtMoney(valor)}</strong>
            ${delta(valor, valorPrev, opts)}
          </div>
        </div>
      `;

      view.innerHTML = `
        <div class="pnl-header">
          <div>
            <h2 class="pnl-title">P&amp;L · ${fmtMesNice(mes)}</h2>
            <p class="pnl-sub">${pPrev ? `Comparado con ${fmtMesNice(mesPrev)}` : 'Sin datos del mes anterior para comparar'}</p>
          </div>
          <div class="pnl-net-hero" style="--net-color:${p.neto_owner >= 0 ? 'var(--green)' : 'var(--red)'}">
            <div class="pnl-net-lbl">Neto Owner</div>
            <div class="pnl-net-val">${fmtMoney(p.neto_owner)}</div>
            ${pPrev ? `<div class="pnl-net-delta">${delta(p.neto_owner, pPrev.neto_owner)} <span class="muted">vs mes ant.</span></div>` : ''}
          </div>
        </div>

        <div class="kpi-row pnl-kpis">
          <div class="kpi-mini big">
            <div class="kpi-mini-lbl">Facturación total</div>
            <div class="kpi-mini-val">${fmtMoney(p.fact_total)}</div>
            ${pPrev ? delta(p.fact_total, pPrev.fact_total) : ''}
          </div>
          <div class="kpi-mini big">
            <div class="kpi-mini-lbl">Suscripciones</div>
            <div class="kpi-mini-val">${fmtMoney(p.suscripciones)}</div>
            ${pPrev ? delta(p.suscripciones, pPrev.suscripciones) : ''}
          </div>
          <div class="kpi-mini big">
            <div class="kpi-mini-lbl">Fact s/subs</div>
            <div class="kpi-mini-val">${fmtMoney(p.fact_sin_subs)}</div>
            ${pPrev ? delta(p.fact_sin_subs, pPrev.fact_sin_subs) : ''}
          </div>
          <div class="kpi-mini big highlight">
            <div class="kpi-mini-lbl">Ganancia bruta agencia</div>
            <div class="kpi-mini-val">${fmtMoney(p.ganancia_bruta_agencia)}</div>
            ${pPrev ? delta(p.ganancia_bruta_agencia, pPrev.ganancia_bruta_agencia) : ''}
          </div>
        </div>

        <div class="pnl-grid">
          <div class="card pnl-card-in">
            <div class="pnl-card-head">
              <span class="section-ico section-ico--green"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
              <h3>Ingresos</h3>
            </div>
            ${pnlLine('Total facturado a modelos', p.ingreso_bruto, pPrev?.ingreso_bruto, { color: 'var(--green)' })}
            <div class="pnl-card-total">
              <span>Ingreso bruto</span>
              <strong style="color:var(--green)">${fmtMoney(p.ingreso_bruto)}</strong>
            </div>
          </div>

          <div class="card pnl-card-out">
            <div class="pnl-card-head">
              <span class="section-ico section-ico--red"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg></span>
              <h3>Egresos</h3>
            </div>
            ${pnlLine('Pagos a chatters', p.pagos_chatters, pPrev?.pagos_chatters, { color: 'var(--red)', minus: true, invert: true })}
            ${pnlLine('Pago supervisor (Jony)', p.pagos_supervisor, pPrev?.pagos_supervisor, { color: 'var(--red)', minus: true, invert: true })}
            ${pnlLine('Equipo fijo (sueldos)', p.pagos_equipo_fijo, pPrev?.pagos_equipo_fijo, { color: 'var(--red)', minus: true, invert: true })}
            ${pnlLine('OnlyMonster (parte agencia)', p.gasto_om_agencia, pPrev?.gasto_om_agencia, { color: 'var(--red)', minus: true, invert: true })}
            ${pnlLine('Otros gastos del mes', p.gastos_otros, pPrev?.gastos_otros, { color: 'var(--red)', minus: true, invert: true })}
            <div class="pnl-card-total">
              <span>Total egresos</span>
              <strong style="color:var(--red)">−${fmtMoney(totalGastos)}</strong>
            </div>
          </div>
        </div>

        <div class="pnl-summary-bar">
          <div class="pnl-sum-item">
            <div class="pnl-sum-lbl">Ingreso bruto</div>
            <div class="pnl-sum-val" style="color:var(--green)">${fmtMoney(p.ingreso_bruto)}</div>
            ${pPrev ? delta(p.ingreso_bruto, pPrev.ingreso_bruto) : ''}
          </div>
          <div class="pnl-sum-op">−</div>
          <div class="pnl-sum-item">
            <div class="pnl-sum-lbl">Total egresos</div>
            <div class="pnl-sum-val" style="color:var(--red)">${fmtMoney(totalGastos)}</div>
            ${pPrev ? delta(totalGastos, prevTotalGastos, { invert: true }) : ''}
          </div>
          <div class="pnl-sum-op">=</div>
          <div class="pnl-sum-item pnl-sum-net">
            <div class="pnl-sum-lbl">Neto Owner</div>
            <div class="pnl-sum-val pnl-sum-val-net" style="color:${p.neto_owner >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(p.neto_owner)}</div>
            ${pPrev ? delta(p.neto_owner, pPrev.neto_owner) : ''}
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
  // ═══════════════════════════════════════════════════════
  // CONTABILIDAD · Libro Mayor del mes
  // ═══════════════════════════════════════════════════════
  async function renderContabilidad(view) {
    const mes = currentMes();
    view.innerHTML = Skel.full();
    try {
      const r = await api('libro-mayor', { params: { mes } });
      const k = r.kpis || {};
      const lineas = r.lineas || [];

      // Calcular balance acumulado
      let balance = 0;
      const lineasConBalance = lineas.map(l => {
        balance += l.tipo === 'ingreso' ? l.monto : -l.monto;
        return { ...l, balance };
      });

      const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';
      const categoriaLabel = {
        cobro_modelo:    'Cobro Modelo',
        pago_chatter:    'Pago Chatter',
        pago_supervisor: 'Pago Supervisor',
        pago_equipo:     'Pago Equipo',
        publicidad:      'Publicidad',
        herramientas:    'Herramientas',
        ia:              'IA',
        om:              'OnlyMonster',
        incentivos:      'Incentivos',
        otros:           'Otros'
      };

      const rows = lineasConBalance.map(l => {
        const sign = l.tipo === 'ingreso' ? '+' : '−';
        const color = l.tipo === 'ingreso' ? 'var(--green)' : 'var(--red)';
        const balColor = l.balance >= 0 ? 'var(--green)' : 'var(--red)';
        const catSlug = String(l.categoria || 'otros').toLowerCase();
        const catLbl = categoriaLabel[catSlug] || catSlug;
        const archivoBtn = l.archivo_url
          ? `<a href="${escapeHtml(l.archivo_url)}" target="_blank" rel="noopener" title="Abrir comprobante" class="lm-archivo">📎</a>`
          : '<span class="muted" style="opacity:0.3">—</span>';
        return `
          <tr>
            <td style="font-size:0.78rem;color:var(--text-mute);white-space:nowrap">${fmtFecha(l.fecha)}</td>
            <td>${escapeHtml(l.concepto)}</td>
            <td><span class="pill cat-${catSlug}" style="font-size:0.7rem">${catLbl}</span></td>
            <td style="text-align:right;color:${color};font-weight:700;font-variant-numeric:tabular-nums">${l.tipo === 'ingreso' ? sign + fmtMoney(l.monto, l.moneda) : ''}</td>
            <td style="text-align:right;color:${color};font-weight:700;font-variant-numeric:tabular-nums">${l.tipo === 'egreso' ? sign + fmtMoney(l.monto, l.moneda) : ''}</td>
            <td style="text-align:right;color:${balColor};font-weight:800;font-variant-numeric:tabular-nums">${fmtMoney(l.balance, l.moneda)}</td>
            <td style="text-align:center">${archivoBtn}</td>
          </tr>
        `;
      }).join('');

      view.innerHTML = `
        <div class="kpi-row" style="margin-bottom:18px">
          <div class="kpi-mini big">
            <div class="kpi-mini-lbl">Total ingresos</div>
            <div class="kpi-mini-val" style="color:var(--green)">${fmtMoney(k.total_ingresos)}</div>
          </div>
          <div class="kpi-mini big">
            <div class="kpi-mini-lbl">Total egresos</div>
            <div class="kpi-mini-val" style="color:var(--red)">${fmtMoney(k.total_egresos)}</div>
          </div>
          <div class="kpi-mini big highlight">
            <div class="kpi-mini-lbl">Neto del mes</div>
            <div class="kpi-mini-val" style="color:${k.neto >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(k.neto)}</div>
          </div>
          <div class="kpi-mini big">
            <div class="kpi-mini-lbl">Movimientos · Archivos</div>
            <div class="kpi-mini-val" style="font-size:1.2rem">${k.cantidad_lineas || 0} · ${k.cantidad_archivos || 0}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
            <span><span class="section-ico section-ico--gold"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span> Libro Mayor · ${fmtMesNice(mes)}</span>
            <div style="display:flex;gap:8px">
              <button class="btn-secondary" id="lm-export-csv" style="width:auto;padding:8px 14px;font-size:0.82rem">📥 Exportar CSV</button>
              <button class="btn-primary" id="lm-upload" style="width:auto;padding:8px 14px;font-size:0.82rem">+ Subir comprobante</button>
            </div>
          </div>
          <p class="card-sub">Vista cronológica unificada del mes. Click 📎 abre el archivo respaldatorio si existe.</p>
          <div class="table-wrap" style="margin-top:14px">
            <table class="libro-mayor-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th style="text-align:right">Ingreso</th>
                  <th style="text-align:right">Egreso</th>
                  <th style="text-align:right">Balance</th>
                  <th style="text-align:center">📎</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">Sin movimientos en ' + fmtMesNice(mes) + '. Cargá cobros, gastos o liquidaciones desde sus pestañas.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('lm-export-csv')?.addEventListener('click', () => {
        const csv = [
          ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Subcategoría', 'Monto', 'Moneda', 'Balance'].join(','),
          ...lineasConBalance.map(l => [
            l.fecha ? new Date(l.fecha).toISOString().slice(0, 10) : '',
            l.tipo,
            `"${(l.concepto || '').replace(/"/g, '""')}"`,
            l.categoria || '',
            l.subcategoria || '',
            l.monto.toFixed(2),
            l.moneda,
            l.balance.toFixed(2)
          ].join(','))
        ].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `libro-mayor-${mes}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('CSV descargado', 'success');
      });

      document.getElementById('lm-upload')?.addEventListener('click', () => {
        openArchivoUploadModal({ categoria: 'comprobante_pago', mes });
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // ARCHIVOS · Gestión de archivos respaldatorios
  // ═══════════════════════════════════════════════════════
  const ARCHIVO_CATEGORIAS = [
    { key: 'factura_recibida',  label: 'Factura recibida',  sub: ['OnlyMonster', 'Anthropic', 'Notion', 'Linktree', 'Reddit', 'OnlyFans Fee'] },
    { key: 'comprobante_pago',  label: 'Comprobante pago',  sub: ['Binance', 'Paxum', 'Wise', 'Bizum', 'Mercury Wire'] },
    { key: 'extracto_bancario', label: 'Extracto bancario', sub: ['Mercury', 'Wise', 'Skrill'] },
    { key: 'contrato_chatter',  label: 'Contrato chatter',  sub: ['ICA firmado', 'W-8BEN', 'W-9'] },
    { key: 'w8_w9',             label: 'W-8BEN / W-9',      sub: ['W-8BEN', 'W-9'] },
    { key: 'otros',             label: 'Otros',             sub: [] }
  ];

  async function renderArchivos(view) {
    const filtros = window._archivosFiltros || {};
    view.innerHTML = Skel.full();
    try {
      const params = {};
      if (filtros.mes)            params.mes = filtros.mes;
      if (filtros.categoria)      params.categoria = filtros.categoria;
      const r = await api('archivos-list', { params });
      let archivos = r.data || [];
      // Búsqueda por texto client-side
      const search = (filtros.search || '').trim().toLowerCase();
      if (search) {
        archivos = archivos.filter(a =>
          (a.descripcion || '').toLowerCase().includes(search) ||
          (a.subcategoria || '').toLowerCase().includes(search) ||
          (a.filename || '').toLowerCase().includes(search)
        );
      }

      const catOptions = ARCHIVO_CATEGORIAS.map(c =>
        `<option value="${c.key}" ${filtros.categoria === c.key ? 'selected' : ''}>${c.label}</option>`
      ).join('');

      const cards = archivos.map(a => {
        const isImage = (a.mime_type || '').startsWith('image/');
        const thumb = isImage
          ? `<img src="${escapeHtml(a.blob_url)}" alt="" loading="lazy"/>`
          : `<div class="archivo-icon">${(a.mime_type || '').includes('pdf') ? '📄' : '📎'}</div>`;
        const catCfg = ARCHIVO_CATEGORIAS.find(c => c.key === a.categoria);
        const catLbl = catCfg ? catCfg.label : a.categoria;
        return `
          <div class="archivo-card" data-id="${a.id}">
            <div class="archivo-thumb">${thumb}</div>
            <div class="archivo-body">
              <div class="archivo-title" title="${escapeHtml(a.descripcion || a.filename)}">${escapeHtml(a.descripcion || a.filename)}</div>
              <div class="archivo-meta">
                <span class="pill cat-${a.categoria}" style="font-size:0.68rem">${catLbl}</span>
                ${a.subcategoria ? `<span class="muted" style="font-size:0.72rem">${escapeHtml(a.subcategoria)}</span>` : ''}
              </div>
              <div class="archivo-meta">
                ${a.mes ? `<span class="muted" style="font-size:0.72rem">${a.mes}</span>` : ''}
                ${a.monto != null ? `<strong style="font-size:0.84rem">${fmtMoney(a.monto, a.moneda)}</strong>` : ''}
              </div>
              <div class="archivo-actions">
                <a class="btn-ghost-small" href="${escapeHtml(a.blob_url)}" target="_blank" rel="noopener" title="Abrir">👁</a>
                <button class="btn-ghost-small archivo-edit" data-id="${a.id}" title="Editar metadata">✎</button>
                <button class="btn-danger archivo-del" data-id="${a.id}" title="Borrar">🗑</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      view.innerHTML = `
        <div class="card" style="margin-bottom:18px">
          <div class="archivos-toolbar">
            <div class="archivos-filtros">
              <input type="month" id="arch-mes" value="${filtros.mes || ''}" placeholder="Todos los meses">
              <select id="arch-cat">
                <option value="">Todas las categorías</option>
                ${catOptions}
              </select>
              <input type="text" id="arch-search" placeholder="🔍 Buscar..." value="${escapeHtml(filtros.search || '')}">
              <button class="btn-secondary" id="arch-clear" style="width:auto;padding:8px 14px;font-size:0.82rem">Limpiar</button>
            </div>
            <button class="btn-primary" id="arch-upload" style="width:auto;padding:10px 18px">+ Subir archivo</button>
          </div>
        </div>

        <div class="archivos-grid">
          ${cards || '<div class="card empty-state center" style="padding:48px"><div class="big">📁</div><div>Sin archivos cargados. Subí tu primer respaldo.</div></div>'}
        </div>
      `;

      document.getElementById('arch-mes')?.addEventListener('change', (e) => {
        window._archivosFiltros = { ...filtros, mes: e.target.value || null };
        renderArchivos(view);
      });
      document.getElementById('arch-cat')?.addEventListener('change', (e) => {
        window._archivosFiltros = { ...filtros, categoria: e.target.value || null };
        renderArchivos(view);
      });
      let searchTimer;
      document.getElementById('arch-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          window._archivosFiltros = { ...filtros, search: e.target.value };
          renderArchivos(view);
        }, 250);
      });
      document.getElementById('arch-clear')?.addEventListener('click', () => {
        window._archivosFiltros = {};
        renderArchivos(view);
      });
      document.getElementById('arch-upload')?.addEventListener('click', () => {
        openArchivoUploadModal({ mes: filtros.mes || currentMes() });
      });
      view.querySelectorAll('.archivo-del').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('¿Borrar este archivo? El archivo se elimina del storage también.')) return;
          try {
            await api('archivo-delete', { method: 'POST', params: { id: b.dataset.id } });
            toast('Archivo borrado', 'success');
            renderArchivos(view);
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
      view.querySelectorAll('.archivo-edit').forEach(b => {
        b.addEventListener('click', () => {
          const arch = archivos.find(a => String(a.id) === b.dataset.id);
          if (arch) openArchivoEditModal(arch, view);
        });
      });
    } catch (e) {
      view.innerHTML = `<div class="card center muted">⚠️ ${e.message}</div>`;
    }
  }

  // ─── Modal de upload de archivo ───
  function openArchivoUploadModal(prefill = {}) {
    const catOptions = ARCHIVO_CATEGORIAS.map(c =>
      `<option value="${c.key}" ${prefill.categoria === c.key ? 'selected' : ''}>${c.label}</option>`
    ).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <div class="modal-title">📤 Subir archivo</div>
          <button class="modal-close" type="button">✕</button>
        </div>
        <form id="arch-upload-form">
          <div class="upload-dropzone" id="arch-dropzone">
            <input type="file" id="arch-file" accept="application/pdf,image/*" hidden>
            <div class="dropzone-content">
              <div style="font-size:2rem">📎</div>
              <div style="font-weight:600;margin-top:8px">Arrastrá un archivo aquí</div>
              <div class="muted" style="font-size:0.78rem;margin-top:4px">o hacé click para seleccionar · PDF / imagen · máx 8 MB</div>
              <div id="arch-file-name" class="muted" style="font-size:0.82rem;margin-top:10px;font-weight:600;color:var(--brand)"></div>
            </div>
          </div>

          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
            <div>
              <label for="arch-cat-input">Categoría *</label>
              <select id="arch-cat-input" required>
                <option value="">Elegí…</option>
                ${catOptions}
              </select>
            </div>
            <div>
              <label for="arch-sub-input">Subcategoría</label>
              <input type="text" id="arch-sub-input" placeholder="ej: OnlyMonster, Mercury, Binance…" list="arch-sub-options">
              <datalist id="arch-sub-options"></datalist>
            </div>
            <div class="full">
              <label for="arch-desc-input">Descripción</label>
              <input type="text" id="arch-desc-input" placeholder="ej: Factura mayo OnlyMonster">
            </div>
            <div>
              <label for="arch-mes-input">Mes</label>
              <input type="month" id="arch-mes-input" value="${prefill.mes || currentMes()}">
            </div>
            <div>
              <label for="arch-monto-input">Monto (opcional)</label>
              <input type="number" id="arch-monto-input" step="0.01" placeholder="0.00">
            </div>
            <div class="full">
              <label for="arch-notas-input">Notas</label>
              <input type="text" id="arch-notas-input" placeholder="Detalles adicionales…">
            </div>
          </div>

          <div class="form-actions" style="margin-top:18px">
            <button type="button" class="btn-secondary modal-cancel">Cancelar</button>
            <button type="submit" class="btn-primary" id="arch-submit">Subir</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    backdrop.querySelector('.modal-close').addEventListener('click', closeModal);
    backdrop.querySelector('.modal-cancel').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

    const fileInput = backdrop.querySelector('#arch-file');
    const dropzone = backdrop.querySelector('#arch-dropzone');
    const fileNameEl = backdrop.querySelector('#arch-file-name');
    let selectedFile = null;

    const setFile = (f) => {
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast('Archivo muy grande (máx 8 MB)', 'error'); return; }
      selectedFile = f;
      fileNameEl.textContent = `✓ ${f.name} (${(f.size / 1024).toFixed(0)} KB)`;
    };

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => setFile(e.target.files[0]));
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      setFile(e.dataTransfer.files[0]);
    });

    // Actualizar sugerencias de subcategoría según categoría
    const catSelect = backdrop.querySelector('#arch-cat-input');
    const datalist = backdrop.querySelector('#arch-sub-options');
    const updateSugs = () => {
      const cfg = ARCHIVO_CATEGORIAS.find(c => c.key === catSelect.value);
      datalist.innerHTML = (cfg?.sub || []).map(s => `<option value="${s}">`).join('');
    };
    catSelect.addEventListener('change', updateSugs);
    updateSugs();

    backdrop.querySelector('#arch-upload-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedFile) { toast('Seleccioná un archivo', 'error'); return; }
      const submitBtn = backdrop.querySelector('#arch-submit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Subiendo…';
      try {
        const dataBase64 = await fileToBase64(selectedFile);
        await api('archivo-upload', {
          method: 'POST',
          body: {
            filename: selectedFile.name,
            mime_type: selectedFile.type,
            data_base64: dataBase64,
            categoria: catSelect.value,
            subcategoria: backdrop.querySelector('#arch-sub-input').value || null,
            descripcion: backdrop.querySelector('#arch-desc-input').value || null,
            mes: backdrop.querySelector('#arch-mes-input').value || null,
            monto: backdrop.querySelector('#arch-monto-input').value || null,
            moneda: 'USD',
            notas: backdrop.querySelector('#arch-notas-input').value || null
          }
        });
        toast('Archivo subido ✓', 'success');
        closeModal();
        const route = location.hash.replace('#', '') || 'resumen';
        if (route === 'archivos' || route === 'contabilidad') navigate(route);
      } catch (err) {
        toast('Error: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Subir';
      }
    });
  }

  function openArchivoEditModal(arch, view) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div class="modal-header">
          <div class="modal-title">✎ Editar metadata</div>
          <button class="modal-close" type="button">✕</button>
        </div>
        <form id="arch-edit-form">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="full">
              <label>Descripción</label>
              <input type="text" id="ed-desc" value="${escapeHtml(arch.descripcion || '')}">
            </div>
            <div>
              <label>Mes</label>
              <input type="month" id="ed-mes" value="${arch.mes || ''}">
            </div>
            <div>
              <label>Monto</label>
              <input type="number" id="ed-monto" step="0.01" value="${arch.monto || ''}">
            </div>
            <div class="full">
              <label>Subcategoría</label>
              <input type="text" id="ed-sub" value="${escapeHtml(arch.subcategoria || '')}">
            </div>
            <div class="full">
              <label>Notas</label>
              <input type="text" id="ed-notas" value="${escapeHtml(arch.notas || '')}">
            </div>
          </div>
          <div class="form-actions" style="margin-top:14px">
            <button type="button" class="btn-secondary modal-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.querySelector('.modal-cancel').addEventListener('click', close);
    backdrop.querySelector('#arch-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('archivo-update', {
          method: 'POST',
          params: { id: arch.id },
          body: {
            descripcion: backdrop.querySelector('#ed-desc').value || null,
            mes: backdrop.querySelector('#ed-mes').value || null,
            monto: backdrop.querySelector('#ed-monto').value || null,
            subcategoria: backdrop.querySelector('#ed-sub').value || null,
            notas: backdrop.querySelector('#ed-notas').value || null
          }
        });
        toast('Actualizado', 'success');
        close();
        renderArchivos(view);
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  // Helper: file → base64 string (sin data: prefix)
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(',')[1]; // sacar prefix "data:...;base64,"
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  }
  window.openArchivoUploadModal = openArchivoUploadModal;

  // ─── Modal upload TMA de modelo ───
  async function openTMAUploadModal(modelo, refreshFn) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const hasTMA = !!modelo.tma_url;
    backdrop.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div class="modal-header">
          <div class="modal-title">📜 ${hasTMA ? 'Reemplazar' : 'Subir'} TMA · ${escapeHtml(modelo.nombre)}</div>
          <button class="modal-close" type="button">✕</button>
        </div>
        <form id="tma-form">
          ${hasTMA ? `
            <div style="padding:10px 14px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:8px;margin-bottom:12px">
              <div style="font-size:0.84rem">TMA actual:
                <a href="${escapeHtml(modelo.tma_url)}" target="_blank" rel="noopener" style="color:var(--info);text-decoration:underline">Ver PDF</a>
                ${modelo.tma_signed_date ? `· firmado el <strong>${modelo.tma_signed_date}</strong>` : ''}
              </div>
              <div class="muted" style="font-size:0.74rem;margin-top:4px">⚠ Al subir uno nuevo se reemplaza el anterior (no se puede recuperar).</div>
            </div>
          ` : ''}
          <div class="upload-dropzone" id="tma-dropzone">
            <input type="file" id="tma-file" accept="application/pdf,image/*" hidden>
            <div class="dropzone-content">
              <div style="font-size:2rem">📄</div>
              <div style="font-weight:600;margin-top:8px">Arrastrá el TMA firmado aquí</div>
              <div class="muted" style="font-size:0.78rem;margin-top:4px">PDF o imagen · máx 8 MB</div>
              <div id="tma-file-name" class="muted" style="font-size:0.82rem;margin-top:10px;font-weight:600;color:var(--brand)"></div>
            </div>
          </div>
          <div class="form-grid" style="grid-template-columns:1fr;gap:12px;margin-top:14px">
            <div>
              <label for="tma-date">Fecha de firma</label>
              <input type="date" id="tma-date" value="${modelo.tma_signed_date || new Date().toISOString().slice(0, 10)}">
            </div>
          </div>
          <div class="form-actions" style="margin-top:14px">
            <button type="button" class="btn-secondary modal-cancel">Cancelar</button>
            <button type="submit" class="btn-primary" id="tma-submit">${hasTMA ? 'Reemplazar' : 'Subir'} TMA</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.querySelector('.modal-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    const fileInput = backdrop.querySelector('#tma-file');
    const dropzone = backdrop.querySelector('#tma-dropzone');
    const fileNameEl = backdrop.querySelector('#tma-file-name');
    let selectedFile = null;
    const setFile = (f) => {
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast('Archivo muy grande (máx 8 MB)', 'error'); return; }
      selectedFile = f;
      fileNameEl.textContent = `✓ ${f.name} (${(f.size / 1024).toFixed(0)} KB)`;
    };
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => setFile(e.target.files[0]));
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); setFile(e.dataTransfer.files[0]); });

    backdrop.querySelector('#tma-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedFile) { toast('Seleccioná un archivo', 'error'); return; }
      const submitBtn = backdrop.querySelector('#tma-submit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Subiendo…';
      try {
        const dataBase64 = await fileToBase64(selectedFile);
        await api('modelo-tma-upload', {
          method: 'POST',
          body: {
            modelo_id: modelo.id,
            filename: selectedFile.name,
            mime_type: selectedFile.type,
            data_base64: dataBase64,
            tma_signed_date: backdrop.querySelector('#tma-date').value || null
          }
        });
        toast(`TMA ${hasTMA ? 'reemplazado' : 'subido'} ✓`, 'success');
        close();
        if (refreshFn) refreshFn();
      } catch (err) {
        toast('Error: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = hasTMA ? 'Reemplazar TMA' : 'Subir TMA';
      }
    });
  }
  window.openTMAUploadModal = openTMAUploadModal;

  async function renderIncentivos(view) {
    view.innerHTML = Skel.full();
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

  // ───────── Mobile sidebar drawer ─────────
  function openMobileSidebar() {
    document.querySelector('.sidebar')?.classList.add('open');
    document.getElementById('mobile-sidebar-backdrop')?.classList.add('open');
  }
  function closeMobileSidebar() {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.getElementById('mobile-sidebar-backdrop')?.classList.remove('open');
  }
  document.getElementById('mobile-menu-btn')?.addEventListener('click', openMobileSidebar);
  document.getElementById('mobile-sidebar-backdrop')?.addEventListener('click', closeMobileSidebar);
  // Cerrar drawer al navegar
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(n =>
    n.addEventListener('click', () => closeMobileSidebar()));

  boot();
})();
