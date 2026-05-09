import { PublicKey } from '@solana/web3.js';
import { parseUsdcAmount } from './confidential-numeric-policy';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  JupiterGatewayError,
  JupiterQuoteMetadata,
  computeUsdcEquivalentFromQuote,
  type JupiterDcaStrategyPlan,
  type JupiterStrategyGateway,
  createJupiterStrategyGateway,
} from './jupiter-gateway';
import {
  buildPolicyGatedCustodyTradeSessionTransaction,
  type BuiltTransaction,
  type PolicyGatedCustodyTradeTransactionRequest,
} from './transaction-builder';
import {
  PROGRAM_ID,
  PROGRAM_ID_STRING,
  WALLET_SEED,
} from './program-identity';
import {
  executeGuardedStrategy,
  StrategyExecutionError,
  type StrategyExecutionDeps,
} from './strategy-execution';
import type { OfficialEncryptPolicyExecution } from './official-encrypt-policy';
import type { OfficialEncryptPolicyExecutionReference } from './official-encrypt-policy';

const USDC_DECIMALS = 6;



const QUOTE_FRESHNESS_TTL_MS = 60_000;

export interface ConfidentialDcaRunRequest {
  owner: string;
  sessionKey: string;
  amount?: number | string;
  amountUsdc?: number | string;
  inputMint?: string;
  outputMint?: string;
  slippageBps?: number;
  maskedWitnessDevFixture?: number[];
  officialEncrypt?: OfficialEncryptPolicyExecutionReference;
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
}

export interface ConfidentialDcaRunAllowed {
  allowed: true;
  code: 'DCA_ALLOWED';
  amount: string;
  amountBaseUnits: string;
  usdcEquivalent: string;
  usdcEquivalentBaseUnits: string;
  quoteBasedValuation: true;
  executionPath: 'recurring' | 'swap-build-fallback';
  smartWalletAuthority: string;
  jupiterPlan: JupiterDcaStrategyPlan;
  quoteMetadata?: JupiterQuoteMetadata;
  transaction?: BuiltTransaction;
  encryptPolicy?: Extract<OfficialEncryptPolicyExecution, { status: 'encrypt-verified-allowed' }>;
}

export interface ConfidentialDcaRunBlocked {
  allowed: false;
  code:
    | 'SESSION_NOT_AUTHORIZED'
    | 'SESSION_EXPIRED'
    | 'SESSION_STALE'
    | 'POLICY_NOT_CONFIGURED'
    | 'INVALID_POLICY_WITNESS'
    | 'CONFIDENTIAL_POLICY_BLOCKED'
    | 'ENCRYPT_POLICY_GRAPH_NOT_EXECUTED'
    | 'ENCRYPT_POLICY_PENDING'
    | 'ENCRYPT_POLICY_VERIFIED_BLOCKED'
    | 'TOKEN_CUSTODY_NOT_CONFIGURED'
    | 'QUOTE_STALE';
  reason: string;
  status?: 'pending-encrypt-execution' | 'encrypt-verified-blocked';
  encryptPolicy?: Extract<
    OfficialEncryptPolicyExecution,
    { status: 'pending-encrypt-execution' | 'encrypt-verified-blocked' }
  >;
  jupiterPlan?: JupiterDcaStrategyPlan;
  quoteMetadata?: JupiterQuoteMetadata;
  quoteBasedValuation?: true;
}

export type ConfidentialDcaRunResult = ConfidentialDcaRunAllowed | ConfidentialDcaRunBlocked;

export interface ConfidentialDcaExecutionDeps extends StrategyExecutionDeps {
  gateway?: JupiterStrategyGateway;
  quoteFreshnessTtlMs?: number;
  buildTransaction?: (
    request: PolicyGatedCustodyTradeTransactionRequest,
    programId: string
  ) => Promise<BuiltTransaction>;
}

export class ConfidentialDcaExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'ConfidentialDcaExecutionError';
  }
}

export async function runConfidentialDcaExecution(
  request: ConfidentialDcaRunRequest,
  deps: ConfidentialDcaExecutionDeps = {}
): Promise<ConfidentialDcaRunResult> {
  validateRunRequest(request);
  const amountBaseUnits = parseDcaUsdcAmount(request.amountUsdc ?? request.amount);
  const inputMint = request.inputMint ?? JUPITER_USDC_MINT;
  const outputMint = request.outputMint ?? JUPITER_SOL_MINT;
  const gateway = deps.gateway ?? createJupiterStrategyGateway();

  try {
    const decision = await executeGuardedStrategy<JupiterDcaStrategyPlan, ConfidentialDcaRunAllowed>(
      {
        owner: request.owner,
        sessionKey: request.sessionKey,
        amountBaseUnits,
        maskedWitnessDevFixture: request.maskedWitnessDevFixture,
        officialEncrypt: request.officialEncrypt,
        blockedReason: 'Confidential policy blocked this DCA run.',
        requireDemoCustody: true,
        prepare: async ({ wallet }) => {
          const smartWalletAuthority = wallet.walletPda || deriveWalletPda(request.owner);

          try {
            const plan = await gateway.prepareDcaStrategy({
              inputMint,
              outputMint,
              amount: amountBaseUnits,
              taker: smartWalletAuthority,
              payer: smartWalletAuthority,
              destinationTokenAccount: request.destinationTokenAccount ?? wallet.demoCustody.solTokenAccount,
              nativeDestinationAccount: request.nativeDestinationAccount,
              slippageBps: request.slippageBps ?? 100,
              wrapAndUnwrapSol: false,
            });
            assertFreshQuote(plan, deps.quoteFreshnessTtlMs ?? QUOTE_FRESHNESS_TTL_MS);
            return plan;
          } catch (error) {
            if (error instanceof JupiterGatewayError) throw error;
            if (error instanceof StaleQuoteError) throw error;
            throw new ConfidentialDcaExecutionError('Jupiter precheck failed', 'JUPITER_PRECHECK_FAILED', 502);
          }
        },
        buildAllowed: async ({ wallet, prepared, encryptPolicy }) => {
          const smartWalletAuthority = wallet.walletPda || deriveWalletPda(request.owner);
          const destinationTokenAccount = request.destinationTokenAccount ?? wallet.demoCustody.solTokenAccount;
          const shouldBuildLegacyWitnessTransaction = encryptPolicy?.status !== 'encrypt-verified-allowed';
          const quoteIssuedSlot = BigInt(quoteMetadata?.freshness?.slot ?? (BigInt(wallet.lastRevokedSlot) + 1n));
          const transaction = shouldBuildLegacyWitnessTransaction
            ? await (deps.buildTransaction ?? buildPolicyGatedCustodyTradeSessionTransaction)(
              {
                wallet: smartWalletAuthority,
                sessionKey: request.sessionKey,
                usdcTokenAccount: wallet.demoCustody.usdcTokenAccount,
                outputTokenAccount: destinationTokenAccount,
                usdcMint: wallet.demoCustody.usdcMint,
                tokenProgram: wallet.demoCustody.tokenProgram,
                sourceAmount: amountBaseUnits,
                quotedOutputAmount: quoteMetadata ? BigInt(quoteMetadata.expectedOutput) : amountBaseUnits,
                minimumOutputAmount: quoteMetadata ? BigInt(quoteMetadata.minimumOutput) : amountBaseUnits,
                slippageBps: quoteMetadata?.slippageBps ?? request.slippageBps ?? 100,
                quoteIssuedSlot,
                quoteMaxAgeSlots: 150,
                attestationSlot: BigInt(wallet.lastRevokedSlot) + 1n,
                attestationPolicySeq: wallet.policySeq,
                maskedWitnessDevFixture: request.maskedWitnessDevFixture ?? [],
              },
              PROGRAM_ID_STRING
            )
            : undefined;

          const quoteMetadata = prepared.quoteMetadata;
          const usdcEquivalentBaseUnits = quoteMetadata
            ? computeUsdcEquivalentFromQuote(quoteMetadata, USDC_DECIMALS)
            : amountBaseUnits;
          const usdcEquivalent = formatBaseUnits(usdcEquivalentBaseUnits, USDC_DECIMALS);

          return {
            allowed: true,
            code: 'DCA_ALLOWED',
            amount: formatBaseUnits(amountBaseUnits, USDC_DECIMALS),
            amountBaseUnits: amountBaseUnits.toString(),
            usdcEquivalent,
            usdcEquivalentBaseUnits: usdcEquivalentBaseUnits.toString(),
            quoteBasedValuation: true,
            executionPath: prepared.executionPath,
            smartWalletAuthority,
            jupiterPlan: prepared,
            ...(quoteMetadata && { quoteMetadata }),
            ...(transaction && { transaction }),
            ...(encryptPolicy?.status === 'encrypt-verified-allowed' && {
              encryptPolicy,
            }),
          };
        },
      },
      deps
    );

    if (!decision.allowed) {
      const { prepared, ...blocked } = decision;
      return {
        ...blocked,
        ...(blocked.encryptPolicy && { status: blocked.encryptPolicy.status }),
        ...(prepared && { jupiterPlan: prepared }),
      } as ConfidentialDcaRunBlocked;
    }

    return decision.payload;
  } catch (error) {
    if (error instanceof StaleQuoteError) {
      return {
        allowed: false,
        code: 'QUOTE_STALE',
        reason: 'Quote is stale and must be refreshed before policy valuation.',
        jupiterPlan: error.plan,
        ...(error.plan.quoteMetadata && {
          quoteMetadata: error.plan.quoteMetadata,
          quoteBasedValuation: true,
        }),
      };
    }
    if (error instanceof StrategyExecutionError) {
      throw new ConfidentialDcaExecutionError(error.message, error.code, error.status);
    }
    throw error;
  }
}

export function deriveWalletPda(owner: string): string {
  const ownerPubkey = new PublicKey(owner);
  const [walletPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), ownerPubkey.toBuffer()],
    PROGRAM_ID
  );
  return walletPda.toString();
}

function validateRunRequest(request: ConfidentialDcaRunRequest): void {
  if (!request.owner || !request.sessionKey) {
    throw new ConfidentialDcaExecutionError('owner and sessionKey are required', 'INVALID_DCA_REQUEST');
  }
  if (request.amount === undefined && request.amountUsdc === undefined) {
    throw new ConfidentialDcaExecutionError('amountUsdc is required', 'INVALID_DCA_REQUEST');
  }
  if (request.maskedWitnessDevFixture !== undefined && (!Array.isArray(request.maskedWitnessDevFixture) || request.maskedWitnessDevFixture.length !== 32)) {
    throw new ConfidentialDcaExecutionError('maskedWitnessDevFixture must contain 32 bytes when provided', 'INVALID_DCA_REQUEST');
  }
}

function parseDcaUsdcAmount(value: number | string | undefined): bigint {
  try {
    return parseUsdcAmount(value);
  } catch {
    throw new ConfidentialDcaExecutionError(
      value === undefined ? 'amountUsdc is required' : 'amountUsdc must be a positive USDC amount',
      'INVALID_DCA_REQUEST'
    );
  }
}

function formatBaseUnits(amount: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

class StaleQuoteError extends Error {
  constructor(public readonly plan: JupiterDcaStrategyPlan) {
    super('Quote is stale and must be refreshed before policy valuation.');
    this.name = 'StaleQuoteError';
  }
}

function assertFreshQuote(plan: JupiterDcaStrategyPlan, ttlMs: number): void {
  const timestamp = plan.quoteMetadata?.freshness?.timestamp;
  if (!timestamp) return;

  const issuedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > ttlMs) {
    throw new StaleQuoteError(plan);
  }
}
