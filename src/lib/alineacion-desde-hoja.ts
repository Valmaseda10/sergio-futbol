// Alineación a partir de la hoja de partido: cada casilla de nuestro equipo se
// resuelve a un jugador por su dorsal (lo normal: se escribe el número) o, si
// no hay número, por su nombre; y los titulares se colocan sobre el campo en
// la formación que mejor encaja con la posición de cada uno.

import { FORMACIONES, type Formacion, type HuecoFormacion } from "@/lib/formaciones";
import { DEMARCACION_ORDEN, demarcacionDePosicion } from "@/lib/posiciones";

export interface JugadorHoja {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
  posicion: string | null;
}

export type CeldaResuelta =
  | { tipo: "vacia" }
  | { tipo: "jugador"; id: string }
  /** Un nombre que no es de la plantilla (invitado, jugador de prueba). */
  | { tipo: "libre"; nombre: string }
  /** Un número que no corresponde a ningún dorsal, o un texto ambiguo. */
  | { tipo: "sin_resolver"; texto: string };

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function nombresDe(j: JugadorHoja): string[] {
  const nombre = normalizar(j.nombre);
  const apellidos = normalizar(j.apellidos);
  const primerApellido = apellidos.split(" ")[0] ?? "";
  return [
    j.alias ? normalizar(j.alias) : "",
    nombre,
    apellidos,
    primerApellido,
    `${nombre} ${apellidos}`,
    `${apellidos} ${nombre}`,
    `${nombre} ${primerApellido}`,
  ].filter((n) => n.length > 0);
}

/** Resuelve el texto de una casilla de la hoja: dorsal primero, nombre si no hay número. */
export function resolverCelda(texto: string, jugadores: JugadorHoja[]): CeldaResuelta {
  const t = texto.trim();
  if (!t) return { tipo: "vacia" };

  const numero = t.match(/\d{1,2}/);
  if (numero) {
    const dorsal = Number(numero[0]);
    const porDorsal = jugadores.filter((j) => j.dorsal === dorsal);
    if (porDorsal.length === 1) return { tipo: "jugador", id: porDorsal[0].id };
  }

  const nombre = normalizar(t.replace(/\d+/g, " "));
  if (!nombre) return { tipo: "sin_resolver", texto: t };

  const exactos = jugadores.filter((j) => nombresDe(j).includes(nombre));
  if (exactos.length === 1) return { tipo: "jugador", id: exactos[0].id };
  if (exactos.length === 0 && nombre.length >= 3) {
    const parecidos = jugadores.filter((j) =>
      nombresDe(j).some((n) => n.length >= 3 && (nombre.includes(n) || n.includes(nombre))),
    );
    if (parecidos.length === 1) return { tipo: "jugador", id: parecidos[0].id };
  }

  // Con número que no existe, o varios candidatos: se avisa. Sin número es un nombre libre.
  return numero || exactos.length > 1
    ? { tipo: "sin_resolver", texto: t }
    : { tipo: "libre", nombre: t };
}

/** Cuánto encaja una posición de la ficha del jugador en un hueco de la formación (0-3). */
function afinidad(posicion: string | null, hueco: string): number {
  if (!posicion) return 0;
  const l = hueco.toLowerCase();
  switch (posicion) {
    case "portero":
      return l === "portero" ? 3 : 0;
    case "central":
      return l === "central" ? 3 : 0;
    case "lateral derecho":
      return l === "lateral derecho" || l === "carrilero derecho" ? 3 : 0;
    case "lateral izquierdo":
      return l === "lateral izquierdo" || l === "carrilero izquierdo" ? 3 : 0;
    case "mediocentro defensivo":
    case "mediocentro":
      return l === "mediocentro" || l === "centrocampista" ? 3 : l.startsWith("interior") ? 1 : 0;
    case "mediapunta":
      return l === "mediapunta" ? 3 : l.startsWith("interior") || l.startsWith("mediapunta") ? 2 : l === "centrocampista" ? 1 : 0;
    case "extremo derecho":
      return l === "extremo derecho" ? 3 : l === "interior derecho" || l === "mediapunta derecho" ? 2 : 0;
    case "extremo izquierdo":
      return l === "extremo izquierdo" ? 3 : l === "interior izquierdo" || l === "mediapunta izquierdo" ? 2 : 0;
    case "delantero centro":
      return l === "delantero centro" || l === "delantero" ? 3 : 0;
    default:
      return 0;
  }
}

export interface TitularAColocar {
  /** Identificador propio (id del jugador o de la entrada libre). */
  clave: string;
  /** Posición de la ficha del jugador (null para un jugador libre). */
  posicion: string | null;
}

export interface TitularColocado {
  clave: string;
  hueco: HuecoFormacion;
}

function colocarEn(formacion: Formacion, titulares: TitularAColocar[]) {
  const libres = [...titulares];
  const colocados: TitularColocado[] = [];
  let puntos = 0;
  const huecosSinCubrir: HuecoFormacion[] = [];

  // Primero, quien encaja por su posición.
  for (const hueco of formacion.huecos) {
    let mejor = -1;
    let mejorPuntos = 0;
    libres.forEach((t, i) => {
      const p = afinidad(t.posicion, hueco.label);
      if (p > mejorPuntos) {
        mejorPuntos = p;
        mejor = i;
      }
    });
    if (mejor >= 0) {
      colocados.push({ clave: libres[mejor].clave, hueco });
      libres.splice(mejor, 1);
      puntos += mejorPuntos;
    } else {
      huecosSinCubrir.push(hueco);
    }
  }

  // El resto, de atrás hacia delante según su demarcación.
  const rango = (t: TitularAColocar) => {
    const d = demarcacionDePosicion(t.posicion);
    return d ? DEMARCACION_ORDEN.indexOf(d) : Math.floor(DEMARCACION_ORDEN.length / 2);
  };
  libres.sort((a, b) => rango(a) - rango(b));
  huecosSinCubrir.sort((a, b) => b.top - a.top);
  libres.forEach((t, i) => {
    const hueco = huecosSinCubrir[i];
    if (hueco) colocados.push({ clave: t.clave, hueco });
  });

  return { colocados, puntos };
}

/** Elige la formación que mejor encaja y coloca a cada titular en su hueco. */
export function colocarTitulares(titulares: TitularAColocar[]): {
  formacion: Formacion;
  colocados: TitularColocado[];
} {
  let mejor = { formacion: FORMACIONES[0], ...colocarEn(FORMACIONES[0], titulares) };
  for (const f of FORMACIONES.slice(1)) {
    const r = colocarEn(f, titulares);
    if (r.puntos > mejor.puntos) mejor = { formacion: f, ...r };
  }
  return { formacion: mejor.formacion, colocados: mejor.colocados };
}
