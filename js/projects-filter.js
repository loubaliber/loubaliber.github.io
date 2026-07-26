/**
 * projects-filter.js — filters .project-full cards by data-category
 * against the pressed .filter-btn. "All" is default.
 */
(function () {
  'use strict';

  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-full');
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');

      const filter = btn.dataset.filter;
      cards.forEach((card) => {
        const cats = (card.dataset.category || '').split(' ');
        const show = filter === 'all' || cats.includes(filter);
        card.style.display = show ? '' : 'none';
      });
    });
  });
})();
