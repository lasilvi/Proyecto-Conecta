/**
 * Datos iniciales: Spinta Café como primera marca (cliente canario).
 * `conDemo` agrega clientes de ejemplo; úsalo solo en local o en un entorno de pruebas.
 */
import { eq } from 'drizzle-orm';
import { hashClave } from './claves.js';
import type { Db } from './index.js';
import { campanas, clientes, dominios, marcas, movimientos, tarjetas, usuarios } from './schema.js';
import { ReglasCampanaSchema, TemaSchema } from './tipos.js';

export const TEMA_SPINTA = TemaSchema.parse({
  colores: { primario: '#DD4C28', fondo: '#FAF5F2' },
  logo: { principal: '/marcas/spinta/logo.png', sobreColor: '/marcas/spinta/logo-blanco.png' },
  tarjeta: { estilo: 'marca' },
  sello: { llenoUrl: '/marcas/spinta/logo-blanco.png' },
  textos: {
    eslogan: 'Café y movimiento',
    bienvenida: 'Premiamos que elijas buen café en tus días 🔥☕',
    unidad: { singular: 'punto', plural: 'puntos' },
  },
  redes: { instagram: 'spintacafe', tienda: 'https://spintacafe.myshopify.com' },
});

export const REGLAS_SPINTA = ReglasCampanaSchema.parse({
  puntosPorCompra: 1,
  maxComprasPorDia: 1,
  extras: [
    { clave: 'instagram', etiqueta: 'Nos sigue en Instagram', descripcion: 'Sigue a @spintacafe', puntos: 1, unaVez: true },
    { clave: 'foto', etiqueta: 'Subió foto y nos etiquetó', descripcion: 'Foto con tu café etiquetando a @spintacafe', puntos: 2, unaVez: false },
  ],
});

export interface OpcionesSeed {
  emailDueno: string;
  claveDueno: string;
  dominios: string[];
  conDemo?: boolean;
}

export async function sembrarSpinta(db: Db, op: OpcionesSeed) {
  const existente = await db.select().from(marcas).where(eq(marcas.slug, 'spinta'));
  if (existente.length) return existente[0]!;

  const [marca] = await db.insert(marcas).values({ slug: 'spinta', nombre: 'Spinta Café', tema: TEMA_SPINTA }).returning();
  const m = marca!;
  await db.insert(dominios).values(op.dominios.map((d, i) => ({ dominio: d.toLowerCase(), marcaId: m.id, principal: i === 0 })));
  await db.insert(usuarios).values({
    marcaId: m.id, email: op.emailDueno.toLowerCase(), nombre: 'Equipo Spinta', rol: 'dueno', hashClave: await hashClave(op.claveDueno),
  });
  const [campana] = await db.insert(campanas).values({
    marcaId: m.id,
    titulo: 'Tarjeta Spinta',
    descripcion: '1 punto por compra al día. Con 8 puntos te invitamos el próximo café.',
    meta: 8,
    premio: 'un café gratis',
    reglas: REGLAS_SPINTA,
  }).returning();

  if (op.conDemo) {
    const hoy = new Date().toISOString().slice(0, 10);
    const demo: [string, string, string, number][] = [
      ['Camila Rodríguez', '3004567812', '1996-03-14', 5],
      ['Andrés Gómez', '3157780921', '1990-11-02', 6],
      ['Valentina Ruiz', '3209981245', '2000-07-21', 8],
      ['Santiago Pérez', '3012245566', '1988-01-30', 3],
    ];
    for (const [nombre, telefono, cumpleanos, puntos] of demo) {
      const [c] = await db.insert(clientes).values({
        marcaId: m.id, nombre, telefono, cumpleanos, aceptaDatosEn: new Date(), versionPolitica: 'demo',
      }).returning();
      await db.insert(tarjetas).values({ clienteId: c!.id, campanaId: campana!.id, puntos });
      await db.insert(movimientos).values({
        marcaId: m.id, clienteId: c!.id, campanaId: campana!.id, tipo: 'ajuste', puntos, fechaLocal: hoy,
      });
    }
  }
  return m;
}
