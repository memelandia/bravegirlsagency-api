/* ============================================
   Inspo Vault — BraveGirls Agency
   Full rewrite v4 — All bugs fixed
   ============================================ */

(function () {
  'use strict';

  const API_BASE = 'https://bravegirlsagency-api.vercel.app/api';

  // ─── EMOJI MAPS (display only — Notion values stay clean) ───
  const VERTICAL_EMOJIS = {
    'Humor': '😂', 'Texto en pantalla': '📝', 'Captions': '💬', 'Q&A': '❓',
    'Sexy Casual': '🔥', 'Twerk': '💃', 'Outfit Reveal': '👗', 'Sonido Viral': '🎵',
    'Tattoos': '🖤', 'Perfil Instagram': '📱', 'Posing': '📸', 'Bifida': '♿',
    'Cooking': '🍳', 'Pregunta Hombres': '🙋', 'Skit': '🎭', 'VIDEOREACCION': '🎬',
    'Gamer': '🎮', 'Trends/Bailes': '💃', 'Fake Omegle': '🎲', 'FITNESS': '💪',
    'Milf': '👩', 'Secretaria': '📋', 'Teen': '🎀', 'Streaming': '📺',
    'Asiatica': '🌸', 'Retos': '🏆', 'Yoga': '🧘', 'GYM': '🏋️',
    'Factos': '📊', 'MODELO IA': '🤖', 'MEDICA': '🩺'
  };
  const BRANDING_EMOJIS = {
    'Oficina': '🏢', 'Profesión': '💼', 'Humor': '😂', 'Pareja': '💑',
    'Público': '🌆', 'Fitness': '💪', 'MILF': '👩', 'Teen': '🎀',
    'Inocente': '😇', 'Niñera': '🍼', 'Psicóloga': '🧠', 'Becaria': '📋',
    'Secretaria': '💼', 'Médica': '🩺', 'Gamer': '🎮', 'Asiática': '🌸',
    'Motorista': '🏍️', 'Femdom': '👠', 'Streamer': '📺', 'Yoga': '🧘'
  };
  const VIRAL_EMOJIS = {
    'Mirada directa': '👀', 'Outfit hook': '👗', 'Reacción': '😱',
    'Storytime': '📖', 'Doble sentido': '😏', 'Caption fuerte': '💬',
    'Gesto sugerente': '🤭', 'Primer plano': '🎯', 'Agitación': '🔥',
    'Tendencia': '📈', 'Humor': '😂', 'Silencio': '🤫',
    'Baile': '💃', 'TTS': '🔊', 'Espejo': '🪞', 'Primer plano cara': '😍'
  };

  // ─── COLOR MAPS ───
  const VERTICAL_COLORS = {
    'Humor': '#f97316', 'Skit': '#f97316', 'VIDEOREACCION': '#f97316',
    'Trends/Bailes': '#f97316', 'Retos': '#f97316',
    'Captions': '#8b5cf6', 'Q&A': '#8b5cf6', 'Texto en pantalla': '#8b5cf6',
    'Pregunta Hombres': '#8b5cf6', 'Factos': '#8b5cf6',
    'Posing': '#ec4899', 'Sexy Casual': '#ec4899', 'Twerk': '#ec4899',
    'Outfit Reveal': '#ec4899', 'FITNESS': '#ec4899', 'GYM': '#ec4899', 'Yoga': '#ec4899',
    'Secretaria': '#06b6d4', 'MEDICA': '#06b6d4', 'Fake Omegle': '#06b6d4',
    'Streaming': '#06b6d4', 'Gamer': '#06b6d4', 'MODELO IA': '#06b6d4',
    'Cooking': '#10b981', 'Bifida': '#10b981', 'Tattoos': '#10b981',
    'Asiatica': '#10b981', 'Teen': '#10b981', 'Milf': '#10b981',
    'Sonido Viral': '#f59e0b', 'Perfil Instagram': '#f59e0b'
  };
  const MODELO_COLORS = {
    'VICKYLUNAA': '#8b5cf6', 'ARIANACRUZZ': '#ef4444', 'LEXIFLIX': '#f97316',
    'LUCY GARCIA': '#f59e0b', 'LILY MONTERO': '#ec4899', 'CARMENCITAX': '#06b6d4',
    'BELLAREY': '#10b981', 'NESSAPLAYY': '#6366f1', 'MODELO IA': '#6b7280'
  };
  const MERCADO_LABELS = {
    '🇪🇸': 'España', '🇺🇸': 'USA', '🇧🇷': 'Brasil'
  };

  function getVerticalColor(n) { return VERTICAL_COLORS[n] || '#8b5cf6'; }
  function getModeloColor(n) { return MODELO_COLORS[n] || '#10b981'; }
  function chipEmoji(name, type) {
    if (type === 'vertical') return VERTICAL_EMOJIS[name] || '';
    if (type === 'branding') return BRANDING_EMOJIS[name] || '';
    if (type === 'viral') return VIRAL_EMOJIS[name] || '';
    return '';
  }

  // ─── ENTRY NORMALIZER (BUG 1 fix — normalize mercado on load) ───
  function parseEntry(raw) {
    const e = { ...raw };
    if (e.mercado === '🇺🇲') e.mercado = '🇺🇸';
    return e;
  }

  // ─── STATE ───
  let allEntries = [];
  let filteredEntries = [];
  let dbOptions = { Vertical: [], 'Para Modelo': [], Branding: [], 'Elemento Viral': [] };
  let activeFilters = { search: '', mercado: '', vertical: [], modelo: [], branding: [], viral: [] };
  let reviewQueue = [];
  let reviewIndex = 0;
  let editingId = null;

  // ─── DOM ───
  const $ = s => document.querySelector(s);
  const dom = {
    loadingOverlay: $('#loading-overlay'),
    loadingStatus: $('#loading-status'),
    dashboard: $('#dashboard'),
    headerStats: $('#header-stats'),
    btnReview: $('#btn-review'),
    reviewCount: $('#review-count'),
    btnAdd: $('#btn-add'),
    btnVerify: $('#btn-verify'),
    btnDuplicates: $('#btn-duplicates'),
    filterSearch: $('#filter-search'),
    filterClear: $('#filter-clear'),
    filterVertical: $('#filter-vertical'),
    filterModelo: $('#filter-modelo'),
    filterBranding: $('#filter-branding'),
    filterViral: $('#filter-viral'),
    activeFiltersRow: $('#active-filters-row'),
    galleryCount: $('#gallery-count'),
    galleryGrid: $('#gallery-grid'),
    modalOverlay: $('#modal-overlay'),
    modalTitle: $('#modal-title'),
    modalBody: $('#modal-body'),
    modalAvatar: $('#modal-avatar'),
    modalClose: $('#modal-close'),
    modalCancel: $('#modal-cancel'),
    modalSave: $('#modal-save'),
    verifyOverlay: $('#verify-overlay'),
    verifyBody: $('#verify-body'),
    verifyClose: $('#verify-close'),
    reviewOverlay: $('#review-overlay'),
    reviewProgressBar: $('#review-progress-bar'),
    reviewCurrent: $('#review-current'),
    reviewTotal: $('#review-total'),
    reviewPreview: $('#review-preview'),
    reviewForm: $('#review-form'),
    reviewExit: $('#review-exit'),
    reviewPrev: $('#review-prev'),
    reviewSkip: $('#review-skip'),
    reviewSave: $('#review-save'),
    toastContainer: $('#toast-container')
  };

  // ─── HELPERS ───
  function esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    dom.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function isIncomplete(entry) {
    return (!entry.branding || entry.branding.length === 0) ||
           (!entry.elementoViral || entry.elementoViral.length === 0);
  }

  function extractUsername(link) {
    if (!link) return null;
    const m = link.match(/instagram\.com\/([^/?#]+)/);
    return m ? m[1].toLowerCase() : null;
  }

  function findDuplicateByUsername(username, excludeId) {
    if (!username) return null;
    return allEntries.find(e => {
      if (excludeId && e.id === excludeId) return false;
      const u = extractUsername(e.link);
      return u === username;
    });
  }

  function getAvatarUrl(link) {
    const u = extractUsername(link);
    return u ? `https://unavatar.io/instagram/${u}` : null;
  }

  function getInitials(name) {
    if (!name) return '📷';
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
  }

  // ─── API ───
  async function apiGet(path) {
    const res = await fetch(`${API_BASE}/${path}`);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    return res.json();
  }
  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    return res.json();
  }
  async function apiPatch(path, body) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    return res.json();
  }

  // ─── CONFIRM DIALOG ───
  function showConfirm(title, text, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">${esc(title)}</div>
        <div class="confirm-text">${text}</div>
        <div class="confirm-btns">
          <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
          <button class="btn btn-danger" data-action="confirm">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── HEADER STATS ───
  function updateHeaderStats() {
    const visible = allEntries.filter(e => e.estado !== 'FRANCO EDICION');
    const incomplete = visible.filter(e => isIncomplete(e)).length;
    const modelos = new Set();
    allEntries.forEach(e => { if (e.paraModelo) e.paraModelo.forEach(m => modelos.add(m)); });
    dom.headerStats.innerHTML = `
      <span class="header-stat"><strong>${visible.length}</strong> perfiles</span>
      <span class="header-stat"><strong>${incomplete}</strong> sin etiquetar</span>
      <span class="header-stat"><strong>${modelos.size}</strong> modelos</span>
    `;
  }

  // ─── MULTI-SELECT FILTER (BUG 4 fix — modelo dots) ───
  function createMultiSelect(container, options, filterKey, label, emojiMap, onChange) {
    container.innerHTML = '';
    const trigger = document.createElement('div');
    trigger.className = 'filter-ms-trigger';
    trigger.innerHTML = `<span class="ms-label">${esc(label)}</span><span class="arrow">▼</span>`;

    const dropdown = document.createElement('div');
    dropdown.className = 'filter-ms-dropdown';

    options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'filter-ms-option';
      item.dataset.value = opt;

      let displayHtml;
      if (filterKey === 'modelo') {
        const color = getModeloColor(opt);
        displayHtml = `<span class="check"></span><span class="modelo-dot" style="background:${color}"></span><span>${esc(opt)}</span>`;
      } else {
        const emoji = emojiMap ? (emojiMap[opt] || '') : '';
        const text = emoji ? `${emoji} ${opt}` : opt;
        displayHtml = `<span class="check"></span><span>${esc(text)}</span>`;
      }
      item.innerHTML = displayHtml;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        item.classList.toggle('selected');
        const selected = Array.from(dropdown.querySelectorAll('.selected')).map(el => el.dataset.value);
        activeFilters[filterKey] = selected;
        updateTriggerLabel(trigger, label, selected);
        updateClearButton();
        onChange();
      });
      dropdown.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.filter-ms-dropdown.open').forEach(d => {
        if (d !== dropdown) { d.classList.remove('open'); d.previousElementSibling.classList.remove('active'); }
      });
      dropdown.classList.toggle('open');
      trigger.classList.toggle('active');
    });

    container.appendChild(trigger);
    container.appendChild(dropdown);
  }

  function updateTriggerLabel(trigger, label, selected) {
    if (selected.length === 0) {
      trigger.innerHTML = `<span class="ms-label">${esc(label)}</span><span class="arrow">▼</span>`;
    } else {
      trigger.innerHTML = `<span class="ms-label">${esc(label)} </span><span class="count">${selected.length}</span><span class="arrow">▼</span>`;
    }
  }

  function updateClearButton() {
    const hasFilters = activeFilters.search || activeFilters.mercado ||
      activeFilters.vertical.length || activeFilters.modelo.length ||
      activeFilters.branding.length || activeFilters.viral.length;
    dom.filterClear.classList.toggle('hidden', !hasFilters);
  }

  // ─── ACTIVE FILTER CHIPS ───
  function renderActiveFilters() {
    const row = dom.activeFiltersRow;
    const chips = [];

    if (activeFilters.mercado) {
      const lbl = `${activeFilters.mercado} ${MERCADO_LABELS[activeFilters.mercado] || ''}`;
      chips.push({ label: lbl, key: 'mercado', value: activeFilters.mercado });
    }
    activeFilters.vertical.forEach(v => {
      const e = VERTICAL_EMOJIS[v] || '';
      chips.push({ label: e ? `${e} ${v}` : v, key: 'vertical', value: v });
    });
    activeFilters.modelo.forEach(v => chips.push({ label: v, key: 'modelo', value: v }));
    activeFilters.branding.forEach(v => {
      const e = BRANDING_EMOJIS[v] || '';
      chips.push({ label: e ? `${e} ${v}` : v, key: 'branding', value: v });
    });
    activeFilters.viral.forEach(v => {
      const e = VIRAL_EMOJIS[v] || '';
      chips.push({ label: e ? `${e} ${v}` : v, key: 'viral', value: v });
    });

    if (chips.length === 0) { row.classList.add('hidden'); return; }

    row.classList.remove('hidden');
    row.innerHTML = chips.map((c, i) =>
      `<span class="active-filter-chip" data-idx="${i}">${esc(c.label)} <span class="x">×</span></span>`
    ).join('');

    row.querySelectorAll('.active-filter-chip').forEach((el, i) => {
      el.addEventListener('click', () => {
        const c = chips[i];
        if (c.key === 'mercado') {
          activeFilters.mercado = '';
          document.querySelectorAll('.mercado-pill').forEach(p => p.classList.remove('active'));
          document.querySelector('.mercado-pill[data-mercado=""]').classList.add('active');
        } else {
          activeFilters[c.key] = activeFilters[c.key].filter(v => v !== c.value);
          syncDropdownSelection(c.key);
        }
        updateClearButton();
        applyFilters();
      });
    });
  }

  function syncDropdownSelection(key) {
    const containerMap = {
      vertical: dom.filterVertical, modelo: dom.filterModelo,
      branding: dom.filterBranding, viral: dom.filterViral
    };
    const labelMap = { vertical: 'Vertical', modelo: 'Para Modelo', branding: 'Branding', viral: 'Elemento Viral' };
    const container = containerMap[key];
    if (!container) return;
    container.querySelectorAll('.filter-ms-option').forEach(el => {
      el.classList.toggle('selected', activeFilters[key].includes(el.dataset.value));
    });
    const trigger = container.querySelector('.filter-ms-trigger');
    updateTriggerLabel(trigger, labelMap[key], activeFilters[key]);
  }

  // ─── GALLERY ───
  function renderGallery() {
    const grid = dom.galleryGrid;
    grid.innerHTML = '';
    const total = allEntries.filter(e => e.estado !== 'FRANCO EDICION').length;

    if (filteredEntries.length === 0) {
      grid.innerHTML = `<div class="gallery-empty"><div class="gallery-empty-icon">🔍</div><p>No se encontraron perfiles con estos filtros</p></div>`;
      dom.galleryCount.textContent = `Mostrando 0 de ${total} perfiles`;
      return;
    }

    dom.galleryCount.textContent = filteredEntries.length === total
      ? `${total} perfiles` : `Mostrando ${filteredEntries.length} de ${total} perfiles`;

    filteredEntries.forEach(entry => grid.appendChild(createCard(entry)));
    renderActiveFilters();
  }

  function createCard(entry) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = entry.id;

    const incomplete = isIncomplete(entry);
    const hasModelo = entry.paraModelo && entry.paraModelo.length > 0;
    if (incomplete) card.classList.add('card-incomplete');
    if (hasModelo) card.classList.add('card-has-modelo');

    const username = extractUsername(entry.link);
    const avatarUrl = getAvatarUrl(entry.link);

    // Avatar
    let avatarHtml;
    if (avatarUrl) {
      avatarHtml = `<img class="card-avatar" src="${esc(avatarUrl)}" alt="" onerror="this.outerHTML='<span class=\\'card-avatar-placeholder\\'>${esc(getInitials(entry.idea))}</span>'">`;
    } else {
      avatarHtml = `<span class="card-avatar-placeholder">${esc(getInitials(entry.idea))}</span>`;
    }

    // Meta row: @username · 🇪🇸 · [MODELO]
    let metaParts = [];
    if (username) metaParts.push(`<span class="card-username">@${esc(username)}</span>`);
    if (entry.mercado) metaParts.push(`<span>${entry.mercado}</span>`);
    if (hasModelo) {
      const m = entry.paraModelo[0];
      const mc = getModeloColor(m);
      metaParts.push(`<span class="card-modelo-badge" style="--chip-color:${mc};background:color-mix(in srgb, ${mc} 15%, transparent);color:${mc}">${esc(m)}</span>`);
    }
    const metaHtml = metaParts.length
      ? `<div class="card-meta">${metaParts.join('<span class="meta-sep">·</span>')}</div>` : '';

    // Link
    const linkHtml = entry.link
      ? `<div class="card-link-row"><a href="${esc(entry.link)}" target="_blank" rel="noopener" class="card-link">🔗 ${esc(username || 'Ver perfil')}</a></div>` : '';

    // Chips with section labels
    const chipsHtml = buildCardChips(entry);

    // Footer
    const footerBadge = incomplete ? `<span class="card-incomplete-badge">⚠ Faltan tags</span>` : `<span></span>`;

    card.innerHTML = `
      <div class="card-top">
        ${avatarHtml}
        <div class="card-info">
          <div class="card-name">${esc(entry.idea)}</div>
          ${metaHtml}
        </div>
        <div class="card-menu-wrap">
          <button class="card-menu-btn" title="Opciones">⋯</button>
          <div class="card-menu-dropdown">
            <button class="card-menu-item" data-action="edit">✎ Editar</button>
            ${entry.link ? `<button class="card-menu-item" data-action="open">🔗 Abrir Instagram</button>` : ''}
            <button class="card-menu-item danger" data-action="archive">❌ Archivar en Notion</button>
          </div>
        </div>
      </div>
      ${linkHtml}
      ${chipsHtml}
      <div class="card-footer">${footerBadge}</div>
    `;

    // Menu events
    const menuBtn = card.querySelector('.card-menu-btn');
    const menuDrop = card.querySelector('.card-menu-dropdown');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.card-menu-dropdown.open').forEach(d => { if (d !== menuDrop) d.classList.remove('open'); });
      menuDrop.classList.toggle('open');
    });

    card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation(); menuDrop.classList.remove('open');
      openEditModal(entry.id);
    });

    const openBtn = card.querySelector('[data-action="open"]');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation(); menuDrop.classList.remove('open');
        window.open(entry.link, '_blank');
      });
    }

    card.querySelector('[data-action="archive"]').addEventListener('click', (e) => {
      e.stopPropagation(); menuDrop.classList.remove('open');
      showConfirm(
        '¿Archivar perfil?',
        `<strong>${esc(entry.idea)}</strong><br>No aparecerá más en el Inspo Vault.`,
        async () => {
          try {
            await apiPost('inspo-vault?action=delete', { id: entry.id });
            allEntries = allEntries.filter(en => en.id !== entry.id);
            updateHeaderStats();
            updateReviewCount();
            applyFilters();
            toast('Perfil archivado en Notion');
          } catch (err) {
            toast(`Error: ${err.message}`, 'error');
          }
        }
      );
    });

    return card;
  }

  function buildCardChips(entry) {
    const sections = [];
    if (entry.vertical && entry.vertical.length) {
      sections.push(chipSection('Verticales', entry.vertical, 'vertical', 4));
    }
    if (entry.branding && entry.branding.length) {
      sections.push(chipSection('Branding', entry.branding, 'branding', 3));
    }
    if (entry.elementoViral && entry.elementoViral.length) {
      sections.push(chipSection('Viral', entry.elementoViral, 'viral', 3));
    }
    if (!sections.length) return '';
    return `<div class="card-chips">${sections.join('')}</div>`;
  }

  function chipSection(label, items, type, max) {
    const visible = items.slice(0, max);
    const extra = items.length - max;
    let chips = visible.map(i => {
      const emoji = chipEmoji(i, type);
      const display = emoji ? `${emoji} ${i}` : i;
      let style = '';
      if (type === 'vertical') style = `--chip-color:${getVerticalColor(i)}`;
      else if (type === 'modelo') style = `--chip-color:${getModeloColor(i)}`;
      return `<span class="chip chip-${type}"${style ? ` style="${style}"` : ''}>${esc(display)}</span>`;
    }).join('');
    if (extra > 0) chips += `<span class="chip chip-more">+${extra}</span>`;
    return `<div class="card-chip-section"><div class="card-chip-label">${esc(label)}</div><div class="card-chip-row">${chips}</div></div>`;
  }

  // ─── FILTERING (BUG 1 fix — mercado already normalized via parseEntry) ───
  function applyFilters() {
    filteredEntries = allEntries.filter(entry => {
      if (entry.estado === 'FRANCO EDICION') return false;
      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase();
        const s = [entry.idea, extractUsername(entry.link) || ''].join(' ').toLowerCase();
        if (!s.includes(q)) return false;
      }
      if (activeFilters.mercado && entry.mercado !== activeFilters.mercado) return false;
      if (activeFilters.vertical.length && !activeFilters.vertical.some(v => (entry.vertical || []).includes(v))) return false;
      if (activeFilters.modelo.length && !activeFilters.modelo.some(m => (entry.paraModelo || []).includes(m))) return false;
      if (activeFilters.branding.length && !activeFilters.branding.some(b => (entry.branding || []).includes(b))) return false;
      if (activeFilters.viral.length && !activeFilters.viral.some(v => (entry.elementoViral || []).includes(v))) return false;
      return true;
    });
    renderGallery();
  }

  function clearFilters() {
    activeFilters = { search: '', mercado: '', vertical: [], modelo: [], branding: [], viral: [] };
    dom.filterSearch.value = '';
    document.querySelectorAll('.mercado-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.mercado-pill[data-mercado=""]').classList.add('active');
    ['vertical', 'modelo', 'branding', 'viral'].forEach(k => syncDropdownSelection(k));
    updateClearButton();
    applyFilters();
  }

  // ─── REVIEW COUNT ───
  function updateReviewCount() {
    const count = allEntries.filter(e => e.estado !== 'FRANCO EDICION' && isIncomplete(e)).length;
    dom.reviewCount.textContent = count;
    dom.btnReview.classList.toggle('hidden', count === 0);
  }

  // ─── MODAL (Add / Edit) ───
  function openAddModal() {
    editingId = null;
    dom.modalTitle.textContent = 'Añadir Perfil';
    dom.modalAvatar.classList.remove('visible');
    dom.modalAvatar.innerHTML = '';
    renderModalForm({});
    dom.modalOverlay.classList.add('active');
  }

  function openEditModal(id) {
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;
    editingId = id;
    dom.modalTitle.textContent = 'Editar Perfil';
    const avatarUrl = getAvatarUrl(entry.link);
    if (avatarUrl) {
      dom.modalAvatar.classList.add('visible');
      dom.modalAvatar.innerHTML = `<img src="${esc(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.classList.remove('visible')">`;
    } else {
      dom.modalAvatar.classList.remove('visible');
      dom.modalAvatar.innerHTML = '';
    }
    renderModalForm(entry);
    dom.modalOverlay.classList.add('active');
  }

  function closeModal() { dom.modalOverlay.classList.remove('active'); editingId = null; }

  function renderModalForm(entry) {
    dom.modalBody.innerHTML = buildFormHTML(entry, 'modal');
    attachFormEvents(dom.modalBody, 'modal');
    attachDuplicateCheck(dom.modalBody, 'modal');
  }

  function buildFormHTML(entry, prefix) {
    const mercados = [
      { val: '🇪🇸', label: '🇪🇸 España' },
      { val: '🇺🇸', label: '🇺🇸 USA' },
      { val: '🇧🇷', label: '🇧🇷 Brasil' }
    ];

    return `
      <div class="form-section-label">Información básica</div>
      <div class="form-group">
        <label class="form-label">Idea / Descripción</label>
        <input type="text" class="form-input" id="${prefix}-idea" value="${esc(entry.idea || '')}" placeholder="Ej: CHICA TEEN CAPTIONS">
      </div>
      <div class="form-group">
        <label class="form-label">Link del perfil</label>
        <input type="url" class="form-input" id="${prefix}-link" value="${esc(entry.link || '')}" placeholder="https://instagram.com/...">
      </div>
      <div class="form-group">
        <label class="form-label">Mercado</label>
        <div class="form-mercado-btns">
          ${mercados.map(m => `<button type="button" class="form-mercado-btn${entry.mercado === m.val ? ' selected' : ''}" data-mercado="${m.val}">${m.label}</button>`).join('')}
        </div>
      </div>

      <div class="form-section-label">Verticales</div>
      <div class="form-chips" id="${prefix}-vertical">
        ${(dbOptions.Vertical || []).map(v => {
          const emoji = VERTICAL_EMOJIS[v] || '';
          const display = emoji ? `${emoji} ${v}` : v;
          const color = getVerticalColor(v);
          const sel = (entry.vertical || []).includes(v) ? ' selected-vertical' : '';
          return `<span class="form-chip${sel}" data-value="${esc(v)}" style="--chip-color:${color}">${esc(display)}</span>`;
        }).join('')}
      </div>

      <div class="form-section-label">Branding</div>
      <div class="form-chips" id="${prefix}-branding">
        ${(dbOptions.Branding || []).map(v => {
          const emoji = BRANDING_EMOJIS[v] || '';
          const display = emoji ? `${emoji} ${v}` : v;
          const sel = (entry.branding || []).includes(v) ? ' selected-branding' : '';
          return `<span class="form-chip${sel}" data-value="${esc(v)}">${esc(display)}</span>`;
        }).join('')}
        <span class="form-chip form-chip-add" data-addnew="branding">+ Nueva</span>
      </div>

      <div class="form-section-label">Elemento Viral</div>
      <div class="form-chips" id="${prefix}-viral">
        ${(dbOptions['Elemento Viral'] || []).map(v => {
          const emoji = VIRAL_EMOJIS[v] || '';
          const display = emoji ? `${emoji} ${v}` : v;
          const sel = (entry.elementoViral || []).includes(v) ? ' selected-viral' : '';
          return `<span class="form-chip${sel}" data-value="${esc(v)}">${esc(display)}</span>`;
        }).join('')}
        <span class="form-chip form-chip-add" data-addnew="viral">+ Nueva</span>
      </div>

      <div class="form-section-label">Para Modelo</div>
      <div class="form-chips" id="${prefix}-modelo">
        ${(dbOptions['Para Modelo'] || []).map(v => {
          const color = getModeloColor(v);
          const sel = (entry.paraModelo || []).includes(v) ? ' selected-modelo' : '';
          return `<span class="form-chip${sel}" data-value="${esc(v)}" style="--chip-color:${color}">${esc(v)}</span>`;
        }).join('')}
      </div>
    `;
  }

  function attachFormEvents(container, prefix) {
    container.querySelectorAll('.form-mercado-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.form-mercado-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    [
      { id: `${prefix}-vertical`, cls: 'selected-vertical' },
      { id: `${prefix}-branding`, cls: 'selected-branding' },
      { id: `${prefix}-viral`, cls: 'selected-viral' },
      { id: `${prefix}-modelo`, cls: 'selected-modelo' }
    ].forEach(({ id, cls }) => {
      const wrap = container.querySelector(`#${id}`);
      if (!wrap) return;
      wrap.querySelectorAll('.form-chip:not(.form-chip-add)').forEach(chip => {
        chip.addEventListener('click', () => chip.classList.toggle(cls));
      });
    });
    container.querySelectorAll('[data-addnew]').forEach(addBtn => {
      addBtn.addEventListener('click', () => handleAddNewTag(container, prefix, addBtn.dataset.addnew, addBtn));
    });
  }

  function handleAddNewTag(container, prefix, type, addBtn) {
    if (addBtn.parentElement.querySelector('.new-tag-row')) return;
    const row = document.createElement('span');
    row.className = 'new-tag-row';
    row.innerHTML = `
      <input type="text" class="new-tag-input" placeholder="Nueva etiqueta..." maxlength="50">
      <button class="new-tag-confirm" type="button">✓</button>
      <button class="new-tag-cancel" type="button">✕</button>
    `;
    addBtn.before(row);
    const input = row.querySelector('input');
    input.focus();

    const chipClass = type === 'branding' ? 'selected-branding' : 'selected-viral';
    const notionProp = type === 'branding' ? 'Branding' : 'Elemento Viral';

    async function confirm() {
      const val = input.value.trim();
      if (!val) { row.remove(); return; }
      try {
        await apiPost('inspo-vault?action=options', { property: notionProp, value: val });
        if (!dbOptions[notionProp].includes(val)) dbOptions[notionProp].push(val);
        const chip = document.createElement('span');
        chip.className = `form-chip ${chipClass}`;
        chip.dataset.value = val;
        chip.textContent = val;
        chip.addEventListener('click', () => chip.classList.toggle(chipClass));
        addBtn.before(chip);
        row.remove();
        toast(`Etiqueta "${val}" añadida`);
      } catch (err) { toast(`Error: ${err.message}`, 'error'); }
    }

    row.querySelector('.new-tag-confirm').addEventListener('click', confirm);
    row.querySelector('.new-tag-cancel').addEventListener('click', () => row.remove());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      if (e.key === 'Escape') row.remove();
    });
  }

  function getFormData(container, prefix) {
    const idea = container.querySelector(`#${prefix}-idea`).value.trim();
    const link = container.querySelector(`#${prefix}-link`).value.trim();
    const mercadoBtn = container.querySelector('.form-mercado-btn.selected');
    const mercado = mercadoBtn ? mercadoBtn.dataset.mercado : '';
    return {
      idea, link, mercado,
      vertical: getSelectedChips(container, `#${prefix}-vertical`, 'selected-vertical'),
      branding: getSelectedChips(container, `#${prefix}-branding`, 'selected-branding'),
      elementoViral: getSelectedChips(container, `#${prefix}-viral`, 'selected-viral'),
      paraModelo: getSelectedChips(container, `#${prefix}-modelo`, 'selected-modelo')
    };
  }

  function getSelectedChips(container, selector, cls) {
    const wrap = container.querySelector(selector);
    return wrap ? Array.from(wrap.querySelectorAll(`.${cls}`)).map(c => c.dataset.value) : [];
  }

  async function handleModalSave() {
    const data = getFormData(dom.modalBody, 'modal');
    if (!data.idea) { toast('El campo Idea es obligatorio', 'error'); return; }

    // Duplicate guard on create
    if (!editingId && data.link) {
      const username = extractUsername(data.link);
      const dup = findDuplicateByUsername(username, null);
      if (dup) {
        toast(`Ya existe @${username} → "${dup.idea}". Usa Editar en su card.`, 'error');
        return;
      }
    }

    dom.modalSave.disabled = true;
    dom.modalSave.textContent = 'Guardando...';
    try {
      if (editingId) {
        const result = await apiPatch(`inspo-vault?action=update&id=${editingId}`, data);
        const idx = allEntries.findIndex(e => e.id === editingId);
        if (idx !== -1) allEntries[idx] = parseEntry(result.entry);
        toast('Perfil actualizado');
      } else {
        const result = await apiPost('inspo-vault?action=create', data);
        allEntries.unshift(parseEntry(result.entry));
        toast('Perfil creado');
      }
      closeModal();
      updateReviewCount();
      updateHeaderStats();
      applyFilters();
    } catch (err) { toast(`Error: ${err.message}`, 'error'); }
    finally { dom.modalSave.disabled = false; dom.modalSave.textContent = 'Guardar'; }
  }

  // ─── QUICK REVIEW (BUG 5 fix — proper overflow/layout) ───
  function startReview() {
    reviewQueue = allEntries.filter(e => e.estado !== 'FRANCO EDICION' && isIncomplete(e));
    if (reviewQueue.length === 0) { toast('¡Todos los perfiles están etiquetados!'); return; }
    reviewIndex = 0;
    dom.reviewTotal.textContent = reviewQueue.length;
    renderReviewItem();
    dom.reviewOverlay.classList.add('active');
  }

  function exitReview() {
    dom.reviewOverlay.classList.remove('active');
    updateReviewCount(); updateHeaderStats(); applyFilters();
  }

  function renderReviewItem() {
    if (reviewIndex >= reviewQueue.length) { toast('¡Revisión completada!'); exitReview(); return; }
    const entry = reviewQueue[reviewIndex];
    dom.reviewCurrent.textContent = reviewIndex + 1;
    dom.reviewProgressBar.style.width = (((reviewIndex + 1) / reviewQueue.length) * 100) + '%';
    dom.reviewPrev.disabled = reviewIndex === 0;

    const username = extractUsername(entry.link);
    const avatarUrl = getAvatarUrl(entry.link);
    let avatarHtml;
    if (avatarUrl) {
      avatarHtml = `<img class="review-avatar" src="${esc(avatarUrl)}" alt="" onerror="this.outerHTML='<span class=\\'review-avatar-placeholder\\'>${esc(getInitials(entry.idea))}</span>'">`;
    } else {
      avatarHtml = `<span class="review-avatar-placeholder">${esc(getInitials(entry.idea))}</span>`;
    }
    const usernameHtml = username ? `<div class="review-username">@${esc(username)}</div>` : '';
    const igBtn = entry.link
      ? `<a href="${esc(entry.link)}" target="_blank" rel="noopener" class="review-ig-btn">📷 Abrir Instagram</a>`
      : `<p class="review-no-link">Sin link de Instagram</p>`;

    dom.reviewPreview.innerHTML = `${avatarHtml}<div class="review-name">${esc(entry.idea)}</div>${usernameHtml}${igBtn}`;
    dom.reviewForm.innerHTML = buildFormHTML(entry, 'review');
    attachFormEvents(dom.reviewForm, 'review');
  }

  async function handleReviewSave() {
    const entry = reviewQueue[reviewIndex];
    const data = getFormData(dom.reviewForm, 'review');
    dom.reviewSave.disabled = true;
    dom.reviewSave.textContent = 'Guardando...';
    try {
      const result = await apiPatch(`inspo-vault?action=update&id=${entry.id}`, data);
      const idx = allEntries.findIndex(e => e.id === entry.id);
      if (idx !== -1) allEntries[idx] = parseEntry(result.entry);
      toast('Guardado ✓');
      reviewIndex++;
      renderReviewItem();
    } catch (err) { toast(`Error: ${err.message}`, 'error'); }
    finally { dom.reviewSave.disabled = false; dom.reviewSave.textContent = 'Guardar y Siguiente →'; }
  }

  // ─── VERIFIER (BUG 3 fix — handle all-errors gracefully) ───
  function openVerifyModal() {
    const visible = allEntries.filter(e => e.estado !== 'FRANCO EDICION');
    const withLink = visible.filter(e => e.link).length;
    const noLink = visible.length - withLink;

    dom.verifyBody.innerHTML = `
      <p class="verify-confirm-text">
        ¿Verificar perfiles de Instagram?<br>
        <strong>${withLink}</strong> perfiles con link · <strong>${noLink}</strong> sin link.<br>
        <small style="color:var(--text-muted)">Esto puede tardar 1-2 minutos.</small>
      </p>
      <div class="verify-btns">
        <button class="btn btn-secondary" id="verify-only-links">🔍 Verificar con link (${withLink})</button>
        <button class="btn btn-primary" id="verify-all">🔍 Verificar todos (${visible.length})</button>
      </div>
    `;
    dom.verifyOverlay.classList.add('active');

    dom.verifyBody.querySelector('#verify-only-links').addEventListener('click', () => {
      runVerification(visible.filter(e => e.link));
    });
    dom.verifyBody.querySelector('#verify-all').addEventListener('click', () => {
      runVerification(visible);
    });
  }

  function closeVerifyModal() { dom.verifyOverlay.classList.remove('active'); }

  async function runVerification(entries) {
    const BATCH = 10;
    const profiles = entries.map(e => ({ id: e.id, url: e.link || '' }));
    const allResults = [];
    let processed = 0;

    dom.verifyBody.innerHTML = `
      <div class="verify-progress">
        <div class="verify-progress-bar-wrap">
          <div class="verify-progress-bar" id="vp-bar" style="width:0%"></div>
        </div>
        <div class="verify-progress-text" id="vp-text">Verificando 0 de ${profiles.length}...</div>
      </div>
    `;
    const bar = dom.verifyBody.querySelector('#vp-bar');
    const text = dom.verifyBody.querySelector('#vp-text');

    for (let i = 0; i < profiles.length; i += BATCH) {
      const batch = profiles.slice(i, i + BATCH);
      try {
        const res = await apiPost('inspo-vault?action=check', { profiles: batch });
        allResults.push(...res.results);
      } catch (err) {
        batch.forEach(p => allResults.push({ id: p.id, url: p.url, status: 'ERROR', reason: err.message }));
      }
      processed += batch.length;
      bar.style.width = ((processed / profiles.length) * 100) + '%';
      text.textContent = `Verificando ${processed} de ${profiles.length}...`;
    }
    showVerifyResults(allResults);
  }

  function showVerifyResults(results) {
    const active = results.filter(r => r.status === 'ACTIVO');
    const deleted = results.filter(r => r.status === 'ELIMINADO');
    const errors = results.filter(r => r.status === 'ERROR');

    // BUG 3: If all results are errors, Instagram is blocking
    const allErrors = errors.length === results.length && results.length > 0;

    let html = `<div class="verify-results">
      <div class="verify-stat verify-stat-active">✅ ${active.length} activos</div>
      <div class="verify-stat verify-stat-deleted" id="vr-show-deleted">❌ ${deleted.length} eliminados${deleted.length > 0 ? ' → Ver lista' : ''}</div>
      <div class="verify-stat verify-stat-error">⚠️ ${errors.length} con error</div>
    </div>`;

    if (allErrors) {
      html += `
        <div class="verify-note">
          ⚠️ Instagram bloquea la verificación automática desde servidor.<br>
          Usa "<strong>Abrir todos en pestañas</strong>" para verificar manualmente.
        </div>
        <div style="margin-top:1rem;display:flex;gap:0.5rem">
          <button class="btn btn-secondary" id="vr-open-all">🔗 Abrir todos en pestañas</button>
        </div>
      `;
    }

    html += `<div class="verify-deleted-list hidden" id="vr-deleted-list"></div>`;
    dom.verifyBody.innerHTML = html;

    if (allErrors) {
      dom.verifyBody.querySelector('#vr-open-all').addEventListener('click', () => {
        const withLink = results.filter(r => r.url).slice(0, 20); // max 20 tabs
        withLink.forEach((r, i) => setTimeout(() => window.open(r.url, '_blank'), i * 300));
        toast(`Abriendo ${withLink.length} perfiles...`);
      });
    }

    if (deleted.length > 0) {
      const showBtn = dom.verifyBody.querySelector('#vr-show-deleted');
      const listEl = dom.verifyBody.querySelector('#vr-deleted-list');
      showBtn.style.cursor = 'pointer';
      showBtn.addEventListener('click', () => listEl.classList.toggle('hidden'));

      listEl.innerHTML = deleted.map(r => {
        const entry = allEntries.find(e => e.id === r.id);
        const name = entry ? entry.idea : r.id;
        return `
          <div class="verify-deleted-item" data-id="${r.id}">
            <div>
              <div class="verify-deleted-name">${esc(name)}</div>
              <div class="verify-deleted-url">${esc(r.url)}</div>
            </div>
            <div class="verify-deleted-actions">
              <button class="btn btn-danger btn-sm" data-archive="${r.id}">🗑 Archivar</button>
              <button class="btn btn-ghost btn-sm" data-ignore="${r.id}">Ignorar</button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('[data-archive]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.archive;
          btn.disabled = true; btn.textContent = '...';
          try {
            await apiPost('inspo-vault?action=delete', { id });
            allEntries = allEntries.filter(e => e.id !== id);
            btn.closest('.verify-deleted-item').remove();
            updateHeaderStats(); applyFilters();
            toast('Perfil archivado');
          } catch (err) {
            toast(`Error: ${err.message}`, 'error');
            btn.disabled = false; btn.textContent = '🗑 Archivar';
          }
        });
      });
      listEl.querySelectorAll('[data-ignore]').forEach(btn => {
        btn.addEventListener('click', () => { btn.closest('.verify-deleted-item').remove(); });
      });
    }
  }

  // ─── DUPLICATE CHECK ON LINK INPUT ───
  function attachDuplicateCheck(container, prefix) {
    const linkInput = container.querySelector(`#${prefix}-link`);
    if (!linkInput) return;
    linkInput.addEventListener('blur', () => {
      const existing = container.querySelector('.dup-alert');
      if (existing) existing.remove();
      if (editingId) return; // skip when editing
      const val = linkInput.value.trim();
      const username = extractUsername(val);
      if (!username) return;
      const dup = findDuplicateByUsername(username, null);
      if (!dup) return;
      const avatarUrl = getAvatarUrl(dup.link);
      const alert = document.createElement('div');
      alert.className = 'dup-alert';
      alert.innerHTML = `
        <div class="dup-alert-icon">⚠️</div>
        <div class="dup-alert-body">
          <div class="dup-alert-title">@${esc(username)} ya existe en el Vault</div>
          <div class="dup-alert-card">
            ${avatarUrl ? `<img class="dup-alert-avatar" src="${esc(avatarUrl)}" alt="" onerror="this.style.display='none'">` : ''}
            <div class="dup-alert-info">
              <strong>${esc(dup.idea)}</strong>
              <span class="dup-alert-meta">${dup.mercado || ''} ${(dup.paraModelo || []).join(', ')}</span>
            </div>
          </div>
          <div class="dup-alert-actions">
            <button class="btn btn-primary btn-sm" data-dup-edit="${dup.id}">✎ Editar existente</button>
            <button class="btn btn-ghost btn-sm" data-dup-dismiss>Ignorar</button>
          </div>
        </div>
      `;
      linkInput.parentElement.after(alert);
      alert.querySelector('[data-dup-edit]').addEventListener('click', () => {
        closeModal();
        openEditModal(dup.id);
      });
      alert.querySelector('[data-dup-dismiss]').addEventListener('click', () => alert.remove());
    });
    linkInput.addEventListener('input', () => {
      const existing = container.querySelector('.dup-alert');
      if (existing) existing.remove();
    });
  }

  // ─── DETECT ALL DUPLICATES SCAN ───
  function scanDuplicates() {
    const usernameMap = {};
    allEntries.forEach(e => {
      if (e.estado === 'FRANCO EDICION') return;
      const u = extractUsername(e.link);
      if (!u) return;
      if (!usernameMap[u]) usernameMap[u] = [];
      usernameMap[u].push(e);
    });
    const groups = Object.entries(usernameMap).filter(([, entries]) => entries.length > 1);

    dom.verifyBody.innerHTML = '';
    if (groups.length === 0) {
      dom.verifyBody.innerHTML = `
        <div style="text-align:center;padding:2rem">
          <div style="font-size:3rem;margin-bottom:1rem">✅</div>
          <p style="font-size:1rem;font-weight:600">No hay duplicados</p>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-top:0.5rem">Todos los usernames de Instagram son únicos.</p>
        </div>
      `;
      dom.verifyOverlay.classList.add('active');
      return;
    }

    let totalDups = groups.reduce((sum, [, e]) => sum + e.length, 0);
    let html = `<div class="dup-scan-header">
      <div class="dup-scan-stat">⚠️ <strong>${groups.length}</strong> usernames duplicados · <strong>${totalDups}</strong> perfiles afectados</div>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">Archiva los duplicados que sobren. El perfil con más tags se marca como recomendado.</p>
    </div>`;

    groups.forEach(([username, entries]) => {
      entries.sort((a, b) => {
        const tagsA = (a.vertical||[]).length + (a.branding||[]).length + (a.elementoViral||[]).length;
        const tagsB = (b.vertical||[]).length + (b.branding||[]).length + (b.elementoViral||[]).length;
        return tagsB - tagsA;
      });
      html += `<div class="dup-group">
        <div class="dup-group-header">@${esc(username)} <span class="dup-group-count">${entries.length} perfiles</span></div>
        <div class="dup-group-entries">`;
      entries.forEach((e, i) => {
        const tagsCount = (e.vertical||[]).length + (e.branding||[]).length + (e.elementoViral||[]).length;
        const best = i === 0 ? ' dup-entry-best' : '';
        const avatarUrl = getAvatarUrl(e.link);
        html += `
          <div class="dup-entry${best}" data-id="${e.id}">
            <div class="dup-entry-left">
              ${avatarUrl ? `<img class="dup-entry-avatar" src="${esc(avatarUrl)}" alt="" onerror="this.style.display='none'">` : '<span class="dup-entry-avatar-ph">📷</span>'}
              <div>
                <div class="dup-entry-name">${esc(e.idea)}</div>
                <div class="dup-entry-meta">${e.mercado || ''} · ${tagsCount} tags · ${(e.paraModelo||[]).join(', ') || 'sin modelo'}</div>
              </div>
            </div>
            <div class="dup-entry-actions">
              ${i === 0 ? '<span class="dup-best-badge">★ Más completo</span>' : ''}
              <button class="btn btn-ghost btn-sm" data-dup-view="${e.id}">👁 Ver</button>
              <button class="btn btn-danger btn-sm" data-dup-archive="${e.id}">🗑 Archivar</button>
            </div>
          </div>`;
      });
      html += `</div></div>`;
    });

    dom.verifyBody.innerHTML = html;
    dom.verifyOverlay.classList.add('active');

    dom.verifyBody.querySelectorAll('[data-dup-archive]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.dupArchive;
        btn.disabled = true; btn.textContent = '...';
        try {
          await apiPost('inspo-vault?action=delete', { id });
          allEntries = allEntries.filter(e => e.id !== id);
          btn.closest('.dup-entry').remove();
          updateHeaderStats(); applyFilters();
          toast('Perfil archivado');
          // Remove group if only 1 left
          dom.verifyBody.querySelectorAll('.dup-group').forEach(g => {
            if (g.querySelectorAll('.dup-entry').length <= 1) g.remove();
          });
          if (!dom.verifyBody.querySelector('.dup-group')) {
            dom.verifyBody.innerHTML = '<div style="text-align:center;padding:2rem"><div style="font-size:3rem;margin-bottom:1rem">✅</div><p style="font-size:1rem;font-weight:600">Todos los duplicados limpiados</p></div>';
          }
        } catch (err) {
          toast(`Error: ${err.message}`, 'error');
          btn.disabled = false; btn.textContent = '🗑 Archivar';
        }
      });
    });

    dom.verifyBody.querySelectorAll('[data-dup-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeVerifyModal();
        openEditModal(btn.dataset.dupView);
      });
    });
  }

  // ─── INIT ───
  async function init() {
    try {
      dom.loadingStatus.textContent = 'Cargando opciones...';
      const optionsRes = await apiGet('inspo-vault?action=options');
      dbOptions = optionsRes.options;

      dom.loadingStatus.textContent = 'Cargando perfiles...';
      const listRes = await apiGet('inspo-vault?action=list');
      // BUG 1 fix: normalize mercado on ALL entries at load time
      allEntries = listRes.entries.map(parseEntry);

      createMultiSelect(dom.filterVertical, dbOptions.Vertical || [], 'vertical', 'Vertical', VERTICAL_EMOJIS, applyFilters);
      createMultiSelect(dom.filterModelo, dbOptions['Para Modelo'] || [], 'modelo', 'Para Modelo', null, applyFilters);
      createMultiSelect(dom.filterBranding, dbOptions.Branding || [], 'branding', 'Branding', BRANDING_EMOJIS, applyFilters);
      createMultiSelect(dom.filterViral, dbOptions['Elemento Viral'] || [], 'viral', 'Elemento Viral', VIRAL_EMOJIS, applyFilters);

      updateReviewCount();
      updateHeaderStats();
      applyFilters();

      dom.loadingOverlay.classList.add('fade-out');
      setTimeout(() => { dom.loadingOverlay.style.display = 'none'; }, 400);
      dom.dashboard.classList.remove('hidden');
    } catch (err) {
      dom.loadingStatus.textContent = `Error: ${err.message}`;
      dom.loadingStatus.style.color = '#f87171';
      console.error('Init error:', err);
    }
  }

  // ─── EVENT LISTENERS ───
  let searchDebounce;
  dom.filterSearch.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      activeFilters.search = dom.filterSearch.value;
      updateClearButton();
      applyFilters();
    }, 200);
  });

  document.querySelectorAll('.mercado-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.mercado-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilters.mercado = pill.dataset.mercado;
      updateClearButton();
      applyFilters();
    });
  });

  dom.filterClear.addEventListener('click', clearFilters);
  dom.btnAdd.addEventListener('click', openAddModal);
  dom.btnVerify.addEventListener('click', openVerifyModal);
  dom.btnDuplicates.addEventListener('click', scanDuplicates);
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSave.addEventListener('click', handleModalSave);
  dom.verifyClose.addEventListener('click', closeVerifyModal);
  dom.btnReview.addEventListener('click', startReview);
  dom.reviewExit.addEventListener('click', exitReview);
  dom.reviewSave.addEventListener('click', handleReviewSave);
  dom.reviewSkip.addEventListener('click', () => { reviewIndex++; renderReviewItem(); });
  dom.reviewPrev.addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex--; renderReviewItem(); } });

  dom.modalOverlay.addEventListener('click', e => { if (e.target === dom.modalOverlay) closeModal(); });
  dom.verifyOverlay.addEventListener('click', e => { if (e.target === dom.verifyOverlay) closeVerifyModal(); });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-ms-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling.classList.remove('active');
    });
    document.querySelectorAll('.card-menu-dropdown.open').forEach(d => d.classList.remove('open'));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (dom.reviewOverlay.classList.contains('active')) exitReview();
      else if (dom.verifyOverlay.classList.contains('active')) closeVerifyModal();
      else if (dom.modalOverlay.classList.contains('active')) closeModal();
    }
  });

  init();
})();
