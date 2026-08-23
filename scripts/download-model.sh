#!/bin/bash
# scripts/download-model.sh - Baja modelo QVAC 1B Q4 al volumen - Ubuntu 24.04
# Uso: bash scripts/download-model.sh
# Uso Docker: docker compose run --rm app bash scripts/download-model.sh
# Uso con modelo custom: QVAC_MODEL=llama-3.2-3b-instruct-q4 bash scripts/download-model.sh

set -e

MODEL_NAME="${QVAC_MODEL:-llama-3.2-1b-instruct-q4}"
MODELS_PATH="${QVAC_MODELS_PATH:-./models}"
# QVAC SDK registry - si @qvac/sdk tiene CLI download, lo usa primero
# Fallback HuggingFace GGUF compatible Q4
HF_MODEL_ID="QVAC/${MODEL_NAME}"
HF_FALLBACK_URL="https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"

echo "=== InboxTriage - Descarga modelo QVAC ==="
echo "Modelo: $MODEL_NAME"
echo "Path: $MODELS_PATH"
echo "Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

mkdir -p "$MODELS_PATH"
chmod 755 "$MODELS_PATH"

# 1. Intenta via @qvac/sdk CLI si existe (preferido - Tether/QVAC sponsor)
if command -v npx >/dev/null 2>&1; then
  echo "[1/3] Intentando npx @qvac/sdk download..."
  if npx --yes @qvac/sdk --help 2>&1 | grep -q "download"; then
    echo "  QVAC CLI detectado, descargando..."
    npx --yes @qvac/sdk download "$MODEL_NAME" --output "$MODELS_PATH" || echo "  QVAC CLI fallo, continuando a fallback curl"
  else
    echo "  QVAC CLI sin comando download, usando fallback curl"
  fi
else
  echo "[1/3] npx no encontrado, usando curl fallback"
fi

# 2. Fallback curl directo a GGUF - CPU-first, sin GPU discreta
MODEL_FILE="$MODELS_PATH/${MODEL_NAME}.gguf"
if [ ! -f "$MODEL_FILE" ]; then
  echo ""
  echo "[2/3] Descargando modelo via curl (fallback HuggingFace)..."
  echo "  URL: $HF_FALLBACK_URL"
  echo "  Destino: $MODEL_FILE"
  
  if command -v curl >/dev/null 2>&1; then
    curl -L --progress-bar -o "$MODEL_FILE.tmp" "$HF_FALLBACK_URL"
    mv "$MODEL_FILE.tmp" "$MODEL_FILE"
  elif command -v wget >/dev/null 2>&1; then
    wget --show-progress -O "$MODEL_FILE.tmp" "$HF_FALLBACK_URL"
    mv "$MODEL_FILE.tmp" "$MODEL_FILE"
  else
    echo "ERROR: ni curl ni wget encontrados"
    exit 1
  fi
  
  echo "  Descarga OK: $(du -h "$MODEL_FILE" | cut -f1)"
else
  echo ""
  echo "[2/3] Modelo ya existe: $MODEL_FILE ($(du -h "$MODEL_FILE" | cut -f1)) - skip download"
fi

# 3. Verificacion
echo ""
echo "[3/3] Verificacion"
if [ -f "$MODEL_FILE" ]; then
  SIZE=$(stat -c%s "$MODEL_FILE" 2>/dev/null || stat -f%z "$MODEL_FILE" 2>/dev/null || echo "0")
  SIZE_MB=$((SIZE / 1024 / 1024))
  echo "  Archivo: $MODEL_FILE"
  echo "  Tamano: ${SIZE_MB} MB"
  
  if [ "$SIZE_MB" -lt 100 ]; then
    echo "  WARN: archivo muy pequeno (<100MB), posible descarga incompleta"
    exit 1
  fi
  
  # Test carga con Node si @qvac/sdk disponible
  if [ -f "package.json" ]; then
    echo "  Probando carga con npm run qvac:smoke..."
    QVAC_MODELS_PATH="$MODELS_PATH" QVAC_MODEL="$MODEL_NAME" npm run qvac:smoke || echo "  Smoke fallo, pero archivo existe - revisa logs"
  fi
  
  echo ""
  echo "=== Descarga completa ==="
  echo "Modelo listo en: $MODEL_FILE"
  echo "Volumen Docker: qvac-models -> /app/models"
  echo "Siguiente: npm run qvac:smoke && npm run triage:15"
else
  echo "ERROR: modelo no encontrado en $MODEL_FILE"
  exit 1
fi
