# Rutina de los lunes: revisar las actas de la liga

Liga: 1ª División Provincial Infantiles, grupo León, temporada 2026-27 (RFCYLF).
Equipo propio: C. y D. Leonesa S.A.D. "B" (la app es del Infantil B).

## Qué hay que hacer

1. **Leer las actas.** Abrir `https://www.rfcylf.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=24219028&CodGrupo=24219030&CodTemporada=22&CodJornada=1`
   en el navegador y ejecutar `scripts/rfcylf/extraer-actas.js` en la página (herramienta de
   JavaScript del navegador). Devuelve los goles de cada partido por tramos de minutos y qué
   actas faltan. Si aparecen `dudas` > 0, revisar a mano ese gol.
2. **Clasificación de control.** En `NFG_VisClasificacion?cod_primaria=1000120&codjornada=<n>&codcompeticion=24219028&codgrupo=24219030`
   pulsar "Tabla Detallada" (`VerDetalle()`) para ver GF/GC oficiales por equipo y comprobar que
   los goles sumados salen parecidos (las actas que no están publicadas explican las diferencias).
3. **(Atajo desde la J6)** Con `liga_eventos` al día, los tramos se pueden **recalcular en SQL** sin releer la liga: goles de
   `liga_eventos` (tipos `gol`, `gol_penalti`, `gol_propia`; la propia cuenta para el rival) unidos a `liga_partidos` por `acta`,
   en tramos `<15, <30, <45, <60, 60+`, y `insert ... on conflict (rival_id, intervalo) do update` en `rivales_goles_intervalo`.
   Con las jornadas 1-5 salió idéntico a lo que había (0 diferencias). Totales por equipo = GF/GC de la clasificación oficial.
3. **Actualizar los tramos de los 13 rivales** en Supabase (proyecto `xpwwhtekqduvtspieoag`), tabla
   `rivales_goles_intervalo` (`rival_id, intervalo, goles_favor, goles_contra`; intervalos
   `0-15, 15-30, 30-45, 45-60, 60+`). Se hace con un `insert ... on conflict (rival_id, intervalo)
   do update` desde el editor SQL, uniendo por nombre de rival con
   `replace(r.nombre, '"', '') = v.n`. No incluir a C. y D. Leonesa "B" (nuestros goles por
   minuto salen de los eventos de la app). En el editor SQL, para textos largos usar
   `window.monaco.editor.getModels()[0].setValue(sql)` en vez de escribir tecla a tecla.
3b. **Resultados y calendario de toda la liga** (alimentan Rivales → Clasificación). Un partido se identifica
   por `jornada + local + visitante` (`unique`); sin goles = partido por jugar. Con los `partidos` que
   devuelve el script (`acta, j, fecha, local, visitante, gl, gv`) hacer `insert into public.liga_partidos
   (jornada, fecha, local, visitante, goles_local, goles_visitante, acta) values ... on conflict (jornada,
   local, visitante) do update set goles_local = excluded.goles_local, goles_visitante =
   excluded.goles_visitante, fecha = excluded.fecha, acta = excluded.acta`. Los nombres van como en el script
   (sin comillas: `Atlético Pinilla B`). El calendario de las jornadas futuras se lee de
   `NFG_CmpJornada` (jornadas posteriores a la última con acta): cada fila trae local, fecha, hora y
   visitante, pero **sin acta**; se guardan sin goles (`goles_* = null`, `hora`). Ojo: leer la página con
   `arrayBuffer()` + `TextDecoder('iso-8859-1')` (con `.text()` los acentos salen rotos).
3c. **Goles y tarjetas (goleadores y sancionados).** Alimentan Rivales → Goleadores y las diapositivas
   «Clasificación» y «Forma del rival». Mirar qué actas de `liga_partidos.acta` no están aún en
   `liga_eventos.acta` y leerlas con `extraer-eventos.js` (rellenar `ACTAS`; **máximo ~10 por pasada** y con
   la pausa del script: es lo que más pronto hace que la federación bloquee la IP; si devuelve 0 bytes,
   parar y reintentar horas después). Saca líneas `jornada|fin del acta|índice equipo|jugador|tipo|minuto`
   (índice = posición en `EQUIPOS` del script), por trozos de 19 líneas porque la salida se trunca. Se
   insertan en `public.liga_eventos (jornada, acta, equipo, jugador, tipo, minuto)` pegando las líneas en
   `regexp_split_to_table($$...$$, E'\n')` + `string_to_array(l, '|')` y un `values` índice→nombre del
   equipo (acta = `'261509' || fin`), con `on conflict do nothing`. Después, la segunda amarilla de un
   jugador en el mismo acta pasa a `doble_amarilla` (expulsión):
   `update liga_eventos e set tipo='doble_amarilla' where tipo='amarilla' and exists (select 1 from
   liga_eventos o where o.acta=e.acta and o.jugador=e.jugador and o.tipo='amarilla' and o.minuto<e.minuto)`.
   Para no teclear las líneas a mano: en la pestaña de rfcylf, `location.href = 'https://supabase.com/robots.txt#' +
   encodeURIComponent(lineas.join('\n'))`; ya en ese dominio (estática, sin SPA) `localStorage.setItem('ev_pendiente',
   decodeURIComponent(location.hash.slice(1)))`, y desde la pestaña del editor SQL (mismo origen supabase.com)
   `localStorage.getItem('ev_pendiente')` y armar la consulta con `setValue`. Luego volver a navegar la pestaña a rfcylf.
   Minuto `999` = el acta no da minuto → guardar `null`.
   El editor SQL de Supabase avisa de «tabla sin RLS» por el `with`: es falso positivo (la tabla ya tiene
   RLS), elegir «Run without RLS». Hecho hasta ahora: jornadas 1 a 6 (actas 26150963–26151004).
   **Ojo con el prefijo del acta**: las líneas llevan solo los 2 últimos dígitos y el SQL pone `'261509' || fin`, que
   solo vale hasta el 26150999. Desde el 26151000 el prefijo es `'261510'` (el 26-10-2026 las de la J6 00-04 se
   guardaron mal y hubo que corregirlas). Mejor comprobar siempre después que no hay eventos huérfanos:
   `select count(*) from liga_eventos e where not exists (select 1 from liga_partidos p where p.acta = e.acta)` = 0.
4. **Resultados propios.** Comprobar en `partidos` que los partidos de liga ya jugados tienen
   `fecha` y `resultado_favor/contra` iguales a los de la federación (en la jornada 4 la fecha del
   Veguellina estaba un día mal). Corregir solo diferencias claras.
5. **Próximo rival.** Mirar en `partidos` el siguiente partido de liga, leer sus actas y, si hace
   falta, actualizar su ficha y el informe en `informes/` (modelo: `informes/scouting-leon-cf-jornada-5.html`).
   La ficha se rellena igual que la del Atlético Pinilla "B":
   - `rivales_plantilla`: la plantilla de `https://www.rfcylf.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=<codequipo>`
     (el `codequipo` sale de los enlaces de la clasificación). Un jugador por fila con nombre
     en formato **"Apellidos, Nombre"** (con tildes), dorsal de las actas y `rol` jugador;
     además el técnico (`entrenador`) y el delegado (`delegado`). `curso` y la temporada anterior
     no salen de la web pública: dejarlos vacíos salvo que los dé el entrenador.
   - `curso` (1 = 1º año de infantil, 2 = 2º año) y temporada anterior: se deducen de las actas de 2025-26
     (`CodTemporada=21`). Equipos del club en `NFG_VerClub?codigo_club=<n>` (enlace desde la ficha del equipo);
     el grupo de cada equipo en 2025-26 sale de `NFG_VisCompeticiones_Equipo?codequipo=<cod>&codtemporada=22`
     (segundo enlace `codcompeticion`/`codgrupo`). Quien jugó en el Infantil del club (A o B) la temporada
     pasada es de 2º año; quien jugó en Alevín, de 1º. Se leen los titulares y suplentes de las actas del
     club en cada grupo (con jornadas alternas basta para quien juega a menudo; 1 petición cada 2,5 s en un
     bucle en segundo plano, sin bloqueo) y se cruzan por palabras del nombre sin tildes. Sin encontrar =
     dejar vacío. Cuidado: hay nombres solo con nombre de pila («Iker», «Hugo») que no se pueden asignar.
     Hecho: Virgen del Camino (octubre 2026).
   - `rivales_jugadores_destacados`: los jugadores `top` (goleadores, los que deciden) con
     `plantilla_id` enlazado y una nota corta en mayúsculas con goles, titularidad y tarjetas.
   - Equipación en `rivales_scouting` (`color_camiseta`, `color_pantalon`, `color_medias`) a partir
     de "Equipación (Color)" de esa misma página.
6. **Cabecera de las sesiones de la semana.** Para los entrenamientos de esa semana (lunes a
   domingo) en `entrenamientos`: poner `rival_torneo` con el rival del partido del fin de semana
   (tabla `partidos`, en mayúsculas y sin prefijos: `Veguellina C.F.` -> `VEGUELLINA`,
   `C.D.F. Peña Elyte "B"` -> `PEÑA ELYTE B`, `León C.F.` -> `LEÓN`) si está vacío, y comprobar que
   `ficha->>'numero_sesion'` sigue el orden (`24-MARTES`, `25-JUEVES`, `26-VIERNES`...: el número de
   la sesión anterior + 1 y el día de la semana en mayúsculas). La app ya lo rellena sola al crear
   la sesión; esto solo corrige las que se crearon antes o quedaron vacías.
7. **Resumen** para el entrenador: qué se ha actualizado, qué actas faltaban y qué jugadores
   destacan (goleadores, tarjetas, cambios).

## Reglas

- **Ir despacio con la web de la federación**: unas 500 peticiones seguidas hicieron que
  rfcylf.es devolviera páginas en blanco (bloqueo temporal por exceso). Máximo ~2 peticiones por
  segundo y no escanear ligas enteras de golpe; si las páginas salen en blanco, parar y reintentar
  horas después en vez de insistir.
- **Páginas vacías no siempre son "acta sin publicar"**: el 19-10-2026, tras leer jornadas 1-5 y
  24 actas (~40 peticiones a 2 por segundo), `NFG_VisEquipos`, `NFG_VisClasificacion` y varias actas
  empezaron a devolver 0 bytes. Hacer **primero** lo que necesita la plantilla del próximo rival
  (`NFG_VisEquipos`) y después el barrido de actas, o espaciar más (1 petición/seg) y dejar las
  plantillas para otra tanda. Con `fetch` una página bloqueada devuelve cuerpo vacío (status 200).
- Solo datos públicos de actas y tablas: nombres, dorsales, goles, tarjetas y cambios. Nada más
  sobre los menores.
- No guardar nada si Supabase pide iniciar sesión: avisar al usuario.
- Los informes con nombres de jugadores se quedan en `informes/` y no se suben a git.
