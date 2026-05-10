# ─── Stage 1: Build Frontend ──────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: Build Rust Backend ──────────────────────────
FROM rust:1.81-slim-bookworm AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
COPY backend/src ./src
RUN cargo build --release

# ─── Stage 3: Final Image ─────────────────────────────────
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    ca-certificates \
    supervisor \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Rust backend
COPY --from=backend-builder /app/target/release/aigent-backend /usr/local/bin/

# Python service
COPY python_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY python_service/ .

# Supervisor config
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
