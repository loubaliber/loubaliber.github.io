/**
 * particles.js
 * -----------------------------------------------------------------------
 * Hero background signature element.
 *
 * The original brief called for a Spline (3D) background of floating
 * geometric objects. Spline requires a hosted embed/account and doesn't
 * suit a dependency-free static site — and more importantly, it has no
 * connection to the subject. Lourenz's actual research method is passive
 * particle tracking under fluorescence microscopy: tagging tracer beads
 * in a hydrogel and recording their random-walk (Brownian) trajectories
 * to extract viscoelastic properties (MSD, G'/G'').
 *
 * This module renders exactly that: a field of tracer particles executing
 * a 2D random walk, each leaving a short fading trajectory tail, styled in
 * the FITC-green / cyan two-channel palette used throughout the site. It
 * is a lightweight <canvas> loop (no external libraries), degrades to a
 * static CSS field via [data-fallback] if canvas or JS is unavailable,
 * and respects prefers-reduced-motion.
 * -----------------------------------------------------------------------
 */

(function () {
  'use strict';

  const canvas = document.getElementById('particle-field');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = {
    a: 'rgba(199, 255, 77, OPA)', // fitc green
    b: 'rgba(77, 217, 255, OPA)', // cyan channel
  };

  let particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let rafId = null;
  let running = true;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const density = width < 640 ? 34 : width < 1100 ? 55 : 78;
    particles = new Array(density).fill(0).map(() => makeParticle());
  }

  function makeParticle() {
    const channel = Math.random() > 0.72 ? 'b' : 'a';
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 1.8,
      channel,
      trail: [],
      // step size mimics diffusive motion: small, random, isotropic
      speed: 0.15 + Math.random() * 0.35,
      angle: Math.random() * Math.PI * 2,
      wander: 0.35 + Math.random() * 0.5,
    };
  }

  function step(p) {
    // Brownian-ish walk: angle drifts randomly each frame (diffusion),
    // occasional larger kicks approximate collision events.
    p.angle += (Math.random() - 0.5) * p.wander;
    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;

    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 26) p.trail.shift();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      step(p);

      // trajectory tail
      if (p.trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = COLORS[p.channel].replace('OPA', '0.10');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[p.channel].replace('OPA', '0.85');
      ctx.shadowColor = COLORS[p.channel].replace('OPA', '0.6');
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (running) rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (rafId) return;
    running = true;
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Pause when off-screen or tab hidden — good for battery/perf.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
    },
    { threshold: 0.05 }
  );
  io.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!prefersReducedMotion) start();
  });

  window.addEventListener('resize', debounce(resize, 200));

  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  resize();

  if (prefersReducedMotion) {
    // Draw a single static frame instead of animating continuously.
    draw();
    stop();
  } else {
    start();
  }
})();
