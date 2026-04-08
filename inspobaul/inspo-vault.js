/* ============================================
   Inspo Vault — BraveGirls Agency
   Frontend logic — Redesign v2
   ============================================ */

(function () {
  'use strict';

  // --- CONFIG ---
  const API_BASE = 'https://bravegirlsagency-api.vercel.app/api';

  // --- STATE ---
  let allEntries = [];
  let filteredEntries = [];
  let dbOptions = { Vertical: [], 'Para Modelo': [], Branding: [], 'Elemento Viral': [] };
  let activeFilters = { search: '', mercado: '', vertical: [], modelo: [], branding: [], viral: [] };
  let reviewQueue = [];
  let reviewIndex = 0;
  let editingId = null;

  // --- DOM ---
  const $ = (sel) => document.querySelector(sel);
  const dom = {
    loadingOverlay: $('#loading-overlay'),
    loadingStatus: $('#loading-status'),
    dashboard: $('#dashboard'),
    headerStats: $('#header-stats'),
    btnReview: $('#btn-review'),
    reviewCount: $('#review-count'),
    btnAdd: $('#btn-add'),
    filterSearch: $('#filter-search'),
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

  // --- HELPERS ---
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
    setTimeout(() => { el.remove(); }, 3500);
  }

  function isIncomplete(entry) {
    return (!entry.branding || entry.branding.length === 0) ||
           (!entry.elementoViral || entry.elementoViral.length === 0);
  }

  function extractUsername(link) {
    if (!link) return null;
    const m = link.match(/instagram\.com\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function getAvatarUrl(link) {
    const username = extractUsername(link);
    return username ? `https://unavatar.io/instagram/${username}` : null;
  }

  function getInitials(name) {
    if (!name) return '📷';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  // --- API (unchanged) ---
  async function apiGet(path) {
    const res = await fetch(`${API_BASE}/${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function apiPatch(path, body) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // --- HEADER STATS ---
  function updateHeaderStats() {
    const total = allEntries.filter(e => e.estado !== 'FRANCO EDICION').length;
    const incomplete = allEntries.filter(e => e.estado !== 'FRANCO EDICION' && isIncomplete(e)).length;
    const modelos = new Set();
    allEntries.forEach(e => {
      if (e.paraModelo) e.paraModelo.forEach(m => modelos.add(m));
    });
    dom.headerStats.innerHTML = `
      <span class="header-stat"><strong>${total}</strong> perfiles</span>
      <span class="header-stat"><strong>${incomplete}</strong> sin etiquetar</span>
      <span class="header-stat"><strong>${modelos.size}</strong> modelos</span>
    `;
  }

  // --- MULTI-SELECT FILTER COMPONENT ---
  function createMultiSelect(container, options, filterKey, label, onChange) {
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
      item.innerHTML = `<span class="check"></span><span>${esc(opt)}</span>`;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        item.classList.toggle('selected');
        const selected = Array.from(dropdown.querySelectorAll('.selected')).map(el => el.dataset.value);
        activeFilters[filterKey] = selected;
        updateTriggerLabel(trigger, label, selected);
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

  // --- ACTIVE FILTER CHIPS ---
  function renderActiveFilters() {
    const row = dom.activeFiltersRow;
    const chips = [];

    if (activeFilters.mercado) {
      const labels = { '🇪🇸': '🇪🇸 España', '🇺🇲': '🇺🇲 USA', '🇧🇷': '🇧🇷 Brasil' };
      chips.push({ label: labels[activeFilters.mercado] || activeFilters.mercado, key: 'mercado', value: activeFilters.mercado });
    }
    activeFilters.vertical.forEach(v => chips.push({ label: v, key: 'vertical', value: v }));
    activeFilters.modelo.forEach(v => chips.push({ label: v, key: 'modelo', value: v }));
    activeFilters.branding.forEach(v => chips.push({ label: v, key: 'branding', value: v }));
    activeFilters.viral.forEach(v => chips.push({ label: v, key: 'viral', value: v }));

    if (chips.length === 0) {
      row.classList.add('hidden');
      return;
    }

    row.classList.remove('hidden');
    row.innerHTML = chips.map((c, i) =>
      `<span class="active-filter-chip" data-idx="${i}">${esc(c.label)} <span class="x">×</span></span>`
    ).join('') + `<span class="active-filter-clear">Limpiar todo</span>`;

    row.querySelectorAll('.active-filter-chip').forEach((el, i) => {
      el.addEventListener('click', () => {
        const c = chips[i];
        if (c.key === 'mercado') {
          activeFilters.mercado = '';
          document.querySelectorAll('.mercado-pill').forEach(p => p.classList.remove('active'));
          document.querySelector('.mercado-pill[data-mercado=""]').classList.add('active');
        } else {
          activeFilters[c.key] = activeFilters[c.key].filter(v => v !== c.value);
          // Uncheck in dropdown
          const container = c.key === 'vertical' ? dom.filterVertical
            : c.key === 'modelo' ? dom.filterModelo
            : c.key === 'branding' ? dom.filterBranding
            : dom.filterViral;
          const opt = container.querySelector(`.filter-ms-option[data-value="${CSS.escape(c.value)}"]`);
          if (opt) opt.classList.remove('selected');
          const trigger = container.querySelector('.filter-ms-trigger');
          const labelMap = { vertical: 'Vertical', modelo: 'Para Modelo', branding: 'Branding', viral: 'Elemento Viral' };
          updateTriggerLabel(trigger, labelMap[c.key], activeFilters[c.key]);
        }
        applyFilters();
      });
    });

    row.querySelector('.active-filter-clear').addEventListener('click', clearFilters);
  }

  // --- RENDERING ---
  function renderGallery() {
    const grid = dom.galleryGrid;
    grid.innerHTML = '';

    const total = allEntries.filter(e => e.estado !== 'FRANCO EDICION').length;

    if (filteredEntries.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty">
          <div class="gallery-empty-icon">🔍</div>
          <p>No se encontraron perfiles con estos filtros</p>
        </div>`;
      dom.galleryCount.textContent = `Mostrando 0 de ${total} perfiles`;
      return;
    }

    dom.galleryCount.textContent = filteredEntries.length === total
      ? `${total} perfiles`
      : `Mostrando ${filteredEntries.length} de ${total} perfiles`;

    filteredEntries.forEach(entry => {
      grid.appendChild(createCard(entry));
    });

    renderActiveFilters();
  }

  function createCard(entry) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = entry.id;

    const incomplete = isIncomplete(entry);
    const hasModelo = entry.paraModelo && entry.paraModelo.length > 0;
    if (hasModelo) card.classList.add('card-has-modelo');
    else if (incomplete) card.classList.add('card-incomplete');

    const username = extractUsername(entry.link);
    const avatarUrl = getAvatarUrl(entry.link);
    const mercadoFlag = entry.mercado || '';

    const linkHtml = entry.link
      ? `<div class="card-link-row"><a href="${esc(entry.link)}" target="_blank" rel="noopener" class="card-link">🔗 Ver perfil</a></div>`
      : '';

    const usernameHtml = username
      ? `<div class="card-username">@${esc(username)} ${mercadoFlag ? '· ' + mercadoFlag : ''}</div>`
      : (mercadoFlag ? `<div class="card-username">${mercadoFlag}</div>` : '');

    // Chips by category
    const verticalChips = renderChipRow(entry.vertical, 'vertical', 3);
    const brandingChips = renderChipRow(entry.branding, 'branding', 3);
    const viralChips = renderChipRow(entry.elementoViral, 'viral', 3);
    const modeloChips = renderChipRow(entry.paraModelo, 'modelo', 2);

    const chipsHtml = (verticalChips || brandingChips || viralChips || modeloChips)
      ? `<div class="card-chips">${verticalChips}${brandingChips}${viralChips}${modeloChips}</div>`
      : '';

    const footerBadge = incomplete
      ? `<span class="card-incomplete-badge">⚠ Faltan tags</span>`
      : `<span></span>`;

    // Avatar
    let avatarHtml;
    if (avatarUrl) {
      avatarHtml = `<img class="card-avatar" src="${esc(avatarUrl)}" alt="" onerror="this.outerHTML='<span class=\\'card-avatar-placeholder\\'>${esc(getInitials(entry.idea))}</span>'">`;
    } else {
      avatarHtml = `<span class="card-avatar-placeholder">${esc(getInitials(entry.idea))}</span>`;
    }

    card.innerHTML = `
      <div class="card-top">
        ${avatarHtml}
        <div class="card-info">
          <div class="card-name">${esc(entry.idea)}</div>
          ${usernameHtml}
        </div>
      </div>
      ${linkHtml}
      ${chipsHtml}
      <div class="card-footer">
        ${footerBadge}
        <button class="btn-icon" data-edit="${entry.id}" title="Editar">✏️</button>
      </div>
    `;

    card.querySelector(`[data-edit="${entry.id}"]`).addEventListener('click', () => {
      openEditModal(entry.id);
    });

    return card;
  }

  function renderChipRow(items, type, max) {
    if (!items || items.length === 0) return '';
    const visible = items.slice(0, max);
    const extra = items.length - max;
    let html = visible.map(i => `<span class="chip chip-${type}">${esc(i)}</span>`).join('');
    if (extra > 0) html += `<span class="chip chip-more">+${extra}</span>`;
    return `<div class="card-chip-row">${html}</div>`;
  }

  // --- FILTERING ---
  function applyFilters() {
    filteredEntries = allEntries.filter(entry => {
      if (entry.estado === 'FRANCO EDICION') return false;

      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase();
        const searchable = [
          entry.idea,
          extractUsername(entry.link) || ''
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      if (activeFilters.mercado && entry.mercado !== activeFilters.mercado) return false;

      if (activeFilters.vertical.length > 0) {
        if (!activeFilters.vertical.some(v => (entry.vertical || []).includes(v))) return false;
      }
      if (activeFilters.modelo.length > 0) {
        if (!activeFilters.modelo.some(m => (entry.paraModelo || []).includes(m))) return false;
      }
      if (activeFilters.branding.length > 0) {
        if (!activeFilters.branding.some(b => (entry.branding || []).includes(b))) return false;
      }
      if (activeFilters.viral.length > 0) {
        if (!activeFilters.viral.some(v => (entry.elementoViral || []).includes(v))) return false;
      }

      return true;
    });

    renderGallery();
  }

  function clearFilters() {
    activeFilters = { search: '', mercado: '', vertical: [], modelo: [], branding: [], viral: [] };
    dom.filterSearch.value = '';
    document.querySelectorAll('.mercado-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.mercado-pill[data-mercado=""]').classList.add('active');
    document.querySelectorAll('.filter-ms-option.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.filter-ms-trigger').forEach(t => {
      const label = t.closest('#filter-vertical') ? 'Vertical'
        : t.closest('#filter-modelo') ? 'Para Modelo'
        : t.closest('#filter-branding') ? 'Branding'
        : 'Elemento Viral';
      t.innerHTML = `<span class="ms-label">${label}</span><span class="arrow">▼</span>`;
    });
    applyFilters();
  }

  // --- REVIEW COUNT ---
  function updateReviewCount() {
    const count = allEntries.filter(e => e.estado !== 'FRANCO EDICION' && isIncomplete(e)).length;
    dom.reviewCount.textContent = count;
    if (count > 0) {
      dom.btnReview.classList.remove('hidden');
    } else {
      dom.btnReview.classList.add('hidden');
    }
  }

  // --- MODAL (Add / Edit) ---
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

    // Show avatar in modal header if available
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

  function closeModal() {
    dom.modalOverlay.classList.remove('active');
    editingId = null;
  }

  function renderModalForm(entry) {
    dom.modalBody.innerHTML = buildFormHTML(entry, 'modal');
    attachFormEvents(dom.modalBody, 'modal');
  }

  function buildFormHTML(entry, prefix) {
    const mercados = ['🇪🇸', '🇺🇲', '🇧🇷'];
    return `
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
          ${mercados.map(m => `<button type="button" class="form-mercado-btn${entry.mercado === m ? ' selected' : ''}" data-mercado="${m}">${m}</button>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Vertical</label>
        <div class="form-chips" id="${prefix}-vertical">
          ${(dbOptions.Vertical || []).map(v => `<span class="form-chip${(entry.vertical || []).includes(v) ? ' selected-vertical' : ''}" data-value="${esc(v)}">${esc(v)}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Branding</label>
        <div class="form-chips" id="${prefix}-branding">
          ${(dbOptions.Branding || []).map(v => `<span class="form-chip${(entry.branding || []).includes(v) ? ' selected-branding' : ''}" data-value="${esc(v)}">${esc(v)}</span>`).join('')}
          <span class="form-chip form-chip-add" data-addnew="branding">+ Nueva</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Elemento Viral</label>
        <div class="form-chips" id="${prefix}-viral">
          ${(dbOptions['Elemento Viral'] || []).map(v => `<span class="form-chip${(entry.elementoViral || []).includes(v) ? ' selected-viral' : ''}" data-value="${esc(v)}">${esc(v)}</span>`).join('')}
          <span class="form-chip form-chip-add" data-addnew="viral">+ Nueva</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Para Modelo</label>
        <div class="form-chips" id="${prefix}-modelo">
          ${(dbOptions['Para Modelo'] || []).map(v => `<span class="form-chip${(entry.paraModelo || []).includes(v) ? ' selected-modelo' : ''}" data-value="${esc(v)}">${esc(v)}</span>`).join('')}
        </div>
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

    const chipTypes = [
      { id: `${prefix}-vertical`, cls: 'selected-vertical' },
      { id: `${prefix}-branding`, cls: 'selected-branding' },
      { id: `${prefix}-viral`, cls: 'selected-viral' },
      { id: `${prefix}-modelo`, cls: 'selected-modelo' }
    ];

    chipTypes.forEach(({ id, cls }) => {
      const wrap = container.querySelector(`#${id}`);
      if (!wrap) return;
      wrap.querySelectorAll('.form-chip:not(.form-chip-add)').forEach(chip => {
        chip.addEventListener('click', () => chip.classList.toggle(cls));
      });
    });

    container.querySelectorAll('[data-addnew]').forEach(addBtn => {
      addBtn.addEventListener('click', () => {
        handleAddNewTag(container, prefix, addBtn.dataset.addnew, addBtn);
      });
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

        if (!dbOptions[notionProp].includes(val)) {
          dbOptions[notionProp].push(val);
        }

        const chip = document.createElement('span');
        chip.className = `form-chip ${chipClass}`;
        chip.dataset.value = val;
        chip.textContent = val;
        chip.addEventListener('click', () => chip.classList.toggle(chipClass));
        addBtn.before(chip);

        row.remove();
        toast(`Etiqueta "${val}" añadida`);
      } catch (err) {
        toast(`Error: ${err.message}`, 'error');
      }
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

    const vertical = getSelectedChips(container, `#${prefix}-vertical`, 'selected-vertical');
    const branding = getSelectedChips(container, `#${prefix}-branding`, 'selected-branding');
    const elementoViral = getSelectedChips(container, `#${prefix}-viral`, 'selected-viral');
    const paraModelo = getSelectedChips(container, `#${prefix}-modelo`, 'selected-modelo');

    return { idea, link, mercado, vertical, branding, elementoViral, paraModelo };
  }

  function getSelectedChips(container, selector, cls) {
    const wrap = container.querySelector(selector);
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll(`.${cls}`)).map(c => c.dataset.value);
  }

  async function handleModalSave() {
    const data = getFormData(dom.modalBody, 'modal');
    if (!data.idea) {
      toast('El campo Idea es obligatorio', 'error');
      return;
    }

    dom.modalSave.disabled = true;
    dom.modalSave.textContent = 'Guardando...';

    try {
      if (editingId) {
        const result = await apiPatch(`inspo-vault?action=update&id=${editingId}`, data);
        const idx = allEntries.findIndex(e => e.id === editingId);
        if (idx !== -1) allEntries[idx] = result.entry;
        toast('Perfil actualizado');
      } else {
        const result = await apiPost('inspo-vault?action=create', data);
        allEntries.unshift(result.entry);
        toast('Perfil creado');
      }

      closeModal();
      updateReviewCount();
      updateHeaderStats();
      applyFilters();
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    } finally {
      dom.modalSave.disabled = false;
      dom.modalSave.textContent = 'Guardar';
    }
  }

  // --- QUICK REVIEW ---
  function startReview() {
    reviewQueue = allEntries.filter(e => e.estado !== 'FRANCO EDICION' && isIncomplete(e));
    if (reviewQueue.length === 0) {
      toast('¡Todos los perfiles están etiquetados!');
      return;
    }
    reviewIndex = 0;
    dom.reviewTotal.textContent = reviewQueue.length;
    renderReviewItem();
    dom.reviewOverlay.classList.add('active');
  }

  function exitReview() {
    dom.reviewOverlay.classList.remove('active');
    updateReviewCount();
    updateHeaderStats();
    applyFilters();
  }

  function renderReviewItem() {
    if (reviewIndex >= reviewQueue.length) {
      toast('¡Revisión completada!');
      exitReview();
      return;
    }

    const entry = reviewQueue[reviewIndex];
    dom.reviewCurrent.textContent = reviewIndex + 1;

    // Progress bar
    const pct = ((reviewIndex + 1) / reviewQueue.length) * 100;
    dom.reviewProgressBar.style.width = pct + '%';

    // Previous button state
    dom.reviewPrev.disabled = reviewIndex === 0;

    // --- Left panel: Profile preview ---
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

    dom.reviewPreview.innerHTML = `
      ${avatarHtml}
      <div class="review-name">${esc(entry.idea)}</div>
      ${usernameHtml}
      ${igBtn}
    `;

    // --- Right panel: Form ---
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
      if (idx !== -1) allEntries[idx] = result.entry;
      toast('Guardado ✓');
      reviewIndex++;
      renderReviewItem();
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    } finally {
      dom.reviewSave.disabled = false;
      dom.reviewSave.textContent = 'Guardar y Siguiente →';
    }
  }

  function handleReviewSkip() {
    reviewIndex++;
    renderReviewItem();
  }

  function handleReviewPrev() {
    if (reviewIndex > 0) {
      reviewIndex--;
      renderReviewItem();
    }
  }

  // --- INIT ---
  async function init() {
    try {
      dom.loadingStatus.textContent = 'Cargando opciones...';
      const optionsRes = await apiGet('inspo-vault?action=options');
      dbOptions = optionsRes.options;

      dom.loadingStatus.textContent = 'Cargando perfiles...';
      const listRes = await apiGet('inspo-vault?action=list');
      allEntries = listRes.entries;

      // Build filter dropdowns with labels
      createMultiSelect(dom.filterVertical, dbOptions.Vertical || [], 'vertical', 'Vertical', applyFilters);
      createMultiSelect(dom.filterModelo, dbOptions['Para Modelo'] || [], 'modelo', 'Para Modelo', applyFilters);
      createMultiSelect(dom.filterBranding, dbOptions.Branding || [], 'branding', 'Branding', applyFilters);
      createMultiSelect(dom.filterViral, dbOptions['Elemento Viral'] || [], 'viral', 'Elemento Viral', applyFilters);

      updateReviewCount();
      updateHeaderStats();
      applyFilters();

      // Show dashboard
      dom.loadingOverlay.classList.add('fade-out');
      setTimeout(() => { dom.loadingOverlay.style.display = 'none'; }, 400);
      dom.dashboard.classList.remove('hidden');

    } catch (err) {
      dom.loadingStatus.textContent = `Error: ${err.message}`;
      dom.loadingStatus.style.color = '#f87171';
      console.error('Init error:', err);
    }
  }

  // --- EVENT LISTENERS ---
  let searchDebounce;
  dom.filterSearch.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      activeFilters.search = dom.filterSearch.value;
      applyFilters();
    }, 200);
  });

  // Mercado pills
  document.querySelectorAll('.mercado-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.mercado-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilters.mercado = pill.dataset.mercado;
      applyFilters();
    });
  });

  dom.btnAdd.addEventListener('click', openAddModal);
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSave.addEventListener('click', handleModalSave);
  dom.btnReview.addEventListener('click', startReview);
  dom.reviewExit.addEventListener('click', exitReview);
  dom.reviewSave.addEventListener('click', handleReviewSave);
  dom.reviewSkip.addEventListener('click', handleReviewSkip);
  dom.reviewPrev.addEventListener('click', handleReviewPrev);

  dom.modalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-ms-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling.classList.remove('active');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.reviewOverlay.classList.contains('active')) exitReview();
      else if (dom.modalOverlay.classList.contains('active')) closeModal();
    }
  });

  // --- GO ---
  init();

})();
