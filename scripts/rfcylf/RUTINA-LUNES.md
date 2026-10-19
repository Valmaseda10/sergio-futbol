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
3. **Actualizar los tramos de los 13 rivales** en Supabase (proyecto `xpwwhtekqduvtspieoag`), tabla
   `rivales_goles_intervalo` (`rival_id, intervalo, goles_favor, goles_contra`; intervalos
   `0-15, 15-30, 30-45, 45-60, 60+`). Se hace con un `insert ... on conflict (rival_id, intervalo)
   do update` desde el editor SQL, uniendo por nombre de rival con
   `replace(r.nombre, '"', '') = v.n`. No incluir a C. y D. Leonesa "B" (nuestros goles por
   minuto salen de los eventos de la app). En el editor SQL, para textos largos usar
   `window.monaco.editor.getModels()[0].setValue(sql)` en vez de escribir tecla a tecla.
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
