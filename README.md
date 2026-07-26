# Lourenz Baliber — Portfolio

A dependency-free HTML/CSS/vanilla JS portfolio. No build step, no framework —
open `index.html` in a browser or serve the folder as static files.

## Status

**Phase 1 (this build):** design system + all core pages.

- `index.html`, `about.html`, `projects.html`, `experience.html`,
  `research.html`, `publications.html`, `contact.html`
- Shared design system in `css/` (tokens, base, layout, components, animations)
  plus one stylesheet per page in `css/pages/`
- Dark/light theme toggle, mobile nav, scroll reveal, animated stats,
  command palette (⌘K), expandable experience timeline, contact form
  validation, BibTeX copy buttons
- Signature hero visual: a canvas-based Brownian-motion particle simulation
  (`js/particles.js`) standing in for the brief's Spline background — see the
  comment at the top of that file for why
- `blog.html` is a placeholder page; `manifest.webmanifest`, `robots.txt`,
  and `sitemap.xml` are minimal stubs

**Phase 2 (next):** the markdown blog CMS (listing, individual post pages,
search, tags, reading time, table of contents, reading progress bar,
prev/next, syntax highlighting, MathJax, Mermaid, RSS) and full PWA support
(service worker, offline page, install prompt).

## Before you deploy

A few placeholders need real values:

- `assets/Baliber_Resume.pdf` — already your real résumé PDF; replace it here
  whenever you update your résumé, filename can stay the same
- `contact.html` — LinkedIn, Google Scholar, ORCID, and ResearchGate cards are
  marked "profile link to be added"; drop in your real URLs
- `js/contact-form.js` — `FORM_ENDPOINT` is empty (demo mode: the form
  validates but doesn't send anywhere). Point it at a form backend
  (e.g. Formspree, Getform) to make the form live
- Swap `https://lourenzbaliber.dev` in canonical/OG tags, `sitemap.xml`, and
  `robots.txt` for your real domain once you have one
- `images/og-cover.png` referenced in `index.html`'s Open Graph tag doesn't
  exist yet — add a 1200×630 image or remove the tag

## Deploying

### GitHub Pages
1. Push this folder to a repo (root, or a `/docs` folder).
2. Repo → Settings → Pages → set the source branch/folder.
3. Your site is live at `https://<username>.github.io/<repo>/`.

### Netlify
1. Drag-and-drop this folder onto [app.netlify.com/drop](https://app.netlify.com/drop),
   or connect the repo and set the publish directory to the project root.
2. No build command needed — it's static.

### Vercel
1. `vercel` from inside this folder (or import the repo in the dashboard).
2. Framework preset: "Other" / static — no build command needed.

## Structure

```text
portfolio/
├── index.html / about.html / projects.html / experience.html
├── research.html / publications.html / blog.html / contact.html
├── 404.html
├── css/
│   ├── variables.css   design tokens
│   ├── base.css        reset + typography
│   ├── layout.css      nav, footer, back-to-top, loader
│   ├── components.css  buttons, cards, timeline, forms, command palette
│   ├── animations.css  scroll reveal, hover, blink cursor
│   └── pages/           one file per page
├── js/
│   ├── main.js             theme, nav, reveal, back-to-top, ⌘K, timeline
│   ├── particles.js        hero Brownian-motion canvas
│   ├── typing.js            hero role typewriter
│   ├── stats.js              animated counters
│   ├── projects-filter.js  project category filter
│   └── contact-form.js     contact form validation
├── images/    covers.svg (project cover sprite), favicon.svg
├── assets/    Baliber_Resume.pdf
├── manifest.webmanifest, robots.txt, sitemap.xml
```
