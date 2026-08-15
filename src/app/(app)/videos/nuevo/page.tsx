"use client";

import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { VideoForm } from "@/components/videos/video-form";

export default function NuevoVideoPage() {
  const searchParams = useSearchParams();
  const partidoIdInicial = searchParams.get("partidoId") ?? undefined;
  const tipoParam = searchParams.get("tipo");
  const tipoInicial =
    tipoParam === "partido" || tipoParam === "clip" ? tipoParam : undefined;

  const partidos = useLiveQuery(
    () =>
      localDb.partidos
        .toArray()
        .then((rows) =>
          rows
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
            .map((p) => ({ id: p.id, rival: p.rival, fecha: p.fecha })),
        ),
    [],
    [],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo vídeo</h1>
      <VideoForm
        partidos={partidos}
        partidoIdInicial={partidoIdInicial}
        tipoInicial={tipoInicial}
      />
    </div>
  );
}
