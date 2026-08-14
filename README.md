# Infantil B — Cultural y Deportiva Leonesa

App de gestión para el cuerpo técnico del Infantil B (temporada 2026-2027): asistencia a entrenamientos, convocatorias y alineaciones de partidos, valoraciones y estadísticas. Sustituye al Excel actual. Uso principal desde iPhone/iPad — diseño mobile-first.

Ver [`CLAUDE.md`](./CLAUDE.md) para el contexto completo de producto, modelo de datos y fases de desarrollo.

**Estado actual: Fase 1 — Scaffold.** Autenticación, flujo de solicitud/aprobación de acceso, esquema de base de datos con RLS, y navegación base con las 5 secciones vacías. La lógica de cada módulo se irá añadiendo en fases sucesivas.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- Despliegue en Vercel

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. En **Project Settings → API**, copia la `Project URL`, la `anon public key` y la `service_role key`.
3. Copia `.env.example` a `.env.local` y rellena esas tres variables, más `NEXT_PUBLIC_SITE_URL=http://localhost:3000`:

   ```bash
   cp .env.example .env.local
   ```

### 3. Aplicar las migraciones SQL

Los archivos están en `supabase/migrations/`, en orden:

1. `0001_schema.sql` — todas las tablas.
2. `0002_rls.sql` — Row Level Security (activado en todas las tablas) y sus políticas.
3. `0003_seed_estados.sql` — estados iniciales (SI, IA, VACACIONES, LESIÓN, AMISTOSO).

Puedes aplicarlas pegando el contenido de cada archivo, en orden, en el **SQL Editor** del dashboard de Supabase; o con la [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

### 4. Crear el primer usuario admin

El registro no es abierto: el primer usuario `admin` hay que crearlo a mano una vez, para poder aprobar el resto de solicitudes desde la app.

1. En el dashboard de Supabase, ve a **Authentication → Users → Add user** e invita tu propio email (o créalo con contraseña).
2. En **Table Editor → usuarios**, inserta una fila con `id` = el UUID de ese usuario (columna `id` en Authentication → Users), tu `nombre`, tu `email` y `rol = 'admin'`.
3. Ya puedes iniciar sesión en `/login` con ese usuario y aprobar el resto de solicitudes desde **Ajustes**.

### 5. Configurar las Redirect URLs de Supabase Auth

En **Authentication → URL Configuration**, añade a *Redirect URLs*:

- `http://localhost:3000/auth/set-password` (desarrollo)
- `https://<tu-dominio-de-vercel>/auth/set-password` (producción, una vez desplegado)

Esto es necesario para que los enlaces de invitación y de "olvidé mi contraseña" funcionen. El
`redirectTo` de esos dos flujos apunta directamente a `/auth/set-password` (página cliente): el
token de sesión llega en el fragmento de la URL (`#access_token=...`), que solo el navegador
puede leer, así que no puede pasar por un Route Handler de servidor intermedio — el cliente de
Supabase lo detecta y procesa automáticamente al cargar la página.

### 6. Regenerar los tipos TypeScript (opcional pero recomendado)

`src/lib/types/database.types.ts` está escrito a mano, reflejando el esquema de las migraciones. En cuanto el proyecto esté enlazado, regenéralo desde el esquema real:

```bash
npx supabase gen types typescript --project-id <tu-project-ref> --schema public > src/lib/types/database.types.ts
```

### 7. Arrancar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Despliegue en Vercel

1. Sube el repositorio a GitHub (u otro proveedor soportado) y conéctalo en [vercel.com/new](https://vercel.com/new).
2. En **Settings → Environment Variables** del proyecto en Vercel, añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marca la variable como *sensitive*: solo se usa server-side, en los Route Handlers de aprobación de solicitudes)
   - `NEXT_PUBLIC_SITE_URL` — la URL de producción, p. ej. `https://infantil-b.vercel.app`
3. Despliega. Después del primer despliegue, añade la URL de producción `/auth/set-password` a las Redirect URLs de Supabase Auth (paso 5 de arriba).

## Comandos

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción
npm run start   # servir el build de producción
npm run lint    # ESLint
```

## Notas de seguridad

- RLS está activo en todas las tablas de Supabase; solo usuarios con fila en `usuarios` (`rol = 'admin' | 'staff'` y `activo = true`) pueden leer/escribir datos del equipo.
- `SUPABASE_SERVICE_ROLE_KEY` nunca se expone al cliente: solo se usa en `src/lib/supabase/admin.ts`, importado exclusivamente desde Route Handlers server-side (el flujo de aprobación de solicitudes, que necesita invitar usuarios por email).
- Las fotos de jugadores (fases posteriores) deben subirse a un bucket **privado** de Supabase Storage.
