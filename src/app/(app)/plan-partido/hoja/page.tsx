"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
import { fechaHoja } from "@/lib/plan-partido";
import { FechaTile } from "@/components/ui/fecha-tile";

export default function HojasPartidoPage() {
  const partidos = useLiveQuery(
    () =>
      localDb.partidos
        .toArray()
        .then((rows) => rows.sort((a, b) => b.fecha.localeCompare(a.fecha))),
    [],
    [],
  );
  const hojas = useLiveQuery(() => localDb.hojas_partido.toArray(), [], []);
  const conHoja = new Set(hojas.map((h) => h.partido_id));

  return (
    <div className="space-y-3">
      <div>
        <Link
          href="/plan-partido"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Plan de partido
        </Link>
        <h1 className="text-2xl font-semibold">Hoja de partido</h1>
        <p className="text-sm text-muted-foreground">
          Elige el partido: la hoja se crea con su día, hora, rival y lugar, y con la
          alineación si ya la has puesto en Partidos.
        </p>
      </div>
      {partidos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay partidos. Créalos en la sección Partidos.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {partidos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plan-partido/hoja/${p.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <FechaTile fecha={p.fecha} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {diaSemanaDeFecha(p.fecha)} {fechaHoja(p.fecha)}
                    {p.hora ? ` · ${p.hora.slice(0, 5)}` : ""}
                  </p>
                </div>
                {conHoja.has(p.id) && (
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    Hoja hecha
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
