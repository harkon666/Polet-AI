import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal hook using IntersectionObserver.
 *
 * Attaches to a container element and reveals children that have
 * `.qe-reveal`, `.qe-reveal-left`, `.qe-reveal-right`,
 * `.qe-reveal-scale`, or `.qe-reveal-stagger` classes when they
 * enter the viewport.
 *
 * Usage:
 *   const ref = useScrollReveal();
 *   <div ref={ref}>
 *     <section className="qe-reveal">...</section>
 *   </div>
 */
export function useScrollReveal(threshold = 0.15) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion — make everything visible immediately
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      container.querySelectorAll(
        '.qe-reveal, .qe-reveal-left, .qe-reveal-right, .qe-reveal-scale, .qe-reveal-stagger'
      ).forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      container.querySelectorAll(
        '.qe-reveal, .qe-reveal-left, .qe-reveal-right, .qe-reveal-scale, .qe-reveal-stagger'
      ).forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );

    const targets = container.querySelectorAll(
      '.qe-reveal, .qe-reveal-left, .qe-reveal-right, .qe-reveal-scale, .qe-reveal-stagger'
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold]);

  return containerRef;
}
