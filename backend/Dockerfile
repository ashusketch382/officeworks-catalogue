# Multi-stage build: dev dependencies never reach the runtime image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Both workspace manifests are needed for `npm ci` to accept the shared lockfile.
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend --include-workspace-root=false
COPY backend backend
RUN npm run build -w backend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "backend/dist/server.js"]
