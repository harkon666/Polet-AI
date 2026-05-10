/**
 * Site-wide configuration constants used by SEO / social metadata.
 *
 * Update `SITE_URL` when a real public deployment URL is configured.
 * Per README § "Program And URLs", public deployment links are not yet
 * pinned; the placeholder below ships a valid-format URL so OG/Twitter
 * card previews render during development.
 */

export const SITE_URL = 'https://polet-ai.example.com';

export const SITE_NAME = 'Polet AI';

/**
 * Canonical SEO description. Kept ≤ 160 chars for search-result snippet
 * compatibility. Do not claim production-grade privacy, mainnet swap
 * execution, or verified Ika settlement (see docs/agents/domain.md).
 */
export const SITE_DESCRIPTION =
  'Polet AI is a confidential Solana control layer for AI agents. Private spending limits, policy-gated Jupiter DCA, and Ika dWallet approvals on devnet pre-alpha.';

export const SITE_KEYWORDS = [
  'solana',
  'ai agent',
  'confidential wallet',
  'smart wallet',
  'jupiter',
  'ika dwallet',
  'encrypt pre-alpha',
  'defi',
  'policy gate',
  'devnet',
].join(', ');

export const OG_IMAGE_PATH = '/og-image.png';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const GITHUB_URL = 'https://github.com/harkon666/Polet-AI';
