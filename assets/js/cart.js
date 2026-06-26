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

  // ---- math + html safety ----
  const fmt = (cents) => '$' + (cents / 100).toFixed(2);
  // Escape strings before splicing into innerHTML. Products are static today,
  // but if product data ever comes from a CMS / supplier feed / user review,
  // unescaped interpolation would be XSS-able.
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
        // All product fields escaped; image path is a same-origin asset
        // path from our own catalog so safe to keep as-is.
        return `
          <div class="cart-line" data-id="${esc(p.id)}">
            <img src="${esc(p.image)}" alt="" class="cart-line-img" />
            <div class="cart-line-info">
              <div class="cart-line-name">${esc(p.name)}</div>
              <div class="cart-line-meta">${esc(p.dosage)}</div>
              <div class="cart-line-qty">
                <button class="qty-btn" data-action="dec" aria-label="Decrease">−</button>
                <span class="qty-num">${esc(line.qty)}</span>
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
    // Lazy-load PayPal once we actually need the buttons
    if (Object.keys(cart).length > 0) mountPayPalButtons();
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

  // ---- PayPal Smart Buttons ----
  // Lazy-load the SDK on first cart open (avoids a payments-script call
  // on every page view), then render PayPal Buttons that talk to our
  // /api/paypal-* endpoints for server-validated order create + capture.
  let paypalLoaded = false;
  let paypalSdkPromise = null;
  const paypalContainer = document.getElementById('paypal-button-container');
  const paypalNotice    = document.getElementById('paypal-notice');

  async function loadPayPalSdk() {
    if (paypalSdkPromise) return paypalSdkPromise;
    paypalSdkPromise = (async () => {
      const cfgResp = await fetch('/api/paypal-config');
      if (!cfgResp.ok) throw new Error('Could not reach /api/paypal-config');
      const cfg = await cfgResp.json();
      if (!cfg.clientId) {
        throw new Error('PAYPAL_CLIENT_ID is not set on the server');
      }
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src =
          'https://www.paypal.com/sdk/js?client-id=' +
          encodeURIComponent(cfg.clientId) +
          '&currency=' + encodeURIComponent(cfg.currency || 'USD') +
          '&intent=capture' +
          '&enable-funding=venmo,paylater';
        s.onload = resolve;
        s.onerror = () => reject(new Error('PayPal SDK failed to load'));
        document.head.appendChild(s);
      });
      paypalLoaded = true;
    })();
    return paypalSdkPromise;
  }

  async function mountPayPalButtons() {
    if (!paypalContainer) return;
    if (paypalContainer.dataset.mounted === '1') return;
    try {
      paypalNotice && (paypalNotice.textContent = 'Loading PayPal…');
      await loadPayPalSdk();
      paypalNotice && (paypalNotice.textContent = '');
      paypalContainer.dataset.mounted = '1';

      window.paypal.Buttons({
        style: { color: 'gold', shape: 'pill', label: 'paypal', height: 48 },
        createOrder: async () => {
          const items = Object.values(cart).map(line => {
            const p = products[line.id];
            return p ? { id: p.id, name: p.name, priceCents: p.priceCents, qty: line.qty } : null;
          }).filter(Boolean);
          if (!items.length) throw new Error('Cart is empty');
          const resp = await fetch('/api/paypal-create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.id) throw new Error(data.error || 'Could not create order');
          return data.id;
        },
        onApprove: async (data) => {
          const resp = await fetch('/api/paypal-capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const result = await resp.json();
          if (resp.ok && (result.status === 'COMPLETED' || result.captureId)) {
            window.location.href = '/success.html?order=' + encodeURIComponent(data.orderID);
          } else {
            alert('Payment did not complete: ' + (result.error || 'unknown error'));
          }
        },
        onCancel: () => { /* user dismissed PayPal — keep cart as-is */ },
        onError: (err) => {
          console.error('PayPal error:', err);
          alert('PayPal encountered an error. Please try again or contact support.');
        },
      }).render('#paypal-button-container');
    } catch (err) {
      paypalContainer.innerHTML = '';
      paypalContainer.dataset.mounted = '';
      if (paypalNotice) {
        paypalNotice.innerHTML =
          '<strong>PayPal is not configured yet.</strong> ' +
          'Add <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> ' +
          'to your Vercel env vars (see PAYPAL_SETUP.md). ' +
          '<br><span style="opacity:.6">' + err.message + '</span>';
      }
    }
  }

  // ---- initial paint ----
  render();
  // Expose for debugging
  window.PepGuideCart = { add, setQty, remove, clear, openDrawer, closeDrawer, get cart() { return cart; } };
})();
