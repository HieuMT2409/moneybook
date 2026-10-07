# Build context = repository root:  docker build -f apps/api/Dockerfile -t moneybook-api .
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma && npm run build -w apps/api

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
# The Prisma CLI (a devDependency) is kept so the container can apply migrations on start.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/package.json apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 3001
# Apply committed migrations; fall back to `db push` only when no migrations exist yet (first demo deploy).
CMD ["sh", "-c", "if [ -d prisma/migrations ]; then npx prisma migrate deploy; else npx prisma db push --skip-generate; fi && node dist/main"]
