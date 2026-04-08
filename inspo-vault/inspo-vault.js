/* ============================================
   Inspo Vault — BraveGirls Agency
   Frontend logic
   ============================================ */

(function () {
  'use strict';

  // --- CONFIG ---
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

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
    btnReview: $('#btn-review'),
    reviewCount: $('#review-count'),
    btnAdd: $('#btn-add'),
    filterSearch: $('#filter-search'),
    filterMercado: $('#filter-mercado'),
    filterVertical: $('#filter-vertical'),
    filterModelo: $('#filter-modelo'),
    filterBranding: $('#filter-branding'),
    filterViral: $('#filter-viral'),
    btnClearFilters: $('#btn-clear-filters'),
    galleryCount: $('#gallery-count'),
    galleryGrid: $('#gallery-grid'),
    modalOverlay: $('#modal-overlay'),
    modalTitle: $('#modal-title'),
    modalBody: $('#modal-body'),
    modalClose: $('#modal-close'),
    modalCancel: $('#modal-cancel'),
    modalSave: $('#modal-save'),
    reviewOverlay: $('#review-overlay'),
    reviewCurrent: $('#review-current'),
    reviewTotal: $('#review-total'),
    reviewCard: $('#review-card'),
    reviewExit: $('#review-exit'),
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

  // --- API ---
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

  // --- MULTI-SELECT FILTER COMPONENT ---
  function createMultiSelect(container, options, filterKey, onChange) {
    container.innerHTML = '';
    const trigger = document.createElement('div');
    trigger.className = 'filter-ms-trigger';
    trigger.innerHTML = `<span class="label">Todos</span><span class="arrow">▼</span>`;

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
        const selected = Array.from(dropdown.querySelectorAll('.selected')).map(
          el => el.dataset.value
        );
        activeFilters[filterKey] = selected;
        updateTriggerLabel(trigger, selected);
        onChange();
      });
      dropdown.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close all other dropdowns first
      document.querySelectorAll('.filter-ms-dropdown.open').forEach(d => {
        if (d !== dropdown) { d.classList.remove('open'); d.previousElementSibling.classList.remove('active'); }
      });
      dropdown.classList.toggle('open');
      trigger.classList.toggle('active');
    });

    container.appendChild(trigger);
    container.appendChild(dropdown);
  }

  function updateTriggerLabel(trigger, selected) {
    if (selected.length === 0) {
      trigger.innerHTML = `<span class="label">Todos</span><span class="arrow">▼</span>`;
    } else {
      trigger.innerHTML = `<span class="label">${esc(selected[0])}${selected.length > 1 ? '...' : ''}</span><span class="count">${selected.length}</span><span class="arrow">▼</span>`;
    }
  }

  // --- RENDERING ---
  function renderGallery() {
    const grid = dom.galleryGrid;
    grid.innerHTML = '';

    if (filteredEntries.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty">
          <div class="gallery-empty-icon">🔍</div>
          <p>No se encontraron perfiles con estos filtros</p>
        </div>`;
      dom.galleryCount.textContent = '0 perfiles';
      return;
    }

    dom.galleryCount.textContent = `${filteredEntries.length} perfiles`;

    filteredEntries.forEach(entry => {
      grid.appendChild(createCard(entry));
    });
  }

  function createCard(entry) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = entry.id;

    const mercadoFlag = entry.mercado || '';
    const linkHtml = entry.link
      ? `<a href="${esc(entry.link)}" target="_blank" rel="noopener" class="card-link">🔗 Ver perfil</a>`
      : '';

    const verticalChips = renderChipList(entry.vertical, 'vertical', 3);
    const brandingChips = renderChipList(entry.branding, 'branding', 3);
    const viralChips = renderChipList(entry.elementoViral, 'viral', 3);
    const modeloChips = renderChipList(entry.paraModelo, 'modelo', 2);

    const incomplete = isIncomplete(entry)
      ? `<span class="card-incomplete">⚠ Faltan tags</span>`
      : '';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-idea">${esc(entry.idea)}</div>
        <span class="card-mercado">${mercadoFlag}</span>
      </div>
      ${linkHtml}
      <div class="card-chips">${verticalChips}${brandingChips}${viralChips}${modeloChips}</div>
      <div class="card-footer">
        ${incomplete}
        <button class="btn-icon" data-edit="${entry.id}" title="Editar">✏️</button>
      </div>
    `;

    card.querySelector(`[data-edit="${entry.id}"]`).addEventListener('click', () => {
      openEditModal(entry.id);
    });

    return card;
  }

  function renderChipList(items, type, max) {
    if (!items || items.length === 0) return '';
    const visible = items.slice(0, max);
    const extra = items.length - max;
    let html = visible.map(i => `<span class="chip chip-${type}">${esc(i)}</span>`).join('');
    if (extra > 0) html += `<span class="chip chip-more">+${extra}</span>`;
    return html;
  }

  // --- FILTERING ---
  function applyFilters() {
    filteredEntries = allEntries.filter(entry => {
      // Exclude internal states
      if (entry.estado === 'FRANCO EDICION') return false;

      // Text search
      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase();
        if (!entry.idea.toLowerCase().includes(q)) return false;
      }

      // Mercado
      if (activeFilters.mercado && entry.mercado !== activeFilters.mercado) return false;

      // Multi-select filters: entry must have ALL selected filter values
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
    dom.filterMercado.value = '';
    document.querySelectorAll('.filter-ms-option.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.filter-ms-trigger').forEach(t => {
      t.innerHTML = `<span class="label">Todos</span><span class="arrow">▼</span>`;
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
    renderModalForm({});
    dom.modalOverlay.classList.add('active');
  }

  function openEditModal(id) {
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;
    editingId = id;
    dom.modalTitle.textContent = 'Editar Perfil';
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
    // Mercado buttons
    container.querySelectorAll('.form-mercado-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.form-mercado-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Chip toggle for vertical, branding, viral, modelo
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

    // Add new tag buttons
    container.querySelectorAll('[data-addnew]').forEach(addBtn => {
      addBtn.addEventListener('click', () => {
        const type = addBtn.dataset.addnew;
        handleAddNewTag(container, prefix, type, addBtn);
      });
    });
  }

  function handleAddNewTag(container, prefix, type, addBtn) {
    // Don't add if there's already an input
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

        // Add to local options
        if (!dbOptions[notionProp].includes(val)) {
          dbOptions[notionProp].push(val);
        }

        // Create chip in the form
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
        // Update local entry
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

    const linkHtml = entry.link
      ? `<a href="${esc(entry.link)}" target="_blank" rel="noopener" class="review-link">📷 Abrir Instagram</a>`
      : `<p style="color:var(--text-muted);margin-bottom:1rem;">Sin link</p>`;

    dom.reviewCard.innerHTML = `
      <div class="review-idea">${esc(entry.idea)}</div>
      ${linkHtml}
      ${buildFormHTML(entry, 'review')}
    `;

    attachFormEvents(dom.reviewCard, 'review');
  }

  async function handleReviewSave() {
    const entry = reviewQueue[reviewIndex];
    const data = getFormData(dom.reviewCard, 'review');

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

  // --- INIT ---
  async function init() {
    try {
      dom.loadingStatus.textContent = 'Cargando opciones...';
      const optionsRes = await apiGet('inspo-vault?action=options');
      dbOptions = optionsRes.options;

      dom.loadingStatus.textContent = 'Cargando perfiles...';
      const listRes = await apiGet('inspo-vault?action=list');
      allEntries = listRes.entries;

      // Build filter dropdowns
      createMultiSelect(dom.filterVertical, dbOptions.Vertical || [], 'vertical', applyFilters);
      createMultiSelect(dom.filterModelo, dbOptions['Para Modelo'] || [], 'modelo', applyFilters);
      createMultiSelect(dom.filterBranding, dbOptions.Branding || [], 'branding', applyFilters);
      createMultiSelect(dom.filterViral, dbOptions['Elemento Viral'] || [], 'viral', applyFilters);

      updateReviewCount();
      applyFilters();

      // Show dashboard
      dom.loadingOverlay.classList.add('fade-out');
      setTimeout(() => { dom.loadingOverlay.style.display = 'none'; }, 300);
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

  dom.filterMercado.addEventListener('change', () => {
    activeFilters.mercado = dom.filterMercado.value;
    applyFilters();
  });

  dom.btnClearFilters.addEventListener('click', clearFilters);
  dom.btnAdd.addEventListener('click', openAddModal);
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSave.addEventListener('click', handleModalSave);
  dom.btnReview.addEventListener('click', startReview);
  dom.reviewExit.addEventListener('click', exitReview);
  dom.reviewSave.addEventListener('click', handleReviewSave);
  dom.reviewSkip.addEventListener('click', handleReviewSkip);

  // Close modal on backdrop click
  dom.modalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });

  // Close dropdowns on click outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-ms-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling.classList.remove('active');
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.reviewOverlay.classList.contains('active')) exitReview();
      else if (dom.modalOverlay.classList.contains('active')) closeModal();
    }
  });

  // --- GO ---
  init();

})();
