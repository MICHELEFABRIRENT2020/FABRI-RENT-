# FabriGroup Rent Manager - production image (multi-stage, Next.js standalone output).
# Build: docker build -t fabrigroup-rent-manager .
# Run:   see docker-compose.yml (needs DATABASE_URL, AUTH_SECRET at minimum).

FROM node:25-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# --- deps: install once, cached across builds unless package*.json changes ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- build: compile the app and generate the Prisma client ------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at container runtime - docker-compose.yml's `environment:` block
# alone would NOT apply them. Pass as build args (see docker-compose.yml
# `build.args` / `docker build --build-arg`).
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

RUN npx prisma generate
RUN npm run build

# --- runtime: minimal image, only the standalone server output --------------
FROM base AS runtime
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
