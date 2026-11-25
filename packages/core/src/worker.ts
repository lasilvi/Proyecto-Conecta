/** Punto de entrada común para desplegar un servicio como Cloudflare Worker conectado a Neon. */
import { crearDbNeon } from '@comacita/db';
import type { Hono } from 'hono';
import type { AppEnv, ProveedorDb } from './index.js';

export function workerConNeon(crearApp: (proveedor: ProveedorDb) => Hono<AppEnv, any, any>) {
  const app = crearApp((c) => {
    const url = c.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL no configurado. Usa: wrangler secret put DATABASE_URL');
    return crearDbNeon(url);
  });
  return { fetch: app.fetch } satisfies ExportedHandler<AppEnv['Bindings']>;
}
