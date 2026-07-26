/**
 * stats.js — animates elements with [data-count-to] from 0 to their target
 * once they scroll into view. Preserves any non-numeric suffix (+, %, etc).
 */
(function () {
  'use strict';

  const els = document.querySelectorAll('[data-count-to]');
  if (!els.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate(el) {
    const target = parseFloat(el.dataset.countTo);
    const suffix = el.dataset.countSuffix || '';
    const duration = 1200;

    if (prefersReducedMotion || !('requestAnimationFrame' in window)) {
      el.textContent = target + suffix;
      return;
    }

    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.floor(eased * target);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(frame);
      else el.textContent = target + suffix;
    }

    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );

  els.forEach((el) => io.observe(el));
})();
