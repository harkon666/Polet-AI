import { useEffect, useRef, useState } from 'react';

interface StatsCounterProps {
  target: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Counts up from 0 to `target` once the element scrolls into view.
 * Uses IntersectionObserver + requestAnimationFrame — no animation libs.
 */
export function StatsCounter({
  target,
  duration = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: StatsCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    if (typeof IntersectionObserver === 'undefined') {
      setValue(target);
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            const start = performance.now();

            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

            const tick = (now: number) => {
              const t = Math.min((now - start) / duration, 1);
              const eased = easeOutCubic(t);
              setValue(target * eased);
              if (t < 1) requestAnimationFrame(tick);
              else setValue(target);
            };

            requestAnimationFrame(tick);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
