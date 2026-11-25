/**
 * Servidor local de la API (puerto 8787). Usa PGlite: un Postgres real que corre dentro de Node
 * y guarda los datos en dev/.datos. No necesita cuenta de Neon ni Docker.
 *
 * Usuario de prueba (solo local): dueno@spinta.local / spinta-local-123
 */
import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { crearDbLocal } from '@comacita/db/pglite';
import { sembrarSpinta } from '@comacita/db/seed';
import { bucketLocal, crearGateway } from './gateway.js';

const aqui = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const db = await crearDbLocal(aqui('./.datos/pg'));
await sembrarSpinta(db, {
  emailDueno: 'dueno@spinta.local',
  claveDueno: 'spinta-local-123',
  dominios: ['localhost', '127.0.0.1'],
  conDemo: true,
});

const fetch = crearGateway(db, {
  JWT_SECRET: process.env.JWT_SECRET ?? 'solo-desarrollo-local-no-usar-en-produccion-0123456789',
  ARCHIVOS: bucketLocal(aqui('./.datos/archivos')),
});

const puerto = Number(process.env.PUERTO ?? 8787);
serve({ fetch, port: puerto }, () => {
  console.log(`API de Comacita en http://localhost:${puerto}/api  (Spinta: dueno@spinta.local / spinta-local-123)`);
});
