FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --silent

COPY . .

ARG REACT_APP_API_URL=http://localhost:5000
ARG REACT_APP_AI_URL=http://localhost:7860
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_AI_URL=$REACT_APP_AI_URL

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]