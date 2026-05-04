import { createFileRoute } from '@tanstack/react-router';
import { WalletDashboard } from '../components/WalletDashboard';

export const Route = createFileRoute('/')({
  component: HomePage,
});

export function HomePage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Polet AI</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Confidential DCA Smart Wallet for AI Agents
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Delegate USDC to SOL DCA runs without exposing private numeric guardrails or giving an AI agent
          unlimited wallet authority. Built on Solana with Polet PDA custody and Jupiter-powered execution.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/about"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Wallet Dashboard */}
      <section className="mt-8">
        <WalletDashboard />
      </section>

      {/* Features */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['PDA Custody', 'Deposit demo funds into a Polet smart wallet controlled by program policy.'],
          ['Confidential Policy', 'Set private max-per-run and daily-cap rules for the agent.'],
          ['Jupiter DCA', 'Route allowed USDC to SOL runs through the Jupiter strategy gateway.'],
          ['Safe Blocks', 'Show blocked agent actions without revealing the private threshold.'],
        ].map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
