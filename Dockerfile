# ══════════════════════════════════════════════════════════
# LifeOS — Dockerfile (multi-stage)
# Stage 1: build dengan dependencies lengkap (better-sqlite3 = native)
# Stage 2: runtime minimal + standalone output Next.js
# ══════════════════════════════════════════════════════════

# ── Stage 1: builder ──
# trixie (Debian 13) → GLIBC 2.38+ dibutuhkan prebuild better-sqlite3 (arm64)
FROM node:22-trixie-slim AS builder
WORKDIR /app

# Build tools untuk kompilasi native module (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (cache layer terpisah agar cepat)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# ── Stage 2: runtime ──
FROM node:22-trixie-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# User non-root untuk keamanan
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Folder data (SQLite) — volume persisten dari docker-compose
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Standalone output (Next.js otomatis menyertakan node_modules yg dibutuhkan)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Folder migrasi SQL — dibutuhkan migrate() saat server start
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
