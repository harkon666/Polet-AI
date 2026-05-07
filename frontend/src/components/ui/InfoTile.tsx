interface InfoTileProps {
  label: string;
  value: string;
  tone?: 'green';
  small?: boolean;
}

export function InfoTile({ label, value, tone, small = false }: InfoTileProps) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">{label}</p>
      <p className={`mt-0.5 break-words font-bold ${small ? 'text-xs' : 'text-sm'} ${tone === 'green' ? 'text-green-500' : 'text-[var(--sea-ink)]'}`}>
        {value}
      </p>
    </div>
  );
}