/**
 * Hash de contraseñas con PBKDF2-SHA256 (WebCrypto), disponible tanto en Node como en Cloudflare Workers.
 * Formato guardado: pbkdf2$<iteraciones>$<sal base64>$<hash base64>
 * Workers limita PBKDF2 a 100.000 iteraciones.
 */
const ITERACIONES = 100_000;
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derivar(clave: string, sal: Uint8Array<ArrayBuffer>, iteraciones: number) {
  const llave = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, llave, 256);
}

export async function hashClave(clave: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERACIONES}$${b64(sal)}$${b64(await derivar(clave, sal, ITERACIONES))}`;
}

export async function verificarClave(clave: string, guardado: string): Promise<boolean> {
  const [alg, it, sal, hash] = guardado.split('$');
  if (alg !== 'pbkdf2' || !it || !sal || !hash) return false;
  const calculado = new Uint8Array(await derivar(clave, deB64(sal), Number(it)));
  const esperado = deB64(hash);
  if (calculado.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < calculado.length; i++) dif |= calculado[i]! ^ esperado[i]!;
  return dif === 0;
}
