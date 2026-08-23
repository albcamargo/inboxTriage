#!/bin/bash
# Crea 50 correos de prueba en Gmail para demo.
# Uso:
#   bash scripts/seed-gmail-fixtures.sh --count 50 --to acamargo@corefex.net
#   bash scripts/seed-gmail-fixtures.sh --dry-run
#   bash scripts/seed-gmail-fixtures.sh --clean

set -euo pipefail

COUNT=50
TARGET_EMAIL="acamargo@corefex.net"
DRY_RUN=false
CLEAN=false
YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --count)
      COUNT="$2"
      shift 2
      ;;
    --count=*)
      COUNT="${1#*=}"
      shift
      ;;
    --to)
      TARGET_EMAIL="$2"
      shift 2
      ;;
    --to=*)
      TARGET_EMAIL="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    --yes|-y)
      YES=true
      shift
      ;;
    *)
      echo "Argumento desconocido: $1"
      echo "Uso: $0 [--count N] [--to email] [--dry-run] [--clean] [--yes]"
      exit 1
      ;;
  esac
done

echo "=== InboxTriage Seeder - 50 correos demo ==="
echo "Target: $TARGET_EMAIL"
echo "Count: $COUNT"
echo "Dry-run: $DRY_RUN"
echo "Clean: $CLEAN"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] Generando fixtures sin Gmail..."
  node src/gmail/seed.js --dry-run --count "$COUNT" --to "$TARGET_EMAIL"
  echo "Fixtures generados en fixtures.json y fixtures-50-demo.json"
  exit 0
fi

if [ ! -f "tokens.json" ]; then
  echo "ERROR: tokens.json no encontrado. Corre primero: npm run gmail:auth"
  echo "Para modo dry-run sin Gmail: bash scripts/seed-gmail-fixtures.sh --dry-run"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "ERROR: .env no encontrado. Copia .env.example a .env"
  exit 1
fi

if [ "$CLEAN" = true ]; then
  echo "[CLEAN] Borrando correos demo con prefijo [TRIAGE-DEMO]..."
  node src/gmail/seed.js --clean --to "$TARGET_EMAIL"
  exit 0
fi

echo "Se crearan $COUNT correos de prueba en $TARGET_EMAIL con prefijo [TRIAGE-DEMO]"
echo "Se insertan en el buzon (no se envian a terceros)."
echo ""

if [ "$YES" != true ] && [ -t 0 ]; then
  read -r -p "Confirmar? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Cancelado"
    exit 0
  fi
fi

node src/gmail/seed.js --count "$COUNT" --to "$TARGET_EMAIL"

echo ""
echo "=== Seeder completo ==="
echo "Ahora corre: npm run triage:15 o npm run triage:batch -- --limit 50"
echo "Para borrar demo: bash scripts/seed-gmail-fixtures.sh --clean"
