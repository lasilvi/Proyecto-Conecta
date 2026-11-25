CREATE SCHEMA "acceso";
--> statement-breakpoint
CREATE SCHEMA "fidelidad";
--> statement-breakpoint
CREATE SCHEMA "marcas";
--> statement-breakpoint
CREATE TABLE "fidelidad"."campanas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marca_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"meta" integer NOT NULL,
	"premio" text NOT NULL,
	"inicio" date DEFAULT current_date NOT NULL,
	"fin" date,
	"activa" boolean DEFAULT true NOT NULL,
	"reglas" jsonb NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fidelidad"."clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marca_id" uuid NOT NULL,
	"telefono" text NOT NULL,
	"nombre" text NOT NULL,
	"cumpleanos" date,
	"acepta_datos_en" timestamp with time zone NOT NULL,
	"version_politica" text NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marcas"."dominios" (
	"dominio" text PRIMARY KEY NOT NULL,
	"marca_id" uuid NOT NULL,
	"principal" boolean DEFAULT false NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marcas"."marcas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"estado" text DEFAULT 'activa' NOT NULL,
	"zona_horaria" text DEFAULT 'America/Bogota' NOT NULL,
	"tema" jsonb NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marcas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fidelidad"."movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marca_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"campana_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"clave_extra" text,
	"puntos" integer NOT NULL,
	"fecha_local" date NOT NULL,
	"usuario_id" uuid,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fidelidad"."tarjetas" (
	"cliente_id" uuid NOT NULL,
	"campana_id" uuid NOT NULL,
	"puntos" integer DEFAULT 0 NOT NULL,
	"premios_canjeados" integer DEFAULT 0 NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tarjetas_cliente_id_campana_id_pk" PRIMARY KEY("cliente_id","campana_id")
);
--> statement-breakpoint
CREATE TABLE "acceso"."usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marca_id" uuid NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"rol" text NOT NULL,
	"hash_clave" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fidelidad"."campanas" ADD CONSTRAINT "campanas_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "marcas"."marcas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."clientes" ADD CONSTRAINT "clientes_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "marcas"."marcas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcas"."dominios" ADD CONSTRAINT "dominios_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "marcas"."marcas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."movimientos" ADD CONSTRAINT "movimientos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "marcas"."marcas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."movimientos" ADD CONSTRAINT "movimientos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "fidelidad"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."movimientos" ADD CONSTRAINT "movimientos_campana_id_campanas_id_fk" FOREIGN KEY ("campana_id") REFERENCES "fidelidad"."campanas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."movimientos" ADD CONSTRAINT "movimientos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "acceso"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."tarjetas" ADD CONSTRAINT "tarjetas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "fidelidad"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelidad"."tarjetas" ADD CONSTRAINT "tarjetas_campana_id_campanas_id_fk" FOREIGN KEY ("campana_id") REFERENCES "fidelidad"."campanas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceso"."usuarios" ADD CONSTRAINT "usuarios_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "marcas"."marcas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campanas_marca" ON "fidelidad"."campanas" USING btree ("marca_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_marca_telefono" ON "fidelidad"."clientes" USING btree ("marca_id","telefono");--> statement-breakpoint
CREATE INDEX "movimientos_cliente" ON "fidelidad"."movimientos" USING btree ("cliente_id","campana_id","fecha_local");--> statement-breakpoint
CREATE INDEX "movimientos_marca" ON "fidelidad"."movimientos" USING btree ("marca_id","creado");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_marca_email" ON "acceso"."usuarios" USING btree ("marca_id","email");