/* =================================================================
   PepGuide cart — localStorage-backed, slide-out drawer
   ----------------------------------------------------------------
   Cart shape:   { [productId]: { id, qty } }
   Hits Stripe Checkout via /api/create-checkout-session on submit.
   ================================================================= */
(function () {
  'use strict';

  const STORAGE_KEY = 'pepguide-cart';
  const products    = window.PEPGUIDE_PRODUCT_BY_ID || {};

  // ---- state ----
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  };
  const save = (cart) => localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  let cart = load();

  // ---- math ----
  const fmt = (cents) => '$' + (cents / 100).toFixed(2);
  const itemCount = () =>
    Object.values(cart).reduce((sum, line) => sum + line.qty, 0);
  const subtotalCents = () =>
    Object.values(cart).reduce((sum, line) => {
      const p = products[line.id];
      return sum + (p ? p.priceCents * line.qty : 0);
    }, 0);

  // ---- DOM refs ----
  const drawerEl  = document.getElementById('cart-drawer');
  const panelEl   = drawerEl?.querySelector('.cart-panel');
  const listEl    = document.getElementById('cart-items');
  const emptyEl   = document.getElementById('cart-empty');
  const subtotalEl= document.getElementById('cart-subtotal');
  const checkoutBtn = document.getElementById('cart-checkout');
  const badgeEls  = document.querySelectorAll('[data-cart-badge]');

  // ---- render ----
  function render() {
    const ids = Object.keys(cart);
    badgeEls.forEach(b => {
      const c = itemCount();
      b.textContent = c;
      b.style.display = c > 0 ? 'flex' : 'none';
    });

    if (!listEl) return;
    if (ids.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = false;
      listEl.innerHTML = ids.map(id => {
        const p = products[id];
        const line = cart[id];
        if (!p) return '';
        return `
          <div class="cart-line" data-id="${p.id}">
            <img src="${p.image}" alt="" class="cart-line-img" />
            <div class="cart-line-info">
              <div class="cart-line-name">${p.name}</div>
              <div class="cart-line-meta">${p.dosage}</div>
              <div class="cart-line-qty">
                <button class="qty-btn" data-action="dec" aria-label="Decrease">−</button>
                <span class="qty-num">${line.qty}</span>
                <button class="qty-btn" data-action="inc" aria-label="Increase">+</button>
                <button class="qty-remove" data-action="remove" aria-label="Remove">Remove</button>
              </div>
            </div>
            <div class="cart-line-price">${fmt(p.priceCents * line.qty)}</div>
          </div>
        `;
      }).join('');
    }

    if (subtotalEl) subtotalEl.textContent = fmt(subtotalCents());
  }

  // ---- actions ----
  function add(id, qty = 1) {
    if (!products[id]) return;
    cart[id] = cart[id] || { id, qty: 0 };
    cart[id].qty += qty;
    save(cart);
    render();
  }
  function setQty(id, qty) {
    if (qty <= 0) { delete cart[id]; }
    else { cart[id] = { id, qty }; }
    save(cart);
    render();
  }
  function remove(id) { delete cart[id]; save(cart); render(); }
  function clear() { cart = {}; save(cart); render(); }

  // ---- drawer open/close (inline-style driven; matches mobile menu pattern) ----
  function openDrawer() {
    if (!drawerEl) return;
    drawerEl.style.cssText = 'opacity:1;visibility:visible;pointer-events:auto;';
    document.body.classList.add('menu-open');
  }
  function closeDrawer() {
    if (!drawerEl) return;
    drawerEl.style.cssText = '';
    document.body.classList.remove('menu-open');
  }

  // ---- wire UI ----
  document.querySelectorAll('[data-cart-open]').forEach(el =>
    el.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); }));

  document.getElementById('cart-close')?.addEventListener('click', closeDrawer);
  drawerEl?.addEventListener('click', (e) => { if (e.target === drawerEl) closeDrawer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // "Add to cart" buttons on compound cards (delegated)
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      const id = addBtn.dataset.addToCart;
      add(id, 1);
      openDrawer();
      return;
    }
    // line item qty controls inside drawer
    const lineBtn = e.target.closest('.cart-line [data-action]');
    if (lineBtn) {
      const lineEl = lineBtn.closest('.cart-line');
      const id = lineEl?.dataset.id;
      if (!id) return;
      const action = lineBtn.dataset.action;
      if (action === 'inc')      setQty(id, (cart[id]?.qty || 0) + 1);
      else if (action === 'dec') setQty(id, (cart[id]?.qty || 0) - 1);
      else if (action === 'remove') remove(id);
    }
  });

  // ---- checkout ----
  checkoutBtn?.addEventListener('click', async () => {
    const items = Object.values(cart).map(line => {
      const p = products[line.id];
      return p ? { id: p.id, name: p.name, priceCents: p.priceCents,
                   stripePriceId: p.stripePriceId, qty: line.qty } : null;
    }).filter(Boolean);
    if (!items.length) return;

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Redirecting…';
    try {
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await resp.json();
      if (data.url) { window.location.href = data.url; return; }
      if (data.error) throw new Error(data.error);
      throw new Error('Unexpected response from checkout endpoint');
    } catch (err) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Checkout';
      alert(
        'Checkout is not configured yet.\n\n' +
        'Once Stripe is set up:\n' +
        '  1. Add STRIPE_SECRET_KEY to Vercel env vars\n' +
        '  2. Create Stripe Products + Prices and paste the\n' +
        '     `price_…` IDs into assets/js/products.js\n\n' +
        'Error: ' + err.message
      );
    }
  });

  // ---- initial paint ----
  render();
  // Expose for debugging
  window.PepGuideCart = { add, setQty, remove, clear, openDrawer, closeDrawer, get cart() { return cart; } };
})();
