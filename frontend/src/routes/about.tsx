import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">How It Works</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          Secure Settlement Layer for AI Autonomy
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Polet AI gives you granular control over what your AI agents can do with funds —
          while enabling high-frequency micro-transactions that make Solana ideal for AI use cases.
        </p>
      </section>

      <section className="mt-8 space-y-6">
        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">1. Create a Smart Wallet</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Your wallet is a Program Derived Address (PDA) on Solana. Only you hold the owner key.
            AI agents cannot access it directly — they need your explicit permission.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">2. Set Policy Rules</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Choose from templates like &quot;Whitelist Only&quot; or &quot;Daily Limit&quot; to define what your AI agent can do.
            Add custom allowlists, blocklists, and spending caps without writing smart contract code.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">3. Grant Temporal Keys</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Give your AI agent a temporary session key with its own daily limit and expiry.
            When the key expires, the AI agent automatically loses access — no manual revocation needed.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">4. AI Agent Transacts Safely</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            The AI agent submits intent JSON through the SDK. The policy engine evaluates each transaction
            against your rules. Transactions that violate policy are rejected — fail-secure by default.
          </p>
        </div>
      </section>

      <section className="mt-8 island-shell rounded-2xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">Demo: Policy Block</h2>
        <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
          The &quot;wow moment&quot; is watching a policy BLOCK in real-time. Configure a daily limit of 0.05 SOL,
          then watch as the AI agent&apos;s transaction gets rejected when it tries to exceed the limit.
        </p>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <span className="font-mono text-sm text-red-700">
            Transaction Rejected: Daily limit exceeded
          </span>
        </div>
      </section>
    </main>
  );
}
