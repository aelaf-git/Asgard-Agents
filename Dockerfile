# Debian slim: Solana wallet deps pull in `usb` (node-gyp). Alpine/musl often breaks here;
# node-gyp also expects a `python` executable — bookworm provides python3 only.
FROM node:22-bookworm-slim AS frontend-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libusb-1.0-0-dev \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHON=/usr/bin/python3
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM rust:slim-bookworm AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY backend/ .
RUN cargo build --release

FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx ca-certificates supervisor build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=backend-builder /app/target/release/aigent-backend /usr/local/bin/
COPY python_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY python_service/ .
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
