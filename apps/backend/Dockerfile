# ==============================================================================
# EVERWEAR COMMERCE BACKEND - DOCKERFILE
# Multi-stage production build for Node.js 22 + Express 5 + MongoDB
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies across workspaces
RUN npm ci

# Copy backend source code and tsconfigs
COPY apps/backend ./apps/backend

# Compile TypeScript to dist/
WORKDIR /app/apps/backend
RUN npm run build

# ------------------------------------------------------------------------------
# Production Runner Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9100

RUN apk add --no-cache curl

# Copy root manifests & production modules
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

# Prepare uploads directory and ensure node user ownership
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 9100

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:9100/health || exit 1

CMD ["node", "dist/index.js"]
