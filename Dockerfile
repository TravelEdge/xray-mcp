# Stage 1: Build — compile TypeScript
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm via corepack (correct 2025 method — do NOT use npm install -g pnpm)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Layer cache: copy lockfile first, then install deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

# Stage 2: Runtime — minimal production image
FROM node:24-alpine AS runtime

# Install tini for proper signal handling as PID 1 (not included in Alpine by default)
RUN apk add --no-cache tini

WORKDIR /app

# Install pnpm and production-only dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# D-34: Docker image is HTTP-only
ENV TRANSPORT=http
# D-38: Listen on port 3000
ENV PORT=3000
EXPOSE 3000

# D-39: Docker HEALTHCHECK for docker-compose users (K8s uses its own probes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3000/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# D-37: Run as non-root user
USER node

# D-37: tini as PID 1 for signal forwarding + zombie process reaping
ENTRYPOINT ["/sbin/tini", "--"]

# D-37: Enable source maps for production error stacks
CMD ["node", "--enable-source-maps", "dist/index.js"]
