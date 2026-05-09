interface InfoTileProps {
  label: string;
  value: string;
  tone?: 'green' | 'amber';
  small?: boolean;
}

export function InfoTile({ label, value, tone, small = false }: InfoTileProps) {
  const toneClass = tone === 'green'
    ? 'text-green-500'
    : tone === 'amber'
      ? 'text-amber-600'
      : 'text-[var(--sea-ink)]';

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">{label}</p>
      <p className={`mt-0.5 break-words font-bold ${small ? 'text-xs' : 'text-sm'} ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
