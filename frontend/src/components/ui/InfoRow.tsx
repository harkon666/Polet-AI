interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <span className="text-xs font-semibold text-[var(--sea-ink-soft)]">{label}</span>
      <span className="text-sm font-bold text-[var(--sea-ink)]">{value}</span>
    </div>
  );
}