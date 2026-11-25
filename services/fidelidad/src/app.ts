/**
 * Servicio de fidelidad: clientes finales, campañas, tarjetas y puntos.
 *
 * Cliente final (marca por dominio, sin contraseña):
 *   GET  /api/fidelidad/campanas                 Campañas activas y sus reglas.
 *   POST /api/fidelidad/clientes/identificar     { telefono } → token si ya está registrado.
 *   POST /api/fidelidad/clientes/registro        { telefono, nombre, cumpleanos, aceptaDatos } → token.
 *   GET  /api/fidelidad/yo                       Sus tarjetas y movimientos.
 *
 * Equipo del negocio (dueño o empleado):
 *   GET  /api/fidelidad/clientes?q=              Buscar por celular o nombre.
 *   POST /api/fidelidad/clientes                 Inscribir cliente en el stand.
 *   GET  /api/fidelidad/clientes/:id             Estado del cliente y sus tarjetas.
 *   POST /api/fidelidad/clientes/:id/compra      Suma los puntos de una compra (respeta el límite diario).
 *   POST /api/fidelidad/clientes/:id/extra       { clave } Puntos extra (Instagram, foto...).
 *   POST /api/fidelidad/clientes/:id/canje       Entrega el premio y descuenta los puntos.
 *
 * Dueño:
 *   GET  /api/fidelidad/resumen                  Números para el inicio.
 *   GET  /api/fidelidad/admin/campanas           Todas las campañas.
 *   POST /api/fidelidad/admin/campanas           Crear campaña.
 *   PUT  /api/fidelidad/admin/campanas/:id       Editar campaña.
 */
import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  crearServicio, cuerpo, falla, fechaLocal, firmarSesion, normalizarTelefono, requiereSesion, resolverMarca, uuidParam,
  type Ctx, type Marca, type ProveedorDb,
} from '@comacita/core';
import { campanas, clientes, movimientos, ReglasCampanaSchema, tarjetas, type Db } from '@comacita/db';

const VERSION_POLITICA = '2026-11';
type Campana = typeof campanas.$inferSelect;
type Cliente = typeof clientes.$inferSelect;

const telefonoSchema = z.string().transform((t, ctx) => {
  const n = normalizarTelefono(t);
  if (!n) { ctx.addIssue({ code: 'custom', message: 'Escribe un celular colombiano de 10 dígitos, por ejemplo 300 123 4567' }); return z.NEVER; }
  return n;
});
const registroSchema = z.object({
  telefono: telefonoSchema,
  nombre: z.string().trim().min(2, 'Escribe tu nombre').max(60),
  cumpleanos: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha AAAA-MM-DD').refine((f) => {
    const d = new Date(`${f}T12:00:00Z`), anio = d.getUTCFullYear(), hoy = new Date().getUTCFullYear();
    return !Number.isNaN(d.getTime()) && anio >= hoy - 110 && anio <= hoy - 5;
  }, 'Fecha de cumpleaños no válida'),
  aceptaDatos: z.literal(true, { errorMap: () => ({ message: 'Debes autorizar el tratamiento de datos para inscribirte' }) }),
});
const campanaSchema = z.object({
  titulo: z.string().trim().min(2).max(60),
  descripcion: z.string().trim().max(160).default(''),
  meta: z.number().int().min(1).max(30),
  premio: z.string().trim().min(2).max(60),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  activa: z.boolean().default(true),
  reglas: ReglasCampanaSchema,
});

const vistaCliente = (c: Cliente) => ({ id: c.id, telefono: c.telefono, nombre: c.nombre, cumpleanos: c.cumpleanos, creado: c.creado });
const vistaCampana = (k: Campana) => ({
  id: k.id, titulo: k.titulo, descripcion: k.descripcion, meta: k.meta, premio: k.premio, inicio: k.inicio, fin: k.fin, activa: k.activa, reglas: k.reglas,
});

function vigentes(db: Db, marca: Marca) {
  const hoy = fechaLocal(marca.zonaHoraria);
  return db.select().from(campanas).where(and(
    eq(campanas.marcaId, marca.id), eq(campanas.activa, true),
    sql`${campanas.inicio} <= ${hoy}`, sql`(${campanas.fin} is null or ${campanas.fin} >= ${hoy})`,
  )).orderBy(asc(campanas.creado));
}

/** Estado completo de un cliente: tarjetas de las campañas vigentes, si ya compró hoy y qué extras recibió. */
async function estadoCliente(db: Db, marca: Marca, cliente: Cliente) {
  const hoy = fechaLocal(marca.zonaHoraria);
  const ks = await vigentes(db, marca);
  const ids = ks.map((k) => k.id);
  const [tjs, movs] = ids.length
    ? await Promise.all([
      db.select().from(tarjetas).where(and(eq(tarjetas.clienteId, cliente.id), inArray(tarjetas.campanaId, ids))),
      db.select({ campanaId: movimientos.campanaId, tipo: movimientos.tipo, claveExtra: movimientos.claveExtra, fechaLocal: movimientos.fechaLocal })
        .from(movimientos).where(and(eq(movimientos.clienteId, cliente.id), inArray(movimientos.campanaId, ids), inArray(movimientos.tipo, ['compra', 'extra']))),
    ])
    : [[], []];
  return {
    cliente: vistaCliente(cliente),
    tarjetas: ks.map((k) => {
      const t = tjs.find((x) => x.campanaId === k.id);
      const puntos = t?.puntos ?? 0;
      const comprasHoy = movs.filter((m) => m.campanaId === k.id && m.tipo === 'compra' && m.fechaLocal === hoy).length;
      const extras = k.reglas.extras.map((r) => {
        const veces = movs.filter((m) => m.campanaId === k.id && m.tipo === 'extra' && m.claveExtra === r.clave).length;
        return { ...r, veces, disponible: !(r.unaVez && veces > 0) };
      });
      return {
        campana: vistaCampana(k), puntos, completa: puntos >= k.meta, premiosCanjeados: t?.premiosCanjeados ?? 0,
        puedeSumarCompra: puntos < k.meta && (k.reglas.maxComprasPorDia === 0 || comprasHoy < k.reglas.maxComprasPorDia),
        comprasHoy, extras,
      };
    }),
  };
}

async function clienteDeMarca(db: Db, marca: Marca, id: string) {
  const [cl] = await db.select().from(clientes).where(and(eq(clientes.id, id), eq(clientes.marcaId, marca.id)));
  if (!cl) falla(404, 'Cliente no encontrado');
  return cl!;
}

async function campanaVigente(db: Db, marca: Marca, campanaId?: string) {
  const ks = await vigentes(db, marca);
  const k = campanaId ? ks.find((x) => x.id === campanaId) : ks[0];
  if (!k) falla(404, campanaId ? 'Campaña no vigente' : 'No hay campañas activas');
  return k!;
}

type Operacion = { tipo: 'compra' } | { tipo: 'extra'; clave: string } | { tipo: 'canje' };

/**
 * Aplica una operación de puntos dentro de una transacción. La fila de la tarjeta se bloquea
 * (SELECT ... FOR UPDATE) para que dos toques simultáneos en el stand no sumen dos veces.
 */
async function aplicar(c: Ctx, clienteId: string, campanaId: string | undefined, op: Operacion) {
  const db = c.get('db'), marca = c.get('marca'), usuarioId = c.get('sesion').sub;
  const cliente = await clienteDeMarca(db, marca, clienteId);
  const k = await campanaVigente(db, marca, campanaId);
  const hoy = fechaLocal(marca.zonaHoraria);

  const resultado = await db.transaction(async (tx) => {
    await tx.insert(tarjetas).values({ clienteId, campanaId: k.id }).onConflictDoNothing();
    const [t] = await tx.select().from(tarjetas).where(and(eq(tarjetas.clienteId, clienteId), eq(tarjetas.campanaId, k.id))).for('update');
    const puntos = t!.puntos;
    let delta = 0, claveExtra: string | null = null;

    if (op.tipo === 'canje') {
      if (puntos < k.meta) falla(409, `Aún le faltan ${k.meta - puntos} para el premio`);
      delta = -k.meta;
    } else {
      if (puntos >= k.meta) falla(409, 'La tarjeta está completa: entrega el premio primero');
      if (op.tipo === 'compra') {
        if (k.reglas.maxComprasPorDia > 0) {
          const [{ n }] = await tx.select({ n: count() }).from(movimientos).where(and(
            eq(movimientos.clienteId, clienteId), eq(movimientos.campanaId, k.id), eq(movimientos.tipo, 'compra'), eq(movimientos.fechaLocal, hoy),
          )) as [{ n: number }];
          if (n >= k.reglas.maxComprasPorDia) falla(409, 'Ya sumó su punto de hoy');
        }
        delta = Math.min(k.reglas.puntosPorCompra, k.meta - puntos);
      } else {
        const regla = k.reglas.extras.find((r) => r.clave === op.clave);
        if (!regla) falla(404, 'Ese punto extra no existe en la campaña');
        if (regla!.unaVez) {
          const [{ n }] = await tx.select({ n: count() }).from(movimientos).where(and(
            eq(movimientos.clienteId, clienteId), eq(movimientos.campanaId, k.id), eq(movimientos.tipo, 'extra'), eq(movimientos.claveExtra, regla!.clave),
          )) as [{ n: number }];
          if (n > 0) falla(409, 'Ya recibió este punto extra');
        }
        delta = Math.min(regla!.puntos, k.meta - puntos);
        claveExtra = regla!.clave;
      }
    }

    const [nueva] = await tx.update(tarjetas).set({
      puntos: puntos + delta,
      premiosCanjeados: op.tipo === 'canje' ? t!.premiosCanjeados + 1 : t!.premiosCanjeados,
      actualizado: new Date(),
    }).where(and(eq(tarjetas.clienteId, clienteId), eq(tarjetas.campanaId, k.id))).returning();
    await tx.insert(movimientos).values({
      marcaId: marca.id, clienteId, campanaId: k.id, tipo: op.tipo, claveExtra, puntos: delta, fechaLocal: hoy, usuarioId,
    });
    return { delta, puntos: nueva!.puntos };
  });

  return { ...resultado, meta: k.meta, completa: resultado.puntos >= k.meta, estado: await estadoCliente(db, marca, cliente) };
}

export function crearAppFidelidad(proveedor: ProveedorDb) {
  const app = crearServicio('/api/fidelidad', proveedor);
  const equipo = requiereSesion('dueno', 'empleado');
  const dueno = requiereSesion('dueno');

  /* -------- Cliente final -------- */
  app.get('/campanas', resolverMarca, async (c) => c.json((await vigentes(c.get('db'), c.get('marca'))).map(vistaCampana)));

  app.post('/clientes/identificar', resolverMarca, async (c) => {
    const { telefono } = await cuerpo(c, z.object({ telefono: telefonoSchema }));
    const marca = c.get('marca');
    const [cl] = await c.get('db').select().from(clientes).where(and(eq(clientes.marcaId, marca.id), eq(clientes.telefono, telefono)));
    if (!cl) return c.json({ registrado: false });
    const token = await firmarSesion(c, { sub: cl.id, marca: marca.id, rol: 'cliente' });
    return c.json({ registrado: true, token, nombre: cl.nombre.split(' ')[0] });
  });

  app.post('/clientes/registro', resolverMarca, async (c) => {
    const d = await cuerpo(c, registroSchema);
    const cl = await inscribir(c, d);
    const token = await firmarSesion(c, { sub: cl.id, marca: c.get('marca').id, rol: 'cliente' });
    return c.json({ token, cliente: vistaCliente(cl) }, 201);
  });

  app.get('/yo', requiereSesion('cliente'), async (c) => {
    const db = c.get('db'), marca = c.get('marca');
    const cl = await clienteDeMarca(db, marca, c.get('sesion').sub);
    const historial = await db.select({
      tipo: movimientos.tipo, claveExtra: movimientos.claveExtra, puntos: movimientos.puntos, creado: movimientos.creado, campana: campanas.titulo,
    }).from(movimientos).innerJoin(campanas, eq(campanas.id, movimientos.campanaId))
      .where(eq(movimientos.clienteId, cl.id)).orderBy(desc(movimientos.creado)).limit(30);
    return c.json({ ...(await estadoCliente(db, marca, cl)), historial });
  });

  /* -------- Equipo del negocio -------- */
  app.get('/clientes', equipo, async (c) => {
    const q = (c.req.query('q') ?? '').trim();
    const db = c.get('db'), marca = c.get('marca');
    const digitos = q.replace(/\D/g, '');
    const filtro = !q ? undefined
      : digitos.length >= 3 ? ilike(clientes.telefono, `%${digitos}%`)
      : q.length >= 2 ? ilike(clientes.nombre, `%${q.replace(/[%_\\]/g, '')}%`)
      : falla(400, 'Escribe al menos 3 números o 2 letras');
    const filas = await db.select().from(clientes).where(and(eq(clientes.marcaId, marca.id), filtro))
      .orderBy(desc(clientes.creado)).limit(q ? 20 : 50);
    return c.json(filas.map(vistaCliente));
  });

  app.post('/clientes', equipo, async (c) => {
    const d = await cuerpo(c, registroSchema);
    const cl = await inscribir(c, d);
    return c.json(await estadoCliente(c.get('db'), c.get('marca'), cl), 201);
  });

  app.get('/clientes/:id', equipo, async (c) => {
    const db = c.get('db'), marca = c.get('marca');
    return c.json(await estadoCliente(db, marca, await clienteDeMarca(db, marca, uuidParam(c))));
  });

  const opSchema = z.object({ campanaId: z.string().uuid().optional() });
  app.post('/clientes/:id/compra', equipo, async (c) => {
    const { campanaId } = await cuerpo(c, opSchema);
    return c.json(await aplicar(c, uuidParam(c), campanaId, { tipo: 'compra' }));
  });
  app.post('/clientes/:id/extra', equipo, async (c) => {
    const { campanaId, clave } = await cuerpo(c, opSchema.extend({ clave: z.string().min(1).max(30) }));
    return c.json(await aplicar(c, uuidParam(c), campanaId, { tipo: 'extra', clave }));
  });
  app.post('/clientes/:id/canje', equipo, async (c) => {
    const { campanaId } = await cuerpo(c, opSchema);
    return c.json(await aplicar(c, uuidParam(c), campanaId, { tipo: 'canje' }));
  });

  /* -------- Dueño -------- */
  app.get('/resumen', dueno, async (c) => {
    const db = c.get('db'), marca = c.get('marca');
    const hoy = fechaLocal(marca.zonaHoraria);
    const hace = (dias: number) => fechaLocal(marca.zonaHoraria, new Date(Date.now() - dias * 864e5));
    const [[total], [nuevos], [puntosHoy], [canjes], [activos30]] = await Promise.all([
      db.select({ n: count() }).from(clientes).where(eq(clientes.marcaId, marca.id)),
      db.select({ n: count() }).from(clientes).where(and(eq(clientes.marcaId, marca.id), gte(clientes.creado, new Date(Date.now() - 7 * 864e5)))),
      db.select({ n: count() }).from(movimientos).where(and(eq(movimientos.marcaId, marca.id), eq(movimientos.fechaLocal, hoy), or(eq(movimientos.tipo, 'compra'), eq(movimientos.tipo, 'extra')))),
      db.select({ n: count() }).from(movimientos).where(and(eq(movimientos.marcaId, marca.id), eq(movimientos.tipo, 'canje'), gte(movimientos.fechaLocal, hace(7)))),
      db.select({ n: sql<number>`count(distinct ${movimientos.clienteId})` }).from(movimientos)
        .where(and(eq(movimientos.marcaId, marca.id), eq(movimientos.tipo, 'compra'), gte(movimientos.fechaLocal, hace(30)))),
    ]);
    const n = (x?: { n: number | string }) => Number(x?.n ?? 0);
    return c.json({
      clientes: n(total), nuevos7dias: n(nuevos), movimientosHoy: n(puntosHoy), premiosEntregados7dias: n(canjes),
      sinCompras30dias: Math.max(0, n(total) - n(activos30)),
    });
  });

  app.get('/admin/campanas', dueno, async (c) => {
    const filas = await c.get('db').select().from(campanas).where(eq(campanas.marcaId, c.get('marca').id)).orderBy(desc(campanas.creado));
    return c.json(filas.map(vistaCampana));
  });

  app.post('/admin/campanas', dueno, async (c) => {
    const d = await cuerpo(c, campanaSchema);
    const [k] = await c.get('db').insert(campanas).values({ ...d, marcaId: c.get('marca').id }).returning();
    return c.json(vistaCampana(k!), 201);
  });

  app.put('/admin/campanas/:id', dueno, async (c) => {
    const d = await cuerpo(c, campanaSchema);
    const [k] = await c.get('db').update(campanas).set(d)
      .where(and(eq(campanas.id, uuidParam(c)), eq(campanas.marcaId, c.get('marca').id))).returning();
    if (!k) falla(404, 'Campaña no encontrada');
    return c.json(vistaCampana(k!));
  });

  return app;
}

async function inscribir(c: Ctx, d: z.infer<typeof registroSchema>) {
  const db = c.get('db'), marca = c.get('marca');
  const [cl] = await db.insert(clientes).values({
    marcaId: marca.id, telefono: d.telefono, nombre: d.nombre, cumpleanos: d.cumpleanos, aceptaDatosEn: new Date(), versionPolitica: VERSION_POLITICA,
  }).onConflictDoNothing().returning();
  if (!cl) falla(409, 'Ese celular ya está inscrito');
  return cl!;
}

