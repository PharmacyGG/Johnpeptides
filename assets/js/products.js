/* =================================================================
   PepGuide product catalog (single source of truth)
   ----------------------------------------------------------------
   The cart looks items up by `id`. When you set up PayPal:
     - Server-side prices come from `priceCents` here at checkout time
     - No PayPal dashboard product setup required (we build line items
       inline in /api/paypal-create-order)
   priceCents is in cents — i.e. $149 → 14900.
   ================================================================= */
window.PEPGUIDE_PRODUCTS = [
  {
    id: 'bpc-tb500',
    name: 'BPC-157 / TB-500 Blend',
    category: 'Recovery & Healing Blend',
    dosage: '10 mg',
    priceCents: 14900,
    image: 'assets/img/vial-bpc-tb500.png',
    badge: 'BLEND',
  },
  {
    id: 'tb-500',
    name: 'TB-500 / Thymosin Beta-4',
    category: 'Recovery & Healing',
    dosage: '10 mg',
    priceCents: 16900,
    image: 'assets/img/vial-tb500.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    category: 'Growth Hormone Secretagogue',
    dosage: '5 mg',
    priceCents: 9900,
    image: 'assets/img/vial-tesamorelin.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    category: 'Growth Hormone Secretagogue',
    dosage: '5 mg',
    priceCents: 8900,
    image: 'assets/img/vial-sermorelin.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'selank',
    name: 'Selank',
    category: 'Cognitive / Anxiolytic',
    dosage: '10 mg',
    priceCents: 8900,
    image: 'assets/img/vial-selank.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'semax',
    name: 'Semax',
    category: 'Cognitive Research',
    dosage: '25 mg',
    priceCents: 9900,
    image: 'assets/img/vial-semax.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    category: 'Copper Peptide',
    dosage: '50 mg',
    priceCents: 11900,
    image: 'assets/img/vial-ghk-cu.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'melanotan-1',
    name: 'Melanotan I',
    category: 'Pigmentation Research',
    dosage: '10 mg',
    priceCents: 6900,
    image: 'assets/img/vial-melanotan.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'nad',
    name: 'NAD+',
    category: 'Mitochondrial / Longevity',
    dosage: '750 mg',
    priceCents: 9900,
    image: 'assets/img/vial-nad.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'retatrutide-6mg',
    name: 'Retatrutide',
    category: 'GLP-1 / GIP / Glucagon',
    dosage: '6 mg',
    priceCents: 19900,
    image: 'assets/img/vial-retatrutide-6mg.png',
    badge: 'PEPTIDE',
  },
  {
    id: 'retatrutide-8mg',
    name: 'Retatrutide',
    category: 'GLP-1 / GIP / Glucagon',
    dosage: '8 mg',
    priceCents: 24900,
    image: 'assets/img/vial-retatrutide-8mg.png',
    badge: 'PEPTIDE',
  },
];

window.PEPGUIDE_PRODUCT_BY_ID = Object.fromEntries(
  window.PEPGUIDE_PRODUCTS.map(p => [p.id, p])
);
