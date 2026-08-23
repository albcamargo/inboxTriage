/**
 * src/gmail/seed.js - Crea 50 correos de prueba sinteticos en Gmail
 * Cuenta: acamargo@corefex.net - Solo a si mismo - Sin datos reales
 * Alineado a PITCH.md Frame Go + contexto.example.json + CICLO.md Scope 5
 * Uso: node src/gmail/seed.js --count 50 --to acamargo@corefex.net --dry-run --clean
 */

import 'dotenv/config';
import fs from 'fs';
import { getGmail } from './client.js';

const args = process.argv;
const getArg = (name, def) => {
  const idx = args.indexOf(`--${name}`);
  if (idx>=0 && args[idx+1] && !args[idx+1].startsWith('--')) return args[idx+1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  return def;
};

const COUNT = parseInt(getArg('count', '50'));
const TO = getArg('to', 'acamargo@corefex.net');
const DRY_RUN = args.includes('--dry-run');
const CLEAN = args.includes('--clean');

const PREFIX = '[TRIAGE-DEMO]';

// Contexto real del repo para alinear seeder
let contexto;
try {
  contexto = JSON.parse(fs.readFileSync(process.env.CONTEXTO_PATH || './contexto.json', 'utf8'));
} catch {
  contexto = JSON.parse(fs.readFileSync('./contexto.example.json', 'utf8'));
}

// 50 casos sinteticos - 10 Ahora, 20 Despues, 20 NoResponder - sin datos reales
// Todos con prefijo [TRIAGE-DEMO] para limpieza facil
const FIXTURES_50 = [
  // === AHORA - 10 - bloquean evento jueves / stakeholders contexto.example.json ===
  { bucket: 'Ahora', from: 'catering@proveedor-evento.com', subject: `${PREFIX} Cierre lista invitados evento jueves - urgente - catering`, body: `Hola, necesitamos cierre de lista de invitados antes del martes 18:00 para pedido catering del evento del jueves 28. Quedan 12 cupos. Por favor confirmar numero final y restricciones alimentarias.\n\nGracias,\nEquipo catering@proveedor-evento.com` },
  { bucket: 'Ahora', from: 'produccion@venue.com', subject: `${PREFIX} Auditorio principal jueves 28 - confirmacion montaje`, body: `Confirmacion auditorio principal jueves 28 agosto. Montaje desde 07:00. Necesitamos plano de tarima y numero de microfonos. ¿Pueden enviar hoy?` },
  { bucket: 'Ahora', from: 'Ana Perez <ana.perez@universidad.edu.co>', subject: `${PREFIX} Acreditaciones evento jueves - listado`, body: `Hola, adjunto listado preliminar acreditaciones evento jueves. Faltan 5 nombres de invitados externos. Necesito cierre hoy para impresion.` },
  { bucket: 'Ahora', from: 'direccion@institucion.edu.co', subject: `${PREFIX} Informe trimestral - deadline viernes - revision`, body: `Acamargo, informe trimestral debe entregarse viernes. Necesito tu seccion de logistica de eventos antes de jueves 17:00. Bloquea agenda.` },
  { bucket: 'Ahora', from: 'catering@proveedor-evento.com', subject: `${PREFIX} Restricciones alimentarias invitados - urgente`, body: `Nos llegaron 3 restricciones nuevas (vegano, gluten). Necesitamos ajuste menu antes de cierre martes 18h. ¿Pueden confirmar?` },
  { bucket: 'Ahora', from: 'produccion@venue.com', subject: `${PREFIX} Prueba sonido jueves 07:30 - confirmacion`, body: `Prueba de sonido jueves 07:30 en auditorio. ¿Confirmas asistencia con equipo tecnico? Necesitamos 2 microfonos de diadema.` },
  { bucket: 'Ahora', from: 'ana.perez@universidad.edu.co', subject: `${PREFIX} Transporte invitados externos jueves`, body: `Transporte invitados externos jueves necesita confirmacion ruta y hora. ¿Van en bus institucional o taxi?` },
  { bucket: 'Ahora', from: 'logistica@institucion.edu.co', subject: `${PREFIX} Tarima y sillas - pedido pendiente`, body: `Tarima 6x4 y 120 sillas pendientes de confirmacion para jueves. Proveedor necesita OK hoy antes de 16:00.` },
  { bucket: 'Ahora', from: 'catering@proveedor-evento.com', subject: `${PREFIX} Factura proforma catering - aprobacion`, body: `Factura proforma catering evento jueves $2.8M. Necesita aprobacion direccion antes de martes para despacho.` },
  { bucket: 'Ahora', from: 'seguridad@venue.com', subject: `${PREFIX} Lista seguridad evento jueves - DNI`, body: `Para ingreso auditorio jueves necesitamos lista con DNI de staff y proveedores antes de miercoles 12:00.` },

  // === DESPUES - 20 - requieren accion pero no bloquean esta semana ===
  { bucket: 'Despues', from: 'planeacion@institucion.edu.co', subject: `${PREFIX} Reunion planeacion septiembre - agenda`, body: `Hola, agendemos reunion planeacion septiembre proxima semana. ¿Martes o miercoles te sirve?` },
  { bucket: 'Despues', from: 'compras@institucion.edu.co', subject: `${PREFIX} Cotizacion papeleria trimestre`, body: `Cotizacion papeleria Q4. No urgente, para la otra semana. 3 proveedores.` },
  { bucket: 'Despues', from: 'talento@institucion.edu.co', subject: `${PREFIX} Capacitacion brigada - octubre`, body: `Capacitacion brigada emergencia octubre. Inscripcion abierta hasta 15 sept.` },
  { bucket: 'Despues', from: 'sistemas@institucion.edu.co', subject: `${PREFIX} Actualizacion clave correo`, body: `Recordatorio actualizacion clave correo cada 90 dias. Vence en 20 dias.` },
  { bucket: 'Despues', from: 'biblioteca@universidad.edu.co', subject: `${PREFIX} Devolucion libros - recordatorio`, body: `Tienes 2 libros con vencimiento proxima semana.` },
  { bucket: 'Despues', from: 'juridica@institucion.edu.co', subject: `${PREFIX} Revision contrato proveedor menor`, body: `Revision contrato menor cuantia proveedor aseo. Para la otra semana.` },
  { bucket: 'Despues', from: 'comunicaciones@institucion.edu.co', subject: `${PREFIX} Fotos evento pasado - seleccion`, body: `Fotos evento pasado para archivo. ¿Puedes seleccionar 10 para boletin?` },
  { bucket: 'Despues', from: 'financiera@institucion.edu.co', subject: `${PREFIX} Legalizacion viaticos julio`, body: `Legalizacion viaticos julio pendiente. Fecha limite 30 agosto.` },
  { bucket: 'Despues', from: 'Ana Perez <ana.perez@universidad.edu.co>', subject: `${PREFIX} Propuesta evento octubre - ideas`, body: `¿Ideas para evento octubre? Lluvia de ideas proxima semana, no urgente esta semana.` },
  { bucket: 'Despues', from: 'externo@proveedor.com', subject: `${PREFIX} Propuesta patrocinio 2026`, body: `Propuesta patrocinio 2026. Para revisar en septiembre, no bloquea evento jueves.` },
  { bucket: 'Despues', from: 'academica@universidad.edu.co', subject: `${PREFIX} Calendario academico 2026-2`, body: `Calendario academico 2026-2 para coordinacion. Revisar la otra semana.` },
  { bucket: 'Despues', from: 'mantenimiento@institucion.edu.co', subject: `${PREFIX} Mantenimiento aire auditorio - programacion`, body: `Mantenimiento preventivo aire auditorio programado septiembre.` },
  { bucket: 'Despues', from: 'relaciones@institucion.edu.co', subject: `${PREFIX} Convenio marco - borrador`, body: `Borrador convenio marco universidad. Para revision juridica proxima semana.` },
  { bucket: 'Despues', from: 'innovacion@institucion.edu.co', subject: `${PREFIX} Convocatoria innovacion - inscripcion`, body: `Convocatoria innovacion abierta hasta 20 septiembre.` },
  { bucket: 'Despues', from: 'egresados@universidad.edu.co', subject: `${PREFIX} Base datos egresados - actualizacion`, body: `Actualizacion base egresados. Para despues del evento jueves.` },
  { bucket: 'Despues', from: 'ti@institucion.edu.co', subject: `${PREFIX} Backup correos - programado`, body: `Backup automatico correos domingo 02:00. No requiere accion.` },
  { bucket: 'Despues', from: 'catering@proveedor-evento.com', subject: `${PREFIX} Menu octubre - degustacion`, body: `Invitacion degustacion menu octubre. Fecha por definir septiembre.` },
  { bucket: 'Despues', from: 'produccion@venue.com', subject: `${PREFIX} Tarifas 2026 auditorio`, body: `Tarifas 2026 auditorio. Para planeacion presupuesto, no urgente.` },
  { bucket: 'Despues', from: 'direccion@institucion.edu.co', subject: `${PREFIX} Evaluacion desempeno - formato`, body: `Formato evaluacion desempeno Q3. Entrega 15 septiembre.` },
  { bucket: 'Despues', from: 'logistica@institucion.edu.co', subject: `${PREFIX} Inventario bodega - conteo`, body: `Conteo inventario bodega programado proxima semana.` },

  // === NO RESPONDER - 20 - FYI, newsletters, comunicados rutina, gracias ===
  { bucket: 'NoResponder', from: 'bienestar@institucion.edu.co', subject: `${PREFIX} Comunicado mensual bienestar - FYI`, body: `FYI - Actividades bienestar agosto: yoga martes/jueves, torneo futbol. No requiere accion.` },
  { bucket: 'NoResponder', from: 'no-reply@software.com', subject: `${PREFIX} Newsletter - Descuento 20% software gestion`, body: `Newsletter - Descuento 20% en software de gestion. Oferta valida hasta... (publicidad)` },
  { bucket: 'NoResponder', from: 'direccion@institucion.edu.co', subject: `${PREFIX} FYI - Circular 045 - Horario atencion`, body: `FYI - Circular 045 - Horario atencion al publico. Informativo.` },
  { bucket: 'NoResponder', from: 'todos@institucion.edu.co', subject: `${PREFIX} Invitacion eucaristia - FYI`, body: `Invitacion eucaristia viernes 12m. FYI - asistencia voluntaria.` },
  { bucket: 'NoResponder', from: 'comunicaciones@institucion.edu.co', subject: `${PREFIX} Boletin institucional agosto - FYI`, body: `Boletin institucional agosto - resumen noticias. FYI.` },
  { bucket: 'NoResponder', from: 'noreply@linkedin.com', subject: `${PREFIX} Tienes 5 nuevas visualizaciones de perfil`, body: `LinkedIn - 5 personas vieron tu perfil esta semana. (notificacion automatica)` },
  { bucket: 'NoResponder', from: 'no-reply@drive.com', subject: `${PREFIX} Alguien compartio un archivo contigo - FYI`, body: `Drive - Alguien compartio documento. FYI.` },
  { bucket: 'NoResponder', from: 'bienestar@institucion.edu.co', subject: `${PREFIX} Torneo interno futbol - inscripciones FYI`, body: `FYI - Torneo futbol inscripciones abiertas. Voluntario.` },
  { bucket: 'NoResponder', from: 'sistemas@institucion.edu.co', subject: `${PREFIX} Mantenimiento programado domingo - FYI`, body: `FYI - Mantenimiento programado domingo 02:00-04:00. Sin afectacion lunes.` },
  { bucket: 'NoResponder', from: 'externo@noticias.com', subject: `${PREFIX} Newsletter - Tendencias educacion 2026`, body: `Newsletter tendencias educacion. Contenido informativo.` },
  { bucket: 'NoResponder', from: 'Ana Perez <ana.perez@universidad.edu.co>', subject: `${PREFIX} Gracias - recibido listado`, body: `Gracias, recibido. (cadena de agradecimiento)` },
  { bucket: 'NoResponder', from: 'todos@institucion.edu.co', subject: `${PREFIX} CC masivo - Recordatorio parqueadero`, body: `CC masivo - Recordatorio normas parqueadero. FYI.` },
  { bucket: 'NoResponder', from: 'no-reply@zoom.com', subject: `${PREFIX} Grabacion reunion disponible - FYI`, body: `Zoom - Grabacion reunion disponible 30 dias. FYI.` },
  { bucket: 'NoResponder', from: 'bienestar@institucion.edu.co', subject: `${PREFIX} Pausas activas - video FYI`, body: `FYI - Video pausas activas.` },
  { bucket: 'NoResponder', from: 'comunicaciones@institucion.edu.co', subject: `${PREFIX} Fotos evento - FYI`, body: `Fotos evento pasado disponibles en Drive. FYI.` },
  { bucket: 'NoResponder', from: 'no-reply@software.com', subject: `${PREFIX} Actualizacion terminos y condiciones - FYI`, body: `Actualizacion terminos. FYI.` },
  { bucket: 'NoResponder', from: 'todos@institucion.edu.co', subject: `${PREFIX} Feliz cumpleanos - FYI masivo`, body: `Feliz cumpleanos a colegas de agosto. FYI masivo.` },
  { bucket: 'NoResponder', from: 'noreply@github.com', subject: `${PREFIX} [GitHub] Dependabot - FYI`, body: `Dependabot PR - actualizacion menor. FYI.` },
  { bucket: 'NoResponder', from: 'direccion@institucion.edu.co', subject: `${PREFIX} FYI - Informe gestion julio`, body: `FYI - Informe gestion julio adjunto. Informativo.` },
  { bucket: 'NoResponder', from: 'no-reply@encuesta.com', subject: `${PREFIX} Encuesta clima laboral - FYI`, body: `Encuesta clima laboral - participacion voluntaria. FYI.` },
];

function toFixtureRecord(f, i) {
  return {
    id: `fixture-${i + 1}`,
    from: f.from,
    subject: f.subject,
    snippet: f.body.replace(/\s+/g, ' ').slice(0, 180),
    body: f.body,
    bucket: f.bucket,
  };
}

function writeLocalFixtures(selected) {
  const records = selected.map(toFixtureRecord);
  fs.writeFileSync('fixtures-50-demo.json', JSON.stringify(records, null, 2));
  fs.writeFileSync('fixtures.json', JSON.stringify(records.slice(0, 15), null, 2));
}

function encodeRaw(f) {
  const raw = [
    `From: ${f.from}`,
    `To: ${TO}`,
    `Subject: ${f.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    `X-Triage-Demo: ${f.bucket}`,
    '',
    f.body,
    '',
    '---',
    'Correo sintetico InboxTriage - Aleph Hackathon',
    `Bucket esperado: ${f.bucket}`,
    `Prefijo [TRIAGE-DEMO] - ${new Date().toISOString()}`,
  ].join('\r\n');
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function trashDemoMessages(gmail) {
  let trashed = 0;
  let pageToken;
  do {
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:"[TRIAGE-DEMO]"',
      maxResults: 100,
      pageToken,
    });
    for (const m of data.messages || []) {
      await gmail.users.messages.trash({ userId: 'me', id: m.id });
      trashed += 1;
      console.log(`  Borrado ${m.id}`);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return trashed;
}

async function main() {
  console.log(`=== Seeder 50 correos demo para ${TO} ===`);
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN' : CLEAN ? 'CLEAN' : 'INSERT GMAIL'}`);
  console.log(`Contexto: ${contexto.on_the_plate?.length || 0} en plato, ${contexto.stakeholders?.length || 0} stakeholders`);

  const selected = FIXTURES_50.slice(0, COUNT);
  const stats = {
    Ahora: selected.filter((f) => f.bucket === 'Ahora').length,
    Despues: selected.filter((f) => f.bucket === 'Despues').length,
    NoResponder: selected.filter((f) => f.bucket === 'NoResponder').length,
  };
  console.log(`Distribucion esperada: Ahora:${stats.Ahora} Despues:${stats.Despues} NoResponder:${stats.NoResponder}`);
  console.log('');

  if (DRY_RUN) {
    writeLocalFixtures(selected);
    console.log(`[DRY-RUN] Guardado fixtures-50-demo.json (${selected.length}) y fixtures.json (15)`);
    console.log('Para probar triaje sin Gmail: npm run triage:15');
    return;
  }

  const gmail = getGmail();

  if (CLEAN) {
    console.log('[CLEAN] Buscando mensajes con prefijo [TRIAGE-DEMO] para borrar...');
    const trashed = await trashDemoMessages(gmail);
    console.log(`[CLEAN] OK - ${trashed} mensajes a papelera`);
    return;
  }

  let created = 0;
  for (const f of selected) {
    try {
      await gmail.users.messages.insert({
        userId: 'me',
        requestBody: {
          raw: encodeRaw(f),
          labelIds: ['INBOX', 'UNREAD'],
        },
      });
      created += 1;
      process.stdout.write(`[${created}/${selected.length}] ${f.bucket} - ${f.subject.slice(0, 60)}... OK\n`);
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error(`  Error insertando ${f.subject}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  writeLocalFixtures(selected);
  console.log(`\n[SEED] Insertados ${created}/${selected.length} correos en inbox (no se enviaron)`);
  console.log('Todos con prefijo [TRIAGE-DEMO] - borrables con --clean');
  console.log('Siguiente: npm run triage:batch -- --limit 50');
}

main().catch((e) => {
  console.error('Error Gmail API:', e.message);
  console.error('Asegura tokens.json valido y scope gmail.modify');
  process.exit(1);
});
