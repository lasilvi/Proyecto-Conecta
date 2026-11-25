import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/db/src/schema.ts',
  out: './packages/db/drizzle',
  schemaFilter: ['marcas', 'acceso', 'fidelidad'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
