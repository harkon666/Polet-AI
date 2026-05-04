export const JUPITER_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const JUPITER_SOL_MINT = 'So11111111111111111111111111111111111111112';

const DEFAULT_TOKENS_BASE_URL = 'https://api.jup.ag/tokens/v2';
const DEFAULT_PRICE_BASE_URL = 'https://lite-api.jup.ag/price/v3';
const DEFAULT_SWAP_BASE_URL = 'https://api.jup.ag/swap/v2';

export type JupiterFetch = typeof fetch;

export interface JupiterGatewayConfig {
  apiKey?: string;
  fetch?: JupiterFetch;
  tokensBaseUrl?: string;
  priceBaseUrl?: string;
  swapBaseUrl?: string;
  requireApiKey?: boolean;
}

export interface JupiterTokenInfo {
  id: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: string;
  tags?: string[];
  tokenProgram?: string;
  liquidity?: number;
  holderCount?: number;
  audit?: {
    mintAuthorityDisabled?: boolean;
    freezeAuthorityDisabled?: boolean;
    topHoldersPercentage?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface JupiterPriceInfo {
  id: string;
  usdPrice?: number;
  price?: number;
  blockId?: number;
  [key: string]: unknown;
}

export interface JupiterApiInstruction {
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string;
}

export interface JupiterBuildResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string;
  swapMode?: string;
  slippageBps?: number;
  routePlan?: unknown[];
  computeBudgetInstructions: JupiterApiInstruction[];
  setupInstructions: JupiterApiInstruction[];
  swapInstruction: JupiterApiInstruction;
  cleanupInstruction: JupiterApiInstruction | null;
  otherInstructions: JupiterApiInstruction[];
  tipInstruction: JupiterApiInstruction | null;
  addressesByLookupTableAddress: Record<string, string[]> | null;
  blockhashWithMetadata?: {
    blockhash: number[];
    lastValidBlockHeight: number;
  };
  [key: string]: unknown;
}

export interface JupiterBuildSwapRequest {
  inputMint: string;
  outputMint: string;
  amount: string | number | bigint;
  taker: string;
  slippageBps?: number;
  payer?: string;
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
  maxAccounts?: number;
  wrapAndUnwrapSol?: boolean;
}

export interface JupiterRecurringCompatibility {
  compatible: boolean;
  mode: 'recurring' | 'swap-build-fallback';
  reason: string;
  checkedAt: string;
  requirements: string[];
}

export interface JupiterDcaStrategyRequest extends JupiterBuildSwapRequest {
  intervalSeconds?: number;
}

export interface JupiterDcaStrategyPlan {
  inputToken: JupiterTokenInfo;
  outputToken: JupiterTokenInfo;
  prices: Record<string, JupiterPriceInfo>;
  recurring: JupiterRecurringCompatibility;
  executionPath: 'recurring' | 'swap-build-fallback';
  build?: JupiterBuildResponse;
}

export class JupiterGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'JupiterGatewayError';
  }
}

export function validateJupiterConfig(config: JupiterGatewayConfig = {}): void {
  const requireApiKey = config.requireApiKey ?? true;
  if (requireApiKey && !config.apiKey?.trim()) {
    throw new JupiterGatewayError(
      'Missing JUPITER_API_KEY for Jupiter gateway requests',
      'JUPITER_API_KEY_MISSING'
    );
  }
}

export class JupiterStrategyGateway {
  private readonly apiKey?: string;
  private readonly fetchImpl: JupiterFetch;
  private readonly tokensBaseUrl: string;
  private readonly priceBaseUrl: string;
  private readonly swapBaseUrl: string;
  private readonly requireApiKey: boolean;

  constructor(config: JupiterGatewayConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.JUPITER_API_KEY;
    this.fetchImpl = config.fetch ?? fetch;
    this.tokensBaseUrl = trimTrailingSlash(config.tokensBaseUrl ?? DEFAULT_TOKENS_BASE_URL);
    this.priceBaseUrl = trimTrailingSlash(config.priceBaseUrl ?? DEFAULT_PRICE_BASE_URL);
    this.swapBaseUrl = trimTrailingSlash(config.swapBaseUrl ?? DEFAULT_SWAP_BASE_URL);
    this.requireApiKey = config.requireApiKey ?? true;
  }

  validateConfig(): void {
    validateJupiterConfig({
      apiKey: this.apiKey,
      requireApiKey: this.requireApiKey,
    });
  }

  async fetchTokenMetadata(mints: string[]): Promise<Record<string, JupiterTokenInfo>> {
    this.validateConfig();
    if (mints.length === 0) {
      throw new JupiterGatewayError('At least one mint is required', 'JUPITER_INVALID_REQUEST');
    }

    const url = new URL(`${this.tokensBaseUrl}/search`);
    url.searchParams.set('query', mints.join(','));

    const data = await this.requestJson<unknown>(url);
    if (!Array.isArray(data)) {
      throw new JupiterGatewayError('Unexpected Jupiter Tokens response', 'JUPITER_BAD_RESPONSE');
    }

    const byMint: Record<string, JupiterTokenInfo> = {};
    for (const item of data) {
      if (isTokenInfo(item)) {
        byMint[item.id] = item;
      }
    }

    for (const mint of mints) {
      if (!byMint[mint]) {
        throw new JupiterGatewayError(`Jupiter token metadata missing for mint ${mint}`, 'JUPITER_TOKEN_NOT_FOUND');
      }
    }

    return byMint;
  }

  async fetchPrices(mints: string[]): Promise<Record<string, JupiterPriceInfo>> {
    this.validateConfig();
    if (mints.length === 0) {
      throw new JupiterGatewayError('At least one mint is required', 'JUPITER_INVALID_REQUEST');
    }

    const url = new URL(this.priceBaseUrl);
    url.searchParams.set('ids', mints.join(','));

    const data = await this.requestJson<unknown>(url);
    if (!data || typeof data !== 'object') {
      throw new JupiterGatewayError('Unexpected Jupiter Price response', 'JUPITER_BAD_RESPONSE');
    }

    const source = 'data' in data && typeof data.data === 'object' && data.data !== null
      ? data.data as Record<string, unknown>
      : data as Record<string, unknown>;

    const prices: Record<string, JupiterPriceInfo> = {};
    for (const mint of mints) {
      const value = source[mint];
      if (!value || typeof value !== 'object') {
        throw new JupiterGatewayError(`Jupiter price missing for mint ${mint}`, 'JUPITER_PRICE_NOT_FOUND');
      }
      prices[mint] = { id: mint, ...(value as Record<string, unknown>) };
    }

    return prices;
  }

  probeRecurringCompatibility(): JupiterRecurringCompatibility {
    return {
      compatible: false,
      mode: 'swap-build-fallback',
      checkedAt: new Date().toISOString(),
      requirements: [
        'Every DCA run must pass Polet confidential policy enforcement immediately before spending.',
        'The Polet wallet PDA needs raw instruction control so the proxy can compose wallet execution.',
        'The demo path needs externally verifiable allow/block behavior for a single run.',
      ],
      reason: 'Jupiter Recurring supports automated DCA, but this slice cannot prove per-run Polet PDA policy gating or raw instruction composition through Recurring. Use Swap V2 /build fallback for the MVP.',
    };
  }

  async buildSwapInstructions(request: JupiterBuildSwapRequest): Promise<JupiterBuildResponse> {
    this.validateConfig();
    validateBuildSwapRequest(request);

    const url = new URL(`${this.swapBaseUrl}/build`);
    url.searchParams.set('inputMint', request.inputMint);
    url.searchParams.set('outputMint', request.outputMint);
    url.searchParams.set('amount', request.amount.toString());
    url.searchParams.set('taker', request.taker);

    if (request.slippageBps !== undefined) {
      url.searchParams.set('slippageBps', request.slippageBps.toString());
    }
    if (request.payer) {
      url.searchParams.set('payer', request.payer);
    }
    if (request.destinationTokenAccount) {
      url.searchParams.set('destinationTokenAccount', request.destinationTokenAccount);
    }
    if (request.nativeDestinationAccount) {
      url.searchParams.set('nativeDestinationAccount', request.nativeDestinationAccount);
    }
    if (request.maxAccounts !== undefined) {
      url.searchParams.set('maxAccounts', request.maxAccounts.toString());
    }
    if (request.wrapAndUnwrapSol !== undefined) {
      url.searchParams.set('wrapAndUnwrapSol', request.wrapAndUnwrapSol.toString());
    }

    const data = await this.requestJson<unknown>(url);
    if (!isBuildResponse(data)) {
      throw new JupiterGatewayError('Unexpected Jupiter Swap /build response', 'JUPITER_BAD_RESPONSE');
    }
    return data;
  }

  async prepareDcaStrategy(request: JupiterDcaStrategyRequest): Promise<JupiterDcaStrategyPlan> {
    const [tokens, prices] = await Promise.all([
      this.fetchTokenMetadata([request.inputMint, request.outputMint]),
      this.fetchPrices([request.inputMint, request.outputMint]),
    ]);
    const recurring = this.probeRecurringCompatibility();

    if (recurring.compatible) {
      return {
        inputToken: tokens[request.inputMint],
        outputToken: tokens[request.outputMint],
        prices,
        recurring,
        executionPath: 'recurring',
      };
    }

    const build = await this.buildSwapInstructions(request);
    return {
      inputToken: tokens[request.inputMint],
      outputToken: tokens[request.outputMint],
      prices,
      recurring,
      executionPath: 'swap-build-fallback',
      build,
    };
  }

  private async requestJson<T>(url: URL): Promise<T> {
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await this.fetchImpl(url, { headers });
    if (!response.ok) {
      const body = await safeReadText(response);
      throw new JupiterGatewayError(
        `Jupiter API request failed with HTTP ${response.status}`,
        'JUPITER_API_ERROR',
        response.status,
        body
      );
    }

    return response.json() as Promise<T>;
  }
}

export function createJupiterStrategyGateway(config: JupiterGatewayConfig = {}): JupiterStrategyGateway {
  return new JupiterStrategyGateway(config);
}

function validateBuildSwapRequest(request: JupiterBuildSwapRequest): void {
  if (!request.inputMint || !request.outputMint || !request.taker) {
    throw new JupiterGatewayError('inputMint, outputMint, and taker are required', 'JUPITER_INVALID_REQUEST');
  }
  const amount = BigInt(request.amount);
  if (amount <= 0n) {
    throw new JupiterGatewayError('amount must be positive', 'JUPITER_INVALID_REQUEST');
  }
}

function isTokenInfo(value: unknown): value is JupiterTokenInfo {
  return Boolean(value)
    && typeof value === 'object'
    && typeof (value as JupiterTokenInfo).id === 'string';
}

function isApiInstruction(value: unknown): value is JupiterApiInstruction {
  const ix = value as JupiterApiInstruction;
  return Boolean(ix)
    && typeof ix === 'object'
    && typeof ix.programId === 'string'
    && Array.isArray(ix.accounts)
    && typeof ix.data === 'string';
}

function isBuildResponse(value: unknown): value is JupiterBuildResponse {
  const response = value as JupiterBuildResponse;
  return Boolean(response)
    && typeof response === 'object'
    && typeof response.inputMint === 'string'
    && typeof response.outputMint === 'string'
    && typeof response.inAmount === 'string'
    && typeof response.outAmount === 'string'
    && Array.isArray(response.computeBudgetInstructions)
    && Array.isArray(response.setupInstructions)
    && isApiInstruction(response.swapInstruction)
    && Array.isArray(response.otherInstructions)
    && 'cleanupInstruction' in response
    && 'tipInstruction' in response;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
