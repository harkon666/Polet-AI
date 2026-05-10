/**
 * LangChain adapter for Polet.
 *
 * Maps Polet MCP tools into `StructuredTool`-compatible descriptors that
 * LangChain's tool-using agents (ReAct, LangGraph, etc.) can consume. No
 * runtime dep on LangChain — we produce objects matching LangChain's
 * expected shape so callers can wire them via their own
 * `DynamicStructuredTool` constructor if they prefer strict types.
 *
 *   import { createPoletLangChainTools } from '@polet-ai/sdk/adapters/langchain';
 *   import { DynamicStructuredTool } from '@langchain/core/tools';
 *
 *   const tools = createPoletLangChainTools(kit).map(
 *     (t) => new DynamicStructuredTool(t)
 *   );
 */

import type { PoletAgentKit } from '../index.js';
import { createPoletToolSet, type PoletToolCallResult } from '../mcp-server/tools.js';

export interface PoletLangChainTool {
  name: string;
  description: string;
  /** JSON schema describing expected arguments; LangChain accepts this shape. */
  schema: Record<string, unknown>;
  func: (input: Record<string, unknown>) => Promise<string>;
  /** Optional structured variant for callers that prefer the raw result. */
  structuredFunc: (input: Record<string, unknown>) => Promise<PoletToolCallResult>;
}

export function createPoletLangChainTools(kit: PoletAgentKit): PoletLangChainTool[] {
  const tools = createPoletToolSet(kit).list();
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    schema: tool.inputSchema,
    structuredFunc: async (input: Record<string, unknown>) => tool.call(input),
    func: async (input: Record<string, unknown>) => {
      const result = await tool.call(input);
      return JSON.stringify({
        status: result.status,
        ok: result.ok,
        summary: result.summary,
        reason: result.reason,
        code: result.code,
        recoverable: result.recoverable,
        data: result.data,
      });
    },
  }));
}
