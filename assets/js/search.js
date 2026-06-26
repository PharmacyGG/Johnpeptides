/* =================================================================
   PepGuide site search
   ----------------------------------------------------------------
   Attaches a live-dropdown autocomplete to #site-search (desktop)
   and #mobile-site-search. Searches against PEPGUIDE_PRODUCTS by
   name, category, id, and the ALIASES table below (extend that
   table when users hit "no results" for a common synonym).

   Enter / click on a row navigates to /products/<id>.
   ================================================================= */
(function () {
  'use strict';

  // Add to this when you notice a search term we should map to a product.
  const ALIASES = {
    'bpc-tb500':       ['bpc', 'bpc157', 'bpc-157', 'tb', 'tb500', 'tb-500', 'blend', 'healing', 'repair'],
    'tb-500':          ['tb', 'tb500', 'thymosin', 'beta-4', 'beta4', 't-beta', 'repair', 'healing'],
    'tesamorelin':     ['tesa', 'ghrh', 'growth hormone', 'gh'],
    'sermorelin':      ['sermo', 'ghrh', 'growth hormone', 'gh'],
    'selank':          ['nootropic', 'anxiolytic', 'tuftsin'],
    'semax':           ['nootropic', 'cognitive', 'brain'],
    'ghk-cu':          ['ghk', 'copper', 'hair', 'skin', 'tripeptide'],
    'melanotan-1':     ['mt', 'mt1', 'mt-1', 'melanotan i', 'melanocyte', 'tan'],
    'nad':             ['nad+', 'nadh', 'longevity', 'mitochondria'],
    'retatrutide-6mg': ['reta', 'glp', 'glp-1', 'triagonist', 'tri-agonist'],
    'retatrutide-8mg': ['reta', 'glp', 'glp-1', 'triagonist', 'tri-agonist'],
  };

  const norm = (s) => (s || '').toString().toLowerCase().trim();
  const escapeHtml = (s) => (s || '').toString().replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const fmtPrice = (cents) => '$' + (cents / 100).toFixed(0);

  // Word-boundary substring match — prevents "reta" from matching the
  // middle of "secreTAGogue", etc. \b in JS regex treats hyphens as
  // word boundaries, which is what we want ("tb" should match "TB-500").
  const wb = (text, q) => {
    const qEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + qEsc, 'i').test(text);
  };

  function score(product, q) {
    const n = norm(product.name);
    const id = norm(product.id);
    const cat = norm(product.category);
    const alias = (ALIASES[product.id] || []).map(norm);

    if (n === q) return 110;
    if (n.startsWith(q)) return 100;
    if (alias.some(a => a === q)) return 90;
    if (wb(n, q)) return 80;
    if (alias.some(a => a.startsWith(q))) return 75;
    if (alias.some(a => wb(a, q))) return 70;
    if (id.includes(q)) return 50;
    if (wb(cat, q)) return 30;
    return 0;
  }

  function search(query) {
    const q = norm(query);
    if (q.length < 1) return [];
    const products = window.PEPGUIDE_PRODUCTS || [];
    return products
      .map(p => ({ p, s: score(p, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
      .slice(0, 6)
      .map(x => x.p);
  }

  function render(dropdown, results, query) {
    if (!results.length) {
      dropdown.innerHTML = `
        <div class="search-empty">
          No compounds match "<strong>${escapeHtml(query)}</strong>".
          <a href="#newsletter" class="search-empty-link">Request a compound &rarr;</a>
        </div>`;
      return;
    }
    dropdown.innerHTML = results.map((p, i) => `
      <a href="/products/${encodeURIComponent(p.id)}" class="search-result${i === 0 ? ' is-active' : ''}" data-idx="${i}" role="option">
        <img src="${escapeHtml(p.image)}" alt="" class="search-result-img" loading="lazy" />
        <div class="search-result-body">
          <div class="search-result-name">${escapeHtml(p.name)}</div>
          <div class="search-result-meta">${escapeHtml(p.category)} &middot; ${escapeHtml(p.dosage)}</div>
        </div>
        <div class="search-result-price">${escapeHtml(fmtPrice(p.priceCents))}</div>
      </a>
    `).join('');
  }

  function attach(input, dropdown) {
    if (!input || !dropdown) return;
    let activeIdx = -1;
    let lastResults = [];

    const setActive = (idx) => {
      activeIdx = idx;
      dropdown.querySelectorAll('.search-result').forEach((row, i) => {
        row.classList.toggle('is-active', i === idx);
      });
    };

    const open = () => {
      const q = input.value;
      const results = search(q);
      lastResults = results;
      render(dropdown, results, q);
      dropdown.classList.remove('hidden');
      activeIdx = results.length ? 0 : -1;
    };

    const close = () => {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      activeIdx = -1;
      lastResults = [];
    };

    const go = (idx) => {
      if (idx >= 0 && idx < lastResults.length) {
        window.location.assign('/products/' + encodeURIComponent(lastResults[idx].id));
      }
    };

    input.addEventListener('input', () => {
      if (input.value.trim().length >= 1) open();
      else close();
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) open();
    });

    input.addEventListener('keydown', (e) => {
      if (dropdown.classList.contains('hidden')) {
        if (e.key === 'ArrowDown' && input.value.trim().length >= 1) {
          open();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        setActive(Math.min(activeIdx + 1, lastResults.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setActive(Math.max(activeIdx - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (lastResults.length) {
          go(activeIdx >= 0 ? activeIdx : 0);
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        close();
        input.blur();
      }
    });

    dropdown.addEventListener('mouseover', (e) => {
      const row = e.target.closest('[data-idx]');
      if (!row) return;
      const i = Number(row.dataset.idx);
      if (i !== activeIdx) setActive(i);
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== input) close();
    });
  }

  function init() {
    attach(document.getElementById('site-search'),
           document.getElementById('site-search-results'));
    attach(document.getElementById('mobile-site-search'),
           document.getElementById('mobile-site-search-results'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
