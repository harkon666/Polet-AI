interface InfoPillProps {
  label: string;
  value: string;
  wide?: boolean;
}

export function InfoPill({ label, value, wide = false }: InfoPillProps) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <p className="font-semibold uppercase tracking-normal text-[var(--sea-ink-soft)]">{label}</p>
      <p className="mt-0.5 break-words font-bold text-[var(--sea-ink)]">{value}</p>
    </div>
  );
}