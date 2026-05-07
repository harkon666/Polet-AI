import { EyeOff } from 'lucide-react';

interface PrivatePolicyTileProps {
  label: string;
}

export function PrivatePolicyTile({ label }: PrivatePolicyTileProps) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
        <EyeOff className="h-4 w-4 text-[var(--lagoon-deep)]" />
        {label}
      </p>
      <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">********</p>
    </div>
  );
}