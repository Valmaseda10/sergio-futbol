"use client";

// Ficha de sesión con el aspecto de la plantilla de PowerPoint: banda roja
// lateral con el título vertical, barras azul claro (OBJETIVOS, ROTACIÓN...),
// tabla D/E/T, diagrama a la derecha de cada tarea y, arriba, el tablero con
// los nombres de los jugadores (en rojo, los que son baja). Se imprime en
// dos hojas (tareas 1-2 y 3-4) con window.print(), igual que el informe de
// scouting — así no hace falta ninguna licencia de PowerPoint.

import { Printer } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { clubConfig } from "@/lib/club-config";
import { temporadaDeFecha } from "@/lib/temporada";
import { grupoMaterialDeFecha } from "@/lib/grupos-material";
import {
  leerFicha,
  normalizarObjetivosTabla,
  objetivosTablaTieneContenido,
} from "@/lib/ficha-entrenamiento";
import {
  localDb,
  type LocalEntrenamiento,
  type LocalJugador,
} from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { ObjetivosTablaVista } from "@/components/entrenamientos/objetivos-tabla";

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
      className={`px-2 py-0.5 text-center text-[11px] font-bold tracking-wide uppercase print:py-0 print:text-[8px] ${className}`}
      style={{ backgroundColor: AZUL }}
    >
      {children}
    </p>
  );
}

function CeldaEtiqueta({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center px-1 py-1 text-center text-[10px] font-bold uppercase print:py-0.5 print:text-[7px]"
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
      className={`flex items-center px-2 py-1 text-xs whitespace-pre-wrap print:px-1 print:py-0.5 print:text-[8px] ${className}`}
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
        className="max-h-full text-[11px] font-semibold tracking-wide uppercase print:text-[8px]"
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
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 p-2 text-[11px] font-bold print:p-1 print:text-[7.5px]">
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
const PASO_SUPLENTE = 7;

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
  const tokens = normalizar(bajas ?? "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  const esBaja = (j: LocalJugador) => {
    if (ausentes.has(j.id)) return true;
    const nombres = [j.alias, j.nombre, j.apellidos.split(" ")[0]]
      .filter((n): n is string => !!n)
      .map(normalizar);
    return tokens.some((t) =>
      nombres.some((n) => n === t || (t.length >= 4 && n.startsWith(t))),
    );
  };

  const disponibles = jugadores.filter((j) => !esBaja(j));
  const colocados = colocar433(disponibles, jugadores.filter(esBaja));
  const porteros = disponibles.filter((j) => j.posicion === "portero").length;
  const resumen = `${disponibles.length - porteros}+${porteros}P`;
  const nombre = (j: LocalJugador) => j.alias || j.nombre;
  const chip =
    "border border-neutral-400 px-1 text-[8px] leading-tight font-bold whitespace-nowrap uppercase print:text-[6px]";

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
          className={`absolute -translate-x-1/2 -translate-y-1/2 bg-white text-neutral-900 ${chip}`}
          style={{ left: "93%", top: "7%" }}
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
  const linea = { stroke: "#ffffff", strokeWidth: 0.6, fill: "none" } as const;
  return (
    <div className="border-t border-neutral-300 print:mt-auto print:shrink-0">
      {notas && (
        <p className="border-b border-neutral-300 p-2 text-sm whitespace-pre-wrap print:p-1 print:text-[8px] print:leading-tight">
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
          <rect width="200" height="81" fill="#2f8f3a" />
          <g {...linea}>
            <rect x="2" y="2" width="196" height="77" />
            <line x1="100" y1="2" x2="100" y2="79" />
            <circle cx="100" cy="40.5" r="12" />
            <rect x="2" y="16" width="31" height="49" />
            <rect x="167" y="16" width="31" height="49" />
            <rect x="2" y="28.5" width="10.5" height="24" />
            <rect x="187.5" y="28.5" width="10.5" height="24" />
          </g>
          <g fill="#ffffff">
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
    !reglasProvocacion &&
    !observaciones;
  if (sinContenido) return null;

  return (
    <div className="flex border-t border-neutral-300 print:min-h-0 print:flex-1 print:overflow-hidden">
      <BandaRoja>{titulo || `Tarea ${numero}`}</BandaRoja>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid grid-cols-[2rem_1fr_2rem_1fr_2rem_1fr] border-b border-neutral-300 print:grid-cols-[1.4rem_1fr_1.4rem_1fr_1.4rem_1fr]">
          <CeldaEtiqueta>D</CeldaEtiqueta>
          <CeldaValor className="justify-center">{dimension}</CeldaValor>
          <CeldaEtiqueta>E</CeldaEtiqueta>
          <CeldaValor className="justify-center">{series}</CeldaValor>
          <CeldaEtiqueta>T</CeldaEtiqueta>
          <CeldaValor className="justify-center">{tiempo}</CeldaValor>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:min-h-0 print:flex-1 print:grid-cols-2">
          <div className="border-neutral-300 sm:border-r print:min-h-0 print:overflow-hidden print:border-r">
            <BarraAzul>Objetivos</BarraAzul>
            <div className="space-y-2 p-2 text-sm print:space-y-1 print:p-1 print:text-[9px]">
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
              <div className="print:min-h-0 print:flex-1" style={{ backgroundColor: "#f3f4f6" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenUrl}
                  alt={`Diagrama de la tarea ${numero}`}
                  className="aspect-[3/2] w-full object-contain print:aspect-auto print:h-full"
                />
              </div>
            ) : null}
            <BarraAzul>Rotación</BarraAzul>
            {rotacion && <Rotacion texto={rotacion} />}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <BarraAzul>Reglas de provocación</BarraAzul>
            <div className="min-h-6 p-2 text-sm print:p-1 print:text-[9px]">
              <TextoRico texto={reglasProvocacion} />
            </div>
          </div>
          <div>
            <BarraAzul>Observaciones</BarraAzul>
            <div className="min-h-6 p-2 text-sm print:p-1 print:text-[9px]">
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
  jugadores,
}: {
  entrenamiento: LocalEntrenamiento;
  tareaImagenSignedUrls?: (string | null)[];
  tablaImagenSignedUrl?: string | null;
  jugadores?: LocalJugador[];
}) {
  const ficha = leerFicha(entrenamiento.ficha);
  const ausentes = useAusentes(entrenamiento.id);
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
      reglasProvocacion: k("_reglas_provocacion"),
      observaciones: k("_observaciones"),
      campos: k("_rol_campos"),
      paco: k("_rol_paco"),
    };
  });
  const hayRoles = tareas.some((t) => t.campos || t.paco);

  const tabla = ficha.tabla_objetivos
    ? normalizarObjetivosTabla(ficha.tabla_objetivos)
    : null;
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
          Ficha de la sesión, lista para descargar en PDF.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Descargar PDF
        </Button>
      </div>

      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>
      <div
        className="space-y-3 text-neutral-900 print:space-y-0"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div className="flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white print:h-[283mm] print:break-after-page print:rounded-none print:border-none">
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
                <div className="min-h-10 p-2 text-sm whitespace-pre-wrap print:min-h-0 print:p-1 print:text-[8px] print:leading-tight">
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
                <div className="flex-1 p-2 text-sm whitespace-pre-wrap print:p-1 print:text-[8px] print:leading-tight">
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
                      className="py-0.5 text-center text-[10px] font-bold uppercase print:py-0 print:text-[7px]"
                      style={{ backgroundColor: AZUL }}
                    >
                      Tarea {t.numero}
                    </p>
                    <div className="p-1.5 text-xs print:p-0.5 print:text-[7.5px] print:leading-tight">
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

        <div className="flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white print:h-[283mm] print:rounded-none print:border-none">
          {tareas.slice(2).map((t) => (
            <BloqueTarea key={t.numero} {...t} />
          ))}
          <CampoLibre notas={e.notas} />
        </div>
      </div>
    </div>
  );
}
