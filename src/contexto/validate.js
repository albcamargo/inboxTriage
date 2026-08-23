import fs from 'fs';

const ctxPath = process.env.CONTEXTO_PATH || './contexto.json';
const schemaPath = './contexto.schema.json';

function validate(ctx) {
  if (!ctx.on_the_plate || ctx.on_the_plate.length===0 || ctx.on_the_plate.length>5) throw new Error('on_the_plate debe tener 1-5 items');
  if (!ctx.stakeholders || ctx.stakeholders.length===0) throw new Error('stakeholders requerido');
  if (!ctx.deprioritize) throw new Error('deprioritize requerido');
  console.log('[Contexto] Validacion OK - Scope 3 VERDE');
  console.log(`  on_the_plate: ${ctx.on_the_plate.length} items`);
  console.log(`  stakeholders: ${ctx.stakeholders.length}`);
  console.log(`  deprioritize: ${ctx.deprioritize.length}`);
}

try {
  const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
  validate(ctx);
} catch (e) {
  console.error(`[Contexto] Error: ${e.message}`);
  process.exit(1);
}