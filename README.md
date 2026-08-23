# InboxTriage — local Gmail triage with QVAC

**Aleph Hackathon 2026 · QVAC Track (Tether) · Track 1: local agents for operations work.**

InboxTriage is the back-office work of reading an inbox, done on-device. It reads a
Gmail inbox and stamps every email into exactly one of three buckets — Gmail labels
`InboxTriage/Ahora` (reply now), `InboxTriage/Despues` (reply later),
`InboxTriage/NoResponder` (no reply needed) — by crossing the email against
`contexto.json`: what actually matters to this person *this week* (an event, a
deadline, certain people). All inference runs locally through **`@qvac/sdk`**; the
email body never reaches a cloud LLM. The agent **classifies, it never replies or
deletes** — Gmail scopes are read + label only.

A local panel (dashboard) completes the loop: see the triaged inbox with the reason
for every stamp, correct a wrong stamp (re-labels in Gmail), and edit the week's
interests (rewrites `contexto.json`).

```
Gmail inbox ----> 4 closed questions ----> QVAC local model ----> SI / NO / INCIERTO
                  (prompt contract)        (@qvac/sdk)                  |
contexto.json ---------------------------------------------> policy.js (code, not LLM)
                                                                        |
                          Gmail label + JSONL audit log <---------------+
                                        |
                          local panel (localhost:8000)
```

## QVAC integration — permalinks

All inference happens in one file, [`src/qvac/client.js`](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js):

| What | Where |
| --- | --- |
| SDK import (`loadModel`, `completion`, model constants) | [client.js#L7](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js#L7) |
| Model load with deterministic decoding (`temp 0, top_k 1, seed`, `reasoning_budget: 0`) | [client.js#L174-L187](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js#L174-L187) |
| The inference call (SDK 0.17: `completion` → `run.final.contentText`) | [client.js#L120-L127](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js#L120-L127) |
| Prompt contract: 4 closed questions, binary answers | [client.js#L28-L61](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js#L28-L61) |
| Parser: model output → `SI \| NO \| INCIERTO`, never invented | [client.js#L63-L90](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js#L63-L90) |
| Honest uncertainty: inconclusive stays `INCIERTO` | [client.js#L158-L163](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/qvac/client.js#L158-L163) |
| The LLM emits evidence, **code** decides the label | [src/policy.js#L4-L15](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/policy.js#L4-L15) |
| Batch pipeline: Gmail → QVAC → label + audit log | [src/triage/batch.js#L79-L109](https://github.com/CoKeFish/inboxTriage/blob/f3979dee7da6f7e489cf7d276030793b83ba9c9f/src/triage/batch.js#L79-L109) |

**QVAC capabilities used:** text generation (chat completion) via `@qvac/sdk` 0.17.1,
with models loaded from the SDK's catalog constants. No cloud model API anywhere —
`npm run demo:check-cloud` greps the source for cloud LLM endpoints and must print 0.

## Models, hardware, latency

| Model (QVAC catalog) | Size | Role | Measured |
| --- | --- | --- | --- |
| `QWEN3_4B_INST_Q4_K_M` | ~2.4 GB | **default** — target machine: Ubuntu 24.04, 32 GB RAM, CPU-only | a few s/email on CPU; set `QVAC_SINGLE_COMPLETION=true` (1 completion instead of 4) if > 30 s/email |
| `QWEN3_8B_INST_Q4_K_M` | ~4.7 GB | most accurate; wants ~8 GB VRAM | — |
| `LLAMA_3_2_1B_INST_Q4_0` | ~0.8 GB | floor test | Windows 11 + RTX 3070: 5-email batch **~6 s end-to-end including model load** (~1 s/email) |

Pick with `QVAC_MODEL` in `.env` (`1b` / `8b` / anything else → 4B). The model
downloads once on first run.

## Small-model reliability (what broke and what we did)

- **Default sampling flips SI/NO between identical runs** → greedy, deterministic
  decoding: `temp 0, top_k 1, seed 42`.
- **Thinking models (Qwen3) open with `<think>`** and break a one-word parser →
  `reasoning_budget: 0`.
- **Unparseable output is never guessed**: the parser maps it to `INCIERTO`, and
  `policy.js` routes `INCIERTO` → *Despues* — an email with real work is never
  hidden, and the agent never invents a verdict.
- **1B is honestly too weak**: it answers cleanly (single token) but misjudges —
  measured on our fixtures it sends everything to *Despues*. That's the safe
  failure mode by design; the default is 4B for a reason.
- **No silent fake inference**: if the model can't load, the run fails with a clear
  error. A keyword mock exists for pipeline tests only and must be requested
  explicitly (`QVAC_ALLOW_MOCK=1`); the JSONL log records per email which engine
  actually decided (`"modelo": "qvac:Qwen3 4B Q4"` vs `"mock"`).
- **One parse failure never kills the batch**: it logs a warning and the email
  falls to *Despues*.

Every run appends one JSON line per email to `triage.log`:
`{messageId, answers, label_final, timestamp, modelo}` — the audit trail a human
can check in five seconds.

## Setup from a clean clone

Requirements: Node >= 22.17, ~3 GB disk for the default model, a Gmail account.

```bash
git clone https://github.com/CoKeFish/inboxTriage.git
cd inboxTriage
npm install
cp .env.example .env
cp contexto.example.json contexto.json   # edit: your week's priorities (max 5)
```

1. **Gmail OAuth** (one time): create a Desktop OAuth client in Google Cloud
   (Gmail API enabled, redirect `http://localhost:3000/oauth2callback`), put
   ID/secret in `.env`, then `npm run gmail:auth` and `npm run gmail:labels`
   (creates the 3 `InboxTriage/*` labels). Tokens stay on disk, gitignored.
2. **Model smoke test**: `npm run qvac:smoke` — downloads the model on first run
   and answers a test completion.
3. **Seed demo emails** (optional, synthetic, self-addressed, `[TRIAGE-DEMO]`
   prefixed): `npm run gmail:seed:dry` then `npm run gmail:seed:50`.
4. **Triage**: `npm run triage:batch -- --limit 50` (or `--inbox` for your real
   unread inbox, or `--fixtures` for no-Gmail dry runs). Watch the labels appear
   in Gmail.
5. **Panel**: `npm run dashboard:api` → http://localhost:8000 — triaged inbox,
   stamp corrections, weekly interests. (Panel frontend lives in
   [inboxtriage-landing/dashboard](https://github.com/CoKeFish/inboxtriage-landing);
   point `DASHBOARD_DIR` at it or use the deployed panel, which auto-detects the
   local API via `/salud`.)

Cleanup of demo emails: `npm run gmail:seed:clean`.

## Demo video

**[pending — add link before submitting]**

## Privacy

The email body never leaves the machine: inference is `@qvac/sdk` (llama.cpp under
the hood) on device, Gmail tokens live on disk (gitignored), logs are local files.
`npm run demo:check-cloud` → "OK 0 llamadas cloud LLM".

## Repo map

```
src/qvac/client.js    <- all QVAC inference (start here)
src/policy.js         <- answers -> label, deterministic, in code
src/triage/batch.js   <- Gmail -> QVAC -> labels + JSONL log
src/triage/one.js     <- single-email triage
src/gmail/*           <- OAuth, labels, list, seeder (googleapis)
src/server/api.js     <- local panel API (:8000) + serves the panel
contexto.json         <- what matters this week (the user edits this)
docs/DEMO-50.md       <- operator runbook (Spanish): full 50-email judge demo
```

Team: [@albcamargo](https://github.com/albcamargo) · [@CoKeFish](https://github.com/CoKeFish) · Sebastián · Nicolay
