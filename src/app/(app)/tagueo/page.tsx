"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { MapPin } from "lucide-react";
import { localDb, type LocalPartido } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
import { temporadaDeFecha } from "@/lib/temporada";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FechaTile } from "@/components/ui/fecha-tile";
import { EtiquetasPanel } from "@/components/tagueo/etiquetas-panel";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const COMPETICION_LABEL: Record<string, string> = {
  liga: "Liga",
  amistoso: "Amistoso",
  copa: "Copa",
};

const COMPETICION_CLASSNAME: Record<string, string> = {
  liga: "border-transparent bg-primary text-primary-foreground",
  copa: "border-transparent bg-gold text-gold-foreground",
  amistoso: "",
};

function Fila({ p, registros }: { p: LocalPartido; registros: number }) {
  return (
    <li key={p.id}>
      <Link
        href={`/tagueo/${p.id}`}
        className="flex items-center gap-3 p-3 hover:bg-muted/50"
      >
        <FechaTile fecha={p.fecha} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <Badge
              variant="secondary"
              className={cn("text-[10px]", COMPETICION_CLASSNAME[p.competicion])}
            >
              {COMPETICION_LABEL[p.competicion]}
            </Badge>
            <span>{diaSemanaDeFecha(p.fecha)}</span>
            {p.lugar && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {p.lugar}
              </span>
            )}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {registros} taguead{registros === 1 ? "o" : "os"}
        </span>
      </Link>
    </li>
  );
}

export default function TagueoPage() {
  const hoy = hoyISO();
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const registros = useLiveQuery(
    () => localDb.etiquetas_partido.toArray(),
    [],
    [],
  );
  const { temporada } = useTemporadaSeleccionada();

  const conteoPorPartido = new Map<string, number>();
  for (const r of registros) {
    conteoPorPartido.set(
      r.partido_id,
      (conteoPorPartido.get(r.partido_id) ?? 0) + 1,
    );
  }

  const partidosTemporada = partidos.filter(
    (p) => temporadaDeFecha(p.fecha) === temporada,
  );

  const proximos = partidosTemporada
    .filter((p) => p.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const anteriores = partidosTemporada
    .filter((p) => p.fecha < hoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tagueo</h1>
        <p className="text-sm text-muted-foreground">
          Elige un partido para ir marcando lo que va pasando, con tus
          propias categorías.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <EtiquetasPanel />
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Próximos
        </h2>
        {proximos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay partidos programados.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {proximos.map((p) => (
              <Fila key={p.id} p={p} registros={conteoPorPartido.get(p.id) ?? 0} />
            ))}
          </ul>
        )}
      </section>

      {anteriores.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Anteriores
          </h2>
          <ul className="divide-y rounded-md border">
            {anteriores.map((p) => (
              <Fila key={p.id} p={p} registros={conteoPorPartido.get(p.id) ?? 0} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
