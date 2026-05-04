import {
  createDcaIntent,
  submitIntent,
  type DcaIntent,
  type ProxyClientOptions,
} from './index.js';

export const DEFAULT_AGENT_RUNTIME_WITNESS = Array.from({ length: 32 }, (_, index) => index + 1);

export type AgentRuntimeScenario = 'allow' | 'block';

export interface LocalAgentRuntimeConfig {
  owner: string;
  sessionKey: string;
  proxyUrl: string;
  encryptionWitness?: number[];
  slippageBps?: number;
  fetch?: typeof fetch;
}

export interface RunDcaScenarioInput {
  scenario?: AgentRuntimeScenario;
  amountUsdc?: number | string;
  intentId?: string;
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

export interface AgentRuntimeResult {
  runtime: 'local-scripted-agent';
  scenario: AgentRuntimeScenario;
  intent: DcaIntent;
  proxyResponse: ProxyEnvelope<DcaRunData>;
  decision: 'allowed' | 'blocked' | 'unknown';
}

export class LocalAgentRuntime {
  constructor(private readonly config: LocalAgentRuntimeConfig) {}

  createDcaIntent(input: RunDcaScenarioInput = {}): DcaIntent {
    const scenario = input.scenario ?? 'allow';
    return createDcaIntent({
      owner: this.config.owner,
      sessionKey: this.config.sessionKey,
      amountUsdc: input.amountUsdc ?? defaultScenarioAmount(scenario),
      encryptionWitness: this.config.encryptionWitness ?? DEFAULT_AGENT_RUNTIME_WITNESS,
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
