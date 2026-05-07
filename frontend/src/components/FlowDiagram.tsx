/**
 * SVG architecture diagram showing Polet's policy gate flow:
 *
 *   Owner → Smart Wallet PDA → Confidential Policy → Session Key → Agent
 *                                       │
 *                                  Policy Gate
 *                                  /         \
 *                          Jupiter DCA     Ika dWallet
 *
 * Static SVG, no JS animation. Inline component for landing.
 */
export function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 1080 380"
      className="qe-flow-diagram"
      role="img"
      aria-label="Polet AI architecture: owner sets confidential policy on a Solana smart wallet PDA, grants an AI agent a session key, then a policy gate enforces guardrails before either Jupiter DCA or Ika dWallet signing executes."
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="qe-flow-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Top row: Owner → PDA → Policy → Session → Agent */}
      <Node x={20} y={40} num="01" label="Owner" sub="signs setup" />
      <Edge from={[140, 75]} to={[200, 75]} />

      <Node x={200} y={40} num="02" label="Smart Wallet PDA" sub="seed: polet_wallet" />
      <Edge from={[380, 75]} to={[440, 75]} />

      <Node
        x={440}
        y={40}
        num="03"
        label="Confidential Policy"
        sub="masked numeric guardrail"
        accent
      />
      <Edge from={[620, 75]} to={[680, 75]} />

      <Node x={680} y={40} num="04" label="Session Key" sub="expires_at, slot" />
      <Edge from={[860, 75]} to={[920, 75]} />

      <Node x={920} y={40} num="05" label="AI Agent" sub="submits intent" />

      {/* Connector down from Policy to Gate */}
      <Edge from={[530, 110]} to={[530, 175]} accent />

      {/* Center row: Policy Gate */}
      <Node
        x={400}
        y={175}
        w={260}
        h={70}
        num="06"
        label="Policy Gate"
        sub="policy_seq · session · numeric guardrail"
        accent
      />

      {/* Branches down to rails */}
      <Edge from={[470, 245]} to={[260, 305]} accent />
      <Edge from={[590, 245]} to={[810, 305]} accent />

      {/* Bottom row: Jupiter rail + Ika rail */}
      <Node
        x={140}
        y={305}
        w={240}
        h={60}
        num="07"
        label="Jupiter DCA"
        sub="route/build preview"
        rail
      />
      <Node
        x={690}
        y={305}
        w={240}
        h={60}
        num="07"
        label="Ika dWallet"
        sub="approve_message CPI"
        rail
      />
    </svg>
  );
}

interface NodeProps {
  x: number;
  y: number;
  w?: number;
  h?: number;
  num: string;
  label: string;
  sub: string;
  accent?: boolean;
  rail?: boolean;
}

function Node({ x, y, w = 180, h = 70, num, label, sub, accent, rail }: NodeProps) {
  const bgClass = rail
    ? 'qe-flow-node-bg--rail'
    : accent
    ? 'qe-flow-node-bg--accent'
    : 'qe-flow-node-bg';

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} ry={10} className={bgClass} />
      <text x={x + 12} y={y + 18} className="qe-flow-num">
        {num}
      </text>
      <text x={x + 12} y={y + 40} className="qe-flow-label">
        {label}
      </text>
      <text x={x + 12} y={y + 58} className="qe-flow-sub">
        {sub}
      </text>
    </g>
  );
}

function Edge({ from, to, accent }: { from: [number, number]; to: [number, number]; accent?: boolean }) {
  const [x1, y1] = from;
  const [x2, y2] = to;

  // Use a slight curve when there's vertical offset; straight for axis-aligned
  const sameAxis = x1 === x2 || y1 === y2;
  const path = sameAxis
    ? `M${x1} ${y1} L${x2} ${y2}`
    : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

  return (
    <path
      d={path}
      className={accent ? 'qe-flow-edge--accent' : 'qe-flow-edge'}
      markerEnd="url(#qe-flow-arrow)"
      style={{
        color: accent ? 'var(--lagoon)' : 'var(--line-strong)',
      }}
    />
  );
}
