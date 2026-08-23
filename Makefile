# Makefile - InboxTriage - Shape Up - Ubuntu 24.04 + QVAC + 50 demo
# Alineado a PITCH.md + CICLO.md + acamargo@corefex.net seeder
.PHONY: help setup smoke auth labels validate prompt one batch batch-50 demo demo-50 check-cloud seed-50 seed-dry seed-clean docker-up docker-down docker-logs model-download

help:
	@echo "InboxTriage - Comandos Shape Up (PITCH.md + CICLO.md) - acamargo@corefex.net"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - npm install + cp .env + contexto.json"
	@echo "  make model-download - Baja QVAC 1B Q4 al volumen ./models"
	@echo ""
	@echo "Scopes 1-2 - Riesgo primero:"
	@echo "  make smoke          - Scope 1 Pulso QVAC (no se recorta)"
	@echo "  make auth           - Scope 2 Gmail OAuth acamargo@corefex.net"
	@echo "  make labels         - Scope 2 Crea 3 labels InboxTriage/*"
	@echo ""
	@echo "Scopes 3-4 - Contrato y 1 E2E:"
	@echo "  make validate       - Scope 3 Valida contexto.json vs schema"
	@echo "  make prompt         - Scope 3 Test caso canonico catering vs director"
	@echo "  make one ID=xxx     - Scope 4 Un correo extremo a extremo"
	@echo ""
	@echo "Scope 5 - Lote + Seeder 50 demo:"
	@echo "  make batch          - Lote 15 (default)"
	@echo "  make batch-50       - Lote 50 completo para jueces"
	@echo "  make seed-50        - Crea 50 correos demo en acamargo@corefex.net"
	@echo "  make seed-dry       - Dry-run 50 fixtures sin Gmail"
	@echo "  make seed-clean     - Borra [TRIAGE-DEMO] de acamargo@corefex.net"
	@echo ""
	@echo "Scope 6 - Demo y privacidad:"
	@echo "  make demo           - Demo 3 min (15 mails)"
	@echo "  make demo-50        - Demo 5 min completa 50 mails para jueces"
	@echo "  make check-cloud    - Verifica 0 llamadas cloud LLM (RNF privacidad)"
	@echo ""
	@echo "Docker Ubuntu 24.04 + volumen models:"
	@echo "  make docker-up      - Build + up app :3000 + landing :8080"
	@echo "  make docker-down    - Down + clean"
	@echo "  make docker-logs    - Logs app"

setup:
	npm install
	cp -n .env.example .env || true
	cp -n contexto.example.json contexto.json || true
	@echo ">>> Edita .env con GOOGLE_CLIENT_ID/SECRET"
	@echo ">>> Cuenta demo: acamargo@corefex.net"

model-download:
	bash scripts/download-model.sh

smoke:
	npm run qvac:smoke

auth:
	npm run gmail:auth

labels:
	npm run gmail:labels

validate:
	npm run contexto:validate

prompt:
	npm run prompt:test

one:
	@if [ -z "$(ID)" ]; then echo "Uso: make one ID=<gmail_id>"; exit 1; fi
	npm run triage:one -- --id $(ID)

batch:
	npm run triage:15

batch-50:
	npm run triage:batch -- --limit 50

seed-50:
	@echo "Creando 50 correos demo en acamargo@corefex.net con prefijo [TRIAGE-DEMO]"
	bash scripts/seed-gmail-fixtures.sh --count 50 --to acamargo@corefex.net --yes

seed-dry:
	bash scripts/seed-gmail-fixtures.sh --dry-run --count 50 --to acamargo@corefex.net
	@echo "Fixtures en fixtures-50-demo.json"

seed-clean:
	bash scripts/seed-gmail-fixtures.sh --clean --to acamargo@corefex.net

demo:
	bash demo-3min.sh

demo-50:
	@echo "=== Demo 5 min - 50 correos - acamargo@corefex.net ==="
	@echo "[0:00-0:30] Contexto semanal"
	@cat contexto.json | head -30
	@echo ""
	@echo "[0:30-2:00] Triage 50 - QVAC local + policy 3 cubetas"
	@npm run triage:batch -- --limit 50
	@echo ""
	@echo "[2:00-3:30] Caso canonico + log auditable"
	@tail -20 triage.log
	@echo ""
	@echo "[3:30-4:30] Gmail acamargo@corefex.net - 3 labels"
	@npm run gmail:list || echo "Usa fixtures si no hay token"
	@echo ""
	@echo "[4:30-5:00] Privacidad 0 cloud + repo"
	@npm run demo:check-cloud
	@echo "Repo: $$(git remote get-url origin 2>/dev/null || echo 'local')"

check-cloud:
	npm run demo:check-cloud

docker-up:
	docker compose up -d --build
	@echo "App: http://localhost:3000 - Landing: http://localhost:8080 (profile landing)"
	@echo "Para landing: docker compose --profile landing up -d landing"

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f app
