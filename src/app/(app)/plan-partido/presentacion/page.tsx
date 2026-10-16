"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
import { fechaHoja } from "@/lib/plan-partido";
import { FechaTile } from "@/components/ui/fecha-tile";

function hoyIso(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function diasHasta(fechaISO: string, hoy: string): number {
  const [y1, m1, d1] = fechaISO.split("-").map(Number);
  const [y2, m2, d2] = hoy.split("-").map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000);
}

export default function PresentacionesPage() {
  // El partido que toca arriba del todo, seguido de los siguientes; los ya jugados, al final.
  const partidos = useLiveQuery(
    () =>
      localDb.partidos.toArray().then((rows) => {
        const hoy = hoyIso();
        const proximos = rows.filter((p) => p.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
        const jugados = rows.filter((p) => p.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));
        return [...proximos, ...jugados];
      }),
    [],
    [],
  );
  const hechas = useLiveQuery(() => localDb.presentaciones_partido.toArray(), [], []);
  const conPresentacion = new Set(hechas.map((h) => h.partido_id));
  const hoy = hoyIso();
  const primero = partidos[0];
  const tocaId = primero && primero.fecha >= hoy ? primero.id : null;
  const tocaEstaSemana = primero && tocaId ? diasHasta(primero.fecha, hoy) <= 7 : false;

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
        <h1 className="text-2xl font-semibold">Presentación del partido</h1>
        <p className="text-sm text-muted-foreground">
          Las diapositivas que enseñas el día antes del partido en la sesión de vídeo. Elige el partido: se crea con
          los datos del partido y del rival y la editas como un PowerPoint.
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
                href={`/plan-partido/presentacion/${p.id}`}
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
                {p.id === tocaId && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                    {tocaEstaSemana ? "Esta semana" : "Próximo"}
                  </span>
                )}
                {conPresentacion.has(p.id) && (
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    Hecha
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
