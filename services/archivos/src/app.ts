/**
 * Servicio de archivos: logos, imágenes de sellos y fondos de tarjeta (Cloudflare R2).
 *   POST /api/archivos            Dueño. multipart/form-data con el campo "archivo" → { url }.
 *   GET  /api/archivos/<ruta>     Pública. Sirve el archivo con caché larga.
 *
 * Solo se aceptan PNG, JPG y WebP de hasta 2 MB (SVG no, porque puede llevar scripts).
 */
import { crearServicio, falla, requiereSesion, type ProveedorDb } from '@comacita/core';

const TIPOS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAX_BYTES = 2 * 1024 * 1024;

/** Comprueba la firma real del archivo, no solo el tipo que declara el navegador. */
function firmaValida(b: Uint8Array, tipo: string) {
  if (tipo === 'image/png') return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (tipo === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (tipo === 'image/webp') return String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  return false;
}

export function crearAppArchivos(proveedor: ProveedorDb) {
  const app = crearServicio('/api/archivos', proveedor);

  app.post('/', requiereSesion('dueno'), async (c) => {
    const bucket = c.env.ARCHIVOS;
    if (!bucket) throw new Error('Bucket ARCHIVOS no configurado');
    const form = await c.req.formData().catch(() => falla(400, 'Envía el archivo como multipart/form-data'));
    const archivo = form.get('archivo');
    if (!archivo || typeof archivo === 'string') falla(400, 'Falta el campo "archivo"');
    const f = archivo as File;
    const ext = TIPOS[f.type];
    if (!ext) falla(422, 'Formato no permitido: usa PNG, JPG o WebP');
    if (f.size > MAX_BYTES) falla(422, 'La imagen pesa más de 2 MB');
    const datos = await f.arrayBuffer();
    if (!firmaValida(new Uint8Array(datos), f.type)) falla(422, 'El archivo no es una imagen válida');
    const clave = `marcas/${c.get('marca').slug}/${crypto.randomUUID()}.${ext}`;
    await bucket.put(clave, datos, { httpMetadata: { contentType: f.type } });
    return c.json({ url: `/api/archivos/${clave}` }, 201);
  });

  app.get('/marcas/:slug/:nombre', async (c) => {
    const { slug, nombre } = c.req.param();
    if (!/^[a-z0-9-]+$/.test(slug) || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(nombre)) falla(404, 'No encontrado');
    const obj = await c.env.ARCHIVOS?.get(`marcas/${slug}/${nombre}`);
    if (!obj?.body) falla(404, 'No encontrado');
    return new Response(obj!.body, {
      headers: {
        'Content-Type': obj!.httpMetadata?.contentType ?? 'application/octet-stream',
        // Los nombres son únicos (UUID), así que el archivo nunca cambia.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });

  return app;
}
