import { Eye, EyeOff } from 'lucide-react';

interface PrivatePolicyTileProps {
  label: string;
  value?: string;
  revealLabel?: string;
  hideLabel?: string;
  onReveal?: () => void;
  onHide?: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export function PrivatePolicyTile({
  label,
  value,
  revealLabel = 'Reveal',
  hideLabel = 'Hide',
  onReveal,
  onHide,
  disabled,
  busy,
}: PrivatePolicyTileProps) {
  const revealed = value !== undefined;
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            {revealed ? <Eye className="h-4 w-4 text-amber-500" /> : <EyeOff className="h-4 w-4 text-[var(--lagoon-deep)]" />}
            {label}
          </p>
          <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{revealed ? `${value} USDC` : '********'}</p>
        </div>
        {(onReveal || onHide) && (
          <button
            onClick={revealed ? onHide : onReveal}
            disabled={disabled || busy}
            className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-bold text-[var(--sea-ink)] disabled:opacity-50"
          >
            {busy ? '...' : revealed ? hideLabel : revealLabel}
          </button>
        )}
      </div>
    </div>
  );
}
