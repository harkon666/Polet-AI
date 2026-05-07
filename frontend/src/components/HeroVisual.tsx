/**
 * Hero visual — layered floating cards anchored on the right side.
 *
 * Three cards stacked with rotation + offset:
 *   - Back  : Confidential Policy commitment (masked values)
 *   - Middle: Active Session Key info
 *   - Front : Live terminal showing approve_message response
 *
 * Subtle CSS float animation, no JS animation library.
 */
export function HeroVisual() {
  return (
    <div className="qe-hero-visual" aria-hidden="true">
      {/* Card 1 — Confidential policy commitment */}
      <div className="qe-hero-visual__card qe-hero-visual__card--policy">
        <div className="qe-hero-visual__card-head">
          <span className="qe-hero-visual__card-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <span className="qe-hero-visual__card-kicker">Confidential Policy</span>
          <span className="qe-hero-visual__card-status">
            <span className="qe-status-dot" />
            Live
          </span>
        </div>
        <div className="qe-hero-visual__card-grid">
          <div className="qe-hero-visual__row">
            <span className="qe-hero-visual__row-label">max_per_run</span>
            <span className="qe-hero-visual__row-value qe-hero-visual__row-value--masked">
              ●●●●●● USDC
            </span>
          </div>
          <div className="qe-hero-visual__row">
            <span className="qe-hero-visual__row-label">daily_cap</span>
            <span className="qe-hero-visual__row-value qe-hero-visual__row-value--masked">
              ●●●●●● USDC
            </span>
          </div>
          <div className="qe-hero-visual__row">
            <span className="qe-hero-visual__row-label">policy_seq</span>
            <span className="qe-hero-visual__row-value">17</span>
          </div>
        </div>
      </div>

      {/* Card 2 — Active session */}
      <div className="qe-hero-visual__card qe-hero-visual__card--session">
        <div className="qe-hero-visual__card-head">
          <span className="qe-hero-visual__card-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <span className="qe-hero-visual__card-kicker">Session Key</span>
        </div>
        <div className="qe-hero-visual__session-key">ECFFv…QPhSn</div>
        <div className="qe-hero-visual__session-meta">
          <span>granted_slot 384,192</span>
          <span className="qe-hero-visual__session-expires">expires in 2h 14m</span>
        </div>
      </div>

      {/* Card 3 — Terminal response (front) */}
      <div className="qe-hero-visual__card qe-hero-visual__card--terminal">
        <div className="qe-hero-visual__terminal-head">
          <span className="qe-hero-visual__terminal-dots">
            <span />
            <span />
            <span />
          </span>
          <span className="qe-hero-visual__terminal-title">approve_ika_message_as_session</span>
        </div>
        <div className="qe-hero-visual__terminal-body">
          <div className="qe-hero-visual__terminal-line">
            <span className="qe-tok-prompt">›</span>{' '}
            <span className="qe-tok-cmd">policy gate</span>{' '}
            <span className="qe-tok-comment">// 5 USDC eq → Sui</span>
          </div>
          <div className="qe-hero-visual__terminal-line">
            <span className="qe-tok-key">  status</span>:{' '}
            <span className="qe-tok-ok">approved</span>
          </div>
          <div className="qe-hero-visual__terminal-line">
            <span className="qe-tok-key">  amount</span>:{' '}
            <span className="qe-tok-num">5</span>{' '}
            <span className="qe-tok-comment">USDC</span>
          </div>
          <div className="qe-hero-visual__terminal-line">
            <span className="qe-tok-key">  scheme</span>:{' '}
            <span className="qe-tok-hl">ed25519-prealpha</span>
          </div>
          <div className="qe-hero-visual__terminal-line">
            <span className="qe-tok-key">  msg_hash</span>:{' '}
            <span className="qe-tok-str">"8d8d…0a0a"</span>
          </div>
          <div className="qe-hero-visual__terminal-line">
            <span className="qe-tok-comment">// MessageApproval pending · devnet</span>
          </div>
        </div>
      </div>

      {/* Connecting accent dots */}
      <span className="qe-hero-visual__accent qe-hero-visual__accent--top" aria-hidden="true" />
      <span className="qe-hero-visual__accent qe-hero-visual__accent--bottom" aria-hidden="true" />
    </div>
  );
}
