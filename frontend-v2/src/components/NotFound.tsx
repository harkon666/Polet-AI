import { Link } from '@tanstack/react-router'
import { Button } from './primitives/Button'
import { KickerLabel } from './primitives/KickerLabel'

/**
 * Default 404 page — shown when a route doesn't match. Routes the user
 * back to the landing or to /app.
 *
 * Quietly satisfies TanStack Router's `defaultNotFoundComponent` config
 * (without it, dev shows a noisy warning + an unstyled <p>Not Found</p>).
 */
export function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <KickerLabel tone="warning">Lost in transit</KickerLabel>
        <h1 className="mt-4 font-sans font-black text-ink text-5xl md:text-6xl tracking-tighter">
          404
        </h1>
        <p className="mt-4 text-ink-soft text-base md:text-lg">
          That route didn't pass the policy gate. Try the landing or open the app.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="md">
              Back to landing
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="ghost" size="md">
              Open App
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
