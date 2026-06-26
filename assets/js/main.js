/* =============================================
   PEPGUIDE — Interactions + GSAP scroll animations
   ============================================= */

(function () {
  'use strict';

  // ----- MOBILE MENU -----
  // Drive open/close via inline styles (CSS transitions on toggled classes
  // were getting stuck at time 0 in this environment — same bug we hit on
  // the process section). Inline styles bypass that.
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const menuClose  = document.getElementById('mobile-menu-close');
  const menuEl     = document.getElementById('mobile-menu');
  const menuPanel  = menuEl?.querySelector('.mobile-menu-panel');

  const openMenu = () => {
    if (!menuEl) return;
    menuEl.style.cssText = 'opacity: 1; visibility: visible; pointer-events: auto;';
    document.body.classList.add('menu-open');
    menuEl.setAttribute('aria-hidden', 'false');
  };
  const closeMenu = () => {
    if (!menuEl) return;
    menuEl.style.cssText = '';   // back to CSS defaults (opacity 0, hidden, no events)
    document.body.classList.remove('menu-open');
    menuEl.setAttribute('aria-hidden', 'true');
  };

  menuToggle?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  menuEl?.addEventListener('click', (e) => { if (e.target === menuEl) closeMenu(); });
  menuEl?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // ----- NEWSLETTER FORMS -----
  // Any <form data-newsletter-form> with the matching data-newsletter-{email,submit,status}
  // children inside it auto-wires to /api/newsletter. Lets the same handler power both the
  // dedicated #newsletter section and the compact form in the footer.
  const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
    const email  = form.querySelector('[data-newsletter-email]');
    const btn    = form.querySelector('[data-newsletter-submit]');
    // Status node lives as a SIBLING of the form, not inside it (so the form
    // can be hidden on success without hiding the thank-you message).
    const status = form.querySelector('[data-newsletter-status]') ||
                   form.parentElement?.querySelector('[data-newsletter-status]');
    if (!email || !btn || !status) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = (email.value || '').trim();
      if (!EMAIL_RX.test(value)) {
        status.textContent = 'Please enter a valid email address.';
        return;
      }
      btn.disabled = true;
      const origLabel = btn.textContent;
      btn.textContent = 'Subscribing…';
      status.textContent = '';
      try {
        const resp = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          form.style.display = 'none';
          status.textContent = "Thanks — you're on the list. We'll be in touch.";
        } else {
          status.textContent = data.error || 'Something went wrong. Please try again.';
          btn.disabled = false;
          btn.textContent = origLabel;
        }
      } catch (err) {
        status.textContent = 'Network error. Please try again.';
        btn.disabled = false;
        btn.textContent = origLabel;
      }
    });
  });

  // ----- Research Club / nav links smooth scroll past the fixed nav -----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = document.querySelector('nav')?.offsetHeight || 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // ----- AGE GATE -----
  const gate = document.getElementById('age-gate');
  const confirmBox = document.getElementById('age-confirm');
  const enterBtn = document.getElementById('enter-site');

  const acceptGate = () => {
    localStorage.setItem('pepguide-verified', '1');
    if (gate) gate.classList.add('hidden');
  };

  if (gate && confirmBox && enterBtn) {
    if (localStorage.getItem('pepguide-verified') === '1') {
      gate.classList.add('hidden');
    }

    const syncBtn = () => {
      if (confirmBox.checked) {
        enterBtn.classList.add('enabled');
        enterBtn.setAttribute('aria-disabled', 'false');
      } else {
        enterBtn.classList.remove('enabled');
        enterBtn.setAttribute('aria-disabled', 'true');
      }
    };

    confirmBox.addEventListener('change', syncBtn);
    confirmBox.addEventListener('input', syncBtn);
    // Allow clicking the label/text to toggle too
    confirmBox.closest('label')?.addEventListener('click', () => setTimeout(syncBtn, 0));

    enterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!confirmBox.checked) {
        // Nudge: shake the checkbox label to draw the eye
        const lbl = confirmBox.closest('label');
        if (lbl) {
          lbl.style.transition = 'transform 0.3s';
          lbl.style.transform = 'translateX(6px)';
          setTimeout(() => { lbl.style.transform = 'translateX(-4px)'; }, 100);
          setTimeout(() => { lbl.style.transform = ''; }, 220);
        }
        return;
      }
      acceptGate();
    });

    // ESC closes if user has confirmed (escape hatch)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && confirmBox.checked) acceptGate();
    });
  }

  // ----- GSAP setup -----
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero vial: subtle parallax + entrance
  const heroVial = document.getElementById('hero-vial');
  if (heroVial) {
    gsap.from(heroVial, {
      y: 40,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.3,
    });
    // Slow parallax on scroll
    gsap.to(heroVial, {
      y: 80,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // Hero headline staggered entrance
  const headline = document.querySelector('.hero-headline');
  if (headline) {
    gsap.from(headline, { y: 30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.15 });
  }

  // Count-up stats
  document.querySelectorAll('.count-up').forEach((el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.round(obj.val) + '+'; },
        });
      },
    });
  });

  // Process — pinned scroll-driven vial assembly
  const processSection = document.querySelector('.process-section');
  const steps          = document.querySelectorAll('.process-step');
  const assembly       = document.getElementById('vial-assembly');
  const partCap        = document.querySelector('.part-cap');
  const partRing       = document.querySelector('.part-ring');
  const partStopper    = document.querySelector('.part-stopper');
  const partBody       = document.querySelector('.part-body');

  if (processSection && assembly && partCap && partRing && partStopper && partBody) {
    // EXPLODED → ASSEMBLED y-offsets in px. Body stays put; parts above lift up.
    // Larger negative number = higher (more exploded).
    // Cap's max travel is capped at ~-90px so it doesn't clip above the
    // pinned section's top edge (the pin has overflow:hidden so anything
    // above pin top gets cut off — see screenshot from 2026-06-26).
    const STATES = [
      // step 0: fully exploded — cap stops shy of the section's top edge
      { cap: -90, ring: -60, stopper: -30, body: 0 },
      // step 1
      { cap: -70, ring: -46, stopper: -24, body: 0 },
      // step 2
      { cap: -48, ring: -32, stopper: -16, body: 0 },
      // step 3: parts close together (cross-fade starts at 75%)
      { cap: -25, ring: -16, stopper:  -8, body: 0 },
      // step 4: tightly converged just before assembled vial takes over
      { cap:  -8, ring:  -5, stopper:  -3, body: 0 },
    ];

    const lerp = (a, b, t) => a + (b - a) * t;

    function applyState(progress) {
      // progress is 0..1 across whole pinned section. Map to step index 0..4 with fractional interpolation.
      const scaled = Math.max(0, Math.min(1, progress)) * (STATES.length - 1);
      const i = Math.min(STATES.length - 2, Math.floor(scaled));
      const t = scaled - i;
      const a = STATES[i], b = STATES[i + 1];
      const cap     = lerp(a.cap,     b.cap,     t);
      const ring    = lerp(a.ring,    b.ring,    t);
      const stopper = lerp(a.stopper, b.stopper, t);

      partCap.style.transform     = `translateY(${cap}px)`;
      partRing.style.transform    = `translateY(${ring}px)`;
      partStopper.style.transform = `translateY(${stopper}px)`;

      // Active step = nearest integer
      const activeIdx = Math.round(scaled);
      steps.forEach((s, idx) => {
        s.classList.toggle('active', idx === activeIdx);
        s.classList.toggle('completed', idx < activeIdx);
      });

      // Cross-fade: parts → assembled vial across the last quarter of scroll
      // 0.65 → start fading; 0.85 → fully swapped
      const xfade = Math.max(0, Math.min(1, (progress - 0.65) / 0.20));
      const assembledEl = assembly.querySelector('.vial-assembled');
      if (assembledEl) {
        assembledEl.style.opacity = String(xfade);
        assembledEl.style.transform = `translate(-50%, 0) scale(${0.96 + 0.04 * xfade})`;
      }
      // Fade parts OUT as assembled fades in
      [partCap, partRing, partStopper, partBody].forEach(p => {
        p.style.opacity = String(1 - xfade);
      });
      assembly.classList.toggle('show-assembled', xfade > 0.5);

      // Test badges: stagger-fade in after the assembled vial appears (0.85 → 1.0)
      const badgeProgress = Math.max(0, Math.min(1, (progress - 0.85) / 0.10));
      const badges = assembly.querySelectorAll('.test-badge');
      badges.forEach((b, idx) => {
        // Stagger each badge by 0.12 of the badgeProgress window
        const start = idx * 0.12;
        const local = Math.max(0, Math.min(1, (badgeProgress - start) / (1 - start)));
        b.style.opacity = String(local);
        b.style.transform = `translateY(${8 * (1 - local)}px)`;
      });
      assembly.classList.toggle('show-badges', progress > 0.85);
    }

    ScrollTrigger.create({
      trigger: processSection,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => applyState(self.progress),
    });

    // Initial state
    applyState(0);
  }

  // Recompute ScrollTrigger positions after fonts + the hero video settle.
  // Without this, the trigger can latch onto layout heights from before the
  // hero/process images finish loading, which makes the section's start
  // position wrong and the cross-fade fires immediately.
  const refreshAll = () => ScrollTrigger.refresh();
  window.addEventListener('load', refreshAll);
  setTimeout(refreshAll, 600);
  setTimeout(refreshAll, 1500);

  // Generic section fade-in for cards
  const fadeTargets = document.querySelectorAll(
    '.category-card, .compound-card, .quality-card, .promo-card'
  );
  fadeTargets.forEach((el, i) => {
    gsap.from(el, {
      y: 28,
      opacity: 0,
      duration: 0.7,
      delay: (i % 4) * 0.06,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // Section heading reveal (only h2 inside sections)
  document.querySelectorAll('section h2').forEach((h2) => {
    gsap.from(h2, {
      y: 24,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: h2, start: 'top 85%' },
    });
  });

  // Filter pills swap
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('filter-pill-active'));
      e.currentTarget.classList.add('filter-pill-active');
    });
  });
})();
