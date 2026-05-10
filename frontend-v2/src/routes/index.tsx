import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPlaceholder,
})

/**
 * Day 1 AM placeholder — verifies token system loads and Geist renders.
 * Replaced by full landing page Day 2+.
 */
function LandingPlaceholder() {
  return (
    <main className="pl-ambient-hero min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-mute">
          Polet · v2 · Day 1 AM
        </p>
        <h1 className="font-sans text-5xl md:text-7xl font-semibold text-ink leading-[0.95] tracking-tight">
          Dark canvas <span className="text-lagoon">working.</span>
        </h1>
        <p className="font-sans text-lg text-ink-soft max-w-xl mx-auto">
          Tokens loaded · Geist Variable rendered · Cross-import from{' '}
          <code className="font-mono text-sm text-lagoon-bright">#shared</code>{' '}
          resolved · ambient gradient drifting.
        </p>
        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm text-ink-soft">
            <span className="size-2 rounded-full bg-palm animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider">port 3001</span>
          </span>
        </div>
      </div>
    </main>
  )
}
