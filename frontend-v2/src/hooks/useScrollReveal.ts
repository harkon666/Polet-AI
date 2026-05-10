import { useEffect, useRef } from 'react'

/**
 * Scroll-reveal hook for v2. Targets `.pl-reveal` descendants and adds
 * `.pl-reveal--in` once they enter the viewport.
 *
 * Behaviour:
 * - Respects `prefers-reduced-motion: reduce`, reveals everything immediately,
 *   skipping the IntersectionObserver pipeline.
 * - Server-safe, no `window` access during SSR; the hook only attaches in
 *   `useEffect` which is client-only.
 * - One-shot, once revealed, observers unsubscribe so no re-trigger.
 *
 * Usage:
 *   const containerRef = useScrollReveal()
 *   <section ref={containerRef}>
 *     <h1 className="pl-reveal">Hello</h1>
 *     <p className="pl-reveal" style={{ transitionDelay: '120ms' }}>World</p>
 *   </section>
 */
export function useScrollReveal(threshold = 0.15) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      container
        .querySelectorAll('.pl-reveal')
        .forEach((el) => el.classList.add('pl-reveal--in'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('pl-reveal--in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    )

    container.querySelectorAll('.pl-reveal').forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [threshold])

  return containerRef
}
