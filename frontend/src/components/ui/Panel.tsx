import type { ReactNode } from 'react';

interface PanelProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  testId?: string;
}

export function Panel({ icon, title, children, testId }: PanelProps) {
  return (
    <div data-testid={testId} className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--sea-ink)]">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--lagoon)]/10 text-[var(--lagoon)]">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}