# Makefile - InboxTriage - Alineado a CICLO.md
.PHONY: help setup smoke auth labels validate prompt batch demo check-cloud docker-up docker-down

help:
	@echo "Comandos Shape Up CICLO.md"
	@echo "  make setup"
	@echo "  make smoke - Scope 1"
	@echo "  make auth - Scope 2"
	@echo "  make batch - Scope 5"
	@echo "  make demo - Scope 6"

setup:
	npm install
	cp -n .env.example .env || true
	cp -n contexto.example.json contexto.json || true

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

batch:
	npm run triage:15

demo:
	bash demo-3min.sh

check-cloud:
	npm run demo:check-cloud

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down
