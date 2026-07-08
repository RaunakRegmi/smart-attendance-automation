# Development image: bind-mount source at runtime; entrypoint runs migrations + nodemon
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies into the image layer (also used when node_modules volume is empty)
COPY package*.json ./
RUN npm ci

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
