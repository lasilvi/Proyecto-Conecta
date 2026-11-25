/**
 * Une los servicios en un solo `fetch` para desarrollo local y pruebas.
 * En producción cada servicio es un Worker separado y Cloudflare enruta por ruta (/api/<servicio>/*).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Bindings, R2BucketLike } from '@comacita/core';
import type { Db } from '@comacita/db';
import { crearAppAcceso } from '@comacita/servicio-acceso';
import { crearAppArchivos } from '@comacita/servicio-archivos';
import { crearAppFidelidad } from '@comacita/servicio-fidelidad';
import { crearAppMarcas } from '@comacita/servicio-marcas';

/** Reemplazo de R2 que guarda en disco (o en memoria si no se da carpeta). */
export function bucketLocal(carpeta?: string): R2BucketLike {
  const memoria = new Map<string, { datos: ArrayBuffer; tipo?: string }>();
  return {
    async put(key, value, opts) {
      const tipo = opts?.httpMetadata?.contentType;
      if (!carpeta) { memoria.set(key, { datos: value, tipo }); return; }
      const ruta = join(carpeta, key);
      await mkdir(dirname(ruta), { recursive: true });
      await writeFile(ruta, new Uint8Array(value));
      await writeFile(`${ruta}.tipo`, tipo ?? '');
    },
    async get(key) {
      let datos: ArrayBuffer | Uint8Array, tipo: string | undefined;
      if (!carpeta) {
        const m = memoria.get(key); if (!m) return null;
        ({ datos, tipo } = m);
      } else {
        try { datos = await readFile(join(carpeta, key)); tipo = await readFile(`${join(carpeta, key)}.tipo`, 'utf8'); } catch { return null; }
      }
      return { body: new Blob([datos as ArrayBuffer]).stream(), httpMetadata: { contentType: tipo } };
    },
  };
}

export function crearGateway(db: Db, env: Bindings) {
  const proveedor = () => ({ db });
  const servicios: Record<string, { fetch: (r: Request, e: Bindings) => Response | Promise<Response> }> = {
    marcas: crearAppMarcas(proveedor),
    acceso: crearAppAcceso(proveedor),
    fidelidad: crearAppFidelidad(proveedor),
    archivos: crearAppArchivos(proveedor),
  };
  return (req: Request): Promise<Response> | Response => {
    const nombre = new URL(req.url).pathname.split('/')[2] ?? '';
    const s = servicios[nombre];
    if (!s) return Response.json({ error: 'Servicio no encontrado' }, { status: 404 });
    return s.fetch(req, env);
  };
}
