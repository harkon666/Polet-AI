type BrandKey = 'solana' | 'jupiter' | 'encrypt' | 'ika' | 'anchor';

interface BrandLogoProps {
  brand: BrandKey;
  size?: number;
  className?: string;
}

/**
 * Stylized brand marks for the trust strip. These are simplified SVG
 * representations (not pixel-perfect copies) that capture each brand's
 * visual identity using their characteristic colors and shapes.
 */
export function BrandLogo({ brand, size = 22, className = '' }: BrandLogoProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    className,
    role: 'img' as const,
    'aria-label': BRAND_NAMES[brand],
  };

  switch (brand) {
    case 'solana':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="qe-sol-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="50%" stopColor="#7B61FF" />
              <stop offset="100%" stopColor="#19FB9B" />
            </linearGradient>
          </defs>
          {/* Three diagonal stripes — Solana's signature mark */}
          <path
            d="M7 9 L21 9 L25 5 L11 5 Z M7 16 L21 16 L25 12 L11 12 Z M7 23 L21 23 L25 19 L11 19 Z"
            fill="url(#qe-sol-grad)"
          />
        </svg>
      );

    case 'jupiter':
      return (
        <svg {...props}>
          <defs>
            <linearGradient id="qe-jup-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C7F284" />
              <stop offset="100%" stopColor="#00B4D8" />
            </linearGradient>
          </defs>
          {/* Stylized "J" over orbital ring */}
          <circle cx="16" cy="16" r="13" stroke="url(#qe-jup-grad)" strokeWidth="2" fill="none" opacity="0.6" />
          <path
            d="M14 8 L14 18 a4 4 0 0 1 -8 0"
            stroke="url(#qe-jup-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="20" cy="10" r="2" fill="#FB923C" />
        </svg>
      );

    case 'encrypt':
      return (
        <svg {...props}>
          {/* Padlock with a key icon overlay — confidential signal */}
          <rect x="7" y="14" width="18" height="13" rx="2" stroke="#0d7d77" strokeWidth="2" fill="#e6f4f3" />
          <path d="M11 14 V10 a5 5 0 0 1 10 0 V14" stroke="#0d7d77" strokeWidth="2" fill="none" />
          <circle cx="16" cy="20" r="1.5" fill="#0d7d77" />
          <line x1="16" y1="20" x2="16" y2="23.5" stroke="#0d7d77" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'ika':
      return (
        <svg {...props}>
          {/* Wave / ribbon — bridgeless flow */}
          <path
            d="M3 18 Q 9 10, 16 16 T 29 14"
            stroke="#06B6D4"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M3 22 Q 9 14, 16 20 T 29 18"
            stroke="#06B6D4"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.45"
          />
          <circle cx="3" cy="18" r="2" fill="#06B6D4" />
          <circle cx="29" cy="14" r="2" fill="#06B6D4" />
        </svg>
      );

    case 'anchor':
      return (
        <svg {...props}>
          {/* Anchor icon — Anchor framework */}
          <circle cx="16" cy="6" r="2.5" stroke="#1F2937" strokeWidth="2" fill="none" />
          <line x1="16" y1="8.5" x2="16" y2="24" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
          <line x1="11" y1="13" x2="21" y2="13" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M7 20 a 9 9 0 0 0 18 0"
            stroke="#1F2937"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M5 22 L7 20 L9 22 M23 22 L25 20 L27 22"
            stroke="#1F2937"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    default:
      return null;
  }
}

const BRAND_NAMES: Record<BrandKey, string> = {
  solana: 'Solana',
  jupiter: 'Jupiter',
  encrypt: 'Encrypt Pre-Alpha',
  ika: 'Ika dWallet',
  anchor: 'Anchor 1.0',
};

export function brandName(brand: BrandKey): string {
  return BRAND_NAMES[brand];
}
