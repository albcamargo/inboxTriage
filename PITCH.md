# InboxTriage — Pitch Shape Up

**Apuesta del ciclo:** Un oficinista institucional deja de leer 15-45 no leídos para decidir qué merece atención. El sistema clasifica cada correo nuevo en exactamente tres cubetas accionables — **Responder ahora / Responder después / No responder** — cruzando el cuerpo del mensaje con el contexto vivo de *esta semana*, sin enviar ese cuerpo a ninguna API de LLM en la nube.

| Campo | Valor |
| :--- | :--- |
| Producto | InboxTriage |
| Ciclo | Aleph Hackathon — agosto 2026 (sponsor Tether / QVAC) |
| Appetite | 16 horas de construcción + 2h cooldown/ensayo — Tiempo fijo, alcance variable |
| Audiencia | Oficinista institucional (gobierno, universidad, empresa tradicional, ONG) LATAM |
| Fuente de verdad | Este pitch + PRD §12. No se reabren decisiones sin recorte explícito |
| Runtime demo | Ubuntu 24.04 LTS, 32 GB RAM, sin GPU discreta, CPU-first |
| Resultado esperado | Software integrado extremo a extremo: Gmail etiquetado + inferencia QVAC local + log auditable |

---

## 1. FICHA TÉCNICA DE LA INICIATIVA

**Nombre:** InboxTriage — Triaje local de Gmail en 3 cubetas con contexto de semana

**Restricción de Tiempo:** 16h construcción + cooldown. No se extiende, se recorta.

**Estructura del Equipo:**
- Backend: 1 dev Node.js (orquestador, Gmail API googleapis, OAuth, idempotencia)
- Runtime IA: mismo dev ( @qvac/sdk — loadModel, completion )
- Frontend: No SPA. UI = Gmail nativo (labels) + CLI local con progreso
- Diseño UX/UI: Sistema heredado. Log auditable como artefacto de diseño
- QA: El propio equipo. Validación por caso canónico + grep no-cloud-LLM

**Perfil del Usuario:** Oficinista que recibe 15-45 mails acumulados. Su trabajo no es leer correo, es decidir qué bloquea su semana (evento jueves, cierre catering, acreditaciones) bajo presión jerárquica. Contexto cambia cada lunes.

**Esquema y Restricciones de Datos:**
- Fuente: Gmail API (messages.list + get + modify). No DB de correos.
- Local: `contexto.json` {on_the_plate: [], stakeholders: [], deprioritize: []}, `tokens.json`/.env (solo disco, gitignoreado), `triage.log` jsonl {messageId, preguntas, label_final, timestamp, modelo}
- Labels Gmail: `InboxTriage/Ahora`, `InboxTriage/Después`, `InboxTriage/NoResponder` — creación idempotente
- Restricciones: No persistir cuerpo en repo, no enviar cuerpo a cloud LLM, un proceso un modelo (RNF-03), CPU-first 1B Q4 (RNF-04), re-triage sobrescribe (RNF-05), prompts ES/EN (RNF-06)

## 2. EL ENCUADRE (Framing)

**El Candidato Borroso:** "Construyan un agente agéntico de correo que, con IA local, lea Gmail y decida qué hacer." Empuja a 4 productos equivocados: secretario que envía, segundo Gmail con UI pulida, laboratorio ML (RAG/fine-tune), teatro de prompt gigante sin policy en código.

**El Dolor Real:** El triaje manual consume ~30% del tiempo operativo y produce error de priorización bajo carga: el cerebro prioriza por remitente/jerarquía (comunicado director) vs urgencia real (proveedor evento jueves con tono neutro). No es productividad, es riesgo operacional y reputacional: se cae auditorio, catering, plazo stakeholder.

**Workaround Actual:** 1) Lectura secuencial 15-45 mails, 2) Filtros Gmail por remitente, 3) Notas en papel/WhatsApp con top-of-mind, 4) Marcar como no leído para después, 5) Preguntar al jefe ¿es urgente? — Pierde foco, re-trabajo, dependencia jerárquica.

**Hito Frame Go:** Problema entendido si equipo acepta caso canónico: Mail A = catering@proveedor-evento.com pidiendo cierre lista evento jueves + Mail B = comunicado bienestar mensual director. Con workaround actual B se lee primero. Con InboxTriage A=Ahora, B=NoResponder. Patrón ocurre ≥2 veces/semana.

## 3. MODELADO DE LA SOLUCIÓN (Shaping)

**Bola de Pelo Técnica:**
- QVAC SDK 1B Q4 en CPU: riesgo #1 OOM / >30s por mail → Mitigación: smoke test scope 1, single loadModel, fallback 1 completion con 4 preguntas
- Gmail OAuth: redirect, token expiry → Validar a las 5h, fixtures JSON si no hay token
- Parsing HTML institucional: firmas/tablas/quotes → text/plain + strip + truncar 2k chars
- Rate limits Gmail → lote 15-20 + backoff
- Seguridad: tokens nunca en git, grep verificación no-cloud-LLM

**Preguntas Abiertas / Edge Cases:**
- contexto.json vacío → Todo a Después + warning
- Mail multi-intent → Si stakeholder en on_the_plate → Ahora
- ES/EN mixto → prompts bilingües
- Re-triage mismo id → sobrescribe label
- Mail >5k → truncado + nota log
- Definición NoResponder → FYI, newsletter, CC masivo sin pedido explícito

**Recorte de Alcance (Out of Scope / Muro):**
NO entra en 16h: 1) Hilo completo, 2) Calendar/Tasks/Drive, 3) Redactar/enviar, 4) RAG/embeddings/fine-tune, 5) Cuarta categoría, 6) UI pulida/Electron/mobile/multi-cuenta, 7) Multi-agente supervisor, 8) P2P inference, 9) Landing comercial compleja

**Hito Shape Go:** Listo para construcción si: breadboard cabe en 1 pizarra, parser SI/NO/INCIERTO definido, policy mapeo en código aburrido, rollback QVAC definido. Un dev no-autor lo entiende sin abrir PRD.

## 4. ESQUEMA DE CONEXIONES LÓGICAS (Breadboard)

```
[Gmail API: list UNREAD] 
 → [Node Orquestador: fetch 15-20 + text/plain + contexto.json]
  → [QVAC SDK: loadModel 1B Q4 x1 + completion 4 preguntas → SI/NO/INCIERTO]
   → [Policy código: mapa determinístico → 1 de 3 labels]
    → [Gmail modify + triage.log]
     → [UI: Gmail labels + CLI progreso]
```

Principio: Orquestador es código aburrido y testeable. QVAC es servicio de preguntas. Gmail es fuente y destino de verdad. Stack: Node.js + @qvac/sdk + googleapis + archivo contexto. Sin Python paralelo.

## 5. LISTA DE AJUSTES FINALES (Punch List - solo últimas 2h)

- [ ] UI: alineación log, colores CLI, truncado snippets
- [ ] QA: loading QVAC, deshabilitar doble triaje, verificar sobrescritura idempotente
- [ ] Errores: token expirado mensaje claro, HTML sin text/plain fallback, INCIERTO→Después, backoff Gmail, modelo no cargado error legible

## 6. BORRADOR INFORME LANZAMIENTO

**El Antes:** 15-45 no leídos, ~90 min decidiendo qué leer, prioriza comunicado director sobre proveedor evento jueves. Riesgo: evento sin auditorio.

**El Después:** InboxTriage local en Ubuntu cruza correo con contexto.json semanal usando QVAC sin cloud LLM. Cada mensaje cae en Ahora / Después / NoResponder en Gmail. Log muestra por qué. Oficinista ve primero lo que bloquea su semana.

**Evidencia:** [Gmail 3 labels] [CLI progreso lote] [triage.log SI/NO] [grep api.openai.com = 0] [README operador no-autor] [Landing ISPConfig link repo]
