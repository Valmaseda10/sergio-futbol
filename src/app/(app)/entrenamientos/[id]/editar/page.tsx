"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { EntrenamientoForm } from "@/components/entrenamientos/entrenamiento-form";

export default function EditarEntrenamientoPage() {
  const { id } = useParams<{ id: string }>();
  const entrenamiento = useLiveQuery(
    async () => (await localDb.entrenamientos.get(id)) ?? null,
    [id],
  );

  if (entrenamiento === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (entrenamiento === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Entrenamiento no encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar entrenamiento</h1>
      <EntrenamientoForm
        entrenamiento={{
          id: entrenamiento.id,
          fecha: entrenamiento.fecha,
          hora_inicio: entrenamiento.hora_inicio?.slice(0, 5) ?? "",
          hora_fin: entrenamiento.hora_fin?.slice(0, 5) ?? "",
          lugar: entrenamiento.lugar ?? "",
          objetivos: entrenamiento.objetivos ?? "",
          ejercicios: entrenamiento.ejercicios ?? "",
          notas: entrenamiento.notas ?? "",
        }}
      />
    </div>
  );
}
