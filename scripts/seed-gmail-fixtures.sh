#!/bin/bash
# scripts/seed-gmail-fixtures.sh - Crea 50 correos de prueba en Gmail para demo
# Cuenta: acamargo@corefex.net - Solo envia a si mismo, no a terceros - Sin datos reales
# Alineado a PITCH.md Frame Go (caso canonico) + contexto.example.json + CICLO.md Scope 5
# Uso:
#   bash scripts/seed-gmail-fixtures.sh --count 50 --to acamargo@corefex.net
#   bash scripts/seed-gmail-fixtures.sh --dry-run
#   bash scripts/seed-gmail-fixtures.sh --clean

set -e

TO="${1:-}"
COUNT=50
DRY_RUN=false
CLEAN=false
TARGET_EMAIL="acamargo@corefex.net"

# Parse args
for arg in "$@"; do
  case $arg in
    --count=*) COUNT="${arg#*=}" ;;
    --to=*) TARGET_EMAIL="${arg#*=}" ;;
    --dry-run) DRY_RUN=true ;;
    --clean) CLEAN=true ;;
    --count) COUNT="$2"; shift ;;
    --to) TARGET_EMAIL="$2"; shift ;;
  esac
done

# Si primer arg es numero, es count
if [[ "$1" =~ ^[0-9]+$ ]]; then COUNT="$1"; fi
if [[ "$1" == *"@*"* ]]; then TARGET_EMAIL="$1"; fi

echo "=== InboxTriage Seeder - 50 correos demo ==="
echo "Target: $TARGET_EMAIL"
echo "Count: $COUNT"
echo "Dry-run: $DRY_RUN"
echo "Clean: $CLEAN"
echo "Cuenta solicitada: acamargo@corefex.net (solo a si mismo, sin datos reales)"
echo ""

if [ "$TARGET_EMAIL" != "acamargo@corefex.net" ]; then
  echo "WARN: target diferente a acamargo@corefex.net, continuando pero solo se envia a la cuenta autenticada"
fi

if [ ! -f "tokens.json" ]; then
  echo "ERROR: tokens.json no encontrado. Corre primero: npm run gmail:auth"
  echo "Para modo dry-run sin Gmail: bash scripts/seed-gmail-fixtures.sh --dry-run"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "ERROR: .env no encontrado"
  exit 1
fi

if [ "$CLEAN" = true ]; then
  echo "[CLEAN] Borrando correos demo con prefijo [TRIAGE-DEMO]..."
  node src/gmail/seed.js --clean --to "$TARGET_EMAIL"
  exit 0
fi

if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] Generando fixtures sin enviar a Gmail..."
  node src/gmail/seed.js --dry-run --count "$COUNT" --to "$TARGET_EMAIL"
  echo "Fixtures generados en fixtures.json y fixtures-50-demo.json"
  exit 0
fi

echo "Se crearan $COUNT correos de prueba en $TARGET_EMAIL con prefijo [TRIAGE-DEMO]"
echo "Todos son sinteticos, sin datos reales, alineados a contexto.example.json"
echo ""
read -p "Confirmar? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Cancelado"
  exit 0
fi

node src/gmail/seed.js --count "$COUNT" --to "$TARGET_EMAIL"

echo ""
echo "=== Seeder completo - Scope 5 listo ==="
echo "Ahora corre: npm run triage:15 o npm run triage:batch -- --limit 50"
echo "Para borrar demo: bash scripts/seed-gmail-fixtures.sh --clean"
