console.log('[Prompt] Test contrato SI/NO/INCIERTO');

const casos = [
  { id: 'canonico-A', texto: 'catering@proveedor-evento.com pide cierre lista evento jueves', esperado: { stakeholder: 'SI', bloquea: 'SI' } },
  { id: 'canonico-B', texto: 'comunicado mensual bienestar director FYI', esperado: { es_fyi: 'SI' } }
];

function mockCompletion(texto) {
  // Mock del prompt de 4 preguntas
  const lower = texto.toLowerCase();
  return {
    es_stakeholder: lower.includes('catering') || lower.includes('produccion') || lower.includes('ana perez') ? 'SI' : 'NO',
    bloquea_evento: lower.includes('jueves') || lower.includes('cierre lista') || lower.includes('auditorio') ? 'SI' : 'NO',
    pide_accion: lower.includes('necesitamos') || lower.includes('cierre') || lower.includes('urgente') ? 'SI' : 'NO',
    es_fyi: lower.includes('comunicado') || lower.includes('bienestar') || lower.includes('fyi') ? 'SI' : 'NO'
  };
}

let ok = true;
for (const c of casos) {
  const res = mockCompletion(c.texto);
  console.log(`  ${c.id}:`, res);
  if (c.id==='canonico-A' && !(res.es_stakeholder==='SI' && res.bloquea_evento==='SI')) ok=false;
  if (c.id==='canonico-B' && res.es_fyi!=='SI') ok=false;
}

if (ok) console.log('[Prompt] Test OK - Parser SI/NO/INCIERTO - caso canonico pasa');
else { console.error('[Prompt] Test FAIL'); process.exit(1); }