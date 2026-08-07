# ---- Stage 1: build the React/Vite frontend ----
FROM node:20-alpine AS build
WORKDIR /build
COPY app/package.json app/package-lock.json ./app/
WORKDIR /build/app
RUN npm ci
COPY app/ ./
RUN npm run build
# produces /build/app/dist

# ---- Stage 2: runtime (API + static frontend) ----
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    RAIDEX_DATA_DIR=/data \
    RAIDEX_CONTENT_DIR=/app/data \
    RAIDEX_DIST_DIR=/app/app/dist

WORKDIR /app

# server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

# app source + content + built frontend
COPY data ./data
COPY server ./server
COPY --from=build /build/app/dist ./app/dist

# writable store for user data (profiles, barter, ratings)
RUN mkdir -p /data && chown -R node:node /data /app/server
VOLUME ["/data"]

USER node
WORKDIR /app/server

EXPOSE 8080
CMD ["node", "index.js"]
