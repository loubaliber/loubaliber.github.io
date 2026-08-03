---
title: Welcome to the blog
date: 2026-03-15
tag: Meta
type: Note
excerpt: How this site handles posts — write in Markdown, run one command, and publish.
---

This is the first post hosted directly on this site. From here on, new writing lands in the `posts/` folder as plain Markdown files.

## How to add a post

1. Create a new `.md` file in `posts/` (use a short slug for the filename, e.g. `particle-tracking-notes.md`).
2. Add frontmatter at the top:

```yaml
---
title: Your post title
date: 2026-03-15
tag: ML
type: Note
excerpt: One-line preview shown on the blog index.
---
```

3. Write the body in Markdown below the frontmatter.
4. Run the build:

```bash
node scripts/build-blog.js
```

5. Commit the generated files (`blog.html`, `blog/*.html`, `feed.xml`) and push.

## What gets generated

- A card on `blog.html` for each post
- A full HTML page at `blog/your-slug.html` for on-site posts
- An RSS feed at `feed.xml`

External posts (like older pieces on The Diarist Projects) can set `external: true` and `external_url` in frontmatter — they'll show up on the index but link out instead of generating a page.

## What's next

Technical write-ups on particle tracking, hydrogel kinetics, and applied ML notebooks are in the queue. If there's a topic you'd like covered first, [get in touch](/contact.html).
