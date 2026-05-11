import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  beforeLoad: () => {
    throw redirect({ to: '/', hash: 'how-it-works', replace: true })
  },
  component: AboutRedirect,
})

function AboutRedirect() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-mute">
          Polet · how it works
        </p>
        <p className="text-ink-soft">
          Redirecting to <code className="font-mono text-lagoon-bright">/#how-it-works</code>…
        </p>
        <noscript>
          <a
            href="/#how-it-works"
            className="inline-block mt-4 text-lagoon-bright underline"
          >
            Open about page manually
          </a>
        </noscript>
      </div>
    </div>
  )
}
