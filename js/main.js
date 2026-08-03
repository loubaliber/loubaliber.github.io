/**
 * main.js — shared site behavior, loaded on every page.
 * Modules are small, single-purpose functions initialized on DOMContentLoaded.
 */
(function () {
  'use strict';

  const THEME_KEY = 'lb-theme';
  const root = document.documentElement;

  /* ---------------------------------------------------------------------
   * Theme (dark default, persisted)
   * ------------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const initial = saved || (prefersLight ? 'light' : 'dark');
    if (initial === 'light') root.setAttribute('data-theme', 'light');

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isLight = root.getAttribute('data-theme') === 'light';
        if (isLight) {
          root.removeAttribute('data-theme');
          localStorage.setItem(THEME_KEY, 'dark');
        } else {
          root.setAttribute('data-theme', 'light');
          localStorage.setItem(THEME_KEY, 'light');
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Mobile nav toggle
   * ------------------------------------------------------------------- */
  function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      })
    );
  }

  /* ---------------------------------------------------------------------
   * Scroll reveal via IntersectionObserver
   * ------------------------------------------------------------------- */
  function initReveal() {
    const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((t) => io.observe(t));
  }

  /* ---------------------------------------------------------------------
   * Back-to-top button
   * ------------------------------------------------------------------- */
  function initBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;

    window.addEventListener(
      'scroll',
      throttle(() => {
        btn.classList.toggle('is-visible', window.scrollY > 640);
      }, 150)
    );

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------------------
   * Page loader fade-out
   * ------------------------------------------------------------------- */
  function initLoader() {
    const loader = document.querySelector('.page-loader');
    if (!loader) return;
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('is-hidden'), 180);
    });
  }

  /* ---------------------------------------------------------------------
   * Timeline expand/collapse (Experience page)
   * ------------------------------------------------------------------- */
  function initTimeline() {
    document.querySelectorAll('.timeline-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.timeline-item');
        const willOpen = !item.classList.contains('is-open');
        item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(willOpen));
        btn.querySelector('.toggle-label').textContent = willOpen ? 'Collapse' : 'Expand';
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Command palette (⌘K / Ctrl+K)
   * A small, dependency-free fuzzy-ish filter over a static site index.
   * ------------------------------------------------------------------- */
  const SITE_INDEX = [
    { label: 'Home', hint: 'Overview & hero', href: 'index.html' },
    { label: 'About', hint: 'Bio, timeline, skills', href: 'about.html' },
    { label: 'Projects', hint: 'Applied ML & simulation work', href: 'projects.html' },
    { label: 'Experience', hint: 'Research roles & timeline', href: 'experience.html' },
    { label: 'Research', hint: 'Interests, methods, instrumentation', href: 'research.html' },
    { label: 'Publications', hint: 'Conference proceedings', href: 'publications.html' },
    { label: 'Blog', hint: 'Notes on ML, physics & code', href: 'blog.html' },
    { label: 'Contact', hint: 'Get in touch', href: 'contact.html' },
    { label: 'Download résumé', hint: 'PDF', href: 'assets/Baliber_Resume.pdf' },
    { label: 'Stroke Detection System', hint: 'Project — end-to-end ML pipeline', href: 'projects.html#stroke-detection' },
    { label: 'Satellite Launch & Orbit Simulator', hint: 'Project — orbital mechanics', href: 'projects.html#satellite-simulator' },
    { label: 'Balibot', hint: 'Project — Discord bot', href: 'projects.html#balibot' },
    { label: 'GitHub', hint: 'github.com/loubaliber', href: 'https://github.com/loubaliber' },
  ];

  function initCommandPalette() {
    const overlay = document.querySelector('.cmdk-overlay');
    if (!overlay) return;
    const input = overlay.querySelector('input');
    const list = overlay.querySelector('.cmdk-list');
    let selected = 0;
    let items = [];

    function render(query) {
      const q = query.trim().toLowerCase();
      items = SITE_INDEX.filter(
        (i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)
      );
      selected = 0;

      if (!items.length) {
        list.innerHTML = '<p class="cmdk-empty">No matches. Try “projects” or “contact”.</p>';
        return;
      }

      list.innerHTML = items
        .map(
          (i, idx) => `
        <button class="cmdk-item" role="option" data-href="${i.href}" aria-selected="${idx === selected}">
          <span class="cmdk-item-label">${i.label}</span>
          <span class="mono">${i.hint}</span>
        </button>`
        )
        .join('');
    }

    function updateSelection() {
      list.querySelectorAll('.cmdk-item').forEach((el, idx) => {
        el.setAttribute('aria-selected', String(idx === selected));
        if (idx === selected) el.scrollIntoView({ block: 'nearest' });
      });
    }

    function open() {
      overlay.classList.add('is-open');
      render('');
      input.value = '';
      setTimeout(() => input.focus(), 10);
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    function go(href) {
      if (!href) return;
      window.location.href = href;
    }

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        overlay.classList.contains('is-open') ? close() : open();
      }
      if (e.key === 'Escape') close();
    });

    document.querySelectorAll('[data-cmdk-open]').forEach((el) => el.addEventListener('click', open));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    input.addEventListener('input', () => render(input.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selected = Math.min(selected + 1, items.length - 1);
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selected = Math.max(selected - 1, 0);
        updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = items[selected];
        if (it) go(it.href);
      }
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('.cmdk-item');
      if (item) go(item.dataset.href);
    });
  }

  /* ---------------------------------------------------------------------
   * Utility: throttle
   * ------------------------------------------------------------------- */
  function throttle(fn, wait) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  /* ---------------------------------------------------------------------
   * Copy-to-clipboard (BibTeX buttons on Publications page)
   * ------------------------------------------------------------------- */
  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.getAttribute('data-copy');
        const original = btn.textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'Copied ✓';
        } catch (err) {
          btn.textContent = 'Press ⌘/Ctrl+C';
        }
        setTimeout(() => (btn.textContent = original), 1800);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavToggle();
    initReveal();
    initBackToTop();
    initLoader();
    initTimeline();
    initCommandPalette();
    initCopyButtons();
  });
})();
