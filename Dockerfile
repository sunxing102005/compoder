# --------- Dependencies Installation Stage -----------
# FROM node:18.17-alpine AS deps
# WORKDIR /app

# ARG proxy

# RUN apk add --no-cache libc6-compat && npm install -g pnpm@9.8.0
# # If proxy is provided, set npm mirror
# RUN [ -z "$proxy" ] || pnpm config set registry https://registry.npmmirror.com/

# # Copy dependency manifests
# COPY package.json pnpm-lock.yaml* ./

# # Check if lockfile exists
# RUN [ -f pnpm-lock.yaml ] || (echo "Lockfile not found." && exit 1)

# # Install dependencies with frozen lockfile for better reproducibility
# RUN pnpm install --frozen-lockfile

# # --------- Build Stage -----------
# FROM node:18.17-alpine AS builder
# WORKDIR /app

# ARG proxy

# RUN apk add --no-cache libc6-compat && npm install -g pnpm@9.8.0

# # Copy dependencies
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# # Build application
# RUN pnpm build

# # --------- Runtime Stage -----------
# FROM node:18.17-alpine AS runner
# WORKDIR /app

# ARG proxy

# # Create non-root user for security
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# RUN apk add --no-cache curl ca-certificates \
#   && update-ca-certificates

# # Copy build artifacts
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/next.config.mjs ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# # Copy package.json for version information
# COPY --from=builder /app/package.json ./package.json
# # Copy data directory if it exists
# COPY --from=builder /app/data ./data

# # Set production environment
# ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1
# ENV PORT 3000

# EXPOSE 3000

# # Switch to non-root user
# USER nextjs

# # Health check to validate application is running properly
# HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
#   CMD curl -f http://localhost:3000/ || exit 1

# # Start application
# CMD ["node", "server.js"]

# FROM docker.1ms.run/library/node:18.17-alpine AS builder
# # MAINTAINER "lapp_sx"
# # LABEL description="IMCompoder"
# WORKDIR /app

# RUN apk add --no-cache libc6-compat \
#   && npm install -g pnpm@10.11.0

# COPY . .

# RUN pnpm install --frozen-lockfile \
#   && npm run release \
#   && npm run release:deps

# FROM docker.1ms.run/library/node:18.17-alpine AS runner
# WORKDIR /app

# COPY --from=builder /app/release ./

# EXPOSE 3000
# CMD ["sh", "./start.sh"]


FROM docker.1ms.run/library/node:23
WORKDIR /app
# Copy manifests from repo root to guarantee pnpm can run even if release lacks them
COPY package.json pnpm-lock.yaml ./
COPY release/ /app/
# Ensure node_modules match the container OS/arch (avoids esbuild platform mismatch)
RUN corepack enable \
  && corepack prepare pnpm@10.11.0 --activate \
  && rm -rf /app/node_modules \
  && pnpm install --prod --frozen-lockfile --ignore-scripts
EXPOSE 3200
RUN npm install pm2 -g
COPY CICD/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["sh", "./entrypoint.sh"]
