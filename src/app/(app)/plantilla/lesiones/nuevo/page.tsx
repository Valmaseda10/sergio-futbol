"use client";

import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { LesionForm } from "@/components/plantilla/lesion-form";

export default function NuevaLesionPage() {
  const searchParams = useSearchParams();
  const jugadorIdInicial = searchParams.get("jugadorId") ?? undefined;

  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) =>
          rows
            .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
            .map((j) => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos })),
        ),
    [],
    [],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nueva lesión</h1>
      <LesionForm jugadores={jugadores} jugadorIdInicial={jugadorIdInicial} />
    </div>
  );
}
