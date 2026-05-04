import { fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import { DemoTab } from './DemoTab';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});

globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.navigator = dom.window.navigator;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Consumer DCA demo frontend', () => {
  test('hides confidential policy values after save', () => {
    const view = render(<DemoTab />);

    expect(view.getByDisplayValue('10')).toBeTruthy();
    expect(view.getByDisplayValue('20')).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /simpan policy rahasia/i }));

    expect(view.queryByDisplayValue('10')).toBeNull();
    expect(view.queryByDisplayValue('20')).toBeNull();
    expect(view.getByText(/nilai privat disembunyikan/i)).toBeTruthy();
    expect(view.getByText(/maks per run terenkripsi/i)).toBeTruthy();
    expect(view.getByText(/batas harian terenkripsi/i)).toBeTruthy();
  });

  test('displays allowed 5 USDC and blocked 25 USDC runs', () => {
    const view = render(<DemoTab />);

    fireEvent.click(view.getByRole('button', { name: /simpan policy rahasia/i }));
    fireEvent.click(view.getByRole('button', { name: /coba 25 usdc/i }));
    fireEvent.click(view.getByRole('button', { name: /jalankan 5 usdc/i }));

    expect(view.getByText('DIBLOKIR')).toBeTruthy();
    expect(view.getByText('DISETUJUI')).toBeTruthy();
    expect(view.getByText('25 USDC')).toBeTruthy();
    expect(view.getByText('5 USDC')).toBeTruthy();
  });

  test('activity log does not leak private thresholds', () => {
    const view = render(<DemoTab />);

    fireEvent.click(view.getByRole('button', { name: /simpan policy rahasia/i }));
    fireEvent.click(view.getByRole('button', { name: /coba 25 usdc/i }));

    const log = view.getByText(/activity log/i).closest('div');
    expect(log).toBeTruthy();
    const logText = log?.textContent ?? '';

    expect(logText).toContain('DIBLOKIR');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
    expect(logText).not.toContain('max per run 10');
    expect(logText).not.toContain('daily cap 20');
  });

  test('language toggle updates key user-facing flow copy', () => {
    const view = render(<DemoTab />);

    fireEvent.click(view.getByRole('button', { name: /english/i }));

    expect(view.getByText(/confidential dca demo/i)).toBeTruthy();
    expect(view.getByRole('button', { name: /save confidential policy/i })).toBeTruthy();
    expect(view.getByText(/safe log/i)).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /save confidential policy/i }));
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc/i }));

    const activityLog = view.getByText(/activity log/i).parentElement;
    expect(activityLog).toBeTruthy();
    expect(within(activityLog as HTMLElement).getByText('BLOCKED')).toBeTruthy();
  });
});
