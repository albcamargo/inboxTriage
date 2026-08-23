# Tablero del ciclo — InboxTriage
**Una sola apuesta. Seis scopes en orden. El tiempo (16h) no se negocia; el alcance sí.**

| Campo | Valor |
| :--- | :--- |
| Appetite | 16h construcción + 2h cooldown ensayo |
| Runtime | Ubuntu 24.04 LTS, 32GB, CPU-first, 1B Q4 |
| Stack | Node.js + @qvac/sdk + googleapis + contexto.json |
| Regla de oro | Primero funciona, luego se pule. No tickets horizontales. |

### Reglas de corte (Circuit Breaker)

- Si Scope 1 (Pulso QVAC) no está verde, no hay producto. Se ataca primero, no al final.
- Si Scope 0-2 (Setup + Gmail) no está verde a las ~5h, se recorta: UI = solo consola, Landing fuera, Gmail = fixtures JSON + labels solo si token existe.
- Si QVAC lento (>30s/mail), recorte: 1 completion con 4 preguntas, no 4 round-trips.
- Si OAuth falla, juez ve terminal + Gmail con fixtures. La demo no se bloquea.

---

## Board de Scopes

| # | Scope | Se ve listo cuando | Se recorta si... |
| :---: | :--- | :--- | :--- |
| 1 | Pulso QVAC | `smoke.js` carga 1B Q4 una vez y responde "hola" <15s | **No se recorta.** Sin esto no hay producto. |
| 2 | Gmail cableado | 3 labels visibles en Gmail; 1 id etiquetado a mano por API | A las ~5h: fixtures JSON + labels solo con token |
| 3 | Plato + contrato preguntas | Parser SI/NO/INCIERTO sobre fixture canónico válido | 1 completion con 4 preguntas, no 4 llamadas |
| 4 | Policy + 1 correo E2E | Caso canónico correcto en Gmail + log jsonl + 0 llamadas cloud LLM | — |
| 5 | Lote 15-20 + UI local | ≥10 mails etiquetados; 1 parse roto no tumba lote | UI = solo consola |
| 6 | Landing + ensayo 3 min | README operador no-autor + script demo 3 min ensayado + repo público | Landing fuera; juez ve terminal + Gmail |

---

### Scope 1: Pulso QVAC — Riesgo #1
**Objetivo:** Validar que QVAC corre en esta máquina.
- **Backend:** Instalar @qvac/sdk, descargar Llama 3.2 1B Instruct Q4, script `smoke.js` con loadModel una vez + completion hello. Medir RAM y tiempo.
- **Frontend:** Consola con tiempo carga + "Modelo OK".
- **Prueba de Aceptación:** `node smoke.js` responde en <15s CPU. `ps` muestra 1 proceso, 1 modelo. Si falla, se detiene ciclo y se revisa hardware/modelo.

### Scope 2: Gmail cableado
**Objetivo:** Gmail como fuente y destino real.
- **Backend:** Google Cloud OAuth consent, .env + .env.example, token.json gitignoreado, crear labels `InboxTriage/Ahora|Después|NoResponder` idempotente, listar 5 mensajes, aplicar label manual.
- **Frontend:** Ver 3 labels en Gmail web.
- **Prueba de Aceptación:** 1 messageId etiquetado manualmente visible en Gmail. `gmail.labels.list` muestra 3.

### Scope 3: Plato + contrato de preguntas
**Objetivo:** Contexto semanal explícito y contrato LLM auditable.
- **Backend:** `contexto.example.json` con schema {on_the_plate: string[], stakeholders: [], deprioritize: []}, prompt 4 preguntas concretas: 1) ¿es stakeholder de esta semana? 2) ¿bloquea evento del jueves / on_the_plate? 3) ¿pide dato/acción concreta? 4) ¿es FYI/comunicado rutina? Parser regex SI/NO/INCIERTO con fallback INCIERTO.
- **Frontend:** Consola imprime JSON preguntas.
- **Prueba de Aceptación:** Fixture canónico proveedor vs director parsea correctamente. Parser unit test verde.

### Scope 4: Policy + 1 correo extremo a extremo
**Objetivo:** Primer software integrado real.
- **Backend:** Función `policy(map): label` determinística en código: stakeholder+bloquea=Ahora, FYI=NoResponder, resto=Después. Escritura `triage.log` jsonl. Verificación no-cloud-LLM: `grep -R "api.openai.com\|generativelanguage"` = 0.
- **Frontend:** Gmail muestra etiqueta correcta para caso canónico + log legible.
- **Prueba de Aceptación:** Caso canónico: catering → Ahora, comunicado director → NoResponder. Log contiene SI/NO por cada pregunta.

### Scope 5: Lote 15–20 + UI local mínima
**Objetivo:** Escalar a lote real sin fragilidad.
- **Backend:** Loop lote 15-20 con try/catch por mail (1 fallo no tumba batch), truncar body 2k chars, idempotencia débil (re-triage sobrescribe), backoff rate limit.
- **Frontend:** CLI con barra progreso, resumen final: Ahora:3 Después:10 No:2 + tabla messageId→label.
- **Prueba de Aceptación:** ≥10 mails etiquetados en cuenta de prueba. Simular 1 mail con HTML roto → lote sigue.

### Scope 6: Landing + ensayo 3 min (cooldown)
**Objetivo:** Entregable demoable por operador no-autor.
- **Backend:** Repo GitHub público, README con pasos 1-5 para clonar + OAuth + `npm run triage:15`, script `demo-3min.sh`.
- **Frontend:** Landing estática ISPConfig con link a repo (solo distribución).
- **Prueba de Aceptación:** Operador no-autor siguiendo solo README completa triaje ≥10 correos. Ensayo 3 min cronometrado sin baches.

---

## Punch List — Solo últimas 2h / cooldown
No tocar antes de Scope 5 verde.

- [ ] **Estética / UI:** Colores CLI, alineación log, truncado snippets 120 chars, responsive landing mínima
- [ ] **QA / Interacción:** Estado loading mientras QVAC carga, deshabilitar doble clic triaje, confirmar sobrescritura idempotente, probar token expirado
- [ ] **Manejo de Errores:** HTML sin text/plain → usar snippet, parse INCIERTO → Después + warning log, rate Gmail 429 → backoff 2s, modelo no cargado → error legible, contexto.json vacío → warning + todo a Después

## Criterios de aceptación demo (Definition of Done)

1. En Ubuntu 24.04 con repo clonado y OAuth configurado, operador no-autor completa triaje ≥10 correos siguiendo README.
2. `grep` / inspector red: 0 endpoints OpenAI/Anthropic/Google Generative Language.
3. Caso canónico se comporta como script demo (proveedor Ahora, comunicado NoResponder).
4. Cada mensaje procesado tiene exactamente una etiqueta InboxTriage.
5. Repositorio en GitHub y landing apunta a él.

## Buffer / Cooldown (2h)

- Ensayo demo 3 min x2, grabar terminal, preparar dataset correos prueba (cuenta propia)
- Limpieza: .gitignore token.json, .env.example, borrar logs con PII si hace falta
- Launch brief con capturas reales para jueces
