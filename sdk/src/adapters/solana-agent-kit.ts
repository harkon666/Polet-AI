/**
 * Solana Agent Kit (SendAI) adapter for Polet.
 *
 * Exposes Polet tools in the descriptor shape that Solana Agent Kit's
 * action registry consumes. The adapter depends only on shapes — no
 * runtime dep on `@solana-agent-kit/*` — so it can ship without bloating
 * the Polet SDK.
 *
 * Usage:
 *   import { createPoletSolanaAgentKitActions } from '@polet-ai/sdk/adapters/solana-agent-kit';
 *   const actions = createPoletSolanaAgentKitActions(kit);
 *   // register `actions` with your SolanaAgentKit instance / orchestrator.
 */

import type { PoletAgentKit } from '../index.js';
import { createPoletToolSet, type PoletToolDefinition, type PoletToolCallResult } from '../mcp-server/tools.js';

export interface SolanaAgentKitAction<TParams = unknown, TResult = unknown> {
  name: string;
  similes: string[];
  description: string;
  examples: Array<Array<{ input: Record<string, unknown>; output: Record<string, unknown>; explanation: string }>>;
  schema: Record<string, unknown>;
  handler: (agent: unknown, input: TParams) => Promise<TResult>;
}

export function createPoletSolanaAgentKitActions(kit: PoletAgentKit): SolanaAgentKitAction[] {
  const tools = createPoletToolSet(kit);
  return tools.list().map(toAction);
}

function toAction(tool: PoletToolDefinition): SolanaAgentKitAction {
  return {
    name: tool.name,
    similes: deriveSimiles(tool.name),
    description: tool.description,
    examples: buildExamples(tool.name),
    schema: tool.inputSchema,
    handler: async (_agent: unknown, input: unknown): Promise<PoletToolCallResult> => {
      return tool.call(input);
    },
  };
}

function deriveSimiles(toolName: string): string[] {
  switch (toolName) {
    case 'polet_status':
      return ['check polet wallet', 'check trading status', 'polet health', 'is the agent wallet ready'];
    case 'polet_enable_chain':
      return ['enable sui trading', 'enable ethereum trading', 'activate multichain signer', 'turn on cross-chain'];
    case 'polet_trade':
      return ['request polet trade', 'simulate polet trade', 'check if trade is allowed', 'polet swap preview'];
    case 'polet_execute':
      return ['execute polet trade', 'polet swap end to end', 'run confidential trade', 'send trade'];
    default:
      return [toolName.replace(/_/g, ' ')];
  }
}

function buildExamples(toolName: string): SolanaAgentKitAction['examples'] {
  if (toolName === 'polet_execute') {
    return [
      [
        {
          input: { from: 'USDC', to: 'SUI', amount: 5, rail: 'ika' },
          output: {
            status: 'executed',
            ok: true,
            destinationChain: 'sui',
            destinationTxHash: 'sui-tx-...',
          },
          explanation: '5 USDC-equivalent Ika trade executed end-to-end with a signature committed and a Sui devnet broadcast receipt.',
        },
        {
          input: { from: 'USDC', to: 'SUI', amount: 25, rail: 'ika' },
          output: {
            status: 'policy-blocked',
            ok: false,
            recoverable: true,
            code: 'POLICY_VALUE_BLOCKED',
            reason: 'Confidential policy blocked the request; amount exceeds the private cap.',
          },
          explanation: 'Amount over the confidential policy returns a blocked outcome; the private threshold is NOT revealed.',
        },
      ],
    ];
  }
  if (toolName === 'polet_enable_chain') {
    return [
      [
        {
          input: { chain: 'sui' },
          output: { status: 'chain-enabled', ok: true },
          explanation: 'Activates Polet managed multi-chain signer for Sui devnet (one-click setup).',
        },
      ],
    ];
  }
  if (toolName === 'polet_trade') {
    return [
      [
        {
          input: { from: 'USDC', to: 'SOL', amount: 5, rail: 'jupiter' },
          output: { status: 'ok', ok: true },
          explanation: 'Preview a Jupiter DCA route through Polet with a 5 USDC budget and receive the route/build payload.',
        },
      ],
    ];
  }
  return [];
}
