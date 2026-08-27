# FabriGroup Rent Manager - production image (multi-stage, Next.js standalone output).
# Build: docker build -t fabrigroup-rent-manager .
# Run:   see docker-compose.yml (needs DATABASE_URL, AUTH_SECRET at minimum).

FROM node:22-slim AS base
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

CMD ["node", "server.js"]
