# ==============================================================================
# EVERWEAR OPERATIONS PORTAL - DOCKERFILE
# Admin, warehouse floor, delivery riders and Seller Hub in one SPA
# Multi-stage build: Vite SPA compile + Nginx high-performance static serve
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/operations/package.json ./apps/operations/

# Install dependencies across workspaces
RUN npm ci

# Copy the portal source code
COPY apps/operations ./apps/operations

WORKDIR /app/apps/operations

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

# Copy the portal's nginx config
COPY apps/operations/nginx.conf /etc/nginx/conf.d/operations.conf

# Copy compiled SPA static artifacts
COPY --from=builder /app/apps/operations/dist /usr/share/nginx/html

EXPOSE 7001

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:7001/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
