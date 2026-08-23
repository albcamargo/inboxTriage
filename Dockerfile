# Dockerfile - Ubuntu 24.04 LTS + Node 20 + QVAC - Alineado a PITCH.md Runtime demo
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20.18.0
ENV QVAC_MODEL=llama-3.2-1b-instruct-q4
ENV QVAC_MODELS_PATH=/app/models
ENV CONTEXTO_PATH=/app/contexto.json
ENV LOG_PATH=/app/triage.log

RUN apt-get update && apt-get install -y \
    curl ca-certificates gnupg build-essential python3 git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && node -v && npm -v \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install
COPY . .
VOLUME ["/app/models"]
EXPOSE 3000
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
CMD ["bash", "-c", "echo 'InboxTriage - Ubuntu 24.04 - QVAC local' && bash"]
