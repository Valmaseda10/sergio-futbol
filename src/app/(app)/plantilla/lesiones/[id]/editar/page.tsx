"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { LesionForm } from "@/components/plantilla/lesion-form";

export default function EditarLesionPage() {
  const { id } = useParams<{ id: string }>();
  const lesion = useLiveQuery(
    async () => (await localDb.lesiones.get(id)) ?? null,
    [id],
  );
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .toArray()
        .then((rows) =>
          rows
            .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
            .map((j) => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos })),
        ),
    [],
    [],
  );

  if (lesion === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (lesion === null) {
    return <p className="text-sm text-muted-foreground">Lesión no encontrada.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar lesión</h1>
      <LesionForm
        jugadores={jugadores}
        lesion={{
          id: lesion.id,
          jugador_id: lesion.jugador_id,
          fecha_inicio: lesion.fecha_inicio,
          tipo: lesion.tipo,
          mecanismo: lesion.mecanismo ?? "",
          fecha_prevista_alta: lesion.fecha_prevista_alta ?? "",
          fecha_alta_real: lesion.fecha_alta_real ?? "",
          notas: lesion.notas ?? "",
        }}
      />
    </div>
  );
}
