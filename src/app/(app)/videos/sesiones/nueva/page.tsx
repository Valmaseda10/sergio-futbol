"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { SesionForm } from "@/components/videos/sesion-form";

export default function NuevaSesionPage() {
  const clips = useLiveQuery(
    () =>
      localDb.videos
        .where("tipo")
        .equals("clip")
        .toArray()
        .then((rows) =>
          rows
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
            .map((v) => ({ id: v.id, titulo: v.titulo, fecha: v.fecha })),
        ),
    [],
    [],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nueva sesión</h1>
      <SesionForm clips={clips} />
    </div>
  );
}
