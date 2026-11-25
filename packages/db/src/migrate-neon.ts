/** Aplica las migraciones en Neon. Uso: DATABASE_URL=... npm run db:migrate */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL (cadena de conexión de Neon).');
const pool = new Pool({ connectionString: url });
await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
await pool.end();
console.log('Migraciones aplicadas.');
