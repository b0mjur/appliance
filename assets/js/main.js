// assets/js/main.js

(function () {
  /* ---------- Footer year ---------- */
  function setYear() {
    const y = document.getElementById('y');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Brands slider (guarded if Swiper not loaded) ---------- */
  function initBrandsSlider() {
    const el = document.querySelector('.brands-swiper');
    if (!el || typeof Swiper === 'undefined') return;

    new Swiper('.brands-swiper', {
      loop: true,
      autoplay: { delay: 0, disableOnInteraction: false },
      speed: 3000,
      slidesPerView: 4,
      spaceBetween: 32,
      breakpoints: {
        0:   { slidesPerView: 2, spaceBetween: 18 },
        640: { slidesPerView: 3, spaceBetween: 24 },
        900: { slidesPerView: 4, spaceBetween: 32 },
        1200:{ slidesPerView: 5, spaceBetween: 40 }
      }
    });
  }

  /* ---------- Formspree helper (AJAX submit + inline status) ---------- */
  function hookForm(formId, msgId) {
    const form = document.getElementById(formId);
    const msg  = document.getElementById(msgId);
    if (!form || !msg) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Basic UX feedback
      msg.textContent = 'Sending...';

      // Build FormData from the form
      const data = new FormData(form);
      const action = form.getAttribute('action');

      try {
        const res = await fetch(action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          msg.textContent = '✅ Thanks! We received your request and will contact you shortly.';
          form.reset();
        } else {
          // Try to read error message if available
          let fallback = '⚠️ Sorry, something went wrong. Please call or text us.';
          try {
            const json = await res.json();
            if (json && json.errors && json.errors.length) {
              fallback = '⚠️ ' + json.errors.map(e => e.message).join(', ');
            }
          } catch (_) {}
          msg.textContent = fallback;
        }
      } catch (_) {
        msg.textContent = '⚠️ Network error. Please try again or call/text us.';
      }
    });
  }

  

  /* ---------- Init on DOM ready ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    setYear();
  initBrandsSlider();
    hookForm('bookForm',  'bookMsg');   // Book a technician (hero)
    hookForm('quoteForm', 'quoteMsg');  // Request a quote (contact)

    // Smooth-scroll internal nav links so sections land in the vertical center
    // This intercepts clicks on anchors that link to IDs on the page and
    // uses scrollIntoView with block: 'center' for consistent centering.
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      // Only handle same-page links (no href="#" empty anchors)
      const href = a.getAttribute('href');
      if (!href || href === '#' || href === '#!') return;

      a.addEventListener('click', (e) => {
        // Let external links (with scheme) through
        if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('sms:')) return;

        const id = href.slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Update the URL hash without jumping
          history.replaceState(null, '', '#' + id);
        }
      });
    });

    // ---- HERO: conditional background video + reveal animations ----
    try {
      const hero = document.querySelector('.hero');
      const video = document.querySelector('.hero-video');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const saveData = connection && (connection.saveData || connection.effectiveType === '2g');
      const isMobile = matchMedia('(max-width: 640px)').matches;

      if (video && !prefersReducedMotion && !saveData && !isMobile) {
        // Load the video source only when conditions are good
        const source = document.createElement('source');
        source.src = 'assets/video/hero.mp4';
        source.type = 'video/mp4';
        video.appendChild(source);
        // Start playback; ignore any promise rejection
        video.play().catch(() => {});
      } else if (video) {
        // Keep poster image only
        video.parentElement && video.parentElement.removeChild(video);
      }

  // Reveal animations (first viewport enter)
  const reveals = document.querySelectorAll('.hero .reveal');
      if (reveals.length && !prefersReducedMotion) {
        const io = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.4 });
        reveals.forEach(el => io.observe(el));
      } else {
        // If reduced motion, show immediately
        reveals.forEach(el => el.classList.add('is-visible'));
      }
    } catch (_) {}
  });
})();
