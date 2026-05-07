import { render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { HomePage } from './index';
import { AppPage } from './app';

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
}));

vi.mock('../components/WalletDashboard', () => ({
  WalletDashboard: () => (
    <section aria-label="Mock DCA workflow">
      <h2>DCA Demo</h2>
      <p>Checklist demo</p>
    </section>
  ),
}));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Routes information architecture', () => {
  test('Home (/) is a marketing landing — not the operational DCA workspace', () => {
    render(<HomePage />);

    const bodyText = document.body.textContent ?? '';

    // Walrus-pattern hero markers
    expect(bodyText).toContain('Your confidential control layer');
    expect(bodyText).toContain('Confidential control');
    expect(bodyText).toContain('for AI agents');
    expect(bodyText).toContain('Start building');

    // Manifesto / problem section markers
    expect(bodyText).toContain('The delegation problem');
    expect(bodyText).toContain('AI agents need wallets');
    expect(bodyText).toContain('Public rules are exploitable');

    // Other landing sections
    expect(bodyText).toContain('Encrypt');
    expect(bodyText).toContain('Ika dWallet');
    expect(bodyText).toContain('Jupiter');
    expect(bodyText).toContain('Honest disclaimer');
    expect(bodyText).toContain('Tests passing');
    expect(bodyText).toContain('Security model');

    // Walrus-style anti-thesis was removed (restored to manifesto/problem cards)
    expect(bodyText).not.toContain('No god mode');
    expect(bodyText).not.toContain('No threshold leaks');

    // The operational console UI should NOT live on the landing
    expect(bodyText).not.toContain('Confidential DCA control panel');
    expect(bodyText).not.toContain('DCA Demo');
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
