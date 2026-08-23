# InboxTriage

Clasifica cada correo nuevo de una cuenta Gmail en exactamente 3 categorías —
`InboxTriage/Ahora`, `InboxTriage/Despues`, `InboxTriage/NoResponder` — cruzando el
contenido del mensaje con `contexto.json` (lo importante de esta semana), usando un
modelo de IA local (QVAC). **El cuerpo del correo nunca se envía a un LLM en la nube.**

Siguiendo este README en una máquina limpia Ubuntu 24.04 se completa una demo de
triaje de 50 correos sintéticos.

## 0. Requisitos

- Ubuntu 24.04 LTS, 32 GB RAM, sin GPU necesaria (CPU-first)
- Node.js 20+ (`node -v`)
- Cuenta Gmail de demo con OAuth habilitado
- Puerto 3000 libre para el callback de OAuth
- Docker + docker compose (opcional, para el volumen de modelos)

## 1. Setup — 2 min

```bash
git clone <repo-url> inbox-triage
cd inbox-triage
npm install
cp .env.example .env
cp contexto.example.json contexto.json
# Edita contexto.json con lo importante de tu semana (máx 5 items) — ver contexto.schema.json
```

Configura `.env`:
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
QVAC_MODEL=llama-3.2-1b-instruct-q4
```

## 2. Google Cloud OAuth (una vez)

1. https://console.cloud.google.com → Crea proyecto → Enable Gmail API
2. Credentials → Create OAuth Client ID → Desktop App
3. Authorized redirect URI: `http://localhost:3000/oauth2callback`
4. Copia ID/Secret a `.env`
5. Autoriza la cuenta de demo:

```bash
make auth   # o npm run gmail:auth → abre browser, guarda tokens.json (gitignoreado)
make labels # crea las 3 labels InboxTriage/*
```

Verifica en Gmail web: deben aparecer las 3 labels.

## 3. Modelo QVAC

```bash
make model-download        # o bash scripts/download-model.sh
# con Docker:
docker compose up -d --build
docker compose exec app bash scripts/download-model.sh
```

Smoke test del modelo:
```bash
make smoke   # o npm run qvac:smoke → debe responder en <15s con el modelo cargado
```

Si el modelo va lento (>30 s/correo), activa `QVAC_SINGLE_COMPLETION=true` en `.env`
(hace 1 completion con las 4 preguntas en vez de 4 llamadas).

## 4. Contexto y contrato de preguntas

```bash
make validate # valida contexto.json contra contexto.schema.json
make prompt   # test del parser SI/NO/INCIERTO sobre los casos de referencia
```

Casos de referencia:
- **A:** proveedor de catering pidiendo cierre de lista para el evento del jueves → **Ahora**
- **B:** comunicado mensual de bienestar de dirección → **NoResponder**

## 5. Seeder de correos de demo

Genera correos sintéticos (sin datos reales) con prefijo `[TRIAGE-DEMO]` para borrado
fácil. Distribución: 10 Ahora / 20 Despues / 20 NoResponder.

**5a. Dry-run sin tocar Gmail (recomendado primero):**
```bash
make seed-dry        # genera fixtures-50-demo.json (50) y fixtures.json (15)
npm run triage:15    # prueba el triaje sin Gmail
```

**5b. Crear los 50 correos reales en la cuenta de demo:**
```bash
make seed-50   # pide confirmación; envía solo a la propia cuenta, rate limit 600ms
```

Verifica en Gmail: 50 correos nuevos con `[TRIAGE-DEMO]` en el asunto, no leídos.

## 6. Triaje del lote

```bash
make batch-50   # o npm run triage:batch -- --limit 50
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

Criterios de aceptación:
- ≥50 correos etiquetados en Gmail, exactamente 1 label cada uno
- Un parse roto no detiene el lote (warning en log → Despues)
- Re-procesar el mismo correo sobrescribe la etiqueta (idempotencia)

## 7. Demo para jueces — 5 min

```bash
make demo      # demo rápida 3 min (15 correos)
make demo-50   # demo completa 5 min (50 correos)
```

Guion de 5 minutos:

1. **0:00–0:30 Contexto semanal:** `cat contexto.json`
2. **0:30–2:00 Triaje 50:** labels apareciendo en vivo en Gmail
3. **2:00–3:30 Casos de referencia + log auditable:** `tail -20 triage.log` (SI/NO/INCIERTO por pregunta, policy determinística)
4. **3:30–4:30 Gmail real:** las 3 labels con conteo ~10/20/20
5. **4:30–5:00 Privacidad:** `npm run demo:check-cloud` → 0 llamadas a LLM en la nube

## 8. Landing + Docker + Apache

```bash
# Landing con Nginx local
docker compose --profile landing up -d landing   # http://localhost:8080
# Apache (ISPConfig) en prod
sudo cp landing/apache.conf /etc/apache2/sites-available/inboxtriage.conf
sudo a2ensite inboxtriage && systemctl reload apache2
```
Edita en `landing/index.html` la línea `REPO_URL`.

```bash
make docker-up    # build + app en :3000
make docker-logs
make docker-down
```

## 9. Limpieza de la demo

```bash
make seed-clean   # busca subject:"[TRIAGE-DEMO]" y mueve a papelera
```

## 10. Configuración (.env)

```
QVAC_MODEL=llama-3.2-1b-instruct-q4
QVAC_MODELS_PATH=./models
QVAC_SINGLE_COMPLETION=false   # true si el modelo va lento (>30s/correo)
CONTEXTO_PATH=./contexto.json
LOG_PATH=./triage.log
GMAIL_BATCH_SIZE=50
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Garantías de diseño:
- Tokens OAuth solo en disco local, nunca en git
- Un proceso, un modelo cargado
- CPU-first (1B cuantizado, 32 GB de RAM bastan)
- Re-procesar sobrescribe la etiqueta (idempotencia)
- Correos en español e inglés

## 11. Troubleshooting

- **Token expirado:** `make auth` de nuevo. `tokens.json` nunca va a git.
- **HTML sin text/plain:** el parser usa snippet + strip de HTML (log `fallback:snippet`).
- **Modelo lento:** `QVAC_SINGLE_COMPLETION=true` en `.env`.
- **Rate limit Gmail 429:** backoff de 2 s automático; el seeder espacia 600 ms.
- **contexto.json vacío:** todo cae a Despues con warning, no crashea.
- **Puerto 3000 ocupado:** cambia `GOOGLE_REDIRECT_URI` y el puerto en `gmail:auth`.

## 12. Definición de Done

1. Un operador que no escribió el código clona el repo y completa el triaje de 50 correos solo con este README
2. `npm run demo:check-cloud` → 0 llamadas a LLM en la nube
3. Casos de referencia correctos (catering → Ahora, comunicado → NoResponder)
4. Cada mensaje con exactamente 1 label InboxTriage
5. `make seed-clean` borra los correos de demo

## 13. Comandos rápidos (Makefile)

```
make setup + make model-download + make smoke + make auth + make labels
make seed-50 + make batch-50 + make demo-50 + make seed-clean
make docker-up + make docker-logs + make docker-down
```
