"use client";

// Las hojas de partido que se rellenan en Plan de partido → Hoja de partido, vistas desde la ficha
// del rival: salen solas las de los partidos contra este rival (las que se escriben allí se ven aquí
// al momento, sin subir nada) y desde aquí se abren para editarlas o imprimirlas.

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardList, ExternalLink, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
import { fechaHoja, leerHoja, type AlineacionHoja, type HojaPartidoDatos } from "@/lib/plan-partido";
import { buttonVariants } from "@/components/ui/button";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const ETIQUETAS_ANALISIS: [keyof HojaPartidoDatos["analisis"], string][] = [
  ["fase_ofensiva", "Fase ofensiva"],
  ["fase_defensiva", "Fase defensiva"],
  ["transicion_ofensiva", "Transición ofensiva"],
  ["transicion_defensiva", "Transición defensiva"],
  ["abp_ofensivo", "ABP ofensivo"],
  ["abp_defensivo", "ABP defensivo"],
  ["observaciones", "Observaciones"],
];

function Lista({ a }: { a: AlineacionHoja }) {
  const titulares = a.titulares.map((n, i) => ({ n: n.trim(), i })).filter((x) => x.n);
  const suplentes = a.suplentes.map((n) => n.trim()).filter(Boolean);
  if (titulares.length === 0 && suplentes.length === 0 && !a.observaciones.trim()) return null;
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold uppercase">{a.titulo}</p>
      <ol className="space-y-0.5 text-xs">
        {titulares.map((x) => (
          <li key={x.i}>
            <span className="inline-block w-5 text-right text-muted-foreground">{x.i + 1}</span> {x.n}
          </li>
        ))}
      </ol>
      {suplentes.length > 0 && (
        <p className="text-xs text-muted-foreground">Suplentes: {suplentes.join(", ")}</p>
      )}
      {a.observaciones.trim() && <p className="text-xs whitespace-pre-wrap italic">{a.observaciones}</p>}
    </div>
  );
}

export function HojasPartidoRival({ rivalId, rivalNombre }: { rivalId: string; rivalNombre: string }) {
  const partidos = useLiveQuery(
    () =>
      localDb.partidos.toArray().then((rows) =>
        rows
          .filter((p) => p.rival_scouting_id === rivalId || norm(p.rival) === norm(rivalNombre))
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
      ),
    [rivalId, rivalNombre],
    [],
  );
  const hojas = useLiveQuery(() => localDb.hojas_partido.toArray(), [], []);
  const porPartido = useMemo(() => new Map(hojas.map((h) => [h.partido_id, h])), [hojas]);

  if (partidos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay partidos contra este rival en la app. Cuando los tengas, sus hojas de partido saldrán aquí solas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Las hojas de partido de Plan de partido → Hoja de partido contra este rival. Se actualizan solas: lo que
        escribes en la hoja se ve aquí.
      </p>
      <ul className="space-y-2">
        {partidos.map((p) => {
          const hoja = porPartido.get(p.id);
          const datos = hoja ? leerHoja(hoja.datos) : null;
          const analisis = datos
            ? ETIQUETAS_ANALISIS.filter(([k]) => datos.analisis[k].trim())
            : [];
          const cambios = datos
            ? Array.from({ length: Math.floor(datos.cambios.length / 2) }, (_, i) => [
                datos.cambios[i * 2]?.trim(),
                datos.cambios[i * 2 + 1]?.trim(),
              ]).filter(([a, b]) => a || b)
            : [];
          const resultado =
            p.resultado_favor != null && p.resultado_contra != null
              ? `${p.resultado_favor}-${p.resultado_contra}`
              : null;
          return (
            <li key={p.id} className="rounded-md border">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
                    {resultado && <span className="ml-2 tabular-nums">{resultado}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {diaSemanaDeFecha(p.fecha)} {fechaHoja(p.fecha)}
                    {p.hora ? ` · ${p.hora.slice(0, 5)}` : ""}
                    {!hoja && " · sin hoja todavía"}
                  </p>
                </div>
                <Link
                  href={`/plan-partido/hoja/${p.id}`}
                  className={buttonVariants({ size: "sm", variant: hoja ? "outline" : "default" })}
                >
                  {hoja ? <ExternalLink className="size-4" /> : <Plus className="size-4" />}
                  {hoja ? "Abrir hoja" : "Crear hoja"}
                </Link>
              </div>
              {datos && (
                <details className="border-t px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    Ver lo que hay escrito en la hoja
                  </summary>
                  <div className="mt-2 space-y-3">
                    {(datos.cabecera.convocatoria.trim() || datos.cabecera.observaciones.trim()) && (
                      <div className="space-y-1 text-xs whitespace-pre-wrap">
                        {datos.cabecera.convocatoria.trim() && <p>Convocatoria: {datos.cabecera.convocatoria}</p>}
                        {datos.cabecera.observaciones.trim() && <p>{datos.cabecera.observaciones}</p>}
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Lista a={datos.izquierda} />
                      <Lista a={datos.derecha} />
                    </div>
                    {cambios.length > 0 && (
                      <div className="space-y-0.5 text-xs">
                        <p className="font-semibold">Cambios</p>
                        {cambios.map(([a, b], i) => (
                          <p key={i}>
                            {i + 1}. {a || "—"} → {b || "—"}
                          </p>
                        ))}
                      </div>
                    )}
                    {analisis.length > 0 && (
                      <div className="space-y-1.5 text-xs">
                        {analisis.map(([k, etiqueta]) => (
                          <div key={k}>
                            <p className="font-semibold">{etiqueta}</p>
                            <p className="whitespace-pre-wrap">{datos.analisis[k]}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
