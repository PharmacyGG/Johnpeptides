# PepGuide

Evidence-based peptide research platform. Static homepage built with HTML, Tailwind (CDN), and GSAP.

**Live preview locally:**
```bash
python -m http.server 5500
```
Then open <http://localhost:5500>.

## Stack
- HTML + Tailwind v3 (Play CDN)
- GSAP + ScrollTrigger for scroll-driven animations
- Inter (body) + Playfair Display (serif headings) via Google Fonts
- Hero and category mood imagery generated via Higgsfield (GPT Image 2)

## Structure
```
index.html               — homepage
assets/css/style.css     — design tokens + component styles
assets/js/main.js        — age-gate, GSAP animations, interactions
assets/img/              — hero vial + 6 category mood images
```

## Sections
1. Research-use age-gate modal
2. Top nav (search, links, club CTA, cart, account)
3. Cinematic hero with vial render
4. Stats bar (count-up on scroll)
5. Scroll-driven process timeline
6. Two-card promo (free shipping + USA manufactured)
7. Research Categories with atmospheric mood images
8. Featured Compounds grid
9. Quality Standards
10. Monthly Briefing CTA
11. Footer
