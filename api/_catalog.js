/* =================================================================
   SERVER-SIDE product catalog (price authority)
   ----------------------------------------------------------------
   IMPORTANT: keep this in sync with assets/js/products.js
   Server-side endpoints look up prices here by product ID and
   IGNORE any priceCents the client sends — prevents cart tampering.
   ================================================================= */
module.exports = {
  'bpc-tb500':       { name: 'BPC-157 / TB-500 Blend',     priceCents: 14900 },
  'tb-500':          { name: 'TB-500 / Thymosin Beta-4',   priceCents: 16900 },
  'tesamorelin':     { name: 'Tesamorelin',                priceCents:  9900 },
  'sermorelin':      { name: 'Sermorelin',                 priceCents:  8900 },
  'selank':          { name: 'Selank',                     priceCents:  8900 },
  'semax':           { name: 'Semax',                      priceCents:  9900 },
  'ghk-cu':          { name: 'GHK-Cu',                     priceCents: 11900 },
  'melanotan-1':     { name: 'Melanotan I',                priceCents:  6900 },
  'nad':             { name: 'NAD+',                       priceCents:  9900 },
  'retatrutide-6mg': { name: 'Retatrutide 6mg',            priceCents: 19900 },
  'retatrutide-8mg': { name: 'Retatrutide 8mg',            priceCents: 24900 },
};
