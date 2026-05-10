/**
 * Polet MCP (Model Context Protocol) server.
 *
 * Implements the minimal subset of MCP needed to expose Polet agent
 * tooling to any MCP-capable runtime: Hermes Agent, OpenClaw, Claude
 * Desktop, Cursor, Zed, and custom LLM clients.
 *
 * Transport: JSON-RPC 2.0 over stdin/stdout, newline-delimited messages.
 * No external MCP SDK dependency — the protocol we implement is narrow
 * enough to vendor directly and keeps `@polet-ai/sdk` lean.
 *
 * Run via CLI:
 *   POLET_OWNER=... POLET_SESSION_KEY=... POLET_PROXY_URL=... \
 *   POLET_AGENT_KEYPAIR=<base58 secret> \
 *     npx @polet-ai/sdk mcp-server
 *
 * Or declare in an MCP client config (e.g. Claude Desktop's `mcp.json`):
 *   {
 *     "mcpServers": {
 *       "polet": {
 *         "command": "bunx",
 *         "args": ["@polet-ai/sdk", "mcp-server"],
 *         "env": {
 *           "POLET_OWNER": "…",
 *           "POLET_SESSION_KEY": "…",
 *           "POLET_AGENT_KEYPAIR": "…",
 *           "POLET_PROXY_URL": "https://polet-proxy.example/"
 *         }
 *       }
 *     }
 *   }
 */

import type { PoletAgentKit } from '../index.js';
import type {
  PoletToolCallResult,
  PoletToolDefinition,
  PoletToolSet,
} from './tools.js';
import { createPoletToolSet } from './tools.js';

export const MCP_PROTOCOL_VERSION = '2025-03-26';
export const MCP_SERVER_NAME = '@polet-ai/mcp-server';
export const MCP_SERVER_VERSION = '0.1.0';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess<T> {
  jsonrpc: '2.0';
  id: string | number | null;
  result: T;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

export interface McpServerOptions {
  kit: PoletAgentKit;
  tools?: PoletToolSet;
  /** Write function; defaults to `process.stdout.write`. */
  write?: (message: string) => void;
  /** Log function for diagnostics; defaults to `process.stderr.write`. */
  log?: (message: string) => void;
}

export class PoletMcpServer {
  private readonly tools: PoletToolSet;
  private readonly write: (message: string) => void;
  private readonly log: (message: string) => void;

  constructor(options: McpServerOptions) {
    this.tools = options.tools ?? createPoletToolSet(options.kit);
    this.write = options.write ?? ((msg) => {
      process.stdout.write(msg);
    });
    this.log = options.log ?? ((msg) => {
      process.stderr.write(msg);
    });
  }

  /** Handle a single JSON-RPC request and return the response (or null for notifications). */
  async handle(raw: string): Promise<string | null> {
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(raw);
    } catch (error) {
      return JSON.stringify(this.error(null, -32700, `Parse error: ${errorMessage(error)}`));
    }
    if (request.jsonrpc !== '2.0' || !request.method) {
      return JSON.stringify(this.error(request.id ?? null, -32600, 'Invalid request'));
    }

    const id = request.id ?? null;
    const isNotification = request.id === undefined;

    try {
      const result = await this.dispatch(request);
      if (isNotification) return null;
      return JSON.stringify(this.success(id, result));
    } catch (error) {
      if (isNotification) {
        this.log(`[polet-mcp] notification error: ${errorMessage(error)}\n`);
        return null;
      }
      return JSON.stringify(this.error(id, -32603, errorMessage(error)));
    }
  }

  /** Register stdin line-handler and run indefinitely. Returns a promise that resolves on stdin EOF. */
  async run(input: NodeJS.ReadableStream = process.stdin): Promise<void> {
    input.setEncoding('utf-8');
    let buffer = '';
    for await (const chunk of input as AsyncIterable<string>) {
      buffer += chunk;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          const response = await this.handle(line);
          if (response !== null) this.write(`${response}\n`);
        }
        newlineIndex = buffer.indexOf('\n');
      }
    }
    // Flush trailing content on EOF.
    const tail = buffer.trim();
    if (tail.length > 0) {
      const response = await this.handle(tail);
      if (response !== null) this.write(`${response}\n`);
    }
  }

  private async dispatch(request: JsonRpcRequest): Promise<unknown> {
    switch (request.method) {
      case 'initialize':
        return this.handleInitialize();
      case 'initialized':
      case 'notifications/initialized':
        return {};
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: this.tools.list().map(toolToMcpDescriptor) };
      case 'tools/call': {
        const params = (request.params ?? {}) as { name?: string; arguments?: unknown };
        if (!params.name) throw new Error('tools/call: name is required');
        const tool = this.tools.get(params.name);
        if (!tool) throw new Error(`Unknown tool: ${params.name}`);
        const result = await tool.call(params.arguments ?? {});
        return toolResultToMcp(result);
      }
      case 'resources/list':
        return { resources: [] };
      case 'prompts/list':
        return { prompts: [] };
      case 'shutdown':
        return {};
      case 'exit':
        return {};
      default:
        throw new Error(`Method not supported: ${request.method}`);
    }
  }

  private handleInitialize(): Record<string, unknown> {
    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: false },
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
      instructions:
        'Polet MCP server exposes agent-friendly tools for multi-chain confidential trading. '
        + 'Use `polet_status` to inspect the owner wallet + policy + Ika registrations, '
        + '`polet_enable_chain` to activate Sui or Ethereum signing when it has not been enabled yet, '
        + 'and `polet_execute` to run an end-to-end trade. '
        + 'Every tool returns a machine-readable `status` field the agent can switch on; amounts '
        + 'that exceed the owner policy return `status = "policy-blocked"` with a reason but without '
        + 'leaking the private thresholds.',
    };
  }

  private success<T>(id: string | number | null, result: T): JsonRpcSuccess<T> {
    return { jsonrpc: '2.0', id, result };
  }

  private error(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcError {
    return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined && { data }) } };
  }
}

function toolToMcpDescriptor(tool: PoletToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
}

function toolResultToMcp(result: PoletToolCallResult): Record<string, unknown> {
  const contentText = result.summary
    ?? (result.ok
      ? 'Polet tool completed successfully.'
      : `Polet tool failed: ${result.reason ?? result.code ?? 'unknown error'}`);
  return {
    content: [
      {
        type: 'text',
        text: contentText,
      },
      {
        type: 'text',
        text: JSON.stringify(result.data, null, 2),
      },
    ],
    isError: !result.ok,
    structuredContent: result.data,
    metadata: {
      status: result.status,
      code: result.code,
      recoverable: result.recoverable ?? false,
    },
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/** Convenience factory when callers already have a kit instance. */
export function createPoletMcpServer(kit: PoletAgentKit): PoletMcpServer {
  return new PoletMcpServer({ kit });
}
