import { useLocale } from '#shared/hooks/use-locale'
import { MCP_TOOLS } from './agent-config'

/**
 * MCPToolsList, hairline-divided list of the 5 MCP tools the proxy
 * exposes. Mono name + 1-line description per row, no card frame.
 *
 * Constants (`MCP_TOOLS`) live in `agent-config.ts` so SDK runners
 * and other UIs can reuse the same list without depending on this
 * component. Descriptions are localized via i18n keys.
 */
export function MCPToolsList() {
  const { t } = useLocale()
  return (
    <ul data-testid="mcp-tools-list" className="grid">
      {MCP_TOOLS.map((tool) => (
        <li
          key={tool.name}
          data-testid={`mcp-tool-${tool.name}`}
          className="border-b border-line py-3 last:border-b-0"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink">
            {tool.name}
          </p>
          <p className="mt-1 font-sans text-xs text-ink-soft leading-relaxed">
            {t(tool.descriptionKey)}
          </p>
        </li>
      ))}
    </ul>
  )
}
