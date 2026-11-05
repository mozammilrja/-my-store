# ==============================================================================
# EVERWEAR SELLER HUB - DOCKERFILE
# Multi-stage build: Vite SPA compile + Nginx high-performance static serve
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/admin/package.json ./apps/admin/
COPY apps/warehouse/package.json ./apps/warehouse/
COPY apps/rider/package.json ./apps/rider/
COPY apps/seller/package.json ./apps/seller/

# Install dependencies across workspaces
RUN npm ci

# Copy seller source code
COPY apps/seller ./apps/seller

WORKDIR /app/apps/seller

# Build Vite SPA with production API URL
ARG VITE_API_URL=https://api.everwear.com
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ------------------------------------------------------------------------------
# Production Static Serving Stage
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/*

# Copy the seller hub nginx config
COPY apps/seller/nginx.conf /etc/nginx/conf.d/seller.conf

# Copy compiled SPA static artifacts
COPY --from=builder /app/apps/seller/dist /usr/share/nginx/html

EXPOSE 7301

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:7301/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
