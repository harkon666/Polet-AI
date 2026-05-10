import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

const V1_APP_URL = 'http://localhost:3000/app'

/**
 * Stub redirect to v1 console, `/app` lives in the legacy `frontend/`
 * during the v2 transition. Replaced when the console is ported to v2
 * (Day 7+ cutover).
 */
export const Route = createFileRoute('/app')({
  component: AppRedirect,
})

function AppRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = V1_APP_URL
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-mute">
          Polet · console
        </p>
        <p className="text-ink-soft">
          Redirecting to console at <code className="font-mono text-lagoon-bright">{V1_APP_URL}</code>…
        </p>
        <noscript>
          <a
            href={V1_APP_URL}
            className="inline-block mt-4 text-lagoon-bright underline"
          >
            Open console manually
          </a>
        </noscript>
      </div>
    </div>
  )
}
