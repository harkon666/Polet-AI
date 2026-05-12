FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN bun build src/index.ts --outdir=dist --target=bun

# ─────────────────────────────────────────────────────────────────────────────

FROM oven/bun:1-alpine

WORKDIR /app

RUN addgroup -S polet && adduser -S polet -G polet

COPY --from=builder /app/dist ./dist

RUN mkdir -p .polet && chown -R polet:polet /app

USER polet

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=15s \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["bun", "run", "dist/index.js"]
