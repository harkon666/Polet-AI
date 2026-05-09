import {
  createMultichainStrategyIntent,
  createDcaIntent,
  createPoletAgentKit,
  submitIntent,
  type DcaIntent,
  type MultichainStrategyIntent,
  type PoletAgentKitConnection,
  type PoletAutoExecuteResult,
  type PoletExternalAgentSignerProvider,
  type ProxyClientOptions,
} from './index.js';

export type AgentRuntimeScenario = 'allow' | 'block' | 'ika' | 'ika-sui' | 'hybrid';

export interface LocalAgentRuntimeConfig {
  owner: string;
  sessionKey: string;
  proxyUrl: string;
  rpcUrl?: string;
  connection?: PoletAgentKitConnection;
  agentSigner?: PoletExternalAgentSignerProvider;
  maskedWitnessDevFixture?: number[];
  slippageBps?: number;
  fetch?: typeof fetch;
}

export interface RunDcaScenarioInput {
  scenario?: Extract<AgentRuntimeScenario, 'allow' | 'block'>;
  amountUsdc?: number | string;
  intentId?: string;
}

export interface RunIkaScenarioInput {
  amountUsdc?: number | string;
  intentId?: string;
  targetChain?: 'sui' | 'ethereum' | 'base';
  targetAsset?: string;
}

export interface ProxyEnvelope<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: {
    code?: string;
    message?: string;
  };
}

export interface DcaRunData {
  allowed?: boolean;
  code?: string;
  reason?: string;
  executionPath?: string;
  smartWalletAuthority?: string;
  transaction?: {
    signers?: string[];
  };
}

export interface IkaRunData {
  allowed?: boolean;
  code?: string;
  status?: string;
  reason?: string;
  ikaRequest?: {
    executionRail?: string;
    intentStrategy?: 'dca' | 'swap';
    settlement?: string;
    requestId?: string;
    preAlphaSigning?: {
      status?: string;
      dwalletAccount?: string;
      ikaMessageHash?: string;
      messageDigest?: string;
      destinationSigningDigest?: unknown;
      messageApprovalPda?: string;
      cpiAuthorityPda?: string;
      signatureScheme?: string;
    };
    suiTransactionDigest?: {
      digestHex?: string;
      digestBase58?: string;
      action?: string;
      network?: string;
      broadcastable?: boolean;
      productionSettlement?: boolean;
    };
    ethereumMessageDigest?: {
      digestHex?: string;
      action?: string;
      network?: string;
      chainId?: number;
      broadcastable?: boolean;
      productionSettlement?: boolean;
    };
    poletApprovalTransaction?: {
      signers?: string[];
    };
    source?: {
      chain?: string;
      asset?: string;
    };
    target?: {
      chain?: string;
      asset?: string;
    };
    amount?: string;
  };
}

export interface AgentRuntimeResult {
  runtime: 'local-scripted-agent';
  scenario: Extract<AgentRuntimeScenario, 'allow' | 'block'>;
  intent: DcaIntent;
  proxyResponse: ProxyEnvelope<DcaRunData>;
  decision: 'allowed' | 'blocked' | 'unknown';
}

export interface AgentAutoExecuteRuntimeResult {
  runtime: 'local-scripted-agent';
  scenario: 'allow';
  intent: DcaIntent;
  execution: PoletAutoExecuteResult;
  decision: PoletAutoExecuteResult['outcome']['decision'];
}

export interface IkaAgentRuntimeResult {
  runtime: 'local-scripted-agent';
  scenario: 'ika' | 'ika-sui';
  intent: MultichainStrategyIntent;
  proxyResponse: ProxyEnvelope<IkaRunData>;
  decision: 'allowed' | 'blocked' | 'unknown';
}

export interface HybridAgentRuntimeResult {
  runtime: 'local-scripted-agent';
  scenario: 'hybrid';
  steps: [
    { name: 'blocked-dca'; result: AgentRuntimeResult },
    { name: 'approved-jupiter-dca'; result: AgentRuntimeResult },
    { name: 'approved-ika-bridgeless'; result: IkaAgentRuntimeResult },
  ];
  summary: {
    blockedDca: AgentRuntimeResult['decision'];
    jupiterDca: AgentRuntimeResult['decision'];
    ikaBridgeless: IkaAgentRuntimeResult['decision'];
  };
}

export class LocalAgentRuntime {
  constructor(private readonly config: LocalAgentRuntimeConfig) {}

  createDcaIntent(input: RunDcaScenarioInput = {}): DcaIntent {
    const scenario = input.scenario ?? 'allow';
    return createDcaIntent({
      owner: this.config.owner,
      sessionKey: this.config.sessionKey,
      amountUsdc: input.amountUsdc ?? defaultScenarioAmount(scenario),
      ...(this.config.maskedWitnessDevFixture && { maskedWitnessDevFixture: this.config.maskedWitnessDevFixture }),
      slippageBps: this.config.slippageBps ?? 100,
      ...(input.intentId && { intentId: input.intentId }),
    });
  }

  createIkaIntent(input: RunIkaScenarioInput = {}): MultichainStrategyIntent {
    return createMultichainStrategyIntent({
      owner: this.config.owner,
      sessionKey: this.config.sessionKey,
      sourceChain: 'solana',
      sourceAsset: 'USDC',
      targetChain: input.targetChain ?? 'sui',
      targetAsset: input.targetAsset ?? 'SUI',
      amount: input.amountUsdc ?? defaultScenarioAmount('allow'),
      executionRail: 'ika',
      strategy: 'dca',
      ...(this.config.maskedWitnessDevFixture && { maskedWitnessDevFixture: this.config.maskedWitnessDevFixture }),
      slippageBps: this.config.slippageBps ?? 100,
      ...(input.intentId && { intentId: input.intentId }),
    });
  }

  async runDcaScenario(input: RunDcaScenarioInput = {}): Promise<AgentRuntimeResult> {
    const scenario = input.scenario ?? 'allow';
    const intent = this.createDcaIntent({ ...input, scenario });
    const proxyOptions: ProxyClientOptions = {
      baseUrl: this.config.proxyUrl,
      ...(this.config.fetch && { fetch: this.config.fetch }),
    };
    const proxyResponse = await submitIntent<ProxyEnvelope<DcaRunData>>(intent, proxyOptions);

    return {
      runtime: 'local-scripted-agent',
      scenario,
      intent,
      proxyResponse,
      decision: toDecision(proxyResponse),
    };
  }

  async runDcaAutoExecuteScenario(input: Omit<RunDcaScenarioInput, 'scenario'> = {}): Promise<AgentAutoExecuteRuntimeResult> {
    const intent = this.createDcaIntent({ ...input, scenario: 'allow' });
    const kit = createPoletAgentKit({
      owner: this.config.owner,
      sessionKey: this.config.sessionKey,
      baseUrl: this.config.proxyUrl,
      ...(this.config.rpcUrl && { rpcUrl: this.config.rpcUrl }),
      ...(this.config.connection && { connection: this.config.connection }),
      ...(this.config.agentSigner && { agentSigner: this.config.agentSigner }),
      ...(this.config.fetch && { fetch: this.config.fetch }),
      ...(this.config.maskedWitnessDevFixture && { maskedWitnessDevFixture: this.config.maskedWitnessDevFixture }),
    });
    const execution = await kit.autoExecuteTrade({
      from: { chain: 'solana', asset: 'USDC', mint: intent.params.inputMint },
      to: { chain: 'solana', asset: 'SOL', mint: intent.params.outputMint },
      amount: intent.params.amountUsdc,
      rail: 'jupiter',
      strategy: 'dca',
      slippageBps: intent.params.slippageBps,
      destinationTokenAccount: intent.params.destinationTokenAccount,
      nativeDestinationAccount: intent.params.nativeDestinationAccount,
      policyHash: intent.policyHash,
      intentId: intent.id,
    });

    return {
      runtime: 'local-scripted-agent',
      scenario: 'allow',
      intent,
      execution,
      decision: execution.outcome.decision,
    };
  }

  async runIkaScenario(input: RunIkaScenarioInput = {}): Promise<IkaAgentRuntimeResult> {
    const intent = this.createIkaIntent(input);
    const proxyOptions: ProxyClientOptions = {
      baseUrl: this.config.proxyUrl,
      ...(this.config.fetch && { fetch: this.config.fetch }),
    };
    const proxyResponse = await submitIntent<ProxyEnvelope<IkaRunData>>(intent, proxyOptions);

    return {
      runtime: 'local-scripted-agent',
      scenario: input.targetChain === undefined || input.targetChain === 'sui' ? 'ika-sui' : 'ika',
      intent,
      proxyResponse,
      decision: toDecision(proxyResponse),
    };
  }

  async runHybridDemo(): Promise<HybridAgentRuntimeResult> {
    const blockedDca = await this.runDcaScenario({
      scenario: 'block',
      intentId: 'hybrid-blocked-dca',
    });
    const jupiterDca = await this.runDcaScenario({
      scenario: 'allow',
      intentId: 'hybrid-approved-jupiter-dca',
    });
    const ikaBridgeless = await this.runIkaScenario({
      amountUsdc: defaultScenarioAmount('allow'),
      intentId: 'hybrid-approved-ika-bridgeless',
    });

    return {
      runtime: 'local-scripted-agent',
      scenario: 'hybrid',
      steps: [
        { name: 'blocked-dca', result: blockedDca },
        { name: 'approved-jupiter-dca', result: jupiterDca },
        { name: 'approved-ika-bridgeless', result: ikaBridgeless },
      ],
      summary: {
        blockedDca: blockedDca.decision,
        jupiterDca: jupiterDca.decision,
        ikaBridgeless: ikaBridgeless.decision,
      },
    };
  }
}

export function createLocalAgentRuntime(config: LocalAgentRuntimeConfig): LocalAgentRuntime {
  return new LocalAgentRuntime(config);
}

export function defaultScenarioAmount(scenario: AgentRuntimeScenario): string {
  return scenario === 'block' ? '25' : '5';
}

function toDecision(response: ProxyEnvelope<DcaRunData>): AgentRuntimeResult['decision'] {
  if (response.data?.allowed === true) return 'allowed';
  if (response.data?.allowed === false) return 'blocked';
  return 'unknown';
}
