#!/bin/bash
# scripts/download-model.sh - Precachea el modelo QVAC para la demo
# Descarga via el SDK (registry oficial) al cache definido en qvac.config.js,
# que es exactamente lo que el runtime reutiliza al cargar el modelo.
# Uso: bash scripts/download-model.sh
# Con el 1B: QVAC_MODEL=llama-3.2-1b-instruct-q4 bash scripts/download-model.sh

set -e

echo "=== InboxTriage - Precache de modelo QVAC ==="

if [ ! -d "node_modules" ]; then
  echo "ERROR: corre npm install primero"
  exit 1
fi

node scripts/precache-model.mjs

echo ""
echo "Siguiente: npm run qvac:smoke && npm run triage:15"
