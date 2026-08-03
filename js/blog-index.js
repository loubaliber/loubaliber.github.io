/**
 * blog-index.js — client-side search + category filter for blog.html.
 * Operates on the pre-rendered .post-card elements (data-tag, data-search
 * attributes written by scripts/build-blog.js) — no fetch, no JSON needed.
 */
(function () {
  'use strict';

  const searchInput = document.getElementById('blog-search');
  const grid = document.getElementById('post-grid');
  const emptyState = document.getElementById('post-grid-empty');
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.post-card'));
  let activeFilter = 'all';
  let activeQuery = '';

  function apply() {
    let visibleCount = 0;
    cards.forEach((card) => {
      const matchesFilter = activeFilter === 'all' || card.dataset.tag === activeFilter;
      const matchesQuery = !activeQuery || card.dataset.search.includes(activeQuery);
      const show = matchesFilter && matchesQuery;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      activeFilter = btn.dataset.filter;
      apply();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      activeQuery = searchInput.value.trim().toLowerCase();
      apply();
    });
  }
})();
