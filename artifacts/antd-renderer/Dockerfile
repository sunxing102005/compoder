# --------- Dependencies Installation Stage -----------
FROM docker.1ms.run/library/node:18.17-bullseye-slim AS deps
WORKDIR /app

ARG proxy

# Install pnpm with optional npm registry override
RUN if [ -n "$proxy" ]; then npm install -g pnpm@9.8.0; else npm install -g pnpm@9.8.0; fi
# If proxy is provided, set pnpm mirror
RUN [ -z "$proxy" ]

# Copy dependency manifests
COPY package.json ./

# Install dependencies
RUN pnpm install

# --------- Build Stage -----------
FROM docker.1ms.run/library/node:18.17-bullseye-slim AS builder
WORKDIR /app

ARG proxy

# Install pnpm with optional npm registry override
RUN if [ -n "$proxy" ]; then npm install -g pnpm@9.8.0 ; else npm install -g pnpm@9.8.0; fi

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN pnpm build

# --------- Runtime Stage -----------
FROM docker.1ms.run/library/node:18.17-bullseye-slim AS runner
WORKDIR /app

ARG proxy

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Copy build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Copy package.json for version information
COPY --from=builder /app/package.json ./package.json

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3012

EXPOSE 3012

# Switch to prebuilt non-root user after root-only steps
USER node

# Health check to validate application is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3012/health || exit 1

# Start application
CMD ["node", "server.js"]
