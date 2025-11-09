// assets/js/main.js

// assets/js/main.js

(function () {
  /* ---------- Footer year ---------- */
  function setYear() {
    const y = document.getElementById('y');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Lazy-load Leaflet and init Areas map ---------- */
  function ensureLeaflet() {
    function loadMarkerCluster() {
      return new Promise((res) => {
        if (window.L && (window.L.MarkerClusterGroup || window.L.markerClusterGroup)) return res();
        // CSS for clusters
        if (!document.querySelector('link[data-lmc-core]')) {
          const l1 = document.createElement('link');
          l1.rel = 'stylesheet';
          l1.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
          l1.setAttribute('data-lmc-core', '');
          document.head.appendChild(l1);
        }
        if (!document.querySelector('link[data-lmc-default]')) {
          const l2 = document.createElement('link');
          l2.rel = 'stylesheet';
          l2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
          l2.setAttribute('data-lmc-default', '');
          document.head.appendChild(l2);
        }
        // JS
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        s.async = true;
        s.onload = () => res();
        s.onerror = () => res(); // resolve anyway; we'll gracefully fallback
        document.head.appendChild(s);
      });
    }

    return new Promise((resolve, reject) => {
      const resolveReady = () => {
        // try to load markercluster, then resolve
        loadMarkerCluster().finally(() => resolve(window.L));
      };

      if (window.L && typeof window.L.map === 'function') {
        resolveReady();
        return;
      }
      // Inject CSS if not present
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet', '');
        document.head.appendChild(link);
      }
      // Inject JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = resolveReady;
      script.onerror = () => reject(new Error('Leaflet failed to load'));
      document.head.appendChild(script);
    });
  }

  function initAreasMapLazy() {
    const mapEl = document.getElementById('serviceMap');
    if (!mapEl) return;

    const io = new IntersectionObserver(async (entries, obs) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        try {
          const L = await ensureLeaflet();
          // Create the map in the new container and set initial view
          const map = L.map(mapEl, { scrollWheelZoom: false, preferCanvas: true }).setView([33.4484, -112.0740], 9);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          const cities = [
            { name: 'Phoenix', coords: [33.4484, -112.0740] },
            { name: 'North Phoenix', coords: [33.6830, -112.1000] },
            { name: 'Cave Creek', coords: [33.8334, -111.9507] },
            { name: 'Glendale', coords: [33.5387, -112.1860] },
            { name: 'Peoria', coords: [33.5806, -112.2374] },
            { name: 'Scottsdale', coords: [33.4942, -111.9261] },
            { name: 'Tempe', coords: [33.4255, -111.9400] },
            { name: 'Mesa', coords: [33.4152, -111.8315] },
            { name: 'Chandler', coords: [33.3062, -111.8413] },
            { name: 'Gilbert', coords: [33.3528, -111.7890] },
            { name: 'Avondale / Goodyear', coords: [33.4356, -112.3496] },
            { name: 'Surprise', coords: [33.6292, -112.3679] },
            { name: 'Litchfield Park', coords: [33.4934, -112.3577] }
          ];
          const markers = [];
          cities.forEach(c => {
            const m = L.marker(c.coords).bindPopup(c.name);
            markers.push(m);
          });

          if (L.markerClusterGroup) {
            const cluster = L.markerClusterGroup({
              showCoverageOnHover: false,
              spiderfyOnEveryZoom: true,
              zoomToBoundsOnClick: true,
              maxClusterRadius: 50
            });
            markers.forEach(m => cluster.addLayer(m));
            map.addLayer(cluster);
          } else {
            markers.forEach(m => m.addTo(map));
          }

          // Fit bounds to all markers
          try {
            const bounds = L.latLngBounds(cities.map(c => c.coords));
            map.fitBounds(bounds, { padding: [20, 20] });
          } catch (_) {}

          // Invalidate once rendered
          setTimeout(() => map.invalidateSize(), 0);

          // Invalidate on resize
          window.addEventListener('resize', () => map.invalidateSize());

          // Invalidate when first visible (if hidden/lazy rendered)
          const visIO = new IntersectionObserver((visEntries) => {
            if (visEntries.some(e => e.isIntersecting)) {
              map.invalidateSize();
              visIO.disconnect();
            }
          }, { threshold: 0.2 });
          visIO.observe(mapEl);

          // Optional spacing below map-card
          const card = document.querySelector('.map-card');
          if (card) card.style.marginBottom = '20px';
        } catch (_) {
          // noop
        }
      });
    }, { threshold: 0.2 });
    io.observe(mapEl);
  }

  /* ---------- ZIP checker ---------- */
  function hookZipChecker() {
    const form = document.getElementById('zipForm');
    const input = document.getElementById('zipInput');
    const msg = document.getElementById('zipMsg');
    if (!form || !input || !msg) return;

    const prefixes = ['850', '852', '853'];

    function setMsg(text, cls) {
      msg.textContent = text;
      msg.className = 'zip-msg ' + cls;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (input.value || '').trim();
      if (!/^\d{5}$/.test(val)) {
        setMsg('Please enter a valid 5-digit ZIP code.', 'error');
        input.focus();
        return;
      }
      const prefix = val.slice(0, 3);
      if (prefixes.includes(prefix)) {
        setMsg('Yes, we serve your area.', 'ok');
      } else {
        setMsg('We might still cover your ZIP — contact us to confirm.', 'maybe');
      }
    });

    input.addEventListener('input', () => {
      if (msg.textContent) setMsg('', '');
    });
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
    initAreasMapLazy();
    hookZipChecker();
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
