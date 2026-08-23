# InboxTriage — README Operador No-Autor

> Este README es el contrato de demo. Si sigues estos pasos en una maquina limpia Ubuntu 24.04 LTS, debes completar un triaje >=10 correos sin preguntar al autor. Alineado a PITCH.md y CICLO.md.

**Que hace:** Clasifica cada correo nuevo en exactamente 3 cubetas en Gmail — `InboxTriage/Ahora`, `InboxTriage/Despues`, `InboxTriage/NoResponder` — cruzando el cuerpo con `contexto.json` de esta semana, usando QVAC local. Cuerpo del mail nunca va a cloud LLM.

## 0. Requisitos

- Ubuntu 24.04 LTS, 32 GB RAM, sin GPU necesaria
- Node.js 20+ (node -v)
- Cuenta Gmail de prueba con 15-45 no leidos
- Puerto 3000 libre para OAuth callback

## 1. Setup repo

```bash
git clone <repo-url> inbox-triage
cd inbox-triage
npm install
cp .env.example .env
cp contexto.example.json contexto.json
```

Edita `contexto.json` con lo que esta en tu plato esta semana. Max 5 items. Ver `contexto.schema.json`.

## 2. Google Cloud OAuth (una vez)

1. https://console.cloud.google.com -> Crea proyecto -> Enable Gmail API
2. Credentials -> Create OAuth Client ID -> Desktop App
3. Authorized redirect URI: `http://localhost:3000/oauth2callback`
4. Copia Client ID y Secret a `.env`

## 3. Pulso QVAC — Scope 1 (no se recorta)

```bash
npm run qvac:smoke
```

Listo cuando: Responde hola en <15s, log Modelo OK 1B Q4 cargado 1 vez. Si falla, no hay producto.

## 4. Gmail cableado — Scope 2

```bash
npm run gmail:auth   # abre browser, autoriza, guarda tokens.json (gitignoreado)
npm run gmail:labels # crea 3 labels
npm run gmail:list   # lista 5 mails
```

Verifica en Gmail web: 3 labels. Si >5h y OAuth falla, recorte CICLO.md: `npm run gmail:fixtures`.

## 5. Plato + contrato preguntas — Scope 3

```bash
npm run contexto:validate
npm run prompt:test
```

Fixture canonico (PITCH.md Frame Go):
- A: catering@proveedor-evento.com pidiendo cierre lista -> SI stakeholder + SI bloquea
- B: comunicado bienestar director -> SI FYI

## 6. Policy + 1 correo E2E — Scope 4

```bash
npm run triage:one -- --id <gmail_message_id>
```

Revisa:
- Gmail: 1 label aplicado
- triage.log: jsonl con {messageId, preguntas, label_final, timestamp}
- No cloud LLM:

```bash
grep -R "api.openai.com\|api.anthropic.com\|generativelanguage.googleapis.com" src/ || echo "OK 0 llamadas cloud"
```

Caso canonico: catering -> Ahora, comunicado director -> NoResponder.

## 7. Lote 15-20 + UI minima — Scope 5

```bash
npm run triage:15
```

Salida esperada:

```
[QVAC] Modelo cargado
[1/15] catering@... -> Ahora (stakeholder+bloquea)
...
Resumen: Ahora:3 Despues:10 NoResponder:2
Log: ./triage.log
```

Aceptacion: >=10 mails etiquetados. 1 parse roto no tumba lote.

## 8. Landing + ensayo 3 min — Scope 6 / Cooldown

```bash
npm run demo:3min
```

Guion 3 min:
1. 0:00-0:30 contexto.json semana (evento jueves)
2. 0:30-1:30 triage:15 + Gmail labels apareciendo
3. 1:30-2:30 caso canonico + triage.log SI/NO auditable
4. 2:30-3:00 grep no-cloud + link repo + landing ISPConfig

## 9. Config avanzada (.env)

```
QVAC_MODEL=llama-3.2-1b-instruct-q4
CONTEXTO_PATH=./contexto.json
LOG_PATH=./triage.log
GMAIL_BATCH_SIZE=15
```

RNF: RNF-02 tokens solo disco, RNF-03 un proceso un modelo, RNF-04 CPU-first, RNF-05 idempotencia, RNF-06 ES/EN.

## 10. Troubleshooting

- Token expirado: npm run gmail:auth de nuevo. token.json nunca va a git.
- HTML sin text/plain: parser usa snippet + strip HTML, log fallback:snippet.
- Modelo lento >30s/mail: QVAC_SINGLE_COMPLETION=true en .env (recorte CICLO.md)
- Rate limit 429: backoff 2s automatico.
- contexto.json vacio: todo cae a Despues + warning, no crash.
- Puerto 3000 ocupado: cambia redirect y puerto en gmail:auth.

## 11. Definicion de Done

1. Operador no-autor clona y con README hace triaje >=10
2. grep 0 cloud LLM
3. Caso canonico OK
4. Cada mensaje 1 label InboxTriage exacta
5. Repo publico + landing link

Fuente: docs/PITCH.md y docs/CICLO.md
