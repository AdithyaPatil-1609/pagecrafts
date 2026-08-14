/** Inlined so the page shell can run in the editor without reading the disk. */

export const motionCss = `:root {
  --motion-distance: 12px;
  --motion-duration: 700ms;
  --motion-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-stagger: 60ms;
  --motion-scale-from: 1;
  --motion-blur-from: 0px;
}

[data-motion="none"] {
  --motion-distance: 0px;
  --motion-duration: 1ms;
  --motion-stagger: 0ms;
}

[data-motion="whisper"] {
  --motion-distance: 6px;
  --motion-duration: 500ms;
  --motion-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-stagger: 40ms;
}

[data-motion="calm"] {
  --motion-distance: 12px;
  --motion-duration: 700ms;
  --motion-stagger: 60ms;
}

[data-motion="editorial"] {
  --motion-distance: 20px;
  --motion-duration: 800ms;
  --motion-stagger: 120ms;
}

[data-motion="kinetic"] {
  --motion-distance: 28px;
  --motion-duration: 400ms;
  --motion-ease: cubic-bezier(0.34, 1.56, 0.64, 1);
  --motion-stagger: 80ms;
  --motion-scale-from: 0.96;
}

[data-motion="showcase"] {
  --motion-distance: 40px;
  --motion-duration: 900ms;
  --motion-stagger: 100ms;
  --motion-blur-from: 6px;
}

[data-animate] {
  opacity: 0;
  transform: translateY(var(--motion-distance)) scale(var(--motion-scale-from));
  filter: blur(var(--motion-blur-from));
  transition:
    opacity var(--motion-duration) var(--motion-ease),
    transform var(--motion-duration) var(--motion-ease),
    filter var(--motion-duration) var(--motion-ease);
  transition-delay: calc(var(--motion-stagger) * var(--i, 0));
  will-change: opacity, transform;
}

[data-animate].in-view {
  opacity: 1;
  transform: none;
  filter: none;
}

.no-js [data-animate] {
  opacity: 1;
  transform: none;
  filter: none;
}

@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }
}
`;

export const motionJs = `(function () {
  document.documentElement.classList.remove('no-js');

  const items = document.querySelectorAll('[data-animate]');
  if (!items.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }

  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
  );

  items.forEach(function (el) { io.observe(el); });
})();
`;
