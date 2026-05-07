import { createLocalAgentRuntime, type AgentRuntimeScenario } from './local-agent-runtime.js';

type RuntimeEnv = Record<string, string | undefined>;

const env = (((globalThis as unknown as { Bun?: { env: RuntimeEnv }; process?: { env: RuntimeEnv } }).Bun?.env)
  ?? ((globalThis as unknown as { process?: { env: RuntimeEnv } }).process?.env)
  ?? {}) as RuntimeEnv;

async function main() {
  const owner = requiredEnv('POLET_OWNER');
  const sessionKey = requiredEnv('POLET_SESSION_KEY');
  const proxyUrl = env.POLET_PROXY_URL ?? 'http://localhost:3001';
  const scenario = parseScenario(env.POLET_AGENT_SCENARIO);
  const amountUsdc = env.POLET_DCA_AMOUNT_USDC;
  const witness = parseMaskedWitnessDevFixture(env.POLET_MASKED_WITNESS_DEV_FIXTURE);

  const runtime = createLocalAgentRuntime({
    owner,
    sessionKey,
    proxyUrl,
    ...(witness && { encryptionWitness: witness }),
  });

  if (scenario === 'hybrid') {
    const result = await runtime.runHybridDemo();
    console.log(JSON.stringify({
      runtime: result.runtime,
      scenario: result.scenario,
      summary: result.summary,
      steps: result.steps.map((step) => ({
        name: step.name,
        decision: step.result.decision,
        intentId: step.result.intent.id,
        action: step.result.intent.action,
        proxy: {
          success: step.result.proxyResponse.success,
          code: step.result.proxyResponse.data?.code ?? step.result.proxyResponse.error?.code,
          reason: step.result.proxyResponse.data?.reason ?? step.result.proxyResponse.error?.message,
        },
      })),
    }, null, 2));
    return;
  }

  if (scenario === 'ika' || scenario === 'ika-sui') {
    const result = await runtime.runIkaScenario({
      ...(amountUsdc && { amountUsdc }),
    });
    console.log(JSON.stringify({
      runtime: result.runtime,
      scenario: result.scenario,
      decision: result.decision,
      intentId: result.intent.id,
      action: result.intent.action,
      amount: result.intent.params.amount,
      source: `${result.intent.params.sourceChain}:${result.intent.params.sourceAsset}`,
      target: `${result.intent.params.targetChain}:${result.intent.params.targetAsset}`,
      executionRail: result.intent.params.executionRail,
      proxy: {
        success: result.proxyResponse.success,
        code: result.proxyResponse.data?.code ?? result.proxyResponse.error?.code,
        status: result.proxyResponse.data?.status ?? result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.status,
        reason: result.proxyResponse.data?.reason ?? result.proxyResponse.error?.message,
        ikaRequestId: result.proxyResponse.data?.ikaRequest?.requestId,
        dWallet: result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.dwalletAccount,
        messageHash: result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.ikaMessageHash
          ?? result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.messageDigest,
        destinationSigningDigest: result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.destinationSigningDigest,
        suiDigest: result.proxyResponse.data?.ikaRequest?.suiTransactionDigest?.digestBase58,
        ethereumDigest: result.proxyResponse.data?.ikaRequest?.ethereumMessageDigest?.digestHex,
        messageApprovalPda: result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.messageApprovalPda,
        cpiAuthorityPda: result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.cpiAuthorityPda,
        signatureScheme: result.proxyResponse.data?.ikaRequest?.preAlphaSigning?.signatureScheme,
        poletApprovalSigners: result.proxyResponse.data?.ikaRequest?.poletApprovalTransaction?.signers,
        settlement: result.proxyResponse.data?.ikaRequest?.settlement,
      },
    }, null, 2));
    return;
  }

  const result = await runtime.runDcaScenario({
    scenario,
    ...(amountUsdc && { amountUsdc }),
  });

  console.log(JSON.stringify({
    runtime: result.runtime,
    scenario: result.scenario,
    decision: result.decision,
    intentId: result.intent.id,
    action: result.intent.action,
    amountUsdc: result.intent.params.amountUsdc,
    inputMint: result.intent.params.inputMint,
    outputMint: result.intent.params.outputMint,
    proxy: {
      success: result.proxyResponse.success,
      code: result.proxyResponse.data?.code ?? result.proxyResponse.error?.code,
      reason: result.proxyResponse.data?.reason ?? result.proxyResponse.error?.message,
      executionPath: result.proxyResponse.data?.executionPath,
      smartWalletAuthority: result.proxyResponse.data?.smartWalletAuthority,
      signers: result.proxyResponse.data?.transaction?.signers,
    },
  }, null, 2));
}

function requiredEnv(name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseScenario(value: string | undefined): AgentRuntimeScenario {
  if (!value) return 'allow';
  if (value === 'allow' || value === 'block' || value === 'ika' || value === 'ika-sui' || value === 'hybrid') return value;
  throw new Error('POLET_AGENT_SCENARIO must be "allow", "block", "ika", "ika-sui", or "hybrid"');
}

function parseMaskedWitnessDevFixture(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  const bytes = value.split(',').map((part) => Number(part.trim()));
  if (bytes.length !== 32 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('POLET_MASKED_WITNESS_DEV_FIXTURE must be 32 comma-separated bytes');
  }
  return bytes;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
