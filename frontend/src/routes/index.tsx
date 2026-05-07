import { createFileRoute, Link } from '@tanstack/react-router';
import { LandingDemoWidget } from '../components/LandingDemoWidget';
import { StatsCounter } from '../components/StatsCounter';
import { FlowDiagram } from '../components/FlowDiagram';
import { RailMockup } from '../components/RailMockup';
import { BrandLogo } from '../components/BrandLogo';

export const Route = createFileRoute('/')({
  component: HomePage,
});

const TRUST_PARTNERS = [
  { brand: 'solana', label: 'Solana' },
  { brand: 'encrypt', label: 'Encrypt Pre-Alpha' },
  { brand: 'ika', label: 'Ika dWallet' },
  { brand: 'jupiter', label: 'Jupiter API' },
  { brand: 'anchor', label: 'Anchor 1.0' },
] as const;

const STATS = [
  { value: 32, label: 'Tests passing', sub: 'Rust + TS suites' },
  { value: 8, label: 'Contract instructions', sub: 'Single program ID' },
  { value: 2, label: 'Execution rails', sub: 'Jupiter + Ika' },
  { value: 1, label: 'Policy gate', sub: 'Confidential, on-chain' },
];

const PROBLEMS = [
  {
    n: '01',
    title: 'Public rules are exploitable',
    desc: 'Plaintext spending limits, allowlists, and daily caps on-chain are observable, front-runnable, and exploitable by adversarial actors.',
  },
  {
    n: '02',
    title: 'Off-chain enforcement is bypass-able',
    desc: 'Trusted-server enforcement is a single point of failure. A compromised proxy or signer means a compromised user.',
  },
  {
    n: '03',
    title: 'Cross-chain signing without policy',
    desc: 'A dWallet that approves any incoming message means a compromised agent can drain assets through bridge-less rails.',
  },
];

const SECURITY_FACTS = [
  {
    icon: 'PDA',
    title: 'Smart wallet PDA',
    desc: 'Funds custody under a program-derived address. The contract — not the agent — controls execution.',
  },
  {
    icon: 'KEY',
    title: 'Session keys',
    desc: 'Temporary signing authority with expires_at and granted_slot. Revoke single keys or all sessions in one tx.',
  },
  {
    icon: '↻',
    title: 'Anti-replay',
    desc: 'policy_seq increments on every change. Stale attestations are rejected before any spend.',
  },
  {
    icon: 'M·N',
    title: 'Multisig & recovery',
    desc: 'Optional M-of-N quorum for Ika approvals. Recovery authority rotates compromised sessions and dWallet controllers.',
  },
];

const RAILS = [
  {
    id: 'encrypt' as const,
    n: '01',
    label: 'Encrypt',
    title: 'Confidential numeric policy',
    body: 'Max-per-run and daily-cap stay encrypted on-chain. The contract enforces the guardrail before any spend without ever revealing your private thresholds — built against Encrypt pre-alpha.',
    bullets: [
      'Masked witness flow with sha256 commitment',
      'EUint64 graph executor migration in flight (issue 041)',
      'policy_seq anti-replay on every state change',
      'No plaintext threshold ever leaves the contract',
    ],
    href: 'https://github.com/dwallet-labs/encrypt-pre-alpha',
    railClass: 'qe-rail--encrypt',
  },
  {
    id: 'ika' as const,
    n: '02',
    label: 'Ika dWallet',
    title: 'Bridgeless cross-chain signing',
    body: 'After Polet policy approves, the contract CPI-calls Ika `approve_message` so a dWallet can sign Sui- or Ethereum-side intents. No bridge, no asset wrapping — pure cryptographic signing.',
    bullets: [
      'Sui-primary destination, Ethereum optional',
      'Official Ika Pre-Alpha SDK with CPI authority PDA',
      'MessageApproval PDA verification on devnet',
      'Shared M-of-N approval quorum supported',
    ],
    href: 'https://docs.ika.xyz/',
    railClass: 'qe-rail--ika',
  },
  {
    id: 'jupiter' as const,
    n: '03',
    label: 'Jupiter',
    title: 'Solana DCA strategy rail',
    body: 'Tokens v2, Price v3, and Swap v2 build composed into a route preview. The smart wallet PDA executes the approved instruction with raw control — no off-chain signing trust.',
    bullets: [
      'USDC → SOL DCA strategy (extensible to other pairs)',
      'Tokens v2 metadata + verification pre-check',
      'Swap v2 /build for raw instruction composition',
      'PDA-owned ATAs for direct custody execution',
    ],
    href: 'https://jup.ag/',
    railClass: 'qe-rail--jupiter',
  },
];

export function HomePage() {
  return (
    <main>
      {/* ============================================================
          HERO — Walrus-pattern: type-driven, single column, single CTA
         ============================================================ */}
      <section className="qe-hero qe-hero--type">
        <div className="page-wrap relative px-4 pb-24 pt-20 md:pb-32 md:pt-28 lg:pt-32">
          {/* Tagline kicker (Walrus: "Your Verifiable Data Platform") */}
          <p className="qe-hero-kicker">Your confidential control layer</p>

          {/* Massive 2-line headline (Walrus: "Infra for data / that matters") */}
          <h1 className="qe-hero-headline">
            <span className="block">Confidential control</span>
            <span className="block">for AI agents</span>
          </h1>

          {/* Subhead with bold inline emphasis */}
          <p className="qe-hero-subhead">
            Polet is a confidential control layer on Solana for AI agents.
            Finally, every spending rule stays{' '}
            <strong className="qe-hero-bold">private</strong>, every session
            stays <strong className="qe-hero-bold">temporary</strong>, and every
            cross-chain action stays{' '}
            <strong className="qe-hero-bold">policy-gated</strong> — without
            giving up wallet authority.
          </p>

          {/* Single primary CTA */}
          <div className="qe-hero-cta-row">
            <Link to="/app" className="qe-button qe-button--primary qe-button--xl">
              Start building
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Footer meta strip — small, dismissible */}
          <div className="qe-hero-meta">
            <span className="qe-badge qe-badge--devnet">
              <span className="qe-status-dot" aria-hidden="true" />
              Solana Devnet
            </span>
            <span className="qe-badge qe-badge--alpha">Pre-Alpha</span>
            <span className="qe-hero-meta__sep">·</span>
            <span className="qe-hero-meta__item">Program 3bJjt…bkeN</span>
            <span className="qe-hero-meta__sep">·</span>
            <span className="qe-hero-meta__item">32 tests passing</span>
            <span className="qe-hero-meta__sep">·</span>
            <span className="qe-hero-meta__item">End-to-end devnet verified</span>
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST STRIP — partner logos / integration marks
         ============================================================ */}
      <section className="qe-trust-strip">
        <div className="page-wrap px-4">
          <p className="mt-7 mb-1 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--kicker)]">
            Built on · Integrated with
          </p>
          <div className="qe-trust-strip__row pt-2">
            {TRUST_PARTNERS.map((p) => (
              <span key={p.label} className="qe-trust-strip__item">
                <BrandLogo brand={p.brand} size={22} />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          STATS COUNTER — engineering credibility numbers
         ============================================================ */}
      <section className="page-wrap px-4">
        <div className="qe-stats">
          {STATS.map((s) => (
            <div key={s.label} className="qe-stat">
              <span className="qe-stat__value">
                <StatsCounter target={s.value} />
              </span>
              <span className="qe-stat__label">{s.label}</span>
              <span className="qe-stat__sub">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          MANIFESTO / PROBLEM — narrative + 3 problem cards
         ============================================================ */}
      <section className="border-y border-[var(--line)] bg-[var(--foam)]">
        <div className="page-wrap grid gap-12 px-4 py-16 md:grid-cols-[5fr_7fr] md:gap-16 md:py-24">
          <div>
            <p className="island-kicker mb-4">The delegation problem</p>
            <h2 className="display-title text-3xl font-bold leading-[1.1] tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
              AI agents need wallets.{' '}
              <span className="text-[var(--sea-ink-soft)]">
                But unlimited authority is dangerous.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-[var(--sea-ink-soft)]">
              Letting an agent automate DeFi means giving it signing power. Today, that comes with
              three structural risks every team rebuilds from scratch.
            </p>
          </div>
          <ul className="space-y-3">
            {PROBLEMS.map((p) => (
              <li key={p.n} className="qe-card flex items-start gap-5">
                <span
                  className="flex-shrink-0 font-mono text-2xl font-extrabold leading-none text-[var(--lagoon)]"
                  aria-hidden="true"
                >
                  {p.n}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--sea-ink)]">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--sea-ink-soft)]">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================
          ARCHITECTURE FLOW DIAGRAM
         ============================================================ */}
      <section className="page-wrap px-4 py-16 md:py-24">
        <div className="mb-10 max-w-3xl">
          <p className="island-kicker mb-3">How it works</p>
          <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
            One contract. One policy gate.
            <br />
            <span className="text-[var(--lagoon)]">Two execution rails.</span>
          </h2>
        </div>

        <div className="qe-card overflow-x-auto p-4 sm:p-8">
          <FlowDiagram />
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--sea-ink-soft)]">
          Owner deposits funds, sets a confidential policy, grants the AI agent a temporary session
          key. Every agent action — Solana DCA or cross-chain dWallet signing — passes through the
          same on-chain guardrail before execution.
        </p>
      </section>

      {/* ============================================================
          RAIL SECTIONS — alternating left/right with terminal mockups
         ============================================================ */}
      {RAILS.map((rail, idx) => {
        const reversed = idx % 2 === 1;
        return (
          <section
            key={rail.id}
            className={`qe-rail-section ${rail.railClass} border-t border-[var(--line)]`}
            style={
              {
                background:
                  idx % 2 === 0 ? 'var(--surface)' : 'var(--foam)',
              } as React.CSSProperties
            }
          >
            <div
              className={`page-wrap grid gap-10 px-4 py-16 md:gap-16 md:py-24 ${
                reversed ? 'md:grid-cols-[7fr_5fr]' : 'md:grid-cols-[5fr_7fr]'
              }`}
            >
              {/* Mockup column (alternates L/R) */}
              <div className={reversed ? 'md:order-2' : 'md:order-1'}>
                <RailMockup variant={rail.id} />
              </div>

              {/* Text column */}
              <div className={reversed ? 'md:order-1' : 'md:order-2'}>
                <span className="qe-rail-kicker mb-5">
                  <span className="qe-rail-kicker__icon" aria-hidden="true">
                    <BrandLogo brand={rail.id} size={12} />
                  </span>
                  <span className="qe-rail-kicker__num">RAIL {rail.n}</span>
                  <span>·</span>
                  <span>{rail.label}</span>
                </span>
                <h3 className="display-title mt-4 text-2xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-3xl md:text-4xl">
                  {rail.title}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-7 text-[var(--sea-ink-soft)]">
                  {rail.body}
                </p>
                <ul className="mt-7 space-y-1.5">
                  {rail.bullets.map((b) => (
                    <li
                      key={b}
                      className="qe-rail-bullet text-sm leading-6 text-[var(--sea-ink)]"
                    >
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={rail.href}
                  target="_blank"
                  rel="noreferrer"
                  className="qe-link mt-7 text-sm"
                >
                  {rail.label} reference
                  <span className="qe-link__arrow">↗</span>
                </a>
              </div>
            </div>
          </section>
        );
      })}

      {/* ============================================================
          SECURITY 4-QUADRANT
         ============================================================ */}
      <section className="border-y border-[var(--line)] bg-[var(--bg-base)]">
        <div className="page-wrap px-4 py-16 md:py-24">
          <div className="mb-10 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
            <div>
              <p className="island-kicker mb-3">Security model</p>
              <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
                Layered defenses, no unilateral authority.
              </h2>
            </div>
            <p className="text-base leading-7 text-[var(--sea-ink-soft)] md:max-w-md md:justify-self-end">
              Polet's smart wallet PDA, session-key model, anti-replay, and multisig-lite quorum
              compose into one defensive system that no single party can override.
            </p>
          </div>

          <div className="qe-quadrant">
            {SECURITY_FACTS.map((f) => (
              <div key={f.title} className="qe-quadrant__cell">
                <span className="qe-quadrant__icon" aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className="text-lg font-semibold leading-tight text-[var(--sea-ink)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          INTERACTIVE DEMO WIDGET
         ============================================================ */}
      <section className="border-b border-[var(--line)] bg-[var(--foam)]">
        <div className="page-wrap grid gap-12 px-4 py-16 md:grid-cols-[5fr_7fr] md:gap-12 md:py-24">
          <div>
            <p className="island-kicker mb-3">Try it · no wallet needed</p>
            <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
              See the policy gate in 30 seconds.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[var(--sea-ink-soft)]">
              Run the three demo outcomes against a mock API. The block scenario shows how Polet
              rejects an over-limit agent action without revealing your private threshold.
            </p>
            <div className="mt-7 space-y-3">
              <div className="flex items-start gap-3">
                <span className="qe-pill qe-pill--success mt-0.5 flex-shrink-0">5 USDC</span>
                <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                  In-limit Jupiter DCA — Polet approves and returns an unsigned route/build.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="qe-pill qe-pill--success mt-0.5 flex-shrink-0">5 USDC</span>
                <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                  In-limit Sui Ika — Polet approves and prepares an Ika dWallet approval transaction.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className="qe-pill mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                >
                  25 USDC
                </span>
                <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                  Over-limit — blocked. No threshold leak. No dWallet approval data created.
                </p>
              </div>
            </div>
          </div>

          <div>
            <LandingDemoWidget />
          </div>
        </div>
      </section>

      {/* ============================================================
          HONEST DISCLAIMER
         ============================================================ */}
      <section className="page-wrap px-4 py-16 md:py-24">
        <div className="qe-card border-2 border-dashed border-[var(--line-strong)] bg-[var(--sand)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="qe-badge qe-badge--alpha">Pre-Alpha</span>
            <p className="island-kicker m-0" style={{ color: 'var(--sunset)' }}>
              Honest disclaimer
            </p>
          </div>
          <h2 className="display-title text-2xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-3xl">
            What is real, and what is not.
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--palm)]">
                ● Real in this build
              </h3>
              <ul className="space-y-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                <li>· Solana smart wallet PDA, custody, session-key flow</li>
                <li>· Confidential numeric policy enforcement on-chain (devnet)</li>
                <li>· 25 USDC blocked / 5 USDC allowed end-to-end on devnet</li>
                <li>· Jupiter Tokens, Price, and Swap v2 build preview</li>
                <li>· Ika `approve_message` CPI lifecycle (Pre-Alpha SDK)</li>
              </ul>
            </div>
            <div>
              <h3
                className="mb-3 text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--coral)' }}
              >
                ○ Not claimed in this build
              </h3>
              <ul className="space-y-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                <li>· Production-grade FHE privacy (Encrypt is pre-alpha)</li>
                <li>· Production MPC (Ika Pre-Alpha uses a single mock signer)</li>
                <li>· Mainnet swap or settled bridgeless asset movement</li>
                <li>· Verified Ika settlement of native cross-chain assets</li>
                <li>· Audit, KYC, or regulated custody guarantees</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA — gradient panel
         ============================================================ */}
      <section className="page-wrap px-4 pb-16 md:pb-24">
        <div className="qe-cta-panel">
          <h2 className="display-title mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl md:text-5xl">
            Try the policy gate on devnet.
          </h2>
          <p className="mx-auto max-w-xl text-base leading-7 md:text-lg">
            Connect a devnet wallet, set a confidential policy, grant an agent session key, and run
            the three demo outcomes.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app" className="qe-button qe-button--primary qe-button--xl">
              Open App
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="qe-button qe-button--secondary qe-button--xl"
            >
              View on GitHub
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
