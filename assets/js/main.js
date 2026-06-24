/* =============================================
   PEPGUIDE — Interactions + GSAP scroll animations
   ============================================= */

(function () {
  'use strict';

  // ----- AGE GATE -----
  const gate = document.getElementById('age-gate');
  const confirmBox = document.getElementById('age-confirm');
  const enterBtn = document.getElementById('enter-site');

  if (gate && confirmBox && enterBtn) {
    // Persist acceptance per browser
    if (localStorage.getItem('pepguide-verified') === '1') {
      gate.classList.add('hidden');
    }

    confirmBox.addEventListener('change', () => {
      if (confirmBox.checked) {
        enterBtn.disabled = false;
        enterBtn.classList.add('enabled');
        enterBtn.classList.remove('cursor-not-allowed');
      } else {
        enterBtn.disabled = true;
        enterBtn.classList.remove('enabled');
        enterBtn.classList.add('cursor-not-allowed');
      }
    });

    enterBtn.addEventListener('click', () => {
      if (!confirmBox.checked) return;
      localStorage.setItem('pepguide-verified', '1');
      gate.classList.add('hidden');
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

  // Process timeline: activate steps as user scrolls past them
  const steps = document.querySelectorAll('.process-step');
  steps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 70%',
      end: 'bottom 30%',
      onEnter:     () => { steps.forEach(s => s.classList.remove('active')); step.classList.add('active'); },
      onEnterBack: () => { steps.forEach(s => s.classList.remove('active')); step.classList.add('active'); },
    });
  });

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
