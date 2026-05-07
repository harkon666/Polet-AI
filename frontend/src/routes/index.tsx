import { createFileRoute } from '@tanstack/react-router';
import { WalletDashboard } from '../components/WalletDashboard';

export const Route = createFileRoute('/')({
  component: HomePage,
});

export function HomePage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      <section className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="island-kicker mb-2">Polet AI wallet workspace</p>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
            Confidential DCA control panel
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--sea-ink-soft)]">
            Run the guarded USDC to SOL demo from one operational workflow: setup custody, save private
            policy, test the 25 USDC block, then preview the 5 USDC Jupiter route.
          </p>
        </div>
        <a
          href="/about"
          className="inline-flex w-fit items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:bg-[var(--link-bg-hover)]"
        >
          How It Works
        </a>
      </section>

      <section>
        <WalletDashboard />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['PDA Custody', 'Deposit demo funds into a Polet smart wallet controlled by program policy.'],
          ['Confidential Policy', 'Set private max-per-run and daily-cap rules for the agent.'],
          ['Jupiter Preview', 'Show route/build estimates for allowed USDC to SOL runs without claiming real swap execution.'],
          ['Safe Blocks', 'Show blocked agent actions without revealing the private threshold.'],
        ].map(([title, desc]) => (
          <article
            key={title}
            className="island-shell feature-card rounded-lg p-4"
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
