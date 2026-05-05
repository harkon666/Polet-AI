import { PublicKey } from '@solana/web3.js';
import { parseUsdcAmount } from './confidential-numeric-policy';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  JupiterGatewayError,
  type JupiterDcaStrategyPlan,
  type JupiterStrategyGateway,
  createJupiterStrategyGateway,
} from './jupiter-gateway';
import {
  buildConfidentialTransferSessionTransaction,
  type BuiltTransaction,
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

const USDC_DECIMALS = 6;

export interface ConfidentialDcaRunRequest {
  owner: string;
  sessionKey: string;
  amount?: number | string;
  amountUsdc?: number | string;
  inputMint?: string;
  outputMint?: string;
  slippageBps?: number;
  encryptionWitness: number[];
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
}

export interface ConfidentialDcaRunAllowed {
  allowed: true;
  code: 'DCA_ALLOWED';
  amount: string;
  amountBaseUnits: string;
  executionPath: 'recurring' | 'swap-build-fallback';
  smartWalletAuthority: string;
  jupiterPlan: JupiterDcaStrategyPlan;
  transaction: BuiltTransaction;
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
    | 'TOKEN_CUSTODY_NOT_CONFIGURED';
  reason: string;
  jupiterPlan?: JupiterDcaStrategyPlan;
}

export type ConfidentialDcaRunResult = ConfidentialDcaRunAllowed | ConfidentialDcaRunBlocked;

export interface ConfidentialDcaExecutionDeps extends StrategyExecutionDeps {
  gateway?: JupiterStrategyGateway;
  buildTransaction?: (
    request: Parameters<typeof buildConfidentialTransferSessionTransaction>[0],
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
        encryptionWitness: request.encryptionWitness,
        blockedReason: 'Confidential policy blocked this DCA run.',
        requireDemoCustody: true,
        prepare: async ({ wallet }) => {
          const smartWalletAuthority = wallet.walletPda || deriveWalletPda(request.owner);

          try {
            return await gateway.prepareDcaStrategy({
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
          } catch (error) {
            if (error instanceof JupiterGatewayError) throw error;
            throw new ConfidentialDcaExecutionError('Jupiter precheck failed', 'JUPITER_PRECHECK_FAILED', 502);
          }
        },
        buildAllowed: async ({ wallet, prepared }) => {
          const smartWalletAuthority = wallet.walletPda || deriveWalletPda(request.owner);
          const transaction = await (deps.buildTransaction ?? buildConfidentialTransferSessionTransaction)(
            {
              wallet: smartWalletAuthority,
              sessionKey: request.sessionKey,
              destination: request.destinationTokenAccount ?? wallet.demoCustody.solTokenAccount,
              amount: amountBaseUnits,
              attestationSlot: BigInt(wallet.lastRevokedSlot) + 1n,
              attestationPolicySeq: wallet.policySeq,
              encryptionWitness: request.encryptionWitness,
            },
            PROGRAM_ID_STRING
          );

          return {
            allowed: true,
            code: 'DCA_ALLOWED',
            amount: formatBaseUnits(amountBaseUnits, USDC_DECIMALS),
            amountBaseUnits: amountBaseUnits.toString(),
            executionPath: prepared.executionPath,
            smartWalletAuthority,
            jupiterPlan: prepared,
            transaction,
          };
        },
      },
      deps
    );

    if (!decision.allowed) {
      const { prepared, ...blocked } = decision;
      return {
        ...blocked,
        ...(prepared && { jupiterPlan: prepared }),
      } as ConfidentialDcaRunBlocked;
    }

    return decision.payload;
  } catch (error) {
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
  if (!Array.isArray(request.encryptionWitness) || request.encryptionWitness.length !== 32) {
    throw new ConfidentialDcaExecutionError('encryptionWitness must contain 32 bytes', 'INVALID_DCA_REQUEST');
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
