import { useEffect, useState } from 'react';

interface HeroAnimatedHeadlineProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

/**
 * Rotates through `words` with a crossfade transition.
 * Designed for use inside an h1 — keep `display: inline-flex` semantics.
 */
export function HeroAnimatedHeadline({
  words,
  intervalMs = 2400,
  className = '',
}: HeroAnimatedHeadlineProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (words.length <= 1) return;

    const tick = setInterval(() => {
      setPhase('out');
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setPhase('in');
      }, 220);
      return () => clearTimeout(swap);
    }, intervalMs);

    return () => clearInterval(tick);
  }, [words.length, intervalMs]);

  if (words.length === 0) return null;

  return (
    <span
      className={`relative inline-flex items-baseline ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Sizing ghost — keeps the longest word's width so layout doesn't jump */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {words.reduce((a, b) => (a.length > b.length ? a : b), '')}
      </span>

      <span
        key={index}
        className="absolute inset-0 whitespace-nowrap text-[var(--lagoon)] transition-[opacity,transform] duration-200 ease-out"
        style={{
          opacity: phase === 'in' ? 1 : 0,
          transform: phase === 'in' ? 'translateY(0)' : 'translateY(-10px)',
          willChange: 'opacity, transform',
        }}
      >
        {words[index]}
      </span>
    </span>
  );
}
