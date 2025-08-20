FROM oven/bun:1-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json ./
RUN bun install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

ENV BETTER_AUTH_SECRET=dummy-dummy-dummy-dummy-dummy-dummy
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/build
ENV BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}
ENV GITHUB_PAT_SALT=dummy-salt-dummy-salt-dummy-salt-dummy-salt
ENV VALKEY_URL=redis://localhost:6379

# Run tests with test environment
ENV NODE_ENV=test
RUN bun test

# Switch to production for build
ENV NODE_ENV=production
RUN bun run build
#RUN bunx next-openapi-gen generate

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.t* ./
COPY --from=builder --chown=nextjs:nodejs /app/drizzle* ./

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]