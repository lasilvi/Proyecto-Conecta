import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color hexadecimal, por ejemplo #DD4C28');
const url = z.string().max(500).refine((v) => v.startsWith('/') || /^https:\/\//.test(v), 'Debe ser https:// o una ruta /');

/** Todo lo que una marca puede personalizar en su experiencia. */
export const TemaSchema = z.object({
  colores: z.object({
    primario: color,
    secundario: color.optional(),
    fondo: color.optional(),
  }),
  tipografia: z
    .object({
      titulos: z.string().max(60).default('Bricolage Grotesque'),
      texto: z.string().max(60).default('Figtree'),
    })
    .default({ titulos: 'Bricolage Grotesque', texto: 'Figtree' }),
  logo: z.object({
    /** Logo a color, para fondos claros. */
    principal: url.optional(),
    /** Versión para poner sobre el color primario (normalmente blanca). */
    sobreColor: url.optional(),
  }),
  tarjeta: z
    .object({
      estilo: z.enum(['marca', 'solido', 'amanecer', 'aurora', 'imagen']).default('marca'),
      fondoUrl: url.optional(),
    })
    .default({ estilo: 'marca' }),
  /** Imagen de cada sello de la tarjeta. Si no hay, se usa un check. */
  sello: z
    .object({
      llenoUrl: url.optional(),
      vacioUrl: url.optional(),
    })
    .default({}),
  textos: z
    .object({
      eslogan: z.string().max(80).optional(),
      bienvenida: z.string().max(160).optional(),
      unidad: z.object({ singular: z.string().max(20), plural: z.string().max(20) }).default({ singular: 'punto', plural: 'puntos' }),
    })
    .default({ unidad: { singular: 'punto', plural: 'puntos' } }),
  redes: z
    .object({
      instagram: z.string().max(60).optional(),
      tienda: url.optional(),
      whatsapp: z.string().max(20).optional(),
    })
    .default({}),
  politicaDatosUrl: url.optional(),
});
export type Tema = z.infer<typeof TemaSchema>;

export const ReglaExtraSchema = z.object({
  clave: z.string().regex(/^[a-z0-9_-]{2,30}$/),
  etiqueta: z.string().min(2).max(60),
  descripcion: z.string().max(120).optional(),
  puntos: z.number().int().min(1).max(20),
  /** Si es true, cada cliente solo lo puede recibir una vez por campaña. */
  unaVez: z.boolean().default(false),
});
export type ReglaExtra = z.infer<typeof ReglaExtraSchema>;

export const ReglasCampanaSchema = z.object({
  puntosPorCompra: z.number().int().min(1).max(20).default(1),
  /** Máximo de compras que suman puntos por cliente y por día (0 = sin límite). */
  maxComprasPorDia: z.number().int().min(0).max(20).default(1),
  extras: z.array(ReglaExtraSchema).max(10).default([]),
});
export type ReglasCampana = z.infer<typeof ReglasCampanaSchema>;
