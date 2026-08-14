"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { RivalScoutingForm } from "@/components/partidos/rival-scouting-form";

export default function EditarRivalScoutingPage() {
  const { id } = useParams<{ id: string }>();
  const rival = useLiveQuery(
    async () => (await localDb.rivales_scouting.get(id)) ?? null,
    [id],
  );
  const [fotoSignedUrl, setFotoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!rival?.foto_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(rival.foto_url, 3600)
      .then(({ data }) => setFotoSignedUrl(data?.signedUrl ?? null));
  }, [rival?.foto_url]);

  if (rival === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (rival === null) {
    return <p className="text-sm text-muted-foreground">Rival no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar rival</h1>
      <RivalScoutingForm
        rival={{
          id: rival.id,
          nombre: rival.nombre,
          sistema_juego: rival.sistema_juego ?? "",
          fase_ofensiva: rival.fase_ofensiva ?? "",
          fase_defensiva: rival.fase_defensiva ?? "",
          abp: rival.abp ?? "",
          notas: rival.notas ?? "",
          fotoSignedUrl,
        }}
      />
    </div>
  );
}
