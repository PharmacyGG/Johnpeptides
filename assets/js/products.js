/* =================================================================
   PepGuide product catalog (single source of truth)
   ----------------------------------------------------------------
   The cart looks items up by `id`. When you set up Stripe:
     1) Create a Product + Price for each entry in the Stripe dashboard
     2) Paste the `price_…` ID into `stripePriceId` below
   The serverless checkout function only uses `stripePriceId` + `qty`
   to talk to Stripe — name/price/image here are for our own UI.
   ================================================================= */
window.PEPGUIDE_PRODUCTS = [
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    category: 'Copper Peptide',
    dosage: '100 mg',
    priceCents: 7000,
    image: 'assets/img/vial-ghk-cu.png',
    badge: 'PEPTIDE',
    stripePriceId: '',          // e.g. 'price_1AbcDeFghIjKlMnO'
  },
  {
    id: 'bpc-157',
    name: 'BPC-157',
    category: 'Recovery & Healing',
    dosage: '10 mg',
    priceCents: 5500,
    image: 'assets/img/vial-bpc-157.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
  {
    id: 'bpc-tb500',
    name: 'BPC-157 + TB-500',
    category: 'Recovery & Healing Blend',
    dosage: '10 mg / 10 mg',
    priceCents: 11500,
    image: 'assets/img/vial-bpc-tb500.png',
    badge: 'BLEND',
    stripePriceId: '',
  },
  {
    id: 'cjc-ipamorelin',
    name: 'CJC-1295 + Ipamorelin',
    category: 'Growth Hormone Secretagogue Blend',
    dosage: '5 mg / 5 mg',
    priceCents: 8500,
    image: 'assets/img/vial-cjc-ipamorelin.png',
    badge: 'BLEND',
    stripePriceId: '',
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    category: 'Growth Hormone Secretagogue',
    dosage: '10 mg',
    priceCents: 13000,
    image: 'assets/img/vial-tesamorelin.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
  {
    id: 'nad',
    name: 'NAD+',
    category: 'Mitochondrial / Longevity',
    dosage: '500 mg',
    priceCents: 6500,
    image: 'assets/img/vial-nad.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
  {
    id: 'epithalon',
    name: 'Epithalon',
    category: 'Longevity',
    dosage: '50 mg',
    priceCents: 12500,
    image: 'assets/img/vial-epithalon.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
  {
    id: 'glow',
    name: 'GLOW',
    category: 'GHK-Cu + BPC-157 + TB-500 Blend',
    dosage: '50/10/10 mg',
    priceCents: 15000,
    image: 'assets/img/vial-glow.png',
    badge: 'BLEND',
    stripePriceId: '',
  },
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    category: 'GLP-1 Research',
    dosage: '5 mg',
    priceCents: 9500,
    image: 'assets/img/vial-semaglutide.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
  {
    id: 'semax',
    name: 'Semax',
    category: 'Cognitive Research',
    dosage: '10 mg',
    priceCents: 6000,
    image: 'assets/img/vial-semax.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
  {
    id: 'mots-c',
    name: 'MOTS-c',
    category: 'Mitochondrial Research',
    dosage: '10 mg',
    priceCents: 6000,
    image: 'assets/img/vial-mots-c.png',
    badge: 'PEPTIDE',
    stripePriceId: '',
  },
];

window.PEPGUIDE_PRODUCT_BY_ID = Object.fromEntries(
  window.PEPGUIDE_PRODUCTS.map(p => [p.id, p])
);
