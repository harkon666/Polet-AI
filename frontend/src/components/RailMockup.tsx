import { useLocale } from '../hooks/use-locale';
import type { TranslationKey } from '../locale/dictionary';

interface RailMockupProps {
  variant: 'encrypt' | 'ika' | 'jupiter';
}

/**
 * Differentiated per-rail mockup.
 *
 * Shares the macOS-style window chrome (3 dots + title) so the three rail
 * sections feel part of one product surface, but swaps the body so each
 * rail reads visually distinct:
 *
 *   - encrypt → tokenized Rust source (code is the artifact)
 *   - ika     → sequence-flow diagram (signing lifecycle)
 *   - jupiter → route-preview table (strategy response shape)
 *
 * Title + ARIA label are localized; identifiers (hashes, endpoints,
 * code tokens) stay literal because they are technical artifacts, not copy.
 */
export function RailMockup({ variant }: RailMockupProps) {
  const { t } = useLocale();
  const chrome = CHROME[variant];

  return (
    <div className="qe-terminal" role="img" aria-label={t(chrome.ariaKey)}>
      <div className="qe-terminal__header">
        <span className="qe-terminal__dots" aria-hidden="true">
          <span className="qe-terminal__dot" />
          <span className="qe-terminal__dot" />
          <span className="qe-terminal__dot" />
        </span>
        <span className="qe-terminal__title">{t(chrome.titleKey)}</span>
      </div>
      {variant === 'encrypt' && <EncryptCodeBody />}
      {variant === 'ika' && <IkaSequenceBody />}
      {variant === 'jupiter' && <JupiterRouteBody />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encrypt — tokenized Rust source (same code shape as before)
// ---------------------------------------------------------------------------

type Token =
  | { t: 'comment'; v: string }
  | { t: 'key'; v: string }
  | { t: 'str'; v: string }
  | { t: 'num'; v: string }
  | { t: 'fn'; v: string }
  | { t: 'ok'; v: string }
  | { t: 'err'; v: string }
  | { t: 'plain'; v: string };

type Line = Token[] | 'blank';

const ENCRYPT_LINES: Line[] = [
  [{ t: 'comment', v: '// Polet enforces masked numeric guardrail before spend' }],
  [{ t: 'fn', v: 'pub fn enforce_confidential_numeric_policy' }, { t: 'plain', v: '(' }],
  [{ t: 'plain', v: '    wallet: ' }, { t: 'key', v: '&mut Wallet' }, { t: 'plain', v: ',' }],
  [{ t: 'plain', v: '    amount: ' }, { t: 'key', v: 'u64' }, { t: 'plain', v: ',' }],
  [{ t: 'plain', v: '    witness: ' }, { t: 'key', v: '&[u8; 32]' }, { t: 'plain', v: ',' }],
  [{ t: 'plain', v: ') -> ' }, { t: 'key', v: 'Result<()>' }, { t: 'plain', v: ' {' }],
  'blank',
  [{ t: 'plain', v: '    ' }, { t: 'fn', v: 'verify_witness' }, { t: 'plain', v: '(&wallet.confidential_policy, witness)?;' }],
  'blank',
  [
    { t: 'plain', v: '    let max_per_run = ' },
    { t: 'fn', v: 'decrypt_amount' },
    { t: 'plain', v: '(policy.encrypted_max_per_run, witness);' },
  ],
  [
    { t: 'plain', v: '    let daily_cap   = ' },
    { t: 'fn', v: 'decrypt_amount' },
    { t: 'plain', v: '(policy.encrypted_daily_cap,   witness);' },
  ],
  'blank',
  [
    { t: 'fn', v: '    require!' },
    { t: 'plain', v: '(amount <= max_per_run, ' },
    { t: 'err', v: 'AmountLimitExceeded' },
    { t: 'plain', v: ');' },
  ],
  [
    { t: 'fn', v: '    require!' },
    { t: 'plain', v: '(daily_spent + amount <= daily_cap, ' },
    { t: 'err', v: 'DailyLimitExceeded' },
    { t: 'plain', v: ');' },
  ],
  'blank',
  [{ t: 'comment', v: '    // re-encrypt and store updated daily_spent' }],
  [{ t: 'ok', v: '    Ok' }, { t: 'plain', v: '(())' }],
  [{ t: 'plain', v: '}' }],
];

function EncryptCodeBody() {
  return (
    <pre className="qe-terminal__body">
      <code>
        {ENCRYPT_LINES.map((line, i) => (
          <span key={i}>
            {line === 'blank'
              ? '\n'
              : line.map((tok, j) => (
                  <span key={j} className={`qe-tok-${tok.t}`}>
                    {tok.v}
                  </span>
                ))}
            {line !== 'blank' && '\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Ika — sequence-flow diagram (4 stages with connector arrows)
// ---------------------------------------------------------------------------

const IKA_STAGES: Array<{ n: string; label: string; sub: string; accent?: boolean }> = [
  { n: '01', label: 'Agent intent', sub: '/intent/multichain/run' },
  { n: '02', label: 'Policy gate', sub: 'policy_seq · session · numeric', accent: true },
  { n: '03', label: 'CPI approve', sub: 'ika::approve_message' },
  { n: '04', label: 'MessageApproval', sub: 'Pending → Signed' },
];

function IkaSequenceBody() {
  return (
    <div className="qe-rail-seq">
      {IKA_STAGES.map((stage, i) => (
        <div key={stage.n} className="qe-rail-seq__step">
          <div
            className={`qe-rail-seq__node ${stage.accent ? 'qe-rail-seq__node--accent' : ''}`}
          >
            <span className="qe-rail-seq__num">{stage.n}</span>
            <span className="qe-rail-seq__label">{stage.label}</span>
            <span className="qe-rail-seq__sub">{stage.sub}</span>
          </div>
          {i < IKA_STAGES.length - 1 && (
            <span className="qe-rail-seq__arrow" aria-hidden="true">
              ↓
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jupiter — route preview table
// ---------------------------------------------------------------------------

const JUPITER_ROWS: Array<{ label: string; value: string; mono?: boolean; accent?: boolean }> = [
  { label: 'input', value: '5 USDC' },
  { label: 'output', value: '~0.05938 SOL' },
  { label: 'route', value: 'HumidiFi' },
  { label: 'execution', value: 'swap-build-fallback', accent: true },
  { label: 'txPreview', value: 'unsigned smart-wallet tx', mono: true },
];

function JupiterRouteBody() {
  return (
    <div className="qe-rail-route">
      <dl className="qe-rail-route__grid">
        {JUPITER_ROWS.map((row) => (
          <div key={row.label} className="qe-rail-route__row">
            <dt>{row.label}</dt>
            <dd
              className={`${row.mono ? 'qe-rail-route__mono' : ''} ${row.accent ? 'qe-rail-route__accent' : ''}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="qe-rail-route__footnote">
        # unsigned · agent must sign before broadcast
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chrome (title + aria) map
// ---------------------------------------------------------------------------

const CHROME: Record<RailMockupProps['variant'], { titleKey: TranslationKey; ariaKey: TranslationKey }> = {
  encrypt: {
    titleKey: 'rail.encrypt.mockTitle',
    ariaKey: 'rail.encrypt.mockAria',
  },
  ika: {
    titleKey: 'rail.ika.mockTitle',
    ariaKey: 'rail.ika.mockAria',
  },
  jupiter: {
    titleKey: 'rail.jupiter.mockTitle',
    ariaKey: 'rail.jupiter.mockAria',
  },
};
