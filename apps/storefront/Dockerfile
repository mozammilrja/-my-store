# ==============================================================================
# EVERWEAR STOREFRONT - DOCKERFILE
# Multi-stage production build for Next.js 16 (App Router) on Node.js 22
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

# Copy storefront source code
COPY apps/storefront ./apps/storefront

WORKDIR /app/apps/storefront

# Build environment arguments
ARG EVERWEAR_API_URL=http://backend:9100
ARG NEXT_PUBLIC_API_PUBLIC_URL=https://api.everwear.com
ARG NEXT_PUBLIC_BASE_URL=https://everwear.com
ARG NEXT_PUBLIC_DEFAULT_REGION=in

ENV EVERWEAR_API_URL=${EVERWEAR_API_URL}
ENV NEXT_PUBLIC_API_PUBLIC_URL=${NEXT_PUBLIC_API_PUBLIC_URL}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_DEFAULT_REGION=${NEXT_PUBLIC_DEFAULT_REGION}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ------------------------------------------------------------------------------
# Production Runner Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8001
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl

# Copy root manifests & production modules
COPY package.json package-lock.json ./
COPY apps/storefront/package.json ./apps/storefront/
RUN npm ci --omit=dev

# Copy built Next.js application & public static assets
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/next.config.js ./apps/storefront/
COPY --from=builder /app/apps/storefront/check-env-variables.js ./apps/storefront/

WORKDIR /app/apps/storefront

RUN chown -R node:node /app

USER node

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8001/ || exit 1

CMD ["npm", "run", "start"]
