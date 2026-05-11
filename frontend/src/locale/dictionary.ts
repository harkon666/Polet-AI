/**
 * Translation dictionaries for Polet AI marketing surfaces.
 *
 * - `en` is the canonical source, every key MUST exist here. This is what
 *   `t()` falls back to when the active locale is missing a key.
 * - `id` is the Indonesian translation.
 *
 * Keys are flat dot-namespaced and grouped by section for discoverability:
 *   header.* · hero.* · trust.* · stats.* · manifesto.* · flow.* · rail.*
 *   security.* · demo.* · demoWidget.* · disclaimer.* · cta.* · footer.*
 *   localeToggle.* · themeToggle.*
 *
 * Dynamic interpolation (e.g. the footer copyright year) is handled in the
 * call site, dictionary values use `{placeholder}` strings and the caller
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
  | 'header.nav.menu.open'
  | 'header.nav.menu.close'
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
  // DemoWidget v2, Crypto-Blur Theater
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
  | 'footer.brand.tagline'
  | 'footer.brand.subtagline'
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
  | 'prefs.locale.label'
  // App console (v2 /app redesign — Setup Ledger + Two-Rail Console chrome)
  | 'app.ledger.kicker'
  | 'app.ledger.row.wallet'
  | 'app.ledger.row.custody'
  | 'app.ledger.row.policy'
  | 'app.ledger.row.session'
  | 'app.ledger.state.initialized'
  | 'app.ledger.state.registered'
  | 'app.ledger.state.sealed'
  | 'app.ledger.state.active'
  | 'app.ledger.state.pending'
  | 'app.ledger.empty.connectFirst'
  | 'app.console.rails.kicker'
  | 'app.rail.jupiter.disclaimer'
  | 'app.rail.ika.disclaimer'
  // App console — Day 10 layout pivot (mission ribbon + stat strip + onboarding wizard + advanced collapse)
  | 'app.ribbon.thesis'
  | 'app.ribbon.scope'
  | 'app.ribbon.dynamic.policyEnforces'
  | 'app.ribbon.dynamic.constraints'
  | 'app.ribbon.dynamic.sessionSingular'
  | 'app.ribbon.dynamic.sessionsPlural'
  | 'app.ribbon.dynamic.rails'
  | 'app.ribbon.dynamic.gateAwake'
  | 'app.ribbon.dynamic.gateDormant'
  | 'app.stat.pda'
  | 'app.stat.balance'
  | 'app.stat.policy'
  | 'app.stat.sessions'
  | 'app.stat.unit.active'
  | 'app.wizard.step'
  | 'app.wizard.of'
  | 'app.wizard.connect.title'
  | 'app.wizard.connect.body'
  | 'app.wizard.connect.pointer'
  | 'app.wizard.disabled.waiting'
  | 'app.advanced.label'
  // App console — Day 11 action wiring (Setup CTAs + Rail buttons + Receipt Log)
  | 'app.action.initialize'
  | 'app.action.initialize.loading'
  | 'app.action.registerCustody'
  | 'app.action.registerCustody.loading'
  | 'app.action.savePolicy'
  | 'app.action.savePolicy.loading'
  | 'app.action.grantSession'
  | 'app.action.grantSession.loading'
  | 'app.rail.jupiter.action.block'
  | 'app.rail.jupiter.action.block.loading'
  | 'app.rail.jupiter.action.allow'
  | 'app.rail.jupiter.action.allow.loading'
  | 'app.rail.ika.action.block'
  | 'app.rail.ika.action.block.loading'
  | 'app.rail.ika.action.allow'
  | 'app.rail.ika.action.allow.loading'
  | 'app.rail.ika.action.execute'
  | 'app.rail.ika.action.execute.loading'
  | 'app.rail.action.block.hint'
  | 'app.rail.action.allow.hint'
  | 'app.rail.jupiter.action.execute'
  | 'app.rail.jupiter.action.execute.loading'
  | 'app.rail.action.execute.hint'
  | 'app.chain.kicker'
  | 'app.chain.note'
  | 'app.chain.ready'
  | 'app.chain.waitPolicy'
  | 'app.chain.fixtureMissing'
  | 'app.chain.sui'
  | 'app.chain.ethereum'
  | 'app.chain.enabled'
  | 'app.chain.notEnabled'
  | 'app.chain.curve'
  | 'app.chain.dwallet'
  | 'app.chain.gas'
  | 'app.chain.gasReady'
  | 'app.chain.gasNeedsFunding'
  | 'app.chain.gasUnknown'
  | 'app.chain.enable.sui'
  | 'app.chain.enable.ethereum'
  | 'app.chain.enable.loading'
  | 'app.log.kicker'
  | 'app.log.tagline'
  | 'app.log.empty'
  | 'app.log.empty.gateAwake'
  | 'app.log.empty.hint'
  | 'app.agent.kicker'
  | 'app.agent.title'
  | 'app.agent.body'
  | 'app.agent.tools'
  | 'app.agent.config'
  | 'app.agent.copy'
  | 'app.agent.copied'
  | 'app.agent.ready'
  | 'app.agent.needsSession'
  | 'app.agent.tool.balance'
  | 'app.agent.tool.status'
  | 'app.agent.tool.enableChain'
  | 'app.agent.tool.trade'
  | 'app.agent.tool.execute'
  // Polish bundle (Day 11.5): constraint tooltips, session keypair affordances, spinner labels
  | 'app.constraint.numericLimit.tooltip'
  | 'app.constraint.scopeMatch.tooltip'
  | 'app.constraint.sessionActive.tooltip'
  | 'app.constraint.numericLimit.short'
  | 'app.constraint.scopeMatch.short'
  | 'app.constraint.sessionActive.short'
  | 'app.ledger.group.runtime'
  | 'app.session.download'
  | 'app.session.copy.public'
  | 'app.session.copy.secret'
  | 'app.session.copied'
  | 'app.session.devnetWarning'
  | 'app.session.lostKeyNote'
  | 'app.action.regrant'
  | 'app.action.regrant.loading'
  | 'app.session.fundGas'
  | 'app.session.fundGas.loading'
  | 'app.custody.strip.label'
  | 'app.custody.deposit.usdc'
  | 'app.custody.deposit.sol'
  | 'app.custody.deposit.loading'
  | 'app.custody.withdraw.usdc'
  | 'app.custody.withdraw.sol'
  | 'app.custody.withdraw.loading'
  | 'app.session.presence.noActivity'
  | 'app.session.presence.active'
  | 'app.session.presence.ago'
  | 'app.session.presence.idle'
  // Polet Portal — Phase 1 (issue 099)
  | 'portal.brand.name'
  | 'portal.brand.kicker'
  | 'portal.connect.kicker'
  | 'portal.connect.title'
  | 'portal.connect.body'
  | 'portal.nav.workspace'
  | 'portal.nav.gate'
  | 'portal.nav.funds'
  | 'portal.nav.proof'
  | 'portal.nav.bridge'
  | 'portal.sidebar.section.pages'
  | 'portal.sidebar.section.runtime'
  | 'portal.sidebar.runtime.devnet'
  | 'portal.sidebar.runtime.proxy'
  | 'portal.sidebar.runtime.policy'
  | 'portal.sidebar.runtime.session'
  | 'portal.sidebar.runtime.online'
  | 'portal.sidebar.runtime.placeholder'
  | 'portal.placeholder.kicker.workspace'
  | 'portal.placeholder.kicker.gate'
  | 'portal.placeholder.kicker.funds'
  | 'portal.placeholder.kicker.proof'
  | 'portal.placeholder.kicker.bridge'
  | 'portal.placeholder.title.workspace'
  | 'portal.placeholder.title.gate'
  | 'portal.placeholder.title.funds'
  | 'portal.placeholder.title.proof'
  | 'portal.placeholder.title.bridge'
  | 'portal.placeholder.sub.workspace'
  | 'portal.placeholder.sub.gate'
  | 'portal.placeholder.sub.funds'
  | 'portal.placeholder.sub.proof'
  | 'portal.placeholder.sub.bridge'
  | 'portal.placeholder.pending'
  // Polet Portal — Phase 2 (issue 100)
  | 'portal.workspace.kicker'
  | 'portal.workspace.status.ready'
  | 'portal.workspace.status.pending'
  | 'portal.workspace.title.ready'
  | 'portal.workspace.title.needsWallet'
  | 'portal.workspace.title.needsCustody'
  | 'portal.workspace.title.needsPolicy'
  | 'portal.workspace.title.needsSession'
  | 'portal.workspace.title.needsGas'
  | 'portal.workspace.sub.ready'
  | 'portal.workspace.sub.needsWallet'
  | 'portal.workspace.sub.needsCustody'
  | 'portal.workspace.sub.needsPolicy'
  | 'portal.workspace.sub.needsSession'
  | 'portal.workspace.sub.needsGas'
  | 'portal.readiness.label.wallet'
  | 'portal.readiness.label.custody'
  | 'portal.readiness.label.policy'
  | 'portal.readiness.label.session'
  | 'portal.readiness.label.gas'
  | 'portal.readiness.state.done'
  | 'portal.readiness.state.needs'
  | 'portal.readiness.state.pending'
  | 'portal.workspace.cta.openFunds'
  | 'portal.workspace.cta.openGate'
  | 'portal.workspace.cta.openBridge'
  | 'portal.workspace.cta.openProof'
  | 'portal.workspace.cta.compose'
  | 'portal.workspace.activity.latest'
  | 'portal.workspace.activity.empty'
  | 'portal.workspace.activity.openProof'
  // Polet Portal — Agent Access (BYO) section
  | 'portal.workspace.agentAccess.kicker'
  | 'portal.workspace.agentAccess.title'
  | 'portal.workspace.agentAccess.sub'
  | 'portal.workspace.agentAccess.empty'
  | 'portal.workspace.agentAccess.authorize'
  | 'portal.workspace.agentAccess.form.pubkey.label'
  | 'portal.workspace.agentAccess.form.pubkey.placeholder'
  | 'portal.workspace.agentAccess.form.pubkey.help'
  | 'portal.workspace.agentAccess.form.expires.label'
  | 'portal.workspace.agentAccess.form.expires.option1h'
  | 'portal.workspace.agentAccess.form.expires.option24h'
  | 'portal.workspace.agentAccess.form.expires.option7d'
  | 'portal.workspace.agentAccess.form.dailyLimit.label'
  | 'portal.workspace.agentAccess.form.dailyLimit.help'
  | 'portal.workspace.agentAccess.form.submit'
  | 'portal.workspace.agentAccess.form.cancel'
  | 'portal.workspace.agentAccess.row.active'
  | 'portal.workspace.agentAccess.row.revoked'
  | 'portal.workspace.agentAccess.row.expiresIn'
  | 'portal.workspace.agentAccess.row.expired'
  | 'portal.workspace.agentAccess.row.revoke'
  | 'portal.workspace.agentAccess.row.showConfig'
  | 'portal.workspace.agentAccess.row.hideConfig'
  | 'portal.workspace.agentAccess.config.warning'
  | 'portal.workspace.agentAccess.config.polet'
  | 'portal.workspace.agentAccess.config.mcp'
  | 'portal.workspace.agentAccess.config.hermes'
  | 'portal.workspace.agentAccess.config.copy'
  | 'portal.workspace.agentAccess.config.copied'
  // Polet Portal — Policy Rules section
  | 'portal.workspace.policyRules.kicker'
  | 'portal.workspace.policyRules.title'
  | 'portal.workspace.policyRules.sub'
  | 'portal.workspace.policyRules.status.sealed'
  | 'portal.workspace.policyRules.status.notSealed'
  | 'portal.workspace.policyRules.field.maxPerRun.label'
  | 'portal.workspace.policyRules.field.maxPerRun.help'
  | 'portal.workspace.policyRules.field.dailyCap.label'
  | 'portal.workspace.policyRules.field.dailyCap.help'
  | 'portal.workspace.policyRules.field.dailySpent.label'
  | 'portal.workspace.policyRules.reveal'
  | 'portal.workspace.policyRules.hide'
  | 'portal.workspace.policyRules.revealedNote'
  | 'portal.workspace.policyRules.submit'
  | 'portal.workspace.policyRules.notInitialized'
  // Polet Portal — Phase 3 (issue 101) — Policy Gate
  | 'portal.gate.kicker'
  | 'portal.gate.title'
  | 'portal.gate.sub'
  | 'portal.gate.status.ready'
  | 'portal.gate.status.allowed'
  | 'portal.gate.status.blocked'
  | 'portal.gate.status.evaluating'
  | 'portal.gate.composer.run'
  | 'portal.gate.composer.through'
  | 'portal.gate.composer.unit'
  | 'portal.gate.rail.jupiter'
  | 'portal.gate.rail.ika'
  | 'portal.gate.scenario.allowJupiter'
  | 'portal.gate.scenario.block25'
  | 'portal.gate.scenario.ikaSui'
  | 'portal.gate.flow.node1.kicker'
  | 'portal.gate.flow.node1.title.jupiter'
  | 'portal.gate.flow.node1.title.ika'
  | 'portal.gate.flow.node1.body.jupiter'
  | 'portal.gate.flow.node1.body.ika'
  | 'portal.gate.flow.node1.row.amount'
  | 'portal.gate.flow.node1.row.route'
  | 'portal.gate.flow.node1.row.session'
  | 'portal.gate.flow.node1.route.jupiter'
  | 'portal.gate.flow.node1.route.ika'
  | 'portal.gate.flow.node1.session.placeholder'
  | 'portal.gate.flow.node2.kicker'
  | 'portal.gate.flow.node2.check.session'
  | 'portal.gate.flow.node2.check.policy'
  | 'portal.gate.flow.node2.check.limit'
  | 'portal.gate.flow.node2.value.sessionActive'
  | 'portal.gate.flow.node2.value.sessionInactive'
  | 'portal.gate.flow.node2.value.policyFresh'
  | 'portal.gate.flow.node2.value.policyEmpty'
  | 'portal.gate.orb.kicker'
  | 'portal.gate.orb.allow'
  | 'portal.gate.orb.block'
  | 'portal.gate.orb.ready'
  | 'portal.gate.orb.evaluating'
  | 'portal.gate.flow.node3.kicker'
  | 'portal.gate.flow.node3.title.jupiter'
  | 'portal.gate.flow.node3.title.ika'
  | 'portal.gate.flow.node3.body.idle'
  | 'portal.gate.flow.node3.body.allowed'
  | 'portal.gate.flow.node3.body.blocked'
  | 'portal.gate.flow.node3.body.evaluating'
  | 'portal.gate.flow.node3.verdict.allow'
  | 'portal.gate.flow.node3.verdict.block'
  | 'portal.gate.flow.node3.verdict.idle'
  | 'portal.gate.flow.node3.verdict.evaluating'
  | 'portal.gate.actions.preview'
  | 'portal.gate.actions.tryBlocked'
  | 'portal.gate.actions.execute'
  | 'portal.gate.actions.disabledNoSession'
  | 'portal.gate.actions.disabledNoSessionKey'
  | 'portal.gate.actions.disabledNoIkaChain'
  // === Phase 4 keys (issue 102 — Funds & Setup). Insert below. ===
  | 'portal.funds.kicker'
  | 'portal.funds.title'
  | 'portal.funds.sub'
  | 'portal.funds.pill'
  | 'portal.funds.column.fundsTitle'
  | 'portal.funds.column.setupTitle'
  | 'portal.funds.list.label'
  | 'portal.funds.row.usdc.title'
  | 'portal.funds.row.usdc.sub'
  | 'portal.funds.row.sol.title'
  | 'portal.funds.row.sol.sub'
  | 'portal.funds.row.gas.title'
  | 'portal.funds.row.gas.sub'
  | 'portal.funds.row.gas.value.done'
  | 'portal.funds.row.gas.value.needs'
  | 'portal.funds.row.gas.value.pending'
  | 'portal.funds.row.ika.title'
  | 'portal.funds.row.ika.sub'
  | 'portal.funds.row.ika.value.pending'
  | 'portal.funds.actions.deposit'
  | 'portal.funds.actions.withdraw'
  | 'portal.funds.actions.fundGas'
  | 'portal.funds.actions.enableChain'
  | 'portal.funds.setup.label'
  | 'portal.funds.setup.pda.title'
  | 'portal.funds.setup.pda.sub'
  | 'portal.funds.setup.pda.action'
  | 'portal.funds.setup.custody.title'
  | 'portal.funds.setup.custody.sub'
  | 'portal.funds.setup.custody.action'
  | 'portal.funds.setup.custody.value.funded'
  | 'portal.funds.setup.policy.title'
  | 'portal.funds.setup.policy.sub'
  | 'portal.funds.setup.policy.action'
  | 'portal.funds.setup.session.title'
  | 'portal.funds.setup.session.sub'
  | 'portal.funds.setup.session.action'
  | 'portal.funds.setup.session.regrant'
  | 'portal.funds.setup.authority.title'
  | 'portal.funds.setup.authority.sub'
  // === Phase 5 keys (issue 103 — Proof Trail). Insert below. ===
  | 'portal.proof.kicker'
  | 'portal.proof.title'
  | 'portal.proof.sub'
  | 'portal.proof.pill.empty'
  | 'portal.proof.pill.singular'
  | 'portal.proof.pill.plural'
  | 'portal.proof.timeline.empty.title'
  | 'portal.proof.timeline.empty.body'
  | 'portal.proof.row.expand'
  | 'portal.proof.row.collapse'
  | 'portal.proof.row.explorer'
  | 'portal.proof.tag.info'
  | 'portal.proof.tag.allowed'
  | 'portal.proof.tag.blocked'
  | 'portal.proof.tag.pending'
  | 'portal.proof.tag.error'
  // === Phase 6 keys (issue 104 — Agent Bridge). Insert below. ===
  | 'portal.bridge.kicker'
  | 'portal.bridge.title'
  | 'portal.bridge.sub'
  | 'portal.bridge.pill'
  | 'portal.bridge.config.title'
  | 'portal.bridge.config.copy'
  | 'portal.bridge.config.copied'
  | 'portal.bridge.config.ready'
  | 'portal.bridge.config.needsSession'
  | 'portal.bridge.config.openFunds'
  | 'portal.bridge.tools.title'
  | 'portal.bridge.download.button'
  | 'portal.bridge.download.ready'
  | 'portal.bridge.download.needsSession'
  | 'portal.bridge.download.openFunds'
  | 'portal.bridge.advanced.kicker'
  | 'portal.bridge.advanced.summary'
  | 'portal.bridge.advanced.panel.kicker'
  | 'portal.bridge.advanced.panel.title'
  | 'portal.bridge.advanced.panel.body'
  | 'portal.bridge.advanced.flow.recovery.title'
  | 'portal.bridge.advanced.flow.recovery.body'
  | 'portal.bridge.advanced.flow.quorum.title'
  | 'portal.bridge.advanced.flow.quorum.body'
  | 'portal.bridge.advanced.flow.encrypt.title'
  | 'portal.bridge.advanced.flow.encrypt.body'
  | 'portal.bridge.advanced.signal.wallet'
  | 'portal.bridge.advanced.signal.policy'
  | 'portal.bridge.advanced.signal.session'
  | 'portal.bridge.advanced.signal.ready'
  | 'portal.bridge.advanced.signal.missing'
  | 'portal.bridge.advanced.legacy.kicker'
  | 'portal.bridge.advanced.legacy.summary'
  | 'portal.bridge.advanced.legacy.body'
  // === Phase 7 keys (issue 105 — Mobile drawer + i18n sweep). Insert below. ===
  | 'portal.drawer.open'
  | 'portal.drawer.close'
  | 'portal.drawer.backdrop'
  ;

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
  'header.nav.menu.open': 'Open menu',
  'header.nav.menu.close': 'Close menu',
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
    'Set a private spending limit on a Solana smart-wallet PDA. Grant a temporary session key. Jupiter DCA and Ika dWallet signings all pass the same on-chain policy gate, nothing leaks, nothing bypasses.',
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
    'Giving your agent a wallet means giving up everything, spending, allowlists, cross-chain signing, all under one key. Three structural problems every team rebuilds from scratch:',
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
    'Owner deposits funds, sets a confidential policy, grants the AI agent a temporary session key. Every agent action, Solana DCA or cross-chain dWallet signing, passes through the same on-chain guardrail before execution.',
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
  'howto.step.1.desc': 'USDC and SOL into a PDA the contract controls. No agent access yet, funds custody under program-derived address.',
  'howto.step.2.title': 'Save a confidential policy',
  'howto.step.2.desc': 'Max-per-run and daily-cap encrypted on-chain. The threshold never leaves the contract. You can change it anytime.',
  'howto.step.3.title': 'Grant an agent session key',
  'howto.step.3.desc': 'Temporary signing authority with expires_at. The agent trades within your policy. Revoke any time in one transaction.',

  // Rails, Encrypt
  'rails.kicker': 'Three rails. One gate.',
  'rails.headline.lead': 'One policy gate.',
  'rails.headline.rest': 'Three execution surfaces.',
  'rails.body':
    'Encrypt keeps the limits private. Ika carries the signing across chains. Jupiter routes the trade. All three pass through the same on-chain gate before a single lamport moves.',
  'rail.encrypt.title': 'Confidential numeric policy',
  'rail.encrypt.body':
    'Max-per-run and daily-cap stay encrypted on-chain. The contract enforces the guardrail before any spend without ever revealing your private thresholds, built against Encrypt pre-alpha.',
  'rail.encrypt.bullet.1': 'Masked witness flow with sha256 commitment',
  'rail.encrypt.bullet.2': 'EUint64 graph executor migration in flight (issue 041)',
  'rail.encrypt.bullet.3': 'policy_seq anti-replay on every state change',
  'rail.encrypt.bullet.4': 'No plaintext threshold ever leaves the contract',
  'rail.encrypt.ref': 'Encrypt reference',
  'rail.encrypt.mockTitle': 'contract/confidential_policy.rs',
  'rail.encrypt.mockAria':
    'Rust source showing Polet enforce_confidential_numeric_policy verifying a witness hash and decrypting masked max-per-run, daily-cap, daily-spent before checking an over-limit amount.',

  // Rails, Ika
  'rail.ika.title': 'Bridgeless cross-chain signing',
  'rail.ika.body':
    'After Polet policy approves, the contract CPI-calls Ika `approve_message` so a dWallet can sign multi-chain intents. No bridge, no asset wrapping, pure cryptographic signing.',
  'rail.ika.bullet.1': 'Multi-chain support',
  'rail.ika.bullet.2': 'Official Ika Pre-Alpha SDK with CPI authority PDA',
  'rail.ika.bullet.3': 'MessageApproval PDA verification on devnet',
  'rail.ika.bullet.4': 'Shared M-of-N approval quorum supported',
  'rail.ika.ref': 'Ika dWallet reference',
  'rail.ika.mockTitle': 'POST /intent/multichain/run · executionRail = ika',
  'rail.ika.mockAria':
    'Mock Ika dWallet approval response showing an approved bridgeless order, message hash, MessageApproval PDA, and signature scheme metadata for a multi-chain intent.',

  // Rails, Jupiter
  'rail.jupiter.title': 'Solana DCA strategy rail',
  'rail.jupiter.body':
    'Tokens v2, Price v3, and Swap v2 build composed into a route preview. The smart wallet PDA executes the approved instruction with raw control, no off-chain signing trust.',
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
    'Funds custody under a program-derived address. The contract, not the agent, controls execution.',
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
    'In-limit Jupiter DCA, Polet approves and returns an unsigned route/build.',
  'demo.pill.ika.desc':
    'In-limit multi-chain Ika, Polet approves and prepares an Ika dWallet approval transaction.',
  'demo.pill.block.desc':
    'Over-limit, blocked. No threshold leak. No dWallet approval data created.',

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
  // DemoWidget v2, Crypto-Blur Theater
  'demoWidget.theater.header.title': 'policy gate / 01',
  'demoWidget.theater.header.devnet': 'devnet \u00b7 live',
  'demoWidget.theater.idle.title': 'Pick a scenario to begin',
  'demoWidget.theater.idle.desc':
    'Watch the policy gate evaluate confidential numbers, the agent\u2019s amounts and routes glitch into ciphertext, the gate evaluates blind, and only you can decrypt.',
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
  'demoWidget.theater.hint.revealed': 'you saw, server didn\u2019t',
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
    'Numeric limit exceeded. Original amount stays sealed, the gate said no without ever reading the cleartext.',
  'demoWidget.theater.result.code': 'code',
  'demoWidget.theater.result.tx': 'tx',
  'demoWidget.theater.reveal.cta': 'Reveal cleartext',
  'demoWidget.theater.reveal.confirmed': 'decrypted (you only)',
  'demoWidget.theater.reveal.note':
    'Server still sees only the ciphertext. Your session key decrypted locally, nobody else got the numbers.',
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
    'We don\'t hide pre-alpha status, we show you exactly what works now, and what we deliberately haven\'t built yet. Both lists are short on purpose.',
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
  'footer.brand.tagline': 'Confidential smart wallet for AI agents on Solana.',
  'footer.brand.subtagline': 'Policy-gated. No unlimited authority.',
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

  // App console
  'app.ledger.kicker': 'Setup ledger',
  'app.ledger.row.wallet': 'Wallet',
  'app.ledger.row.custody': 'Custody',
  'app.ledger.row.policy': 'Policy',
  'app.ledger.row.session': 'Session',
  'app.ledger.state.initialized': 'INITIALIZED',
  'app.ledger.state.registered': 'REGISTERED',
  'app.ledger.state.sealed': 'SEALED',
  'app.ledger.state.active': 'ACTIVE',
  'app.ledger.state.pending': 'PENDING',
  'app.ledger.empty.connectFirst': 'Connect a devnet wallet to begin.',
  'app.console.rails.kicker': 'Rails · Gated by policy',
  'app.rail.jupiter.disclaimer': 'DEVNET PREVIEW · NOT MAINNET',
  'app.rail.ika.disclaimer': 'PRE-ALPHA · NOT MPC SETTLEMENT',

  // App console — Day 10 layout pivot
  'app.ribbon.thesis': 'Three rails · One gate',
  'app.ribbon.scope': 'Devnet preview · Policy-gated',
  'app.ribbon.dynamic.policyEnforces': 'Policy enforces',
  'app.ribbon.dynamic.constraints': 'constraints',
  'app.ribbon.dynamic.sessionSingular': 'active session',
  'app.ribbon.dynamic.sessionsPlural': 'active sessions',
  'app.ribbon.dynamic.rails': 'rails',
  'app.ribbon.dynamic.gateAwake': 'gate awake',
  'app.ribbon.dynamic.gateDormant': 'gate dormant',
  'app.stat.pda': 'PDA',
  'app.stat.balance': 'SOL Balance',
  'app.stat.policy': 'Policy seq',
  'app.stat.sessions': 'Sessions',
  'app.stat.unit.active': 'active',
  'app.wizard.step': 'Step',
  'app.wizard.of': 'of',
  'app.wizard.connect.title': 'Connect a devnet wallet',
  'app.wizard.connect.body':
    'Polet stores your limits as ciphertext; the gate evaluates blind. Connect a devnet wallet to derive your smart-wallet PDA and start the four-step setup.',
  'app.wizard.connect.pointer': 'Connect to begin',
  'app.wizard.disabled.waiting': 'waiting for wallet',
  'app.advanced.label': 'Advanced · Full control console',

  // Action buttons (Day 11)
  'app.action.initialize': 'Initialize',
  'app.action.initialize.loading': 'Initializing…',
  'app.action.registerCustody': 'Register',
  'app.action.registerCustody.loading': 'Registering…',
  'app.action.savePolicy': 'Save policy',
  'app.action.savePolicy.loading': 'Saving…',
  'app.action.grantSession': 'Grant session',
  'app.action.grantSession.loading': 'Granting…',

  // Rail action buttons (Day 11)
  'app.rail.jupiter.action.block': 'Try 25 USDC',
  'app.rail.jupiter.action.block.loading': 'Submitting…',
  'app.rail.jupiter.action.allow': 'Run 5 USDC',
  'app.rail.jupiter.action.allow.loading': 'Quoting…',
  'app.rail.ika.action.block': 'Try 25 USDC',
  'app.rail.ika.action.block.loading': 'Submitting…',
  'app.rail.ika.action.allow': 'Approve 5 USDC',
  'app.rail.ika.action.allow.loading': 'Preparing…',
  'app.rail.ika.action.execute': 'Execute Ika lifecycle',
  'app.rail.ika.action.execute.loading': 'Progressing…',
  'app.rail.action.block.hint': 'Over confidential cap',
  'app.rail.action.allow.hint': 'Within confidential cap',
  'app.rail.jupiter.action.execute': 'Execute 5 USDC',
  'app.rail.jupiter.action.execute.loading': 'Broadcasting…',
  'app.rail.action.execute.hint': 'Sign + broadcast on devnet',
  'app.chain.kicker': 'Ika chain status',
  'app.chain.note':
    'Managed demo mode maps one active dWallet curve at a time before real Ika lifecycle execution.',
  'app.chain.ready': 'Ready to enable',
  'app.chain.waitPolicy': 'Seal policy first',
  'app.chain.fixtureMissing': 'Managed fixture missing',
  'app.chain.sui': 'Sui devnet',
  'app.chain.ethereum': 'Ethereum Sepolia',
  'app.chain.enabled': 'Enabled',
  'app.chain.notEnabled': 'Not enabled',
  'app.chain.curve': 'Curve',
  'app.chain.dwallet': 'dWallet',
  'app.chain.gas': 'Gas',
  'app.chain.gasReady': 'Gas deposit ready',
  'app.chain.gasNeedsFunding': 'Gas needs funding',
  'app.chain.gasUnknown': 'Gas unknown',
  'app.chain.enable.sui': 'Enable Sui',
  'app.chain.enable.ethereum': 'Enable Ethereum',
  'app.chain.enable.loading': 'Enabling…',

  // Receipt log (Day 11)
  'app.log.kicker': 'Receipt log',
  'app.log.tagline': 'nothing leaks, nothing bypasses',
  'app.log.empty': 'No actions yet, run a setup step or rail to begin.',
  'app.log.empty.gateAwake': 'Policy gate is awake',
  'app.log.empty.hint': 'No agent activity yet — try Run 5 USDC to see verdict',
  'app.agent.kicker': 'Agent integration',
  'app.agent.title': 'Paste-ready MCP bridge',
  'app.agent.body':
    'Copy this config into Claude Desktop, Cursor, Zed, or any MCP-capable agent to bind the same session key to Polet.',
  'app.agent.tools': 'MCP tools',
  'app.agent.config': 'Claude Desktop mcp.json',
  'app.agent.copy': 'Copy config',
  'app.agent.copied': 'Copied',
  'app.agent.ready': 'Session secret is present in this tab. Treat this as devnet-only.',
  'app.agent.needsSession': 'Grant or re-grant an agent session first so the config includes a real keypair.',
  'app.agent.tool.balance': 'Read custody balances plus owner and agent gas buckets.',
  'app.agent.tool.status': 'Inspect policy, session, Ika signer, and GasDeposit readiness.',
  'app.agent.tool.enableChain': 'Enable Sui or Ethereum managed Ika signer.',
  'app.agent.tool.trade': 'Preview a policy-gated trade without broadcasting.',
  'app.agent.tool.execute': 'Execute Jupiter or Ika end-to-end with the configured session signer.',
  // Polish (Day 11.5)
  'app.constraint.numericLimit.tooltip':
    'pi_numeric_limit — confidential max-per-run and daily-cap check. Thresholds stay encrypted on-chain; only pass/fail leaves the gate.',
  'app.constraint.scopeMatch.tooltip':
    'pi_scope_match — source/target asset and chain allowlist plus route-risk guardrails (slippage, price impact, liquidity).',
  'app.constraint.sessionActive.tooltip':
    'pi_session_active — session not expired, not revoked, and grantedSlot is greater than or equal to the wallet last-revoked slot.',
  'app.constraint.numericLimit.short':
    'Confidential max-per-run + daily-cap check',
  'app.constraint.scopeMatch.short':
    'Asset/chain allowlist + route-risk guards',
  'app.constraint.sessionActive.short':
    'Session valid, not expired or revoked',
  'app.ledger.group.runtime': 'Gate runtime',
  'app.session.download': 'Download polet-agent.json',
  'app.session.copy.public': 'Copy public key',
  'app.session.copy.secret': 'Copy secret',
  'app.session.copied': 'Copied',
  'app.session.devnetWarning': 'Devnet key, do not use on mainnet',
  'app.session.lostKeyNote':
    'Session was granted before the persistence fix. Re-grant to download polet-agent.json.',
  'app.action.regrant': 'Re-grant for download',
  'app.action.regrant.loading': 'Re-granting…',
  'app.session.fundGas': '+ Fund 0.05 SOL gas',
  'app.session.fundGas.loading': 'Funding…',
  'app.custody.strip.label': 'PDA custody funds',
  'app.custody.deposit.usdc': '+ Deposit 5 USDC',
  'app.custody.deposit.sol': '+ Deposit 0.05 SOL',
  'app.custody.deposit.loading': 'Depositing…',
  'app.custody.withdraw.usdc': 'Withdraw 1 USDC',
  'app.custody.withdraw.sol': 'Withdraw 0.01 SOL',
  'app.custody.withdraw.loading': 'Withdrawing…',
  'app.session.presence.noActivity': 'no activity yet',
  'app.session.presence.active': 'active',
  'app.session.presence.ago': 'ago',
  'app.session.presence.idle': 'idle',

  // Polet Portal — Phase 1 (issue 099)
  'portal.brand.name': 'Polet',
  'portal.brand.kicker': 'Portal',
  'portal.connect.kicker': 'Polet Portal',
  'portal.connect.title': 'Connect a devnet wallet to enter the portal.',
  'portal.connect.body':
    'Polet Portal is a confidential control layer for AI agents. Connect to set spending limits and grant a temporary session to your agent.',
  'portal.nav.workspace': 'Workspace',
  'portal.nav.gate': 'Policy Gate',
  'portal.nav.funds': 'Funds & Setup',
  'portal.nav.proof': 'Proof Trail',
  'portal.nav.bridge': 'Agent Bridge',
  'portal.sidebar.section.pages': 'Pages',
  'portal.sidebar.section.runtime': 'Runtime',
  'portal.sidebar.runtime.devnet': 'Devnet',
  'portal.sidebar.runtime.proxy': 'Proxy',
  'portal.sidebar.runtime.policy': 'Policy',
  'portal.sidebar.runtime.session': 'Session',
  'portal.sidebar.runtime.online': 'online',
  'portal.sidebar.runtime.placeholder': '—',
  'portal.placeholder.kicker.workspace': 'Workspace',
  'portal.placeholder.kicker.gate': 'Policy Gate',
  'portal.placeholder.kicker.funds': 'Funds & Setup',
  'portal.placeholder.kicker.proof': 'Proof Trail',
  'portal.placeholder.kicker.bridge': 'Agent Bridge',
  'portal.placeholder.title.workspace':
    'Your portal home will appear here.',
  'portal.placeholder.title.gate':
    'The policy gate composer arrives in Phase 3.',
  'portal.placeholder.title.funds':
    'Funds and owner setup arrive in Phase 4.',
  'portal.placeholder.title.proof':
    'The proof timeline arrives in Phase 5.',
  'portal.placeholder.title.bridge':
    'Agent bridge config arrives in Phase 6.',
  'portal.placeholder.sub.workspace':
    'Phase 2 wires this page to live readiness state.',
  'portal.placeholder.sub.gate':
    'Compose an intent, watch the sealed gate fire, then execute via Jupiter or Ika.',
  'portal.placeholder.sub.funds':
    'Two list columns: wallet map and owner setup. No card walls.',
  'portal.placeholder.sub.proof':
    'Type-driven evidence list with expandable Jupiter and Ika proof panels.',
  'portal.placeholder.sub.bridge':
    'Paste-ready MCP config plus the legacy advanced fallback.',
  'portal.placeholder.pending': 'phase pending',
  // Polet Portal — Phase 2 (issue 100) — Workspace home
  'portal.workspace.kicker': 'Workspace',
  'portal.workspace.status.ready': 'ready to execute',
  'portal.workspace.status.pending': 'setup pending',
  'portal.workspace.title.ready':
    'All rails ready. Compose a policy-gated intent.',
  'portal.workspace.title.needsWallet':
    'Initialize your smart-wallet PDA to begin.',
  'portal.workspace.title.needsCustody':
    'Fund custody with demo USDC so the policy has something to meter.',
  'portal.workspace.title.needsPolicy':
    'Seal your confidential numeric policy.',
  'portal.workspace.title.needsSession':
    'Authorize a time-boxed agent session key.',
  'portal.workspace.title.needsGas':
    'Top up the session with gas so the agent can sign.',
  'portal.workspace.sub.ready':
    'Agents can now sign under policy via Jupiter DCA or Ika dWallet.',
  'portal.workspace.sub.needsWallet':
    'Polet custody, policy, and sessions all hang off your smart-wallet PDA.',
  'portal.workspace.sub.needsCustody':
    'Numeric policy only meters flows you can actually fund.',
  'portal.workspace.sub.needsPolicy':
    'Seal a private cap, quota, and cooldown the agent has to respect.',
  'portal.workspace.sub.needsSession':
    'Issue a session key so the agent can broadcast inside the cap.',
  'portal.workspace.sub.needsGas':
    'Agent session needs a sip of SOL before it can broadcast.',
  'portal.readiness.label.wallet': 'Wallet',
  'portal.readiness.label.custody': 'Custody',
  'portal.readiness.label.policy': 'Policy',
  'portal.readiness.label.session': 'Session',
  'portal.readiness.label.gas': 'Gas',
  'portal.readiness.state.done': 'ready',
  'portal.readiness.state.needs': 'needs funds',
  'portal.readiness.state.pending': 'pending',
  'portal.workspace.cta.openFunds': 'Open Funds & Setup',
  'portal.workspace.cta.openGate': 'Open Policy Gate',
  'portal.workspace.cta.openBridge': 'Open Agent Bridge',
  'portal.workspace.cta.openProof': 'Open Proof Trail',
  'portal.workspace.cta.compose': 'Compose an intent',
  'portal.workspace.activity.latest': 'Latest receipt',
  'portal.workspace.activity.empty':
    'No receipts yet — run your first rail from the Gate.',
  'portal.workspace.activity.openProof': 'Open Proof Trail',
  'portal.workspace.agentAccess.kicker': 'Section · Agent Access',
  'portal.workspace.agentAccess.title': 'Authorize Agent Wallet',
  'portal.workspace.agentAccess.sub': 'Paste the public key of an agent wallet you generated externally (Phantom, Backpack, Ledger, or solana-keygen). Polet never sees the private key. Revoke any authorized session at any time.',
  'portal.workspace.agentAccess.empty': 'No agent authorized. Grant a session to let an AI runtime (Hermes / Claude / Cursor) drive trades inside the policy.',
  'portal.workspace.agentAccess.authorize': 'Authorize agent',
  'portal.workspace.agentAccess.form.pubkey.label': 'Agent wallet address',
  'portal.workspace.agentAccess.form.pubkey.placeholder': 'Paste the agent wallet public key',
  'portal.workspace.agentAccess.form.pubkey.help': 'The contract calls this a session key. Functionally, it is the agent wallet public key authorized to sign trades inside the confidential policy.',
  'portal.workspace.agentAccess.form.expires.label': 'Expires in',
  'portal.workspace.agentAccess.form.expires.option1h': '1 hour',
  'portal.workspace.agentAccess.form.expires.option24h': '24 hours',
  'portal.workspace.agentAccess.form.expires.option7d': '7 days',
  'portal.workspace.agentAccess.form.dailyLimit.label': 'Legacy native-SOL daily limit',
  'portal.workspace.agentAccess.form.dailyLimit.help': 'Upper bound on the legacy native-SOL rail only. Confidential USDC policy (max-per-run + daily-cap) stays independent.',
  'portal.workspace.agentAccess.form.submit': 'Authorize',
  'portal.workspace.agentAccess.form.cancel': 'Cancel',
  'portal.workspace.agentAccess.row.active': 'Active',
  'portal.workspace.agentAccess.row.revoked': 'Revoked',
  'portal.workspace.agentAccess.row.expiresIn': 'expires in',
  'portal.workspace.agentAccess.row.expired': 'expired',
  'portal.workspace.agentAccess.row.revoke': 'Revoke',
  'portal.workspace.agentAccess.row.showConfig': 'Show MCP config',
  'portal.workspace.agentAccess.row.hideConfig': 'Hide MCP config',
  'portal.workspace.agentAccess.config.warning': 'The private key is never generated server-side. Paste the agent wallet private key yourself — export from Phantom (Settings → Security → Export Private Key), Backpack, or read from your solana-keygen file.',
  'portal.workspace.agentAccess.config.polet': 'polet-agent.json',
  'portal.workspace.agentAccess.config.mcp': 'Claude Desktop / Cursor / Zed MCP',
  'portal.workspace.agentAccess.config.hermes': 'Hermes CLI commands',
  'portal.workspace.agentAccess.config.copy': 'Copy',
  'portal.workspace.agentAccess.config.copied': 'Copied',
  'portal.workspace.policyRules.kicker': 'Section · Policy Rules',
  'portal.workspace.policyRules.title': 'Confidential Policy',
  'portal.workspace.policyRules.sub': 'Max per run and daily cap are stored as ciphertexts on-chain. Agents never see the numbers. Owner can reveal the current plaintext into this tab\u2019s memory (not stored, not logged).',
  'portal.workspace.policyRules.status.sealed': 'sealed #',
  'portal.workspace.policyRules.status.notSealed': 'not sealed yet',
  'portal.workspace.policyRules.field.maxPerRun.label': 'Max per run (USDC)',
  'portal.workspace.policyRules.field.maxPerRun.help': 'Per-trade confidential ceiling. Any single trade exceeding this amount is blocked by Encrypt before the rail executes.',
  'portal.workspace.policyRules.field.dailyCap.label': 'Daily cap (USDC)',
  'portal.workspace.policyRules.field.dailyCap.help': 'Rolling 24h sum of USDC traded. Encrypt blocks additional trades once this cap would be exceeded.',
  'portal.workspace.policyRules.field.dailySpent.label': 'Daily spent (USDC)',
  'portal.workspace.policyRules.reveal': 'Reveal',
  'portal.workspace.policyRules.hide': 'Hide',
  'portal.workspace.policyRules.revealedNote': 'Revealed to this tab only. Closes with the page.',
  'portal.workspace.policyRules.submit': 'Update policy',
  'portal.workspace.policyRules.notInitialized': 'Initialize the wallet + register custody first (see Funds page).',
  // Polet Portal — Phase 3 (issue 101) — Policy Gate
  'portal.gate.kicker': 'Policy Gate',
  'portal.gate.title': 'One sealed gate. Two execution rails.',
  'portal.gate.sub':
    'The agent proposes an action. Polet checks private limits, session freshness, and scope before Jupiter or Ika can continue.',
  'portal.gate.status.ready': 'ready to preview',
  'portal.gate.status.allowed': 'allowed by policy',
  'portal.gate.status.blocked': 'blocked by policy',
  'portal.gate.status.evaluating': 'evaluating',
  'portal.gate.composer.run': 'Run',
  'portal.gate.composer.through': 'through',
  'portal.gate.composer.unit': 'USDC',
  'portal.gate.rail.jupiter': 'Jupiter',
  'portal.gate.rail.ika': 'Ika · Sui',
  'portal.gate.scenario.allowJupiter': 'Allow Jupiter 5 USDC',
  'portal.gate.scenario.block25': 'Block 25 USDC',
  'portal.gate.scenario.ikaSui': 'Ika Sui approval',
  'portal.gate.flow.node1.kicker': '01 · Agent request',
  'portal.gate.flow.node1.title.jupiter': 'Buy SOL via Jupiter',
  'portal.gate.flow.node1.title.ika': 'Approve Ika dWallet message',
  'portal.gate.flow.node1.body.jupiter':
    'The AI agent asks to spend custody USDC with a temporary session key, never the owner wallet.',
  'portal.gate.flow.node1.body.ika':
    'The agent requests a dWallet message approval. Polet gates it before lifecycle progress and destination broadcast.',
  'portal.gate.flow.node1.row.amount': 'amount',
  'portal.gate.flow.node1.row.route': 'route',
  'portal.gate.flow.node1.row.session': 'session',
  'portal.gate.flow.node1.route.jupiter': 'USDC → SOL',
  'portal.gate.flow.node1.route.ika': 'Sui dWallet · sign',
  'portal.gate.flow.node1.session.placeholder': 'pending',
  'portal.gate.flow.node2.kicker': '02 · Sealed gate',
  'portal.gate.flow.node2.check.session': 'session',
  'portal.gate.flow.node2.check.policy': 'policy seq',
  'portal.gate.flow.node2.check.limit': 'limit',
  'portal.gate.flow.node2.value.sessionActive': 'active',
  'portal.gate.flow.node2.value.sessionInactive': 'pending',
  'portal.gate.flow.node2.value.policyFresh': 'fresh',
  'portal.gate.flow.node2.value.policyEmpty': 'unsealed',
  'portal.gate.orb.kicker': 'POLICY',
  'portal.gate.orb.allow': 'ALLOW',
  'portal.gate.orb.block': 'BLOCK',
  'portal.gate.orb.ready': 'READY',
  'portal.gate.orb.evaluating': '…',
  'portal.gate.flow.node3.kicker': '03 · Rail output',
  'portal.gate.flow.node3.title.jupiter': 'Jupiter transaction ready',
  'portal.gate.flow.node3.title.ika': 'Ika MessageApproval ready',
  'portal.gate.flow.node3.body.idle':
    'Route preview and execute will become available after the policy verdict passes.',
  'portal.gate.flow.node3.body.allowed':
    'Route preview and execute button are available. Owner policy remains sealed.',
  'portal.gate.flow.node3.body.blocked':
    'The policy gate rejected this intent before any rail output was created.',
  'portal.gate.flow.node3.body.evaluating':
    'Polet is evaluating the intent against the sealed policy.',
  'portal.gate.flow.node3.verdict.allow': 'ALLOWED',
  'portal.gate.flow.node3.verdict.block': 'BLOCKED',
  'portal.gate.flow.node3.verdict.idle': 'AWAITING',
  'portal.gate.flow.node3.verdict.evaluating': 'EVAL',
  'portal.gate.actions.preview': 'Preview gate',
  'portal.gate.actions.tryBlocked': 'Try blocked amount',
  'portal.gate.actions.execute': 'Execute with session key',
  'portal.gate.actions.disabledNoSession':
    'Authorize an agent session before previewing the gate.',
  'portal.gate.actions.disabledNoSessionKey':
    'A session keypair is required to broadcast — fund agent gas first.',
  'portal.gate.actions.disabledNoIkaChain':
    'Enable an Ika managed chain (Sui devnet) to execute via Ika.',
  // === Phase 4 keys (issue 102 — Funds & Setup). Insert below. ===
  'portal.funds.kicker': 'Funds & Setup',
  'portal.funds.title': 'Owner controls in two calm columns.',
  'portal.funds.sub':
    'Left: balances spendable by policy. Right: owner setup status. Inline actions fire the same primitives the legacy console used.',
  'portal.funds.pill': 'PDA custody',
  'portal.funds.column.fundsTitle': 'Balances',
  'portal.funds.column.setupTitle': 'Owner setup',
  'portal.funds.list.label': 'Custody balances',
  'portal.funds.row.usdc.title': 'USDC custody',
  'portal.funds.row.usdc.sub': 'Spendable by policy',
  'portal.funds.row.sol.title': 'SOL custody',
  'portal.funds.row.sol.sub': 'Swap output and rent',
  'portal.funds.row.gas.title': 'Agent gas',
  'portal.funds.row.gas.sub': 'Session keypair pays rail tx fees',
  'portal.funds.row.gas.value.done': 'funded',
  'portal.funds.row.gas.value.needs': 'needs SOL',
  'portal.funds.row.gas.value.pending': 'no session',
  'portal.funds.row.ika.title': 'Ika dWallet',
  'portal.funds.row.ika.sub': 'Managed Sui devnet · Ethereum deferred',
  'portal.funds.row.ika.value.pending': 'not enabled',
  'portal.funds.actions.deposit': 'Deposit 5 USDC',
  'portal.funds.actions.withdraw': 'Withdraw 1 USDC',
  'portal.funds.actions.fundGas': 'Fund 0.05 SOL gas',
  'portal.funds.actions.enableChain': 'Enable Sui chain',
  'portal.funds.setup.label': 'Owner setup',
  'portal.funds.setup.pda.title': 'Smart-wallet PDA',
  'portal.funds.setup.pda.sub': 'Custody, policy, and sessions hang off this PDA',
  'portal.funds.setup.pda.action': 'Initialize',
  'portal.funds.setup.custody.title': 'Custody funds',
  'portal.funds.setup.custody.sub': 'Demo USDC + WSOL token accounts',
  'portal.funds.setup.custody.action': 'Register',
  'portal.funds.setup.custody.value.funded': 'funded',
  'portal.funds.setup.policy.title': 'Confidential policy',
  'portal.funds.setup.policy.sub': 'Numeric cap, quota, cooldown — sealed on-chain',
  'portal.funds.setup.policy.action': 'Save policy',
  'portal.funds.setup.session.title': 'Agent session',
  'portal.funds.setup.session.sub': 'Time-boxed signing key for the agent',
  'portal.funds.setup.session.action': 'Grant session',
  'portal.funds.setup.session.regrant': 'Re-grant',
  'portal.funds.setup.authority.title': 'Authority',
  'portal.funds.setup.authority.sub': 'Owner controls the wallet today; recovery rotation coming',
  // === Phase 5 keys (issue 103 — Proof Trail). Insert below. ===
  'portal.proof.kicker': 'Proof Trail',
  'portal.proof.title': 'Every receipt the agent has produced.',
  'portal.proof.sub':
    'Type-driven log, hairline rhythm. Allowed Jupiter and Ika receipts expand into the same proof grid the legacy receipt log used.',
  'portal.proof.pill.empty': 'no receipts yet',
  'portal.proof.pill.singular': 'receipt',
  'portal.proof.pill.plural': 'receipts',
  'portal.proof.timeline.empty.title': 'Latest activity',
  'portal.proof.timeline.empty.body':
    'No agent activity yet — preview the gate to leave a receipt.',
  'portal.proof.row.expand': 'Expand proof',
  'portal.proof.row.collapse': 'Collapse proof',
  'portal.proof.row.explorer': 'View transaction on Solana Explorer',
  'portal.proof.tag.info': 'INFO',
  'portal.proof.tag.allowed': 'ALLOWED',
  'portal.proof.tag.blocked': 'BLOCKED',
  'portal.proof.tag.pending': 'PENDING',
  'portal.proof.tag.error': 'ERROR',
  // === Phase 6 keys (issue 104 — Agent Bridge). Insert below. ===
  'portal.bridge.kicker': 'Agent Bridge',
  'portal.bridge.title': 'Wire your agent to Polet in 90 seconds.',
  'portal.bridge.sub':
    'Paste-ready MCP config, the 5 tools the proxy exposes, and the polet-agent.json download for the SDK CLI. Advanced flows live in the legacy console below.',
  'portal.bridge.pill': 'MCP · SDK · polet-agent.json',
  'portal.bridge.config.title': 'mcp.json',
  'portal.bridge.config.copy': 'Copy',
  'portal.bridge.config.copied': 'Copied',
  'portal.bridge.config.ready':
    'Drop this into Claude Desktop or your local MCP host to wire Polet as an agent rail.',
  'portal.bridge.config.needsSession':
    'Grant a session and fund agent gas to populate POLET_SESSION_KEY and POLET_AGENT_KEYPAIR.',
  'portal.bridge.config.openFunds': 'Open Funds & Setup →',
  'portal.bridge.tools.title': 'Tools',
  'portal.bridge.download.button': 'Download polet-agent.json',
  'portal.bridge.download.ready':
    'Pre-configures the @polet-ai/sdk CLI with the same env vars.',
  'portal.bridge.download.needsSession':
    'Available once a session keypair is in memory.',
  'portal.bridge.download.openFunds': 'Grant a session →',
  'portal.bridge.advanced.kicker': 'Advanced',
  'portal.bridge.advanced.summary':
    'Specialist controls for recovery, shared quorum, and Encrypt graph.',
  'portal.bridge.advanced.panel.kicker': 'Operator-only fallback',
  'portal.bridge.advanced.panel.title': 'Keep the Portal calm; open legacy controls only when needed.',
  'portal.bridge.advanced.panel.body':
    'Daily demo work belongs in Workspace, Funds, Gate, and Proof. This section keeps the unported power flows discoverable without dropping a second full app into the page.',
  'portal.bridge.advanced.flow.recovery.title': 'Recovery rotation',
  'portal.bridge.advanced.flow.recovery.body':
    'Rotate compromised sessions or recovery authority from the legacy fallback.',
  'portal.bridge.advanced.flow.quorum.title': 'Shared Ika quorum',
  'portal.bridge.advanced.flow.quorum.body':
    'Inspect or adjust shared approvers for Ika approval paths.',
  'portal.bridge.advanced.flow.encrypt.title': 'Encrypt graph tools',
  'portal.bridge.advanced.flow.encrypt.body':
    'Run ciphertext/decryption diagnostics for the official Encrypt path.',
  'portal.bridge.advanced.signal.wallet': 'Wallet',
  'portal.bridge.advanced.signal.policy': 'Policy',
  'portal.bridge.advanced.signal.session': 'Session',
  'portal.bridge.advanced.signal.ready': 'Ready',
  'portal.bridge.advanced.signal.missing': 'Missing',
  'portal.bridge.advanced.legacy.kicker': 'Legacy fallback',
  'portal.bridge.advanced.legacy.summary': 'Open full legacy console',
  'portal.bridge.advanced.legacy.body':
    'Loads the older all-in-one dashboard inside a scrollable sandbox. Use it only for controls not yet ported to the Portal shell.',
  // === Phase 7 keys (issue 105 — Mobile drawer + i18n sweep). Insert below. ===
  'portal.drawer.open': 'Open portal navigation',
  'portal.drawer.close': 'Close portal navigation',
  'portal.drawer.backdrop': 'Dismiss portal navigation',
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
  'header.nav.menu.open': 'Buka menu',
  'header.nav.menu.close': 'Tutup menu',
  'header.devnetPill': 'Devnet',
  'header.cta.openApp': 'Buka App',

  // Hero
  'hero.kicker': 'Lapisan wallet rahasia untuk AI agent',
  'hero.headline.line1': 'Kasih agent-mu budget.',
  'hero.headline.line2': 'Bukan wallet-mu.',
  'hero.headline.line2.a': 'Wallet utuh.',
  'hero.headline.line2.b': 'Limit rahasia.',
  'hero.headline.line2.c': 'Tanpa seed.',
  'hero.subhead':
    'Atur limit spending rahasia di smart-wallet PDA Solana. Kasih agent session key sementara. Jupiter DCA dan Ika dWallet signing lewat policy gate yang sama, tidak ada yang bocor, tidak ada yang bypass.',
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
    'Ngasih wallet ke agent berarti menyerahkan segalanya, spending, allowlist, signing cross-chain, semua di bawah satu kunci. Tiga masalah struktural yang tiap tim bangun ulang dari nol:',
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
    'Owner deposit dana, set policy rahasia, kasih AI agent session key sementara. Setiap aksi agent, Solana DCA atau signing dWallet cross-chain, lewat guardrail on-chain yang sama sebelum dieksekusi.',
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
  'howto.step.1.desc': 'USDC dan SOL ke PDA yang dikontrol contract. Belum ada akses agent, dana di-custody di bawah program-derived address.',
  'howto.step.2.title': 'Set policy rahasia',
  'howto.step.2.desc': 'Max-per-run dan daily-cap terenkripsi on-chain. Threshold-nya tidak pernah keluar dari contract. Kamu bisa ubah kapan saja.',
  'howto.step.3.title': 'Kasih agent session key',
  'howto.step.3.desc': 'Otoritas signing sementara dengan expires_at. Agent trading dalam batas policy-mu. Revoke kapan saja dalam satu transaksi.',

  // Rails, Encrypt
  'rails.kicker': 'Tiga rail. Satu gate.',
  'rails.headline.lead': 'Satu policy gate.',
  'rails.headline.rest': 'Tiga rail eksekusi.',
  'rails.body':
    'Encrypt jaga limit tetap rahasia. Ika bawa signing lintas chain. Jupiter route trade-nya. Tiganya lewat gate on-chain yang sama sebelum satu lamport pun bergerak.',
  'rail.encrypt.title': 'Policy numeric rahasia',
  'rail.encrypt.body':
    'Max-per-run dan daily-cap tetap terenkripsi on-chain. Contract menegakkan guardrail sebelum spending apa pun tanpa pernah membocorkan threshold privat-mu, dibangun di atas Encrypt pre-alpha.',
  'rail.encrypt.bullet.1': 'Masked witness flow dengan sha256 commitment',
  'rail.encrypt.bullet.2': 'Migrasi EUint64 graph executor sedang berjalan (issue 041)',
  'rail.encrypt.bullet.3': 'policy_seq anti-replay di setiap perubahan state',
  'rail.encrypt.bullet.4': 'Threshold plaintext tidak pernah keluar dari contract',
  'rail.encrypt.ref': 'Referensi Encrypt',
  'rail.encrypt.mockTitle': 'contract/confidential_policy.rs',
  'rail.encrypt.mockAria':
    'Source Rust yang menunjukkan Polet enforce_confidential_numeric_policy memverifikasi witness hash dan men-decrypt max-per-run, daily-cap, daily-spent ter-masking sebelum mengecek amount yang melebihi limit.',

  // Rails, Ika
  'rail.ika.title': 'Signing cross-chain tanpa bridge',
  'rail.ika.body':
    'Setelah policy Polet approve, contract CPI-call Ika `approve_message` sehingga dWallet bisa signing multi-chain intent. Tanpa bridge, tanpa wrapping asset, murni signing kriptografis.',
  'rail.ika.bullet.1': 'Dukungan multi-chain',
  'rail.ika.bullet.2': 'Official Ika Pre-Alpha SDK dengan CPI authority PDA',
  'rail.ika.bullet.3': 'Verifikasi MessageApproval PDA di devnet',
  'rail.ika.bullet.4': 'Shared quorum M-of-N untuk approval didukung',
  'rail.ika.ref': 'Referensi Ika dWallet',
  'rail.ika.mockTitle': 'POST /intent/multichain/run · executionRail = ika',
  'rail.ika.mockAria':
    'Mock response approval Ika dWallet menampilkan bridgeless order yang disetujui, message hash, MessageApproval PDA, dan metadata signature scheme untuk intent multi-chain.',

  // Rails, Jupiter
  'rail.jupiter.title': 'Rail strategi DCA Solana',
  'rail.jupiter.body':
    'Tokens v2, Price v3, dan Swap v2 build dikombinasikan jadi route preview. Smart wallet PDA mengeksekusi instruction yang disetujui dengan kontrol penuh, tanpa kepercayaan signing off-chain.',
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
    'Dana di-custody di bawah program-derived address. Contract, bukan agent, yang mengontrol eksekusi.',
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
    'Jupiter DCA dalam limit, Polet approve dan mengembalikan route/build tanpa signature.',
  'demo.pill.ika.desc':
    'Ika multi-chain dalam limit, Polet approve dan menyiapkan transaksi approval Ika dWallet.',
  'demo.pill.block.desc':
    'Di atas limit, diblokir. Tidak ada threshold yang bocor. Tidak ada data approval dWallet dibuat.',

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
  // DemoWidget v2, Crypto-Blur Theater
  'demoWidget.theater.header.title': 'policy gate / 01',
  'demoWidget.theater.header.devnet': 'devnet \u00b7 live',
  'demoWidget.theater.idle.title': 'Pilih skenario untuk mulai',
  'demoWidget.theater.idle.desc':
    'Lihat policy gate mengevaluasi angka rahasia, nominal & rute agent berubah jadi ciphertext, gate evaluasi tanpa decrypt, hanya kamu yang bisa membuka kembali.',
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
  'demoWidget.theater.hint.revealed': 'kamu lihat, server tidak',
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
    'Limit numerik terlampaui. Nominal asli tetap tersegel, gate menolak tanpa pernah membaca cleartext.',
  'demoWidget.theater.result.code': 'kode',
  'demoWidget.theater.result.tx': 'tx',
  'demoWidget.theater.reveal.cta': 'Buka cleartext',
  'demoWidget.theater.reveal.confirmed': 'terdekripsi (hanya kamu)',
  'demoWidget.theater.reveal.note':
    'Server tetap hanya lihat ciphertext. Session key kamu decrypt secara lokal, tidak ada yang lain dapat angkanya.',
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
    'Kami tidak menyembunyikan status pre-alpha, kami tunjukkan persis apa yang bekerja sekarang, dan apa yang sengaja belum kami bangun. Kedua list ini memang sengaja pendek.',
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
  'footer.brand.tagline': 'Smart wallet rahasia untuk AI agent di Solana.',
  'footer.brand.subtagline': 'Policy-gated. Tanpa otoritas tak terbatas.',
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

  // App console
  'app.ledger.kicker': 'Ledger setup',
  'app.ledger.row.wallet': 'Wallet',
  'app.ledger.row.custody': 'Custody',
  'app.ledger.row.policy': 'Policy',
  'app.ledger.row.session': 'Session',
  'app.ledger.state.initialized': 'INITIALIZED',
  'app.ledger.state.registered': 'REGISTERED',
  'app.ledger.state.sealed': 'SEALED',
  'app.ledger.state.active': 'ACTIVE',
  'app.ledger.state.pending': 'PENDING',
  'app.ledger.empty.connectFirst': 'Hubungkan wallet devnet untuk mulai.',
  'app.console.rails.kicker': 'Rail · Dijaga policy',
  'app.rail.jupiter.disclaimer': 'DEVNET PREVIEW · NOT MAINNET',
  'app.rail.ika.disclaimer': 'PRE-ALPHA · NOT MPC SETTLEMENT',

  // App console — Day 10 layout pivot
  'app.ribbon.thesis': 'Tiga rail · Satu gate',
  'app.ribbon.scope': 'Pratinjau devnet · Policy-gated',
  'app.ribbon.dynamic.policyEnforces': 'Kebijakan menjaga',
  'app.ribbon.dynamic.constraints': 'konstrain',
  'app.ribbon.dynamic.sessionSingular': 'sesi aktif',
  'app.ribbon.dynamic.sessionsPlural': 'sesi aktif',
  'app.ribbon.dynamic.rails': 'rail',
  'app.ribbon.dynamic.gateAwake': 'gate siaga',
  'app.ribbon.dynamic.gateDormant': 'gate tidur',
  'app.stat.pda': 'PDA',
  'app.stat.balance': 'Saldo SOL',
  'app.stat.policy': 'Policy seq',
  'app.stat.sessions': 'Session',
  'app.stat.unit.active': 'aktif',
  'app.wizard.step': 'Langkah',
  'app.wizard.of': 'dari',
  'app.wizard.connect.title': 'Hubungkan wallet devnet',
  'app.wizard.connect.body':
    'Polet menyimpan batas kamu sebagai ciphertext; gate evaluasi tanpa membaca. Hubungkan wallet devnet untuk derive PDA smart wallet kamu dan mulai setup empat langkah.',
  'app.wizard.connect.pointer': 'Hubungkan untuk mulai',
  'app.wizard.disabled.waiting': 'menunggu wallet',
  'app.advanced.label': 'Lanjutan · Konsol kontrol penuh',

  // Action buttons (Day 11)
  'app.action.initialize': 'Inisialisasi',
  'app.action.initialize.loading': 'Menginisialisasi…',
  'app.action.registerCustody': 'Daftarkan',
  'app.action.registerCustody.loading': 'Mendaftarkan…',
  'app.action.savePolicy': 'Simpan policy',
  'app.action.savePolicy.loading': 'Menyimpan…',
  'app.action.grantSession': 'Beri session',
  'app.action.grantSession.loading': 'Memberikan…',

  // Rail action buttons (Day 11)
  'app.rail.jupiter.action.block': 'Coba 25 USDC',
  'app.rail.jupiter.action.block.loading': 'Mengirim…',
  'app.rail.jupiter.action.allow': 'Jalankan 5 USDC',
  'app.rail.jupiter.action.allow.loading': 'Mengutip…',
  'app.rail.ika.action.block': 'Coba 25 USDC',
  'app.rail.ika.action.block.loading': 'Mengirim…',
  'app.rail.ika.action.allow': 'Setujui 5 USDC',
  'app.rail.ika.action.allow.loading': 'Menyiapkan…',
  'app.rail.ika.action.execute': 'Eksekusi lifecycle Ika',
  'app.rail.ika.action.execute.loading': 'Memproses…',
  'app.rail.action.block.hint': 'Melebihi cap rahasia',
  'app.rail.action.allow.hint': 'Dalam cap rahasia',
  'app.rail.jupiter.action.execute': 'Eksekusi 5 USDC',
  'app.rail.jupiter.action.execute.loading': 'Broadcasting…',
  'app.rail.action.execute.hint': 'Sign + broadcast ke devnet',
  'app.chain.kicker': 'Status chain Ika',
  'app.chain.note':
    'Mode demo managed memetakan satu curve dWallet aktif sebelum eksekusi lifecycle Ika nyata.',
  'app.chain.ready': 'Siap diaktifkan',
  'app.chain.waitPolicy': 'Seal policy dulu',
  'app.chain.fixtureMissing': 'Fixture managed hilang',
  'app.chain.sui': 'Sui devnet',
  'app.chain.ethereum': 'Ethereum Sepolia',
  'app.chain.enabled': 'Aktif',
  'app.chain.notEnabled': 'Belum aktif',
  'app.chain.curve': 'Curve',
  'app.chain.dwallet': 'dWallet',
  'app.chain.gas': 'Gas',
  'app.chain.gasReady': 'Gas deposit siap',
  'app.chain.gasNeedsFunding': 'Gas perlu funding',
  'app.chain.gasUnknown': 'Gas belum diketahui',
  'app.chain.enable.sui': 'Aktifkan Sui',
  'app.chain.enable.ethereum': 'Aktifkan Ethereum',
  'app.chain.enable.loading': 'Mengaktifkan…',

  // Receipt log (Day 11)
  'app.log.kicker': 'Receipt log',
  'app.log.tagline': 'tidak ada yang bocor, tidak ada yang lolos',
  'app.log.empty': 'Belum ada aksi, jalankan langkah setup atau rail untuk mulai.',
  'app.log.empty.gateAwake': 'Gate kebijakan siaga',
  'app.log.empty.hint': 'Belum ada aktivitas agen — coba Jalankan 5 USDC untuk lihat verdict',
  'app.agent.kicker': 'Integrasi agen',
  'app.agent.title': 'Bridge MCP siap tempel',
  'app.agent.body':
    'Salin config ini ke Claude Desktop, Cursor, Zed, atau agen MCP lain untuk mengikat session key yang sama ke Polet.',
  'app.agent.tools': 'Tool MCP',
  'app.agent.config': 'Claude Desktop mcp.json',
  'app.agent.copy': 'Salin config',
  'app.agent.copied': 'Tersalin',
  'app.agent.ready': 'Secret session ada di tab ini. Devnet-only.',
  'app.agent.needsSession': 'Grant atau re-grant session agen dulu agar config berisi keypair nyata.',
  'app.agent.tool.balance': 'Baca saldo custody plus bucket gas owner dan agen.',
  'app.agent.tool.status': 'Periksa policy, session, signer Ika, dan kesiapan GasDeposit.',
  'app.agent.tool.enableChain': 'Aktifkan signer Ika managed untuk Sui atau Ethereum.',
  'app.agent.tool.trade': 'Preview trade policy-gated tanpa broadcast.',
  'app.agent.tool.execute': 'Eksekusi Jupiter atau Ika end-to-end dengan session signer.',
  // Polish (Day 11.5)
  'app.constraint.numericLimit.tooltip':
    'pi_numeric_limit — pemeriksaan max-per-run dan daily-cap rahasia. Ambang batas tetap terenkripsi on-chain; hanya pass/fail yang keluar dari gate.',
  'app.constraint.scopeMatch.tooltip':
    'pi_scope_match — allowlist asset/chain sumber + target plus route-risk guardrails (slippage, price impact, likuiditas).',
  'app.constraint.sessionActive.tooltip':
    'pi_session_active — session belum expired, belum dicabut, dan grantedSlot >= last-revoked slot wallet.',
  'app.constraint.numericLimit.short':
    'Pemeriksaan max-per-run + daily-cap rahasia',
  'app.constraint.scopeMatch.short':
    'Allowlist aset/chain + risk routing',
  'app.constraint.sessionActive.short':
    'Sesi valid, belum expired atau dicabut',
  'app.ledger.group.runtime': 'Gate runtime',
  'app.session.download': 'Unduh polet-agent.json',
  'app.session.copy.public': 'Salin public key',
  'app.session.copy.secret': 'Salin secret',
  'app.session.copied': 'Tersalin',
  'app.session.devnetWarning': 'Kunci devnet, jangan dipakai di mainnet',
  'app.session.lostKeyNote':
    'Sesi di-grant sebelum fix persistensi. Re-grant untuk unduh polet-agent.json.',
  'app.action.regrant': 'Re-grant untuk unduh',
  'app.action.regrant.loading': 'Sedang re-grant…',
  'app.session.fundGas': '+ Isi 0.05 SOL gas',
  'app.session.fundGas.loading': 'Mengisi…',
  'app.custody.strip.label': 'Dana custody PDA',
  'app.custody.deposit.usdc': '+ Deposit 5 USDC',
  'app.custody.deposit.sol': '+ Deposit 0.05 SOL',
  'app.custody.deposit.loading': 'Deposit…',
  'app.custody.withdraw.usdc': 'Tarik 1 USDC',
  'app.custody.withdraw.sol': 'Tarik 0.01 SOL',
  'app.custody.withdraw.loading': 'Menarik…',
  'app.session.presence.noActivity': 'belum ada aktivitas',
  'app.session.presence.active': 'aktif',
  'app.session.presence.ago': 'lalu',
  'app.session.presence.idle': 'idle',

  // Polet Portal — Phase 1 (issue 099)
  'portal.brand.name': 'Polet',
  'portal.brand.kicker': 'Portal',
  'portal.connect.kicker': 'Polet Portal',
  'portal.connect.title': 'Hubungkan wallet devnet untuk masuk ke portal.',
  'portal.connect.body':
    'Polet Portal adalah lapisan kontrol rahasia untuk agen AI. Hubungkan untuk menetapkan batas pengeluaran dan memberi sesi sementara ke agen Anda.',
  'portal.nav.workspace': 'Workspace',
  'portal.nav.gate': 'Policy Gate',
  'portal.nav.funds': 'Dana & Setup',
  'portal.nav.proof': 'Jejak Bukti',
  'portal.nav.bridge': 'Agent Bridge',
  'portal.sidebar.section.pages': 'Halaman',
  'portal.sidebar.section.runtime': 'Runtime',
  'portal.sidebar.runtime.devnet': 'Devnet',
  'portal.sidebar.runtime.proxy': 'Proxy',
  'portal.sidebar.runtime.policy': 'Policy',
  'portal.sidebar.runtime.session': 'Sesi',
  'portal.sidebar.runtime.online': 'online',
  'portal.sidebar.runtime.placeholder': '—',
  'portal.placeholder.kicker.workspace': 'Workspace',
  'portal.placeholder.kicker.gate': 'Policy Gate',
  'portal.placeholder.kicker.funds': 'Dana & Setup',
  'portal.placeholder.kicker.proof': 'Jejak Bukti',
  'portal.placeholder.kicker.bridge': 'Agent Bridge',
  'portal.placeholder.title.workspace':
    'Beranda portal akan muncul di sini.',
  'portal.placeholder.title.gate':
    'Composer policy gate hadir di Phase 3.',
  'portal.placeholder.title.funds':
    'Dana dan setup owner hadir di Phase 4.',
  'portal.placeholder.title.proof':
    'Timeline bukti hadir di Phase 5.',
  'portal.placeholder.title.bridge':
    'Konfigurasi agent bridge hadir di Phase 6.',
  'portal.placeholder.sub.workspace':
    'Phase 2 menghubungkan halaman ini ke state kesiapan.',
  'portal.placeholder.sub.gate':
    'Susun intent, lihat sealed gate menyala, lalu eksekusi via Jupiter atau Ika.',
  'portal.placeholder.sub.funds':
    'Dua kolom daftar: peta wallet dan setup owner. Tanpa dinding kartu.',
  'portal.placeholder.sub.proof':
    'Daftar bukti berbasis tipografi dengan panel Jupiter dan Ika yang bisa dibuka.',
  'portal.placeholder.sub.bridge':
    'Konfigurasi MCP siap-tempel plus fallback lanjutan.',
  'portal.placeholder.pending': 'phase pending',
  // Polet Portal — Phase 2 (issue 100) — Beranda Workspace
  'portal.workspace.kicker': 'Workspace',
  'portal.workspace.status.ready': 'siap dieksekusi',
  'portal.workspace.status.pending': 'setup belum lengkap',
  'portal.workspace.title.ready':
    'Semua rail siap. Susun intent yang dilewatkan policy.',
  'portal.workspace.title.needsWallet':
    'Inisialisasi smart-wallet PDA kamu untuk memulai.',
  'portal.workspace.title.needsCustody':
    'Isi custody dengan USDC demo supaya policy punya yang bisa diukur.',
  'portal.workspace.title.needsPolicy':
    'Seal numeric policy rahasia kamu.',
  'portal.workspace.title.needsSession':
    'Otorisasi session key agent yang dibatasi waktu.',
  'portal.workspace.title.needsGas':
    'Isi bensin sesi supaya agent bisa broadcast.',
  'portal.workspace.sub.ready':
    'Agent sekarang bisa tandatangan di dalam policy lewat Jupiter DCA atau Ika dWallet.',
  'portal.workspace.sub.needsWallet':
    'Custody, policy, dan sesi Polet semuanya nyangkut ke smart-wallet PDA kamu.',
  'portal.workspace.sub.needsCustody':
    'Numeric policy hanya mengukur aliran yang benar-benar bisa kamu biayai.',
  'portal.workspace.sub.needsPolicy':
    'Seal batas nominal, kuota, dan cooldown rahasia yang harus dihormati agent.',
  'portal.workspace.sub.needsSession':
    'Terbitkan session key supaya agent bisa broadcast di dalam batas itu.',
  'portal.workspace.sub.needsGas':
    'Sesi agent butuh sedikit SOL sebelum bisa broadcast.',
  'portal.readiness.label.wallet': 'Wallet',
  'portal.readiness.label.custody': 'Custody',
  'portal.readiness.label.policy': 'Policy',
  'portal.readiness.label.session': 'Sesi',
  'portal.readiness.label.gas': 'Bensin',
  'portal.readiness.state.done': 'siap',
  'portal.readiness.state.needs': 'butuh dana',
  'portal.readiness.state.pending': 'tertunda',
  'portal.workspace.cta.openFunds': 'Buka Dana & Setup',
  'portal.workspace.cta.openGate': 'Buka Policy Gate',
  'portal.workspace.cta.openBridge': 'Buka Agent Bridge',
  'portal.workspace.cta.openProof': 'Buka Jejak Bukti',
  'portal.workspace.cta.compose': 'Susun intent',
  'portal.workspace.activity.latest': 'Receipt terbaru',
  'portal.workspace.activity.empty':
    'Belum ada receipt — jalankan rail pertama kamu dari Gate.',
  'portal.workspace.activity.openProof': 'Buka Jejak Bukti',
  'portal.workspace.agentAccess.kicker': 'Bagian · Akses Agent',
  'portal.workspace.agentAccess.title': 'Otorisasi Agent Wallet',
  'portal.workspace.agentAccess.sub': 'Tempelkan public key agent wallet yang kamu buat secara eksternal (Phantom, Backpack, Ledger, atau solana-keygen). Polet tidak pernah melihat private key-nya. Revoke sesi mana pun kapan saja.',
  'portal.workspace.agentAccess.empty': 'Belum ada agent terotorisasi. Berikan sesi agar AI runtime (Hermes / Claude / Cursor) bisa jalankan trade di dalam policy.',
  'portal.workspace.agentAccess.authorize': 'Otorisasi agent',
  'portal.workspace.agentAccess.form.pubkey.label': 'Alamat wallet agent',
  'portal.workspace.agentAccess.form.pubkey.placeholder': 'Tempel public key agent wallet',
  'portal.workspace.agentAccess.form.pubkey.help': 'Contract menyebutnya session key. Secara fungsional, ini public key wallet agent yang diotorisasi untuk sign trade dalam batas confidential policy.',
  'portal.workspace.agentAccess.form.expires.label': 'Kedaluwarsa dalam',
  'portal.workspace.agentAccess.form.expires.option1h': '1 jam',
  'portal.workspace.agentAccess.form.expires.option24h': '24 jam',
  'portal.workspace.agentAccess.form.expires.option7d': '7 hari',
  'portal.workspace.agentAccess.form.dailyLimit.label': 'Batas harian native-SOL (legacy)',
  'portal.workspace.agentAccess.form.dailyLimit.help': 'Batas atas untuk jalur native-SOL legacy. Policy USDC confidential (max-per-run + daily-cap) tetap terpisah.',
  'portal.workspace.agentAccess.form.submit': 'Otorisasi',
  'portal.workspace.agentAccess.form.cancel': 'Batal',
  'portal.workspace.agentAccess.row.active': 'Aktif',
  'portal.workspace.agentAccess.row.revoked': 'Dicabut',
  'portal.workspace.agentAccess.row.expiresIn': 'berakhir dalam',
  'portal.workspace.agentAccess.row.expired': 'kedaluwarsa',
  'portal.workspace.agentAccess.row.revoke': 'Revoke',
  'portal.workspace.agentAccess.row.showConfig': 'Tampilkan config MCP',
  'portal.workspace.agentAccess.row.hideConfig': 'Sembunyikan config MCP',
  'portal.workspace.agentAccess.config.warning': 'Private key tidak pernah dibuat di sisi server. Tempel private key agent wallet sendiri — export dari Phantom (Settings → Security → Export Private Key), Backpack, atau baca dari file solana-keygen kamu.',
  'portal.workspace.agentAccess.config.polet': 'polet-agent.json',
  'portal.workspace.agentAccess.config.mcp': 'Claude Desktop / Cursor / Zed MCP',
  'portal.workspace.agentAccess.config.hermes': 'Perintah CLI Hermes',
  'portal.workspace.agentAccess.config.copy': 'Salin',
  'portal.workspace.agentAccess.config.copied': 'Tersalin',
  'portal.workspace.policyRules.kicker': 'Bagian · Aturan Policy',
  'portal.workspace.policyRules.title': 'Policy Confidential',
  'portal.workspace.policyRules.sub': 'Max per run dan daily cap disimpan sebagai ciphertext on-chain. Agent tidak pernah melihat angkanya. Owner bisa reveal plaintext ke memory tab ini (tidak disimpan, tidak tercatat).',
  'portal.workspace.policyRules.status.sealed': 'sealed #',
  'portal.workspace.policyRules.status.notSealed': 'belum disegel',
  'portal.workspace.policyRules.field.maxPerRun.label': 'Max per run (USDC)',
  'portal.workspace.policyRules.field.maxPerRun.help': 'Plafon confidential per-trade. Trade tunggal yang melebihi nilai ini akan diblokir oleh Encrypt sebelum rail dijalankan.',
  'portal.workspace.policyRules.field.dailyCap.label': 'Cap harian (USDC)',
  'portal.workspace.policyRules.field.dailyCap.help': 'Total USDC yang diperdagangkan dalam 24 jam bergulir. Encrypt memblokir trade tambahan begitu cap ini terlampaui.',
  'portal.workspace.policyRules.field.dailySpent.label': 'Terpakai hari ini (USDC)',
  'portal.workspace.policyRules.reveal': 'Tampilkan',
  'portal.workspace.policyRules.hide': 'Sembunyikan',
  'portal.workspace.policyRules.revealedNote': 'Ditampilkan hanya untuk tab ini. Hilang saat halaman ditutup.',
  'portal.workspace.policyRules.submit': 'Perbarui policy',
  'portal.workspace.policyRules.notInitialized': 'Inisialisasi wallet + register custody dulu (lihat halaman Funds).',
  // Polet Portal — Phase 3 (issue 101) — Policy Gate
  'portal.gate.kicker': 'Policy Gate',
  'portal.gate.title': 'Satu gate tersegel. Dua rail eksekusi.',
  'portal.gate.sub':
    'Agent mengusulkan aksi. Polet memeriksa batas rahasia, kesegaran sesi, dan scope sebelum Jupiter atau Ika lanjut.',
  'portal.gate.status.ready': 'siap di-preview',
  'portal.gate.status.allowed': 'diloloskan policy',
  'portal.gate.status.blocked': 'diblok policy',
  'portal.gate.status.evaluating': 'sedang dievaluasi',
  'portal.gate.composer.run': 'Jalankan',
  'portal.gate.composer.through': 'lewat',
  'portal.gate.composer.unit': 'USDC',
  'portal.gate.rail.jupiter': 'Jupiter',
  'portal.gate.rail.ika': 'Ika · Sui',
  'portal.gate.scenario.allowJupiter': 'Allow Jupiter 5 USDC',
  'portal.gate.scenario.block25': 'Block 25 USDC',
  'portal.gate.scenario.ikaSui': 'Approval Ika Sui',
  'portal.gate.flow.node1.kicker': '01 · Permintaan agent',
  'portal.gate.flow.node1.title.jupiter': 'Beli SOL via Jupiter',
  'portal.gate.flow.node1.title.ika': 'Setujui pesan Ika dWallet',
  'portal.gate.flow.node1.body.jupiter':
    'Agent AI minta memakai custody USDC dengan session key sementara, bukan wallet owner.',
  'portal.gate.flow.node1.body.ika':
    'Agent minta approval pesan dWallet. Polet menggate sebelum progres lifecycle dan broadcast destination.',
  'portal.gate.flow.node1.row.amount': 'jumlah',
  'portal.gate.flow.node1.row.route': 'rute',
  'portal.gate.flow.node1.row.session': 'sesi',
  'portal.gate.flow.node1.route.jupiter': 'USDC → SOL',
  'portal.gate.flow.node1.route.ika': 'Sui dWallet · sign',
  'portal.gate.flow.node1.session.placeholder': 'tertunda',
  'portal.gate.flow.node2.kicker': '02 · Gate tersegel',
  'portal.gate.flow.node2.check.session': 'sesi',
  'portal.gate.flow.node2.check.policy': 'policy seq',
  'portal.gate.flow.node2.check.limit': 'batas',
  'portal.gate.flow.node2.value.sessionActive': 'aktif',
  'portal.gate.flow.node2.value.sessionInactive': 'tertunda',
  'portal.gate.flow.node2.value.policyFresh': 'segar',
  'portal.gate.flow.node2.value.policyEmpty': 'belum-seal',
  'portal.gate.orb.kicker': 'POLICY',
  'portal.gate.orb.allow': 'ALLOW',
  'portal.gate.orb.block': 'BLOCK',
  'portal.gate.orb.ready': 'READY',
  'portal.gate.orb.evaluating': '…',
  'portal.gate.flow.node3.kicker': '03 · Output rail',
  'portal.gate.flow.node3.title.jupiter': 'Transaksi Jupiter siap',
  'portal.gate.flow.node3.title.ika': 'MessageApproval Ika siap',
  'portal.gate.flow.node3.body.idle':
    'Preview rute dan tombol eksekusi akan tersedia setelah verdict policy lolos.',
  'portal.gate.flow.node3.body.allowed':
    'Preview rute dan tombol eksekusi tersedia. Policy owner tetap tersegel.',
  'portal.gate.flow.node3.body.blocked':
    'Policy gate menolak intent ini sebelum ada output rail yang dibuat.',
  'portal.gate.flow.node3.body.evaluating':
    'Polet sedang mengevaluasi intent terhadap policy tersegel.',
  'portal.gate.flow.node3.verdict.allow': 'DILOLOSKAN',
  'portal.gate.flow.node3.verdict.block': 'DIBLOK',
  'portal.gate.flow.node3.verdict.idle': 'MENUNGGU',
  'portal.gate.flow.node3.verdict.evaluating': 'EVAL',
  'portal.gate.actions.preview': 'Preview gate',
  'portal.gate.actions.tryBlocked': 'Coba jumlah diblok',
  'portal.gate.actions.execute': 'Eksekusi dengan session key',
  'portal.gate.actions.disabledNoSession':
    'Otorisasi session agent dulu sebelum preview gate.',
  'portal.gate.actions.disabledNoSessionKey':
    'Butuh keypair sesi untuk broadcast — isi bensin agent dulu.',
  'portal.gate.actions.disabledNoIkaChain':
    'Aktifkan chain managed Ika (Sui devnet) untuk eksekusi via Ika.',
  // === Phase 4 keys (issue 102 — Funds & Setup). Insert below. ===
  'portal.funds.kicker': 'Dana & Setup',
  'portal.funds.title': 'Kontrol owner dalam dua kolom kalem.',
  'portal.funds.sub':
    'Kiri: saldo yang bisa dibelanjakan policy. Kanan: status setup owner. Tombol inline memicu primitif yang sama dengan konsol legacy.',
  'portal.funds.pill': 'PDA custody',
  'portal.funds.column.fundsTitle': 'Saldo',
  'portal.funds.column.setupTitle': 'Setup owner',
  'portal.funds.list.label': 'Saldo custody',
  'portal.funds.row.usdc.title': 'Custody USDC',
  'portal.funds.row.usdc.sub': 'Bisa dibelanjakan policy',
  'portal.funds.row.sol.title': 'Custody SOL',
  'portal.funds.row.sol.sub': 'Hasil swap dan sewa rent',
  'portal.funds.row.gas.title': 'Bensin agent',
  'portal.funds.row.gas.sub': 'Keypair sesi bayar fee tx rail',
  'portal.funds.row.gas.value.done': 'terisi',
  'portal.funds.row.gas.value.needs': 'butuh SOL',
  'portal.funds.row.gas.value.pending': 'belum ada sesi',
  'portal.funds.row.ika.title': 'Ika dWallet',
  'portal.funds.row.ika.sub': 'Managed Sui devnet · Ethereum ditunda',
  'portal.funds.row.ika.value.pending': 'belum aktif',
  'portal.funds.actions.deposit': 'Setor 5 USDC',
  'portal.funds.actions.withdraw': 'Tarik 1 USDC',
  'portal.funds.actions.fundGas': 'Isi 0.05 SOL bensin',
  'portal.funds.actions.enableChain': 'Aktifkan chain Sui',
  'portal.funds.setup.label': 'Setup owner',
  'portal.funds.setup.pda.title': 'Smart-wallet PDA',
  'portal.funds.setup.pda.sub': 'Custody, policy, dan sesi nyangkut ke PDA ini',
  'portal.funds.setup.pda.action': 'Inisialisasi',
  'portal.funds.setup.custody.title': 'Dana custody',
  'portal.funds.setup.custody.sub': 'Akun token USDC + WSOL demo',
  'portal.funds.setup.custody.action': 'Daftar',
  'portal.funds.setup.custody.value.funded': 'terisi',
  'portal.funds.setup.policy.title': 'Policy rahasia',
  'portal.funds.setup.policy.sub': 'Batas nominal, kuota, cooldown — tersegel on-chain',
  'portal.funds.setup.policy.action': 'Simpan policy',
  'portal.funds.setup.session.title': 'Sesi agent',
  'portal.funds.setup.session.sub': 'Kunci tandatangan dibatasi waktu untuk agent',
  'portal.funds.setup.session.action': 'Otorisasi sesi',
  'portal.funds.setup.session.regrant': 'Otorisasi ulang',
  'portal.funds.setup.authority.title': 'Authority',
  'portal.funds.setup.authority.sub': 'Owner kontrol wallet hari ini; rotasi recovery menyusul',
  // === Phase 5 keys (issue 103 — Proof Trail). Insert below. ===
  'portal.proof.kicker': 'Jejak Bukti',
  'portal.proof.title': 'Setiap receipt yang dihasilkan agent.',
  'portal.proof.sub':
    'Log berbasis tipografi, ritme hairline. Receipt Jupiter dan Ika yang diloloskan bisa di-expand ke grid bukti yang sama dengan log lama.',
  'portal.proof.pill.empty': 'belum ada receipt',
  'portal.proof.pill.singular': 'receipt',
  'portal.proof.pill.plural': 'receipts',
  'portal.proof.timeline.empty.title': 'Aktivitas terbaru',
  'portal.proof.timeline.empty.body':
    'Belum ada aktivitas agent — preview gate untuk meninggalkan receipt.',
  'portal.proof.row.expand': 'Buka bukti',
  'portal.proof.row.collapse': 'Tutup bukti',
  'portal.proof.row.explorer': 'Lihat transaksi di Solana Explorer',
  'portal.proof.tag.info': 'INFO',
  'portal.proof.tag.allowed': 'DILOLOSKAN',
  'portal.proof.tag.blocked': 'DIBLOK',
  'portal.proof.tag.pending': 'TERTUNDA',
  'portal.proof.tag.error': 'ERROR',
  // === Phase 6 keys (issue 104 — Agent Bridge). Insert below. ===
  'portal.bridge.kicker': 'Agent Bridge',
  'portal.bridge.title': 'Hubungkan agent kamu ke Polet dalam 90 detik.',
  'portal.bridge.sub':
    'Konfigurasi MCP siap-tempel, 5 tool yang dipajang proxy, plus download polet-agent.json untuk SDK CLI. Flow lanjutan ada di konsol legacy di bawah.',
  'portal.bridge.pill': 'MCP · SDK · polet-agent.json',
  'portal.bridge.config.title': 'mcp.json',
  'portal.bridge.config.copy': 'Salin',
  'portal.bridge.config.copied': 'Tersalin',
  'portal.bridge.config.ready':
    'Tempel ini ke Claude Desktop atau MCP host lokal kamu untuk pasang Polet sebagai rail agent.',
  'portal.bridge.config.needsSession':
    'Otorisasi sesi dan isi bensin agent dulu supaya POLET_SESSION_KEY dan POLET_AGENT_KEYPAIR terisi.',
  'portal.bridge.config.openFunds': 'Buka Dana & Setup →',
  'portal.bridge.tools.title': 'Tool',
  'portal.bridge.download.button': 'Unduh polet-agent.json',
  'portal.bridge.download.ready':
    'Pre-config CLI @polet-ai/sdk dengan env yang sama.',
  'portal.bridge.download.needsSession':
    'Tersedia setelah keypair sesi ada di memory.',
  'portal.bridge.download.openFunds': 'Otorisasi sesi →',
  'portal.bridge.advanced.kicker': 'Lanjutan',
  'portal.bridge.advanced.summary':
    'Kontrol khusus untuk recovery, shared quorum, dan Encrypt graph.',
  'portal.bridge.advanced.panel.kicker': 'Fallback operator',
  'portal.bridge.advanced.panel.title': 'Portal tetap rapi; buka kontrol legacy hanya saat perlu.',
  'portal.bridge.advanced.panel.body':
    'Alur demo harian ada di Workspace, Dana, Gate, dan Proof. Bagian ini menjaga power flow yang belum dipindah tetap tersedia tanpa memasukkan aplikasi kedua ke halaman.',
  'portal.bridge.advanced.flow.recovery.title': 'Rotasi recovery',
  'portal.bridge.advanced.flow.recovery.body':
    'Rotasi sesi yang kompromi atau recovery authority dari fallback legacy.',
  'portal.bridge.advanced.flow.quorum.title': 'Shared Ika quorum',
  'portal.bridge.advanced.flow.quorum.body':
    'Cek atau ubah approver bersama untuk jalur approval Ika.',
  'portal.bridge.advanced.flow.encrypt.title': 'Tool Encrypt graph',
  'portal.bridge.advanced.flow.encrypt.body':
    'Jalankan diagnostik ciphertext/decryption untuk jalur official Encrypt.',
  'portal.bridge.advanced.signal.wallet': 'Wallet',
  'portal.bridge.advanced.signal.policy': 'Policy',
  'portal.bridge.advanced.signal.session': 'Session',
  'portal.bridge.advanced.signal.ready': 'Ready',
  'portal.bridge.advanced.signal.missing': 'Belum',
  'portal.bridge.advanced.legacy.kicker': 'Fallback legacy',
  'portal.bridge.advanced.legacy.summary': 'Buka konsol legacy penuh',
  'portal.bridge.advanced.legacy.body':
    'Memuat dashboard all-in-one lama di dalam sandbox scrollable. Pakai hanya untuk kontrol yang belum dipindahkan ke Portal shell.',
  // === Phase 7 keys (issue 105 — Mobile drawer + i18n sweep). Insert below. ===
  'portal.drawer.open': 'Buka navigasi portal',
  'portal.drawer.close': 'Tutup navigasi portal',
  'portal.drawer.backdrop': 'Tutup navigasi portal',
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
