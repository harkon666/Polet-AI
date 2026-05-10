import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

const V1_ABOUT_URL = 'http://localhost:3000/about'

/**
 * Stub redirect to v1 about page, `/about` (How It Works) stays in the
 * legacy `frontend/` until v2 ports the deep-tech page (Day 7+ cutover).
 */
export const Route = createFileRoute('/about')({
  component: AboutRedirect,
})

function AboutRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = V1_ABOUT_URL
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-mute">
          Polet · how it works
        </p>
        <p className="text-ink-soft">
          Redirecting to <code className="font-mono text-lagoon-bright">{V1_ABOUT_URL}</code>…
        </p>
        <noscript>
          <a
            href={V1_ABOUT_URL}
            className="inline-block mt-4 text-lagoon-bright underline"
          >
            Open about page manually
          </a>
        </noscript>
      </div>
    </main>
  )
}
