/**
 * What the paid tiers get that the free one does not.
 *
 * Everything here is inline CSS and dependency-free vanilla JS, because a published site is
 * one self-contained file under a 50-file cap with no bundler. A paid page whose effects
 * depend on a CDN script that might 404 is worse than a paid page with none.
 *
 * Pro gets tabbed sections. Premium gets the glow, the scroll reveals and the depth. Free
 * gets neither, which is the point of the ladder.
 */

export const TABS_CSS = `
[data-tabs] { margin-top: 1.5rem; }
[data-tabs] .tablist {
  display: flex; flex-wrap: wrap; gap: .5rem;
  border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  padding-bottom: .75rem; margin-bottom: 1.25rem;
}
[data-tabs] .tablist button {
  font: inherit; font-weight: 600; cursor: pointer;
  padding: .55rem 1rem; border-radius: var(--radius, .5rem);
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  background: transparent; color: inherit; opacity: .68;
  transition: opacity .18s ease, background-color .18s ease, border-color .18s ease;
}
[data-tabs] .tablist button:hover { opacity: .9; }
[data-tabs] .tablist button[aria-selected="true"] {
  opacity: 1;
  background: color-mix(in srgb, var(--accent, currentColor) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent, currentColor) 45%, transparent);
}
[data-tabs] .tablist button:focus-visible { outline: 2px solid var(--accent, currentColor); outline-offset: 2px; }
[data-tabs] [role="tabpanel"] { animation: pc-tab-in .28s ease both; }
@keyframes pc-tab-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Before the script runs, and forever if it never does, every panel is simply on the page. */
[data-tabs]:not([data-ready]) .tablist { display: none; }
[data-tabs][data-ready] [role="tabpanel"][hidden] { display: none; }

@media (prefers-reduced-motion: reduce) {
  [data-tabs] [role="tabpanel"] { animation: none; }
}
`;

export const TABS_JS = `
(function () {
  try {
    var groups = document.querySelectorAll('[data-tabs]');
    for (var g = 0; g < groups.length; g++) {
      (function (group) {
        var tabs = group.querySelectorAll('[role="tab"]');
        var panels = group.querySelectorAll('[role="tabpanel"]');
        if (!tabs.length || tabs.length !== panels.length) return;

        function select(index) {
          for (var i = 0; i < tabs.length; i++) {
            var on = i === index;
            tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
            tabs[i].tabIndex = on ? 0 : -1;
            if (on) { panels[i].removeAttribute('hidden'); } else { panels[i].setAttribute('hidden', ''); }
          }
        }

        for (var i = 0; i < tabs.length; i++) {
          (function (i) {
            tabs[i].addEventListener('click', function () { select(i); });
            tabs[i].addEventListener('keydown', function (e) {
              var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
              if (next < 0 || next >= tabs.length) return;
              e.preventDefault();
              tabs[next].focus();
              select(next);
            });
          })(i);
        }

        group.setAttribute('data-ready', '');
        select(0);
      })(groups[g]);
    }
  } catch (e) {}
})();
`;

export const PREMIUM_CSS = `
[data-style="motion"] { position: relative; }

/* The glow sits behind everything and never intercepts a click. */
[data-style="motion"]::before {
  content: ""; position: fixed; inset: -20vmax; z-index: -1; pointer-events: none;
  background:
    radial-gradient(42vmax 42vmax at 18% 12%, color-mix(in srgb, var(--accent, #6ea8ff) 26%, transparent), transparent 62%),
    radial-gradient(38vmax 38vmax at 82% 78%, color-mix(in srgb, var(--accent-2, var(--accent, #b06ab3)) 20%, transparent), transparent 64%);
  filter: blur(28px) saturate(115%);
  animation: pc-glow 24s ease-in-out infinite alternate;
}
@keyframes pc-glow {
  from { transform: translate3d(-2%, -1%, 0) scale(1); }
  to   { transform: translate3d(3%, 2%, 0) scale(1.08); }
}

[data-style="motion"] section[data-animate] {
  opacity: 0;
  transform: translate3d(0, 28px, 0);
  transition: opacity .7s cubic-bezier(.22,.61,.36,1), transform .7s cubic-bezier(.22,.61,.36,1);
  transition-delay: calc(var(--i, 0) * 40ms);
}
[data-style="motion"] section[data-animate].pc-in { opacity: 1; transform: none; }

/* Depth: the page is a stage with perspective, and layers sit at different distances. */
[data-style="motion"] main { perspective: 1200px; transform-style: preserve-3d; }
[data-style="motion"] section[data-animate].pc-in .img-slot {
  transform: translate3d(0, calc(var(--pc-depth, 0) * -18px), 0) rotateX(calc(var(--pc-depth, 0) * 1.6deg));
  transform-style: preserve-3d;
  will-change: transform;
  transition: box-shadow .4s ease;
  box-shadow: 0 30px 70px -30px rgba(0, 0, 0, .65);
}

/* Moving images: a slow drift so a still photograph is never quite still. */
[data-style="motion"] .img-slot { overflow: hidden; }
[data-style="motion"] .img-slot img {
  transform: scale(1.06);
  animation: pc-drift 22s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes pc-drift {
  from { transform: scale(1.06) translate3d(-1.2%, -0.8%, 0); }
  to   { transform: scale(1.14) translate3d(1.2%, 0.8%, 0); }
}

[data-style="motion"] .gallery figure {
  transform: translate3d(0, calc(var(--pc-depth, 0) * -10px), 0) rotateY(calc(var(--pc-depth, 0) * -1.1deg));
  transform-style: preserve-3d;
  transition: transform .5s cubic-bezier(.22,.61,.36,1);
}

@media (prefers-reduced-motion: reduce) {
  [data-style="motion"]::before { animation: none; }
  [data-style="motion"] section[data-animate] { opacity: 1 !important; transform: none !important; transition: none !important; }
  [data-style="motion"] .img-slot img { animation: none; transform: none !important; }
  [data-style="motion"] .gallery figure,
  [data-style="motion"] section[data-animate].pc-in .img-slot { transform: none !important; }
}
`;

export const PREMIUM_JS = `
(function () {
  try {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stage = document.querySelector('[data-style="motion"]');
    if (!stage) return;

    var sections = stage.querySelectorAll('section[data-animate]');

    if (reduced || !('IntersectionObserver' in window)) {
      for (var i = 0; i < sections.length; i++) sections[i].classList.add('pc-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('pc-in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    for (var j = 0; j < sections.length; j++) io.observe(sections[j]);

    var ticking = false;
    function depth() {
      ticking = false;
      var mid = window.innerHeight / 2;
      for (var k = 0; k < sections.length; k++) {
        var box = sections[k].getBoundingClientRect();
        if (box.bottom < -200 || box.top > window.innerHeight + 200) continue;
        var centre = box.top + box.height / 2;
        var d = Math.max(-1, Math.min(1, (centre - mid) / mid));
        sections[k].style.setProperty('--pc-depth', d.toFixed(3));
      }
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(depth);
    }, { passive: true });

    depth();
  } catch (e) {}
})();
`;
