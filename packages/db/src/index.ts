import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';

export * as schema from './schema.js';
export * from './schema.js';
export * from './tipos.js';
export * from './claves.js';

/** Conexión a la base de datos, independiente del driver (Neon en producción, PGlite en local). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Crea la conexión a Neon. En Cloudflare Workers se debe crear una por petición
 * y cerrarla al terminar (ver `conDb` en @comacita/core).
 */
export function crearDbNeon(databaseUrl: string): { db: Db; cerrar: () => Promise<void> } {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema }) as unknown as Db;
  return { db, cerrar: () => pool.end() };
}
