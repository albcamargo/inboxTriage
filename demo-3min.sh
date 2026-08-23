#!/bin/bash
# demo-3min.sh - Ensayo de la demo de 3 minutos
set -e

echo "=== InboxTriage Demo 3 min - Aleph Hackathon - Sponsor Tether/QVAC ==="
echo ""

echo "[0:00-0:30] Contexto semanal (lo que esta en el plato esta semana)"
echo "----------------------------------------------------------------"
cat ${CONTEXTO_PATH:-./contexto.json} | head -20
echo ""
sleep 1

echo "[0:30-1:30] Triage lote 15 - Gmail labels apareciendo"
echo "----------------------------------------------------------------"
npm run triage:15
echo ""
sleep 1

echo "[1:30-2:30] Caso canonico + log auditable"
echo "----------------------------------------------------------------"
echo "Caso A: proveedor evento jueves -> debe ser Ahora"
echo "Caso B: comunicado director bienestar -> debe ser NoResponder"
echo ""
echo "Ultimas 3 lineas de triage.log:"
tail -3 ${LOG_PATH:-./triage.log} || echo "log vacio - corre triage:15 primero"
echo ""
sleep 1

echo "[2:30-3:00] Verificacion privacidad + repo"
echo "----------------------------------------------------------------"
echo "Grep no-cloud-LLM:"
npm run demo:check-cloud
echo ""
echo "Labels en Gmail:"
echo "  - InboxTriage/Ahora"
echo "  - InboxTriage/Despues"
echo "  - InboxTriage/NoResponder"
echo ""
echo "Repo: $(git remote get-url origin 2>/dev/null || echo 'local repo')"
echo "Landing: ./landing/index.html -> link a repo"
echo ""
echo "=== Demo OK - 3 min ==="