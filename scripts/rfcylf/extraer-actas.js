// Extrae de las actas públicas de la RFCYLF los goles de cada partido (minuto y
// equipo que marca) y los agrupa por tramos de minutos para cada equipo.
//
// Uso: abrir en el navegador cualquier página de https://www.rfcylf.es/pnfg/ y
// ejecutar este código en la consola (o con la herramienta javascript del
// navegador de Claude). Devuelve un JSON con:
//   - tramos: por equipo, goles a favor/en contra en [0-15, 15-30, 30-45, 45-60, 60+)
//   - partidos: resultado de cada acta leída
//   - faltan: actas que aún no están publicadas
//
// Cambiar GRUPO / COMPETICION / TEMPORADA / JORNADAS según la liga. Los valores
// de abajo son los de 1ª División Provincial Infantiles, grupo León, 2026-27.
// Los tramos usan el minuto inicial incluido: un gol en el 15' cuenta en 15-30.
// Un gol en propia puerta cuenta para el equipo contrario.
(async () => {
  const COMPETICION = 24219028;
  const GRUPO = 24219030;
  const TEMPORADA = 22;
  const JORNADAS = 26; // se leen las que tengan actas; las demás se ignoran
  const EQUIPOS = [
    'Atlético Pinilla B', 'C. y D. Leonesa S.A.D. B', 'Puente Castro F.C. B',
    'C.D. La Virgen del Camino', 'Atlético Trobajo H', 'Veguellina C.F.',
    'C.D. Flores del Sil', 'C.D. Casa de Asturias en León', 'Olímpico de León',
    'C.D.F. Peña Elyte B', 'Soccer Ponferradina', 'León C.F.', 'C.D. La Bañeza',
    'C.D. Cuatrovientos',
  ];
  // La web de la federación bloquea (páginas en blanco) si se hacen cientos de peticiones
  // seguidas: ir despacio, como máximo ~1 por segundo (con 2 por segundo se bloqueó tras ~40).
  const pausa = () => new Promise((r) => setTimeout(r, 1100));
  const norm = (s) => s.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
  const tramo = (m) => (m < 15 ? 0 : m < 30 ? 1 : m < 45 ? 2 : m < 60 ? 3 : 4);

  const partidos = [];
  const faltan = [];
  for (let j = 1; j <= JORNADAS; j++) {
    const url = `/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=${COMPETICION}&CodGrupo=${GRUPO}&CodTemporada=${TEMPORADA}&CodJornada=${j}`;
    await pausa();
    const html = await (await fetch(url)).text();
    const ids = [...new Set([...html.matchAll(/CodActa=(\d+)/g)].map((m) => m[1]))];
    if (ids.length === 0) break; // jornada futura sin calendario
    const leidasAntes = partidos.length;
    for (const id of ids) {
      await pausa();
      const buf = await (await fetch(`/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=${id}&cod_acta=${id}`)).arrayBuffer();
      const doc = new DOMParser().parseFromString(new TextDecoder('iso-8859-1').decode(buf), 'text/html');
      doc.querySelectorAll('style,script').forEach((e) => e.remove());
      const main = doc.querySelector('main');
      if (!main) { faltan.push(`J${j}:${id}`); continue; }
      const txt = norm(main.innerText);
      const post = txt.slice(txt.indexOf('Estadio'));
      const pos = EQUIPOS.map((t) => ({ t, i: post.indexOf(t) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
      if (pos.length < 2) { faltan.push(`J${j}:${id} sin equipos`); continue; }
      const [local, visitante] = pos;
      const secLocal = post.slice(local.i, visitante.i);
      const secVis = post.slice(visitante.i);
      const goles = [...main.querySelectorAll('table.table tr')].map((tr) => {
        const a = tr.querySelector('a.img');
        const td = tr.querySelector('td.font_responsive');
        if (!a || !td || !/Gol/i.test(a.getAttribute('title') || '')) return null;
        // Minuto "(70')" o con tiempo añadido "(70'+3)": cuenta el minuto base.
        const m = norm(td.innerText).match(/^\((\d+)(?:'?\+\d+)?'?\)\s*(.+)$/);
        if (!m) return null;
        const enL = secLocal.includes(m[2]);
        const enV = secVis.includes(m[2]);
        const autor = enL && !enV ? 'L' : enV && !enL ? 'V' : '?';
        const propia = /propia/i.test(a.getAttribute('title'));
        const marca = autor === '?' ? '?' : propia ? (autor === 'L' ? 'V' : 'L') : autor;
        return { minuto: +m[1], marca, nombre: m[2] };
      }).filter(Boolean);
      partidos.push({ jornada: j, acta: id, local: local.t, visitante: visitante.t, goles });
    }
    // Si en toda la jornada no hay ninguna acta publicada, las siguientes tampoco.
    if (partidos.length === leidasAntes) break;
  }

  const tramos = Object.fromEntries(EQUIPOS.map((t) => [t, { pj: 0, f: [0, 0, 0, 0, 0], c: [0, 0, 0, 0, 0], gf: 0, gc: 0 }]));
  let dudas = 0;
  for (const p of partidos) {
    tramos[p.local].pj++;
    tramos[p.visitante].pj++;
    for (const g of p.goles) {
      if (g.marca === '?') { dudas++; continue; }
      const a = g.marca === 'L' ? p.local : p.visitante;
      const b = g.marca === 'L' ? p.visitante : p.local;
      tramos[a].f[tramo(g.minuto)]++; tramos[a].gf++;
      tramos[b].c[tramo(g.minuto)]++; tramos[b].gc++;
    }
  }
  return JSON.stringify({
    dudas,
    faltan,
    tramos,
    partidos: partidos.map((p) => ({
      j: p.jornada, acta: p.acta, local: p.local, visitante: p.visitante,
      res: `${p.goles.filter((g) => g.marca === 'L').length}-${p.goles.filter((g) => g.marca === 'V').length}`,
    })),
  });
})();
