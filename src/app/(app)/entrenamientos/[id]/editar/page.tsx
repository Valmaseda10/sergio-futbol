"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { EntrenamientoForm } from "@/components/entrenamientos/entrenamiento-form";

export default function EditarEntrenamientoPage() {
  const { id } = useParams<{ id: string }>();
  const entrenamiento = useLiveQuery(
    async () => (await localDb.entrenamientos.get(id)) ?? null,
    [id],
  );
  const [documentoSignedUrl, setDocumentoSignedUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!entrenamiento?.documento_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(entrenamiento.documento_url, 3600)
      .then(({ data }) => setDocumentoSignedUrl(data?.signedUrl ?? null));
  }, [entrenamiento?.documento_url]);

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
          rival_torneo: entrenamiento.rival_torneo ?? "",
          microciclo: entrenamiento.microciclo ?? "",
          bajas: entrenamiento.bajas ?? "",
          charla: entrenamiento.charla ?? "",
          material: entrenamiento.material ?? "",
          tarea_1: entrenamiento.tarea_1 ?? "",
          tarea_2: entrenamiento.tarea_2 ?? "",
          tarea_3: entrenamiento.tarea_3 ?? "",
          tarea_4: entrenamiento.tarea_4 ?? "",
          tarea_1_ejercicio_id: entrenamiento.tarea_1_ejercicio_id ?? "",
          tarea_2_ejercicio_id: entrenamiento.tarea_2_ejercicio_id ?? "",
          tarea_3_ejercicio_id: entrenamiento.tarea_3_ejercicio_id ?? "",
          tarea_4_ejercicio_id: entrenamiento.tarea_4_ejercicio_id ?? "",
          tarea_1_categoria: entrenamiento.tarea_1_categoria ?? "",
          tarea_2_categoria: entrenamiento.tarea_2_categoria ?? "",
          tarea_3_categoria: entrenamiento.tarea_3_categoria ?? "",
          tarea_4_categoria: entrenamiento.tarea_4_categoria ?? "",
          tarea_1_minutos: entrenamiento.tarea_1_minutos?.toString() ?? "",
          tarea_2_minutos: entrenamiento.tarea_2_minutos?.toString() ?? "",
          tarea_3_minutos: entrenamiento.tarea_3_minutos?.toString() ?? "",
          tarea_4_minutos: entrenamiento.tarea_4_minutos?.toString() ?? "",
          tarea_1_dimension: entrenamiento.tarea_1_dimension ?? "",
          tarea_1_series: entrenamiento.tarea_1_series ?? "",
          tarea_1_tiempo: entrenamiento.tarea_1_tiempo ?? "",
          tarea_1_objetivos_def: entrenamiento.tarea_1_objetivos_def ?? "",
          tarea_1_objetivos_ofe: entrenamiento.tarea_1_objetivos_ofe ?? "",
          tarea_2_dimension: entrenamiento.tarea_2_dimension ?? "",
          tarea_2_series: entrenamiento.tarea_2_series ?? "",
          tarea_2_tiempo: entrenamiento.tarea_2_tiempo ?? "",
          tarea_2_objetivos_def: entrenamiento.tarea_2_objetivos_def ?? "",
          tarea_2_objetivos_ofe: entrenamiento.tarea_2_objetivos_ofe ?? "",
          tarea_3_dimension: entrenamiento.tarea_3_dimension ?? "",
          tarea_3_series: entrenamiento.tarea_3_series ?? "",
          tarea_3_tiempo: entrenamiento.tarea_3_tiempo ?? "",
          tarea_3_objetivos_def: entrenamiento.tarea_3_objetivos_def ?? "",
          tarea_3_objetivos_ofe: entrenamiento.tarea_3_objetivos_ofe ?? "",
          tarea_4_dimension: entrenamiento.tarea_4_dimension ?? "",
          tarea_4_series: entrenamiento.tarea_4_series ?? "",
          tarea_4_tiempo: entrenamiento.tarea_4_tiempo ?? "",
          tarea_4_objetivos_def: entrenamiento.tarea_4_objetivos_def ?? "",
          tarea_4_objetivos_ofe: entrenamiento.tarea_4_objetivos_ofe ?? "",
          notas: entrenamiento.notas ?? "",
          documentoSignedUrl,
        }}
      />
    </div>
  );
}
