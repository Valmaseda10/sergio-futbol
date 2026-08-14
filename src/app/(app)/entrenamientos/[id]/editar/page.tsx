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
          ejercicios: entrenamiento.ejercicios ?? "",
          notas: entrenamiento.notas ?? "",
          documentoSignedUrl,
        }}
      />
    </div>
  );
}
