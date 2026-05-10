/**
 * OpenAI function-calling adapter for Polet.
 *
 * Exposes Polet tools in the shape that `openai.chat.completions.create`
 * expects for its `tools` array (or the newer Assistants API). Agents
 * receive JSON-stringified results so the LLM can ingest them as tool
 * messages.
 *
 *   import OpenAI from 'openai';
 *   import { createPoletOpenAiTools, invokePoletOpenAiTool } from '@polet-ai/sdk/adapters/openai';
 *
 *   const openai = new OpenAI();
 *   const polet = createPoletOpenAiTools(kit);
 *   const completion = await openai.chat.completions.create({
 *     model: 'gpt-4o-mini',
 *     messages,
 *     tools: polet.tools,
 *   });
 *   const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
 *   if (toolCall) {
 *     const result = await invokePoletOpenAiTool(polet, toolCall);
 *     messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
 *   }
 */

import type { PoletAgentKit } from '../index.js';
import {
  createPoletToolSet,
  type PoletToolDefinition,
  type PoletToolCallResult,
} from '../mcp-server/tools.js';

export interface OpenAiFunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface PoletOpenAiToolBundle {
  tools: OpenAiFunctionTool[];
  invoke(name: string, argumentsJson: string): Promise<PoletToolCallResult>;
}

export function createPoletOpenAiTools(kit: PoletAgentKit): PoletOpenAiToolBundle {
  const toolSet = createPoletToolSet(kit);
  const openaiTools = toolSet.list().map(toOpenAiTool);
  return {
    tools: openaiTools,
    async invoke(name, argumentsJson) {
      const tool = toolSet.get(name);
      if (!tool) {
        return {
          status: 'failed',
          ok: false,
          data: {},
          code: 'UNKNOWN_TOOL',
          reason: `Polet OpenAI adapter: tool ${name} not found`,
        };
      }
      let parsed: Record<string, unknown> = {};
      try {
        parsed = argumentsJson ? JSON.parse(argumentsJson) : {};
      } catch (error) {
        return {
          status: 'failed',
          ok: false,
          data: { argumentsJson },
          code: 'INVALID_JSON',
          reason: (error as Error).message,
        };
      }
      return tool.call(parsed);
    },
  };
}

function toOpenAiTool(tool: PoletToolDefinition): OpenAiFunctionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

/**
 * Helper that resolves a single OpenAI tool_call into a string ready to
 * feed back into the chat completion as a `role: "tool"` message.
 */
export async function invokePoletOpenAiTool(
  bundle: PoletOpenAiToolBundle,
  toolCall: { function?: { name?: string; arguments?: string } }
): Promise<string> {
  const name = toolCall.function?.name;
  const args = toolCall.function?.arguments ?? '{}';
  if (!name) {
    return JSON.stringify({ status: 'failed', ok: false, reason: 'Missing function name in tool_call' });
  }
  const result = await bundle.invoke(name, args);
  return JSON.stringify(result);
}
