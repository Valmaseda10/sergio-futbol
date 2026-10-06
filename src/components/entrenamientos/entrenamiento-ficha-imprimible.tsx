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
import { demarcacionDePosicion, type Demarcacion } from "@/lib/posiciones";
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

// Altura (en % del campo, el ataque va hacia arriba) de cada posición de la
// ficha de plantilla; las que comparten altura forman una fila.
const Y_POSICION: Record<string, number> = {
  "delantero centro": 14,
  "extremo izquierdo": 30,
  "extremo derecho": 30,
  mediapunta: 44,
  mediocentro: 58,
  "mediocentro defensivo": 68,
  "lateral izquierdo": 80,
  "lateral derecho": 80,
  central: 80,
  portero: 92,
};
const Y_DEMARCACION: Record<Demarcacion, number> = {
  delantero: 14,
  extremo: 30,
  mediocentro: 58,
  defensa: 80,
  portero: 92,
};

function yDeJugador(j: LocalJugador): number {
  if (j.posicion && Y_POSICION[j.posicion] !== undefined) return Y_POSICION[j.posicion];
  return Y_DEMARCACION[demarcacionDePosicion(j.posicion) ?? "mediocentro"];
}

// De izquierda a derecha dentro de la fila: izquierdos, centrales, derechos.
function ladoDeJugador(j: LocalJugador): number {
  if (j.posicion?.includes("izquierdo")) return 0;
  if (j.posicion?.includes("derecho")) return 2;
  return 1;
}

// Campo con los nombres de la plantilla colocados por demarcación. Los que
// aparecen en el campo "Bajas" salen en rojo, como en la plantilla.
function TableroJugadores({
  jugadores,
  ausentes,
  bajas,
  convocados,
}: {
  jugadores: LocalJugador[];
  ausentes: Set<string>;
  bajas: string | null;
  convocados: string | null;
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

  const alturas = [...new Set(jugadores.map(yDeJugador))].sort((a, b) => a - b);
  const porFila = alturas.map((y) => ({
    y,
    lista: jugadores
      .filter((j) => yDeJugador(j) === y)
      .sort((a, b) => ladoDeJugador(a) - ladoDeJugador(b)),
  }));

  return (
    <div
      className="relative aspect-[16/8] w-full overflow-hidden"
      style={{ backgroundColor: "#2f8f3a" }}
    >
      <div className="absolute inset-x-[6%] top-[4%] bottom-[4%] border border-white/60" />
      <div className="absolute inset-x-[30%] bottom-[4%] h-[26%] border border-white/60" />
      <div className="absolute top-[4%] left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
      {convocados && (
        <p className="absolute top-1 right-2 rounded bg-white px-1.5 text-xs font-bold text-black print:text-[9px]">
          {convocados}
        </p>
      )}
      {porFila.map(({ y, lista }) =>
        lista.map((j, i) => (
          <span
            key={j.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 border border-neutral-400 px-1 text-[8px] leading-tight font-bold whitespace-nowrap uppercase print:text-[6px]"
            style={{
              left: `${((i + 1) / (lista.length + 1)) * 88 + 6}%`,
              top: `${y}%`,
              backgroundColor: esBaja(j) ? "#c00000" : "#ffffff",
              color: esBaja(j) ? "#ffffff" : "#111111",
            }}
          >
            {j.alias || j.nombre}
          </span>
        )),
      )}
    </div>
  );
}

// Campo en blanco al pie de la hoja 2 para dibujar a mano la alineación del
// fin de semana o apuntar lo que haga falta; a la derecha, las notas de la
// sesión si las hay.
function CampoLibre({ notas }: { notas: string | null }) {
  const linea = { stroke: "#ffffff", strokeWidth: 0.35, fill: "none" } as const;
  return (
    <div className="border-t border-neutral-300 print:shrink-0">
      <BarraAzul>Alineación del fin de semana / Notas</BarraAzul>
      <div className="flex print:h-[72mm]">
        <div className="aspect-[105/68] w-[62%] print:aspect-[105/68] print:h-full print:w-auto print:shrink-0">
          <svg
            viewBox="0 0 105 68"
            preserveAspectRatio="none"
            className="size-full"
            role="img"
            aria-label="Campo de fútbol en blanco"
          >
            <rect width="105" height="68" fill="#2f8f3a" />
            <g {...linea}>
              <rect x="1" y="1" width="103" height="66" />
              <line x1="52.5" y1="1" x2="52.5" y2="67" />
              <circle cx="52.5" cy="34" r="9.15" />
              <rect x="1" y="13.85" width="16.5" height="40.3" />
              <rect x="87.5" y="13.85" width="16.5" height="40.3" />
              <rect x="1" y="24.85" width="5.5" height="18.3" />
              <rect x="98.5" y="24.85" width="5.5" height="18.3" />
            </g>
            <g fill="#ffffff">
              <circle cx="52.5" cy="34" r="0.5" />
              <circle cx="12" cy="34" r="0.5" />
              <circle cx="93" cy="34" r="0.5" />
            </g>
          </svg>
        </div>
        <p className="min-w-0 flex-1 border-l border-neutral-300 p-2 text-sm whitespace-pre-wrap print:p-1 print:text-[8px] print:leading-tight">
          {notas}
        </p>
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
                    convocados={ficha.convocados ?? null}
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
