FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/api/package.json apps/api/package.json
COPY packages/prisma packages/prisma
WORKDIR /app/apps/api
RUN npm install
COPY apps/api .
RUN npx prisma generate --schema ../../packages/prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/packages/prisma ./packages/prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
