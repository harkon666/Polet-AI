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
          Policy-Enforced Smart Wallet for AI Agents
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Secure your AI agent wallets with allowlists, blocklists, spending limits, and temporal session keys.
          Built on Solana for high-frequency micro-transactions.
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
          [
            'Temporal Keys',
            'Grant temporary access to AI agents with automatic expiry.',
          ],
          [
            'Policy Enforcement',
            'Allow/block lists and amount limits enforced on-chain.',
          ],
          [
            'Daily Rate Limiting',
            'Contain blast radius with daily spending caps.',
          ],
          [
            'Kill Switch',
            'Revoke session keys instantly in emergencies.',
          ],
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
