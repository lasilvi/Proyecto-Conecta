/**
 * Esquema de datos de Comacita.
 *
 * Una sola base de datos Postgres (Neon) con un "schema" por servicio:
 *   - marcas:    negocios (tenants), dominios y su personalización (tema)
 *   - acceso:    usuarios del negocio (dueños y empleados)
 *   - fidelidad: clientes finales, campañas, tarjetas y movimientos de puntos
 *
 * Cada servicio escribe solo en su schema. Las lecturas entre schemas se limitan
 * a resolver la marca (marcas.marcas), así se pueden separar en bases distintas más adelante.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { ReglasCampana, Tema } from './tipos.js';

const creado = () => timestamp('creado', { withTimezone: true }).notNull().defaultNow();

/* ============================ marcas ============================ */
export const marcasSchema = pgSchema('marcas');

export const marcas = marcasSchema.table('marcas', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nombre: text('nombre').notNull(),
  estado: text('estado', { enum: ['activa', 'pausada'] }).notNull().default('activa'),
  zonaHoraria: text('zona_horaria').notNull().default('America/Bogota'),
  tema: jsonb('tema').$type<Tema>().notNull(),
  creado: creado(),
  actualizado: timestamp('actualizado', { withTimezone: true }).notNull().defaultNow(),
});

export const dominios = marcasSchema.table('dominios', {
  dominio: text('dominio').primaryKey(),
  marcaId: uuid('marca_id').notNull().references(() => marcas.id, { onDelete: 'cascade' }),
  principal: boolean('principal').notNull().default(false),
  creado: creado(),
});

/* ============================ acceso ============================ */
export const accesoSchema = pgSchema('acceso');

export const usuarios = accesoSchema.table(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marcaId: uuid('marca_id').notNull().references(() => marcas.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    nombre: text('nombre').notNull(),
    rol: text('rol', { enum: ['dueno', 'empleado'] }).notNull(),
    hashClave: text('hash_clave').notNull(),
    activo: boolean('activo').notNull().default(true),
    creado: creado(),
  },
  (t) => [uniqueIndex('usuarios_marca_email').on(t.marcaId, t.email)],
);

/* ============================ fidelidad ============================ */
export const fidelidadSchema = pgSchema('fidelidad');

/** Cliente final. Se identifica solo con su celular dentro de cada marca. */
export const clientes = fidelidadSchema.table(
  'clientes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marcaId: uuid('marca_id').notNull().references(() => marcas.id, { onDelete: 'cascade' }),
    telefono: text('telefono').notNull(),
    nombre: text('nombre').notNull(),
    cumpleanos: date('cumpleanos'),
    /** Autorización de tratamiento de datos (Ley 1581 de 2012). */
    aceptaDatosEn: timestamp('acepta_datos_en', { withTimezone: true }).notNull(),
    versionPolitica: text('version_politica').notNull(),
    creado: creado(),
  },
  (t) => [uniqueIndex('clientes_marca_telefono').on(t.marcaId, t.telefono)],
);

export const campanas = fidelidadSchema.table(
  'campanas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marcaId: uuid('marca_id').notNull().references(() => marcas.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion').notNull().default(''),
    meta: integer('meta').notNull(),
    premio: text('premio').notNull(),
    inicio: date('inicio').notNull().default(sql`current_date`),
    fin: date('fin'),
    activa: boolean('activa').notNull().default(true),
    reglas: jsonb('reglas').$type<ReglasCampana>().notNull(),
    creado: creado(),
  },
  (t) => [index('campanas_marca').on(t.marcaId)],
);

export const tarjetas = fidelidadSchema.table(
  'tarjetas',
  {
    clienteId: uuid('cliente_id').notNull().references(() => clientes.id, { onDelete: 'cascade' }),
    campanaId: uuid('campana_id').notNull().references(() => campanas.id, { onDelete: 'cascade' }),
    puntos: integer('puntos').notNull().default(0),
    premiosCanjeados: integer('premios_canjeados').notNull().default(0),
    actualizado: timestamp('actualizado', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clienteId, t.campanaId] })],
);

/** Libro de movimientos: cada punto sumado, punto extra o canje queda registrado. */
export const movimientos = fidelidadSchema.table(
  'movimientos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marcaId: uuid('marca_id').notNull().references(() => marcas.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id').notNull().references(() => clientes.id, { onDelete: 'cascade' }),
    campanaId: uuid('campana_id').notNull().references(() => campanas.id, { onDelete: 'cascade' }),
    tipo: text('tipo', { enum: ['compra', 'extra', 'canje', 'ajuste'] }).notNull(),
    /** Para tipo "extra": clave de la regla (por ejemplo "instagram" o "foto"). */
    claveExtra: text('clave_extra'),
    puntos: integer('puntos').notNull(),
    /** Fecha en la zona horaria de la marca; sirve para la regla de "1 compra al día". */
    fechaLocal: date('fecha_local').notNull(),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    creado: creado(),
  },
  (t) => [
    index('movimientos_cliente').on(t.clienteId, t.campanaId, t.fechaLocal),
    index('movimientos_marca').on(t.marcaId, t.creado),
  ],
);
