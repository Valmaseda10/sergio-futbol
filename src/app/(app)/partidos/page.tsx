"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, MapPin } from "lucide-react";
import { localDb, type LocalPartido } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FechaTile } from "@/components/ui/fecha-tile";

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

function Fila({ p }: { p: LocalPartido }) {
  const tieneResultado =
    p.resultado_favor != null && p.resultado_contra != null;

  return (
    <li key={p.id}>
      <Link
        href={`/partidos/${p.id}`}
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
        {tieneResultado && (
          <span className="font-heading text-lg tabular-nums">
            {p.resultado_favor} - {p.resultado_contra}
          </span>
        )}
      </Link>
    </li>
  );
}

export default function PartidosPage() {
  const hoy = hoyISO();
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const proximos = partidos
    .filter((p) => p.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const anteriores = partidos
    .filter((p) => p.fecha < hoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partidos</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/partidos/nuevo" />}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

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
              <Fila key={p.id} p={p} />
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
              <Fila key={p.id} p={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
