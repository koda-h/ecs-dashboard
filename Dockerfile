# syntax=docker/dockerfile:1

# ---- deps stage ----
# package.json / package-lock.json が変わった時のみ再実行
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---- prisma stage ----
# prisma/schema.prisma が変わった時のみ再実行（ソース変更の影響を受けない）
FROM node:22-alpine AS prisma
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
RUN npx prisma generate

# ---- builder stage ----
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
# deps の .prisma / @prisma/client を Linux 向け生成済みバイナリで上書き
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY . .
# .next/cache をマウントしてインクリメンタルビルドを有効化
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ---- runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma エンジン・スキーマを standalone に含める（prisma ステージから直接取得）
COPY --from=prisma --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=prisma --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
