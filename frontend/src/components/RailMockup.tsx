interface RailMockupProps {
  variant: 'encrypt' | 'ika' | 'jupiter';
}

/**
 * Terminal/code-style mockup with realistic-looking content per rail.
 * Used in alternating rail sections on landing.
 */
export function RailMockup({ variant }: RailMockupProps) {
  const config = MOCKUPS[variant];

  return (
    <div className="qe-terminal" role="img" aria-label={config.aria}>
      <div className="qe-terminal__header">
        <span className="qe-terminal__dots" aria-hidden="true">
          <span className="qe-terminal__dot" />
          <span className="qe-terminal__dot" />
          <span className="qe-terminal__dot" />
        </span>
        <span className="qe-terminal__title">{config.title}</span>
      </div>
      <pre className="qe-terminal__body">
        <code>{config.lines.map((line, i) => renderLine(line, i))}</code>
      </pre>
    </div>
  );
}

type Token =
  | { t: 'comment'; v: string }
  | { t: 'prompt'; v: string }
  | { t: 'cmd'; v: string }
  | { t: 'key'; v: string }
  | { t: 'str'; v: string }
  | { t: 'num'; v: string }
  | { t: 'fn'; v: string }
  | { t: 'ok'; v: string }
  | { t: 'err'; v: string }
  | { t: 'hl'; v: string }
  | { t: 'plain'; v: string };

type Line = Token[] | 'blank';

function renderLine(line: Line, key: number) {
  if (line === 'blank') return <span key={key}>{'\n'}</span>;
  return (
    <span key={key}>
      {line.map((tok, j) => (
        <span key={j} className={`qe-tok-${tok.t}`}>
          {tok.v}
        </span>
      ))}
      {'\n'}
    </span>
  );
}

const MOCKUPS: Record<RailMockupProps['variant'], { title: string; aria: string; lines: Line[] }> = {
  encrypt: {
    title: 'contract/confidential_policy.rs',
    aria: 'Rust source showing Polet enforce_confidential_numeric_policy verifying a witness hash and decrypting masked max-per-run, daily-cap, daily-spent before checking an over-limit amount.',
    lines: [
      [{ t: 'comment', v: '// Polet enforces masked numeric guardrail before spend' }],
      [
        { t: 'fn', v: 'pub fn enforce_confidential_numeric_policy' },
        { t: 'plain', v: '(' },
      ],
      [
        { t: 'plain', v: '    wallet: ' },
        { t: 'key', v: '&mut Wallet' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '    amount: ' },
        { t: 'key', v: 'u64' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '    witness: ' },
        { t: 'key', v: '&[u8; 32]' },
        { t: 'plain', v: ',' },
      ],
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
      [{ t: 'plain', v: '    policy.encrypted_daily_spent = ' }, { t: 'fn', v: 'encrypt_amount' }, { t: 'plain', v: '(...);' }],
      [{ t: 'ok', v: '    Ok' }, { t: 'plain', v: '(())' }],
      [{ t: 'plain', v: '}' }],
    ],
  },

  ika: {
    title: 'POST /intent/multichain/run · executionRail = ika',
    aria: 'Mock Ika dWallet approval response showing an approved bridgeless order, message hash, MessageApproval PDA, and signature scheme metadata for a Sui-side intent.',
    lines: [
      [{ t: 'prompt', v: '$ ' }, { t: 'cmd', v: 'curl -X POST $PROXY/intent/multichain/run' }],
      'blank',
      [{ t: 'plain', v: '{' }],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'allowed' },
        { t: 'plain', v: '": ' },
        { t: 'ok', v: 'true' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'code' },
        { t: 'plain', v: '": ' },
        { t: 'str', v: '"IKA_APPROVAL_TRANSACTION_PREPARED"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'ikaRequest' },
        { t: 'plain', v: '": {' },
      ],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'target' },
        { t: 'plain', v: '": { "chain": ' },
        { t: 'str', v: '"sui"' },
        { t: 'plain', v: ', "asset": ' },
        { t: 'str', v: '"SUI"' },
        { t: 'plain', v: ' },' },
      ],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'amount' },
        { t: 'plain', v: '": ' },
        { t: 'num', v: '"5"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'preAlphaSigning' },
        { t: 'plain', v: '": {' },
      ],
      [
        { t: 'plain', v: '      "' },
        { t: 'key', v: 'status' },
        { t: 'plain', v: '": ' },
        { t: 'str', v: '"approval-transaction-prepared"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '      "' },
        { t: 'key', v: 'ikaMessageHash' },
        { t: 'plain', v: '": ' },
        { t: 'str', v: '"8d8d…0a0a"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '      "' },
        { t: 'key', v: 'signatureScheme' },
        { t: 'plain', v: '": ' },
        { t: 'hl', v: '"ed25519-prealpha"' },
      ],
      [{ t: 'plain', v: '    },' }],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'policyAttestation' },
        { t: 'plain', v: '": { "status": ' },
        { t: 'ok', v: '"approved"' },
        { t: 'plain', v: ' }' },
      ],
      [{ t: 'plain', v: '  }' }],
      [{ t: 'plain', v: '}' }],
      'blank',
      [{ t: 'comment', v: '# settlement: not-executed · pre-alpha · devnet only' }],
    ],
  },

  jupiter: {
    title: 'POST /intent/dca/run · 5 USDC → SOL',
    aria: 'Mock Jupiter DCA approved response showing the swap-build-fallback execution path, output amount, route plan, and an unsigned policy-gated smart wallet transaction.',
    lines: [
      [{ t: 'prompt', v: '$ ' }, { t: 'cmd', v: 'curl -X POST $PROXY/intent/dca/run' }],
      'blank',
      [{ t: 'plain', v: '{' }],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'allowed' },
        { t: 'plain', v: '": ' },
        { t: 'ok', v: 'true' },
        { t: 'plain', v: ', ' },
        { t: 'plain', v: '"' },
        { t: 'key', v: 'code' },
        { t: 'plain', v: '": ' },
        { t: 'str', v: '"DCA_ALLOWED"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'amount' },
        { t: 'plain', v: '": ' },
        { t: 'str', v: '"5"' },
        { t: 'plain', v: ', ' },
        { t: 'plain', v: '"' },
        { t: 'key', v: 'executionPath' },
        { t: 'plain', v: '": ' },
        { t: 'hl', v: '"swap-build-fallback"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'jupiterPlan' },
        { t: 'plain', v: '": {' },
      ],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'inputToken' },
        { t: 'plain', v: '":  { "symbol": ' },
        { t: 'str', v: '"USDC"' },
        { t: 'plain', v: ', "decimals": ' },
        { t: 'num', v: '6' },
        { t: 'plain', v: ' },' },
      ],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'outputToken' },
        { t: 'plain', v: '": { "symbol": ' },
        { t: 'str', v: '"SOL"' },
        { t: 'plain', v: ', "decimals": ' },
        { t: 'num', v: '9' },
        { t: 'plain', v: ' },' },
      ],
      [
        { t: 'plain', v: '    "' },
        { t: 'key', v: 'build' },
        { t: 'plain', v: '": {' },
      ],
      [
        { t: 'plain', v: '      "outAmount": ' },
        { t: 'num', v: '"59384569"' },
        { t: 'plain', v: ',' },
      ],
      [
        { t: 'plain', v: '      "routePlan": [{ "swapInfo": { "label": ' },
        { t: 'str', v: '"HumidiFi"' },
        { t: 'plain', v: ' } }]' },
      ],
      [{ t: 'plain', v: '    }' }],
      [{ t: 'plain', v: '  },' }],
      [
        { t: 'plain', v: '  "' },
        { t: 'key', v: 'transaction' },
        { t: 'plain', v: '": { "signers": [' },
        { t: 'str', v: '"sessionKey…"' },
        { t: 'plain', v: '] }' },
      ],
      [{ t: 'plain', v: '}' }],
      'blank',
      [{ t: 'comment', v: '# unsigned · agent must sign before broadcast' }],
    ],
  },
};
