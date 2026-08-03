/**
 * blog-post.js — fills the .reading-progress bar based on scroll position
 * through the article body. Loaded only on generated blog/*.html pages.
 */
(function () {
  'use strict';

  const bar = document.getElementById('reading-progress');
  const article = document.querySelector('.post-body');
  if (!bar || !article) return;

  function update() {
    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const articleHeight = rect.height;
    const viewportH = window.innerHeight;

    const scrolled = window.scrollY - articleTop + viewportH * 0.3;
    const total = articleHeight;
    const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
    bar.style.width = pct + '%';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
