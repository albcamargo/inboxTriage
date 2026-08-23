#!/bin/bash
# InboxTriage - Instalador (Ubuntu/Linux/macOS)
# Uso: bash instalar.sh
set -e
echo ""
echo "=== InboxTriage - Instalacion ==="

# 1. Node.js
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
  echo "Necesitas Node.js 20 o superior. Instalalo (https://nodejs.org) y vuelve a correr este script."
  exit 1
fi
echo "Node $(node -v) OK"

# 2. Dependencias
echo "Instalando dependencias (1-2 min)..."
npm install --no-fund --no-audit >/dev/null
echo "Dependencias OK"

# 3. Configuracion
# El zip de descarga trae .env listo; si clonaste el repo, se crea desde el
# ejemplo y tendras que poner tus credenciales de Google (README paso 2).
if [ ! -f .env ]; then
  cp .env.example .env
  echo "AVISO: .env creado desde .env.example — te faltara GOOGLE_CLIENT_ID/SECRET (ver README)."
fi

# 4. Eleccion de modelo
echo ""
echo "Elige el modelo de IA (se descarga una sola vez):"
echo "  1) Rapido      - Llama 1B  (~0.8 GB)  menos preciso"
echo "  2) Recomendado - Qwen3 4B  (~2.4 GB)  buen balance  [defecto]"
echo "  3) Preciso     - Qwen3 8B  (~4.7 GB)  pide GPU de 8GB o CPU fuerte"
read -r -p "Opcion [2]: " op
case "$op" in
  1) modelo="llama-3.2-1b-instruct-q4" ;;
  3) modelo="qwen3-8b" ;;
  *) modelo="qwen3-4b" ;;
esac
sed -i.bak "s/^QVAC_MODEL=.*/QVAC_MODEL=$modelo/" .env && rm -f .env.bak
echo "Modelo elegido: $modelo"

# 4. Descarga del modelo
echo "Descargando el modelo (segun tu conexion puede tardar varios minutos)..."
node scripts/precache-model.mjs
echo ""
echo "=== Instalacion completa ==="
echo "Siguiente paso:  bash iniciar.sh"
