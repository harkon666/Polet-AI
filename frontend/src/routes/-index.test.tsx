import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});

globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    // Render Link as a simple anchor for SSR-free test rendering
    // eslint-disable-next-line jsx-a11y/anchor-has-content, react/no-children-prop
    <a {...(props as Record<string, unknown>)} children={children} />
  ),
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('../components/WalletDashboard', () => ({
  WalletDashboard: () => (
    <section aria-label="Mock DCA workflow">
      <h2>DCA Demo</h2>
      <p>Checklist demo</p>
    </section>
  ),
}));

// Import pages AFTER the mocks are registered so TanStack Router + wallet
// providers resolve to the stubs above.
import { HomePage } from './index';
import { AppPage } from './app';

afterEach(() => {
  document.body.innerHTML = '';
});

beforeEach(() => {
  // Default to EN for each test unless explicitly overridden.
  try {
    window.localStorage.removeItem('polet.locale');
  } catch {
    // Ignore — localStorage may be blocked in test env
  }
  document.documentElement.setAttribute('lang', 'en');
});

describe('Routes information architecture', () => {
  test('Home (/) is a marketing landing — not the operational DCA workspace', () => {
    render(<HomePage />);

    const bodyText = document.body.textContent ?? '';

    // Hero (English — default locale)
    expect(bodyText).toContain('Confidential wallet layer');
    expect(bodyText).toContain('Give your agent a budget.');
    expect(bodyText).toContain('Not your wallet.');
    expect(bodyText).toContain('Start building');
    expect(bodyText).toContain('See the policy gate');

    // Manifesto / problem section
    expect(bodyText).toContain('The delegation problem');
    expect(bodyText).toContain('You built a DCA bot that works');
    expect(bodyText).toContain('Your limits are public');

    // Trust strip + stats
    expect(bodyText).toContain('Built on · Integrated with');
    expect(bodyText).toContain('Tests passing');
    expect(bodyText).toContain('Participating in Colosseum Frontier');

    // Flow diagram section
    expect(bodyText).toContain('How it works');
    expect(bodyText).toContain('One contract. One policy gate.');

    // How-you-use-Polet section (new in 085)
    expect(bodyText).toContain('How you use Polet');
    expect(bodyText).toContain('Deposit to your smart wallet');
    expect(bodyText).toContain('Save a confidential policy');
    expect(bodyText).toContain('Grant an agent session key');

    // Rails (all three titles localized)
    expect(bodyText).toContain('Confidential numeric policy'); // rail.encrypt.title
    expect(bodyText).toContain('Bridgeless cross-chain signing'); // rail.ika.title
    expect(bodyText).toContain('Solana DCA strategy rail'); // rail.jupiter.title

    // Security section + threat-model intro (new in 087)
    expect(bodyText).toContain('Security model');
    expect(bodyText).toContain('Layered defenses, no unilateral authority.');
    expect(bodyText).toContain('Assume the agent is compromised.');

    // Demo section + simulation badge (new in 088)
    expect(bodyText).toContain('Try it · no wallet needed');
    expect(bodyText).toContain('See the policy gate in 30 seconds.');
    expect(bodyText).toContain('Simulation · 0ms latency');

    // Disclaimer reframe (089)
    expect(bodyText).toContain('Pre-alpha transparency');
    expect(bodyText).toContain('Every claim is verifiable on devnet.');
    expect(bodyText).toContain('Verified on devnet');
    expect(bodyText).toContain('Deliberately out of scope');

    // Final CTA audience split (091)
    expect(bodyText).toContain('Developers');
    expect(bodyText).toContain('Hackathon reviewers');
    expect(bodyText).toContain('Just curious');

    // Hero preview visual (083)
    expect(bodyText).toContain('Confidential policy');

    // Final CTA
    expect(bodyText).toContain('Try the policy gate on devnet.');

    // Walrus-style anti-thesis was removed
    expect(bodyText).not.toContain('No god mode');
    expect(bodyText).not.toContain('No threshold leaks');

    // The operational console UI should NOT live on the landing
    expect(bodyText).not.toContain('Confidential DCA control panel');
    expect(bodyText).not.toContain('DCA Demo');
  });

  test('Home (/) renders Indonesian copy when locale is id', () => {
    window.localStorage.setItem('polet.locale', 'id');
    document.documentElement.setAttribute('lang', 'id');

    render(<HomePage />);

    const bodyText = document.body.textContent ?? '';

    // Hero ID
    expect(bodyText).toContain('Kasih agent-mu budget.');
    expect(bodyText).toContain('Bukan wallet-mu.');
    expect(bodyText).toContain('Mulai bangun');
    expect(bodyText).toContain('Lihat policy gate-nya');

    // Sections that were EN-only before 080 now localized
    expect(bodyText).toContain('Dibangun dengan · Terintegrasi'); // trust.kicker
    expect(bodyText).toContain('Tes lulus'); // stats.1.label
    expect(bodyText).toContain('Cara kerjanya'); // flow.kicker
    expect(bodyText).toContain('Model keamanan'); // security.kicker
    expect(bodyText).toContain('Lihat policy gate dalam 30 detik.'); // demo.headline
    expect(bodyText).toContain('Transparansi pre-alpha'); // disclaimer.kicker

    // English strings should not leak through when locale is id
    expect(bodyText).not.toContain('Security model');
    expect(bodyText).not.toContain('Pre-alpha transparency');
  });

  test('/app is the operational DCA workspace — not the marketing landing', () => {
    render(<AppPage />);

    const bodyText = document.body.textContent ?? '';

    // Operational console markers
    expect(bodyText).toContain('Wallet console');
    expect(bodyText).toContain('Confidential DCA control panel');
    expect(bodyText).toContain('DCA Demo');
    expect(bodyText).toContain('Checklist demo');

    // Marketing hero should NOT bleed into the operational page
    expect(bodyText).not.toContain('Built on · Integrated with');
    expect(bodyText).not.toContain('Honest disclaimer');
  });
});
