import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="island-shell relative overflow-hidden rounded-lg px-6 py-8 sm:px-8">
        <p className="island-kicker mb-3">How It Works</p>
        <h1 className="mb-5 max-w-3xl text-3xl leading-tight font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Secure Settlement Layer for AI Autonomy
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Polet AI gives you granular control over what your AI agents can do with funds —
          while enabling high-frequency micro-transactions that make Solana ideal for AI use cases.
        </p>
      </section>

      <section className="mt-8 space-y-6">
        <div className="island-shell rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">1. Create a Smart Wallet</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Your wallet is a Program Derived Address (PDA) on Solana. Only you hold the owner key.
            AI agents cannot access it directly — they need your explicit permission.
          </p>
        </div>

        <div className="island-shell rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">2. Set Confidential Numeric Guardrails</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Save masked max-per-run and daily-cap rules for USDC DCA execution. The current demo keeps
            plaintext allowlists, blocklists, and template policies in the legacy prior-foundation path.
          </p>
        </div>

        <div className="island-shell rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">3. Authorize an AI Agent Address</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Authorize the AI agent wallet public key with an expiry. The contract still calls this a session key,
            but functionally it is the signer address allowed to use the smart wallet under Polet guardrails.
          </p>
        </div>

        <div className="island-shell rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">4. AI Agent Transacts Safely</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            The AI agent submits DCA intent JSON through the SDK. Polet validates the authorized signer, checks the
            confidential numeric policy, asks Jupiter for a route/build preview, and returns only approved unsigned payloads.
          </p>
        </div>
      </section>

      <section className="mt-8 island-shell rounded-lg p-6">
        <h2 className="mb-4 text-xl font-semibold text-[var(--sea-ink)]">Demo: Confidential Policy Block</h2>
        <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
          The demo blocks a 25 USDC agent DCA run without revealing the private max-per-run or daily cap,
          then allows a 5 USDC run through Jupiter route/build preview. The frontend demo does not send a real swap.
        </p>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <span className="font-mono text-sm text-red-700">
            Agent DCA Blocked: confidential policy rejected the run
          </span>
        </div>
      </section>
    </main>
  );
}
