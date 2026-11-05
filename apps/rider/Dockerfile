# ==============================================================================
# EVERWEAR RIDER APP - DOCKERFILE
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

# Install dependencies across workspaces
RUN npm ci

# Copy rider source code
COPY apps/rider ./apps/rider

WORKDIR /app/apps/rider

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

# Copy the rider nginx config
COPY apps/rider/nginx.conf /etc/nginx/conf.d/rider.conf

# Copy compiled SPA static artifacts
COPY --from=builder /app/apps/rider/dist /usr/share/nginx/html

EXPOSE 7201

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:7201/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
