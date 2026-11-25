/**
 * Siembra Spinta en Neon. Uso:
 *   DATABASE_URL=... SPINTA_EMAIL=... SPINTA_CLAVE=... SPINTA_DOMINIOS=spinta.comacita.app npm run db:seed
 */
import { crearDbNeon } from './index.js';
import { sembrarSpinta } from './seed.js';

const { DATABASE_URL, SPINTA_EMAIL, SPINTA_CLAVE, SPINTA_DOMINIOS } = process.env;
if (!DATABASE_URL || !SPINTA_EMAIL || !SPINTA_CLAVE || !SPINTA_DOMINIOS) {
  throw new Error('Faltan variables: DATABASE_URL, SPINTA_EMAIL, SPINTA_CLAVE y SPINTA_DOMINIOS (separados por coma).');
}
if (SPINTA_CLAVE.length < 10) throw new Error('SPINTA_CLAVE debe tener al menos 10 caracteres.');
const { db, cerrar } = crearDbNeon(DATABASE_URL);
const marca = await sembrarSpinta(db, {
  emailDueno: SPINTA_EMAIL,
  claveDueno: SPINTA_CLAVE,
  dominios: SPINTA_DOMINIOS.split(',').map((d) => d.trim()),
});
await cerrar();
console.log(`Marca lista: ${marca.nombre} (${marca.id})`);
