/**
 * Piezas comunes de los servicios de Comacita (Hono).
 * Cada servicio crea su app con `crearServicio` y recibe la conexión a la base de datos
 * desde fuera: Neon en Cloudflare Workers o PGlite en desarrollo local.
 */
import { and, eq } from 'drizzle-orm';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { sign, verify } from 'hono/jwt';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { dominios, marcas, type Db } from '@comacita/db';

export type Marca = typeof marcas.$inferSelect;
export type Rol = 'dueno' | 'empleado' | 'cliente';
export interface Sesion {
  sub: string;
  marca: string;
  rol: Rol;
  exp: number;
}

export interface Bindings {
  DATABASE_URL?: string;
  JWT_SECRET: string;
  /** Orígenes permitidos para CORS, separados por coma. Vacío = mismo origen. */
  ORIGENES?: string;
  ARCHIVOS?: R2BucketLike;
}
/** Subconjunto de la API de R2 que usamos (permite un reemplazo en disco para desarrollo). */
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream | null; httpMetadata?: { contentType?: string } } | null>;
}

export interface Variables {
  db: Db;
  marca: Marca;
  sesion: Sesion;
}
export type AppEnv = { Bindings: Bindings; Variables: Variables };
export type Ctx = Context<AppEnv>;

/** Entrega la conexión a la base de datos para cada petición. */
export type ProveedorDb = (c: Ctx) => { db: Db; cerrar?: () => Promise<void> };

/** Crea la app Hono de un servicio montada en `base` (por ejemplo "/api/marcas"). */
export function crearServicio(base: string, proveedorDb: ProveedorDb) {
  const app = new Hono<AppEnv>().basePath(base);
  app.use('*', async (c, next) => {
    const origenes = (c.env?.ORIGENES ?? '').split(',').map((o) => o.trim()).filter(Boolean);
    if (!origenes.length) return next();
    return cors({ origin: origenes, allowHeaders: ['Content-Type', 'Authorization', 'X-Marca'] })(c, next);
  });
  app.use('*', async (c, next) => {
    const { db, cerrar } = proveedorDb(c);
    c.set('db', db);
    try {
      await next();
    } finally {
      if (cerrar) {
        const p = cerrar();
        try { c.executionCtx.waitUntil(p); } catch { await p; }
      }
    }
  });
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    if (err instanceof ZodError) {
      return c.json({ error: 'Datos inválidos', detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })) }, 400);
    }
    console.error(err);
    return c.json({ error: 'Error interno' }, 500);
  });
  app.notFound((c) => c.json({ error: 'No encontrado' }, 404));
  return app;
}

export const falla = (status: 400 | 401 | 403 | 404 | 409 | 422, mensaje: string): never => {
  throw new HTTPException(status, { message: mensaje });
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lee un parámetro de ruta que debe ser un UUID (responde 404 si no lo es). */
export function uuidParam(c: Ctx, nombre = 'id'): string {
  const v = c.req.param(nombre) ?? '';
  if (!UUID.test(v)) falla(404, 'No encontrado');
  return v.toLowerCase();
}

/** Lee y valida el cuerpo JSON con un esquema zod. */
export async function cuerpo<T extends ZodTypeAny>(c: Ctx, esquema: T): Promise<z.infer<T>> {
  const datos = await c.req.json().catch(() => falla(400, 'El cuerpo debe ser JSON'));
  return esquema.parse(datos);
}

/**
 * Identifica la marca de la petición, en este orden:
 *   1. cabecera X-Marca (slug), útil en desarrollo y desde el panel de administración;
 *   2. el dominio desde el que se abrió la app (cabecera X-Forwarded-Host u Host).
 */
export const resolverMarca: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = c.get('db');
  const slug = c.req.header('X-Marca')?.trim().toLowerCase();
  let marca: Marca | undefined;
  if (slug) {
    [marca] = await db.select().from(marcas).where(eq(marcas.slug, slug));
  } else {
    const host = (c.req.header('X-Forwarded-Host') ?? c.req.header('Host') ?? '').split(':')[0]!.toLowerCase();
    const [fila] = await db
      .select({ marca: marcas })
      .from(dominios)
      .innerJoin(marcas, eq(marcas.id, dominios.marcaId))
      .where(and(eq(dominios.dominio, host)));
    marca = fila?.marca;
  }
  if (!marca || marca.estado !== 'activa') falla(404, 'Marca no encontrada');
  c.set('marca', marca!);
  await next();
};

/* ---------------- Sesiones (JWT) ---------------- */
const DURACION: Record<Rol, number> = { dueno: 60 * 60 * 12, empleado: 60 * 60 * 16, cliente: 60 * 60 * 24 * 90 };

export async function firmarSesion(c: Ctx, datos: Omit<Sesion, 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + DURACION[datos.rol];
  return sign({ ...datos, exp }, secreto(c), 'HS256');
}

function secreto(c: Ctx) {
  const s = c.env?.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET no configurado (mínimo 32 caracteres).');
  return s;
}

/** Exige una sesión válida con alguno de los roles indicados. También fija la marca de la sesión. */
export function requiereSesion(...roles: Rol[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) falla(401, 'Inicia sesión para continuar');
    let sesion: Sesion;
    try {
      sesion = (await verify(token!, secreto(c), 'HS256')) as unknown as Sesion;
    } catch {
      return falla(401, 'La sesión expiró, vuelve a entrar');
    }
    if (roles.length && !roles.includes(sesion.rol)) falla(403, 'No tienes permiso para esta acción');
    const [marca] = await c.get('db').select().from(marcas).where(eq(marcas.id, sesion.marca));
    if (!marca || marca.estado !== 'activa') falla(403, 'Marca no disponible');
    c.set('marca', marca!);
    c.set('sesion', sesion);
    await next();
  };
}

/** Fecha (AAAA-MM-DD) en la zona horaria de la marca. */
export function fechaLocal(zona: string, fecha = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

/** Normaliza un celular colombiano a 10 dígitos (acepta +57, espacios y guiones). */
export function normalizarTelefono(t: string): string | null {
  let d = t.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? d : null;
}
