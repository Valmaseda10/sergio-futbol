"use client";

// Ficha de sesión con el aspecto de la plantilla de PowerPoint: banda roja
// lateral con el título vertical, barras azul claro (OBJETIVOS, ROTACIÓN...),
// tabla D/E/T, diagrama a la derecha de cada tarea y, arriba, el tablero con
// los nombres de los jugadores (en rojo, los que son baja). Se imprime en
// dos hojas (tareas 1-2 y 3-4) con window.print(), igual que el informe de
// scouting — así no hace falta ninguna licencia de PowerPoint.

import { useRef, useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { generarPdfFicha } from "@/lib/ficha-pdf";
import { useLiveQuery } from "dexie-react-hooks";
import { clubConfig } from "@/lib/club-config";
import { temporadaDeFecha } from "@/lib/temporada";
import { grupoMaterialDeFecha } from "@/lib/grupos-material";
import {
  leerFicha,
  normalizarObjetivosTabla,
  objetivosTablaTieneContenido,
  type EquipoRotacion,
  type ObjetivosTabla,
} from "@/lib/ficha-entrenamiento";
import {
  localDb,
  type LocalEntrenamiento,
  type LocalJugador,
} from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { ObjetivosTablaVista } from "@/components/entrenamientos/objetivos-tabla";
import {
  equiposConContenido,
  RotacionEquiposVista,
} from "@/components/entrenamientos/rotacion-equipos";

const ROJO = "#c00000";
const AZUL = "#d9e1f2";
const COLORES_ROTACION = ["#dc2626", "#2563eb", "#16a34a", "#111111"];

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Texto con **negrita** (la plantilla resalta con negrita el ítem clave).
function TextoRico({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <>
      {texto.split("\n").map((linea, i) => (
        <p key={i} className="leading-snug">
          {linea.split(/(\*\*[^*]+\*\*)/g).map((trozo, j) =>
            trozo.startsWith("**") && trozo.endsWith("**") ? (
              <strong key={j}>{trozo.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{trozo}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

function BarraAzul({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`px-2 py-0.5 text-center text-[11px] font-bold tracking-wide uppercase print:py-0 print:text-[11px] ${className}`}
      style={{ backgroundColor: AZUL }}
    >
      {children}
    </p>
  );
}

function CeldaEtiqueta({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center px-1 py-1 text-center text-[10px] font-bold uppercase print:py-0.5 print:text-[10px]"
      style={{ backgroundColor: AZUL }}
    >
      {children}
    </div>
  );
}

function CeldaValor({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center px-2 py-1 text-xs whitespace-pre-wrap print:px-1 print:py-0.5 print:text-[11px] ${className}`}
    >
      {children}
    </div>
  );
}

// Banda roja lateral con texto vertical (título de la sesión / de cada tarea).
function BandaRoja({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-7 shrink-0 items-center justify-center overflow-hidden py-2 text-white print:w-5"
      style={{ backgroundColor: ROJO }}
    >
      <p
        className="max-h-full text-[11px] font-semibold tracking-wide uppercase print:text-[11px]"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {children}
      </p>
    </div>
  );
}

function Rotacion({ texto }: { texto: string }) {
  const segmentos = texto
    .split("\n")
    .flatMap((linea) => linea.split(" — "))
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 p-2 text-[11px] font-bold print:p-1 print:text-[10.5px]">
      {segmentos.map((s, i) => (
        <p
          key={i}
          className="leading-snug"
          style={{ color: COLORES_ROTACION[i % COLORES_ROTACION.length] }}
        >
          {s}
        </p>
      ))}
    </div>
  );
}

// Jugadores que según "Pasar lista" no asisten a la sesión (cualquier estado
// distinto de "SI"); sin lista pasada no hay ausentes.
function useAusentes(entrenamientoId: string): Set<string> {
  const asistencias = useLiveQuery(
    () =>
      localDb.asistencias_entrenamiento
        .where("entrenamiento_id")
        .equals(entrenamientoId)
        .toArray(),
    [entrenamientoId],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);
  const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
  return new Set(
    asistencias
      .filter((a) => {
        const nombre = a.estado_id ? nombrePorEstado.get(a.estado_id) : undefined;
        return nombre !== undefined && nombre !== "SI";
      })
      .map((a) => a.jugador_id),
  );
}

// Sistema 1-4-3-3 (el ataque va hacia arriba). Cada hueco lista, por orden de
// preferencia, las posiciones de la ficha de plantilla que mejor lo cubren.
const HUECOS_433: { x: number; y: number; prefs: string[] }[] = [
  { x: 50, y: 86, prefs: ["portero"] },
  { x: 12, y: 72, prefs: ["lateral izquierdo", "lateral derecho", "central"] },
  { x: 36, y: 72, prefs: ["central", "mediocentro defensivo", "lateral izquierdo", "lateral derecho"] },
  { x: 64, y: 72, prefs: ["central", "mediocentro defensivo", "lateral derecho", "lateral izquierdo"] },
  { x: 88, y: 72, prefs: ["lateral derecho", "lateral izquierdo", "central"] },
  { x: 50, y: 56, prefs: ["mediocentro defensivo", "mediocentro", "central", "mediapunta"] },
  { x: 28, y: 40, prefs: ["mediocentro", "mediapunta", "mediocentro defensivo", "extremo izquierdo", "extremo derecho"] },
  { x: 72, y: 40, prefs: ["mediocentro", "mediapunta", "mediocentro defensivo", "extremo derecho", "extremo izquierdo"] },
  { x: 14, y: 20, prefs: ["extremo izquierdo", "extremo derecho", "delantero centro", "mediapunta"] },
  { x: 50, y: 12, prefs: ["delantero centro", "extremo izquierdo", "extremo derecho", "mediapunta"] },
  { x: 86, y: 20, prefs: ["extremo derecho", "extremo izquierdo", "delantero centro", "mediapunta"] },
];

// Lo bien que encaja un jugador en un hueco (menor = mejor). El portero solo
// encaja de portero y nadie más juega de portero.
function costeHueco(j: LocalJugador, prefs: string[]): number {
  const esPortero = j.posicion === "portero";
  const huecoPortero = prefs[0] === "portero";
  if (esPortero !== huecoPortero) return 100;
  const i = j.posicion ? prefs.indexOf(j.posicion) : -1;
  return i >= 0 ? i : 10;
}

// Separación vertical (en % del campo) entre jugadores que comparten hueco.
const PASO_SUPLENTE = 8.5;

// Reparte a los disponibles en los 11 huecos, primero las mejores parejas;
// los que sobran se ponen debajo del titular del hueco donde mejor encajan.
function colocar433(disponibles: LocalJugador[], ausentes: LocalJugador[]) {
  const parejas = HUECOS_433.flatMap((h, hi) =>
    disponibles.map((j, ji) => ({ hi, ji, coste: costeHueco(j, h.prefs) })),
  ).sort((a, b) => a.coste - b.coste || a.hi - b.hi || a.ji - b.ji);
  const huecoUsado = new Set<number>();
  const jugadorUsado = new Set<number>();
  const colocados: { jugador: LocalJugador; x: number; y: number; rojo: boolean }[] = [];
  const apilados = new Map<number, number>();
  for (const { hi, ji, coste } of parejas) {
    if (coste >= 100 || huecoUsado.has(hi) || jugadorUsado.has(ji)) continue;
    huecoUsado.add(hi);
    jugadorUsado.add(ji);
    apilados.set(hi, 0);
    colocados.push({ jugador: disponibles[ji], x: HUECOS_433[hi].x, y: HUECOS_433[hi].y, rojo: false });
  }
  // Los que sobran y los no disponibles (en rojo) se colocan después, en su
  // posición: en un hueco libre si lo hay, o debajo de quien lo ocupa.
  const pendientes = [
    ...disponibles.filter((_, ji) => !jugadorUsado.has(ji)).map((jugador) => ({ jugador, rojo: false })),
    ...ausentes.map((jugador) => ({ jugador, rojo: true })),
  ];
  for (const { jugador, rojo } of pendientes) {
    const mejor = HUECOS_433.map((h, hi) => ({
      hi,
      coste: costeHueco(jugador, h.prefs),
      ocupantes: apilados.has(hi) ? (apilados.get(hi) as number) : -1,
    }))
      .filter((c) => c.coste < 100)
      .sort((a, b) => a.coste - b.coste || a.ocupantes - b.ocupantes || a.hi - b.hi)[0];
    if (!mejor) continue;
    const n = mejor.ocupantes + 1;
    apilados.set(mejor.hi, n);
    colocados.push({
      jugador,
      x: HUECOS_433[mejor.hi].x,
      y: HUECOS_433[mejor.hi].y + n * PASO_SUPLENTE,
      rojo,
    });
  }
  return colocados;
}

// Campo con los disponibles colocados en un 1-4-3-3 según su posición de la
// plantilla; si comparten posición, el segundo va debajo del primero. Los que
// no están disponibles (según "Pasar lista" o el campo "Bajas") salen también
// en su posición, pero en rojo.
function TableroJugadores({
  jugadores,
  ausentes,
  bajas,
}: {
  jugadores: LocalJugador[];
  ausentes: Set<string>;
  bajas: string | null;
}) {
  // "Bajas" es texto libre: cada entrada (separada por / , - o salto de línea)
  // es un nombre, y si lleva más palabras (p. ej. "Diego Sanchez") tienen que
  // encajar también con el jugador, para no marcar a otro Diego de la plantilla.
  const entradas = (bajas ?? "")
    .split(/[/,;\n-]+/)
    .map((e) => normalizar(e).split(/[^a-z0-9]+/).filter(Boolean))
    .filter((palabras) => palabras.length > 0 && palabras[0].length >= 3);
  const esBaja = (j: LocalJugador) => {
    if (ausentes.has(j.id)) return true;
    const nombres = [j.alias, j.nombre, j.apellidos.split(" ")[0]]
      .filter((n): n is string => !!n)
      .map(normalizar);
    const completo = normalizar(`${j.nombre} ${j.alias ?? ""} ${j.apellidos}`).split(
      /[^a-z0-9]+/,
    );
    return entradas.some(([primera, ...resto]) => {
      const coincide = nombres.some(
        (n) => n === primera || (primera.length >= 4 && n.startsWith(primera)),
      );
      return (
        coincide &&
        resto
          .filter((r) => r.length >= 3)
          .every((r) => completo.some((c) => c.startsWith(r)))
      );
    });
  };

  const disponibles = jugadores.filter((j) => !esBaja(j));
  const colocados = colocar433(disponibles, jugadores.filter(esBaja));
  const porteros = disponibles.filter((j) => j.posicion === "portero").length;
  const resumen = `${disponibles.length - porteros}+${porteros}P`;
  const nombre = (j: LocalJugador) => j.alias || j.nombre;
  const chip =
    "border border-neutral-400 px-1 text-[8px] leading-tight font-bold whitespace-nowrap uppercase print:text-[10px]";

  return (
    <div>
      <div
        className="relative aspect-[16/8] w-full overflow-hidden"
        style={{ backgroundColor: "#2f8f3a" }}
      >
        <div className="absolute inset-x-[6%] top-[4%] bottom-[4%] border border-white/60" />
        <div className="absolute inset-x-[30%] bottom-[4%] h-[26%] border border-white/60" />
        <div className="absolute top-[4%] left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 border-2 border-neutral-900 bg-white px-3 py-1 text-xl leading-tight font-black whitespace-nowrap text-neutral-900 print:border-2 print:px-2 print:py-0.5 print:text-[15px]"
          style={{ left: "91%", top: "8%" }}
          title="Jugadores + porteros disponibles"
        >
          {resumen}
        </span>
        {colocados.map(({ jugador, x, y, rojo }) => (
          <span
            key={jugador.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${chip} ${rojo ? "text-white" : "bg-white text-neutral-900"}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              ...(rojo ? { backgroundColor: "#c00000" } : {}),
            }}
          >
            {nombre(jugador)}
          </span>
        ))}
      </div>
    </div>
  );
}

// Campo en blanco al pie de la hoja 2, a todo el ancho, para dibujar a mano
// la alineación del fin de semana o apuntar lo que haga falta (sin título);
// las notas de la sesión, si las hay, van encima. Las proporciones del dibujo
// coinciden con las de la caja impresa (≈198 x 80 mm), así el círculo sale
// redondo.
function CampoLibre({ notas }: { notas: string | null }) {
  const linea = { stroke: "#374151", strokeWidth: 0.6, fill: "none" } as const;
  return (
    <div className="border-t border-neutral-300 print:mt-auto print:shrink-0">
      {notas && (
        <p className="border-b border-neutral-300 p-2 text-sm whitespace-pre-wrap print:p-1 print:text-[11px] print:leading-tight">
          {notas}
        </p>
      )}
      <div className="aspect-[200/81] w-full print:aspect-auto print:h-[80mm]">
        <svg
          viewBox="0 0 200 81"
          preserveAspectRatio="none"
          className="size-full"
          role="img"
          aria-label="Campo de fútbol en blanco"
        >
          <rect width="200" height="81" fill="#ffffff" />
          <g {...linea}>
            <rect x="2" y="2" width="196" height="77" />
            <line x1="100" y1="2" x2="100" y2="79" />
            <circle cx="100" cy="40.5" r="12" />
            <rect x="2" y="16" width="31" height="49" />
            <rect x="167" y="16" width="31" height="49" />
            <rect x="2" y="28.5" width="10.5" height="24" />
            <rect x="187.5" y="28.5" width="10.5" height="24" />
          </g>
          <g fill="#374151">
            <circle cx="100" cy="40.5" r="0.9" />
            <circle cx="23" cy="40.5" r="0.9" />
            <circle cx="177" cy="40.5" r="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function BloqueTarea({
  numero,
  titulo,
  imagenUrl,
  dimension,
  series,
  tiempo,
  objetivosDef,
  objetivosOfe,
  rotacion,
  equipos,
  jugadores,
  ausentes,
  reglasProvocacion,
  observaciones,
}: {
  numero: number;
  titulo: string | null;
  imagenUrl: string | null;
  dimension: string | null;
  series: string | null;
  tiempo: string | null;
  objetivosDef: string | null;
  objetivosOfe: string | null;
  rotacion: string | null;
  equipos: EquipoRotacion[];
  jugadores: LocalJugador[];
  ausentes: Set<string>;
  reglasProvocacion: string | null;
  observaciones: string | null;
}) {
  const sinContenido =
    !titulo &&
    !imagenUrl &&
    !dimension &&
    !series &&
    !tiempo &&
    !objetivosDef &&
    !objetivosOfe &&
    !rotacion &&
    equipos.length === 0 &&
    !reglasProvocacion &&
    !observaciones;
  if (sinContenido) return null;

  return (
    <div className="flex border-t border-neutral-300 print:shrink-0 print:grow">
      <BandaRoja>{`Tarea ${numero}`}</BandaRoja>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col border-b border-neutral-300 sm:flex-row">
          <h3
            className="flex min-w-0 items-center px-2 py-1.5 text-base leading-tight font-extrabold tracking-wide text-white sm:flex-[1.15] print:px-1.5 print:py-1 print:text-[14px]"
            style={{ backgroundColor: ROJO }}
          >
            {titulo || `Tarea ${numero}`}
          </h3>
          <div className="grid flex-1 grid-cols-[2rem_1fr_2rem_1fr_2rem_1fr] print:grid-cols-[1.5rem_1fr_1.5rem_1fr_1.5rem_1fr]">
            <CeldaEtiqueta>D</CeldaEtiqueta>
            <CeldaValor className="justify-center">{dimension}</CeldaValor>
            <CeldaEtiqueta>E</CeldaEtiqueta>
            <CeldaValor className="justify-center">{series}</CeldaValor>
            <CeldaEtiqueta>T</CeldaEtiqueta>
            <CeldaValor className="justify-center">{tiempo}</CeldaValor>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:flex-1 print:grid-cols-2">
          <div className="border-neutral-300 sm:border-r print:border-r">
            <BarraAzul>Objetivos</BarraAzul>
            <div className="space-y-2 p-2 text-sm print:space-y-1 print:p-1 print:text-[12px]">
              {objetivosDef && (
                <div>
                  <p className="text-center font-bold underline underline-offset-2">
                    ITEMS FASE DEF
                  </p>
                  <TextoRico texto={objetivosDef} />
                </div>
              )}
              {objetivosOfe && (
                <div>
                  <p className="text-center font-bold underline underline-offset-2">
                    ITEMS FASE OFE
                  </p>
                  <TextoRico texto={objetivosOfe} />
                </div>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-col">
            {imagenUrl ? (
              <div className="relative bg-neutral-100 print:min-h-[32mm] print:flex-1 print:bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenUrl}
                  alt={`Diagrama de la tarea ${numero}`}
                  className="aspect-[3/2] w-full object-contain print:absolute print:inset-0 print:aspect-auto print:size-full"
                />
              </div>
            ) : null}
            <BarraAzul>Rotación</BarraAzul>
            {equipos.length > 0 ? (
              <RotacionEquiposVista
                equipos={equipos}
                jugadores={jugadores}
                ausentes={ausentes}
              />
            ) : (
              rotacion && <Rotacion texto={rotacion} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <BarraAzul>Reglas de provocación</BarraAzul>
            <div className="min-h-6 p-2 text-sm print:p-1 print:text-[12px]">
              <TextoRico texto={reglasProvocacion} />
            </div>
          </div>
          <div>
            <BarraAzul>Observaciones</BarraAzul>
            <div className="min-h-6 p-2 text-sm print:p-1 print:text-[12px]">
              <TextoRico texto={observaciones} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EntrenamientoFichaImprimible({
  entrenamiento,
  tareaImagenSignedUrls,
  tablaImagenSignedUrl,
  tablaHeredada,
  tablaHeredadaDe,
  jugadores,
}: {
  entrenamiento: LocalEntrenamiento;
  tareaImagenSignedUrls?: (string | null)[];
  tablaImagenSignedUrl?: string | null;
  /** Tabla de la sesión anterior de la semana, si esta no tiene la suya. */
  tablaHeredada?: ObjetivosTabla | null;
  /** Fecha de la sesión de la que se hereda (solo para avisarlo en pantalla). */
  tablaHeredadaDe?: string | null;
  jugadores?: LocalJugador[];
}) {
  const ficha = leerFicha(entrenamiento.ficha);
  const ausentes = useAusentes(entrenamiento.id);
  const hojasRef = useRef<HTMLDivElement>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  // El PDF generado se guarda: en iPad/iPhone compartir solo funciona justo
  // tras tocar el botón, y generar tarda unos segundos.
  const pdfRef = useRef<File | null>(null);
  const puedeCompartir =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "a.pdf", { type: "application/pdf" })] });

  async function obtenerPdf(): Promise<File | null> {
    if (pdfRef.current) return pdfRef.current;
    const hojas = Array.from(
      hojasRef.current?.querySelectorAll<HTMLElement>("[data-hoja-pdf]") ?? [],
    );
    if (hojas.length === 0) return null;
    setGenerandoPdf(true);
    try {
      const nombre = `Sesión ${ficha.numero_sesion || entrenamiento.fecha}.pdf`;
      pdfRef.current = await generarPdfFicha(hojas, nombre);
      return pdfRef.current;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se ha podido generar el PDF",
      );
      return null;
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function descargarPdf() {
    pdfRef.current = null; // por si se ha editado la sesión desde la última vez
    const archivo = await obtenerPdf();
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = archivo.name;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function compartirPdf() {
    const archivo = await obtenerPdf();
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo], title: archivo.name });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      // Safari exige que compartir salga directamente de un toque; si el PDF
      // ha tardado en generarse hay que volver a tocar (ya está listo).
      toast.message("PDF listo: pulsa Compartir otra vez");
    }
  }
  const e = entrenamiento;

  const tareas = [1, 2, 3, 4].map((n) => {
    const k = (campo: string) =>
      (e as unknown as Record<string, string | null>)[`tarea_${n}${campo}`] ?? null;
    return {
      numero: n,
      titulo: k(""),
      imagenUrl: tareaImagenSignedUrls?.[n - 1] ?? null,
      dimension: k("_dimension"),
      series: k("_series"),
      tiempo: k("_tiempo"),
      objetivosDef: k("_objetivos_def"),
      objetivosOfe: k("_objetivos_ofe"),
      rotacion: k("_rotacion"),
      equipos: equiposConContenido(ficha.rotaciones?.[n - 1]),
      jugadores: jugadores ?? [],
      ausentes,
      reglasProvocacion: k("_reglas_provocacion"),
      observaciones: k("_observaciones"),
      campos: k("_rol_campos"),
      paco: k("_rol_paco"),
    };
  });
  const hayRoles = tareas.some((t) => t.campos || t.paco);

  const tablaPropia = ficha.tabla_objetivos
    ? normalizarObjetivosTabla(ficha.tabla_objetivos)
    : null;
  const tabla =
    tablaPropia && objetivosTablaTieneContenido(tablaPropia)
      ? tablaPropia
      : (tablaHeredada ?? null);
  const grupoMaterialHoy = grupoMaterialDeFecha(e.fecha);
  const materialTexto = [
    grupoMaterialHoy ? `Recoge y lleva: ${grupoMaterialHoy.join(", ")}` : null,
    e.material,
  ]
    .filter(Boolean)
    .join("\n");
  const temporada = temporadaDeFecha(e.fecha).replace("-", "/");

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs text-muted-foreground">
          Ficha de la sesión: descárgala en PDF, compártela o imprímela.
          {tablaHeredadaDe &&
            ` La tabla de objetivos es la del ${formatearFechaCorta(tablaHeredadaDe)} (misma semana).`}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generandoPdf}
            onClick={descargarPdf}
          >
            <Download className="size-4" />
            {generandoPdf ? "Generando…" : "Descargar PDF"}
          </Button>
          {puedeCompartir && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generandoPdf}
              onClick={compartirPdf}
            >
              <Share2 className="size-4" />
              Compartir
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>
      <div
        ref={hojasRef}
        className="space-y-3 text-neutral-900 print:space-y-0"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div data-hoja-pdf className="flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white print:h-[283mm] print:break-after-page print:rounded-none print:border-none">
          <div className="flex">
            <BandaRoja>
              Sesión de entrenamiento · {clubConfig.nombreEquipo} - {temporada}
            </BandaRoja>
            <div className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-2 print:grid-cols-2">
              <div className="border-neutral-300 sm:border-r print:border-r">
                <div className="grid grid-cols-[5.5rem_1fr_5.5rem_1fr] border-b border-neutral-300 print:grid-cols-[4rem_1fr_4rem_1fr]">
                  <CeldaEtiqueta>Fecha sesión</CeldaEtiqueta>
                  <CeldaValor>{formatearFechaCorta(e.fecha)}</CeldaValor>
                  <CeldaEtiqueta>Nº sesión</CeldaEtiqueta>
                  <CeldaValor>{ficha.numero_sesion}</CeldaValor>
                  <CeldaEtiqueta>Rival</CeldaEtiqueta>
                  <CeldaValor>{e.rival_torneo}</CeldaValor>
                  <CeldaEtiqueta>Microciclo</CeldaEtiqueta>
                  <CeldaValor>{e.microciclo}</CeldaValor>
                  <CeldaEtiqueta>Bajas</CeldaEtiqueta>
                  <CeldaValor className="col-span-3">{e.bajas}</CeldaValor>
                  <CeldaEtiqueta>Obj. semanal</CeldaEtiqueta>
                  <CeldaValor className="col-span-3">{e.objetivos}</CeldaValor>
                </div>
                <BarraAzul>Charla</BarraAzul>
                <div className="min-h-10 p-2 text-sm whitespace-pre-wrap print:min-h-0 print:p-1 print:text-[11px] print:leading-tight">
                  {e.charla}
                </div>
                {tablaImagenSignedUrl ? (
                  <div className="p-1 print:p-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tablaImagenSignedUrl}
                      alt="Tabla de objetivos"
                      className="w-full"
                    />
                  </div>
                ) : (
                  tabla &&
                  objetivosTablaTieneContenido(tabla) && (
                    <div className="p-1 print:p-0.5">
                      <ObjetivosTablaVista tabla={tabla} />
                    </div>
                  )
                )}
              </div>
              <div className="flex flex-col">
                {jugadores && jugadores.length > 0 ? (
                  <TableroJugadores
                    jugadores={jugadores}
                    ausentes={ausentes}
                    bajas={e.bajas}
                  />
                ) : (
                  <div className="aspect-[16/8] w-full" style={{ backgroundColor: "#2f8f3a" }} />
                )}
                <BarraAzul>Material</BarraAzul>
                <div className="flex-1 p-2 text-sm whitespace-pre-wrap print:p-1 print:text-[11px] print:leading-tight">
                  {materialTexto}
                </div>
              </div>
            </div>
          </div>

          {hayRoles && (
            <div className="border-t border-neutral-300">
              <BarraAzul>Roles</BarraAzul>
              <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4">
                {tareas.map((t) => (
                  <div key={t.numero} className="border-r border-neutral-200 last:border-r-0">
                    <p
                      className="py-0.5 text-center text-[10px] font-bold uppercase print:py-0 print:text-[10px]"
                      style={{ backgroundColor: AZUL }}
                    >
                      Tarea {t.numero}
                    </p>
                    <div className="p-1.5 text-xs print:p-0.5 print:text-[10.5px] print:leading-tight">
                      <p>Campos: {t.campos}</p>
                      <p>Paco: {t.paco}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tareas.slice(0, 2).map((t) => (
            <BloqueTarea key={t.numero} {...t} />
          ))}
        </div>

        <div data-hoja-pdf className="flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white print:h-[283mm] print:rounded-none print:border-none">
          {tareas.slice(2).map((t) => (
            <BloqueTarea key={t.numero} {...t} />
          ))}
          <CampoLibre notas={e.notas} />
        </div>
      </div>
    </div>
  );
}
