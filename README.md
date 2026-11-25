# Comacita — fidelización marca blanca

Tarjetas de puntos digitales para pequeños negocios. Cada negocio (marca) personaliza
logo, colores, tarjeta, imagen de los sellos y textos, y se sirve desde su propio dominio.
Primer cliente (canario): **Spinta Café**.

## Estructura

```
apps/web/              App React (Vite): dueño, empleado (stand) y cliente
packages/db/           Esquema Postgres (Drizzle), migraciones, semilla de Spinta
packages/core/         Piezas comunes de los servicios: marca actual, sesiones, errores
services/marcas/       Identidad y personalización de cada marca
services/acceso/       Dueños y empleados (correo + contraseña)
services/fidelidad/    Clientes, campañas, tarjetas y puntos
services/archivos/     Logos e imágenes de sellos (Cloudflare R2)
dev/                   Servidor local que agrupa los servicios
tests/                 Pruebas de punta a punta de la API
```

Cada servicio es un **Cloudflare Worker** independiente y todos comparten una base **Neon
(Postgres)**, cada uno en su propio schema (`marcas`, `acceso`, `fidelidad`). La marca se
identifica por el dominio desde el que se abre la app.

## Desarrollo local

Requisitos: Node.js 20.19 o superior. No necesita cuenta de Neon ni Docker: en local se usa
PGlite (Postgres dentro de Node) y los datos quedan en `dev/.datos/`.

```bash
npm install
npm run dev        # API en :8787 y app en http://localhost:5173
npm test           # pruebas de la API
npm run typecheck
```

Usuario local de Spinta: `dueno@spinta.local` / `spinta-local-123` (solo para la API local).
Para empezar desde cero, borra `dev/.datos/`.

Si cambias `packages/db/src/schema.ts`, genera la migración con `npm run db:generate`.

## Reglas de la campaña Spinta

- 1 punto por compra, máximo una compra con punto por cliente al día (hora de Bogotá).
- +1 punto por seguir a @spintacafe (una sola vez) y +2 por cada foto etiquetándolos.
- Con 8 puntos se entrega un café gratis; el canje descuenta los 8 puntos.
- El cliente se identifica solo con su celular; al inscribirse da nombre, cumpleaños y
  autoriza el tratamiento de datos (Ley 1581 de 2012).

Las reglas son configurables por campaña (`reglas` en `fidelidad.campanas`).

## Despliegue (pendiente de crear las cuentas)

1. **Neon**: crear el proyecto y copiar la cadena de conexión.
   ```bash
   DATABASE_URL=... npm run db:migrate
   DATABASE_URL=... SPINTA_EMAIL=... SPINTA_CLAVE=... SPINTA_DOMINIOS=spinta.<dominio> npm run db:seed
   ```
2. **Cloudflare**: registrar el dominio, crear el bucket `npx wrangler r2 bucket create comacita-archivos`
   y, en cada carpeta de `services/*`, configurar los secretos y desplegar:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put JWT_SECRET     # el mismo valor en los 4 servicios, 32+ caracteres
   npx wrangler deploy
   ```
   Activar las `routes` de cada `wrangler.toml` con el dominio real.
3. **App web**: `npm run build` y publicar `apps/web/dist` en Cloudflare Pages.
4. **Dominios de marcas**: Cloudflare for SaaS (custom hostnames) para que cada marca use su
   propio dominio; se registra también en la tabla `marcas.dominios`.

## Estado

- [x] Etapa 1: servicios, base de datos, Spinta como primera marca, tema cargado desde la API.
- [ ] Etapa 2: conectar los flujos de la app (login, stand, tarjeta del cliente) a la API.
      Hoy la app todavía usa datos de ejemplo en memoria para esos flujos.
- [ ] Etapa 3: panel de personalización (subir logo/sellos, colores) conectado a la API.
- [ ] Etapa 4: avisos (WhatsApp/SMS), métricas reales y segunda marca.
