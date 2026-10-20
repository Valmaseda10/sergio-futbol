// Extrae de las actas de la RFCYLF los goles (con jugador y minuto) y las tarjetas de cada partido,
// para rellenar la tabla `liga_eventos` (goleadores y tarjetas de Rivales → Goleadores).
//
// Uso: abrir cualquier página de https://www.rfcylf.es/pnfg/ y ejecutar este código con la herramienta
// javascript del navegador. Se leen SOLO las actas indicadas en ACTAS (hasta ~10 por pasada: la web
// bloquea la IP con ráfagas largas, ver RUTINA-LUNES.md). Para saber qué actas hay, usar las de
// `liga_partidos.acta` que aún no estén en `liga_eventos.acta`.
//
// Devuelve, por cada trozo de 19 líneas (la salida se trunca a ~1000 caracteres), líneas con el formato
//   jornada|últimos 2 dígitos del acta|índice del equipo|jugador|tipo|minuto
// que se pegan tal cual en una consulta con `regexp_split_to_table` (ver RUTINA-LUNES.md, paso 3c).
//   tipo: gol, gol_penalti, gol_propia (equipo = el del jugador que la marca), amarilla, roja.
// La segunda amarilla de un jugador en el mismo acta se convierte luego en `doble_amarilla` con SQL.
(async () => {
  const ACTAS = [
    // [jornada, codActa]
    // [1, '26150963'],
  ];
  const EQUIPOS = [
    'Atlético Pinilla B', 'C. y D. Leonesa S.A.D. B', 'Puente Castro F.C. B',
    'C.D. La Virgen del Camino', 'Atlético Trobajo H', 'Veguellina C.F.',
    'C.D. Flores del Sil', 'C.D. Casa de Asturias en León', 'Olímpico de León',
    'C.D.F. Peña Elyte B', 'Soccer Ponferradina', 'León C.F.', 'C.D. La Bañeza',
    'C.D. Cuatrovientos',
  ];
  const pausa = () => new Promise((r) => setTimeout(r, 1400));
  const norm = (s) => s.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
  const lineas = [];
  const faltan = [];
  for (const [j, id] of ACTAS) {
    await pausa();
    const buf = await (await fetch(`/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=${id}&cod_acta=${id}`)).arrayBuffer();
    if (buf.byteLength === 0) { faltan.push(id); break; } // bloqueo: parar y esperar horas
    const doc = new DOMParser().parseFromString(new TextDecoder('iso-8859-1').decode(buf), 'text/html');
    doc.querySelectorAll('style,script').forEach((e) => e.remove());
    const main = doc.querySelector('main');
    if (!main) { faltan.push(id); continue; }
    const txt = norm(main.innerText);
    const post = txt.slice(txt.indexOf('Estadio'));
    const pos = EQUIPOS.map((t, i) => ({ t, i, p: post.indexOf(t) })).filter((x) => x.p >= 0).sort((a, b) => a.p - b.p);
    if (pos.length < 2) { faltan.push(id); continue; }
    const [local, visitante] = pos;
    const secLocal = post.slice(local.p, visitante.p);
    const secVis = post.slice(visitante.p);
    for (const tr of main.querySelectorAll('table.table tr')) {
      const td = tr.querySelector('td.font_responsive:last-child');
      if (!td) continue;
      const a = tr.querySelector('a.img');
      const img = tr.querySelector('img[src*="tarj"]');
      let tipo = null;
      if (a && /Gol/i.test(a.getAttribute('title') || '')) {
        const t = a.getAttribute('title');
        tipo = /propia/i.test(t) ? 'gol_propia' : /penalt/i.test(t) ? 'gol_penalti' : 'gol';
      } else if (img) {
        const s = img.getAttribute('src');
        tipo = /roja/i.test(s) ? 'roja' : /doble/i.test(s) ? 'doble_amarilla' : 'amarilla';
      }
      if (!tipo) continue;
      const m = norm(td.innerText).match(/^\((\d+)(?:'?\+\d+)?'?\)\s*(.+)$/);
      if (!m) continue;
      const enL = secLocal.includes(m[2]);
      const enV = secVis.includes(m[2]);
      if (enL === enV) { faltan.push(`${id}:${m[2]}?`); continue; } // nombre en las dos plantillas o en ninguna
      const eq = enL ? local : visitante;
      lineas.push([j, id.slice(-2), eq.i, m[2], tipo, m[1]].join('|'));
    }
  }
  window.__lineas = lineas;
  return JSON.stringify({ n: lineas.length, faltan, EQUIPOS_idx: 'índice = posición en EQUIPOS' });
})();
// Después, sacar las líneas por trozos: window.__lineas.slice(0, 19).join('\n'), slice(19, 38)...
