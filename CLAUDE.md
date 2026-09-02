# CLAUDE.md

Este archivo da contexto a Claude Code en cada sesión de trabajo sobre este proyecto. Léelo entero antes de escribir código.

## Descripción del proyecto

App de gestión para el **Infantil B de la Cultural y Deportiva Leonesa** (1ª Provincial), uso del entrenador principal y el segundo entrenador. Cubre toda la temporada 2026-2027, desde la pretemporada de agosto hasta el 30 de junio.

Sustituye un sistema actual en Excel: una tabla jugador × día con códigos de estado (asistencia a entrenamientos, amistosos, vacaciones, lesiones) y otra tabla de participación en partidos amistosos. El objetivo es tener lo mismo pero interactivo, rápido de rellenar desde el móvil/tablet en el campo, y con estadísticas visuales.

Uso principal: iPad y iPhone. **Diseño mobile-first siempre.**

## Stack técnico

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui para componentes
- **Backend/DB:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Vercel (plan gratuito)
- **Gráficas:** Recharts para el dashboard de estadísticas
- **PWA:** manifest.json + service worker — instalable en pantalla de inicio de iOS, sin pasar por la App Store
- **Offline (Fase 2, no en el primer scaffold):** cola de escrituras en IndexedDB (Dexie.js) que se sincroniza contra Supabase al recuperar conexión. Resolución de conflictos: last-write-wins (suficiente para 2 usuarios). No implementar hasta que el CRUD online esté probado y estable.

## Idioma y convenciones

- Interfaz de usuario y textos: **español**
- Nombres de tablas y columnas en Supabase: **español, snake_case** (coherente con el dominio: `jugadores`, `entrenamientos`, `pierna_dominante`, etc.)
- Código (variables, funciones, componentes): inglés, siguiendo convenciones estándar de TypeScript/React
- Commits: mensajes cortos y descriptivos en español

## Seguridad y privacidad (importante — datos de menores)

- Los jugadores son menores de edad. **Row Level Security (RLS) activado en TODAS las tablas de Supabase**, sin excepción.
- Nada de datos accesible sin autenticación. Cero páginas públicas con datos de jugadores.
- Solo usuarios con rol `admin` o `staff` en la tabla `usuarios` pueden leer/escribir datos del equipo.
- El registro **no es abierto**: existe una página de "solicitar acceso" que crea una fila en `solicitudes_acceso`; solo un `admin` puede aprobarla, y esa aprobación es la que crea el usuario real en Supabase Auth (vía invitación por email).
- Fotos de jugadores en Supabase Storage, bucket **privado** (no público).

## Modelo de datos (resumen — usar como base para las migraciones SQL)

**estados** — lista de estados personalizable desde Ajustes (sustituye a los códigos fijos del Excel: IA, VACACIONES, LESIÓN, AMISTOSO, SI...)
`id, nombre, color (hex), tipo ('entrenamiento' | 'general'), activo`

**jugadores**
`id, nombre, apellidos, dorsal, posicion, pierna_dominante ('izquierda'|'derecha'|'ambidiestro', editable), fecha_nacimiento, foto_url, contacto_nombre, contacto_telefono, contacto_email, notas_medicas, fecha_alta, activo`

**entrenamientos**
`id, fecha, hora_inicio, hora_fin, lugar, objetivos, ejercicios, notas`

**asistencias_entrenamiento**
`id, entrenamiento_id (FK), jugador_id (FK), estado_id (FK), notas`

**partidos**
`id, fecha, hora, competicion ('liga'|'amistoso'|'copa'), rival, local_visitante, lugar, resultado_favor, resultado_contra, notas`

**convocatorias**
`id, partido_id (FK), jugador_id (FK), convocado (bool), motivo_no_convocado`

**alineaciones**
`id, partido_id (FK), jugador_id (FK), titular (bool), posicion_jugada, minuto_entra, minuto_sale`

**eventos_partido**
`id, partido_id (FK), jugador_id (FK), tipo ('gol'|'asistencia'|'tarjeta_amarilla'|'tarjeta_roja'), minuto`

**valoraciones_partido**
`id, partido_id (FK), valoracion_general (texto), rating_equipo (1-10, opcional)`

**valoraciones_jugador** — evaluaciones periódicas
`id, jugador_id (FK), fecha, tecnica (1-10), fisico (1-10), tactica (1-10), actitud (1-10), notas`

**lesiones**
`id, jugador_id (FK), fecha_inicio, tipo, fecha_prevista_alta, fecha_alta_real, notas`

**usuarios** — vinculada a Supabase Auth (id = auth uid)
`id, nombre, email, rol ('admin'|'staff'), activo`

**solicitudes_acceso**
`id, nombre, email, mensaje, fecha_solicitud, estado ('pendiente'|'aprobado'|'rechazado')`

Las estadísticas (% asistencia, goles/tarjetas/minutos acumulados por jugador y temporada) se calculan con vistas SQL o consultas agregadas sobre estas tablas — no se guardan como campos redundantes.

## Estructura de navegación (secciones principales)

- **Plantilla** — listado y ficha de cada jugador
- **Entrenamientos** — calendario, planificación de sesión, asistencia
- **Partidos** — calendario, convocatoria, alineación, eventos, valoración
- **Estadísticas** — dashboard con gráficas por jugador y equipo
- **Ajustes** — gestión de estados personalizables, gestión de usuarios/solicitudes de acceso (solo admin)

## Fases de desarrollo

1. **Fase 1 — Scaffold:** proyecto Next.js + Supabase configurado, esquema completo con RLS, autenticación + flujo de solicitud/aprobación de acceso, navegación base con las 5 secciones vacías, despliegue funcionando en Vercel.
2. **Fase 2 — Módulo Plantilla:** CRUD completo de jugadores.
3. **Fase 3 — Módulo Entrenamientos:** calendario, planificación de sesión, registro de asistencia con estados personalizables.
4. **Fase 4 — Módulo Partidos:** calendario, convocatoria, alineación, eventos, valoración.
5. **Fase 5 — Estadísticas:** dashboard con gráficas.
6. **Fase 6 — Ajustes:** gestión de estados y usuarios.
7. **Fase 7 — PWA + Offline:** manifest, service worker, cola de sincronización.

No adelantar fases: cada una se construye y se prueba sobre la anterior.

## Qué evitar

- No usar `localStorage`/`sessionStorage` como fuente de verdad — Supabase es la fuente única de datos.
- No hardcodear el año de temporada en el modelo de datos (usar fechas reales) para poder reutilizar la app en temporadas futuras.
- No crear páginas o endpoints que expongan datos de jugadores sin autenticación.
- No implementar el sync offline (Fase 7) antes de tiempo — complica el resto del desarrollo si se mete pronto.
- No volver a hardcodear el nombre del club/equipo, iniciales del escudo, colores o el lugar de entrenamiento por defecto en ningún componente nuevo — usar `src/lib/club-config.ts` (ver más abajo).

## Reutilización para otro club

La app está pensada para desplegarse una vez por club (cada uno con su propio proyecto de Vercel + Supabase), no como SaaS multi-club con una sola base de datos. Lo que identifica al club/equipo (nombre, iniciales del escudo, colores, lugar de entrenamiento por defecto) vive en `src/lib/club-config.ts`, con variables de entorno `NEXT_PUBLIC_*` documentadas ahí y en el README ("Desplegar para otro club"). Al escribir texto o colores nuevos en la interfaz, usar `clubConfig` en vez de escribir el nombre del club/equipo a mano.

## Flujo de trabajo en equipo (dos personas, dos repos)

Jorge y Sergio trabajan a la vez, cada uno con su propia sesión de Claude Code, sobre el mismo remoto en GitHub (`Valmaseda10/sergio-futbol`, privado). Sin disciplina de sincronización, cada sesión solo ve su propio trabajo local:

- **Al empezar a trabajar**: `git pull` antes de tocar nada, para partir del estado más reciente.
- **Al terminar un cambio con sentido propio** (una tarea, un fix, una migración completa — no cada línea suelta): commit descriptivo en español y `git push` a `master` inmediatamente. No dejar trabajo sin subir al terminar la sesión.
- Esta instrucción autoriza el push rutinario a `master` en este repo sin pedir confirmación cada vez. La autorización **no** cubre `git push --force` ni tocar otras ramas o remotos — eso sigue necesitando confirmación explícita.
- Si `git push` falla porque origin tiene commits nuevos: `git pull --rebase origin master` (nunca `--force`) y reintentar. Conflictos triviales (imports, formato) se resuelven y se sigue; si el conflicto afecta a lógica real, parar y preguntar al usuario en vez de decidir solo qué versión se queda.
- Trabajo directo sobre `master`, sin ramas — con dos personas y disciplina de pull/push no compensa la fricción de Pull Requests. Si un día vais a tocar el mismo módulo el mismo día, avisaros fuera de Claude Code antes de empezar.

## Comandos del proyecto

_(Se rellenará en cuanto exista el scaffold: `npm run dev`, `npm run build`, migraciones de Supabase, etc.)_
