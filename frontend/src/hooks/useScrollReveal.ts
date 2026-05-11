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
 * - One-shot per element, once revealed an item unsubscribes so no re-trigger.
 * - Picks up DYNAMIC children added after the initial mount via a
 *   MutationObserver. Critical for /app where SetupLedger swaps from
 *   OnboardingWizard → LedgerTable on wallet connect, and ReceiptLog
 *   appends new entries as actions complete. Without this, rows added
 *   after the initial query stay opacity:0 forever.
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
      // Reveal everything immediately, including any future children.
      const revealAll = () =>
        container
          .querySelectorAll('.pl-reveal:not(.pl-reveal--in)')
          .forEach((el) => el.classList.add('pl-reveal--in'))
      revealAll()
      const mutation = new MutationObserver(revealAll)
      mutation.observe(container, { childList: true, subtree: true })
      return () => mutation.disconnect()
    }

    const intersection = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('pl-reveal--in')
            intersection.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin: '0px 0px -60px 0px' },
    )

    const observeReveals = (root: Element) => {
      if (
        root.classList?.contains('pl-reveal') &&
        !root.classList.contains('pl-reveal--in')
      ) {
        intersection.observe(root)
      }
      root
        .querySelectorAll?.('.pl-reveal:not(.pl-reveal--in)')
        .forEach((el) => intersection.observe(el))
    }

    observeReveals(container)

    // Watch for `.pl-reveal` children added AFTER the initial query
    // (e.g. SetupLedger swapping wizard → table on wallet connect,
    // ReceiptLog appending a new receipt).
    const mutation = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            observeReveals(node)
          }
        })
      })
    })
    mutation.observe(container, { childList: true, subtree: true })

    return () => {
      intersection.disconnect()
      mutation.disconnect()
    }
  }, [threshold])

  return containerRef
}
