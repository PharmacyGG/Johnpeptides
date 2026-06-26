/* =================================================================
   PepGuide product detail page (PDP) renderer
   ----------------------------------------------------------------
   This script runs on /product.html. The URL is rewritten in
   vercel.json so /products/<slug> resolves here. Reads the slug
   from window.location.pathname, looks up the product in
   window.PEPGUIDE_PRODUCT_BY_ID, and populates the page.
   ================================================================= */
(function () {
  'use strict';

  // Same escape helper pattern as cart.js — defense in depth for any
  // future user-generated/CMS-sourced data even though today everything
  // comes from products.js (trusted).
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const fmt = (cents) => '$' + (cents / 100).toFixed(0);

  // /products/<slug> → "<slug>"; also handles /product.html?id=<slug> as a fallback
  function getSlug() {
    const m = window.location.pathname.match(/^\/products\/([^\/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    const url = new URL(window.location.href);
    return url.searchParams.get('id') || '';
  }

  const slug = getSlug();
  const product = (window.PEPGUIDE_PRODUCT_BY_ID || {})[slug];

  const loadingEl  = document.getElementById('pdp-loading');
  const notFoundEl = document.getElementById('pdp-not-found');
  const pdpEl      = document.getElementById('pdp');

  if (!product) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (notFoundEl) notFoundEl.classList.remove('hidden');
    return;
  }

  // ---- populate ----
  document.title = `${product.name} ${product.dosage} — PepGuide`;
  document.querySelector('meta[name="description"]')?.remove();
  const descMeta = document.createElement('meta');
  descMeta.name = 'description';
  descMeta.content = `${product.name} (${product.dosage}) — ${product.description}`;
  document.head.appendChild(descMeta);

  // Canonical
  const canonicalUrl = `https://pepguidance.com/products/${product.id}`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = canonicalUrl;

  // OG tags
  const setOg = (prop, value) => {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  };
  setOg('og:type',        'product');
  setOg('og:title',       `${product.name} ${product.dosage} — PepGuide`);
  setOg('og:description', product.description);
  setOg('og:image',       'https://pepguidance.com/' + product.image);
  setOg('og:url',         canonicalUrl);

  // JSON-LD Product schema
  const ld = document.getElementById('ld-product');
  if (ld) {
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${product.name} ${product.dosage}`,
      description: product.description,
      sku: product.id,
      image: 'https://pepguidance.com/' + product.image,
      brand: { '@type': 'Brand', name: 'PepGuide' },
      category: product.category,
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'USD',
        price: (product.priceCents / 100).toFixed(2),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    });
  }

  // ---- body content ----
  const set = (id, value, useHtml = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (useHtml) el.innerHTML = value;
    else el.textContent = value;
  };

  set('pdp-breadcrumb-name', product.name + ' ' + product.dosage);
  set('pdp-category',        product.category.toUpperCase());
  set('pdp-name',            product.name);
  set('pdp-description',     product.description);
  set('pdp-price',           fmt(product.priceCents));
  set('pdp-dosage',          product.dosage);
  set('pdp-mechanism',       product.mechanism);
  set('pdp-halflife',        product.halfLife);
  set('pdp-dose-range',      product.doseRange);
  set('pdp-storage',         product.storage);
  set('pdp-reconstitution',  product.reconstitution);

  const img = document.getElementById('pdp-image');
  if (img) {
    img.src = product.image;
    img.alt = `${product.name} ${product.dosage} research vial`;
  }

  const addBtn = document.getElementById('pdp-add');
  if (addBtn) addBtn.dataset.addToCart = product.id;

  const coa = document.getElementById('pdp-coa');
  if (coa) coa.href = `/coa/${product.id}.html`;

  // References
  const refsEl = document.getElementById('pdp-references');
  if (refsEl && Array.isArray(product.references)) {
    refsEl.innerHTML = product.references.map(r =>
      `<li><a href="${esc(r.url)}" target="_blank" rel="noopener" class="text-blue-deep hover:text-orange underline-offset-4 hover:underline">${esc(r.title)}</a></li>`
    ).join('');
  }

  // Related compounds
  const relEl = document.getElementById('pdp-related');
  if (relEl && Array.isArray(product.relatedIds)) {
    const rels = product.relatedIds
      .map(id => window.PEPGUIDE_PRODUCT_BY_ID[id])
      .filter(Boolean);
    relEl.innerHTML = rels.map(r => `
      <a href="/products/${esc(r.id)}" class="compound-card block hover:scale-[1.01] transition">
        <div class="compound-badge">${esc(r.badge)}</div>
        <div class="compound-img" style="background-image:url('${esc(r.image)}');"></div>
        <div class="compound-info">
          <div class="compound-name">${esc(r.name)}</div>
          <div class="compound-tag">${esc(r.dosage)} · ${fmt(r.priceCents)}</div>
        </div>
      </a>
    `).join('');
  }

  // Reveal
  loadingEl?.classList.add('hidden');
  pdpEl?.classList.remove('hidden');
})();
