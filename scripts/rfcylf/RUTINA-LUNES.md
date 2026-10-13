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
   falta, actualizar su ficha (plantilla y jugadores destacados en `rivales_plantilla` y
   `rivales_jugadores_destacados`) y el informe en `informes/` (modelo: `informes/scouting-leon-cf-jornada-5.html`).
6. **Resumen** para el entrenador: qué se ha actualizado, qué actas faltaban y qué jugadores
   destacan (goleadores, tarjetas, cambios).

## Reglas

- Solo datos públicos de actas y tablas: nombres, dorsales, goles, tarjetas y cambios. Nada más
  sobre los menores.
- No guardar nada si Supabase pide iniciar sesión: avisar al usuario.
- Los informes con nombres de jugadores se quedan en `informes/` y no se suben a git.
