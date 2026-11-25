/**
 * Servicio de marcas: identidad y personalización de cada negocio (marca blanca).
 *   GET  /api/marcas/actual        Pública. Tema de la marca según el dominio (o cabecera X-Marca).
 *   GET  /api/marcas/admin         Dueño. Marca con sus dominios.
 *   PUT  /api/marcas/admin/tema    Dueño. Reemplaza el tema completo (colores, logos, tarjeta, sellos, textos...).
 *   PATCH /api/marcas/admin        Dueño. Cambia el nombre visible.
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { crearServicio, cuerpo, requiereSesion, resolverMarca, type Marca, type ProveedorDb } from '@comacita/core';
import { dominios, marcas, TemaSchema } from '@comacita/db';

export const publica = (m: Marca) => ({ id: m.id, slug: m.slug, nombre: m.nombre, tema: m.tema });

export function crearAppMarcas(proveedor: ProveedorDb) {
  const app = crearServicio('/api/marcas', proveedor);

  app.get('/actual', resolverMarca, (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(publica(c.get('marca')));
  });

  app.get('/admin', requiereSesion('dueno'), async (c) => {
    const m = c.get('marca');
    const doms = await c.get('db').select().from(dominios).where(eq(dominios.marcaId, m.id));
    return c.json({ ...publica(m), zonaHoraria: m.zonaHoraria, dominios: doms.map((d) => ({ dominio: d.dominio, principal: d.principal })) });
  });

  app.put('/admin/tema', requiereSesion('dueno'), async (c) => {
    const tema = await cuerpo(c, TemaSchema);
    const [m] = await c.get('db').update(marcas).set({ tema, actualizado: new Date() }).where(eq(marcas.id, c.get('marca').id)).returning();
    return c.json(publica(m!));
  });

  app.patch('/admin', requiereSesion('dueno'), async (c) => {
    const datos = await cuerpo(c, z.object({ nombre: z.string().trim().min(2).max(60) }));
    const [m] = await c.get('db').update(marcas).set({ nombre: datos.nombre, actualizado: new Date() }).where(eq(marcas.id, c.get('marca').id)).returning();
    return c.json(publica(m!));
  });

  return app;
}
