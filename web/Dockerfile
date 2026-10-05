# ========================================
# Builder Stage - Build the application
# ========================================
FROM node:24-alpine AS builder

# Install system dependencies for node-gyp
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files for full install
COPY package.json pnpm-lock.yaml ./

# Enable pinned pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Install ALL dependencies for building (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1

# Next inlines public settings during build; runtime env_file cannot replace them.
ARG NEXT_PUBLIC_ENV=test
ARG NEXT_PUBLIC_API
ARG NEXT_PUBLIC_WEB
ARG NEXT_PUBLIC_NAME
ARG NEXT_PUBLIC_LOCALE
ARG NEXT_PUBLIC_TG_BOT

# Build the traced production server and its runtime dependencies.
RUN pnpm run build

# ========================================
# Development Stage - Development runtime with hot reload
# ========================================
FROM node:24-alpine AS development

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Enable pinned pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Install ALL dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Set development environment
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "run", "dev"]

# ========================================
# Runner Stage - Production runtime
# ========================================
FROM node:24-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone includes the compiled config; source files and pnpm are not needed.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
