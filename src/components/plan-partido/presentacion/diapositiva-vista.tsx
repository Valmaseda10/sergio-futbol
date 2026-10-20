"use client";

// Una diapositiva de la presentación de partido, maquetada en un lienzo fijo de 1920 x 1080 px
// (16:9) con el fondo del club. `DiapositivaEscalada` la ajusta al ancho que haya (pantalla,
// miniatura, presentación a pantalla completa) y `DiapositivaPagina` al tamaño del papel.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarDays, Clock, MapPin, RectangleHorizontal } from "lucide-react";
import { diagramaASvg, diagramaVacio, type Diagrama } from "@/lib/ficha-entrenamiento";
import { CampoAbp } from "@/components/plan-partido/jugada-abp-vista";
import {
  hexTitulo,
  pieDiapositiva,
  type DAbp,
  type DBloques,
  type DClasificacion,
  type DRivalForma,
  type DInforme,
  type DRivalOnce,
  type FichaOnce,
  fichasDeFichaRival,
  type DRivalGoles,
  type DLibre,
  type ElementoLibre,
  type DPizarra,
  type DPortada,
  type DTexto,
  type Diapositiva,
} from "@/lib/presentacion-partido";
import { leerDiagramaAbp, leerJugadoresAbp } from "@/lib/plan-partido";
import type {
  LocalLigaEvento,
  LocalLigaPartido,
  LocalAlineacion,
  LocalJugadaAbp,
  LocalJugador,
  LocalPartido,
  LocalRivalAlineacion,
  LocalRivalGolIntervalo,
  LocalRivalJugadorDestacado,
  LocalRivalPlantillaJugador,
  LocalRivalScouting,
} from "@/lib/db/local-db";
import type { IntervaloGol } from "@/lib/types/database.types";
import {
  calcularClasificacion,
  calendarioDe,
  claveEquipo,
  dificultadCalendario,
  nombreMostrado,
  partidosDeEquipo,
  type Resultado,
} from "@/lib/clasificacion";
import { apercibidos, expulsadosUltimoPartido, goleadores, tarjetas } from "@/lib/liga-jugadores";

export const ANCHO = 1920;
export const ALTO = 1080;

/** Lo que las diapositivas automáticas leen de la app. */
export interface ContextoPresentacion {
  partido: LocalPartido;
  rival: LocalRivalScouting | null;
  plantillaRival: LocalRivalPlantillaJugador[];
  destacadosRival: LocalRivalJugadorDestacado[];
  golesRival: LocalRivalGolIntervalo[];
  onceRival: LocalRivalAlineacion[];
  nuestraAlineacion: LocalAlineacion[];
  jugadores: Map<string, LocalJugador>;
  abp: LocalJugadaAbp[];
  ligaPartidos: LocalLigaPartido[];
  ligaEventos: LocalLigaEvento[];
}

const TITULO: CSSProperties = {
  fontFamily: "var(--font-oswald), Impact, 'Arial Narrow', sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  lineHeight: 1,
};
const TEXTO: CSSProperties = { fontFamily: "Arial, Helvetica, sans-serif" };
const AZUL_ETIQUETA = "#5b87a6";

function Cabecera({ titulo, color }: { titulo: string; color?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/escudo-cultural.png"
        alt=""
        style={{ position: "absolute", left: 85, top: 53, width: 107, height: 143, objectFit: "contain" }}
      />
      <div
        style={{
          ...TITULO,
          position: "absolute",
          left: 215,
          right: 120,
          top: 66,
          height: 130,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: titulo.length > 26 ? 100 : 124,
          color: color ?? "#ee1c25",
        }}
      >
        {titulo}
      </div>
    </>
  );
}

function Etiqueta({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        ...TEXTO,
        background: AZUL_ETIQUETA,
        color: "#ffffff",
        fontWeight: 700,
        fontSize: 30,
        textAlign: "center",
        padding: "8px 24px",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Marco({
  d,
  ctx,
  sinCabecera = false,
  color,
  children,
}: {
  d: Diapositiva;
  ctx: ContextoPresentacion;
  sinCabecera?: boolean;
  color?: string;
  children: ReactNode;
}) {
  const titulo = "titulo" in d ? d.titulo : "";
  return (
    <>
      {!sinCabecera && <Cabecera titulo={titulo} color={color} />}
      {children}
      <div
        style={{
          ...TEXTO,
          position: "absolute",
          left: 0,
          right: 0,
          top: 1026,
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 36,
        }}
      >
        {d.tipo === "portada" ? "" : pieDiapositiva(ctx.partido.fecha)}
      </div>
    </>
  );
}

function DiagramaImg({
  diagrama,
  alto,
  ancho,
  estilo,
}: {
  diagrama: Diagrama;
  alto?: number;
  ancho?: number;
  estilo?: CSSProperties;
}) {
  return (
    <div
      className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ width: ancho, height: alto, overflow: "hidden", ...estilo }}
      dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama) }}
    />
  );
}

function CampoVacio({ alto, ancho, texto }: { alto: number; ancho: number; texto: string }) {
  return (
    <div
      style={{
        ...TEXTO,
        width: ancho,
        height: alto,
        border: "4px dashed #9ca3af",
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 36,
        textAlign: "center",
        padding: 40,
      }}
    >
      {texto}
    </div>
  );
}

// ---- Tipos de diapositiva ---------------------------------------------------

function Portada({ d, ctx }: { d: DPortada; ctx: ContextoPresentacion }) {
  return (
    <Marco d={d} ctx={ctx} sinCabecera>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/escudo-cultural.png"
        alt=""
        style={{ position: "absolute", left: 200, top: 330, width: 240, height: 320, objectFit: "contain" }}
      />
      <div style={{ position: "absolute", left: 520, right: 140, top: 270, textAlign: "center" }}>
        <div style={{ ...TITULO, fontSize: 250, color: "#111111", lineHeight: 1.05 }}>{d.titulo}</div>
        <div style={{ ...TITULO, fontSize: 84, color: "#ee1c25", marginTop: 26 }}>{d.subtitulo}</div>
        <div style={{ ...TEXTO, fontSize: 64, color: "#111111", marginTop: 96, fontWeight: 500 }}>{d.pie}</div>
      </div>
    </Marco>
  );
}

function Informe({ d, ctx }: { d: DInforme; ctx: ContextoPresentacion }) {
  const filas: { icono: ReactNode; lineas: string[] }[] = [
    { icono: <CalendarDays size={96} strokeWidth={1.6} />, lineas: [d.jornada, [d.dia, d.hora].filter(Boolean).join("      ")] },
    { icono: <MapPin size={96} strokeWidth={1.6} />, lineas: [d.lugar] },
    { icono: <RectangleHorizontal size={96} strokeWidth={1.6} />, lineas: [d.superficie] },
    { icono: <Clock size={96} strokeWidth={1.6} />, lineas: [d.citacion ? `CITACIÓN: ${d.citacion}` : ""] },
  ];
  return (
    <Marco d={d} ctx={ctx} color="#111111">
      <div
        style={{
          ...TEXTO,
          position: "absolute",
          left: 215,
          right: 120,
          top: 222,
          textAlign: "center",
          color: "#ee1c25",
          fontWeight: 700,
          fontSize: 46,
          textTransform: "uppercase",
        }}
      >
        {d.competicion}
      </div>
      <div style={{ position: "absolute", left: 150, top: 340, width: 1000 }}>
        {filas.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 40, minHeight: 150 }}>
            <div style={{ width: 110, flexShrink: 0, color: "#111111" }}>{f.icono}</div>
            <div
              style={{
                ...TEXTO,
                flex: 1,
                textAlign: "center",
                color: "#ee1c25",
                fontWeight: 700,
                fontSize: 46,
                lineHeight: 1.25,
                textTransform: "uppercase",
                whiteSpace: "pre-wrap",
              }}
            >
              {f.lineas.filter(Boolean).join("\n")}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 1330, width: 440, top: 300 }}>
        <Etiqueta>Equipación</Etiqueta>
        <div
          style={{
            ...TEXTO,
            minHeight: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontSize: 38,
            fontWeight: 700,
            color: "#111111",
            padding: 20,
            whiteSpace: "pre-wrap",
          }}
        >
          {d.equipacion}
        </div>
        <Etiqueta style={{ marginTop: 40 }}>Árbitros</Etiqueta>
        <div
          style={{
            ...TEXTO,
            minHeight: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontSize: 32,
            color: "#111111",
            padding: 20,
            whiteSpace: "pre-wrap",
          }}
        >
          {d.arbitros}
        </div>
      </div>
    </Marco>
  );
}

function Texto({ d, ctx }: { d: DTexto; ctx: ContextoPresentacion }) {
  const lineas = d.texto.split("\n");
  const n = lineas.length;
  const fuente = n > 12 ? 34 : n > 9 ? 40 : n > 6 ? 46 : 52;
  return (
    <Marco d={d} ctx={ctx} color={hexTitulo(d.color)}>
      <div
        style={{
          ...TEXTO,
          position: "absolute",
          left: 150,
          right: 160,
          top: 240,
          bottom: 130,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          fontSize: fuente,
          color: "#111111",
          lineHeight: 1.25,
        }}
      >
        {lineas.map((l, i) => (
          <div key={i} style={{ whiteSpace: "pre-wrap", minHeight: fuente }}>
            {l}
          </div>
        ))}
      </div>
    </Marco>
  );
}

function Pizarra({ d, ctx }: { d: DPizarra; ctx: ContextoPresentacion }) {
  const lineasPie = d.pie.split("\n").filter((l) => l.trim());
  const altoPie = lineasPie.length > 1 ? 120 : 70;
  const alto = 780 - altoPie;
  const ancho = Math.round((alto * 520) / 340);
  return (
    <Marco d={d} ctx={ctx} color={hexTitulo(d.color)}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 215, display: "flex", justifyContent: "center" }}>
        <DiagramaImg diagrama={d.diagrama ?? diagramaVacio("completo")} alto={alto} ancho={ancho} />
      </div>
      {lineasPie.length > 0 && (
        <div
          style={{
            ...TEXTO,
            position: "absolute",
            left: 120,
            right: 120,
            top: 215 + alto + 10,
            textAlign: "center",
            color: hexTitulo(d.colorPie),
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.2,
            textTransform: "uppercase",
          }}
        >
          {lineasPie.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </Marco>
  );
}

function Bloques({ d, ctx }: { d: DBloques; ctx: ContextoPresentacion }) {
  const n = Math.max(1, d.bloques.length);
  const total = 790;
  const alto = Math.floor(total / n) - 16;
  return (
    <Marco d={d} ctx={ctx} color={hexTitulo(d.color)}>
      <div style={{ position: "absolute", left: 130, right: 140, top: 225, display: "flex", flexDirection: "column", gap: 16 }}>
        {d.bloques.map((b, i) => {
          const diagrama = b.diagrama;
          const anchoDibujo = diagrama ? Math.round((alto * 520) / 340) : 0;
          return (
            <div key={i} style={{ display: "flex", gap: 36, height: alto, alignItems: "stretch" }}>
              {diagrama && <DiagramaImg diagrama={diagrama} alto={alto} ancho={anchoDibujo} estilo={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    ...TEXTO,
                    background: b.color,
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 32,
                    textAlign: "center",
                    padding: "6px 20px",
                    textTransform: "uppercase",
                    textShadow: "0 0 3px rgba(0,0,0,0.45)",
                  }}
                >
                  {b.titulo}
                </div>
                <div
                  style={{
                    ...TEXTO,
                    flex: 1,
                    fontSize: n > 2 ? 34 : 40,
                    lineHeight: 1.3,
                    color: "#111111",
                    padding: "14px 10px",
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                  }}
                >
                  {b.texto}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Marco>
  );
}

function RivalPlantilla({ d, ctx }: { d: Diapositiva & { tipo: "rival_plantilla" }; ctx: ContextoPresentacion }) {
  const jugadores = ctx.plantillaRival
    .filter((j) => j.rol === "jugador")
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const cuerpo = ctx.plantillaRival.filter((j) => j.rol !== "jugador");
  const destacado = new Map<string, "top" | "flojo">();
  for (const x of ctx.destacadosRival) {
    if (x.plantilla_id) destacado.set(x.plantilla_id, x.categoria);
  }
  const dosColumnas = jugadores.length > 12;
  const fuente = !dosColumnas ? 38 : jugadores.length > 18 ? 26 : 30;
  const mitad = Math.ceil(jugadores.length / 2);
  const columnas = dosColumnas ? [jugadores.slice(0, mitad), jugadores.slice(mitad)] : [jugadores];
  return (
    <Marco d={d} ctx={ctx}>
      <Etiqueta style={{ position: "absolute", left: 130, width: 620, top: 215 }}>
        {`${ctx.partido.rival} (${jugadores.length})`}
      </Etiqueta>
      {jugadores.length === 0 ? (
        <div style={{ ...TEXTO, position: "absolute", left: 130, top: 330, fontSize: 36, color: "#6b7280" }}>
          La ficha del rival todavía no tiene plantilla.
        </div>
      ) : (
        <div style={{ position: "absolute", left: 130, top: 290, display: "flex", gap: 30 }}>
          {columnas.map((col, c) => (
            <div key={c} style={{ width: dosColumnas ? 600 : 640 }}>
              {col.map((j) => {
                const marca = destacado.get(j.id);
                return (
                  <div
                    key={j.id}
                    style={{
                      ...TEXTO,
                      fontSize: fuente,
                      lineHeight: 1.25,
                      fontWeight: 700,
                      color: "#111111",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ width: fuente * 1.3, textAlign: "right", color: "#6b7280", fontWeight: 400 }}>
                      {j.dorsal ?? ""}
                    </span>
                    <span
                      style={{
                        background: j.curso === 2 ? "#92d050" : j.curso === 1 ? "#ffff00" : "transparent",
                        padding: "0 10px",
                      }}
                    >
                      {j.nombre}
                    </span>
                    {marca && (
                      <span style={{ color: marca === "top" ? "#d97706" : "#dc2626", fontSize: fuente * 0.9 }}>
                        {marca === "top" ? "★" : "▼"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <div style={{ ...TEXTO, position: "absolute", left: 1410, top: 290, width: 400, fontSize: 28, color: "#111111" }}>
        {cuerpo.map((p) => (
          <div key={p.id} style={{ marginBottom: 14 }}>
            <div style={{ color: "#6b7280", textTransform: "uppercase", fontSize: 22 }}>{p.rol}</div>
            <div style={{ fontWeight: 700 }}>{p.nombre}</div>
          </div>
        ))}
        {jugadores.some((j) => j.curso != null) && (
          <div style={{ marginTop: 40, fontWeight: 700, fontSize: 26 }}>
            <div style={{ background: "#ffff00", display: "inline-block", padding: "0 10px" }}>JUGADOR PRIMER AÑO</div>
            <div style={{ background: "#92d050", display: "inline-block", padding: "0 10px", marginTop: 8 }}>
              JUGADOR SEGUNDO AÑO
            </div>
          </div>
        )}
        {ctx.destacadosRival.length > 0 && (
          <div style={{ marginTop: 40, fontSize: 26 }}>
            <div>
              <span style={{ color: "#d97706" }}>★</span> Destacado
            </div>
            <div>
              <span style={{ color: "#dc2626" }}>▼</span> Punto débil
            </div>
          </div>
        )}
      </div>
    </Marco>
  );
}

const TRAMOS: { value: IntervaloGol; label: string }[] = [
  { value: "0-15", label: "0-15 Minutos" },
  { value: "15-30", label: "15-30 Minutos" },
  { value: "30-45", label: "30-45 Minutos" },
  { value: "45-60", label: "45-60 Minutos" },
  { value: "60+", label: "60-70+ Minutos" },
];

function RivalGoles({ d, ctx }: { d: DRivalGoles; ctx: ContextoPresentacion }) {
  // Misma fuente que la tabla "Goles del rival por tramos" de la ficha del rival: lo que se cambie
  // allí (o en el formulario de esta diapositiva) se ve aquí al momento.
  const por = new Map(ctx.golesRival.map((g) => [g.intervalo, g]));
  const datos = TRAMOS.map((t) => ({
    ...t,
    favor: por.get(t.value)?.goles_favor ?? 0,
    contra: por.get(t.value)?.goles_contra ?? 0,
  }));
  const totalFavor = datos.reduce((s, x) => s + x.favor, 0);
  const totalContra = datos.reduce((s, x) => s + x.contra, 0);
  const maximo = Math.max(4, ...datos.map((x) => Math.max(x.favor, x.contra)));
  const verGrafica = d.grafica !== false;
  const verTabla = d.tabla !== false;
  const W = verTabla ? 1130 : 1240;
  const H = 640;
  const izq = 70;
  const abajo = 70;
  const arriba = 110;
  const alto = H - abajo - arriba;
  const ancho = W - izq - 20;
  const grupo = ancho / datos.length;
  const barra = grupo * 0.3;
  const y = (v: number) => arriba + alto - (v / maximo) * alto;
  // Con tabla y sin gráfica la tabla ocupa el centro, grande.
  const grande = verTabla && !verGrafica;
  const tamano = grande ? 40 : 26;
  return (
    <Marco d={d} ctx={ctx}>
      <div style={{ position: "absolute", left: 130, width: grande ? 1000 : 400, top: 215, ...TEXTO, color: "#111111" }}>
        <Etiqueta>Goles equipo</Etiqueta>
        <div style={{ display: "flex", justifyContent: "space-around", fontSize: grande ? 34 : 26, fontWeight: 700, marginTop: 14 }}>
          <span>A FAVOR</span>
          <span>EN CONTRA</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            fontSize: grande ? 150 : 110,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          <span style={{ color: "#00a651" }}>{totalFavor}</span>
          <span style={{ color: "#06b6d4" }}>{totalContra}</span>
        </div>
        {verTabla && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24, fontSize: tamano }}>
            <thead>
              <tr style={{ background: AZUL_ETIQUETA, color: "#ffffff" }}>
                <th style={{ padding: "6px 10px", textAlign: "left" }}>Tramo</th>
                <th style={{ padding: "6px 10px", textAlign: "center" }}>A favor</th>
                <th style={{ padding: "6px 10px", textAlign: "center" }}>En contra</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((x, i) => (
                <tr key={x.value} style={{ background: i % 2 ? "#f1f5f9" : "#ffffff", borderBottom: "2px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700 }}>{x.label.replace(" Minutos", "'")}</td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: "#00a651", fontWeight: 700 }}>{x.favor}</td>
                  <td style={{ padding: "6px 10px", textAlign: "center", color: "#0891b2", fontWeight: 700 }}>{x.contra}</td>
                </tr>
              ))}
              <tr style={{ background: "#e2e8f0", fontWeight: 700 }}>
                <td style={{ padding: "6px 10px" }}>Total</td>
                <td style={{ padding: "6px 10px", textAlign: "center" }}>{totalFavor}</td>
                <td style={{ padding: "6px 10px", textAlign: "center" }}>{totalContra}</td>
              </tr>
            </tbody>
          </table>
        )}
        {!grande && (
          <div style={{ fontSize: 22, color: "#6b7280", marginTop: 16 }}>{ctx.partido.rival}</div>
        )}
      </div>
      {verGrafica && (
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: "absolute", left: verTabla ? 620 : 560, top: 235, fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          <text x={W / 2} y={34} textAnchor="middle" fontSize={34} fontWeight={700} fill="#111111">
            GOLES POR MINUTOS
          </text>
          <rect x={W / 2 - 200} y={56} width={16} height={16} fill="#00a651" />
          <text x={W / 2 - 176} y={71} fontSize={22} fontWeight={700} fill="#111111">
            A FAVOR
          </text>
          <rect x={W / 2 + 20} y={56} width={16} height={16} fill="#06b6d4" />
          <text x={W / 2 + 44} y={71} fontSize={22} fontWeight={700} fill="#111111">
            EN CONTRA
          </text>
          {Array.from({ length: maximo + 1 }, (_, v) => (
            <g key={v}>
              <line x1={izq} x2={W - 20} y1={y(v)} y2={y(v)} stroke="#d1d5db" strokeWidth={1.5} />
              <text x={izq - 12} y={y(v) + 8} textAnchor="end" fontSize={22} fill="#374151">
                {v}
              </text>
            </g>
          ))}
          {datos.map((x, i) => {
            const cx = izq + grupo * i + grupo / 2;
            return (
              <g key={x.value}>
                <rect x={cx - barra - 4} y={y(x.favor)} width={barra} height={(x.favor / maximo) * alto} fill="#00a651" />
                <rect x={cx + 4} y={y(x.contra)} width={barra} height={(x.contra / maximo) * alto} fill="#06b6d4" />
                {x.favor > 0 && (
                  <text x={cx - barra / 2 - 4} y={y(x.favor) - 8} textAnchor="middle" fontSize={26} fontWeight={700} fill="#111111">
                    {x.favor}
                  </text>
                )}
                {x.contra > 0 && (
                  <text x={cx + barra / 2 + 4} y={y(x.contra) - 8} textAnchor="middle" fontSize={26} fontWeight={700} fill="#111111">
                    {x.contra}
                  </text>
                )}
                <text x={cx} y={H - 30} textAnchor="middle" fontSize={verTabla ? 21 : 24} fontWeight={700} fill="#111111">
                  {x.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </Marco>
  );
}

interface FichaCampo {
  top: number;
  left: number;
  numero: string;
  nombre: string;
  suplente: boolean;
}

function CampoVertical({ fichas, color }: { fichas: FichaCampo[]; color: string }) {
  const W = 490;
  const H = 735;
  return (
    <div style={{ position: "relative", width: W, height: H, background: "#2f8f3a", border: "4px solid #111111" }}>
      <svg width={W} height={H} viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <g fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={0.5}>
          <rect x={3} y={3} width={94} height={144} />
          <line x1={3} y1={75} x2={97} y2={75} />
          <circle cx={50} cy={75} r={9} />
          <rect x={22} y={3} width={56} height={22} />
          <rect x={36} y={3} width={28} height={8} />
          <rect x={22} y={125} width={56} height={22} />
          <rect x={36} y={139} width={28} height={8} />
        </g>
      </svg>
      {fichas.map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${f.top}%`,
            left: `${f.left}%`,
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...TEXTO,
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: f.suplente ? "#6b7280" : color,
              border: "4px solid #ffffff",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {f.numero}
          </div>
          {f.nombre && (
            <div
              style={{
                ...TEXTO,
                marginTop: 2,
                background: "rgba(255,255,255,0.92)",
                color: "#111111",
                fontWeight: 700,
                fontSize: 21,
                padding: "0 8px",
                whiteSpace: "nowrap",
              }}
            >
              {f.nombre}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function OnceEnCampo({
  d,
  ctx,
  fichas,
  color,
  etiqueta,
  vacio,
}: {
  d: Diapositiva;
  ctx: ContextoPresentacion;
  fichas: FichaCampo[];
  color: string;
  etiqueta: string;
  vacio: string;
}) {
  const titulares = fichas.filter((f) => !f.suplente);
  const suplentes = fichas.filter((f) => f.suplente);
  return (
    <Marco d={d} ctx={ctx}>
      <Etiqueta style={{ position: "absolute", left: 130, width: 498, top: 212 }}>{etiqueta}</Etiqueta>
      <div style={{ position: "absolute", left: 130, top: 270 }}>
        {fichas.length === 0 ? (
          <CampoVacio ancho={498} alto={743} texto={vacio} />
        ) : (
          <CampoVertical fichas={fichas} color={color} />
        )}
      </div>
      <div style={{ ...TEXTO, position: "absolute", left: 760, top: 270, width: 900, color: "#111111", fontSize: 34 }}>
        {titulares.length > 0 && (
          <>
            <div style={{ fontWeight: 700, color: "#6b7280", fontSize: 26, marginBottom: 8 }}>TITULARES</div>
            {titulares.map((f, i) => (
              <div key={i} style={{ lineHeight: 1.3 }}>
                <span style={{ display: "inline-block", width: 70, textAlign: "right", color: color, fontWeight: 700 }}>
                  {f.numero}
                </span>{" "}
                {f.nombre}
              </div>
            ))}
          </>
        )}
        {suplentes.length > 0 && (
          <>
            <div style={{ fontWeight: 700, color: "#6b7280", fontSize: 26, margin: "28px 0 8px" }}>SUPLENTES</div>
            {suplentes.map((f, i) => (
              <div key={i} style={{ lineHeight: 1.3 }}>
                <span style={{ display: "inline-block", width: 70, textAlign: "right", color: "#6b7280" }}>{f.numero}</span>{" "}
                {f.nombre}
              </div>
            ))}
          </>
        )}
      </div>
    </Marco>
  );
}

// Campo horizontal del once del rival: mismo campo verde que las pizarras.
export const CAMPO_ONCE = { x: 130, y: 222, alto: 700, ancho: Math.round((700 * 520) / 340) };

/** Posición (centro de la ficha) en el lienzo de 1920 x 1080 de un punto en % del campo. */
export function posicionEnCampo(x: number, y: number): { left: number; top: number } {
  // El dibujo del campo tiene margen: las líneas van de 20 a 500 (ancho 520) y de 20 a 320 (alto 340).
  return {
    left: CAMPO_ONCE.x + CAMPO_ONCE.ancho * (20 / 520 + (x / 100) * (480 / 520)),
    top: CAMPO_ONCE.y + CAMPO_ONCE.alto * (20 / 340 + (y / 100) * (300 / 340)),
  };
}

/** El once que se ve: el puesto a mano o, si no hay, el de la ficha del rival. */
export function fichasDeOnce(d: DRivalOnce, ctx: ContextoPresentacion): FichaOnce[] {
  return d.jugadores.length > 0 ? d.jugadores : fichasDeFichaRival(ctx.onceRival);
}

export function FichaCampo({ f, ancla }: { f: FichaOnce; ancla?: { left: number; top: number } }) {
  const pos = ancla ?? posicionEnCampo(f.x, f.y);
  return (
    <div
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          ...TEXTO,
          width: 62,
          height: 62,
          borderRadius: "50%",
          background: "#111111",
          border: "4px solid #ffffff",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
        }}
      >
        {f.numero}
      </div>
      {f.nombre && (
        <div
          style={{
            ...TEXTO,
            marginTop: 3,
            background: "rgba(255,255,255,0.94)",
            color: "#111111",
            fontWeight: 700,
            fontSize: 24,
            padding: "0 10px",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
          }}
        >
          {f.nombre}
        </div>
      )}
    </div>
  );
}

function RivalOnce({ d, ctx }: { d: DRivalOnce; ctx: ContextoPresentacion }) {
  const fichas = fichasDeOnce(d, ctx);
  const titulares = fichas.filter((f) => !f.suplente);
  const suplentes = fichas.filter((f) => f.suplente);
  const columna = CAMPO_ONCE.x + CAMPO_ONCE.ancho + 50;
  return (
    <Marco d={d} ctx={ctx}>
      <div style={{ position: "absolute", left: CAMPO_ONCE.x, top: CAMPO_ONCE.y, width: CAMPO_ONCE.ancho, height: CAMPO_ONCE.alto }}>
        <DiagramaImg diagrama={diagramaVacio("completo")} alto={CAMPO_ONCE.alto} ancho={CAMPO_ONCE.ancho} />
      </div>
      {!d.sinFichas && titulares.map((f) => <FichaCampo key={f.id} f={f} />)}
      <div style={{ position: "absolute", left: columna, width: 1840 - columna, top: 222, ...TEXTO, color: "#111111" }}>
        <Etiqueta>{ctx.partido.rival}</Etiqueta>
        {d.sistema && (
          <div style={{ ...TITULO, fontSize: 84, color: "#ee1c25", textAlign: "center", marginTop: 14 }}>{d.sistema}</div>
        )}
        <div style={{ fontSize: titulares.length + suplentes.length > 15 ? 25 : 30, lineHeight: 1.3, marginTop: 16 }}>
          {titulares.map((f) => (
            <div key={f.id} style={{ display: "flex", gap: 12 }}>
              <span style={{ width: 52, textAlign: "right", fontWeight: 700 }}>{f.numero}</span>
              <span style={{ textTransform: "uppercase" }}>{f.nombre}</span>
            </div>
          ))}
          {suplentes.length > 0 && (
            <>
              <div style={{ fontWeight: 700, color: "#6b7280", fontSize: 22, margin: "16px 0 4px" }}>SUPLENTES</div>
              {suplentes.map((f) => (
                <div key={f.id} style={{ display: "flex", gap: 12, color: "#4b5563" }}>
                  <span style={{ width: 52, textAlign: "right" }}>{f.numero}</span>
                  <span style={{ textTransform: "uppercase" }}>{f.nombre}</span>
                </div>
              ))}
            </>
          )}
          {fichas.length === 0 && (
            <div style={{ color: "#6b7280" }}>Añade jugadores en el formulario de esta diapositiva.</div>
          )}
        </div>
      </div>
    </Marco>
  );
}

function NuestroOnce({ d, ctx }: { d: Diapositiva & { tipo: "nuestro_once" }; ctx: ContextoPresentacion }) {
  const fichas: FichaCampo[] = ctx.nuestraAlineacion
    .filter((a) => a.titular && a.pos_x != null && a.pos_y != null)
    .map((a) => {
      const j = a.jugador_id ? ctx.jugadores.get(a.jugador_id) : undefined;
      return {
        top: a.pos_y as number,
        left: a.pos_x as number,
        numero: j?.dorsal != null ? String(j.dorsal) : "",
        nombre: (j ? j.alias || j.nombre : (a.nombre_libre ?? "")).toUpperCase(),
        suplente: false,
      };
    });
  return (
    <OnceEnCampo
      d={d}
      ctx={ctx}
      fichas={fichas}
      color="#ee1c25"
      etiqueta="Nuestro once"
      vacio="Todavía no hay alineación de este partido"
    />
  );
}

const COLOR_ABP: Record<string, string> = { defensivo: "#2bb3a8", ofensivo: "#3b8fdc" };

function Abp({ d, ctx }: { d: DAbp; ctx: ContextoPresentacion }) {
  const todas = [...ctx.abp].sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at));
  const elegidas = d.jugadas.length > 0 ? todas.filter((j) => d.jugadas.includes(j.id)) : todas;
  // Primero las defensivas y debajo las ofensivas, como en el PowerPoint.
  const filas = [
    elegidas.filter((j) => j.fase === "defensivo"),
    elegidas.filter((j) => j.fase !== "defensivo"),
  ].filter((f) => f.length > 0);
  // Las columnas pedidas, sin pasar de las jugadas que hay en la fila más larga.
  const columnas = Math.min(Math.min(4, Math.max(1, d.columnas)), Math.max(1, ...filas.map((f) => f.length)));
  const espacio = 26;
  const hueco = 18;
  const cabecera = 42;
  const anchoUtil = 1640;
  const altoUtil = 790;
  const subfilas = filas.reduce((s, f) => s + Math.ceil(f.length / columnas), 0);
  // Tamaño de cada jugada: lo que quepa a lo ancho y a lo alto.
  const anchoPorColumna = (anchoUtil - espacio * (columnas - 1)) / columnas;
  const anchoPorAlto = (((altoUtil - hueco * (subfilas - 1)) / Math.max(1, subfilas)) - cabecera) * (1056 / 723);
  const anchoCelda = Math.floor(Math.min(anchoPorColumna, anchoPorAlto));
  return (
    <Marco d={d} ctx={ctx}>
      {elegidas.length === 0 ? (
        <div style={{ position: "absolute", left: 130, top: 300 }}>
          <CampoVacio ancho={1600} alto={500} texto="Este partido todavía no tiene jugadas de ABP. Créalas en Partidos → ABP." />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 215,
            width: anchoUtil,
            height: altoUtil,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: hueco,
          }}
        >
          {filas.map((fila, i) => (
            <div
              key={i}
              style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${hueco}px ${espacio}px` }}
            >
              {fila.map((j) => (
                <div key={j.id} style={{ width: anchoCelda }}>
                  <div
                    style={{
                      ...TEXTO,
                      background: COLOR_ABP[j.fase] ?? COLOR_ABP.ofensivo,
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 24,
                      textAlign: "center",
                      padding: "4px 10px",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {j.nombre}
                  </div>
                  <CampoAbp
                    diagrama={leerDiagramaAbp(j.diagrama)}
                    filas={leerJugadoresAbp(j.jugadores)}
                    jugadores={ctx.jugadores}
                    tipo={j.tipo}
                    fase={j.fase}
                    grande
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Marco>
  );
}

const COLOR_RES: Record<Resultado, string> = { V: "#16a34a", E: "#f59e0b", D: "#dc2626" };

function ChipRes({ r, tam = 34 }: { r: Resultado; tam?: number }) {
  return (
    <span
      style={{
        ...TEXTO,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: tam,
        height: tam,
        borderRadius: 6,
        background: COLOR_RES[r],
        color: "#ffffff",
        fontWeight: 700,
        fontSize: tam * 0.6,
      }}
    >
      {r}
    </span>
  );
}

const nombreVisto = (e: string) => (/leonesa/i.test(e) ? "INFANTIL B" : nombreMostrado(e).toUpperCase());

function ClasificacionDiapo({ d, ctx }: { d: DClasificacion; ctx: ContextoPresentacion }) {
  const tabla = calcularClasificacion(ctx.ligaPartidos);
  const rivalKey = claveEquipo(ctx.partido.rival);
  const jornada = ctx.ligaPartidos
    .filter((p) => p.goles_local != null && p.goles_visitante != null)
    .reduce((m, p) => Math.max(m, p.jornada), 0);
  const alto = Math.min(52, Math.floor(770 / (tabla.length + 1)));
  const fuente = alto >= 50 ? 30 : 26;
  return (
    <Marco d={d} ctx={ctx}>
      {tabla.length === 0 ? (
        <div style={{ position: "absolute", left: 130, top: 300 }}>
          <CampoVacio ancho={1600} alto={400} texto="Todavía no hay resultados de la liga cargados (Rivales → Clasificación)." />
        </div>
      ) : (
        <div style={{ position: "absolute", left: 150, right: 150, top: 215, ...TEXTO, color: "#111111" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 80px 80px 80px 80px 100px 100px 110px 250px",
              alignItems: "center",
              height: alto,
              background: AZUL_ETIQUETA,
              color: "#ffffff",
              fontWeight: 700,
              fontSize: fuente - 4,
              textAlign: "center",
            }}
          >
            <span>#</span>
            <span style={{ textAlign: "left" }}>EQUIPO</span>
            <span>PJ</span>
            <span>G</span>
            <span>E</span>
            <span>P</span>
            <span>GF-GC</span>
            <span>DG</span>
            <span>PTS</span>
            <span>FORMA</span>
          </div>
          {tabla.map((f) => {
            const somos = /leonesa/i.test(f.equipo);
            const esRival = claveEquipo(f.equipo) === rivalKey;
            return (
              <div
                key={f.equipo}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr 80px 80px 80px 80px 100px 100px 110px 250px",
                  alignItems: "center",
                  height: alto,
                  fontSize: fuente,
                  textAlign: "center",
                  fontWeight: somos || esRival ? 700 : 400,
                  background: somos ? "#fecaca" : esRival ? "#fef08a" : "transparent",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                <span style={{ color: "#6b7280" }}>{f.posicion}</span>
                <span style={{ textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nombreVisto(f.equipo)}
                </span>
                <span>{f.pj}</span>
                <span>{f.g}</span>
                <span>{f.e}</span>
                <span>{f.p}</span>
                <span>
                  {f.gf}-{f.gc}
                </span>
                <span>{f.dg > 0 ? `+${f.dg}` : f.dg}</span>
                <span style={{ fontWeight: 700 }}>{f.pts}</span>
                <span style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                  {f.forma.map((r, i) => (
                    <ChipRes key={i} r={r} tam={alto - 16} />
                  ))}
                </span>
              </div>
            );
          })}
          <div style={{ fontSize: 22, color: "#6b7280", marginTop: 6 }}>
            Tras la jornada {jornada} · en rojo, nosotros; en amarillo, el rival.
          </div>
        </div>
      )}
    </Marco>
  );
}

function RivalFormaDiapo({ d, ctx }: { d: DRivalForma; ctx: ContextoPresentacion }) {
  const tabla = calcularClasificacion(ctx.ligaPartidos);
  const fila = tabla.find((f) => claveEquipo(f.equipo) === claveEquipo(ctx.partido.rival));
  const equipo = fila?.equipo ?? ctx.partido.rival;
  const jugados = partidosDeEquipo(ctx.ligaPartidos, equipo);
  const proximos = calendarioDe(ctx.ligaPartidos, equipo).slice(0, 6);
  const dif = dificultadCalendario(calendarioDe(ctx.ligaPartidos, equipo), tabla);
  const posiciones = new Map(tabla.map((f) => [claveEquipo(f.equipo), f.posicion]));
  const topGoles = goleadores(ctx.ligaEventos, equipo).slice(0, 4);
  const cards = tarjetas(ctx.ligaEventos, equipo).slice(0, 5);
  const ultimaJ = jugados.length > 0 ? jugados[jugados.length - 1].jornada : 0;
  const expulsados = ultimaJ ? expulsadosUltimoPartido(ctx.ligaEventos, equipo, ultimaJ) : [];
  const aperc = apercibidos(ctx.ligaEventos, equipo);
  const titulo = { ...d, titulo: d.titulo };
  return (
    <Marco d={titulo} ctx={ctx}>
      {!fila ? (
        <div style={{ position: "absolute", left: 130, top: 300 }}>
          <CampoVacio ancho={1600} alto={400} texto="No encuentro al rival en la clasificación de la liga todavía." />
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", left: 130, top: 215, width: 1660, ...TEXTO }}>
            <Etiqueta style={{ fontSize: 34 }}>
              {nombreVisto(equipo)} · {fila.posicion}º · {fila.pts} pts · {fila.g}G {fila.e}E {fila.p}P · {fila.gf}-{fila.gc}
            </Etiqueta>
          </div>
          {/* Últimos partidos */}
          <div style={{ position: "absolute", left: 130, top: 295, width: 780, ...TEXTO, color: "#111111" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>ÚLTIMOS RESULTADOS</div>
            {jugados.slice(-5).reverse().map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, height: 54, fontSize: 30, borderBottom: "2px solid #e2e8f0" }}>
                <span style={{ width: 62, color: "#6b7280", fontSize: 24 }}>J{p.jornada}</span>
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "#6b7280" }}>{p.local ? "vs" : "@"}</span> {nombreVisto(p.rival)}
                  <span style={{ color: "#6b7280", fontSize: 22 }}> ({posiciones.get(claveEquipo(p.rival))}º)</span>
                </span>
                <span style={{ fontWeight: 700, width: 90, textAlign: "center" }}>
                  {p.gf}-{p.gc}
                </span>
                <ChipRes r={p.resultado} tam={38} />
              </div>
            ))}
            <div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280", margin: "26px 0 6px" }}>GOLEADORES</div>
            {topGoles.length === 0 ? (
              <div style={{ fontSize: 26, color: "#6b7280" }}>Sin datos todavía.</div>
            ) : (
              topGoles.map((g) => (
                <div key={g.jugador} style={{ display: "flex", gap: 14, fontSize: 28, height: 44, alignItems: "center" }}>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.jugador}</span>
                  <span style={{ fontWeight: 700 }}>{g.goles}</span>
                </div>
              ))
            )}
          </div>
          {/* Próximos partidos y tarjetas */}
          <div style={{ position: "absolute", left: 980, top: 295, width: 810, ...TEXTO, color: "#111111" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>PRÓXIMOS PARTIDOS</div>
            {proximos.map((c) => {
              const pos = posiciones.get(claveEquipo(c.rival));
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, height: 54, fontSize: 30, borderBottom: "2px solid #e2e8f0" }}>
                  <span style={{ width: 62, color: "#6b7280", fontSize: 24 }}>J{c.jornada}</span>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "#6b7280" }}>{c.local ? "vs" : "@"}</span> {nombreVisto(c.rival)}
                  </span>
                  {pos != null && (
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        padding: "0 10px",
                        borderRadius: 6,
                        background: pos <= 4 ? "#fee2e2" : "transparent",
                        color: pos <= 4 ? "#b91c1c" : "#6b7280",
                      }}
                    >
                      {pos}º
                    </span>
                  )}
                </div>
              );
            })}
            {dif && (
              <div style={{ fontSize: 24, color: "#374151", marginTop: 8 }}>
                Calendario{" "}
                <strong>
                  {dif.pppRivales > dif.pppLiga + 0.15 ? "difícil" : dif.pppRivales < dif.pppLiga - 0.15 ? "cómodo" : "normal"}
                </strong>{" "}
                ({dif.partidos} partidos, rivales a {dif.pppRivales.toFixed(2)} pts/partido)
              </div>
            )}
            <div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280", margin: "22px 0 6px" }}>TARJETAS</div>
            {expulsados.length > 0 && (
              <div style={{ fontSize: 26, background: "#fee2e2", color: "#991b1b", padding: "4px 12px", marginBottom: 6 }}>
                Expulsado en su último partido: <strong>{expulsados.map((t) => t.jugador).join(", ")}</strong>
              </div>
            )}
            {aperc.length > 0 && (
              <div style={{ fontSize: 26, background: "#fef3c7", color: "#92400e", padding: "4px 12px", marginBottom: 6 }}>
                A una amarilla de la sanción: <strong>{aperc.map((t) => t.jugador).join(", ")}</strong>
              </div>
            )}
            {cards.length === 0 ? (
              <div style={{ fontSize: 26, color: "#6b7280" }}>Sin tarjetas registradas.</div>
            ) : (
              <div style={{ fontSize: 26, lineHeight: 1.5 }}>
                {cards.map((t) => (
                  <span key={t.jugador} style={{ marginRight: 22, whiteSpace: "nowrap" }}>
                    {t.jugador} <strong>{t.amarillas > 0 ? `${t.amarillas}🟨` : ""}{t.dobleAmarilla > 0 ? ` ${t.dobleAmarilla}🟨🟨` : ""}{t.rojas > 0 ? ` ${t.rojas}🟥` : ""}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Marco>
  );
}

// ---- Montaje ----------------------------------------------------------------

/** Estilo de una caja de texto libre (el mismo en la vista, la impresión y el editor). */
export function estiloElementoLibre(e: ElementoLibre): CSSProperties {
  return {
    ...TEXTO,
    position: "absolute",
    left: e.x,
    top: e.y,
    width: e.w,
    height: e.h,
    boxSizing: "border-box",
    overflow: "hidden",
    padding: e.fondo || e.borde ? "8px 14px" : 0,
    fontSize: e.tamano,
    lineHeight: 1.2,
    color: e.color,
    fontWeight: e.negrita ? 700 : 400,
    fontStyle: e.cursiva ? "italic" : "normal",
    textAlign: e.alinear,
    background: e.fondo || "transparent",
    border: e.borde ? `4px solid ${e.color}` : "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };
}

function Libre({ d, ctx }: { d: DLibre; ctx: ContextoPresentacion }) {
  return (
    <Marco d={d} ctx={ctx} sinCabecera={!d.conTitulo} color={hexTitulo(d.color)}>
      {null}
    </Marco>
  );
}

function Extras({ extras }: { extras: ElementoLibre[] | undefined }) {
  return (
    <>
      {(extras ?? []).map((e) => (
        <div key={e.id} style={estiloElementoLibre(e)}>
          {e.texto}
        </div>
      ))}
    </>
  );
}

function Contenido({ d, ctx }: { d: Diapositiva; ctx: ContextoPresentacion }) {
  switch (d.tipo) {
    case "libre":
      return <Libre d={d} ctx={ctx} />;
    case "clasificacion":
      return <ClasificacionDiapo d={d} ctx={ctx} />;
    case "rival_forma":
      return <RivalFormaDiapo d={d} ctx={ctx} />;
    case "portada":
      return <Portada d={d} ctx={ctx} />;
    case "informe":
      return <Informe d={d} ctx={ctx} />;
    case "texto":
      return <Texto d={d} ctx={ctx} />;
    case "pizarra":
      return <Pizarra d={d} ctx={ctx} />;
    case "bloques":
      return <Bloques d={d} ctx={ctx} />;
    case "rival_plantilla":
      return <RivalPlantilla d={d} ctx={ctx} />;
    case "rival_goles":
      return <RivalGoles d={d} ctx={ctx} />;
    case "rival_once":
      return <RivalOnce d={d} ctx={ctx} />;
    case "nuestro_once":
      return <NuestroOnce d={d} ctx={ctx} />;
    case "abp":
      return <Abp d={d} ctx={ctx} />;
  }
}

/** La diapositiva a su tamaño de diseño (1920 x 1080). */
export function Diapositiva1080({ d, ctx }: { d: Diapositiva; ctx: ContextoPresentacion }) {
  return (
    <div
      data-diapositiva
      style={{
        position: "relative",
        width: ANCHO,
        height: ALTO,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        backgroundImage: "url(/presentacion/fondo.png)",
        backgroundSize: "100% 100%",
        color: "#111111",
      }}
    >
      <Contenido d={d} ctx={ctx} />
      <Extras extras={d.extras} />
    </div>
  );
}

/** La diapositiva ajustada al ancho de su contenedor (mantiene 16:9). */
export function DiapositivaEscalada({
  d,
  ctx,
  className,
}: {
  d: Diapositiva;
  ctx: ContextoPresentacion;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / ANCHO);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${escala})`, transformOrigin: "top left" }}>
        <Diapositiva1080 d={d} ctx={ctx} />
      </div>
    </div>
  );
}
