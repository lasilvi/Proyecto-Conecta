/**
 * Pruebas de punta a punta de la API con un Postgres en memoria (PGlite).
 * Ejecutar: npm test
 */
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { crearDbLocal } from '@comacita/db/pglite';
import { sembrarSpinta } from '@comacita/db/seed';
import { bucketLocal, crearGateway } from '../dev/gateway.js';

let api: (req: Request) => Response | Promise<Response>;
const BASE = 'http://localhost';

async function llamar(metodo: string, ruta: string, opts: { token?: string; cuerpo?: unknown; marca?: string; host?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.marca) headers['X-Marca'] = opts.marca;
  if (opts.host) headers.Host = opts.host;
  if (opts.cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const res = await api(new Request(BASE + ruta, { method: metodo, headers, body: opts.cuerpo === undefined ? undefined : JSON.stringify(opts.cuerpo) }));
  return { status: res.status, datos: (await res.json().catch(() => null)) as any };
}

let tokenDueno = '';
let tokenEmpleado = '';

before(async () => {
  const db = await crearDbLocal();
  await sembrarSpinta(db, { emailDueno: 'dueno@spinta.test', claveDueno: 'clave-segura-123', dominios: ['spinta.test'] });
  api = crearGateway(db, { JWT_SECRET: 'x'.repeat(40), ARCHIVOS: bucketLocal() });
});

describe('marcas', () => {
  test('resuelve la marca por dominio y por cabecera', async () => {
    const porHost = await llamar('GET', '/api/marcas/actual', { host: 'spinta.test' });
    assert.equal(porHost.status, 200);
    assert.equal(porHost.datos.nombre, 'Spinta Café');
    assert.equal(porHost.datos.tema.colores.primario, '#DD4C28');
    const porCabecera = await llamar('GET', '/api/marcas/actual', { marca: 'spinta' });
    assert.equal(porCabecera.datos.slug, 'spinta');
    assert.equal((await llamar('GET', '/api/marcas/actual', { host: 'otro.test' })).status, 404);
  });
});

describe('acceso', () => {
  test('rechaza contraseña incorrecta', async () => {
    const r = await llamar('POST', '/api/acceso/login', { marca: 'spinta', cuerpo: { email: 'dueno@spinta.test', clave: 'mala' } });
    assert.equal(r.status, 401);
  });

  test('el dueño entra y crea un empleado', async () => {
    const r = await llamar('POST', '/api/acceso/login', { marca: 'spinta', cuerpo: { email: 'DUENO@spinta.test', clave: 'clave-segura-123' } });
    assert.equal(r.status, 200);
    tokenDueno = r.datos.token;
    const e = await llamar('POST', '/api/acceso/usuarios', { token: tokenDueno, cuerpo: { email: 'stand@spinta.test', nombre: 'Stand', clave: 'stand-12345' } });
    assert.equal(e.status, 201);
    const l = await llamar('POST', '/api/acceso/login', { marca: 'spinta', cuerpo: { email: 'stand@spinta.test', clave: 'stand-12345' } });
    tokenEmpleado = l.datos.token;
    assert.equal(l.datos.usuario.rol, 'empleado');
  });

  test('el empleado no puede cambiar el tema de la marca', async () => {
    const r = await llamar('PUT', '/api/marcas/admin/tema', { token: tokenEmpleado, cuerpo: { colores: { primario: '#000000' }, logo: {} } });
    assert.equal(r.status, 403);
  });

  test('el dueño personaliza colores y el sello', async () => {
    const actual = (await llamar('GET', '/api/marcas/actual', { marca: 'spinta' })).datos.tema;
    const tema = { ...actual, colores: { ...actual.colores, secundario: '#1F2937' }, sello: { llenoUrl: '/api/archivos/marcas/spinta/sello.png' } };
    const r = await llamar('PUT', '/api/marcas/admin/tema', { token: tokenDueno, cuerpo: tema });
    assert.equal(r.status, 200);
    assert.equal(r.datos.tema.colores.secundario, '#1F2937');
    const malo = await llamar('PUT', '/api/marcas/admin/tema', { token: tokenDueno, cuerpo: { ...tema, colores: { primario: 'rojo' } } });
    assert.equal(malo.status, 400);
  });
});

describe('fidelidad: campaña Spinta', () => {
  let clienteId = '';

  test('registro exige autorización de datos y celular válido', async () => {
    const sinAutorizar = await llamar('POST', '/api/fidelidad/clientes/registro', { marca: 'spinta', cuerpo: { telefono: '3001112233', nombre: 'Ana', cumpleanos: '1995-05-10', aceptaDatos: false } });
    assert.equal(sinAutorizar.status, 400);
    const malTel = await llamar('POST', '/api/fidelidad/clientes/registro', { marca: 'spinta', cuerpo: { telefono: '12345', nombre: 'Ana', cumpleanos: '1995-05-10', aceptaDatos: true } });
    assert.equal(malTel.status, 400);
  });

  test('el cliente se registra con celular, nombre y cumpleaños', async () => {
    const r = await llamar('POST', '/api/fidelidad/clientes/registro', { marca: 'spinta', cuerpo: { telefono: '+57 300 111 2233', nombre: 'Ana Gómez', cumpleanos: '1995-05-10', aceptaDatos: true } });
    assert.equal(r.status, 201);
    assert.equal(r.datos.cliente.telefono, '3001112233');
    clienteId = r.datos.cliente.id;
    const repetido = await llamar('POST', '/api/fidelidad/clientes/registro', { marca: 'spinta', cuerpo: { telefono: '3001112233', nombre: 'Otra', cumpleanos: '1995-05-10', aceptaDatos: true } });
    assert.equal(repetido.status, 409);
  });

  test('el cliente vuelve a entrar solo con su celular', async () => {
    const r = await llamar('POST', '/api/fidelidad/clientes/identificar', { marca: 'spinta', cuerpo: { telefono: '300 111 2233' } });
    assert.equal(r.datos.registrado, true);
    const yo = await llamar('GET', '/api/fidelidad/yo', { token: r.datos.token });
    assert.equal(yo.status, 200);
    assert.equal(yo.datos.tarjetas[0].campana.meta, 8);
    assert.equal((await llamar('POST', '/api/fidelidad/clientes/identificar', { marca: 'spinta', cuerpo: { telefono: '3009999999' } })).datos.registrado, false);
  });

  test('el cliente no puede sumarse puntos a sí mismo', async () => {
    const t = (await llamar('POST', '/api/fidelidad/clientes/identificar', { marca: 'spinta', cuerpo: { telefono: '3001112233' } })).datos.token;
    assert.equal((await llamar('POST', `/api/fidelidad/clientes/${clienteId}/compra`, { token: t, cuerpo: {} })).status, 403);
  });

  test('1 punto por compra, máximo una al día', async () => {
    const r1 = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/compra`, { token: tokenEmpleado, cuerpo: {} });
    assert.equal(r1.status, 200);
    assert.equal(r1.datos.puntos, 1);
    const r2 = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/compra`, { token: tokenEmpleado, cuerpo: {} });
    assert.equal(r2.status, 409);
    assert.match(r2.datos.error, /hoy/);
  });

  test('+1 por seguir en Instagram solo una vez, +2 por foto repetible', async () => {
    const ig = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/extra`, { token: tokenEmpleado, cuerpo: { clave: 'instagram' } });
    assert.equal(ig.datos.puntos, 2);
    assert.equal((await llamar('POST', `/api/fidelidad/clientes/${clienteId}/extra`, { token: tokenEmpleado, cuerpo: { clave: 'instagram' } })).status, 409);
    await llamar('POST', `/api/fidelidad/clientes/${clienteId}/extra`, { token: tokenEmpleado, cuerpo: { clave: 'foto' } });
    const foto2 = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/extra`, { token: tokenEmpleado, cuerpo: { clave: 'foto' } });
    assert.equal(foto2.datos.puntos, 6);
  });

  test('los puntos no pasan de 8 y el canje reinicia la tarjeta', async () => {
    const canjeTemprano = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/canje`, { token: tokenEmpleado, cuerpo: {} });
    assert.equal(canjeTemprano.status, 409);
    const foto = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/extra`, { token: tokenEmpleado, cuerpo: { clave: 'foto' } });
    assert.equal(foto.datos.puntos, 8);
    assert.equal(foto.datos.completa, true);
    assert.equal((await llamar('POST', `/api/fidelidad/clientes/${clienteId}/extra`, { token: tokenEmpleado, cuerpo: { clave: 'foto' } })).status, 409);
    const canje = await llamar('POST', `/api/fidelidad/clientes/${clienteId}/canje`, { token: tokenEmpleado, cuerpo: {} });
    assert.equal(canje.status, 200);
    assert.equal(canje.datos.puntos, 0);
    assert.equal(canje.datos.estado.tarjetas[0].premiosCanjeados, 1);
  });

  test('el equipo busca por celular y el dueño ve el resumen', async () => {
    const b = await llamar('GET', '/api/fidelidad/clientes?q=111', { token: tokenEmpleado });
    assert.equal(b.datos.length, 1);
    assert.equal((await llamar('GET', '/api/fidelidad/resumen', { token: tokenEmpleado })).status, 403);
    const r = await llamar('GET', '/api/fidelidad/resumen', { token: tokenDueno });
    assert.equal(r.datos.clientes, 1);
    assert.equal(r.datos.premiosEntregados7dias, 1);
  });
});

describe('archivos', () => {
  test('el dueño sube un PNG y se puede descargar; se rechazan otros formatos', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const form = new FormData();
    form.append('archivo', new File([png], 'sello.png', { type: 'image/png' }));
    const res = await api(new Request(`${BASE}/api/archivos`, { method: 'POST', headers: { Authorization: `Bearer ${tokenDueno}` }, body: form }));
    assert.equal(res.status, 201);
    const { url } = (await res.json()) as { url: string };
    const descarga = await api(new Request(BASE + url));
    assert.equal(descarga.status, 200);
    assert.equal(descarga.headers.get('Content-Type'), 'image/png');

    const falso = new FormData();
    falso.append('archivo', new File(['<svg onload=alert(1)>'], 'x.png', { type: 'image/png' }));
    const r2 = await api(new Request(`${BASE}/api/archivos`, { method: 'POST', headers: { Authorization: `Bearer ${tokenDueno}` }, body: falso }));
    assert.equal(r2.status, 422);
  });
});
