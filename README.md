# InboxTriage — README Final — Demo 50 correos para jueces — acamargo@corefex.net

> **Contrato operador no-autor:** Si sigues estos pasos en una máquina limpia Ubuntu 24.04 LTS, debes completar un triaje de 50 correos sintéticos en la cuenta acamargo@corefex.net sin preguntar al autor. Alineado a PITCH.md + CICLO.md + Shape Up.

**Qué hace:** Clasifica cada correo nuevo de acamargo@corefex.net en exactamente 3 cubetas en Gmail — `InboxTriage/Ahora`, `InboxTriage/Despues`, `InboxTriage/NoResponder` — cruzando el cuerpo con `contexto.json` de esta semana (evento jueves), usando QVAC local 1B Q4. El cuerpo del mail nunca va a cloud LLM.

---

## 0. Requisitos — Runtime demo PITCH.md

- Ubuntu 24.04 LTS, 32 GB RAM, sin GPU necesaria, CPU-first
- Node.js 22.17+ (`node -v`) — requerido por `@qvac/sdk`
- Cuenta Gmail demo: **acamargo@corefex.net** con OAuth habilitado
- Puerto 3000 libre para callback OAuth
- Docker + docker compose (opcional, para volumen models)

## 1. Setup repo — 2 min

```bash
git clone https://github.com/albcamargo/inboxtriage.git
cd inboxtriage
npm install
cp .env.example .env
cp contexto.example.json contexto.json
# Edita contexto.json con tu plato esta semana (max 5 items) - ver contexto.schema.json
```

Configura `.env`:
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
QVAC_MODEL=llama-3.2-1b-instruct-q4
```

## 2. Google Cloud OAuth — una vez — Scope 2

1. https://console.cloud.google.com → Crea proyecto → Enable Gmail API
2. Credentials → Create OAuth Client ID → Desktop App
3. Authorized redirect URI: `http://localhost:3000/oauth2callback`
4. Copia ID/Secret a `.env`
5. Autoriza cuenta **acamargo@corefex.net**:

```bash
make auth
# o npm run gmail:auth -> abre browser, guarda tokens.json (gitignoreado RNF-02)
make labels # crea 3 labels InboxTriage/*
```

Verifica en Gmail web de acamargo@corefex.net: deben aparecer 3 labels.

## 3. Modelo QVAC 1B Q4 — Volumen persistente — Scope 1 (no se recorta)

```bash
make model-download
# o bash scripts/download-model.sh
# o con Docker:
docker compose up -d --build
docker compose exec app bash scripts/download-model.sh
```

Luego pulso:
```bash
make smoke
# o npm run qvac:smoke -> debe responder "hola" <15s, log Modelo OK 1B Q4 cargado 1 vez
```

Si falla, no hay producto (CICLO.md). Si es lento >30s/mail, usa recorte: `QVAC_SINGLE_COMPLETION=true` en `.env`.

## 4. Plato + contrato preguntas — Scope 3

```bash
make validate # valida contexto.json vs contexto.schema.json
make prompt   # test parser SI/NO/INCIERTO sobre fixture canónico
```

Fixture canónico PITCH.md Frame Go:
- **A:** `catering@proveedor-evento.com` "cierre lista invitados jueves - urgente" → SI stakeholder + SI bloquea → **Ahora**
- **B:** `comunicado mensual bienestar director` → SI FYI → **NoResponder**

## 5. Seeder 50 correos demo — Nuevo — acamargo@corefex.net — Scope 5

Todos sintéticos, sin datos reales, con prefijo `[TRIAGE-DEMO]` para borrado fácil. Distribución diseñada para demo jueces:

| Bucket | Cant | Ejemplos reales del seeder |
| :--- | :--- | :--- |
| **Ahora** | 10 | catering cierre martes 18h, produccion auditorio jueves, Ana Perez acreditaciones, direccion informe viernes, seguridad DNI |
| **Despues** | 20 | reunion planeacion septiembre, cotizacion papeleria, capacitacion brigada octubre, legalizacion viaticos, propuesta patrocinio 2026 |
| **NoResponder** | 20 | comunicado bienestar FYI, newsletter software, circular horario, invitacion eucaristia, boletin, LinkedIn, Drive, Zoom |

**5a. Dry-run sin tocar Gmail (recomendado primero):**
```bash
make seed-dry
# genera fixtures-50-demo.json (50) y fixtures.json (15)
npm run triage:15 # prueba sin Gmail
```

**5b. Crear 50 correos reales en acamargo@corefex.net:**
```bash
make seed-50
# o bash scripts/seed-gmail-fixtures.sh --count 50 --to acamargo@corefex.net
# Pide confirmacion y crea 50 via gmail.users.messages.send solo a ti mismo
# Rate limit 600ms para evitar 429
```

Verifica en Gmail: 50 nuevos con `[TRIAGE-DEMO]` en asunto, todos no leídos.

## 6. Triaje lote 50 — Scope 5 VERDE

```bash
make batch-50
# o npm run triage:batch -- --limit 50
# o con Docker: docker compose exec app npm run triage:batch -- --limit 50
```

Salida esperada:
```
[QVAC] Modelo cargado
[1/50] [TRIAGE-DEMO] Cierre lista invitados... -> Ahora (SI/SI/SI/NO)
[2/50] [TRIAGE-DEMO] Comunicado mensual bienestar... -> NoResponder (NO/NO/NO/SI)
...
Resumen: Ahora:10 Despues:20 NoResponder:20
Log: ./triage.log
```

**Prueba de aceptación Scope 5:**
- ≥50 mails etiquetados en Gmail acamargo@corefex.net con 1 label exacta cada uno
- 1 parse roto no tumba lote (log warning -> Despues)
- Re-triage mismo id sobrescribe (idempotencia RNF-05)

Revisa Gmail web: 3 labels deben tener conteo 10/20/20 aprox.

## 7. Demo completa para jueces — 5 min — Scope 6

**Demo 3 min rápida (15 mails):**
```bash
make demo
# o bash demo-3min.sh
```

**Demo 5 min completa 50 mails (recomendada para jueces):**
```bash
make demo-50
```

Guion 5 min:

1. **0:00-0:30 Contexto semanal:** `cat contexto.json` - evento institucional jueves 28 agosto, catering, acreditaciones
2. **0:30-2:00 Triaje 50:** `npm run triage:batch -- --limit 50` + Gmail mostrando labels apareciendo en vivo en acamargo@corefex.net
3. **2:00-3:30 Caso canónico + log auditable:** `tail -20 triage.log` muestra SI/NO/INCIERTO por cada pregunta, `policy.js` deterministico
4. **3:30-4:30 Gmail real:** `gmail:list` + mostrar 3 labels en UI Gmail con 10/20/20
5. **4:30-5:00 Privacidad + repo:** `npm run demo:check-cloud` -> OK 0 llamadas cloud LLM, grep tokens no trackeados, link repo + landing ISPConfig

Evidencia para pitch:
- [ ] Captura Gmail acamargo@corefex.net con 3 labels InboxTriage
- [ ] `triage.log` jsonl con 50 lineas {messageId, answers, label_final, timestamp, modelo}
- [ ] `grep -R api.openai.com` = 0
- [ ] `fixtures-50-demo.json` con distribucion 10/20/20

## 8. Landing + Docker + Apache ISPConfig

**Landing estática:**
```bash
# Nginx local
docker compose --profile landing up -d landing # http://localhost:8080
# Apache ISPConfig prod
sudo cp landing/apache.conf /etc/apache2/sites-available/inboxtriage.conf
sudo a2ensite inboxtriage && systemctl reload apache2
```
Landing: `landing/index.html` apunta a `https://github.com/albcamargo/inboxtriage`

**Docker Ubuntu 24.04 + volumen models:**
```bash
make docker-up # build + up app :3000
make docker-logs
make docker-down
```

## 9. Limpieza demo — borrar 50 correos

```bash
make seed-clean
# o bash scripts/seed-gmail-fixtures.sh --clean --to acamargo@corefex.net
# Busca subject:"[TRIAGE-DEMO]" y mueve a papelera
```

Para borrar todo: Gmail → buscar `[TRIAGE-DEMO]` → seleccionar 50 → papelera.

## 10. Config avanzada .env

```
QVAC_MODEL=llama-3.2-1b-instruct-q4
QVAC_MODELS_PATH=./models
QVAC_SINGLE_COMPLETION=false # true si QVAC lento >30s/mail - recorte CICLO.md
CONTEXTO_PATH=./contexto.json
LOG_PATH=./triage.log
GMAIL_BATCH_SIZE=50
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

RNF PITCH.md:
- RNF-02 tokens solo disco local, gitignoreado
- RNF-03 un proceso un modelo cargado
- RNF-04 CPU-first 1B Q4, 32GB
- RNF-05 idempotencia debil re-triage sobrescribe
- RNF-06 ES/EN bilingue

## 11. Troubleshooting

- Token expirado: `make auth` de nuevo. `tokens.json` nunca va a git.
- HTML sin text/plain: parser usa snippet + strip HTML, log fallback:snippet
- Modelo lento >30s/mail: `QVAC_SINGLE_COMPLETION=true` en .env (recorte 1 completion)
- Rate limit Gmail 429: backoff 2s automatico, seeder 600ms delay
- contexto.json vacio: todo cae a Despues + warning, no crash
- Puerto 3000 ocupado: cambia GOOGLE_REDIRECT_URI y puerto en gmail:auth
- Seeder no envia: verifica scope gmail.modify y que cuenta sea acamargo@corefex.net

## 12. Definicion de Done — Demo 50

1. Operador no-autor clona repo y con este README hace triaje 50 en acamargo@corefex.net sin preguntar
2. `npm run demo:check-cloud` → 0 llamadas cloud LLM
3. Caso canonico catering → Ahora, comunicado director → NoResponder OK
4. Cada mensaje tiene exactamente 1 label InboxTriage
5. Repo publico + landing ISPConfig con link repo
6. `make seed-clean` borra demo [TRIAGE-DEMO]

Fuente: PITCH.md y CICLO.md - Este README es el contrato ejecutable para jueces.

## 13. Comandos rapidos — Makefile

```
make setup + make model-download + make smoke + make auth + make labels
make seed-50 + make batch-50 + make demo-50 + make seed-clean
make docker-up + make docker-logs + make docker-down
```
