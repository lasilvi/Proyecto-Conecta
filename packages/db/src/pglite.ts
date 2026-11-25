/** Base de datos Postgres en memoria (PGlite) para desarrollo local y pruebas, sin cuenta de Neon. */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';
import type { Db } from './index.js';

export const carpetaMigraciones = fileURLToPath(new URL('../drizzle', import.meta.url));

export async function crearDbLocal(dataDir?: string): Promise<Db> {
  if (dataDir) await mkdir(dataDir, { recursive: true });
  const cliente = new PGlite(dataDir);
  const db = drizzle(cliente, { schema });
  await migrate(db, { migrationsFolder: carpetaMigraciones });
  return db as unknown as Db;
}
