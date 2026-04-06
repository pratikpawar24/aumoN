FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache curl

# Copy package files first (better layer caching)
COPY package.json ./
RUN npm install --only=production

# Copy all source files
COPY . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

USER node

CMD ["node", "server.js"]