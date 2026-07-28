# Lourenz Baliber — Portfolio

A dependency-free HTML/CSS/vanilla JS portfolio. No build step, no framework.

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
