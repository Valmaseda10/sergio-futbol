"use client";

// Hoja de partido (la del Word): cabecera del partido, las dos alineaciones
// con sus suplentes y observaciones, los cambios, el análisis del rival y las
// observaciones finales. La propia hoja es el formulario: se escribe sobre
// ella y se guarda sola; al imprimir o descargar solo queda el texto.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { AccionesPdf } from "@/components/plan-partido/acciones-pdf";
import { guardarHojaLocal } from "@/app/(app)/plan-partido/local-actions";
import type { LocalHojaPartido } from "@/lib/db/local-db";
import {
  FILAS_CAMBIOS,
  leerHoja,
  NUM_TITULARES,
  ponerNuestroEquipoEn,
  type LadoHoja,
  type AlineacionHoja,
  type AnalisisHoja,
  type CabeceraHoja,
  type HojaPartidoDatos,
} from "@/lib/plan-partido";

const BORDE = "border-neutral-900";

// Textarea que crece con lo que se escribe, para que al imprimir no se corte.
function AreaAuto({
  valor,
  onCambio,
  className = "",
  etiqueta,
}: {
  valor: string;
  onCambio: (v: string) => void;
  className?: string;
  etiqueta: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);
  return (
    <textarea
      ref={ref}
      value={valor}
      rows={1}
      aria-label={etiqueta}
      onChange={(e) => onCambio(e.target.value)}
      className={`block w-full resize-none overflow-hidden bg-transparent px-1.5 py-1 leading-snug outline-none focus:bg-yellow-50 print:focus:bg-transparent ${className}`}
    />
  );
}

function Celda({
  valor,
  onCambio,
  etiqueta,
  className = "",
}: {
  valor: string;
  onCambio: (v: string) => void;
  etiqueta: string;
  className?: string;
}) {
  return (
    <input
      value={valor}
      aria-label={etiqueta}
      onChange={(e) => onCambio(e.target.value)}
      className={`h-full w-full min-w-0 bg-transparent px-1.5 outline-none focus:bg-yellow-50 print:focus:bg-transparent ${className}`}
    />
  );
}

function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-6 items-center justify-center border-b px-1 text-center text-[12px] font-bold uppercase ${BORDE} ${className}`}
    >
      {children}
    </div>
  );
}

// ---- Alineación (una de las dos listas) ------------------------------------

function ColumnaAlineacion({
  datos,
  inicio,
  onCambio,
}: {
  datos: AlineacionHoja;
  /** Primer número de la lista de suplentes de esta columna (12). */
  inicio: number;
  onCambio: (a: AlineacionHoja) => void;
}) {
  const fila = (lista: "titulares" | "suplentes", i: number, numero: number) => (
    <div
      key={`${lista}${i}`}
      className={`grid h-6 grid-cols-[1.6rem_1fr] border-b ${BORDE}`}
    >
      <span className={`flex items-center justify-center border-r text-[11px] ${BORDE}`}>
        {numero}
      </span>
      <Celda
        valor={datos[lista][i]}
        etiqueta={`${lista === "titulares" ? "Titular" : "Suplente"} ${numero}`}
        className="text-[12px] font-semibold uppercase"
        onCambio={(v) =>
          onCambio({
            ...datos,
            [lista]: datos[lista].map((x, k) => (k === i ? v : x)),
          })
        }
      />
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col">
      <div className={`h-6 border-b ${BORDE}`}>
        <Celda
          valor={datos.titulo}
          etiqueta="Nombre del equipo"
          className="text-center text-[11px] font-bold uppercase"
          onCambio={(v) => onCambio({ ...datos, titulo: v })}
        />
      </div>
      {datos.titulares.map((_, i) => fila("titulares", i, i + 1))}
      <Titulo>Suplentes</Titulo>
      {datos.suplentes.map((_, i) => fila("suplentes", i, inicio + i))}
      <Titulo>Observaciones</Titulo>
      <AreaAuto
        valor={datos.observaciones}
        etiqueta="Observaciones de la alineación"
        className="min-h-[7.6rem] flex-1 text-[12px]"
        onCambio={(v) => onCambio({ ...datos, observaciones: v })}
      />
    </div>
  );
}

// ---- Campo decorativo del centro --------------------------------------------

function CampoCentral() {
  const l = { stroke: "#ffffff", strokeWidth: 0.6, fill: "none" } as const;
  return (
    <div className="relative min-h-0 flex-1 bg-white p-1.5">
      <svg
        viewBox="0 0 68 105"
        preserveAspectRatio="none"
        className="size-full"
        role="img"
        aria-label="Campo"
      >
        <rect width="68" height="105" fill="#4fcf50" />
        <g {...l}>
          <rect x="2" y="2" width="64" height="101" />
          <line x1="2" y1="52.5" x2="66" y2="52.5" />
          <circle cx="34" cy="52.5" r="9.15" />
          <rect x="13.5" y="2" width="41" height="16.5" />
          <rect x="24.5" y="2" width="19" height="5.5" />
          <rect x="13.5" y="86.5" width="41" height="16.5" />
          <rect x="24.5" y="97.5" width="19" height="5.5" />
        </g>
        <g fill="#ffffff">
          <circle cx="34" cy="52.5" r="0.6" />
          <circle cx="34" cy="12" r="0.6" />
          <circle cx="34" cy="93" r="0.6" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/escudo-cultural.png" alt="" className="h-[45%] w-auto" />
      </div>
    </div>
  );
}

// ---- Hoja completa -----------------------------------------------------------

const CAMPOS_CABECERA: { clave: keyof CabeceraHoja; etiqueta: string; ancho: string }[] = [
  { clave: "dia", etiqueta: "Día", ancho: "1.05fr" },
  { clave: "jornada", etiqueta: "Jornada", ancho: "0.8fr" },
  { clave: "hora", etiqueta: "Hora", ancho: "0.6fr" },
  { clave: "rival", etiqueta: "Rival", ancho: "1.1fr" },
  { clave: "lugar", etiqueta: "Lugar", ancho: "1fr" },
  { clave: "observaciones", etiqueta: "Observaciones", ancho: "1.2fr" },
  { clave: "convocatoria", etiqueta: "Convocatoria", ancho: "1.1fr" },
];

const BLOQUES_ANALISIS: {
  izq: keyof AnalisisHoja;
  der: keyof AnalisisHoja;
  tIzq: string;
  tDer: string;
}[] = [
  { izq: "fase_defensiva", der: "fase_ofensiva", tIzq: "Fase defensiva", tDer: "Fase ofensiva" },
  {
    izq: "transicion_defensiva",
    der: "transicion_ofensiva",
    tIzq: "Transición defensiva",
    tDer: "Transición ofensiva",
  },
  { izq: "abp_defensivo", der: "abp_ofensivo", tIzq: "ABP defensivo", tDer: "ABP ofensivo" },
];

export function HojaPartido({
  hoja,
  ladoPropio,
}: {
  hoja: LocalHojaPartido;
  /** Lado donde va nuestro equipo según el partido (local = izquierda). */
  ladoPropio: LadoHoja;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  // Si el partido es de local nuestro equipo va a la izquierda y si es de
  // visitante, a la derecha: se recoloca solo si cambia el partido.
  const [datos, setDatos] = useState<HojaPartidoDatos>(() =>
    ponerNuestroEquipoEn(leerHoja(hoja.datos), ladoPropio),
  );
  const guardado = useRef(JSON.stringify(leerHoja(hoja.datos)));
  useEffect(() => {
    setDatos((d) => ponerNuestroEquipoEn(d, ladoPropio));
  }, [ladoPropio]);
  const pendiente = useRef<HojaPartidoDatos | null>(null);

  function cambiar(mut: (d: HojaPartidoDatos) => HojaPartidoDatos) {
    setDatos((d) => mut(d));
  }

  // Guardado automático: 700 ms después de dejar de escribir, y al salir de la
  // pantalla por si había algo pendiente.
  useEffect(() => {
    const serial = JSON.stringify(datos);
    if (serial === guardado.current) return;
    pendiente.current = datos;
    const t = setTimeout(() => {
      guardado.current = serial;
      pendiente.current = null;
      void guardarHojaLocal(hoja.id, datos);
    }, 700);
    return () => clearTimeout(t);
  }, [datos, hoja.id]);

  useEffect(
    () => () => {
      if (pendiente.current) void guardarHojaLocal(hoja.id, pendiente.current);
    },
    [hoja.id],
  );

  const cab = datos.cabecera;
  const nombreArchivo = `Hoja de partido ${cab.jornada ? `J${cab.jornada} ` : ""}${cab.rival}${
    cab.dia ? ` ${cab.dia.replace(/\//g, "-")}` : ""
  }.pdf`.replace(/\s+/g, " ");
  const columnas = CAMPOS_CABECERA.map((c) => c.ancho).join(" ");

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-muted-foreground">
          Escribe directamente sobre la hoja; se guarda sola.
        </p>
        <AccionesPdf
          contenedorRef={contenedorRef}
          nombreArchivo={nombreArchivo}
          clave={JSON.stringify(datos)}
        />
      </div>

      <div
        ref={contenedorRef}
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        className="text-neutral-900"
      >
        <div
          data-hoja-pdf
          className={`overflow-hidden border bg-white text-[12px] ${BORDE} print:h-[283mm]`}
        >
          {/* Cabecera del partido */}
          <div
            className={`grid border-b ${BORDE}`}
            style={{ gridTemplateColumns: columnas }}
          >
            {CAMPOS_CABECERA.map((c) => (
              <div
                key={c.clave}
                className={`flex h-6 items-center justify-center border-r px-1 text-[11px] font-bold uppercase last:border-r-0 ${BORDE}`}
              >
                {c.etiqueta}
              </div>
            ))}
          </div>
          <div
            className={`grid border-b ${BORDE}`}
            style={{ gridTemplateColumns: columnas }}
          >
            {CAMPOS_CABECERA.map((c) => (
              <div
                key={c.clave}
                className={`h-6 border-r last:border-r-0 ${BORDE}`}
              >
                <Celda
                  valor={cab[c.clave]}
                  etiqueta={c.etiqueta}
                  className="text-center text-[12px]"
                  onCambio={(v) =>
                    cambiar((d) => ({ ...d, cabecera: { ...d.cabecera, [c.clave]: v } }))
                  }
                />
              </div>
            ))}
          </div>

          <Titulo>Alineaciones</Titulo>
          <div className="grid grid-cols-[1fr_0.9fr_1fr]">
            <div className={`border-r ${BORDE}`}>
              <ColumnaAlineacion
                datos={datos.izquierda}
                inicio={NUM_TITULARES + 1}
                onCambio={(a) => cambiar((d) => ({ ...d, izquierda: a }))}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <CampoCentral />
              <div className={`border-t ${BORDE}`}>
                <Titulo>Cambios</Titulo>
                {Array.from({ length: FILAS_CAMBIOS }, (_, f) => (
                  <div
                    key={f}
                    className={`grid h-6 grid-cols-2 ${f < FILAS_CAMBIOS - 1 ? `border-b ${BORDE}` : ""}`}
                  >
                    {[0, 1].map((c) => (
                      <div key={c} className={c === 0 ? `border-r ${BORDE}` : ""}>
                        <Celda
                          valor={datos.cambios[f * 2 + c]}
                          etiqueta={`Cambio ${f + 1}, columna ${c + 1}`}
                          className="text-[12px]"
                          onCambio={(v) =>
                            cambiar((d) => ({
                              ...d,
                              cambios: d.cambios.map((x, k) => (k === f * 2 + c ? v : x)),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className={`border-l ${BORDE}`}>
              <ColumnaAlineacion
                datos={datos.derecha}
                inicio={NUM_TITULARES + 1}
                onCambio={(a) => cambiar((d) => ({ ...d, derecha: a }))}
              />
            </div>
          </div>

          <div className={`border-t ${BORDE}`}>
            <Titulo className="text-[13px] underline">Análisis rival</Titulo>
            {BLOQUES_ANALISIS.map((b) => (
              <div key={b.izq} className="grid grid-cols-2">
                {([
                  [b.izq, b.tIzq],
                  [b.der, b.tDer],
                ] as const).map(([clave, titulo], k) => (
                  <div key={clave} className={k === 0 ? `border-r ${BORDE}` : ""}>
                    <Titulo>{titulo}</Titulo>
                    <AreaAuto
                      valor={datos.analisis[clave]}
                      etiqueta={titulo}
                      className="min-h-[5rem] text-[12px]"
                      onCambio={(v) =>
                        cambiar((d) => ({ ...d, analisis: { ...d.analisis, [clave]: v } }))
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
            <Titulo>Observaciones</Titulo>
            <AreaAuto
              valor={datos.analisis.observaciones}
              etiqueta="Observaciones finales"
              className="min-h-[5rem] text-[12px]"
              onCambio={(v) =>
                cambiar((d) => ({ ...d, analisis: { ...d.analisis, observaciones: v } }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
