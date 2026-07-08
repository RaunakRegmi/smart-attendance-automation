# Build the Angular admin, then serve the static bundle with nginx.
# nginx also reverse-proxies /api -> backend, so the app's relative apiUrl ('/api') works with no CORS.

# ── Stage 1: build ──
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build            # production build -> dist/admin/browser

# ── Stage 2: serve ──
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/admin/browser /usr/share/nginx/html
EXPOSE 80
