"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb, type LocalHojaPartido } from "@/lib/db/local-db";
import { HojaPartido } from "@/components/plan-partido/hoja-partido";
import { obtenerOCrearHojaLocal } from "@/app/(app)/plan-partido/local-actions";

export default function HojaPartidoPage() {
  const { partidoId } = useParams<{ partidoId: string }>();
  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(partidoId)) ?? null,
    [partidoId],
  );
  const [hoja, setHoja] = useState<LocalHojaPartido | null>(null);
  const partidoIdActual = partido?.id;

  useEffect(() => {
    if (!partidoIdActual) return;
    let activo = true;
    void obtenerOCrearHojaLocal(partidoIdActual).then((h) => {
      if (activo) setHoja(h);
    });
    return () => {
      activo = false;
    };
  }, [partidoIdActual]);

  if (partido === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }
  if (partido === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="print:hidden">
        <Link
          href="/plan-partido/hoja"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Hojas de partido
        </Link>
        <h1 className="text-2xl font-semibold">Hoja de partido</h1>
      </div>
      {hoja ? (
        <HojaPartido
          key={hoja.id}
          hoja={hoja}
          ladoPropio={partido.local_visitante === "local" ? "izquierda" : "derecha"}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Preparando la hoja...</p>
      )}
    </div>
  );
}
