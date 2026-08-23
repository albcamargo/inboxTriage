// Policy deterministica en codigo - PITCH.md Shape Go
// Mapa preguntas -> 3 labels. No prompt gigante.

export function policy(answers) {
  // answers = { es_stakeholder: SI/NO/INCIERTO, bloquea_evento, pide_accion, es_fyi }
  const norm = (v) => (v||'INCIERTO').toUpperCase();

  if (norm(answers.es_fyi)==='SI') return 'InboxTriage/NoResponder';
  if (norm(answers.es_stakeholder)==='SI' && norm(answers.bloquea_evento)==='SI') return 'InboxTriage/Ahora';
  if (norm(answers.es_stakeholder)==='SI' && norm(answers.pide_accion)==='SI') return 'InboxTriage/Ahora';
  if (norm(answers.pide_accion)==='SI' && norm(answers.bloquea_evento)==='SI') return 'InboxTriage/Ahora';

  // INCIERTO o senales debiles -> Despues. No tratar "todo NO" como FYI.
  return 'InboxTriage/Despues';
}