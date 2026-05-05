import { render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { HomePage } from './index';

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

describe('Home page first viewport', () => {
  test('starts as an operational DCA workspace instead of a marketing hero', () => {
    render(<HomePage />);

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Confidential DCA control panel');
    expect(bodyText).toContain('DCA Demo');
    expect(bodyText).toContain('Checklist demo');
    expect(bodyText).not.toContain('Confidential DCA Smart Wallet for AI Agents');
  });
});
