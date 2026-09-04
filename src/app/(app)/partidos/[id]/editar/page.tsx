"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { PartidoForm } from "@/components/partidos/partido-form";

export default function EditarPartidoPage() {
  const { id } = useParams<{ id: string }>();
  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );
  const [fotoRivalSignedUrl, setFotoRivalSignedUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!partido?.foto_rival_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(partido.foto_rival_url, 3600)
      .then(({ data }) => setFotoRivalSignedUrl(data?.signedUrl ?? null));
  }, [partido?.foto_rival_url]);

  if (partido === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (partido === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar partido</h1>
      <PartidoForm
        partido={{
          id: partido.id,
          fecha: partido.fecha,
          hora: partido.hora?.slice(0, 5) ?? "",
          competicion: partido.competicion,
          rival: partido.rival,
          local_visitante: partido.local_visitante,
          lugar: partido.lugar ?? "",
          resultado_favor: partido.resultado_favor?.toString() ?? "",
          resultado_contra: partido.resultado_contra?.toString() ?? "",
          notas: partido.notas ?? "",
          rival_scouting_id: partido.rival_scouting_id ?? "",
          fotoRivalSignedUrl,
        }}
      />
    </div>
  );
}
