#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const BLOG_OUT_DIR = path.join(ROOT, 'blog');
const BLOG_INDEX_FILE = path.join(ROOT, 'blog.html');
const RSS_FILE = path.join(ROOT, 'feed.xml');
const SITE_URL = 'https://lourenzbaliber.dev'; // update once the real domain is live
const SITE_TITLE = 'Lourenz Baliber — Blog';
const SITE_DESC = 'Notes on machine learning, biophysics, and scientific computing.';
const WORDS_PER_MINUTE = 200;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateRfc822(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d)) return new Date().toUTCString();
  return d.toUTCString();
}

function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, content: raw };

  const [, fmBlock, body] = match;
  const data = {};

  fmBlock.split(/\r?\n/).forEach((line) => {
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) return;
    let [, key, value] = kv;
    value = value.trim();
    // strip matching surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });

  return { data, content: body };
}

// ---------------------------------------------------------------------
// Inline markdown formatting: code spans, images, links, bold, italic
// ---------------------------------------------------------------------
function formatInline(text) {
  // 1. Protect inline code spans so nothing inside them gets reformatted
  const codeStash = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    codeStash.push(escapeHtml(code));
    return `\u0000CODE${codeStash.length - 1}\u0000`;
  });

  // 2. Images ![alt](src)
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${t} loading="lazy" />`;
  });

  // 3. Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    const external = /^https?:\/\//.test(href);
    const rel = external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escapeHtml(href)}"${t}${rel}>${label}</a>`;
  });

  // 4. Bold **text** / __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 5. Italic *text* / _text_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 6. Restore code spans
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${codeStash[Number(i)]}</code>`);

  return text;
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  const usedIds = new Set();
  let wordCount = 0;

  let i = 0;
  let inList = null; // 'ul' | 'ol' | null
  let inBlockquote = false;

  function closeList() {
    if (inList) {
      out.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  }

  function uniqueId(base) {
    let id = base || 'section';
    let n = 2;
    while (usedIds.has(id)) {
      id = `${base}-${n++}`;
    }
    usedIds.add(id);
    return id;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      closeList();
      closeBlockquote();
      const lang = fence[1] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const codeText = codeLines.join('\n');
      if (lang === 'mermaid') {
        out.push(`<div class="mermaid">${escapeHtml(codeText)}</div>`);
      } else {
        const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
        out.push(`<pre><code${langClass}>${escapeHtml(codeText)}</code></pre>`);
      }
      wordCount += codeText.split(/\s+/).filter(Boolean).length;
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      closeList();
      closeBlockquote();
      i++;
      continue;
    }

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      const rawText = heading[2].trim();
      const html = formatInline(rawText);
      const id = uniqueId(slugify(rawText));
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      if (level === 2 || level === 3) {
        toc.push({ level, id, text: rawText });
      }
      wordCount += rawText.split(/\s+/).filter(Boolean).length;
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      if (!inBlockquote) {
        closeList();
        out.push('<blockquote>');
        inBlockquote = true;
      }
      const quoted = line.replace(/^>\s?/, '');
      out.push(`<p>${formatInline(quoted)}</p>`);
      wordCount += quoted.split(/\s+/).filter(Boolean).length;
      i++;
      continue;
    }

    // Unordered list
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      closeBlockquote();
      if (inList !== 'ul') {
        closeList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${formatInline(ul[1])}</li>`);
      wordCount += ul[1].split(/\s+/).filter(Boolean).length;
      i++;
      continue;
    }

    // Ordered list
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      closeBlockquote();
      if (inList !== 'ol') {
        closeList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${formatInline(ol[1])}</li>`);
      wordCount += ol[1].split(/\s+/).filter(Boolean).length;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList();
      closeBlockquote();
      out.push('<hr />');
      i++;
      continue;
    }

    // Paragraph — collect until blank line / block boundary
    closeList();
    closeBlockquote();
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    const paraText = paraLines.join(' ');
    out.push(`<p>${formatInline(paraText)}</p>`);
    wordCount += paraText.split(/\s+/).filter(Boolean).length;
  }

  closeList();
  closeBlockquote();

  return { html: out.join('\n'), toc, wordCount };
}

// ---------------------------------------------------------------------
// Load + parse all posts
// ---------------------------------------------------------------------
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`No posts/ directory found at ${POSTS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  const posts = files.map((file) => {
    const slug = slugify(file.replace(/\.md$/, ''));
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = parseFrontmatter(raw);

    const required = ['title', 'date', 'tag', 'excerpt'];
    required.forEach((key) => {
      if (!data[key]) {
        console.warn(`⚠ posts/${file} is missing "${key}" in frontmatter`);
      }
    });

    const isExternal = String(data.external).toLowerCase() === 'true';
    const tags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : data.tag
      ? [data.tag]
      : [];

    let html = '';
    let toc = [];
    let wordCount = 0;
    if (!isExternal) {
      const parsed = markdownToHtml(content);
      html = parsed.html;
      toc = parsed.toc;
      wordCount = parsed.wordCount;
    }

    const readingMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

    return {
      slug,
      file,
      title: data.title || slug,
      date: data.date || '1970-01-01',
      tag: data.tag || 'General',
      tags,
      type: data.type || 'Note',
      excerpt: data.excerpt || '',
      external: isExternal,
      externalUrl: data.external_url || '',
      html,
      toc,
      readingMinutes,
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

// ---------------------------------------------------------------------
// Shared page chrome (nav + footer), matching the rest of the site
// ---------------------------------------------------------------------
function siteNav(activeHref, depth) {
  const p = depth === 'blog' ? '../' : '';
  const link = (href, label) => {
    const current = href === activeHref ? ' aria-current="page"' : '';
    return `<a href="${p}${href}"${current}>${label}</a>`;
  };
  return `
  <header class="site-nav">
    <div class="container">
      <a href="${p}index.html" class="nav-brand"><span class="dot"></span>L. Baliber</a>
      <button class="nav-toggle icon-btn" aria-label="Toggle navigation" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <nav class="nav-links" aria-label="Primary">
        ${link('index.html', 'Home')}
        ${link('about.html', 'About')}
        ${link('projects.html', 'Projects')}
        ${link('experience.html', 'Experience')}
        ${link('research.html', 'Research')}
        ${link('publications.html', 'Publications')}
        ${link('blog.html', 'Blog')}
        ${link('contact.html', 'Contact')}
      </nav>
      <div class="nav-actions">
        <button class="search-trigger" data-cmdk-open aria-label="Open search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search</span><kbd>⌘K</kbd>
        </button>
        <button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode">
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        </button>
        <a class="nav-cta" href="${p}assets/Baliber_Resume.pdf" download>Résumé</a>
      </div>
    </div>
  </header>`;
}

function siteFooter(depth) {
  const p = depth === 'blog' ? '../' : '';
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="${p}index.html" class="nav-brand"><span class="dot"></span>L. Baliber</a>
          <p>Data scientist and physics researcher based in Cebu City, Philippines. Currently an exchange researcher at Tokyo University of Marine Science and Technology.</p>
        </div>
        <div class="footer-col">
          <h4>Site</h4>
          <ul><li><a href="${p}about.html">About</a></li><li><a href="${p}projects.html">Projects</a></li><li><a href="${p}research.html">Research</a></li><li><a href="${p}publications.html">Publications</a></li></ul>
        </div>
        <div class="footer-col">
          <h4>More</h4>
          <ul><li><a href="${p}experience.html">Experience</a></li><li><a href="${p}blog.html">Blog</a></li><li><a href="${p}contact.html">Contact</a></li><li><a href="${p}assets/Baliber_Resume.pdf" download>Résumé (PDF)</a></li></ul>
        </div>
        <div class="footer-col">
          <h4>Elsewhere</h4>
          <ul><li><a href="https://github.com/fitaness12345" target="_blank" rel="noopener">GitHub</a></li><li><a href="mailto:lbaliber0828@gmail.com">Email</a></li><li><a href="${p}contact.html">LinkedIn / Scholar / ORCID</a></li></ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Lourenz O. Baliber. Built with HTML, CSS &amp; vanilla JS.</span>
        <span>Cebu City, Philippines</span>
      </div>
    </div>
  </footer>

  <button class="back-to-top" aria-label="Back to top">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
  </button>

  <div class="cmdk-overlay" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="cmdk-panel">
      <div class="cmdk-input-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search pages, projects…" aria-label="Search" />
        <kbd>Esc</kbd>
      </div>
      <div class="cmdk-list" role="listbox"></div>
    </div>
  </div>`;
}

function renderPostPage(post, prevPost, nextPost) {
  const tocHtml = post.toc.length
    ? `<nav class="post-toc" aria-label="Table of contents">
        <p class="eyebrow">On this page</p>
        <ul>
          ${post.toc
            .map((t) => `<li class="toc-level-${t.level}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`)
            .join('\n          ')}
        </ul>
      </nav>`
    : '';

  const tagsHtml = post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  const prevNextHtml = `
    <nav class="post-pager" aria-label="Post navigation">
      ${
        prevPost
          ? `<a class="post-pager-link" href="${prevPost.slug}.html"><span class="mono">← Previous</span><span>${escapeHtml(prevPost.title)}</span></a>`
          : '<span></span>'
      }
      ${
        nextPost
          ? `<a class="post-pager-link post-pager-next" href="${nextPost.slug}.html"><span class="mono">Next →</span><span>${escapeHtml(nextPost.title)}</span></a>`
          : '<span></span>'
      }
    </nav>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.title)} — Lourenz Baliber</title>
  <meta name="description" content="${escapeHtml(post.excerpt)}" />
  <link rel="canonical" href="${SITE_URL}/blog/${post.slug}.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(post.title)}" />
  <meta property="og:description" content="${escapeHtml(post.excerpt)}" />
  <meta property="og:url" content="${SITE_URL}/blog/${post.slug}.html" />
  <link rel="icon" href="../images/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="../manifest.webmanifest" />
  <meta name="theme-color" content="#0a0e13" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="../css/variables.css" />
  <link rel="stylesheet" href="../css/base.css" />
  <link rel="stylesheet" href="../css/layout.css" />
  <link rel="stylesheet" href="../css/components.css" />
  <link rel="stylesheet" href="../css/animations.css" />
  <link rel="stylesheet" href="../css/pages/inner.css" />
  <link rel="stylesheet" href="../css/pages/post.css" />

  <!-- Syntax highlighting -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": ${JSON.stringify(post.title)},
    "datePublished": ${JSON.stringify(post.date)},
    "author": { "@type": "Person", "name": "Lourenz O. Baliber" },
    "description": ${JSON.stringify(post.excerpt)}
  }
  </script>
</head>
<body>
  <div class="reading-progress" id="reading-progress"></div>
  <div class="page-loader" aria-hidden="true"><span class="loader-mark"></span></div>
  <a href="#main" class="skip-link">Skip to content</a>

  ${siteNav('blog.html', 'blog')}

  <main id="main">
    <article class="post-article">
      <div class="container post-header">
        <p class="eyebrow" data-reveal><a href="../blog.html">Blog</a> / ${escapeHtml(post.tag)}</p>
        <h1 data-reveal>${escapeHtml(post.title)}</h1>
        <div class="post-meta mono" data-reveal>
          <span>${formatDateLong(post.date)}</span>
          <span aria-hidden="true">·</span>
          <span>${post.readingMinutes} min read</span>
          <span aria-hidden="true">·</span>
          <span>${escapeHtml(post.type)}</span>
        </div>
        <div class="tag-row" data-reveal>${tagsHtml}</div>
      </div>

      <div class="container post-layout">
        ${tocHtml}
        <div class="post-body" data-reveal>
          ${post.html}
        </div>
      </div>

      <div class="container">
        ${prevNextHtml}
      </div>
    </article>
  </main>

  ${siteFooter('blog')}

  <script src="../js/main.js" defer></script>
  <script src="../js/blog-post.js" defer></script>

  <!-- Syntax highlighting -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" defer></script>
  <script>window.addEventListener('load', function () { if (window.hljs) hljs.highlightAll(); });</script>

  <!-- Mermaid diagrams -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" defer></script>
  <script>
    window.addEventListener('load', function () {
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'strict' });
      }
    });
  </script>

  <!-- MathJax -->
  <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']] },
      svg: { fontCache: 'global' }
    };
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------
// Blog index template
// ---------------------------------------------------------------------
function renderBlogIndex(posts) {
  const categories = Array.from(new Set(posts.map((p) => p.tag)));

  const cardsHtml = posts
    .map((post) => {
      const href = post.external ? post.externalUrl : `blog/${post.slug}.html`;
      const externalAttrs = post.external ? ' target="_blank" rel="noopener"' : '';
      const externalBadge = post.external
        ? '<span class="tag post-card-external">External ↗</span>'
        : '';
      const searchBlob = `${post.title} ${post.excerpt} ${post.tag}`.toLowerCase();

      return `
        <a class="card post-card" href="${escapeHtml(href)}"${externalAttrs} data-tag="${escapeHtml(post.tag)}" data-search="${escapeHtml(searchBlob)}">
          <div class="post-card-meta mono">
            <span>${formatDateLong(post.date)}</span>
            ${post.external ? '' : `<span aria-hidden="true">·</span><span>${post.readingMinutes} min read</span>`}
          </div>
          <h2>${escapeHtml(post.title)}</h2>
          <p class="text-secondary">${escapeHtml(post.excerpt)}</p>
          <div class="tag-row"><span class="tag tag-accent">${escapeHtml(post.tag)}</span>${externalBadge}</div>
        </a>`;
    })
    .join('\n');

  const filterButtons = categories
    .map((c) => `<button class="filter-btn" data-filter="${escapeHtml(c)}" aria-pressed="false">${escapeHtml(c)}</button>`)
    .join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog — Lourenz Baliber</title>
  <meta name="description" content="${escapeHtml(SITE_DESC)}" />
  <link rel="canonical" href="${SITE_URL}/blog.html" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_TITLE)}" href="feed.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Blog — Lourenz Baliber" />
  <meta property="og:url" content="${SITE_URL}/blog.html" />
  <link rel="icon" href="images/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#0a0e13" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="css/variables.css" />
  <link rel="stylesheet" href="css/base.css" />
  <link rel="stylesheet" href="css/layout.css" />
  <link rel="stylesheet" href="css/components.css" />
  <link rel="stylesheet" href="css/animations.css" />
  <link rel="stylesheet" href="css/pages/inner.css" />
  <link rel="stylesheet" href="css/pages/blog.css" />

  <!-- This file is generated by scripts/build-blog.js — edit posts/*.md, not this file. -->
</head>
<body>
  <div class="page-loader" aria-hidden="true"><span class="loader-mark"></span></div>
  <a href="#main" class="skip-link">Skip to content</a>

  ${siteNav('blog.html', 'root')}

  <main id="main">
    <section class="page-header">
      <div class="container">
        <p class="eyebrow" data-reveal>Blog</p>
        <h1 data-reveal>Notes on ML, biophysics, and scientific computing.</h1>
        <p class="page-lede" data-reveal>Written in Markdown, built with <code class="mono">scripts/build-blog.js</code>. <a href="feed.xml">RSS feed</a>.</p>

        <div class="blog-controls" data-reveal>
          <div class="search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="blog-search" placeholder="Search posts…" aria-label="Search posts" />
          </div>
          <div class="filter-row" role="group" aria-label="Filter posts by category">
            <button class="filter-btn" data-filter="all" aria-pressed="true">All</button>
            ${filterButtons}
          </div>
        </div>
      </div>
    </section>

    <section class="post-grid-section">
      <div class="container">
        <div class="post-grid" id="post-grid">
          ${cardsHtml || '<p class="text-secondary">No posts yet — add a .md file to <code class="mono">posts/</code> and run the build script.</p>'}
        </div>
        <p class="post-grid-empty text-secondary" id="post-grid-empty" hidden>No posts match that search.</p>
      </div>
    </section>
  </main>

  ${siteFooter('root')}

  <script src="js/main.js" defer></script>
  <script src="js/blog-index.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------
// RSS feed
// ---------------------------------------------------------------------
function renderRss(posts) {
  const items = posts
    .filter((p) => !p.external)
    .map(
      (p) => `
    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}.html</link>
      <guid>${SITE_URL}/blog/${p.slug}.html</guid>
      <pubDate>${formatDateRfc822(p.date)}</pubDate>
      <description>${escapeHtml(p.excerpt)}</description>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE_TITLE)}</title>
    <link>${SITE_URL}/blog.html</link>
    <description>${escapeHtml(SITE_DESC)}</description>
    <language>en-us</language>
    ${items}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------
function build() {
  const posts = loadPosts();

  if (!posts.length) {
    console.log('No posts found in posts/. Nothing to build.');
    return;
  }

  if (!fs.existsSync(BLOG_OUT_DIR)) fs.mkdirSync(BLOG_OUT_DIR, { recursive: true });

  const onSitePosts = posts.filter((p) => !p.external);

  onSitePosts.forEach((post, idx) => {
    // posts are sorted newest-first; "previous" = older, "next" = newer
    const prevPost = onSitePosts[idx + 1] || null;
    const nextPost = onSitePosts[idx - 1] || null;
    const html = renderPostPage(post, prevPost, nextPost);
    fs.writeFileSync(path.join(BLOG_OUT_DIR, `${post.slug}.html`), html, 'utf8');
    console.log(`✓ blog/${post.slug}.html`);
  });

  fs.writeFileSync(BLOG_INDEX_FILE, renderBlogIndex(posts), 'utf8');
  console.log(`✓ blog.html (${posts.length} post${posts.length === 1 ? '' : 's'})`);

  fs.writeFileSync(RSS_FILE, renderRss(posts), 'utf8');
  console.log('✓ feed.xml');

  console.log('\nDone. Commit blog.html, blog/*.html, and feed.xml.');
}

build();