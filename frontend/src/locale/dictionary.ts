/**
 * Translation dictionaries for Polet AI marketing surfaces.
 *
 * - `en` is the canonical source — every key MUST exist here. This is what
 *   `t()` falls back to when the active locale is missing a key.
 * - `id` is the Indonesian translation.
 *
 * Keys are flat dot-namespaced and grouped by section for discoverability:
 *   header.* · hero.* · trust.* · stats.* · manifesto.* · flow.* · rail.*
 *   security.* · demo.* · demoWidget.* · disclaimer.* · cta.* · footer.*
 *   localeToggle.* · themeToggle.*
 *
 * Dynamic interpolation (e.g. the footer copyright year) is handled in the
 * call site — dictionary values use `{placeholder}` strings and the caller
 * does the replace. See `Footer.tsx` for the pattern.
 */

export type Locale = 'id' | 'en';

export type TranslationKey =
  // Header
  | 'header.nav.home'
  | 'header.nav.app'
  | 'header.nav.howItWorks'
  | 'header.nav.rails'
  | 'header.nav.demo'
  | 'header.nav.docs'
  | 'header.devnetPill'
  | 'header.cta.openApp'
  // Hero
  | 'hero.kicker'
  | 'hero.headline.line1'
  | 'hero.headline.line2'
  | 'hero.headline.line2.a'
  | 'hero.headline.line2.b'
  | 'hero.headline.line2.c'
  | 'hero.subhead'
  | 'hero.cta.primary'
  | 'hero.cta.secondary'
  | 'hero.meta.devnet'
  | 'hero.meta.preAlpha'
  | 'hero.meta.programLabel'
  | 'hero.meta.testsPassing'
  | 'hero.meta.e2eVerified'
  | 'hero.preview.aria'
  | 'hero.preview.card.title'
  | 'hero.preview.row.maxPerRun'
  | 'hero.preview.row.dailyCap'
  | 'hero.preview.row.sessionLabel'
  | 'hero.preview.row.blockedLabel'
  // Trust strip
  | 'trust.kicker'
  | 'trust.colosseum.label'
  // Stats
  | 'stats.kicker'
  | 'stats.1.label'
  | 'stats.1.sub'
  | 'stats.2.label'
  | 'stats.2.sub'
  | 'stats.3.label'
  | 'stats.3.sub'
  | 'stats.4.label'
  | 'stats.4.sub'
  // Manifesto / Problem
  | 'manifesto.kicker'
  | 'manifesto.headlineLead'
  | 'manifesto.headlineRest'
  | 'manifesto.body'
  | 'manifesto.problem1.title'
  | 'manifesto.problem1.desc'
  | 'manifesto.problem2.title'
  | 'manifesto.problem2.desc'
  | 'manifesto.problem3.title'
  | 'manifesto.problem3.desc'
  // Flow diagram section
  | 'flow.kicker'
  | 'flow.headline.lead'
  | 'flow.headline.rest'
  | 'flow.body'
  | 'flow.aria'
  | 'flow.node.owner.label'
  | 'flow.node.owner.sub'
  | 'flow.node.pda.label'
  | 'flow.node.pda.sub'
  | 'flow.node.policy.label'
  | 'flow.node.policy.sub'
  | 'flow.node.session.label'
  | 'flow.node.session.sub'
  | 'flow.node.agent.label'
  | 'flow.node.agent.sub'
  | 'flow.node.gate.label'
  | 'flow.node.gate.sub'
  | 'flow.node.jupiter.label'
  | 'flow.node.jupiter.sub'
  | 'flow.node.ika.label'
  | 'flow.node.ika.sub'
  // How you use Polet
  | 'howto.kicker'
  | 'howto.headline'
  | 'howto.step.1.title'
  | 'howto.step.1.desc'
  | 'howto.step.2.title'
  | 'howto.step.2.desc'
  | 'howto.step.3.title'
  | 'howto.step.3.desc'
  // Rails
  | 'rail.encrypt.title'
  | 'rail.encrypt.body'
  | 'rail.encrypt.bullet.1'
  | 'rail.encrypt.bullet.2'
  | 'rail.encrypt.bullet.3'
  | 'rail.encrypt.bullet.4'
  | 'rail.encrypt.ref'
  | 'rail.encrypt.mockTitle'
  | 'rail.encrypt.mockAria'
  | 'rails.kicker'
  | 'rails.headline.lead'
  | 'rails.headline.rest'
  | 'rails.body'
  | 'rail.ika.title'
  | 'rail.ika.body'
  | 'rail.ika.bullet.1'
  | 'rail.ika.bullet.2'
  | 'rail.ika.bullet.3'
  | 'rail.ika.bullet.4'
  | 'rail.ika.ref'
  | 'rail.ika.mockTitle'
  | 'rail.ika.mockAria'
  | 'rail.jupiter.title'
  | 'rail.jupiter.body'
  | 'rail.jupiter.bullet.1'
  | 'rail.jupiter.bullet.2'
  | 'rail.jupiter.bullet.3'
  | 'rail.jupiter.bullet.4'
  | 'rail.jupiter.ref'
  | 'rail.jupiter.mockTitle'
  | 'rail.jupiter.mockAria'
  // Security
  | 'security.kicker'
  | 'security.headline'
  | 'security.body'
  | 'security.threat.intro'
  | 'security.fact.pda.title'
  | 'security.fact.pda.desc'
  | 'security.fact.session.title'
  | 'security.fact.session.desc'
  | 'security.fact.replay.title'
  | 'security.fact.replay.desc'
  | 'security.fact.quorum.title'
  | 'security.fact.quorum.desc'
  // Demo section (framing around the widget)
  | 'demo.kicker'
  | 'demo.headline'
  | 'demo.body'
  | 'demo.pill.dca.desc'
  | 'demo.pill.ika.desc'
  | 'demo.pill.block.desc'
  // Demo widget internal strings
  | 'demoWidget.header.badge'
  | 'demoWidget.header.noWallet'
  | 'demoWidget.button.block.state.idle'
  | 'demoWidget.button.block.state.running'
  | 'demoWidget.button.jupiter.state.idle'
  | 'demoWidget.button.jupiter.state.running'
  | 'demoWidget.button.ika.state.idle'
  | 'demoWidget.button.ika.state.running'
  | 'demoWidget.button.block.ariaLabel'
  | 'demoWidget.button.jupiter.ariaLabel'
  | 'demoWidget.button.ika.ariaLabel'
  | 'demoWidget.state.idle.title'
  | 'demoWidget.state.idle.desc'
  | 'demoWidget.state.running.label'
  | 'demoWidget.state.blocked.badge'
  | 'demoWidget.state.blocked.reason.jupiter'
  | 'demoWidget.state.blocked.reason.ika'
  | 'demoWidget.state.blocked.field.code'
  | 'demoWidget.state.blocked.field.leak'
  | 'demoWidget.state.blocked.field.leakValue'
  | 'demoWidget.state.blocked.field.approval'
  | 'demoWidget.state.blocked.field.approvalValue'
  | 'demoWidget.state.allowed.jupiter.badge'
  | 'demoWidget.state.allowed.jupiter.body'
  | 'demoWidget.state.allowed.jupiter.field.input'
  | 'demoWidget.state.allowed.jupiter.field.output'
  | 'demoWidget.state.allowed.jupiter.field.route'
  | 'demoWidget.state.allowed.jupiter.field.execution'
  | 'demoWidget.state.allowed.ika.badge'
  | 'demoWidget.state.allowed.ika.body'
  | 'demoWidget.state.allowed.ika.field.amount'
  | 'demoWidget.state.allowed.ika.field.target'
  | 'demoWidget.state.allowed.ika.field.targetValue'
  | 'demoWidget.state.allowed.ika.field.messageHash'
  | 'demoWidget.state.allowed.ika.field.scheme'
  | 'demoWidget.reset'
  | 'demoWidget.footer.note'
  | 'demoWidget.simulation.badge'
  | 'demoWidget.live.cta'
  | 'demoWidget.live.aria.jupiter'
  | 'demoWidget.live.aria.ika'
  | 'demoWidget.live.aria.block'
  // DemoWidget v2 — Crypto-Blur Theater
  | 'demoWidget.theater.header.title'
  | 'demoWidget.theater.header.devnet'
  | 'demoWidget.theater.idle.title'
  | 'demoWidget.theater.idle.desc'
  | 'demoWidget.theater.label.agentRequest'
  | 'demoWidget.theater.label.sealing'
  | 'demoWidget.theater.label.sealed'
  | 'demoWidget.theater.label.evaluating'
  | 'demoWidget.theater.label.decrypting'
  | 'demoWidget.theater.label.revealed'
  | 'demoWidget.theater.label.result'
  | 'demoWidget.theater.hint.cleartext'
  | 'demoWidget.theater.hint.encrypting'
  | 'demoWidget.theater.hint.encrypted'
  | 'demoWidget.theater.hint.evaluating'
  | 'demoWidget.theater.hint.result'
  | 'demoWidget.theater.hint.revealing'
  | 'demoWidget.theater.hint.revealed'
  | 'demoWidget.theater.field.action'
  | 'demoWidget.theater.field.amount'
  | 'demoWidget.theater.field.target'
  | 'demoWidget.theater.field.route'
  | 'demoWidget.theater.gate.title'
  | 'demoWidget.theater.constraint.numericLimit'
  | 'demoWidget.theater.constraint.scopeMatch'
  | 'demoWidget.theater.constraint.sessionActive'
  | 'demoWidget.theater.result.allowed'
  | 'demoWidget.theater.result.allowed.body'
  | 'demoWidget.theater.result.blocked'
  | 'demoWidget.theater.result.blocked.body'
  | 'demoWidget.theater.result.code'
  | 'demoWidget.theater.result.tx'
  | 'demoWidget.theater.reveal.cta'
  | 'demoWidget.theater.reveal.confirmed'
  | 'demoWidget.theater.reveal.note'
  | 'demoWidget.theater.reset'
  | 'demoWidget.theater.pick'
  | 'demoWidget.scenario.block.label'
  | 'demoWidget.scenario.block.hint'
  | 'demoWidget.scenario.jupiter.label'
  | 'demoWidget.scenario.jupiter.hint'
  | 'demoWidget.scenario.ika.label'
  | 'demoWidget.scenario.ika.hint'
  // Disclaimer
  | 'disclaimer.badge'
  | 'disclaimer.kicker'
  | 'disclaimer.headline'
  | 'disclaimer.intro'
  | 'disclaimer.real.heading'
  | 'disclaimer.real.item.1'
  | 'disclaimer.real.item.2'
  | 'disclaimer.real.item.3'
  | 'disclaimer.real.item.4'
  | 'disclaimer.real.item.5'
  | 'disclaimer.notclaimed.heading'
  | 'disclaimer.notclaimed.item.1'
  | 'disclaimer.notclaimed.item.2'
  | 'disclaimer.notclaimed.item.3'
  | 'disclaimer.notclaimed.item.4'
  | 'disclaimer.notclaimed.item.5'
  // Final CTA
  | 'cta.kicker'
  | 'cta.heading'
  | 'cta.body'
  | 'cta.primary'
  | 'cta.secondary'
  | 'cta.path.build.title'
  | 'cta.path.build.audience'
  | 'cta.path.build.cta'
  | 'cta.path.review.title'
  | 'cta.path.review.audience'
  | 'cta.path.review.cta'
  | 'cta.path.explore.title'
  | 'cta.path.explore.audience'
  | 'cta.path.explore.cta'
  // Footer
  | 'footer.brand.desc'
  | 'footer.badges.devnetLive'
  | 'footer.col.system.heading'
  | 'footer.col.system.network.label'
  | 'footer.col.system.status.label'
  | 'footer.col.system.version.label'
  | 'footer.col.system.build.label'
  | 'footer.col.rails.heading'
  | 'footer.col.rails.jupiter'
  | 'footer.col.rails.ika'
  | 'footer.col.rails.encrypt'
  | 'footer.col.rails.smartwallet'
  | 'footer.col.resources.heading'
  | 'footer.col.resources.docs'
  | 'footer.col.resources.github'
  | 'footer.col.resources.twitter'
  | 'footer.col.resources.disclaimer'
  | 'footer.bottom.copyright'
  | 'footer.bottom.devnet'
  | 'footer.community.heading'
  | 'footer.community.x'
  | 'footer.community.github'
  | 'footer.community.discord'
  | 'footer.community.discordSoon'
  // Toggles
  | 'localeToggle.id'
  | 'localeToggle.en'
  | 'localeToggle.aria'
  | 'themeToggle.aria.group'
  | 'themeToggle.aria.light'
  | 'themeToggle.aria.dark'
  | 'themeToggle.aria.auto'
  | 'prefs.aria.trigger'
  | 'prefs.theme.label'
  | 'prefs.locale.label';

type Dictionary = Record<TranslationKey, string>;

// ---------------------------------------------------------------------------
// English (canonical)
// ---------------------------------------------------------------------------

const en: Dictionary = {
  // Header
  'header.nav.home': 'Home',
  'header.nav.app': 'App',
  'header.nav.howItWorks': 'How it works',
  'header.nav.rails': 'Rails',
  'header.nav.demo': 'Demo',
  'header.nav.docs': 'Docs',
  'header.devnetPill': 'Devnet',
  'header.cta.openApp': 'Open App',

  // Hero
  'hero.kicker': 'Confidential wallet layer for AI agents',
  'hero.headline.line1': 'Give your agent a budget.',
  'hero.headline.line2': 'Not your wallet.',
  'hero.headline.line2.a': 'Not your keys.',
  'hero.headline.line2.b': 'Hide the limits.',
  'hero.headline.line2.c': 'Skip the seed.',
  'hero.subhead':
    'Set a private spending limit on a Solana smart-wallet PDA. Grant a temporary session key. Jupiter DCA and Ika dWallet signings all pass the same on-chain policy gate — nothing leaks, nothing bypasses.',
  'hero.cta.primary': 'Start building',
  'hero.cta.secondary': 'See the policy gate →',
  'hero.meta.devnet': 'Solana Devnet',
  'hero.meta.preAlpha': 'Pre-Alpha',
  'hero.meta.programLabel': 'Program',
  'hero.meta.testsPassing': '49+ tests passing',
  'hero.meta.e2eVerified': 'Jupiter + Ika devnet verified',
  'hero.preview.aria':
    'Polet wallet console preview showing a confidential policy with masked numeric limits, an active agent session, and a blocked 25 USDC scenario.',
  'hero.preview.card.title': 'Confidential policy',
  'hero.preview.row.maxPerRun': 'max per run',
  'hero.preview.row.dailyCap': 'daily cap',
  'hero.preview.row.sessionLabel': 'Session active',
  'hero.preview.row.blockedLabel': 'Blocked',

  // Trust strip
  'trust.kicker': 'Built on · Integrated with',
  'trust.colosseum.label': 'Participating in Colosseum Frontier',

  // Stats
  'stats.kicker': 'By the numbers',
  'stats.1.label': 'Tests passing',
  'stats.1.sub': 'Frontend TS suite',
  'stats.2.label': 'Contract instructions',
  'stats.2.sub': 'Single program ID',
  'stats.3.label': 'Execution rails',
  'stats.3.sub': 'Jupiter + Ika',
  'stats.4.label': 'Policy gate',
  'stats.4.sub': 'Confidential, on-chain',

  // Manifesto / Problem
  'manifesto.kicker': 'The delegation problem',
  'manifesto.headlineLead': 'You built a DCA bot that works.',
  'manifesto.headlineRest': 'Now it needs signing power.',
  'manifesto.body':
    'Giving your agent a wallet means giving up everything — spending, allowlists, cross-chain signing, all under one key. Three structural problems every team rebuilds from scratch:',
  'manifesto.problem1.title': 'Your limits are public',
  'manifesto.problem1.desc':
    'Plaintext spending caps and allowlists on-chain are observable, front-runnable, and exploitable. The agent\'s competitor sees exactly where it stops.',
  'manifesto.problem2.title': 'Off-chain rules are bypass-able',
  'manifesto.problem2.desc':
    'A trusted proxy that enforces your policy is a single compromise away from losing it. One leaked server key and the guardrail is gone.',
  'manifesto.problem3.title': 'Cross-chain signing has no gate',
  'manifesto.problem3.desc':
    'A dWallet that approves any message means a compromised agent can drain bridgeless assets through rails your policy never saw.',

  // Flow diagram
  'flow.kicker': 'How it works',
  'flow.headline.lead': 'One contract. One policy gate.',
  'flow.headline.rest': 'Two execution rails.',
  'flow.body':
    'Owner deposits funds, sets a confidential policy, grants the AI agent a temporary session key. Every agent action — Solana DCA or cross-chain dWallet signing — passes through the same on-chain guardrail before execution.',
  'flow.aria':
    'Polet AI architecture: owner sets confidential policy on a Solana smart wallet PDA, grants an AI agent a session key, then a policy gate enforces guardrails before either Jupiter DCA or Ika dWallet signing executes.',
  'flow.node.owner.label': 'Owner',
  'flow.node.owner.sub': 'signs setup',
  'flow.node.pda.label': 'Smart Wallet PDA',
  'flow.node.pda.sub': 'seed: polet_wallet',
  'flow.node.policy.label': 'Confidential Policy',
  'flow.node.policy.sub': 'masked numeric guardrail',
  'flow.node.session.label': 'Session Key',
  'flow.node.session.sub': 'expires_at, slot',
  'flow.node.agent.label': 'AI Agent',
  'flow.node.agent.sub': 'submits intent',
  'flow.node.gate.label': 'Policy Gate',
  'flow.node.gate.sub': 'policy_seq · session · numeric guardrail',
  'flow.node.jupiter.label': 'Jupiter DCA',
  'flow.node.jupiter.sub': 'route/build preview',
  'flow.node.ika.label': 'Ika dWallet',
  'flow.node.ika.sub': 'approve_message CPI',

  // How you use Polet
  'howto.kicker': 'How you use Polet',
  'howto.headline': 'Minute to first value.',
  'howto.step.1.title': 'Deposit to your smart wallet',
  'howto.step.1.desc': 'USDC and SOL into a PDA the contract controls. No agent access yet — funds custody under program-derived address.',
  'howto.step.2.title': 'Save a confidential policy',
  'howto.step.2.desc': 'Max-per-run and daily-cap encrypted on-chain. The threshold never leaves the contract. You can change it anytime.',
  'howto.step.3.title': 'Grant an agent session key',
  'howto.step.3.desc': 'Temporary signing authority with expires_at. The agent trades within your policy. Revoke any time in one transaction.',

  // Rails — Encrypt
  'rails.kicker': 'Three rails. One gate.',
  'rails.headline.lead': 'One policy gate.',
  'rails.headline.rest': 'Three execution surfaces.',
  'rails.body':
    'Encrypt keeps the limits private. Ika carries the signing across chains. Jupiter routes the trade. All three pass through the same on-chain gate before a single lamport moves.',
  'rail.encrypt.title': 'Confidential numeric policy',
  'rail.encrypt.body':
    'Max-per-run and daily-cap stay encrypted on-chain. The contract enforces the guardrail before any spend without ever revealing your private thresholds — built against Encrypt pre-alpha.',
  'rail.encrypt.bullet.1': 'Masked witness flow with sha256 commitment',
  'rail.encrypt.bullet.2': 'EUint64 graph executor migration in flight (issue 041)',
  'rail.encrypt.bullet.3': 'policy_seq anti-replay on every state change',
  'rail.encrypt.bullet.4': 'No plaintext threshold ever leaves the contract',
  'rail.encrypt.ref': 'Encrypt reference',
  'rail.encrypt.mockTitle': 'contract/confidential_policy.rs',
  'rail.encrypt.mockAria':
    'Rust source showing Polet enforce_confidential_numeric_policy verifying a witness hash and decrypting masked max-per-run, daily-cap, daily-spent before checking an over-limit amount.',

  // Rails — Ika
  'rail.ika.title': 'Bridgeless cross-chain signing',
  'rail.ika.body':
    'After Polet policy approves, the contract CPI-calls Ika `approve_message` so a dWallet can sign multi-chain intents. No bridge, no asset wrapping — pure cryptographic signing.',
  'rail.ika.bullet.1': 'Multi-chain support',
  'rail.ika.bullet.2': 'Official Ika Pre-Alpha SDK with CPI authority PDA',
  'rail.ika.bullet.3': 'MessageApproval PDA verification on devnet',
  'rail.ika.bullet.4': 'Shared M-of-N approval quorum supported',
  'rail.ika.ref': 'Ika dWallet reference',
  'rail.ika.mockTitle': 'POST /intent/multichain/run · executionRail = ika',
  'rail.ika.mockAria':
    'Mock Ika dWallet approval response showing an approved bridgeless order, message hash, MessageApproval PDA, and signature scheme metadata for a multi-chain intent.',

  // Rails — Jupiter
  'rail.jupiter.title': 'Solana DCA strategy rail',
  'rail.jupiter.body':
    'Tokens v2, Price v3, and Swap v2 build composed into a route preview. The smart wallet PDA executes the approved instruction with raw control — no off-chain signing trust.',
  'rail.jupiter.bullet.1': 'USDC → SOL DCA strategy (extensible to other pairs)',
  'rail.jupiter.bullet.2': 'Tokens v2 metadata + verification pre-check',
  'rail.jupiter.bullet.3': 'Swap v2 /build for raw instruction composition',
  'rail.jupiter.bullet.4': 'PDA-owned ATAs for direct custody execution',
  'rail.jupiter.ref': 'Jupiter reference',
  'rail.jupiter.mockTitle': 'POST /intent/dca/run · 5 USDC → SOL',
  'rail.jupiter.mockAria':
    'Mock Jupiter DCA approved response showing the swap-build-fallback execution path, output amount, route plan, and an unsigned policy-gated smart wallet transaction.',

  // Security
  'security.kicker': 'Security model',
  'security.headline': 'Layered defenses, no unilateral authority.',
  'security.body':
    "Polet's smart wallet PDA, session-key model, anti-replay, and multisig-lite quorum compose into one defensive system that no single party can override.",
  'security.threat.intro':
    "Assume the agent is compromised. Assume the proxy is compromised. Assume a session key leaks. Polet's smart-wallet PDA still owns the funds, the confidential policy still blocks over-limit spends, and policy_seq still rejects replayed attestations.",
  'security.fact.pda.title': 'Smart wallet PDA',
  'security.fact.pda.desc':
    'Funds custody under a program-derived address. The contract — not the agent — controls execution.',
  'security.fact.session.title': 'Session keys',
  'security.fact.session.desc':
    'Temporary signing authority with expires_at and granted_slot. Revoke single keys or all sessions in one tx.',
  'security.fact.replay.title': 'Anti-replay',
  'security.fact.replay.desc':
    'policy_seq increments on every change. Stale attestations are rejected before any spend.',
  'security.fact.quorum.title': 'Multisig & recovery',
  'security.fact.quorum.desc':
    'Optional M-of-N quorum for Ika approvals. Recovery authority rotates compromised sessions and dWallet controllers.',

  // Demo section
  'demo.kicker': 'Try it · no wallet needed',
  'demo.headline': 'See the policy gate in 30 seconds.',
  'demo.body':
    'Run the three demo outcomes against a mock API. The block scenario shows how Polet rejects an over-limit agent action without revealing your private threshold.',
  'demo.pill.dca.desc':
    'In-limit Jupiter DCA — Polet approves and returns an unsigned route/build.',
  'demo.pill.ika.desc':
    'In-limit multi-chain Ika — Polet approves and prepares an Ika dWallet approval transaction.',
  'demo.pill.block.desc':
    'Over-limit — blocked. No threshold leak. No dWallet approval data created.',

  // Demo widget
  'demoWidget.header.badge': 'polet · mock api',
  'demoWidget.header.noWallet': 'no wallet',
  'demoWidget.button.block.state.idle': 'block',
  'demoWidget.button.block.state.running': 'running…',
  'demoWidget.button.jupiter.state.idle': 'allow',
  'demoWidget.button.jupiter.state.running': 'running…',
  'demoWidget.button.ika.state.idle': 'allow',
  'demoWidget.button.ika.state.running': 'running…',
  'demoWidget.button.block.ariaLabel': 'Run blocked 25 USDC scenario',
  'demoWidget.button.jupiter.ariaLabel': 'Run allowed 5 USDC Jupiter scenario',
  'demoWidget.button.ika.ariaLabel': 'Run allowed 5 USDC multi-chain Ika scenario',
  'demoWidget.state.idle.title': 'awaiting scenario',
  'demoWidget.state.idle.desc': 'Pick one of the three runs above. Mock API responds in ~500ms.',
  'demoWidget.state.running.label': 'policy gate evaluating',
  'demoWidget.state.blocked.badge': 'Blocked',
  'demoWidget.state.blocked.reason.jupiter':
    'Confidential policy rejected this run. Threshold and remaining cap stay private.',
  'demoWidget.state.blocked.reason.ika':
    'Confidential policy rejected this Ika request. No dWallet approval data created.',
  'demoWidget.state.blocked.field.code': 'code:',
  'demoWidget.state.blocked.field.leak': 'threshold leak:',
  'demoWidget.state.blocked.field.leakValue': 'none',
  'demoWidget.state.blocked.field.approval': 'dWallet approval:',
  'demoWidget.state.blocked.field.approvalValue': 'not created',
  'demoWidget.state.allowed.jupiter.badge': 'Approved · Jupiter',
  'demoWidget.state.allowed.jupiter.body':
    'In-limit DCA approved. Polet returns an unsigned smart-wallet transaction with the Jupiter route preview.',
  'demoWidget.state.allowed.jupiter.field.input': 'input',
  'demoWidget.state.allowed.jupiter.field.output': 'est. output',
  'demoWidget.state.allowed.jupiter.field.route': 'route',
  'demoWidget.state.allowed.jupiter.field.execution': 'execution',
  'demoWidget.state.allowed.ika.badge': 'Approved · Ika',
  'demoWidget.state.allowed.ika.body':
    'In-limit multi-chain Ika approved. Polet prepares an unsigned approve_ika_message_as_session transaction and destination-chain digest. Settlement not executed.',
  'demoWidget.state.allowed.ika.field.amount': 'amount',
  'demoWidget.state.allowed.ika.field.target': 'target',
  'demoWidget.state.allowed.ika.field.targetValue': 'Multi-chain',
  'demoWidget.state.allowed.ika.field.messageHash': 'message hash',
  'demoWidget.state.allowed.ika.field.scheme': 'scheme',
  'demoWidget.reset': 'Reset',
  'demoWidget.footer.note':
    'Mock API · No private key · No real funds · Run on /app for the live devnet flow',
  'demoWidget.simulation.badge': 'Simulation · 0ms latency',
  'demoWidget.live.cta': 'Run this live on /app →',
  'demoWidget.live.aria.jupiter': 'Open /app to run this Jupiter scenario on devnet',
  'demoWidget.live.aria.ika': 'Open /app to run this Ika scenario on devnet',
  'demoWidget.live.aria.block': 'Open /app to see the full blocked scenario on devnet',
  // DemoWidget v2 — Crypto-Blur Theater
  'demoWidget.theater.header.title': 'policy gate / 01',
  'demoWidget.theater.header.devnet': 'devnet \u00b7 live',
  'demoWidget.theater.idle.title': 'Pick a scenario to begin',
  'demoWidget.theater.idle.desc':
    'Watch the policy gate evaluate confidential numbers — the agent\u2019s amounts and routes glitch into ciphertext, the gate evaluates blind, and only you can decrypt.',
  'demoWidget.theater.label.agentRequest': 'agent request · cleartext',
  'demoWidget.theater.label.sealing': 'sealing · encrypting',
  'demoWidget.theater.label.sealed': 'sealed · ciphertext',
  'demoWidget.theater.label.evaluating': 'policy gate · evaluating',
  'demoWidget.theater.label.decrypting': 'decrypting · your side',
  'demoWidget.theater.label.revealed': 'revealed · cleartext',
  'demoWidget.theater.label.result': 'result',
  'demoWidget.theater.hint.cleartext': 'agent prepares request',
  'demoWidget.theater.hint.encrypting': 'glitch \u2192 hex',
  'demoWidget.theater.hint.encrypted': 'numbers private',
  'demoWidget.theater.hint.evaluating': 'checking constraints\u2026',
  'demoWidget.theater.hint.result': 'decision rendered',
  'demoWidget.theater.hint.revealing': 'unscrambling locally',
  'demoWidget.theater.hint.revealed': 'you saw \u2014 server didn\u2019t',
  'demoWidget.theater.field.action': 'action',
  'demoWidget.theater.field.amount': 'amount',
  'demoWidget.theater.field.target': 'target',
  'demoWidget.theater.field.route': 'route',
  'demoWidget.theater.gate.title': 'policy gate \u00b7 evaluating ciphertext',
  'demoWidget.theater.constraint.numericLimit': 'pi_numeric_limit',
  'demoWidget.theater.constraint.scopeMatch': 'pi_scope_match',
  'demoWidget.theater.constraint.sessionActive': 'pi_session_active',
  'demoWidget.theater.result.allowed': 'approved',
  'demoWidget.theater.result.allowed.body':
    'Policy gate approved without seeing your numbers. Encrypted commitment recorded; the unsigned tx is ready.',
  'demoWidget.theater.result.blocked': 'blocked',
  'demoWidget.theater.result.blocked.body':
    'Numeric limit exceeded. Original amount stays sealed \u2014 the gate said no without ever reading the cleartext.',
  'demoWidget.theater.result.code': 'code',
  'demoWidget.theater.result.tx': 'tx',
  'demoWidget.theater.reveal.cta': 'Reveal cleartext',
  'demoWidget.theater.reveal.confirmed': 'decrypted (you only)',
  'demoWidget.theater.reveal.note':
    'Server still sees only the ciphertext. Your session key decrypted locally \u2014 nobody else got the numbers.',
  'demoWidget.theater.reset': 'Reset',
  'demoWidget.theater.pick': 'pick a scenario',
  'demoWidget.scenario.block.label': 'Block 25 USDC',
  'demoWidget.scenario.block.hint': 'Over the daily limit',
  'demoWidget.scenario.jupiter.label': 'Jupiter DCA \u00b7 5',
  'demoWidget.scenario.jupiter.hint': 'In-band \u2192 unsigned tx',
  'demoWidget.scenario.ika.label': 'Ika \u00b7 5 X-chain',
  'demoWidget.scenario.ika.hint': 'Multi-chain via Ika',

  // Disclaimer
  'disclaimer.badge': 'Pre-Alpha',
  'disclaimer.kicker': 'Pre-alpha transparency',
  'disclaimer.headline': 'Every claim is verifiable on devnet.',
  'disclaimer.intro':
    'We don\'t hide pre-alpha status — we show you exactly what works now, and what we deliberately haven\'t built yet. Both lists are short on purpose.',
  'disclaimer.real.heading': '● Verified on devnet',
  'disclaimer.real.item.1': 'Solana smart wallet PDA, custody, session-key flow',
  'disclaimer.real.item.2': 'Confidential numeric policy enforcement on-chain (devnet)',
  'disclaimer.real.item.3': '25 USDC blocked / 5 USDC allowed end-to-end on devnet',
  'disclaimer.real.item.4': 'Jupiter Tokens, Price, and Swap v2 build preview',
  'disclaimer.real.item.5': 'Ika approve_message CPI lifecycle (Pre-Alpha SDK)',
  'disclaimer.notclaimed.heading': '○ Deliberately out of scope',
  'disclaimer.notclaimed.item.1': 'Production-grade FHE privacy (Encrypt is pre-alpha)',
  'disclaimer.notclaimed.item.2': 'Production MPC (Ika Pre-Alpha uses a single mock signer)',
  'disclaimer.notclaimed.item.3': 'Mainnet swap or settled bridgeless asset movement',
  'disclaimer.notclaimed.item.4': 'Verified Ika settlement of native cross-chain assets',
  'disclaimer.notclaimed.item.5': 'Audit, KYC, or regulated custody guarantees',

  // Final CTA
  'cta.kicker': 'Next steps',
  'cta.heading': 'Try the policy gate on devnet.',
  'cta.body':
    'Connect a devnet wallet, set a confidential policy, grant an agent session key, and run the three demo outcomes.',
  'cta.primary': 'Open App',
  'cta.secondary': 'View on GitHub',
  'cta.path.build.title': 'Build',
  'cta.path.build.audience': 'Developers',
  'cta.path.build.cta': 'Open App →',
  'cta.path.review.title': 'Review',
  'cta.path.review.audience': 'Hackathon reviewers',
  'cta.path.review.cta': 'Read demo script →',
  'cta.path.explore.title': 'Explore',
  'cta.path.explore.audience': 'Just curious',
  'cta.path.explore.cta': 'Try simulation →',

  // Footer
  'footer.brand.desc':
    'Confidential Solana control layer for AI agents. Private spending guardrails stay hidden, agents never receive unlimited wallet authority, and cross-chain signing requests cannot bypass on-chain policy.',
  'footer.badges.devnetLive': 'Devnet · Live',
  'footer.col.system.heading': 'System',
  'footer.col.system.network.label': 'Network',
  'footer.col.system.status.label': 'Status',
  'footer.col.system.version.label': 'Version',
  'footer.col.system.build.label': 'Build',
  'footer.col.rails.heading': 'Rails',
  'footer.col.rails.jupiter': 'Jupiter Strategy',
  'footer.col.rails.ika': 'Ika dWallet',
  'footer.col.rails.encrypt': 'Encrypt Policy',
  'footer.col.rails.smartwallet': 'Smart Wallet',
  'footer.col.resources.heading': 'Resources',
  'footer.col.resources.docs': 'Documentation',
  'footer.col.resources.github': 'GitHub',
  'footer.col.resources.twitter': 'Twitter / X',
  'footer.col.resources.disclaimer': 'Pre-Alpha Disclaimer',
  'footer.bottom.copyright': '© {year} Polet AI · All rights reserved',
  'footer.bottom.devnet': 'Devnet only · No production claims',
  'footer.community.heading': 'Community',
  'footer.community.x': 'Twitter / X',
  'footer.community.github': 'GitHub',
  'footer.community.discord': 'Discord',
  'footer.community.discordSoon': 'Coming soon',

  // Toggles
  'localeToggle.id': 'ID',
  'localeToggle.en': 'EN',
  'localeToggle.aria': 'Switch language',
  'themeToggle.aria.group': 'Theme',
  'themeToggle.aria.light': 'Use light theme',
  'themeToggle.aria.dark': 'Use dark theme',
  'themeToggle.aria.auto': 'Match system theme',
  'prefs.aria.trigger': 'Preferences',
  'prefs.theme.label': 'Theme',
  'prefs.locale.label': 'Language',
};

// ---------------------------------------------------------------------------
// Indonesian
// ---------------------------------------------------------------------------

const id: Dictionary = {
  // Header
  'header.nav.home': 'Beranda',
  'header.nav.app': 'App',
  'header.nav.howItWorks': 'Cara kerja',
  'header.nav.rails': 'Rails',
  'header.nav.demo': 'Demo',
  'header.nav.docs': 'Docs',
  'header.devnetPill': 'Devnet',
  'header.cta.openApp': 'Buka App',

  // Hero
  'hero.kicker': 'Lapisan wallet rahasia untuk AI agent',
  'hero.headline.line1': 'Kasih agent-mu budget.',
  'hero.headline.line2': 'Bukan wallet-mu.',
  'hero.headline.line2.a': 'Bukan kunci-mu.',
  'hero.headline.line2.b': 'Sembunyikan limit-nya.',
  'hero.headline.line2.c': 'Tanpa seed.',
  'hero.subhead':
    'Atur limit spending rahasia di smart-wallet PDA Solana. Kasih agent session key sementara. Jupiter DCA dan Ika dWallet signing lewat policy gate yang sama — tidak ada yang bocor, tidak ada yang bypass.',
  'hero.cta.primary': 'Mulai bangun',
  'hero.cta.secondary': 'Lihat policy gate-nya →',
  'hero.meta.devnet': 'Solana Devnet',
  'hero.meta.preAlpha': 'Pre-Alpha',
  'hero.meta.programLabel': 'Program',
  'hero.meta.testsPassing': '49+ tes lulus',
  'hero.meta.e2eVerified': 'Jupiter + Ika devnet terverifikasi',
  'hero.preview.aria':
    'Preview konsol wallet Polet menampilkan policy rahasia dengan limit angka ter-mask, sesi agent aktif, dan skenario 25 USDC diblokir.',
  'hero.preview.card.title': 'Policy rahasia',
  'hero.preview.row.maxPerRun': 'max per run',
  'hero.preview.row.dailyCap': 'daily cap',
  'hero.preview.row.sessionLabel': 'Sesi aktif',
  'hero.preview.row.blockedLabel': 'Diblokir',

  // Trust strip
  'trust.kicker': 'Dibangun dengan · Terintegrasi',
  'trust.colosseum.label': 'Berpartisipasi di Colosseum Frontier',

  // Stats
  'stats.kicker': 'Dalam angka',
  'stats.1.label': 'Tes lulus',
  'stats.1.sub': 'Frontend TS suite',
  'stats.2.label': 'Instruksi contract',
  'stats.2.sub': 'Satu program ID',
  'stats.3.label': 'Rail eksekusi',
  'stats.3.sub': 'Jupiter + Ika',
  'stats.4.label': 'Policy gate',
  'stats.4.sub': 'Rahasia, on-chain',

  // Manifesto / Problem
  'manifesto.kicker': 'Masalah delegasi',
  'manifesto.headlineLead': 'Kamu bangun DCA bot yang berjalan.',
  'manifesto.headlineRest': 'Sekarang dia butuh signing power.',
  'manifesto.body':
    'Ngasih wallet ke agent berarti menyerahkan segalanya — spending, allowlist, signing cross-chain, semua di bawah satu kunci. Tiga masalah struktural yang tiap tim bangun ulang dari nol:',
  'manifesto.problem1.title': 'Limit-mu ke-publish',
  'manifesto.problem1.desc':
    'Spending cap dan allowlist plaintext on-chain bisa diamati, di-front-run, dan dieksploitasi. Kompetitor agent tahu persis kapan dia berhenti.',
  'manifesto.problem2.title': 'Rule off-chain bisa di-bypass',
  'manifesto.problem2.desc':
    'Proxy terpercaya yang menegakkan policy-mu tinggal satu kompromi untuk hilang. Satu server key bocor, guardrail-nya lenyap.',
  'manifesto.problem3.title': 'Signing cross-chain tanpa gate',
  'manifesto.problem3.desc':
    'dWallet yang approve pesan apa pun berarti agent yang dikompromikan bisa menguras aset bridgeless lewat rail yang policy-mu tidak pernah lihat.',

  // Flow diagram
  'flow.kicker': 'Cara kerjanya',
  'flow.headline.lead': 'Satu contract. Satu policy gate.',
  'flow.headline.rest': 'Dua rail eksekusi.',
  'flow.body':
    'Owner deposit dana, set policy rahasia, kasih AI agent session key sementara. Setiap aksi agent — Solana DCA atau signing dWallet cross-chain — lewat guardrail on-chain yang sama sebelum dieksekusi.',
  'flow.aria':
    'Arsitektur Polet AI: owner set policy rahasia di smart wallet PDA Solana, kasih AI agent session key, lalu policy gate menegakkan guardrail sebelum Jupiter DCA atau signing Ika dWallet dijalankan.',
  'flow.node.owner.label': 'Owner',
  'flow.node.owner.sub': 'tanda tangan setup',
  'flow.node.pda.label': 'Smart Wallet PDA',
  'flow.node.pda.sub': 'seed: polet_wallet',
  'flow.node.policy.label': 'Policy Rahasia',
  'flow.node.policy.sub': 'numeric guardrail ter-masking',
  'flow.node.session.label': 'Session Key',
  'flow.node.session.sub': 'expires_at, slot',
  'flow.node.agent.label': 'AI Agent',
  'flow.node.agent.sub': 'submit intent',
  'flow.node.gate.label': 'Policy Gate',
  'flow.node.gate.sub': 'policy_seq · session · numeric guardrail',
  'flow.node.jupiter.label': 'Jupiter DCA',
  'flow.node.jupiter.sub': 'route/build preview',
  'flow.node.ika.label': 'Ika dWallet',
  'flow.node.ika.sub': 'CPI approve_message',

  // How you use Polet
  'howto.kicker': 'Cara memakai Polet',
  'howto.headline': 'Minute to first value.',
  'howto.step.1.title': 'Deposit ke smart wallet',
  'howto.step.1.desc': 'USDC dan SOL ke PDA yang dikontrol contract. Belum ada akses agent — dana di-custody di bawah program-derived address.',
  'howto.step.2.title': 'Set policy rahasia',
  'howto.step.2.desc': 'Max-per-run dan daily-cap terenkripsi on-chain. Threshold-nya tidak pernah keluar dari contract. Kamu bisa ubah kapan saja.',
  'howto.step.3.title': 'Kasih agent session key',
  'howto.step.3.desc': 'Otoritas signing sementara dengan expires_at. Agent trading dalam batas policy-mu. Revoke kapan saja dalam satu transaksi.',

  // Rails — Encrypt
  'rails.kicker': 'Tiga rail. Satu gate.',
  'rails.headline.lead': 'Satu policy gate.',
  'rails.headline.rest': 'Tiga rail eksekusi.',
  'rails.body':
    'Encrypt jaga limit tetap rahasia. Ika bawa signing lintas chain. Jupiter route trade-nya. Tiganya lewat gate on-chain yang sama sebelum satu lamport pun bergerak.',
  'rail.encrypt.title': 'Policy numeric rahasia',
  'rail.encrypt.body':
    'Max-per-run dan daily-cap tetap terenkripsi on-chain. Contract menegakkan guardrail sebelum spending apa pun tanpa pernah membocorkan threshold privat-mu — dibangun di atas Encrypt pre-alpha.',
  'rail.encrypt.bullet.1': 'Masked witness flow dengan sha256 commitment',
  'rail.encrypt.bullet.2': 'Migrasi EUint64 graph executor sedang berjalan (issue 041)',
  'rail.encrypt.bullet.3': 'policy_seq anti-replay di setiap perubahan state',
  'rail.encrypt.bullet.4': 'Threshold plaintext tidak pernah keluar dari contract',
  'rail.encrypt.ref': 'Referensi Encrypt',
  'rail.encrypt.mockTitle': 'contract/confidential_policy.rs',
  'rail.encrypt.mockAria':
    'Source Rust yang menunjukkan Polet enforce_confidential_numeric_policy memverifikasi witness hash dan men-decrypt max-per-run, daily-cap, daily-spent ter-masking sebelum mengecek amount yang melebihi limit.',

  // Rails — Ika
  'rail.ika.title': 'Signing cross-chain tanpa bridge',
  'rail.ika.body':
    'Setelah policy Polet approve, contract CPI-call Ika `approve_message` sehingga dWallet bisa signing multi-chain intent. Tanpa bridge, tanpa wrapping asset — murni signing kriptografis.',
  'rail.ika.bullet.1': 'Dukungan multi-chain',
  'rail.ika.bullet.2': 'Official Ika Pre-Alpha SDK dengan CPI authority PDA',
  'rail.ika.bullet.3': 'Verifikasi MessageApproval PDA di devnet',
  'rail.ika.bullet.4': 'Shared quorum M-of-N untuk approval didukung',
  'rail.ika.ref': 'Referensi Ika dWallet',
  'rail.ika.mockTitle': 'POST /intent/multichain/run · executionRail = ika',
  'rail.ika.mockAria':
    'Mock response approval Ika dWallet menampilkan bridgeless order yang disetujui, message hash, MessageApproval PDA, dan metadata signature scheme untuk intent multi-chain.',

  // Rails — Jupiter
  'rail.jupiter.title': 'Rail strategi DCA Solana',
  'rail.jupiter.body':
    'Tokens v2, Price v3, dan Swap v2 build dikombinasikan jadi route preview. Smart wallet PDA mengeksekusi instruction yang disetujui dengan kontrol penuh — tanpa kepercayaan signing off-chain.',
  'rail.jupiter.bullet.1': 'Strategi USDC → SOL DCA (bisa diperluas ke pair lain)',
  'rail.jupiter.bullet.2': 'Metadata Tokens v2 + pre-check verifikasi',
  'rail.jupiter.bullet.3': 'Swap v2 /build untuk komposisi instruction mentah',
  'rail.jupiter.bullet.4': 'ATA milik PDA untuk eksekusi custody langsung',
  'rail.jupiter.ref': 'Referensi Jupiter',
  'rail.jupiter.mockTitle': 'POST /intent/dca/run · 5 USDC → SOL',
  'rail.jupiter.mockAria':
    'Mock response Jupiter DCA yang disetujui menampilkan path eksekusi swap-build-fallback, amount output, route plan, dan transaksi smart wallet tanpa signature yang sudah policy-gated.',

  // Security
  'security.kicker': 'Model keamanan',
  'security.headline': 'Pertahanan berlapis, tanpa otoritas unilateral.',
  'security.body':
    'Smart wallet PDA Polet, model session-key, anti-replay, dan quorum multisig-lite membentuk satu sistem defensif yang tidak bisa di-override satu pihak manapun.',
  'security.threat.intro':
    'Anggap agent-nya dikompromikan. Anggap proxy-nya dikompromikan. Anggap session key bocor. Smart-wallet PDA Polet tetap yang memegang dana, policy rahasia tetap memblokir spend di atas limit, dan policy_seq tetap menolak attestation yang direplay.',
  'security.fact.pda.title': 'Smart wallet PDA',
  'security.fact.pda.desc':
    'Dana di-custody di bawah program-derived address. Contract — bukan agent — yang mengontrol eksekusi.',
  'security.fact.session.title': 'Session keys',
  'security.fact.session.desc':
    'Otoritas signing sementara dengan expires_at dan granted_slot. Revoke satu key atau semua sesi dalam satu transaksi.',
  'security.fact.replay.title': 'Anti-replay',
  'security.fact.replay.desc':
    'policy_seq naik setiap ada perubahan. Attestation basi ditolak sebelum spending apa pun.',
  'security.fact.quorum.title': 'Multisig & recovery',
  'security.fact.quorum.desc':
    'Opsional quorum M-of-N untuk approval Ika. Recovery authority merotasi sesi yang dikompromikan dan controller dWallet.',

  // Demo section
  'demo.kicker': 'Coba · tanpa perlu wallet',
  'demo.headline': 'Lihat policy gate dalam 30 detik.',
  'demo.body':
    'Jalankan tiga skenario demo melawan mock API. Skenario block menunjukkan bagaimana Polet menolak aksi agent di atas limit tanpa membocorkan threshold rahasia-mu.',
  'demo.pill.dca.desc':
    'Jupiter DCA dalam limit — Polet approve dan mengembalikan route/build tanpa signature.',
  'demo.pill.ika.desc':
    'Ika multi-chain dalam limit — Polet approve dan menyiapkan transaksi approval Ika dWallet.',
  'demo.pill.block.desc':
    'Di atas limit — diblokir. Tidak ada threshold yang bocor. Tidak ada data approval dWallet dibuat.',

  // Demo widget
  'demoWidget.header.badge': 'polet · mock api',
  'demoWidget.header.noWallet': 'tanpa wallet',
  'demoWidget.button.block.state.idle': 'block',
  'demoWidget.button.block.state.running': 'berjalan…',
  'demoWidget.button.jupiter.state.idle': 'allow',
  'demoWidget.button.jupiter.state.running': 'berjalan…',
  'demoWidget.button.ika.state.idle': 'allow',
  'demoWidget.button.ika.state.running': 'berjalan…',
  'demoWidget.button.block.ariaLabel': 'Jalankan skenario 25 USDC yang diblokir',
  'demoWidget.button.jupiter.ariaLabel': 'Jalankan skenario 5 USDC Jupiter yang diizinkan',
  'demoWidget.button.ika.ariaLabel': 'Jalankan skenario 5 USDC multi-chain Ika yang diizinkan',
  'demoWidget.state.idle.title': 'menunggu skenario',
  'demoWidget.state.idle.desc': 'Pilih salah satu dari tiga skenario di atas. Mock API merespons dalam ~500ms.',
  'demoWidget.state.running.label': 'policy gate mengevaluasi',
  'demoWidget.state.blocked.badge': 'Diblokir',
  'demoWidget.state.blocked.reason.jupiter':
    'Policy rahasia menolak run ini. Threshold dan sisa cap tetap privat.',
  'demoWidget.state.blocked.reason.ika':
    'Policy rahasia menolak request Ika ini. Tidak ada data approval dWallet dibuat.',
  'demoWidget.state.blocked.field.code': 'code:',
  'demoWidget.state.blocked.field.leak': 'threshold bocor:',
  'demoWidget.state.blocked.field.leakValue': 'tidak ada',
  'demoWidget.state.blocked.field.approval': 'approval dWallet:',
  'demoWidget.state.blocked.field.approvalValue': 'tidak dibuat',
  'demoWidget.state.allowed.jupiter.badge': 'Disetujui · Jupiter',
  'demoWidget.state.allowed.jupiter.body':
    'DCA dalam limit disetujui. Polet mengembalikan transaksi smart-wallet tanpa signature dengan route preview Jupiter.',
  'demoWidget.state.allowed.jupiter.field.input': 'input',
  'demoWidget.state.allowed.jupiter.field.output': 'est. output',
  'demoWidget.state.allowed.jupiter.field.route': 'route',
  'demoWidget.state.allowed.jupiter.field.execution': 'eksekusi',
  'demoWidget.state.allowed.ika.badge': 'Disetujui · Ika',
  'demoWidget.state.allowed.ika.body':
    'Ika multi-chain dalam limit disetujui. Polet menyiapkan transaksi approve_ika_message_as_session tanpa signature dan digest destination-chain. Settlement tidak dieksekusi.',
  'demoWidget.state.allowed.ika.field.amount': 'jumlah',
  'demoWidget.state.allowed.ika.field.target': 'target',
  'demoWidget.state.allowed.ika.field.targetValue': 'Multi-chain',
  'demoWidget.state.allowed.ika.field.messageHash': 'message hash',
  'demoWidget.state.allowed.ika.field.scheme': 'scheme',
  'demoWidget.reset': 'Reset',
  'demoWidget.footer.note':
    'Mock API · Tanpa private key · Tanpa dana asli · Jalankan di /app untuk flow devnet live',
  'demoWidget.simulation.badge': 'Simulasi · 0ms latency',
  'demoWidget.live.cta': 'Jalankan live di /app →',
  'demoWidget.live.aria.jupiter': 'Buka /app untuk menjalankan skenario Jupiter di devnet',
  'demoWidget.live.aria.ika': 'Buka /app untuk menjalankan skenario Ika di devnet',
  'demoWidget.live.aria.block': 'Buka /app untuk melihat skenario blocked lengkap di devnet',
  // DemoWidget v2 — Crypto-Blur Theater
  'demoWidget.theater.header.title': 'policy gate / 01',
  'demoWidget.theater.header.devnet': 'devnet \u00b7 live',
  'demoWidget.theater.idle.title': 'Pilih skenario untuk mulai',
  'demoWidget.theater.idle.desc':
    'Lihat policy gate mengevaluasi angka rahasia \u2014 nominal & rute agent berubah jadi ciphertext, gate evaluasi tanpa decrypt, hanya kamu yang bisa membuka kembali.',
  'demoWidget.theater.label.agentRequest': 'permintaan agent \u00b7 cleartext',
  'demoWidget.theater.label.sealing': 'menyegel \u00b7 enkripsi',
  'demoWidget.theater.label.sealed': 'tersegel \u00b7 ciphertext',
  'demoWidget.theater.label.evaluating': 'policy gate \u00b7 evaluasi',
  'demoWidget.theater.label.decrypting': 'membuka \u00b7 sisi kamu',
  'demoWidget.theater.label.revealed': 'terbuka \u00b7 cleartext',
  'demoWidget.theater.label.result': 'hasil',
  'demoWidget.theater.hint.cleartext': 'agent menyiapkan',
  'demoWidget.theater.hint.encrypting': 'glitch \u2192 hex',
  'demoWidget.theater.hint.encrypted': 'angka tersegel',
  'demoWidget.theater.hint.evaluating': 'cek constraint\u2026',
  'demoWidget.theater.hint.result': 'putusan keluar',
  'demoWidget.theater.hint.revealing': 'membuka lokal',
  'demoWidget.theater.hint.revealed': 'kamu lihat \u2014 server tidak',
  'demoWidget.theater.field.action': 'aksi',
  'demoWidget.theater.field.amount': 'nominal',
  'demoWidget.theater.field.target': 'target',
  'demoWidget.theater.field.route': 'rute',
  'demoWidget.theater.gate.title': 'policy gate \u00b7 evaluasi ciphertext',
  'demoWidget.theater.constraint.numericLimit': 'pi_numeric_limit',
  'demoWidget.theater.constraint.scopeMatch': 'pi_scope_match',
  'demoWidget.theater.constraint.sessionActive': 'pi_session_active',
  'demoWidget.theater.result.allowed': 'disetujui',
  'demoWidget.theater.result.allowed.body':
    'Policy gate menyetujui tanpa pernah melihat angka kamu. Komitmen ciphertext tercatat; unsigned tx siap.',
  'demoWidget.theater.result.blocked': 'diblok',
  'demoWidget.theater.result.blocked.body':
    'Limit numerik terlampaui. Nominal asli tetap tersegel \u2014 gate menolak tanpa pernah membaca cleartext.',
  'demoWidget.theater.result.code': 'kode',
  'demoWidget.theater.result.tx': 'tx',
  'demoWidget.theater.reveal.cta': 'Buka cleartext',
  'demoWidget.theater.reveal.confirmed': 'terdekripsi (hanya kamu)',
  'demoWidget.theater.reveal.note':
    'Server tetap hanya lihat ciphertext. Session key kamu decrypt secara lokal \u2014 tidak ada yang lain dapat angkanya.',
  'demoWidget.theater.reset': 'Reset',
  'demoWidget.theater.pick': 'pilih skenario',
  'demoWidget.scenario.block.label': 'Blok 25 USDC',
  'demoWidget.scenario.block.hint': 'Lewati limit harian',
  'demoWidget.scenario.jupiter.label': 'Jupiter DCA \u00b7 5',
  'demoWidget.scenario.jupiter.hint': 'Aman \u2192 unsigned tx',
  'demoWidget.scenario.ika.label': 'Ika \u00b7 5 X-chain',
  'demoWidget.scenario.ika.hint': 'Multi-chain via Ika',

  // Disclaimer
  'disclaimer.badge': 'Pre-Alpha',
  'disclaimer.kicker': 'Transparansi pre-alpha',
  'disclaimer.headline': 'Setiap klaim bisa diverifikasi di devnet.',
  'disclaimer.intro':
    'Kami tidak menyembunyikan status pre-alpha — kami tunjukkan persis apa yang bekerja sekarang, dan apa yang sengaja belum kami bangun. Kedua list ini memang sengaja pendek.',
  'disclaimer.real.heading': '● Terverifikasi di devnet',
  'disclaimer.real.item.1': 'Smart wallet PDA Solana, custody, flow session-key',
  'disclaimer.real.item.2': 'Enforcement policy numeric rahasia on-chain (devnet)',
  'disclaimer.real.item.3': '25 USDC diblokir / 5 USDC diizinkan end-to-end di devnet',
  'disclaimer.real.item.4': 'Jupiter Tokens, Price, dan Swap v2 build preview',
  'disclaimer.real.item.5': 'Lifecycle Ika approve_message CPI (SDK Pre-Alpha)',
  'disclaimer.notclaimed.heading': '○ Sengaja di luar scope',
  'disclaimer.notclaimed.item.1': 'Privasi FHE grade-produksi (Encrypt masih pre-alpha)',
  'disclaimer.notclaimed.item.2': 'MPC produksi (Ika Pre-Alpha pakai satu mock signer)',
  'disclaimer.notclaimed.item.3': 'Swap mainnet atau pergerakan aset bridgeless yang settled',
  'disclaimer.notclaimed.item.4': 'Settlement Ika terverifikasi untuk aset cross-chain native',
  'disclaimer.notclaimed.item.5': 'Audit, KYC, atau jaminan custody teregulasi',

  // Final CTA
  'cta.kicker': 'Langkah berikutnya',
  'cta.heading': 'Coba policy gate di devnet.',
  'cta.body':
    'Connect wallet devnet, set policy rahasia, kasih agent session key, dan jalankan tiga skenario demo.',
  'cta.primary': 'Buka App',
  'cta.secondary': 'Lihat di GitHub',
  'cta.path.build.title': 'Build',
  'cta.path.build.audience': 'Developer',
  'cta.path.build.cta': 'Buka App →',
  'cta.path.review.title': 'Review',
  'cta.path.review.audience': 'Reviewer hackathon',
  'cta.path.review.cta': 'Baca demo script →',
  'cta.path.explore.title': 'Jelajahi',
  'cta.path.explore.audience': 'Sekadar penasaran',
  'cta.path.explore.cta': 'Coba simulasi →',

  // Footer
  'footer.brand.desc':
    'Lapisan kontrol Solana yang rahasia untuk AI agent. Guardrail spending privat tetap tersembunyi, agent tidak pernah menerima otoritas wallet tak terbatas, dan request signing cross-chain tidak bisa bypass policy on-chain.',
  'footer.badges.devnetLive': 'Devnet · Live',
  'footer.col.system.heading': 'Sistem',
  'footer.col.system.network.label': 'Network',
  'footer.col.system.status.label': 'Status',
  'footer.col.system.version.label': 'Versi',
  'footer.col.system.build.label': 'Build',
  'footer.col.rails.heading': 'Rail',
  'footer.col.rails.jupiter': 'Strategi Jupiter',
  'footer.col.rails.ika': 'Ika dWallet',
  'footer.col.rails.encrypt': 'Policy Encrypt',
  'footer.col.rails.smartwallet': 'Smart Wallet',
  'footer.col.resources.heading': 'Sumber',
  'footer.col.resources.docs': 'Dokumentasi',
  'footer.col.resources.github': 'GitHub',
  'footer.col.resources.twitter': 'Twitter / X',
  'footer.col.resources.disclaimer': 'Disclaimer Pre-Alpha',
  'footer.bottom.copyright': '© {year} Polet AI · Hak cipta dilindungi',
  'footer.bottom.devnet': 'Hanya devnet · Tidak ada klaim produksi',
  'footer.community.heading': 'Komunitas',
  'footer.community.x': 'Twitter / X',
  'footer.community.github': 'GitHub',
  'footer.community.discord': 'Discord',
  'footer.community.discordSoon': 'Segera',

  // Toggles
  'localeToggle.id': 'ID',
  'localeToggle.en': 'EN',
  'localeToggle.aria': 'Ganti bahasa',
  'themeToggle.aria.group': 'Tema',
  'themeToggle.aria.light': 'Gunakan tema terang',
  'themeToggle.aria.dark': 'Gunakan tema gelap',
  'themeToggle.aria.auto': 'Ikuti tema sistem',
  'prefs.aria.trigger': 'Preferensi',
  'prefs.theme.label': 'Tema',
  'prefs.locale.label': 'Bahasa',
};

const dictionaries: Record<Locale, Dictionary> = { en, id };

export function getTranslation(locale: Locale, key: TranslationKey): string {
  const dict = dictionaries[locale];
  // EN is canonical so it always has the key. Defensive fallback for runtime safety.
  return dict[key] ?? dictionaries.en[key] ?? key;
}

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'id'] as const;

export function isSupportedLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'id';
}
