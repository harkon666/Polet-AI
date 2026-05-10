import { useEffect, useRef, useState } from 'react'

type FieldState = 'clear' | 'encrypting' | 'encrypted' | 'revealing'

const HEX_POOL = '0123456789abcdef'
const SCRAMBLE_TICK_MS = 36 // ~28fps for character cycling
const ENCRYPTING_DURATION_MS = 1000
const REVEALING_DURATION_MS = 700

/**
 * EncryptedField, text that scrambles between cleartext and encrypted hex.
 *
 * Used by the Demo Widget Crypto-Blur Theater to visualize confidential
 * numeric policy: digits glitch-scramble to hex blob, gate evaluates blind,
 * user can optionally reveal cleartext (which server can never do).
 *
 * State machine:
 *   clear        → cleartext, static
 *   encrypting   → digits cycle through hex chars, settle to encrypted hash
 *   encrypted    → final hash, static
 *   revealing    → reverse animation back to cleartext
 *
 * Each character position settles at a staggered offset for organic feel.
 * Respects prefers-reduced-motion: reduce by skipping animation, just
 * snapping between states.
 */
export function EncryptedField({
  value,
  encryptedHash,
  state,
  monoSize = 'md',
  className = '',
}: {
  value: string
  encryptedHash: string
  state: FieldState
  monoSize?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const targetRef = useRef<string>(value)

  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (state === 'clear') {
      setDisplay(value)
      return
    }

    if (state === 'encrypted') {
      setDisplay(encryptedHash)
      return
    }

    // reduced motion → snap to target without scrambling
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(state === 'encrypting' ? encryptedHash : value)
      return
    }

    // animating: encrypting (clear → encrypted) or revealing (encrypted → clear)
    const isEncrypting = state === 'encrypting'
    const source = isEncrypting ? value : encryptedHash
    const target = isEncrypting ? encryptedHash : value
    const duration = isEncrypting ? ENCRYPTING_DURATION_MS : REVEALING_DURATION_MS

    targetRef.current = target
    setDisplay(source)
    startTimeRef.current = performance.now()

    // Pad the shorter string with spaces so per-position morph aligns
    const maxLen = Math.max(source.length, target.length)
    const sourcePadded = source.padEnd(maxLen, ' ')
    const targetPadded = target.padEnd(maxLen, ' ')

    intervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startTimeRef.current
      const progress = Math.min(1, elapsed / duration)

      // each char settles at staggered offset 0..0.6, fully resolved by progress=1
      const next = Array.from({ length: maxLen }, (_, i) => {
        const charSettleStart = (i / maxLen) * 0.4 // first char starts settling at 40% through
        const charProgress = Math.max(0, (progress - charSettleStart) / (1 - charSettleStart))

        if (charProgress >= 1) {
          return targetPadded[i]
        }
        if (charProgress <= 0) {
          // before settling: random hex if numeric/letter source, else preserve format chars
          const sourceChar = sourcePadded[i]
          if (sourceChar === ' ' || sourceChar === '.' || sourceChar === '-' || sourceChar === '·') {
            return sourceChar
          }
          return HEX_POOL[Math.floor(Math.random() * HEX_POOL.length)]
        }
        // mid-settling: random hex with small chance to lock to target
        if (Math.random() < charProgress * 0.3) {
          return targetPadded[i]
        }
        return HEX_POOL[Math.floor(Math.random() * HEX_POOL.length)]
      }).join('')

      setDisplay(next.trimEnd())

      if (progress >= 1) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setDisplay(target)
      }
    }, SCRAMBLE_TICK_MS)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state, value, encryptedHash])

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base md:text-lg',
    lg: 'text-2xl md:text-3xl',
  }[monoSize]

  const isMidAnimation = state === 'encrypting' || state === 'revealing'
  const isEncrypted = state === 'encrypted'

  return (
    <span
      className={`font-mono tabular-nums ${sizeClasses} ${className} ${isMidAnimation ? 'pl-aberration' : ''} ${isEncrypted ? 'pl-encrypted' : ''}`}
      aria-live="polite"
    >
      {display || '\u00a0'}
    </span>
  )
}
