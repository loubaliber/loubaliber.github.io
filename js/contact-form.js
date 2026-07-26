/**
 * contact-form.js
 * Client-side validation + a clearly-labeled "not wired to a backend yet"
 * status message. No form-processing service is configured in this build,
 * so submitting does not send an email — the status area says so and
 * offers the mailto fallback. Swap FORM_ENDPOINT to a real endpoint
 * (Formspree, Getform, a serverless function, etc.) to go live.
 */
(function () {
  'use strict';

  const FORM_ENDPOINT = ''; // e.g. 'https://formspree.io/f/xxxxxx' — empty = demo mode

  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('form-status');

  function setError(field, message) {
    const hint = form.querySelector(`[data-hint-for="${field}"]`);
    if (hint) hint.textContent = message || '';
  }

  function validate(data) {
    let valid = true;
    if (!data.name.trim()) {
      setError('name', 'Please enter your name.');
      valid = false;
    } else setError('name', '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('email', 'Enter a valid email address.');
      valid = false;
    } else setError('email', '');

    if (!data.message.trim() || data.message.trim().length < 10) {
      setError('message', 'Message should be at least 10 characters.');
      valid = false;
    } else setError('message', '');

    return valid;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!validate(data)) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';

    if (!FORM_ENDPOINT) {
      // Demo mode: no backend configured.
      setTimeout(() => {
        status.textContent =
          'This form isn\u2019t connected to a backend yet — nothing was sent. Please email lbaliber0828@gmail.com directly for now.';
        status.classList.add('is-visible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }, 500);
      return;
    }

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (res.ok) {
        status.textContent = 'Message sent — thanks! I\u2019ll get back to you soon.';
        status.classList.add('is-visible', 'is-success');
        form.reset();
      } else {
        throw new Error('Request failed');
      }
    } catch (err) {
      status.textContent = 'Something went wrong sending that. Please email lbaliber0828@gmail.com directly.';
      status.classList.add('is-visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
