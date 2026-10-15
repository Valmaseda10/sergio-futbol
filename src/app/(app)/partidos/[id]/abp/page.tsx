"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { AbpPartido } from "@/components/partidos/abp-partido";

export default function AbpDelPartidoPage() {
  const { id } = useParams<{ id: string }>();
  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );

  if (partido === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }
  if (partido === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/partidos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al partido
      </Link>
      <h1 className="text-2xl font-semibold">ABP vs {partido.rival}</h1>
      <AbpPartido partidoId={id} />
    </div>
  );
}
