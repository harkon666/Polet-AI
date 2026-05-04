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
  const witness = parseWitness(env.POLET_ENCRYPTION_WITNESS);

  const runtime = createLocalAgentRuntime({
    owner,
    sessionKey,
    proxyUrl,
    ...(witness && { encryptionWitness: witness }),
  });

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
  if (value === 'allow' || value === 'block') return value;
  throw new Error('POLET_AGENT_SCENARIO must be "allow" or "block"');
}

function parseWitness(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  const bytes = value.split(',').map((part) => Number(part.trim()));
  if (bytes.length !== 32 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('POLET_ENCRYPTION_WITNESS must be 32 comma-separated bytes');
  }
  return bytes;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
