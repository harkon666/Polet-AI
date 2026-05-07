/**
 * Hero focal visual — single dark elegant frame.
 *
 * Aesthetic direction (post-feedback): replace the busy multi-card mock
 * with one focused dark terminal-styled frame. Atmospheric glow backdrop,
 * subtle 3D tilt, premium drop shadow with brand-tinted color.
 *
 * Pattern: Vercel, Phantom, Linear all use ONE focal visual with
 * atmosphere around it — not multiple satellite elements.
 */
export function ProductFrameMockup() {
  return (
    <div
      className="qe-frame-stage"
      role="img"
      aria-label="Polet wallet console preview showing the confidential policy gate verifying a 5 USDC Sui Ika request — masked thresholds pass, session and slot freshness are valid, and the gate emits an Ika approve_message CPI with an ed25519-prealpha signature scheme."
    >
      {/* Atmospheric glow — sits behind the frame */}
      <span className="qe-frame-stage__glow qe-frame-stage__glow--a" aria-hidden="true" />
      <span className="qe-frame-stage__glow qe-frame-stage__glow--b" aria-hidden="true" />
      <span className="qe-frame-stage__grid" aria-hidden="true" />

      <div className="qe-frame" aria-hidden="true">
        {/* Browser chrome */}
        <div className="qe-frame__chrome">
          <div className="qe-frame__dots">
            <span className="qe-frame__dot qe-frame__dot--red" />
            <span className="qe-frame__dot qe-frame__dot--yellow" />
            <span className="qe-frame__dot qe-frame__dot--green" />
          </div>
          <div className="qe-frame__url">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>polet.ai/app</span>
          </div>
          <div className="qe-frame__chrome-meta">v0.1.0</div>
        </div>

        {/* Viewport — single focused content */}
        <div className="qe-frame__viewport">
          {/* Top bar — verdict pill + program meta */}
          <div className="qe-frame__topbar">
            <span className="qe-frame__verdict-pill">
              <span className="qe-frame__verdict-dot" />
              Policy gate · Live
            </span>
            <span className="qe-frame__program">3bJjt…bkeN</span>
          </div>

          {/* Headline within the frame */}
          <div className="qe-frame__title-row">
            <span className="qe-frame__kicker">Confidential check</span>
            <h3 className="qe-frame__title">
              5 USDC <span className="qe-frame__title-arrow">→</span> Sui Ika
            </h3>
          </div>

          {/* Three-row checklist — masked, session, slot */}
          <ul className="qe-frame__check-list">
            <li className="qe-frame__check">
              <span className="qe-frame__check-key">max_per_run</span>
              <span className="qe-frame__check-mid">●●●●●● ≤ ●●●●●●</span>
              <span className="qe-frame__check-mark">✓</span>
            </li>
            <li className="qe-frame__check">
              <span className="qe-frame__check-key">daily_cap</span>
              <span className="qe-frame__check-mid">●●●●●● + 5 ≤ ●●●●●●</span>
              <span className="qe-frame__check-mark">✓</span>
            </li>
            <li className="qe-frame__check">
              <span className="qe-frame__check-key">session</span>
              <span className="qe-frame__check-mid">ECFFv…QPhSn · 384,192</span>
              <span className="qe-frame__check-mark">✓</span>
            </li>
          </ul>

          {/* Verdict bar */}
          <div className="qe-frame__verdict-bar">
            <span className="qe-frame__verdict-label">Verdict</span>
            <span className="qe-frame__verdict-value">Approved</span>
          </div>

          {/* Outgoing CPI emission */}
          <div className="qe-frame__cpi">
            <span className="qe-frame__cpi-arrow">→</span>
            <span className="qe-frame__cpi-call">ika.approve_message</span>
            <div className="qe-frame__cpi-body">
              <div>
                <span className="qe-frame__cpi-key">msg_hash</span>
                <span className="qe-frame__cpi-val">8d8d…0a0a</span>
              </div>
              <div>
                <span className="qe-frame__cpi-key">scheme</span>
                <span className="qe-frame__cpi-val qe-frame__cpi-val--accent">ed25519-prealpha</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent satellite — one small status pill */}
      <span className="qe-frame-stage__satellite" aria-hidden="true">
        <span className="qe-frame-stage__satellite-dot" />
        Devnet · MessageApproval pending
      </span>
    </div>
  );
}
