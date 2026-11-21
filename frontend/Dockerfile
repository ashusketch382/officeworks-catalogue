# Build the static React app, serve it with nginx, and proxy /api to the backend.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Both workspace manifests are needed for `npm ci` to accept the shared lockfile.
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w frontend --include-workspace-root=false
COPY frontend frontend
RUN npm run build -w frontend

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
