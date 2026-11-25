/**
 * Servicio de acceso: usuarios del negocio (dueños y empleados).
 *   POST  /api/acceso/login          Pública (marca por dominio). Correo y contraseña → token.
 *   GET   /api/acceso/yo             Dueño o empleado.
 *   GET   /api/acceso/usuarios       Dueño. Lista el equipo.
 *   POST  /api/acceso/usuarios       Dueño. Crea un dueño o empleado.
 *   PATCH /api/acceso/usuarios/:id   Dueño. Activa/desactiva o cambia la contraseña.
 *
 * Los clientes finales no usan contraseña: se identifican con su celular en el servicio de fidelidad.
 */
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { crearServicio, cuerpo, falla, firmarSesion, requiereSesion, resolverMarca, uuidParam, type ProveedorDb } from '@comacita/core';
import { hashClave, usuarios, verificarClave } from '@comacita/db';

type Usuario = typeof usuarios.$inferSelect;
const vista = (u: Usuario) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, activo: u.activo });

// Hash de referencia para comparar aunque el correo no exista (evita revelar qué correos están registrados por tiempo de respuesta).
let hashFalso: Promise<string> | undefined;

export function crearAppAcceso(proveedor: ProveedorDb) {
  const app = crearServicio('/api/acceso', proveedor);

  app.post('/login', resolverMarca, async (c) => {
    const { email, clave } = await cuerpo(c, z.object({ email: z.string().trim().toLowerCase().email(), clave: z.string().min(1).max(200) }));
    const marca = c.get('marca');
    const [u] = await c.get('db').select().from(usuarios).where(and(eq(usuarios.marcaId, marca.id), eq(usuarios.email, email)));
    const ok = await verificarClave(clave, u?.hashClave ?? (await (hashFalso ??= hashClave('x'))));
    if (!u || !ok || !u.activo) falla(401, 'Correo o contraseña incorrectos');
    const token = await firmarSesion(c, { sub: u!.id, marca: marca.id, rol: u!.rol });
    return c.json({ token, usuario: vista(u!) });
  });

  app.get('/yo', requiereSesion('dueno', 'empleado'), async (c) => {
    const [u] = await c.get('db').select().from(usuarios).where(eq(usuarios.id, c.get('sesion').sub));
    if (!u || !u.activo) falla(401, 'Usuario no disponible');
    return c.json(vista(u!));
  });

  app.get('/usuarios', requiereSesion('dueno'), async (c) => {
    const lista = await c.get('db').select().from(usuarios).where(eq(usuarios.marcaId, c.get('marca').id));
    return c.json(lista.map(vista));
  });

  app.post('/usuarios', requiereSesion('dueno'), async (c) => {
    const d = await cuerpo(c, z.object({
      email: z.string().trim().toLowerCase().email(),
      nombre: z.string().trim().min(2).max(60),
      clave: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
      rol: z.enum(['dueno', 'empleado']).default('empleado'),
    }));
    const db = c.get('db'), marcaId = c.get('marca').id;
    const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(and(eq(usuarios.marcaId, marcaId), eq(usuarios.email, d.email)));
    if (existe) falla(409, 'Ya existe un usuario con ese correo');
    const [u] = await db.insert(usuarios).values({ marcaId, email: d.email, nombre: d.nombre, rol: d.rol, hashClave: await hashClave(d.clave) }).returning();
    return c.json(vista(u!), 201);
  });

  app.patch('/usuarios/:id', requiereSesion('dueno'), async (c) => {
    const d = await cuerpo(c, z.object({ activo: z.boolean().optional(), clave: z.string().min(8).max(200).optional() }));
    const id = uuidParam(c);
    if (d.activo === false && id === c.get('sesion').sub) falla(422, 'No puedes desactivar tu propio usuario');
    const cambios: Partial<Usuario> = {};
    if (d.activo !== undefined) cambios.activo = d.activo;
    if (d.clave) cambios.hashClave = await hashClave(d.clave);
    if (!Object.keys(cambios).length) falla(400, 'No hay cambios');
    const [u] = await c.get('db').update(usuarios).set(cambios)
      .where(and(eq(usuarios.id, id), eq(usuarios.marcaId, c.get('marca').id))).returning();
    if (!u) falla(404, 'Usuario no encontrado');
    return c.json(vista(u!));
  });

  return app;
}
