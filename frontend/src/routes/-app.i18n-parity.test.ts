import { describe, expect, test } from 'vitest'
import { getTranslation } from '#/locale/dictionary'

/**
 * Polet Portal — Phase 7 i18n parity test (issue 105).
 *
 * Asserts that every `portal.*` key the codebase calls actually
 * resolves to a non-empty string in BOTH locales (EN canonical + ID
 * mirror). The list of keys is the static set the portal pages use;
 * adding a new key + forgetting the ID mirror would make
 * `getTranslation('id', key)` fall back to EN, which violates the
 * "ID is a mirror" rule from `AGENTS.md`.
 *
 * The dictionary's TypeScript union enforces existence at compile
 * time, but that doesn't catch the case where someone copies an EN
 * value into the ID block by accident. The runtime check here
 * catches "ID value is identical to EN" only when EN itself contains
 * Indonesian phrasing — so this is an additive guardrail, not a
 * replacement for human review of `id` values.
 */

const PORTAL_KEYS = [
  // Phase 1 — scaffolding
  'portal.brand.name',
  'portal.brand.kicker',
  'portal.connect.kicker',
  'portal.connect.title',
  'portal.connect.body',
  'portal.nav.workspace',
  'portal.nav.gate',
  'portal.nav.funds',
  'portal.nav.proof',
  'portal.nav.bridge',
  'portal.sidebar.section.pages',
  'portal.sidebar.section.runtime',
  'portal.sidebar.runtime.devnet',
  'portal.sidebar.runtime.proxy',
  'portal.sidebar.runtime.policy',
  'portal.sidebar.runtime.session',
  'portal.sidebar.runtime.online',
  'portal.sidebar.runtime.placeholder',
  // Phase 2 — Workspace
  'portal.workspace.kicker',
  'portal.workspace.status.ready',
  'portal.workspace.status.pending',
  'portal.workspace.title.ready',
  'portal.workspace.title.needsWallet',
  'portal.workspace.title.needsCustody',
  'portal.workspace.title.needsPolicy',
  'portal.workspace.title.needsSession',
  'portal.workspace.title.needsGas',
  'portal.workspace.sub.ready',
  'portal.workspace.sub.needsWallet',
  'portal.workspace.sub.needsCustody',
  'portal.workspace.sub.needsPolicy',
  'portal.workspace.sub.needsSession',
  'portal.workspace.sub.needsGas',
  'portal.readiness.label.wallet',
  'portal.readiness.label.custody',
  'portal.readiness.label.policy',
  'portal.readiness.label.session',
  'portal.readiness.label.gas',
  'portal.readiness.state.done',
  'portal.readiness.state.needs',
  'portal.readiness.state.pending',
  'portal.workspace.cta.openFunds',
  'portal.workspace.cta.openGate',
  'portal.workspace.cta.openProof',
  'portal.workspace.cta.compose',
  'portal.workspace.activity.latest',
  'portal.workspace.activity.empty',
  'portal.workspace.activity.openProof',
  // Phase 3 — Policy Gate
  'portal.gate.kicker',
  'portal.gate.title',
  'portal.gate.sub',
  'portal.gate.status.ready',
  'portal.gate.status.allowed',
  'portal.gate.status.blocked',
  'portal.gate.status.evaluating',
  'portal.gate.composer.run',
  'portal.gate.composer.through',
  'portal.gate.composer.unit',
  'portal.gate.rail.jupiter',
  'portal.gate.rail.ika',
  'portal.gate.scenario.allowJupiter',
  'portal.gate.scenario.block25',
  'portal.gate.scenario.ikaSui',
  'portal.gate.flow.node1.kicker',
  'portal.gate.flow.node1.title.jupiter',
  'portal.gate.flow.node1.title.ika',
  'portal.gate.flow.node1.body.jupiter',
  'portal.gate.flow.node1.body.ika',
  'portal.gate.flow.node1.row.amount',
  'portal.gate.flow.node1.row.route',
  'portal.gate.flow.node1.row.session',
  'portal.gate.flow.node1.route.jupiter',
  'portal.gate.flow.node1.route.ika',
  'portal.gate.flow.node1.session.placeholder',
  'portal.gate.flow.node2.kicker',
  'portal.gate.flow.node2.check.session',
  'portal.gate.flow.node2.check.policy',
  'portal.gate.flow.node2.check.limit',
  'portal.gate.flow.node2.value.sessionActive',
  'portal.gate.flow.node2.value.sessionInactive',
  'portal.gate.flow.node2.value.policyFresh',
  'portal.gate.flow.node2.value.policyEmpty',
  'portal.gate.orb.kicker',
  'portal.gate.orb.allow',
  'portal.gate.orb.block',
  'portal.gate.orb.ready',
  'portal.gate.flow.node3.kicker',
  'portal.gate.flow.node3.title.jupiter',
  'portal.gate.flow.node3.title.ika',
  'portal.gate.flow.node3.body.idle',
  'portal.gate.flow.node3.body.allowed',
  'portal.gate.flow.node3.body.blocked',
  'portal.gate.flow.node3.body.evaluating',
  'portal.gate.flow.node3.verdict.allow',
  'portal.gate.flow.node3.verdict.block',
  'portal.gate.flow.node3.verdict.idle',
  'portal.gate.actions.run',
  'portal.gate.actions.footnote',
  'portal.gate.actions.authorizeSelf.kicker',
  'portal.gate.actions.authorizeSelf.body',
  'portal.gate.actions.authorizeSelf.button',
  'portal.gate.actions.enableSui.kicker',
  'portal.gate.actions.enableSui.body',
  'portal.gate.actions.enableSui.button',
  'portal.gate.composer.amountLabel',
  // Phase 4 — Funds & Setup
  'portal.funds.kicker',
  'portal.funds.title',
  'portal.funds.sub',
  'portal.funds.pill',
  'portal.funds.column.fundsTitle',
  'portal.funds.column.setupTitle',
  'portal.funds.row.usdc.title',
  'portal.funds.row.sol.title',
  'portal.funds.row.gas.title',
  'portal.funds.row.ika.title',
  'portal.funds.actions.deposit',
  'portal.funds.actions.withdraw',
  'portal.funds.actions.fundGas',
  'portal.funds.actions.enableChain',
  'portal.funds.setup.pda.title',
  'portal.funds.setup.custody.title',
  'portal.funds.setup.policy.title',
  'portal.funds.setup.session.title',
  'portal.funds.setup.authority.title',
  'portal.funds.setup.session.regrant',
  // Phase 5 — Proof Trail
  'portal.proof.kicker',
  'portal.proof.title',
  'portal.proof.sub',
  'portal.proof.timeline.empty.body',
  'portal.proof.row.expand',
  'portal.proof.tag.allowed',
  'portal.proof.tag.blocked',
  'portal.proof.tag.info',
  // Phase 6 — Agent Bridge
  'portal.bridge.kicker',
  'portal.bridge.title',
  'portal.bridge.sub',
  'portal.bridge.config.title',
  'portal.bridge.config.copy',
  'portal.bridge.tools.title',
  'portal.bridge.download.button',
  'portal.bridge.advanced.kicker',
  'portal.bridge.advanced.summary',
  'portal.bridge.advanced.panel.title',
  'portal.bridge.advanced.flow.recovery.title',
  'portal.bridge.advanced.flow.quorum.title',
  'portal.bridge.advanced.flow.encrypt.title',
  'portal.bridge.advanced.legacy.summary',
  // Phase 7 — Drawer
  'portal.drawer.open',
  'portal.drawer.close',
  'portal.drawer.backdrop',
] as const

describe('Portal i18n parity (Phase 7 sweep)', () => {
  test('every portal.* key resolves in EN', () => {
    for (const key of PORTAL_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = getTranslation('en' as any, key as any)
      expect(v, `EN missing for key: ${key}`).toBeTruthy()
      expect(v, `EN value equal to key (likely missing) for: ${key}`).not.toBe(
        key,
      )
    }
  })

  test('every portal.* key resolves in ID', () => {
    for (const key of PORTAL_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = getTranslation('id' as any, key as any)
      expect(v, `ID missing for key: ${key}`).toBeTruthy()
      expect(v, `ID value equal to key (likely missing) for: ${key}`).not.toBe(
        key,
      )
    }
  })

  test('ID values are not all identical to EN (basic mirror sanity)', () => {
    let differences = 0
    for (const key of PORTAL_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const en = getTranslation('en' as any, key as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = getTranslation('id' as any, key as any)
      if (en !== id) differences += 1
    }
    // We expect a healthy fraction of keys to actually differ between
    // EN and ID. Keys like `portal.brand.name` (proper noun) or
    // 'portal.gate.composer.unit' ('USDC') stay identical, so the
    // bar is "at least 30 keys differ" — not 100%.
    expect(differences).toBeGreaterThanOrEqual(30)
  })
})
