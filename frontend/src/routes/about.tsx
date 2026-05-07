import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

const STEPS = [
  {
    n: '01',
    title: 'Owner deposits funds into a smart wallet PDA',
    body: "The owner initializes a Polet wallet PDA derived from their public key. PDA-owned token accounts custody USDC and SOL/wSOL. The agent never holds the owner's main wallet authority.",
  },
  {
    n: '02',
    title: 'Owner saves a confidential numeric policy',
    body: 'Max-per-run, daily-cap, and daily-spent are stored as masked values plus a witness-hash on-chain. The contract enforces the guardrail without ever revealing plaintext thresholds. (Encrypt graph executor migration in progress for full FHE-style enforcement.)',
  },
  {
    n: '03',
    title: 'Owner grants the agent a temporary session key',
    body: "A session key is registered with an expiry timestamp. The agent uses it to sign smart-wallet transactions; it cannot bypass the policy gate, and the owner can revoke a single key or all sessions at any slot.",
  },
  {
    n: '04',
    title: 'Agent submits a structured strategy intent',
    body: 'The proxy parses an SDK-emitted intent (DCA or multichain). For Solana, it pre-checks Jupiter Tokens & Price, then composes a Swap V2 build. For cross-chain, it builds a canonical bridgeless order envelope.',
  },
  {
    n: '05',
    title: 'Polet enforces the confidential gate',
    body: 'The contract checks session validity, slot freshness, policy_seq anti-replay, and the masked numeric guardrail. Over-limit requests are rejected before any action — no Jupiter route returned, no Ika MessageApproval created.',
  },
  {
    n: '06',
    title: 'Approved actions return signed-ready payloads',
    body: 'Jupiter approved → unsigned policy-gated smart-wallet transaction. Ika approved → unsigned `approve_ika_message_as_session` transaction + Sui devnet sign-only digest + MessageApproval PDA metadata.',
  },
];

const SECURITY_FACTS = [
  ['Smart wallet PDA', 'seeded by owner pubkey · executes within program policy'],
  ['Session keys', 'expiry timestamp · slot revocation · max 8 concurrent'],
  ['Anti-replay', 'policy_seq increments on every policy change'],
  ['Bulk revoke', 'last_revoked_slot invalidates older sessions in one tx'],
  ['Recovery authority', 'owner-or-recovery rotates compromised sessions + dWallet controller'],
  ['Shared Ika quorum', 'M-of-N co-approver requirement for cross-chain signing'],
];

function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="page-wrap px-4 pb-12 pt-12 md:pb-16 md:pt-20">
        <div className="flex flex-col items-start gap-6">
          <span className="qe-badge qe-badge--devnet">How it works</span>
          <h1 className="display-title max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
            One contract, one policy gate, two execution rails.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)] md:text-lg md:leading-8">
            Polet AI is a single Solana smart contract that custodies funds, enforces a confidential
            numeric guardrail, and gates both Jupiter and Ika dWallet actions behind the same
            policy check.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="page-wrap px-4 py-10 md:py-14">
        <p className="island-kicker mb-6">The flow</p>
        <ol className="grid gap-5 md:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step.n} className="qe-card">
              <span className="qe-badge text-mono">{step.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-[var(--sea-ink)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Security model */}
      <section className="border-y border-[var(--line)] bg-[var(--foam)]">
        <div className="page-wrap grid gap-10 px-4 py-14 md:grid-cols-[1fr_2fr] md:gap-12 md:py-20">
          <div>
            <p className="island-kicker mb-3">Security model</p>
            <h2 className="display-title text-2xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-3xl md:text-4xl">
              Layered defenses, no unilateral authority.
            </h2>
          </div>
          <dl className="space-y-1">
            {SECURITY_FACTS.map(([label, value]) => (
              <div key={label} className="qe-stat-row">
                <dt className="qe-stat-row__label">{label}</dt>
                <dd className="qe-stat-row__value text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Honest disclaimer detail */}
      <section className="page-wrap px-4 py-14 md:py-20">
        <div className="qe-card border-2 border-dashed border-[var(--line-strong)] bg-[var(--sand)]">
          <p className="island-kicker mb-3" style={{ color: 'var(--sunset)' }}>
            Pre-Alpha disclaimer
          </p>
          <h2 className="display-title text-xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-2xl">
            Honest about what this build claims and what it does not.
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--sea-ink-soft)]">
            <p>
              Polet AI is built against <strong className="text-[var(--sea-ink)]">Encrypt Pre-Alpha</strong>{' '}
              and <strong className="text-[var(--sea-ink)]">Ika dWallet Pre-Alpha</strong>. Both are
              development-stage tools with single mock signers, evolving APIs, and devnet-only state
              that may be wiped periodically.
            </p>
            <p>
              The current confidential numeric policy uses a masked-witness flow that proves the
              enforcement <em>shape</em> — it is not production FHE privacy. The Encrypt graph
              executor lifecycle migration (issue 041) is in progress to replace masked values with
              verified Encrypt ciphertexts.
            </p>
            <p>
              The Jupiter integration produces a <strong className="text-[var(--sea-ink)]">route/build preview</strong>{' '}
              and a policy-gated unsigned smart-wallet transaction. It does not claim mainnet swap
              execution.
            </p>
            <p>
              The Ika integration produces an <strong className="text-[var(--sea-ink)]">unsigned policy-gated dWallet approval transaction</strong>{' '}
              and a destination-chain digest artifact. Polet does not sign, broadcast, claim
              production MPC, claim verified Ika settlement, or move bridgeless assets in this build.
            </p>
            <p className="font-mono text-xs text-[var(--kicker)]">
              Solana cluster: devnet · Polet program id 3bJjt…bkeN · Ika Pre-Alpha program id
              87W54k…q1oY · Last verified end-to-end: May 2026
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--line)] bg-[var(--foam)]">
        <div className="page-wrap px-4 py-14 text-center md:py-20">
          <h2 className="display-title mx-auto max-w-xl text-2xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-3xl">
            Ready to see the gate fire?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--sea-ink-soft)]">
            Connect a devnet wallet on the app and run the three demo outcomes — or try the mock
            widget on the home page first.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app" className="qe-button qe-button--primary">
              Open App
              <span aria-hidden="true">→</span>
            </Link>
            <Link to="/" className="qe-button qe-button--secondary">
              ← Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
