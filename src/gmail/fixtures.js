console.log('[Gmail] Modo fixtures - recorte permitido CICLO.md Scope 2 si no hay token a las 5h');
import fs from 'fs';
const fixtures = [
  { id: 'fixture-1', from: 'catering@proveedor-evento.com', subject: 'Cierre lista invitados evento jueves - urgente', snippet: 'Necesitamos cierre lista invitados antes martes 18h para catering' },
  { id: 'fixture-2', from: 'direccion@institucion.edu.co', subject: 'Comunicado mensual bienestar', snippet: 'FYI - actividades bienestar este mes' },
  { id: 'fixture-3', from: 'ana.perez@universidad.edu.co', subject: 'Auditorio principal', snippet: 'Confirmacion auditorio jueves 28' }
];
fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));
console.log('[Gmail] fixtures.json creado con 3 casos canonicos');