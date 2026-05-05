# syntax=docker/dockerfile:1
# Build context: repository root (LogiVoice/).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json /app/turbo.json ./
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps

RUN npm run build -w @logivoice/shared
RUN npm run build -w @logivoice/worker
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 logivoice \
  && useradd --system --uid 1001 --gid logivoice logivoice

COPY --from=builder --chown=logivoice:logivoice /app/node_modules ./node_modules
COPY --from=builder --chown=logivoice:logivoice /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=logivoice:logivoice /app/packages/shared ./packages/shared
COPY --from=builder --chown=logivoice:logivoice /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=logivoice:logivoice /app/apps/worker ./apps/worker

ENV NODE_ENV=production
WORKDIR /app/apps/worker
USER logivoice
EXPOSE 8080
CMD ["node", "dist/index.js"]
