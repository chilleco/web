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

# Build the application and strip dev dependencies for runtime
RUN pnpm run build && pnpm prune --prod

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
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Enable pinned pnpm via Corepack for runtime commands
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Copy production dependencies only
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/components.json ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
